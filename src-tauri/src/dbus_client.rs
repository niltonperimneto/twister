/* Async D-Bus client for org.freedesktop.ratbag1 on the system bus.
 *
 * Modelled on ratbagctl-rs/src/dbus_client.rs but returns DTOs instead of
 * printing to stdout.  All methods are &self and use the shared zbus
 * Connection, which is internally thread-safe. */

use anyhow::{anyhow, Context, Result};
use futures::future::try_join_all;
use zbus::zvariant::{OwnedValue, Value};
use zbus::Connection;

use crate::dto::*;

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

    /// Returns a reference to the underlying zbus Connection for signal subscriptions.
    pub fn connection(&self) -> &Connection {
        &self.conn
    }

    /* ------------------------------------------------------------------ */
    /* Manager                                                             */
    /* ------------------------------------------------------------------ */

    pub async fn api_version(&self) -> Result<i32> {
        self.get_i32(MANAGER_PATH, MANAGER_IFACE, "APIVersion").await
    }

    pub async fn list_device_paths(&self) -> Result<Vec<String>> {
        let val = self.get_property(MANAGER_PATH, MANAGER_IFACE, "Devices").await?;
        extract_object_path_array(val)
    }

    pub async fn list_devices(&self) -> Result<Vec<DeviceSummary>> {
        let paths = self.list_device_paths().await?;
        let futs = paths.into_iter().map(|p| async move {
            let name = self.get_string(&p, DEVICE_IFACE, "Name").await.unwrap_or_default();
            let model = self.get_string(&p, DEVICE_IFACE, "Model").await.unwrap_or_default();
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
        let firmware_version = self.get_string(path, DEVICE_IFACE, "FirmwareVersion").await?;
        let device_type = self.get_u32(path, DEVICE_IFACE, "DeviceType").await.unwrap_or(0);
        let profile_paths = {
            let val = self.get_property(path, DEVICE_IFACE, "Profiles").await?;
            extract_object_path_array(val)?
        };

        let profiles = try_join_all(
            profile_paths.iter().map(|pp| self.get_profile(pp)),
        ).await?;

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
        let name = self.get_string(path, PROFILE_IFACE, "Name").await.unwrap_or_default();
        let is_active = self.get_bool(path, PROFILE_IFACE, "IsActive").await?;
        let is_dirty = self.get_bool(path, PROFILE_IFACE, "IsDirty").await.unwrap_or(false);
        let disabled = self.get_bool(path, PROFILE_IFACE, "Disabled").await.unwrap_or(false);
        let report_rate = self.get_u32(path, PROFILE_IFACE, "ReportRate").await.unwrap_or(0);
        let report_rates = self.get_vec_u32(path, PROFILE_IFACE, "ReportRates").await.unwrap_or_default();
        let angle_snapping = self.get_i32(path, PROFILE_IFACE, "AngleSnapping").await.unwrap_or(-1);
        let debounce = self.get_i32(path, PROFILE_IFACE, "Debounce").await.unwrap_or(-1);
        let debounces = self.get_vec_u32(path, PROFILE_IFACE, "Debounces").await.unwrap_or_default();
        let capabilities = self.get_vec_u32(path, PROFILE_IFACE, "Capabilities").await.unwrap_or_default();

        let res_paths = {
            let val = self.get_property(path, PROFILE_IFACE, "Resolutions").await?;
            extract_object_path_array(val)?
        };
        let btn_paths = {
            let val = self.get_property(path, PROFILE_IFACE, "Buttons").await?;
            extract_object_path_array(val)?
        };
        let led_paths = {
            let val = self.get_property(path, PROFILE_IFACE, "Leds").await?;
            extract_object_path_array(val)?
        };

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
        self.set_property(path, PROFILE_IFACE, "ReportRate", Value::from(rate)).await
    }

    pub async fn set_profile_active(&self, path: &str) -> Result<()> {
        self.conn
            .call_method(Some(BUS_NAME), path, Some(PROFILE_IFACE), "SetActive", &())
            .await
            .context("SetActive call failed")?;
        Ok(())
    }

    /* ------------------------------------------------------------------ */
    /* Resolution                                                          */
    /* ------------------------------------------------------------------ */

    pub async fn get_resolution(&self, path: &str) -> Result<ResolutionDto> {
        let index = self.get_u32(path, RESOLUTION_IFACE, "Index").await?;
        let capabilities = self.get_vec_u32(path, RESOLUTION_IFACE, "Capabilities").await.unwrap_or_default();
        let is_active = self.get_bool(path, RESOLUTION_IFACE, "IsActive").await?;
        let is_default = self.get_bool(path, RESOLUTION_IFACE, "IsDefault").await?;
        let is_disabled = self.get_bool(path, RESOLUTION_IFACE, "IsDisabled").await.unwrap_or(false);
        let dpi_list = self.get_vec_u32(path, RESOLUTION_IFACE, "Resolutions").await.unwrap_or_default();

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

    pub async fn set_resolution_dpi(&self, path: &str, dpi_x: u32, dpi_y: Option<u32>) -> Result<()> {
        let value: OwnedValue = if let Some(y) = dpi_y {
            OwnedValue::try_from(Value::from((dpi_x, y)))
                .map_err(|e| anyhow!("Failed to encode DPI tuple: {e}"))?
        } else {
            OwnedValue::try_from(Value::from(dpi_x))
                .map_err(|e| anyhow!("Failed to encode DPI: {e}"))?
        };
        self.set_property_owned(path, RESOLUTION_IFACE, "Resolution", value).await
    }

    pub async fn set_resolution_active(&self, path: &str) -> Result<()> {
        self.conn
            .call_method(Some(BUS_NAME), path, Some(RESOLUTION_IFACE), "SetActive", &())
            .await
            .context("SetActive call failed")?;
        Ok(())
    }

    /* ------------------------------------------------------------------ */
    /* Button                                                              */
    /* ------------------------------------------------------------------ */

    pub async fn get_button(&self, path: &str) -> Result<ButtonDto> {
        let index = self.get_u32(path, BUTTON_IFACE, "Index").await?;
        let action_types = self.get_vec_u32(path, BUTTON_IFACE, "ActionTypes").await.unwrap_or_default();

        let (action_type, action_value) = self.parse_button_mapping(path).await?;

        Ok(ButtonDto {
            path: path.to_owned(),
            index,
            action_type,
            action_value,
            action_types,
        })
    }

    pub async fn set_button_mapping(&self, path: &str, action_type: u32, value: &ActionValueDto) -> Result<()> {
        let dbus_value: OwnedValue = match value {
            ActionValueDto::None => OwnedValue::try_from(Value::from(0_u32))
                .map_err(|e| anyhow!("{e}"))?,
            ActionValueDto::Button { button } => OwnedValue::try_from(Value::from(*button))
                .map_err(|e| anyhow!("{e}"))?,
            ActionValueDto::Special { special } => OwnedValue::try_from(Value::from(*special))
                .map_err(|e| anyhow!("{e}"))?,
            ActionValueDto::Key { keycode } => OwnedValue::try_from(Value::from(*keycode))
                .map_err(|e| anyhow!("{e}"))?,
            ActionValueDto::Macro { entries } => OwnedValue::try_from(Value::from(entries.clone()))
                .map_err(|e| anyhow!("{e}"))?,
            ActionValueDto::Unknown => OwnedValue::try_from(Value::from(0_u32))
                .map_err(|e| anyhow!("{e}"))?,
        };

        let mapping = (action_type, dbus_value);
        self.set_property_owned(path, BUTTON_IFACE, "Mapping",
            OwnedValue::try_from(Value::from(mapping)).map_err(|e| anyhow!("{e}"))?
        ).await
    }

    /* ------------------------------------------------------------------ */
    /* LED                                                                 */
    /* ------------------------------------------------------------------ */

    pub async fn get_led(&self, path: &str) -> Result<LedDto> {
        let index = self.get_u32(path, LED_IFACE, "Index").await?;
        let mode = self.get_u32(path, LED_IFACE, "Mode").await?;
        let modes = self.get_vec_u32(path, LED_IFACE, "Modes").await.unwrap_or_default();
        let color = self.get_rgb(path, LED_IFACE, "Color").await.unwrap_or_default();
        let secondary_color = self.get_rgb(path, LED_IFACE, "SecondaryColor").await.unwrap_or_default();
        let tertiary_color = self.get_rgb(path, LED_IFACE, "TertiaryColor").await.unwrap_or_default();
        let color_depth = self.get_u32(path, LED_IFACE, "ColorDepth").await.unwrap_or(0);
        let effect_duration = self.get_u32(path, LED_IFACE, "EffectDuration").await.unwrap_or(0);
        let brightness = self.get_u32(path, LED_IFACE, "Brightness").await.unwrap_or(0);

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
        self.set_property(path, LED_IFACE, "Mode", Value::from(mode)).await
    }

    pub async fn set_led_color(&self, path: &str, r: u32, g: u32, b: u32) -> Result<()> {
        self.set_property(path, LED_IFACE, "Color", Value::from((r, g, b))).await
    }

    pub async fn set_led_brightness(&self, path: &str, value: u32) -> Result<()> {
        self.set_property(path, LED_IFACE, "Brightness", Value::from(value)).await
    }

    pub async fn set_led_effect_duration(&self, path: &str, ms: u32) -> Result<()> {
        self.set_property(path, LED_IFACE, "EffectDuration", Value::from(ms)).await
    }

    /* ================================================================== */
    /* Private helpers                                                     */
    /* ================================================================== */

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

    async fn set_property(&self, path: &str, iface: &str, prop: &str, value: Value<'_>) -> Result<()> {
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

    async fn set_property_owned(&self, path: &str, iface: &str, prop: &str, value: OwnedValue) -> Result<()> {
        let v: Value<'_> = value.into();
        self.set_property(path, iface, prop, v).await
    }

    async fn get_string(&self, path: &str, iface: &str, prop: &str) -> Result<String> {
        let val = self.get_property(path, iface, prop).await?;
        let inner: Value<'_> = val.into();
        match inner {
            Value::Str(s) => Ok(s.to_string()),
            other => Ok(format!("{other}")),
        }
    }

    async fn get_u32(&self, path: &str, iface: &str, prop: &str) -> Result<u32> {
        let val = self.get_property(path, iface, prop).await?;
        let inner: Value<'_> = val.into();
        match inner {
            Value::U32(v) => Ok(v),
            Value::I32(v) => u32::try_from(v)
                .map_err(|_| anyhow!("Negative i32 ({v}) cannot convert to u32 for {iface}.{prop}")),
            _ => Err(anyhow!("Expected u32 for {iface}.{prop}")),
        }
    }

    async fn get_i32(&self, path: &str, iface: &str, prop: &str) -> Result<i32> {
        let val = self.get_property(path, iface, prop).await?;
        let inner: Value<'_> = val.into();
        match inner {
            Value::I32(v) => Ok(v),
            Value::U32(v) => i32::try_from(v)
                .map_err(|_| anyhow!("u32 ({v}) exceeds i32 range for {iface}.{prop}")),
            _ => Err(anyhow!("Expected i32 for {iface}.{prop}")),
        }
    }

    async fn get_bool(&self, path: &str, iface: &str, prop: &str) -> Result<bool> {
        let val = self.get_property(path, iface, prop).await?;
        let inner: Value<'_> = val.into();
        match inner {
            Value::Bool(v) => Ok(v),
            _ => Err(anyhow!("Expected bool for {iface}.{prop}")),
        }
    }

    async fn get_vec_u32(&self, path: &str, iface: &str, prop: &str) -> Result<Vec<u32>> {
        let val = self.get_property(path, iface, prop).await?;
        let inner: Value<'_> = val.into();
        if let Value::Array(arr) = inner {
            let mut out = Vec::with_capacity(arr.len());
            for v in arr.iter() {
                match v {
                    Value::U32(n) => out.push(*n),
                    Value::I32(n) => out.push(*n as u32),
                    _ => {}
                }
            }
            Ok(out)
        } else {
            Err(anyhow!("Expected array for {iface}.{prop}"))
        }
    }

    async fn get_rgb(&self, path: &str, iface: &str, prop: &str) -> Result<RgbDto> {
        let val = self.get_property(path, iface, prop).await?;
        let inner: Value<'_> = val.into();
        if let Value::Structure(s) = inner {
            if let [Value::U32(r), Value::U32(g), Value::U32(b)] = s.fields() {
                return Ok(RgbDto { r: *r, g: *g, b: *b });
            }
        }
        Ok(RgbDto::default())
    }

    async fn parse_dpi(&self, path: &str) -> Result<(u32, Option<u32>)> {
        let val = self.get_property(path, RESOLUTION_IFACE, "Resolution").await?;
        let inner: Value<'_> = val.into();
        match &inner {
            Value::U32(v) => Ok((*v, None)),
            Value::Structure(s) => {
                if let [Value::U32(x), Value::U32(y)] = s.fields() {
                    if x == y {
                        Ok((*x, None))
                    } else {
                        Ok((*x, Some(*y)))
                    }
                } else {
                    Ok((0, None))
                }
            }
            _ => Ok((0, None)),
        }
    }

    async fn parse_button_mapping(&self, path: &str) -> Result<(u32, ActionValueDto)> {
        let val = self.get_property(path, BUTTON_IFACE, "Mapping").await?;
        let inner: Value<'_> = val.into();

        if let Value::Structure(s) = &inner {
            let fields = s.fields();
            if fields.len() == 2 {
                let action_type = match &fields[0] {
                    Value::U32(v) => *v,
                    _ => 0,
                };
                let payload = &fields[1];

                let action_value = match action_type {
                    0 => ActionValueDto::None,
                    1 => {
                        if let Value::U32(b) = extract_inner_value(payload) {
                            ActionValueDto::Button { button: *b }
                        } else {
                            ActionValueDto::None
                        }
                    }
                    2 => {
                        if let Value::U32(s) = extract_inner_value(payload) {
                            ActionValueDto::Special { special: *s }
                        } else {
                            ActionValueDto::None
                        }
                    }
                    3 => {
                        if let Value::U32(k) = extract_inner_value(payload) {
                            ActionValueDto::Key { keycode: *k }
                        } else {
                            ActionValueDto::None
                        }
                    }
                    4 => {
                        let unwrapped = extract_inner_value(payload);
                        if let Value::Array(arr) = unwrapped {
                            let mut entries = Vec::with_capacity(arr.len());
                            for v in arr.iter() {
                                if let Value::Structure(es) = v {
                                    if let [Value::U32(a), Value::U32(b)] = es.fields() {
                                        entries.push((*a, *b));
                                    }
                                }
                            }
                            ActionValueDto::Macro { entries }
                        } else {
                            ActionValueDto::Macro { entries: vec![] }
                        }
                    }
                    _ => ActionValueDto::Unknown,
                };

                return Ok((action_type, action_value));
            }
        }
        Ok((0, ActionValueDto::None))
    }
}

/* Unwrap nested Value::Value wrappers (DBus variant-in-variant). */
fn extract_inner_value<'a>(v: &'a Value<'a>) -> &'a Value<'a> {
    match v {
        Value::Value(inner) => extract_inner_value(inner),
        other => other,
    }
}

/* Extract an array of object path strings from a D-Bus property value. */
fn extract_object_path_array(val: OwnedValue) -> Result<Vec<String>> {
    let inner: Value<'_> = val.into();
    if let Value::Array(arr) = inner {
        let mut out = Vec::with_capacity(arr.len());
        for v in arr.iter() {
            match v {
                Value::ObjectPath(p) => out.push(p.to_string()),
                Value::Str(s) => out.push(s.to_string()),
                _ => {}
            }
        }
        Ok(out)
    } else {
        Err(anyhow!("Expected array of object paths"))
    }
}
