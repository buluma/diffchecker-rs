# Diffchecker

Diffchecker is a local text and code comparison tool built with React, TypeScript, Vite, and Tauri. Compare pasted content or files, inspect changes, and create an editable merged result. The desktop app runs on macOS, Windows, and Linux.

## Features

- Compare two text inputs or open files from disk; drag and drop files into an editor.
- View changes side by side or in a unified diff, with line and inline change highlighting.
- Choose smart, word, or character precision and optionally ignore whitespace, case, or custom text rules.
- Detect syntax highlighting from file names, or select a language manually.
- Hide unchanged lines, wrap long lines, and inspect change counts.
- Build and edit a merged result, then save it to a text file.
- In the desktop app, reopen recent files and restore previous comparisons from local history.

Each input is limited to 5 MiB and 10,000 lines. The diff runs in a Web Worker; highly dissimilar inputs use bounded simplified alignment and show a warning. History stores inputs up to 1 MiB per side.

## Requirements

- Bun as pinned in `.bun-version`
- Rust toolchain for the Tauri desktop app
- Debian or Ubuntu system libraries for Linux desktop builds:

  ```sh
  sudo apt-get update
  sudo apt-get install -y build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev libwebkit2gtk-4.1-dev
  ```

## Develop

Install dependencies:

```sh
bun install
```

Start the web renderer:

```sh
bun run dev
```

Start Vite and the Tauri desktop app together:

```sh
bun run dev:desktop
```

The renderer also has a browser fallback for editing, comparing, and loading files. Recent files, comparison history, settings, and native file dialogs are provided by the Rust desktop backend.

## Build and validation

```sh
bun run build          # Type-check and build the renderer
bun run build:desktop # Build the renderer and package the desktop app
bun run lint           # Type-check the renderer and build configuration
bun run test           # Run Vitest
```

Tauri bundles installers under `src-tauri/target/release/bundle/`. Releases include a universal DMG and zipped app for Intel and Apple Silicon Macs, an NSIS EXE installer for Windows, and AppImage and DEB packages for Linux. These packages are unsigned; macOS may require approval in Gatekeeper, and Windows may show a publisher warning.

Push a version tag matching the package, Cargo, and Tauri configuration versions (for example, `v1.0.0`) to build each platform on its native GitHub Actions runner and attach the installers to a GitHub Release. The release workflow needs no signing secrets. The macOS DMG/ZIP, Windows NSIS installer EXE, and Linux AppImage/DEB are published as release downloads.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl`/`Cmd` + `Enter` | Compare |
| `Ctrl`/`Cmd` + `O` | Load the original file |
| `Ctrl`/`Cmd` + `Shift` + `O` | Load the changed file |
| `Ctrl`/`Cmd` + `Shift` + `X` | Clear both inputs |
| `Ctrl`/`Cmd` + `S` | Save the diff or merged result |
| `Escape` | Exit merge mode |

On macOS, use `Cmd`; on Windows and Linux, use `Ctrl`.

## Data and privacy

File comparisons are performed locally; the app has no comparison server. The Tauri Rust backend stores its recent-file list, settings, and comparison history in the app data directory. History saving is on by default and can be turned off in the History panel. Existing entries remain until removed or cleared. Comparison history stores the input contents, so disable history or clear it when you do not want comparisons retained.

The desktop app opens and saves files through native dialogs. Rust commands validate and perform file operations and persist local data; the renderer has no direct filesystem access.

## Project layout

- `src/components/` — editors, toolbar, diff view, history panel, and status bar.
- `src/hooks/` — comparison and desktop-local state.
- `src/utils/` — diff calculation, merge construction, syntax/language helpers, history, and export formatting.
- `src/types/` — shared comparison and history types.
- `src-tauri/` — Tauri shell, native dialogs, Rust commands, and local data store.

## Tests

Tests live alongside the renderer, with shared Vitest setup in `src/test/setup.ts`. Run them with `bun run test`.
