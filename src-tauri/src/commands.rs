/* Tauri IPC commands – the bridge between the Svelte frontend and the
 * D-Bus adapter.  Each command is #[tauri::command] and returns a
 * Result<T, String> so errors are serialised naturally to the frontend. */

use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::RwLock;
use tracing::{error, info, warn};

use crate::dbus_client::RatbagClient;
use crate::dto::{DaemonStatus, DeviceSummary, DeviceDto, ActionValueDto};

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
    if !path.starts_with("/org/freedesktop/ratbag1/") || path.contains("..") {
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
        Ok(client) => {
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
            Ok(DaemonStatus::Connected { api_version })
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
