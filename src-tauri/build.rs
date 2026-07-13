fn main() {
    /* `tauri::generate_context!` aborts compilation when the `frontendDist`
     * directory (`../build`, the vite output) is missing, which breaks bare
     * `cargo check`/`cargo build` runs and IDE analysis before the frontend
     * has ever been built. Ensure it exists; real builds overwrite it via
     * `beforeBuildCommand`. */
    std::fs::create_dir_all("../build").expect("failed to create frontendDist placeholder");

    tauri_build::build();
}
