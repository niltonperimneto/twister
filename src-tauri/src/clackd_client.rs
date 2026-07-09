/* D-Bus client for the clackd keyboard daemon.
 *
 * clackd (github.com/niltonperimneto/clackd) is an unprivileged, VIA-first
 * keyboard-configuration daemon that exposes a flat, string-keyed D-Bus API on
 * the *session* bus. Unlike ratbagd's object-path + Properties tree, every
 * clackd operation is a plain method keyed by the device's udev sysname
 * (e.g. "hidraw0"), so this client is a thin zbus #[proxy] wrapper rather than
 * the hand-rolled Properties adapter used for mice.
 *
 * Notable contract details (see clackd src/ipc/frontend.rs):
 *  - No host-side cache: every GetKeycode is a live hidraw round-trip and every
 *    SetKeycode writes EEPROM immediately (~100k-cycle wear). Callers must
 *    debounce writes and commit sparingly.
 *  - No bulk read: keymaps are read one (layer,row,col) slot at a time, so a
 *    full layer is rows*cols separate calls. `read_layer` pipelines them.
 *  - No APIVersion property: liveness is probed via ListDevices instead. */

use anyhow::{Context, Result};
use futures::stream::{StreamExt, TryStreamExt};
use zbus::Connection;

/* ------------------------------------------------------------------ */
/* Generated proxy                                                     */
/* ------------------------------------------------------------------ */

/* zbus maps the snake_case method names below to clackd's PascalCase wire
 * names (get_keycode -> GetKeycode, etc.), matching the interface defined in
 * clackd's `#[zbus::interface(name = "io.github.clackd.Device")]`. */
#[zbus::proxy(
    interface = "io.github.clackd.Device",
    default_service = "io.github.clackd",
    default_path = "/io/github/clackd"
)]
pub trait Clackd {
    /// Read the keycode at `(layer, row, col)` (live hardware round-trip).
    fn get_keycode(&self, device_id: &str, layer: u8, row: u8, col: u8) -> zbus::Result<u16>;

    /// Write a keycode to `(layer, row, col)` (immediate EEPROM write).
    fn set_keycode(
        &self,
        device_id: &str,
        layer: u8,
        row: u8,
        col: u8,
        keycode: u16,
    ) -> zbus::Result<()>;

    /// Enumerate the IDs of all currently-connected devices.
    fn list_devices(&self) -> zbus::Result<Vec<String>>;

    /// Return the `(model, rows, cols, layer_count)` topology of a device.
    fn get_device_info(&self, device_id: &str) -> zbus::Result<(String, u8, u8, u8)>;

    /// Return the `(vendor_id, product_id, product_name)` USB identity.
    /// Used to match a bundled VIA layout definition. Requires clackd with the
    /// `GetDeviceIdentity` method; older daemons return an `UnknownMethod`
    /// error, which the client treats as "identity unavailable".
    fn get_device_identity(&self, device_id: &str) -> zbus::Result<(u16, u16, String)>;

    /// Force a commit / NVRAM flush for a device.
    fn commit(&self, device_id: &str) -> zbus::Result<()>;

    /// Read the lighting configuration for a `(channel, value_id)` pair.
    fn get_lighting(&self, device_id: &str, channel: u8, value_id: u8) -> zbus::Result<Vec<u8>>;

    /// Write the lighting configuration for a `(channel, value_id)` pair.
    fn set_lighting(&self, device_id: &str, channel: u8, value_id: u8, data: &[u8]) -> zbus::Result<()>;

    /* Macro / lighting methods exist on the interface (Get/SetMacro,
     * Get/SetLighting) and are deferred to later phases. Adding a future
     * `GetDeviceIdentity(device_id) -> (vid, pid, name)` here is the planned
     * route to VIA-definition matching. */

    /// Fired after a layout change finalises (every `SetKeycode` on unbuffered VIA).
    #[zbus(signal)]
    fn layout_updated(&self, device_id: &str) -> zbus::Result<()>;

    /// Fired when a device is attached or successfully reattached.
    #[zbus(signal)]
    fn device_added(&self, device_id: &str) -> zbus::Result<()>;

    /// Fired when a device is detached or its worker is evicted.
    #[zbus(signal)]
    fn device_removed(&self, device_id: &str) -> zbus::Result<()>;
}

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

pub struct ClackdClient {
    conn: Connection,
    proxy: ClackdProxy<'static>,
}

impl ClackdClient {
    /* Connect to clackd on the session bus and confirm it is answering.
     *
     * clackd is a user-session service activated via udev/uaccess; it only
     * ever lives on the session bus (never the system bus), so unlike the
     * ratbag client there is no bus probing. `list_devices` doubles as a
     * liveness probe since clackd has no APIVersion property — it is
     * registry-only (no hardware access) and returns an empty array cleanly
     * when nothing is attached. */
    pub async fn connect() -> Result<Self> {
        let conn = Connection::session()
            .await
            .context("Cannot connect to the session D-Bus")?;
        let proxy = ClackdProxy::new(&conn)
            .await
            .context("Cannot build the clackd proxy")?;
        let client = Self { conn, proxy };
        client
            .list_devices()
            .await
            .context("clackd service did not respond")?;
        Ok(client)
    }

    /* Underlying connection — used by the signal watcher to subscribe to
     * DeviceAdded/DeviceRemoved/LayoutUpdated. */
    pub fn connection(&self) -> &Connection {
        &self.conn
    }

    pub async fn list_devices(&self) -> Result<Vec<String>> {
        self.proxy
            .list_devices()
            .await
            .context("ListDevices failed")
    }

    pub async fn get_device_info(&self, id: &str) -> Result<(String, u8, u8, u8)> {
        self.proxy
            .get_device_info(id)
            .await
            .with_context(|| format!("GetDeviceInfo failed for {id}"))
    }

    /* Identity is optional: a clackd predating GetDeviceIdentity replies with a
     * D-Bus UnknownMethod error. Treat any failure as "no identity" (Ok(None))
     * so layout matching simply falls back to the matrix grid rather than
     * failing the whole device load. */
    pub async fn get_device_identity(&self, id: &str) -> Result<Option<(u16, u16, String)>> {
        match self.proxy.get_device_identity(id).await {
            Ok(identity) => Ok(Some(identity)),
            Err(e) => {
                tracing::info!("GetDeviceIdentity unavailable for {id}: {e}");
                Ok(None)
            }
        }
    }

    pub async fn get_keycode(&self, id: &str, layer: u8, row: u8, col: u8) -> Result<u16> {
        self.proxy
            .get_keycode(id, layer, row, col)
            .await
            .with_context(|| format!("GetKeycode({id}, {layer}, {row}, {col}) failed"))
    }

    pub async fn set_keycode(
        &self,
        id: &str,
        layer: u8,
        row: u8,
        col: u8,
        keycode: u16,
    ) -> Result<()> {
        self.proxy
            .set_keycode(id, layer, row, col, keycode)
            .await
            .with_context(|| format!("SetKeycode({id}, {layer}, {row}, {col}) failed"))
    }

    pub async fn commit(&self, id: &str) -> Result<()> {
        let fut = self.proxy.commit(id);
        tokio::time::timeout(std::time::Duration::from_secs(10), fut)
            .await
            .map_err(|_| {
                anyhow::anyhow!(
                    "Commit timed out -- changes may already be live but the NVRAM flush did not confirm"
                )
            })?
            .with_context(|| format!("Commit failed for {id}"))
    }

    pub async fn get_lighting(&self, id: &str, channel: u8, value_id: u8) -> Result<Vec<u8>> {
        self.proxy
            .get_lighting(id, channel, value_id)
            .await
            .with_context(|| format!("GetLighting({id}, ch={channel}, val={value_id}) failed"))
    }

    pub async fn set_lighting(&self, id: &str, channel: u8, value_id: u8, data: &[u8]) -> Result<()> {
        self.proxy
            .set_lighting(id, channel, value_id, data)
            .await
            .with_context(|| format!("SetLighting({id}, ch={channel}, val={value_id}) failed"))
    }

    /* Read one full layer as a row-major `Vec<u16>` of length rows*cols.
     *
     * clackd has no bulk-read primitive, so this issues rows*cols individual
     * GetKeycode calls. They are pipelined with `try_join_all` to hide D-Bus
     * latency (clackd still serialises them per-device at the worker, but the
     * round-trips overlap rather than stacking sequentially). Callers should
     * read lazily (one layer at a time, on demand) to bound the cost. */
    pub async fn read_layer(&self, id: &str, layer: u8, rows: u8, cols: u8) -> Result<Vec<u16>> {
        let slots = (0..rows).flat_map(|row| (0..cols).map(move |col| (row, col)));
        let futs = slots.map(|(row, col)| self.get_keycode(id, layer, row, col));
        futures::stream::iter(futs)
            .buffered(10)
            .try_collect()
            .await
    }
}
