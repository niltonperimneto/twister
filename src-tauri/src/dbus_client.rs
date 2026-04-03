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
        let (name, model, firmware_version, device_type, profile_paths) = tokio::join!(
            self.get_string(path, DEVICE_IFACE, "Name"),
            self.get_string(path, DEVICE_IFACE, "Model"),
            self.get_string(path, DEVICE_IFACE, "FirmwareVersion"),
            self.get_u32(path, DEVICE_IFACE, "DeviceType"),
            self.get_object_paths(path, DEVICE_IFACE, "Profiles"),
        );

        let profile_paths = profile_paths?;
        let profiles = try_join_all(profile_paths.iter().map(|pp| self.get_profile(pp))).await?;

        Ok(DeviceDto {
            path: path.to_owned(),
            name: name?,
            model: model?,
            firmware_version: firmware_version.unwrap_or_default(),
            device_type: device_type.unwrap_or(0),
            profiles,
        })
    }

    pub async fn commit_device(&self, path: &str) -> Result<u32> {
        let fut = self
            .conn
            .call_method(Some(BUS_NAME), path, Some(DEVICE_IFACE), "Commit", &());

        let reply = tokio::time::timeout(std::time::Duration::from_secs(10), fut)
            .await
            .map_err(|_| anyhow!("Commit timed out -- the device may not support onboard storage, but your changes are already applied live"))?
            .context("Commit call failed")?;
        let code: u32 = reply.body().deserialize()?;
        Ok(code)
    }

    /* ------------------------------------------------------------------ */
    /* Profile                                                             */
    /* ------------------------------------------------------------------ */

    pub async fn get_profile(&self, path: &str) -> Result<ProfileDto> {
        let (
            index, name, is_active, is_dirty, disabled,
            report_rate, report_rates, angle_snapping,
            debounce, debounces, capabilities,
            res_paths, btn_paths, led_paths,
        ) = tokio::join!(
            self.get_u32(path, PROFILE_IFACE, "Index"),
            self.get_string(path, PROFILE_IFACE, "Name"),
            self.get_bool(path, PROFILE_IFACE, "IsActive"),
            self.get_bool(path, PROFILE_IFACE, "IsDirty"),
            self.get_bool(path, PROFILE_IFACE, "Disabled"),
            self.get_u32(path, PROFILE_IFACE, "ReportRate"),
            self.get_vec_u32(path, PROFILE_IFACE, "ReportRates"),
            self.get_i32(path, PROFILE_IFACE, "AngleSnapping"),
            self.get_i32(path, PROFILE_IFACE, "Debounce"),
            self.get_vec_u32(path, PROFILE_IFACE, "Debounces"),
            self.get_vec_u32(path, PROFILE_IFACE, "Capabilities"),
            self.get_object_paths(path, PROFILE_IFACE, "Resolutions"),
            self.get_object_paths(path, PROFILE_IFACE, "Buttons"),
            self.get_object_paths(path, PROFILE_IFACE, "Leds"),
        );

        let (res_paths, btn_paths, led_paths) = (res_paths?, btn_paths?, led_paths?);

        let (resolutions, buttons, leds) = tokio::try_join!(
            try_join_all(res_paths.iter().map(|rp| self.get_resolution(rp))),
            try_join_all(btn_paths.iter().map(|bp| self.get_button(bp))),
            try_join_all(led_paths.iter().map(|lp| self.get_led(lp))),
        )?;

        Ok(ProfileDto {
            path: path.to_owned(),
            index: index?,
            name: name.unwrap_or_default(),
            is_active: is_active?,
            is_dirty: is_dirty.unwrap_or(false),
            disabled: disabled.unwrap_or(false),
            report_rate: report_rate.unwrap_or(0),
            report_rates: report_rates.unwrap_or_default(),
            angle_snapping: angle_snapping.unwrap_or(-1),
            debounce: debounce.unwrap_or(-1),
            debounces: debounces.unwrap_or_default(),
            capabilities: capabilities.unwrap_or_default(),
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
        let (index, capabilities, is_active, is_default, is_disabled, dpi_list, dpi) =
            tokio::join!(
                self.get_u32(path, RESOLUTION_IFACE, "Index"),
                self.get_vec_u32(path, RESOLUTION_IFACE, "Capabilities"),
                self.get_bool(path, RESOLUTION_IFACE, "IsActive"),
                self.get_bool(path, RESOLUTION_IFACE, "IsDefault"),
                self.get_bool(path, RESOLUTION_IFACE, "IsDisabled"),
                self.get_vec_u32(path, RESOLUTION_IFACE, "Resolutions"),
                self.parse_dpi(path),
            );

        let (dpi_x, dpi_y) = dpi?;

        Ok(ResolutionDto {
            path: path.to_owned(),
            index: index?,
            dpi_x,
            dpi_y,
            dpi_list: dpi_list.unwrap_or_default(),
            capabilities: capabilities.unwrap_or_default(),
            is_active: is_active?,
            is_default: is_default?,
            is_disabled: is_disabled.unwrap_or(false),
        })
    }

    pub async fn set_resolution_dpi(
        &self,
        path: &str,
        dpi_x: u32,
        dpi_y: Option<u32>,
    ) -> Result<()> {
        let y = dpi_y.unwrap_or(dpi_x);
        let owned = to_owned_value(Value::from((dpi_x, y)))?;
        let wrapped = Value::Value(Box::new(owned.into()));
        self.set_property(path, RESOLUTION_IFACE, "Resolution", wrapped)
            .await
    }

    pub async fn set_resolution_active(&self, path: &str) -> Result<()> {
        self.call_method(path, RESOLUTION_IFACE, "SetActive").await
    }

    /* ------------------------------------------------------------------ */
    /* Button                                                              */
    /* ------------------------------------------------------------------ */

    pub async fn get_button(&self, path: &str) -> Result<ButtonDto> {
        let (index, action_types, mapping) = tokio::join!(
            self.get_u32(path, BUTTON_IFACE, "Index"),
            self.get_vec_u32(path, BUTTON_IFACE, "ActionTypes"),
            self.parse_button_mapping(path),
        );

        let (action_type, action_value) = mapping?;

        Ok(ButtonDto {
            path: path.to_owned(),
            index: index?,
            action_type,
            action_value,
            action_types: action_types.unwrap_or_default(),
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
        let (
            index, mode, modes, color, secondary_color,
            tertiary_color, color_depth, effect_duration, brightness,
        ) = tokio::join!(
            self.get_u32(path, LED_IFACE, "Index"),
            self.get_u32(path, LED_IFACE, "Mode"),
            self.get_vec_u32(path, LED_IFACE, "Modes"),
            self.get_rgb(path, LED_IFACE, "Color"),
            self.get_rgb(path, LED_IFACE, "SecondaryColor"),
            self.get_rgb(path, LED_IFACE, "TertiaryColor"),
            self.get_u32(path, LED_IFACE, "ColorDepth"),
            self.get_u32(path, LED_IFACE, "EffectDuration"),
            self.get_u32(path, LED_IFACE, "Brightness"),
        );

        Ok(LedDto {
            path: path.to_owned(),
            index: index?,
            mode: mode?,
            modes: modes.unwrap_or_default(),
            color: color.unwrap_or_default(),
            secondary_color: secondary_color.unwrap_or_default(),
            tertiary_color: tertiary_color.unwrap_or_default(),
            color_depth: color_depth.unwrap_or(0),
            effect_duration: effect_duration.unwrap_or(0),
            brightness: brightness.unwrap_or(0),
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
                        Value::I32(n) if *n >= 0 => out.push(*n as u32),
                        Value::I32(n) => {
                            warn!("Negative i32 ({n}) in {iface}.{prop}, skipping");
                        }
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
        /* The Resolution property is typed as D-Bus variant `v`, so
         * Properties.Get returns v(v(...)). After zbus deserialises
         * the outer variant we may still have a Value::Value wrapper
         * that must be peeled off before inspecting the payload. */
        let inner = match Value::from(val) {
            Value::Value(v) => *v,
            other => other,
        };
        match inner {
            Value::U32(v) => Ok((v, None)),
            Value::Structure(s) => match s.fields() {
                [Value::U32(x), Value::U32(y)] if x == y => Ok((*x, None)),
                [Value::U32(x), Value::U32(y)] => Ok((*x, Some(*y))),
                other => {
                    warn!("Unexpected Resolution structure on {path}: {other:?}");
                    Ok((0, None))
                }
            },
            other => {
                warn!("Unexpected Resolution type on {path}: {other}");
                Ok((0, None))
            }
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
