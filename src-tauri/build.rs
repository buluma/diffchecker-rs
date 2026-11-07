fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "open_file",
            "save_file",
            "get_version",
            "list_recent_files",
            "open_recent_file",
            "list_history",
            "add_history",
            "remove_history",
            "clear_history",
            "get_save_history",
            "set_save_history",
            "compute_diff_cmd",
            "filter_diff_indices_cmd",
            "format_diff_cmd",
            "highlight_code_cmd",
            "highlight_fragments_cmd",
            "detect_language_cmd",
            "build_merged_content_cmd",
            "compute_markers_cmd",
        ]),
    ))
    .expect("failed to build Tauri application");
}
