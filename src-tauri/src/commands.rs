/* Tauri IPC commands – the bridge between the Svelte frontend and the
 * D-Bus adapter.  Each command is #[tauri::command] and returns a
 * Result<T, String> so errors are serialised naturally to the frontend. */

use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::RwLock;
use tracing::{error, info, warn};

use crate::clackd_client::ClackdClient;
use crate::dbus_client::RatbagClient;
use crate::dto::{
    ActionValueDto, ClackdStatus, DaemonStatus, DeviceDto, DeviceSummary, KeyboardDeviceDto,
    KeyboardIdentity, KeyboardSummary,
};

/* ------------------------------------------------------------------ */
/* Managed state                                                       */
/* ------------------------------------------------------------------ */

pub struct DaemonState {
    client: Arc<RwLock<Option<RatbagClient>>>,
    watcher: Arc<RwLock<Option<tokio::task::JoinHandle<()>>>>,
}

impl Default for DaemonState {
    fn default() -> Self {
        Self {
            client: Arc::new(RwLock::new(None)),
            watcher: Arc::new(RwLock::new(None)),
        }
    }
}

macro_rules! with_client {
    ($state:expr, |$c:ident| $body:expr) => {{
        let guard = $state.client.read().await;
        let $c = guard
            .as_ref()
            .ok_or_else(|| "Not connected to ratbagd. Call connect_daemon first.".to_owned())?;
        ($body).await.map_err(|e: anyhow::Error| format!("{e:#}"))
    }};
}

/* ------------------------------------------------------------------ */
/* Input validation                                                    */
/* ------------------------------------------------------------------ */

fn validate_ratbag_path(path: &str) -> Result<(), String> {
    /* D-Bus object paths must start with the ratbag1 prefix and contain
     * only ASCII alphanumerics, underscores, and forward slashes. This
     * rejects traversal sequences, embedded NULs, and any character that
     * is not part of a valid D-Bus object path component. */
    if !path.starts_with("/org/freedesktop/ratbag1/")
        || !path.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'/' || b == b'_')
    {
        return Err("Invalid D-Bus object path".to_owned());
    }
    Ok(())
}

fn validate_rgb(r: u32, g: u32, b: u32) -> Result<(), String> {
    if r > 255 || g > 255 || b > 255 {
        return Err("RGB values must be 0–255".to_owned());
    }
    Ok(())
}

/* ------------------------------------------------------------------ */
/* Connection                                                          */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub async fn connect_daemon(
    state: State<'_, DaemonState>,
    app: AppHandle,
) -> Result<DaemonStatus, String> {
    info!("connect_daemon called");
    let client_result = RatbagClient::connect().await;
    match client_result {
        Ok((client, bus_type)) => {
            let api_version = client.api_version().await.unwrap_or_else(|e| {
                warn!("Failed to read ratbagd API version, defaulting to -1: {e:#}");
                -1
            });
            info!("Connected to ratbagd, API version: {api_version}");

            /* Cancel any previous signal watcher before spawning a new one */
            {
                let mut wh = state.watcher.write().await;
                if let Some(h) = wh.take() {
                    info!("Aborting previous D-Bus signal watcher");
                    h.abort();
                }
            }

            /* Spawn the background D-Bus signal watcher */
            let conn = client.connection().clone();
            let app_clone = app.clone();
            let handle = tokio::spawn(async move {
                if let Err(e) = watch_dbus_signals(conn, app_clone).await {
                    warn!("D-Bus signal watcher exited: {e:#}");
                }
            });
            *state.watcher.write().await = Some(handle);

            let mut guard = state.client.write().await;
            *guard = Some(client);
            Ok(DaemonStatus::Connected { api_version, bus_type })
        }
        Err(e) => {
            error!("Failed to connect to ratbagd: {e:#}");
            Ok(DaemonStatus::Disconnected {
                reason: format!("{e:#}"),
            })
        }
    }
}

/* Background task: subscribe to D-Bus signals and emit Tauri events.
 *
 * Uses a semantic filter (only Manager device-list changes and profile
 * IsDirty changes trigger a resync) combined with a 200ms debounce to
 * coalesce bursts from rapid user interaction. */
async fn watch_dbus_signals(
    conn: zbus::Connection,
    app: AppHandle,
) -> Result<(), anyhow::Error> {
    use futures::StreamExt;
    use std::pin::pin;
    use tokio::time::{sleep, Duration};
    use zbus::fdo::PropertiesProxy;

    const DEBOUNCE: Duration = Duration::from_millis(200);

    let proxy = PropertiesProxy::builder(&conn)
        .path("/org/freedesktop/ratbag1")
        .map_err(|e| anyhow::anyhow!("{e}"))?
        .destination("org.freedesktop.ratbag1")
        .map_err(|e| anyhow::anyhow!("{e}"))?
        .build()
        .await
        .map_err(|e| anyhow::anyhow!("{e}"))?;

    let mut prop_stream = proxy
        .receive_properties_changed()
        .await
        .map_err(|e| anyhow::anyhow!("{e}"))?;

    info!("D-Bus signal watcher started");

    let mut pending_resync = false;

    loop {
        if pending_resync {
            /* Race: wait for the debounce timer or another signal */
            let timer = pin!(sleep(DEBOUNCE));
            tokio::select! {
                signal = prop_stream.next() => {
                    let Some(signal) = signal else { break };
                    if should_resync(&signal) {
                        /* Reset debounce — another relevant signal arrived */
                        pending_resync = true;
                    }
                }
                () = timer => {
                    info!("D-Bus: emitting ratbag:resync (debounced)");
                    let _ = app.emit("ratbag:resync", ());
                    pending_resync = false;
                }
            }
        } else {
            /* No pending resync — just wait for the next signal */
            let Some(signal) = prop_stream.next().await else {
                break;
            };
            if should_resync(&signal) {
                pending_resync = true;
            }
        }
    }

    warn!("D-Bus signal watcher stream ended");
    Ok(())
}

/* Semantic filter: only trigger a resync for events the GUI did not cause.
 * Manager property changes (device list) always resync.  Profile IsDirty
 * changes resync (commit completed).  All other changes are self-caused
 * by the GUI's own set_* calls and are suppressed. */
fn should_resync(signal: &zbus::fdo::PropertiesChanged) -> bool {
    let Ok(args) = signal.args() else { return false };
    let iface = args.interface_name.as_str();

    if iface == "org.freedesktop.ratbag1.Manager" {
        return true;
    }
    if iface == "org.freedesktop.ratbag1.Profile" {
        return args.changed_properties.contains_key("IsDirty");
    }
    false
}

/* ------------------------------------------------------------------ */
/* Device queries                                                      */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub async fn list_devices(state: State<'_, DaemonState>) -> Result<Vec<DeviceSummary>, String> {
    info!("list_devices called");
    let result = with_client!(state, |c| c.list_devices());
    match &result {
        Ok(devices) => info!("list_devices returned {} devices", devices.len()),
        Err(e) => error!("list_devices failed: {e}"),
    }
    result
}

#[tauri::command]
pub async fn get_device(state: State<'_, DaemonState>, path: String) -> Result<DeviceDto, String> {
    validate_ratbag_path(&path)?;
    info!("get_device called for path: {path}");
    let result = with_client!(state, |c| c.get_device(&path));
    match &result {
        Ok(dev) => {
            let (btns, leds): (usize, usize) = dev.profiles.iter().fold((0, 0), |(b, l), p| {
                (b + p.buttons.len(), l + p.leds.len())
            });
            info!(
                "get_device returned: {} with {} profiles, {} buttons, {} LEDs",
                dev.name,
                dev.profiles.len(),
                btns,
                leds
            );
        }
        Err(e) => error!("get_device failed: {e}"),
    }
    result
}

/* ------------------------------------------------------------------ */
/* Resolution mutations                                                */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub async fn set_resolution_dpi(
    state: State<'_, DaemonState>,
    path: String,
    dpi_x: u32,
    dpi_y: Option<u32>,
) -> Result<(), String> {
    validate_ratbag_path(&path)?;
    with_client!(state, |c| c.set_resolution_dpi(&path, dpi_x, dpi_y))
}

#[tauri::command]
pub async fn set_resolution_active(
    state: State<'_, DaemonState>,
    path: String,
) -> Result<(), String> {
    validate_ratbag_path(&path)?;
    with_client!(state, |c| c.set_resolution_active(&path))
}

/* ------------------------------------------------------------------ */
/* Profile mutations                                                   */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub async fn set_profile_report_rate(
    state: State<'_, DaemonState>,
    path: String,
    rate: u32,
) -> Result<(), String> {
    validate_ratbag_path(&path)?;
    with_client!(state, |c| c.set_profile_report_rate(&path, rate))
}

/* ------------------------------------------------------------------ */
/* Button mutations                                                    */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub async fn set_button_mapping(
    state: State<'_, DaemonState>,
    path: String,
    action_type: u32,
    value: ActionValueDto,
) -> Result<(), String> {
    validate_ratbag_path(&path)?;
    with_client!(state, |c| c.set_button_mapping(&path, action_type, &value))
}

/* ------------------------------------------------------------------ */
/* LED mutations                                                       */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub async fn set_led_mode(
    state: State<'_, DaemonState>,
    path: String,
    mode: u32,
) -> Result<(), String> {
    validate_ratbag_path(&path)?;
    with_client!(state, |c| c.set_led_mode(&path, mode))
}

#[tauri::command]
pub async fn set_led_color(
    state: State<'_, DaemonState>,
    path: String,
    r: u32,
    g: u32,
    b: u32,
) -> Result<(), String> {
    validate_ratbag_path(&path)?;
    validate_rgb(r, g, b)?;
    with_client!(state, |c| c.set_led_color(&path, r, g, b))
}

#[tauri::command]
pub async fn set_led_brightness(
    state: State<'_, DaemonState>,
    path: String,
    value: u32,
) -> Result<(), String> {
    validate_ratbag_path(&path)?;
    with_client!(state, |c| c.set_led_brightness(&path, value))
}

#[tauri::command]
pub async fn set_led_effect_duration(
    state: State<'_, DaemonState>,
    path: String,
    ms: u32,
) -> Result<(), String> {
    validate_ratbag_path(&path)?;
    with_client!(state, |c| c.set_led_effect_duration(&path, ms))
}

/* ------------------------------------------------------------------ */
/* Commit                                                              */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub async fn commit_device(
    state: State<'_, DaemonState>,
    path: String,
) -> Result<u32, String> {
    validate_ratbag_path(&path)?;
    with_client!(state, |c| c.commit_device(&path))
}

/* ------------------------------------------------------------------ */
/* Desktop environment detection                                       */
/* ------------------------------------------------------------------ */

/// Returns `"glass"` when running on KDE Plasma (the only DE where
/// webkitGTK backdrop-filter renders correctly), `"opaque"` otherwise.
#[tauri::command]
pub fn detect_surface_mode() -> String {
    let desktop = std::env::var("XDG_CURRENT_DESKTOP").unwrap_or_default().to_ascii_lowercase();
    if desktop.contains("kde") || desktop.contains("plasma") {
        "glass".into()
    } else {
        "opaque".into()
    }
}

/* ================================================================== */
/* Keyboards (clackd)                                                  */
/* ================================================================== */

/* Managed state for the clackd connection. A sibling to `DaemonState`, kept
 * deliberately separate: clackd and ratbagd speak unrelated D-Bus dialects, so
 * the only place mice and keyboards merge is the frontend device list. */
pub struct KeyboardState {
    client: Arc<RwLock<Option<ClackdClient>>>,
    watcher: Arc<RwLock<Option<tokio::task::JoinHandle<()>>>>,
}

impl Default for KeyboardState {
    fn default() -> Self {
        Self {
            client: Arc::new(RwLock::new(None)),
            watcher: Arc::new(RwLock::new(None)),
        }
    }
}

macro_rules! with_clack {
    ($state:expr, |$c:ident| $body:expr) => {{
        let guard = $state.client.read().await;
        let $c = guard
            .as_ref()
            .ok_or_else(|| "Not connected to clackd. Call connect_clackd first.".to_owned())?;
        ($body).await.map_err(|e: anyhow::Error| format!("{e:#}"))
    }};
}

/* clackd device ids are opaque udev sysnames (e.g. "hidraw0"), not D-Bus
 * object paths, so `validate_ratbag_path` does not apply. They are round-
 * tripped through method arguments and interpolated into log lines, so we
 * restrict them to a conservative allowlist. */
fn validate_clack_device_id(id: &str) -> Result<(), String> {
    if id.is_empty()
        || id.len() > 256
        || !id.bytes().all(|b| b.is_ascii_alphanumeric() || matches!(b, b':' | b'_' | b'-'))
    {
        return Err("Invalid keyboard device id".to_owned());
    }
    Ok(())
}

#[tauri::command]
pub async fn connect_clackd(
    state: State<'_, KeyboardState>,
    app: AppHandle,
) -> Result<ClackdStatus, String> {
    info!("connect_clackd called");
    match ClackdClient::connect().await {
        Ok(client) => {
            info!("Connected to clackd on the session bus");

            /* Cancel any previous signal watcher before spawning a new one */
            {
                let mut wh = state.watcher.write().await;
                if let Some(h) = wh.take() {
                    info!("Aborting previous clackd signal watcher");
                    h.abort();
                }
            }

            let conn = client.connection().clone();
            let app_clone = app.clone();
            let handle = tokio::spawn(async move {
                if let Err(e) = watch_clack_signals(conn, app_clone).await {
                    warn!("clackd signal watcher exited: {e:#}");
                }
            });
            *state.watcher.write().await = Some(handle);

            let mut guard = state.client.write().await;
            *guard = Some(client);
            Ok(ClackdStatus::Connected)
        }
        Err(e) => {
            /* A missing clackd is non-fatal: keyboards simply do not appear and
             * the mouse UI is unaffected. Report, do not raise. */
            info!("clackd not available: {e:#}");
            Ok(ClackdStatus::Disconnected {
                reason: format!("{e:#}"),
            })
        }
    }
}

/* Background task: subscribe to clackd's DeviceAdded/DeviceRemoved/
 * LayoutUpdated signals and emit a debounced `clack:resync` Tauri event.
 *
 * LayoutUpdated fires on every successful SetKeycode (i.e. on edits the GUI
 * itself caused), so resyncing on it would thrash the UI mid-edit and clobber
 * optimistic local state. We therefore resync only on attach/detach and let
 * the frontend own keymap state between commits. */
async fn watch_clack_signals(conn: zbus::Connection, app: AppHandle) -> Result<(), anyhow::Error> {
    use futures::stream::StreamExt;
    use std::pin::pin;
    use tokio::time::{sleep, Duration};

    use crate::clackd_client::ClackdProxy;

    const DEBOUNCE: Duration = Duration::from_millis(200);

    let proxy = ClackdProxy::new(&conn)
        .await
        .map_err(|e| anyhow::anyhow!("{e}"))?;

    let mut added = proxy.receive_device_added().await.map_err(|e| anyhow::anyhow!("{e}"))?;
    let mut removed = proxy.receive_device_removed().await.map_err(|e| anyhow::anyhow!("{e}"))?;

    info!("clackd signal watcher started");

    let mut pending_resync = false;
    loop {
        if pending_resync {
            let timer = pin!(sleep(DEBOUNCE));
            tokio::select! {
                sig = added.next() => { if sig.is_none() { break } pending_resync = true; }
                sig = removed.next() => { if sig.is_none() { break } pending_resync = true; }
                () = timer => {
                    info!("clackd: emitting clack:resync (debounced)");
                    let _ = app.emit("clack:resync", ());
                    pending_resync = false;
                }
            }
        } else {
            tokio::select! {
                sig = added.next() => { if sig.is_none() { break } pending_resync = true; }
                sig = removed.next() => { if sig.is_none() { break } pending_resync = true; }
            }
        }
    }

    warn!("clackd signal watcher stream ended");
    Ok(())
}

#[tauri::command]
pub async fn list_keyboards(
    state: State<'_, KeyboardState>,
) -> Result<Vec<KeyboardSummary>, String> {
    info!("list_keyboards called");
    let guard = state.client.read().await;
    let client = guard
        .as_ref()
        .ok_or_else(|| "Not connected to clackd. Call connect_clackd first.".to_owned())?;
    let ids = client.list_devices().await.map_err(|e| format!("{e:#}"))?;
    let mut summaries = Vec::new();
    for id in ids {
        let name = match client.get_device_info(&id).await {
            Ok((model, _, _, _)) => model,
            Err(_) => id.clone(),
        };
        summaries.push(KeyboardSummary { id, name });
    }
    Ok(summaries)
}

#[tauri::command]
pub async fn get_keyboard(
    state: State<'_, KeyboardState>,
    id: String,
) -> Result<KeyboardDeviceDto, String> {
    validate_clack_device_id(&id)?;
    info!("get_keyboard called for {id}");
    let guard = state.client.read().await;
    let client = guard
        .as_ref()
        .ok_or_else(|| "Not connected to clackd. Call connect_clackd first.".to_owned())?;

    let (model, rows, cols, layers) = client
        .get_device_info(&id)
        .await
        .map_err(|e| format!("{e:#}"))?;

    tracing::info!("get_keyboard: model={model}, rows={rows}, cols={cols}, layers={layers}");

    let mut identity = client
        .get_device_identity(&id)
        .await
        .map_err(|e| format!("{e:#}"))?
        .map(|(vendor_id, product_id, name)| KeyboardIdentity {
            vendor_id,
            product_id,
            name,
        });

    tracing::info!("get_keyboard: retrieved identity={identity:?}");

    if identity.is_none() && (model == "GMK67/EK68" || model == "gmk67" || model == "epomaker") {
        identity = Some(KeyboardIdentity {
            vendor_id: 0x05ac,
            product_id: 0x024f,
            name: model.clone(),
        });
        tracing::info!("get_keyboard: hardcoded fallback identity={identity:?}");
    }

    /* Lazy load: only fetch layer 0 now; other layers come via get_keymap on
     * demand. Empty Vecs mark not-yet-loaded layers. */
    let mut keymap: Vec<Vec<u16>> = vec![Vec::new(); layers as usize];
    if layers > 0 {
        let base = client
            .read_layer(&id, 0, rows, cols)
            .await
            .map_err(|e| format!("{e:#}"))?;
        keymap[0] = base;
    }

    Ok(KeyboardDeviceDto {
        id,
        model,
        rows,
        cols,
        layers,
        identity,
        keymap,
    })
}

#[tauri::command]
pub async fn get_keymap(
    state: State<'_, KeyboardState>,
    id: String,
    layer: u8,
) -> Result<Vec<u16>, String> {
    validate_clack_device_id(&id)?;
    let guard = state.client.read().await;
    let client = guard
        .as_ref()
        .ok_or_else(|| "Not connected to clackd. Call connect_clackd first.".to_owned())?;
    let (_model, rows, cols, layers) = client
        .get_device_info(&id)
        .await
        .map_err(|e| format!("{e:#}"))?;
    if layer >= layers {
        return Err(format!("Layer {layer} out of range (device has {layers})"));
    }
    client
        .read_layer(&id, layer, rows, cols)
        .await
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
pub async fn set_keycode(
    state: State<'_, KeyboardState>,
    id: String,
    layer: u8,
    row: u8,
    col: u8,
    keycode: u16,
) -> Result<(), String> {
    validate_clack_device_id(&id)?;
    with_clack!(state, |c| c.set_keycode(&id, layer, row, col, keycode))
}

#[tauri::command]
pub async fn commit_keyboard(
    state: State<'_, KeyboardState>,
    id: String,
) -> Result<(), String> {
    validate_clack_device_id(&id)?;
    with_clack!(state, |c| c.commit(&id))
}

#[tauri::command]
pub async fn get_keyboard_lighting(
    state: State<'_, KeyboardState>,
    id: String,
    channel: u8,
    value_id: u8,
) -> Result<Vec<u8>, String> {
    validate_clack_device_id(&id)?;
    with_clack!(state, |c| c.get_lighting(&id, channel, value_id))
}

#[tauri::command]
pub async fn set_keyboard_lighting(
    state: State<'_, KeyboardState>,
    id: String,
    channel: u8,
    value_id: u8,
    data: Vec<u8>,
) -> Result<(), String> {
    validate_clack_device_id(&id)?;
    with_clack!(state, |c| c.set_lighting(&id, channel, value_id, &data))
}
