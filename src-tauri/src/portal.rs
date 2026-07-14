/* XDG Desktop Portal Settings client — system accent color.
 *
 * Read-only consumer of org.freedesktop.portal.Settings on the session
 * bus. Every failure path (no bus, no portal, portal too old for the
 * accent-color key) resolves to None so the frontend silently falls
 * back to the active theme's stock accent. */

use std::sync::Arc;

use futures::StreamExt;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::RwLock;
use tracing::{info, warn};
use zbus::zvariant::{OwnedValue, Value};

#[zbus::proxy(
    interface = "org.freedesktop.portal.Settings",
    default_service = "org.freedesktop.portal.Desktop",
    default_path = "/org/freedesktop/portal/desktop"
)]
trait PortalSettings {
    /// Settings v2+. Portals old enough to lack ReadOne also predate
    /// the accent-color key, so no legacy Read fallback is needed.
    fn read_one(&self, namespace: &str, key: &str) -> zbus::Result<OwnedValue>;

    #[zbus(signal)]
    fn setting_changed(&self, namespace: &str, key: &str, value: Value<'_>) -> zbus::Result<()>;
}

const APPEARANCE_NS: &str = "org.freedesktop.appearance";
const ACCENT_KEY: &str = "accent-color";

/// Unwraps a (possibly variant-nested) portal value into an sRGB triple.
/// Out-of-range components mean "no preference" per the spec → None.
fn accent_from_value(value: &Value<'_>) -> Option<[f64; 3]> {
    let inner = match value {
        Value::Value(boxed) => boxed.as_ref(),
        other => other,
    };
    let (r, g, b) = <(f64, f64, f64)>::try_from(inner.try_clone().ok()?).ok()?;
    let in_range = |c: f64| (0.0..=1.0).contains(&c);
    (in_range(r) && in_range(g) && in_range(b)).then_some([r, g, b])
}

pub struct AccentState {
    watcher: Arc<RwLock<Option<tokio::task::JoinHandle<()>>>>,
}

impl Default for AccentState {
    fn default() -> Self {
        Self {
            watcher: Arc::new(RwLock::new(None)),
        }
    }
}

/// Returns the current system accent as `[r, g, b]` doubles (0–1) and
/// starts a watcher that re-emits portal changes as `system:accent`
/// events. Unavailability is `Ok(None)`, never an error.
#[tauri::command]
pub async fn watch_system_accent(
    state: State<'_, AccentState>,
    app: AppHandle,
) -> Result<Option<[f64; 3]>, String> {
    let conn = match zbus::Connection::session().await {
        Ok(c) => c,
        Err(e) => {
            info!("No session bus — system accent unavailable: {e:#}");
            return Ok(None);
        }
    };
    let proxy = match PortalSettingsProxy::new(&conn).await {
        Ok(p) => p,
        Err(e) => {
            info!("Portal settings proxy unavailable: {e:#}");
            return Ok(None);
        }
    };

    let current = match proxy.read_one(APPEARANCE_NS, ACCENT_KEY).await {
        Ok(value) => accent_from_value(&Value::from(value)),
        Err(e) => {
            info!("Portal accent-color unavailable: {e:#}");
            None
        }
    };

    /* Abort any previous watcher (webview reload) before spawning a new
     * one — same lifecycle as the ratbagd/clackd signal watchers. */
    {
        let mut watcher = state.watcher.write().await;
        if let Some(handle) = watcher.take() {
            handle.abort();
        }
    }
    let handle = tokio::spawn(watch_accent_changes(proxy, app));
    *state.watcher.write().await = Some(handle);

    Ok(current)
}

async fn watch_accent_changes(proxy: PortalSettingsProxy<'static>, app: AppHandle) {
    let mut stream = match proxy.receive_setting_changed().await {
        Ok(s) => s,
        Err(e) => {
            warn!("Portal accent watcher failed to subscribe: {e:#}");
            return;
        }
    };
    info!("Portal accent watcher started");
    while let Some(signal) = stream.next().await {
        let Ok(args) = signal.args() else { continue };
        if args.namespace != APPEARANCE_NS || args.key != ACCENT_KEY {
            continue;
        }
        let accent = accent_from_value(&args.value);
        info!("Portal accent changed: {accent:?}");
        let _ = app.emit("system:accent", accent);
    }
    warn!("Portal accent signal stream ended");
}
