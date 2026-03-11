/* Tauri IPC commands – the bridge between the Svelte frontend and the
 * D-Bus adapter.  Each command is #[tauri::command] and returns a
 * Result<T, String> so errors are serialised naturally to the frontend. */

use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::RwLock;
use tracing::{error, info, warn};

use crate::dbus_client::RatbagClient;
use crate::dto::*;

/* ------------------------------------------------------------------ */
/* Managed state                                                       */
/* ------------------------------------------------------------------ */

pub struct DaemonState {
    client: Arc<RwLock<Option<RatbagClient>>>,
}

impl Default for DaemonState {
    fn default() -> Self {
        Self {
            client: Arc::new(RwLock::new(None)),
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

            /* Spawn the background D-Bus signal watcher */
            let conn = client.connection().clone();
            let app_clone = app.clone();
            tokio::spawn(async move {
                if let Err(e) = watch_dbus_signals(conn, app_clone).await {
                    warn!("D-Bus signal watcher exited: {e:#}");
                }
            });

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

/// Background task: subscribe to D-Bus signals and emit Tauri events.
async fn watch_dbus_signals(
    conn: zbus::Connection,
    app: AppHandle,
) -> Result<(), anyhow::Error> {
    use futures::StreamExt;
    use zbus::fdo::PropertiesProxy;

    let proxy = PropertiesProxy::builder(&conn)
        .path("/org/freedesktop/ratbag1")
        .map_err(|e| anyhow::anyhow!("{e}"))?
        .destination("org.freedesktop.ratbag1")
        .map_err(|e| anyhow::anyhow!("{e}"))?
        .build()
        .await
        .map_err(|e| anyhow::anyhow!("{e}"))?;

    /* Watch for property changes on the manager (device list changes) */
    let mut prop_stream = proxy.receive_properties_changed().await
        .map_err(|e| anyhow::anyhow!("{e}"))?;

    info!("D-Bus signal watcher started");

    while let Some(signal) = prop_stream.next().await {
        let args = match signal.args() {
            Ok(a) => a,
            Err(_) => continue,
        };

        let iface = args.interface_name.as_str();

        if iface == "org.freedesktop.ratbag1.Manager" {
            /* Device list may have changed */
            info!("D-Bus: Manager properties changed, emitting ratbag:resync");
            let _ = app.emit("ratbag:resync", ());
        } else if iface.starts_with("org.freedesktop.ratbag1.") {
            /* Some device/profile/resolution/button/led property changed */
            info!("D-Bus: {iface} properties changed, emitting ratbag:resync");
            let _ = app.emit("ratbag:resync", ());
        }
    }

    warn!("D-Bus signal watcher stream ended");
    Ok(())
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

#[tauri::command]
pub async fn get_profile(
    state: State<'_, DaemonState>,
    path: String,
) -> Result<ProfileDto, String> {
    with_client!(state, |c| c.get_profile(&path))
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
    with_client!(state, |c| c.set_resolution_dpi(&path, dpi_x, dpi_y))
}

#[tauri::command]
pub async fn set_resolution_active(
    state: State<'_, DaemonState>,
    path: String,
) -> Result<(), String> {
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
    with_client!(state, |c| c.set_profile_report_rate(&path, rate))
}

#[tauri::command]
pub async fn set_profile_active(
    state: State<'_, DaemonState>,
    path: String,
) -> Result<(), String> {
    with_client!(state, |c| c.set_profile_active(&path))
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
    with_client!(state, |c| c.set_led_color(&path, r, g, b))
}

#[tauri::command]
pub async fn set_led_brightness(
    state: State<'_, DaemonState>,
    path: String,
    value: u32,
) -> Result<(), String> {
    with_client!(state, |c| c.set_led_brightness(&path, value))
}

#[tauri::command]
pub async fn set_led_effect_duration(
    state: State<'_, DaemonState>,
    path: String,
    ms: u32,
) -> Result<(), String> {
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
