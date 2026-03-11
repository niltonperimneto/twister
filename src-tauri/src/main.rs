/* Twister – Tauri v2 application entry point.
 *
 * Initialises tracing, registers Tauri IPC commands, and hands control to
 * the Tauri event loop.  The Rust backend owns all system-bus communication
 * with ratbagd; the Svelte frontend receives normalised JSON payloads only. */

mod commands;
mod dbus_client;
mod dto;

use commands::DaemonState;

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "twister=info".into()),
        )
        .init();

    tracing::info!("Starting Twister");

    if let Err(e) = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(DaemonState::default())
        .invoke_handler(tauri::generate_handler![
            commands::connect_daemon,
            commands::list_devices,
            commands::get_device,
            commands::get_profile,
            commands::set_resolution_dpi,
            commands::set_resolution_active,
            commands::set_profile_report_rate,
            commands::set_profile_active,
            commands::set_button_mapping,
            commands::set_led_mode,
            commands::set_led_color,
            commands::set_led_brightness,
            commands::set_led_effect_duration,
            commands::commit_device,
            commands::detect_surface_mode,
        ])
        .run(tauri::generate_context!())
    {
        tracing::error!("Twister exited with error: {e:#}");
        std::process::exit(1);
    }
}
