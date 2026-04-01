use anyhow::{Context, Result, anyhow};
use futures::future::try_join_all;
use tracing::warn;
use zbus::Connection;
use zbus::zvariant::{OwnedValue, Value};

use crate::dto::{DeviceSummary, DeviceDto, ProfileDto, ResolutionDto, ButtonDto, ActionValueDto, LedDto, RgbDto};

const BUS_NAME: &str = "org.freedesktop.ratbag1";
const MANAGER_PATH: &str = "/org/freedesktop/ratbag1";
const MANAGER_IFACE: &str = "org.freedesktop.ratbag1.Manager";
const DEVICE_IFACE: &str = "org.freedesktop.ratbag1.Device";
const PROFILE_IFACE: &str = "org.freedesktop.ratbag1.Profile";
const RESOLUTION_IFACE: &str = "org.freedesktop.ratbag1.Resolution";
const BUTTON_IFACE: &str = "org.freedesktop.ratbag1.Button";
const LED_IFACE: &str = "org.freedesktop.ratbag1.Led";

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

pub struct RatbagClient {
    conn: Connection,
}

impl RatbagClient {
    /* Connect to the system bus (ratbagd runs as a root-owned
     * D-Bus-activated service on the system bus). */
    pub async fn connect() -> Result<Self> {
        let conn = Connection::system()
            .await
            .context("Cannot connect to the system D-Bus")?;
        Ok(Self { conn })
    }

    /* Returns a reference to the underlying zbus Connection for signal subscriptions. */
    pub fn connection(&self) -> &Connection {
        &self.conn
    }

    /* ------------------------------------------------------------------ */
    /* Manager                                                             */
    /* ------------------------------------------------------------------ */

    pub async fn api_version(&self) -> Result<i32> {
        self.get_i32(MANAGER_PATH, MANAGER_IFACE, "APIVersion")
            .await
    }

    pub async fn list_device_paths(&self) -> Result<Vec<String>> {
        self.get_object_paths(MANAGER_PATH, MANAGER_IFACE, "Devices")
            .await
    }

    pub async fn list_devices(&self) -> Result<Vec<DeviceSummary>> {
        let paths = self.list_device_paths().await?;
        let futs = paths.into_iter().map(|p| async move {
            let name = self.get_string(&p, DEVICE_IFACE, "Name").await
                .unwrap_or_else(|e| {
                    warn!("Failed to read Name for {p}: {e:#}");
                    String::new()
                });
            let model = self.get_string(&p, DEVICE_IFACE, "Model").await
                .unwrap_or_else(|e| {
                    warn!("Failed to read Model for {p}: {e:#}");
                    String::new()
                });
            Ok::<_, anyhow::Error>(DeviceSummary { path: p, name, model })
        });
        try_join_all(futs).await
    }

    /* ------------------------------------------------------------------ */
    /* Device                                                              */
    /* ------------------------------------------------------------------ */

    pub async fn get_device(&self, path: &str) -> Result<DeviceDto> {
        let name = self.get_string(path, DEVICE_IFACE, "Name").await?;
        let model = self.get_string(path, DEVICE_IFACE, "Model").await?;
        let firmware_version = self
            .get_string(path, DEVICE_IFACE, "FirmwareVersion")
            .await?;
        let device_type = self
            .get_u32(path, DEVICE_IFACE, "DeviceType")
            .await
            .unwrap_or(0);
        let profile_paths = self
            .get_object_paths(path, DEVICE_IFACE, "Profiles")
            .await?;

        let profiles = try_join_all(profile_paths.iter().map(|pp| self.get_profile(pp))).await?;

        Ok(DeviceDto {
            path: path.to_owned(),
            name,
            model,
            firmware_version,
            device_type,
            profiles,
        })
    }

    pub async fn commit_device(&self, path: &str) -> Result<u32> {
        let reply = self
            .conn
            .call_method(Some(BUS_NAME), path, Some(DEVICE_IFACE), "Commit", &())
            .await
            .context("Commit call failed")?;
        let code: u32 = reply.body().deserialize()?;
        Ok(code)
    }

    /* ------------------------------------------------------------------ */
    /* Profile                                                             */
    /* ------------------------------------------------------------------ */

    pub async fn get_profile(&self, path: &str) -> Result<ProfileDto> {
        let index = self.get_u32(path, PROFILE_IFACE, "Index").await?;
        let name = self
            .get_string(path, PROFILE_IFACE, "Name")
            .await
            .unwrap_or_default();
        let is_active = self.get_bool(path, PROFILE_IFACE, "IsActive").await?;
        let is_dirty = self
            .get_bool(path, PROFILE_IFACE, "IsDirty")
            .await
            .unwrap_or(false);
        let disabled = self
            .get_bool(path, PROFILE_IFACE, "Disabled")
            .await
            .unwrap_or(false);
        let report_rate = self
            .get_u32(path, PROFILE_IFACE, "ReportRate")
            .await
            .unwrap_or(0);
        let report_rates = self
            .get_vec_u32(path, PROFILE_IFACE, "ReportRates")
            .await
            .unwrap_or_default();
        let angle_snapping = self
            .get_i32(path, PROFILE_IFACE, "AngleSnapping")
            .await
            .unwrap_or(-1);
        let debounce = self
            .get_i32(path, PROFILE_IFACE, "Debounce")
            .await
            .unwrap_or(-1);
        let debounces = self
            .get_vec_u32(path, PROFILE_IFACE, "Debounces")
            .await
            .unwrap_or_default();
        let capabilities = self
            .get_vec_u32(path, PROFILE_IFACE, "Capabilities")
            .await
            .unwrap_or_default();

        let (res_paths, btn_paths, led_paths) = tokio::try_join!(
            self.get_object_paths(path, PROFILE_IFACE, "Resolutions"),
            self.get_object_paths(path, PROFILE_IFACE, "Buttons"),
            self.get_object_paths(path, PROFILE_IFACE, "Leds"),
        )?;

        let (resolutions, buttons, leds) = tokio::try_join!(
            try_join_all(res_paths.iter().map(|rp| self.get_resolution(rp))),
            try_join_all(btn_paths.iter().map(|bp| self.get_button(bp))),
            try_join_all(led_paths.iter().map(|lp| self.get_led(lp))),
        )?;

        Ok(ProfileDto {
            path: path.to_owned(),
            index,
            name,
            is_active,
            is_dirty,
            disabled,
            report_rate,
            report_rates,
            angle_snapping,
            debounce,
            debounces,
            capabilities,
            resolutions,
            buttons,
            leds,
        })
    }

    pub async fn set_profile_report_rate(&self, path: &str, rate: u32) -> Result<()> {
        self.set_property(path, PROFILE_IFACE, "ReportRate", Value::from(rate))
            .await
    }

    /* ------------------------------------------------------------------ */
    /* Resolution                                                          */
    /* ------------------------------------------------------------------ */

    pub async fn get_resolution(&self, path: &str) -> Result<ResolutionDto> {
        let index = self.get_u32(path, RESOLUTION_IFACE, "Index").await?;
        let capabilities = self
            .get_vec_u32(path, RESOLUTION_IFACE, "Capabilities")
            .await
            .unwrap_or_default();
        let is_active = self.get_bool(path, RESOLUTION_IFACE, "IsActive").await?;
        let is_default = self.get_bool(path, RESOLUTION_IFACE, "IsDefault").await?;
        let is_disabled = self
            .get_bool(path, RESOLUTION_IFACE, "IsDisabled")
            .await
            .unwrap_or(false);
        let dpi_list = self
            .get_vec_u32(path, RESOLUTION_IFACE, "Resolutions")
            .await
            .unwrap_or_default();

        let (dpi_x, dpi_y) = self.parse_dpi(path).await?;

        Ok(ResolutionDto {
            path: path.to_owned(),
            index,
            dpi_x,
            dpi_y,
            dpi_list,
            capabilities,
            is_active,
            is_default,
            is_disabled,
        })
    }

    pub async fn set_resolution_dpi(
        &self,
        path: &str,
        dpi_x: u32,
        dpi_y: Option<u32>,
    ) -> Result<()> {
        let value = match dpi_y {
            Some(y) => Value::from((dpi_x, y)),
            None => Value::from(dpi_x),
        };
        self.set_property(path, RESOLUTION_IFACE, "Resolution", value)
            .await
    }

    pub async fn set_resolution_active(&self, path: &str) -> Result<()> {
        self.call_method(path, RESOLUTION_IFACE, "SetActive").await
    }

    /* ------------------------------------------------------------------ */
    /* Button                                                              */
    /* ------------------------------------------------------------------ */

    pub async fn get_button(&self, path: &str) -> Result<ButtonDto> {
        let index = self.get_u32(path, BUTTON_IFACE, "Index").await?;
        let action_types = self
            .get_vec_u32(path, BUTTON_IFACE, "ActionTypes")
            .await
            .unwrap_or_default();

        let (action_type, action_value) = self.parse_button_mapping(path).await?;

        Ok(ButtonDto {
            path: path.to_owned(),
            index,
            action_type,
            action_value,
            action_types,
        })
    }

    pub async fn set_button_mapping(
        &self,
        path: &str,
        action_type: u32,
        value: &ActionValueDto,
    ) -> Result<()> {
        let payload = match value {
            ActionValueDto::None | ActionValueDto::Unknown => to_owned_value(Value::from(0_u32))?,
            ActionValueDto::Button { button } => to_owned_value(Value::from(*button))?,
            ActionValueDto::Special { special } => to_owned_value(Value::from(*special))?,
            ActionValueDto::Key { keycode } => to_owned_value(Value::from(*keycode))?,
            ActionValueDto::Macro { entries } => to_owned_value(Value::from(entries.clone()))?,
        };

        let mapping = to_owned_value(Value::from((action_type, payload)))?;
        self.set_property(path, BUTTON_IFACE, "Mapping", mapping.into())
            .await
    }

    /* ------------------------------------------------------------------ */
    /* LED                                                                 */
    /* ------------------------------------------------------------------ */

    pub async fn get_led(&self, path: &str) -> Result<LedDto> {
        let index = self.get_u32(path, LED_IFACE, "Index").await?;
        let mode = self.get_u32(path, LED_IFACE, "Mode").await?;
        let modes = self
            .get_vec_u32(path, LED_IFACE, "Modes")
            .await
            .unwrap_or_default();
        let color = self
            .get_rgb(path, LED_IFACE, "Color")
            .await
            .unwrap_or_default();
        let secondary_color = self
            .get_rgb(path, LED_IFACE, "SecondaryColor")
            .await
            .unwrap_or_default();
        let tertiary_color = self
            .get_rgb(path, LED_IFACE, "TertiaryColor")
            .await
            .unwrap_or_default();
        let color_depth = self
            .get_u32(path, LED_IFACE, "ColorDepth")
            .await
            .unwrap_or(0);
        let effect_duration = self
            .get_u32(path, LED_IFACE, "EffectDuration")
            .await
            .unwrap_or(0);
        let brightness = self
            .get_u32(path, LED_IFACE, "Brightness")
            .await
            .unwrap_or(0);

        Ok(LedDto {
            path: path.to_owned(),
            index,
            mode,
            modes,
            color,
            secondary_color,
            tertiary_color,
            color_depth,
            effect_duration,
            brightness,
        })
    }

    pub async fn set_led_mode(&self, path: &str, mode: u32) -> Result<()> {
        self.set_property(path, LED_IFACE, "Mode", Value::from(mode))
            .await
    }

    pub async fn set_led_color(&self, path: &str, r: u32, g: u32, b: u32) -> Result<()> {
        self.set_property(path, LED_IFACE, "Color", Value::from((r, g, b)))
            .await
    }

    pub async fn set_led_brightness(&self, path: &str, value: u32) -> Result<()> {
        self.set_property(path, LED_IFACE, "Brightness", Value::from(value))
            .await
    }

    pub async fn set_led_effect_duration(&self, path: &str, ms: u32) -> Result<()> {
        self.set_property(path, LED_IFACE, "EffectDuration", Value::from(ms))
            .await
    }

    /* ================================================================== */
    /* Private helpers                                                     */
    /* ================================================================== */

    /* Low-level D-Bus property read. */
    async fn get_property(&self, path: &str, iface: &str, prop: &str) -> Result<OwnedValue> {
        let reply = self
            .conn
            .call_method(
                Some(BUS_NAME),
                path,
                Some("org.freedesktop.DBus.Properties"),
                "Get",
                &(iface, prop),
            )
            .await
            .with_context(|| format!("Get {iface}.{prop} on {path}"))?;
        let val: OwnedValue = reply.body().deserialize()?;
        Ok(val)
    }

    /* Low-level D-Bus property write. */
    async fn set_property(
        &self,
        path: &str,
        iface: &str,
        prop: &str,
        value: Value<'_>,
    ) -> Result<()> {
        self.conn
            .call_method(
                Some(BUS_NAME),
                path,
                Some("org.freedesktop.DBus.Properties"),
                "Set",
                &(iface, prop, value),
            )
            .await
            .with_context(|| format!("Set {iface}.{prop} on {path}"))?;
        Ok(())
    }

    /* Low-level no-arg D-Bus method call (SetActive, etc.). */
    async fn call_method(&self, path: &str, iface: &str, method: &str) -> Result<()> {
        self.conn
            .call_method(Some(BUS_NAME), path, Some(iface), method, &())
            .await
            .with_context(|| format!("{method} on {path}"))?;
        Ok(())
    }

    /* ---- Typed property readers ---- */

    async fn get_string(&self, path: &str, iface: &str, prop: &str) -> Result<String> {
        let val = self.get_property(path, iface, prop).await?;
        match Value::from(val) {
            Value::Str(s) => Ok(s.to_string()),
            other => Ok(format!("{other}")),
        }
    }

    async fn get_u32(&self, path: &str, iface: &str, prop: &str) -> Result<u32> {
        let val = self.get_property(path, iface, prop).await?;
        match Value::from(val) {
            Value::U32(v) => Ok(v),
            Value::I32(v) => u32::try_from(v).map_err(|_| {
                anyhow!("Negative i32 ({v}) cannot convert to u32 for {iface}.{prop}")
            }),
            other => Err(anyhow!("Expected u32 for {iface}.{prop}, got {other}")),
        }
    }

    async fn get_i32(&self, path: &str, iface: &str, prop: &str) -> Result<i32> {
        let val = self.get_property(path, iface, prop).await?;
        match Value::from(val) {
            Value::I32(v) => Ok(v),
            Value::U32(v) => i32::try_from(v)
                .map_err(|_| anyhow!("u32 ({v}) exceeds i32 range for {iface}.{prop}")),
            other => Err(anyhow!("Expected i32 for {iface}.{prop}, got {other}")),
        }
    }

    async fn get_bool(&self, path: &str, iface: &str, prop: &str) -> Result<bool> {
        let val = self.get_property(path, iface, prop).await?;
        match Value::from(val) {
            Value::Bool(v) => Ok(v),
            other => Err(anyhow!("Expected bool for {iface}.{prop}, got {other}")),
        }
    }

    async fn get_vec_u32(&self, path: &str, iface: &str, prop: &str) -> Result<Vec<u32>> {
        let val = self.get_property(path, iface, prop).await?;
        match Value::from(val) {
            Value::Array(arr) => {
                let mut out = Vec::with_capacity(arr.len());
                for v in arr.iter() {
                    match v {
                        Value::U32(n) => out.push(*n),
                        Value::I32(n) => out.push((*n).cast_unsigned()),
                        other => {
                            warn!("Unexpected element {other} in {iface}.{prop}, skipping");
                        }
                    }
                }
                Ok(out)
            }
            other => Err(anyhow!("Expected array for {iface}.{prop}, got {other}")),
        }
    }

    async fn get_rgb(&self, path: &str, iface: &str, prop: &str) -> Result<RgbDto> {
        let val = self.get_property(path, iface, prop).await?;
        if let Value::Structure(s) = Value::from(val)
            && let [Value::U32(r), Value::U32(g), Value::U32(b)] = s.fields()
        {
            return Ok(RgbDto { r: *r, g: *g, b: *b });
        }
        Ok(RgbDto::default())
    }

    async fn get_object_paths(&self, path: &str, iface: &str, prop: &str) -> Result<Vec<String>> {
        let val = self.get_property(path, iface, prop).await?;
        match Value::from(val) {
            Value::Array(arr) => {
                let mut out = Vec::with_capacity(arr.len());
                for v in arr.iter() {
                    match v {
                        Value::ObjectPath(p) => out.push(p.to_string()),
                        Value::Str(s) => out.push(s.to_string()),
                        other => {
                            warn!("Unexpected element {other} in {iface}.{prop}, skipping");
                        }
                    }
                }
                Ok(out)
            }
            other => Err(anyhow!("Expected array of object paths for {iface}.{prop}, got {other}")),
        }
    }

    /* ---- Complex property parsers ---- */

    async fn parse_dpi(&self, path: &str) -> Result<(u32, Option<u32>)> {
        let val = self
            .get_property(path, RESOLUTION_IFACE, "Resolution")
            .await?;
        match Value::from(val) {
            Value::U32(v) => Ok((v, None)),
            Value::Structure(s) => match s.fields() {
                [Value::U32(x), Value::U32(y)] if x == y => Ok((*x, None)),
                [Value::U32(x), Value::U32(y)] => Ok((*x, Some(*y))),
                _ => Ok((0, None)),
            },
            _ => Ok((0, None)),
        }
    }

    async fn parse_button_mapping(&self, path: &str) -> Result<(u32, ActionValueDto)> {
        let val = self.get_property(path, BUTTON_IFACE, "Mapping").await?;

        if let Value::Structure(s) = Value::from(val)
            && let [type_val, payload] = s.fields()
        {
            let action_type = match type_val {
                Value::U32(v) => *v,
                _ => 0,
            };

            let action_value = match action_type {
                0 => ActionValueDto::None,
                1 => extract_u32(payload)
                    .map_or(ActionValueDto::None, |b| ActionValueDto::Button { button: b }),
                2 => extract_u32(payload)
                    .map_or(ActionValueDto::None, |s| ActionValueDto::Special { special: s }),
                3 => extract_u32(payload)
                    .map_or(ActionValueDto::None, |k| ActionValueDto::Key { keycode: k }),
                4 => ActionValueDto::Macro {
                    entries: extract_macro_entries(payload),
                },
                _ => ActionValueDto::Unknown,
            };

            return Ok((action_type, action_value));
        }
        Ok((0, ActionValueDto::None))
    }
}

/* ================================================================== */
/* Free-standing helpers                                                */
/* ================================================================== */

/* Convert a Value into an OwnedValue, mapping the error into anyhow. */
fn to_owned_value(v: Value<'_>) -> Result<OwnedValue> {
    OwnedValue::try_from(v).map_err(|e| anyhow!("Failed to encode D-Bus value: {e}"))
}

/* Unwrap nested Value::Value wrappers (D-Bus variant-in-variant)
 * and extract a u32 if one is found. */
fn extract_u32(v: &Value<'_>) -> Option<u32> {
    match v {
        Value::U32(n) => Some(*n),
        Value::Value(inner) => extract_u32(inner),
        _ => None,
    }
}

/* Unwrap nested variants and extract a macro entry array [(u32, u32)]. */
fn extract_macro_entries(v: &Value<'_>) -> Vec<(u32, u32)> {
    match v {
        Value::Array(arr) => arr
            .iter()
            .filter_map(|v| {
                if let Value::Structure(es) = v
                    && let [Value::U32(a), Value::U32(b)] = es.fields()
                {
                    return Some((*a, *b));
                }
                None
            })
            .collect(),
        Value::Value(inner) => extract_macro_entries(inner),
        _ => Vec::new(),
    }
}
