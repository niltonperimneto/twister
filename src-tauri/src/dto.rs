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
    Connected { api_version: i32 },
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
