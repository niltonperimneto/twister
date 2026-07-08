/* Data-transfer objects serialised to the Svelte frontend via Tauri IPC.
 *
 * Every DTO is a plain, capability-rich JSON structure.  The frontend never
 * sees raw D-Bus variants, object-path strings, or ad-hoc tuples.
 * Capability lists and allowed-value arrays are always included so the UI
 * can render controls conditionally without a second round-trip. */

use serde::{Deserialize, Serialize};

/* ------------------------------------------------------------------ */
/* Top-level connection status                                         */
/* ------------------------------------------------------------------ */

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status")]
pub enum DaemonStatus {
    #[serde(rename = "connected")]
    Connected {
        api_version: i32,
        /// `"session"` for libratbag-rs, `"system"` for legacy C libratbag.
        bus_type: String,
    },
    #[serde(rename = "disconnected")]
    Disconnected { reason: String },
}

/* ------------------------------------------------------------------ */
/* Device                                                              */
/* ------------------------------------------------------------------ */

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceSummary {
    pub path: String,
    pub name: String,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceDto {
    pub path: String,
    pub name: String,
    pub model: String,
    pub firmware_version: String,
    pub device_type: u32,
    pub profiles: Vec<ProfileDto>,
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileDto {
    pub path: String,
    pub index: u32,
    pub name: String,
    pub is_active: bool,
    pub is_dirty: bool,
    pub disabled: bool,
    pub report_rate: u32,
    pub report_rates: Vec<u32>,
    pub angle_snapping: i32,
    pub debounce: i32,
    pub debounces: Vec<u32>,
    pub capabilities: Vec<u32>,
    pub resolutions: Vec<ResolutionDto>,
    pub buttons: Vec<ButtonDto>,
    pub leds: Vec<LedDto>,
}

/* ------------------------------------------------------------------ */
/* Resolution                                                          */
/* ------------------------------------------------------------------ */

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolutionDto {
    pub path: String,
    pub index: u32,
    pub dpi_x: u32,
    pub dpi_y: Option<u32>,
    pub dpi_list: Vec<u32>,
    pub capabilities: Vec<u32>,
    pub is_active: bool,
    pub is_default: bool,
    pub is_disabled: bool,
}

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ButtonDto {
    pub path: String,
    pub index: u32,
    pub action_type: u32,
    pub action_value: ActionValueDto,
    pub action_types: Vec<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum ActionValueDto {
    #[serde(rename = "none")]
    None,
    #[serde(rename = "button")]
    Button { button: u32 },
    #[serde(rename = "special")]
    Special { special: u32 },
    #[serde(rename = "key")]
    Key { keycode: u32 },
    #[serde(rename = "macro")]
    Macro { entries: Vec<(u32, u32)> },
    #[serde(rename = "unknown")]
    Unknown,
}

/* ------------------------------------------------------------------ */
/* LED                                                                 */
/* ------------------------------------------------------------------ */

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedDto {
    pub path: String,
    pub index: u32,
    pub mode: u32,
    pub modes: Vec<u32>,
    pub color: RgbDto,
    pub secondary_color: RgbDto,
    pub tertiary_color: RgbDto,
    pub color_depth: u32,
    pub effect_duration: u32,
    pub brightness: u32,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct RgbDto {
    pub r: u32,
    pub g: u32,
    pub b: u32,
}

/* ================================================================== */
/* Keyboards (clackd)                                                  */
/* ================================================================== */

/* clackd connection status. Mirrors `DaemonStatus`'s tagged shape but has no
 * api_version field — clackd exposes no APIVersion property. Connection
 * failure is surfaced (not raised) so a missing keyboard daemon never blocks
 * the mouse UI. */
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status")]
pub enum ClackdStatus {
    #[serde(rename = "connected")]
    Connected,
    #[serde(rename = "disconnected")]
    Disconnected { reason: String },
}

/* Physical identity of a keyboard, used by the frontend to match a bundled
 * VIA layout definition (keyed on vid:pid). `None` on `KeyboardDeviceDto` when
 * the daemon predates clackd's GetDeviceIdentity method. Whether a definition
 * actually matched is a frontend concern (see the keyboard render model), not
 * reported here. `name` is best-effort and may be empty. */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyboardIdentity {
    pub vendor_id: u16,
    pub product_id: u16,
    pub name: String,
}

/* Sidebar entry for a connected keyboard. `id` is clackd's opaque device id
 * (the udev sysname, e.g. "hidraw0"). */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyboardSummary {
    pub id: String,
    pub name: String,
}

/* A keyboard plus its topology and (lazily-filled) keymap.
 *
 * `keymap[layer]` is a row-major `Vec<u16>` of length rows*cols, or empty if
 * that layer has not been fetched yet (only layer 0 is loaded on select; other
 * layers are pulled on demand via `get_keymap`). */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyboardDeviceDto {
    pub id: String,
    /* Driver-reported model name from clackd's `GetDeviceInfo`. Doubles as the
     * lighting-protocol discriminator: clackd's native VIA fallback driver
     * reports "VIA keyboard" (custom-channel RGB-Matrix protocol), while legacy
     * polyfill drivers report a bespoke name (e.g. "GMK67/EK68", single-blob
     * protocol). The frontend branches its lighting read/write on this. */
    pub model: String,
    pub rows: u8,
    pub cols: u8,
    pub layers: u8,
    pub identity: Option<KeyboardIdentity>,
    pub keymap: Vec<Vec<u16>>,
}
