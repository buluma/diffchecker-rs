# Rust port status

The desktop app uses Rust commands for comparison, language detection, merge construction, measured change markers, syntax highlighting, diff filtering, and export formatting. The browser retains TypeScript implementations. DOM measurement, editor interaction, and immediate input validation remain in the renderer.

## Qualification

On macOS, the development Tauri app was checked on the source tree at `deb5613` using sample text and a temporary Rust file. The app accepted edits, compared both sides, navigated changes, switched to unified view, built a merge, saved it through the native dialog, and the saved contents matched the merge. Opening a `.rs` file through the native dialog detected Rust and displayed syntax highlighting in both the editor and diff view.

This was a development app check.

A macOS Apple Silicon DMG build exposed missing release capability permissions for the Rust commands. With the permissions added, the packaged app compared sample text, opened a Rust file, built a merge, saved and read back a side-by-side export, and restored a comparison after restart. The original package failed comparison due to the missing permissions; package qualification applies to the repaired build.

The user confirmed the final macOS packaged UI after the release capability fix.

On macOS the packaged app displayed two change markers with wrapped lines and collapsed unchanged sections; navigation and expanding the section were checked. Rust tests accepted 10,000 lines, rejected input over 5 MiB, and exercised bounded fallback on 400 unrelated lines. These checks do not measure UI performance at the input limit. Windows, Linux, and broad browser parity remain unverified.
