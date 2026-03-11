/* Twister – library root (re-exports for crate-type cdylib/staticlib).
 *
 * These modules are compiled into the lib target for FFI consumption.
 * All actual invocations happen via the binary target (main.rs) through
 * Tauri's IPC command system, so the lib crate itself never calls into
 * them directly. */

#[allow(unused)]
mod commands;
#[allow(unused)]
mod dbus_client;
#[allow(unused)]
mod dto;
