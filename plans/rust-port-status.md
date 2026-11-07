# Rust port status

The desktop app uses Rust commands for comparison, language detection, merge construction, measured change markers, syntax highlighting, diff filtering, and export formatting. The browser retains TypeScript implementations. DOM measurement, editor interaction, and immediate input validation remain in the renderer.

## Qualification

On macOS, the development Tauri app was checked on the source tree at `deb5613` using sample text and a temporary Rust file. The app accepted edits, compared both sides, navigated changes, switched to unified view, built a merge, saved it through the native dialog, and the saved contents matched the merge. Opening a `.rs` file through the native dialog detected Rust and displayed syntax highlighting in both the editor and diff view.

This was a development app check, not a packaged installer check. Windows and Linux, browser parity across edge cases, large inputs, wrapped and collapsed marker geometry, and history/recent persistence across restarts remain to be qualified.

A macOS Apple Silicon DMG build exposed missing release capability permissions for the Rust commands. With the permissions added, the packaged app compared sample text, opened a Rust file, built a merge, saved and read back a side-by-side export, and restored a comparison after restart. The original package failed comparison due to the missing permissions; package qualification applies to the repaired build. Windows, Linux, large inputs, and wrapped and collapsed marker geometry remain unverified.
