---
type: "Reference"
title: "Architecture Overview"
openwiki_generated: true
verified:
  - by: openwiki/0.9.0
    at: 2026-11-10T04:51:48.310Z
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-7d9c2c95cd6f848332130fbd
    resource: repo://src-tauri/build.rs
  - id: openwiki-source-00ff4b2512b6dbfa268cbfa4
    resource: repo://src-tauri/capabilities/default.json
  - id: openwiki-source-8fb4609cef6e3bffc73c48ee
    resource: repo://src-tauri/src/lib.rs
  - id: openwiki-source-66a7713403a87c4fc5427cd0
    resource: repo://src-tauri/src/limits.rs
  - id: openwiki-source-bc61deb53e87e4a755d7e6f3
    resource: repo://src-tauri/src/store.rs
  - id: openwiki-source-3662004eb7e0ec9e64a6ab19
    resource: repo://src-tauri/src/types.rs
  - id: openwiki-source-6ba549fb867c1ec40e6861de
    resource: repo://src/hooks/useDiff.ts
  - id: openwiki-source-d1afade4641722495f434a61
    resource: repo://src/platform/desktop.ts
  - id: openwiki-source-593eaf5d95341e75d8839ba1
    resource: repo://src/types/diff.ts
  - id: openwiki-source-5e1b077422a94ae165e88e4e
    resource: repo://vite.config.ts
generated: { by: "pi", at: "2026-11-10T04:51:48.310Z" }
---

# Architecture Overview

diffchecker-rs is a **React 19 + TypeScript frontend** bundled with **Vite** and packaged as a **Tauri v2 desktop application** with a **Rust backend**. It provides a local-first diff/merge tool with native file dialogs, recent files, and comparison history on desktop, while gracefully degrading to a fully functional web fallback.

## Two-Process Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Tauri Application                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐         ┌─────────────────────┐   │
│  │   Renderer Process  │         │    Main Process     │   │
│  │   (WebView/WebView2)│◄───────►│    (Rust Binary)    │   │
│  │                     │  IPC    │                     │   │
│  │  • React 19 App     │         │  • Tauri Commands   │   │
│  │  • TypeScript/Vite  │         │  • Native Dialogs   │   │
│  │  • Diff/merge logic │         │  • File I/O         │   │
│  │  • Syntax highlight │         │  • Local Store      │   │
│  └─────────────────────┘         └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

- **Renderer**: Runs the React app in a WebView (WebKitGTK on Linux, WebView2 on Windows, WebKit on macOS). No direct filesystem access.
- **Main**: Rust binary exposing Tauri commands for file operations, diff computation, highlighting, merge, history, and settings.

## Build Pipeline

```
Source                    Build Tools                    Output
─────────────────────────────────────────────────────────────────
src/                      Vite 8 + @vitejs/plugin-react   dist/
src-tauri/                cargo + tauri-cli 2             target/release/bundle/
package.json              bun (package manager)           —
vite.config.ts            TypeScript project references   —
```

**Commands** (from `package.json`):
| Command | Description |
|---------|-------------|
| `bun run dev` | Vite dev server (web renderer only) |
| `bun run dev:desktop` | Vite + `tauri dev` (hot reload both) |
| `bun run build` | `tsc -b && vite build` → `dist/` |
| `bun run build:desktop` | `tauri build` → platform installers |
| `bun run lint` | `tsc -b && oxlint` |
| `bun run test` | `vitest run` (renderer) |
| `cargo test` | Rust unit tests |

**Key config**:
- `vite.config.ts`: React plugin, `@` alias to `src/`, base `./` for Tauri, jsdom test env
- `tsconfig.app.json` / `tsconfig.node.json`: Project references for renderer/main
- `.oxlintrc.json`: Oxlint rules

## Tauri Command Bridge

The frontend communicates with the backend exclusively through **Tauri commands** invoked via `@tauri-apps/api/core::invoke()`.

### Pattern
```typescript
// Frontend (src/platform/desktop.ts)
const result = await invoke<ReturnType>('command_name', { arg1, arg2 });

// Backend (src-tauri/src/lib.rs)
#[tauri::command]
async fn command_name(arg1: Type1, arg2: Type2) -> Result<ReturnType, String> { ... }
```

### Command Surface (20 commands)
| Category | Commands |
|----------|----------|
| File I/O | `open_file`, `save_file`, `get_version` |
| Recent Files | `list_recent_files`, `open_recent_file` |
| History | `list_history`, `add_history`, `remove_history`, `clear_history`, `get_save_history`, `set_save_history` |
| Diff | `compute_diff_cmd`, `filter_diff_indices_cmd`, `format_diff_cmd` |
| Highlight | `highlight_code_cmd`, `highlight_fragments_cmd`, `detect_language_cmd` |
| Merge | `build_merged_content_cmd` |
| Markers | `compute_markers_cmd` |
| Utils | `describe_recent_file_cmd`, `describe_history_side_cmd`, `validate_input_cmd` |

### Capability Scoping
Every command has a corresponding `allow-*` permission in `src-tauri/capabilities/default.json`. The `build.rs` registers commands via `tauri_build::Attributes::new().app_manifest(...commands(...))`. This ensures a **narrow, auditable command surface** in packaged builds — no command is accessible unless explicitly permitted.

## Data Flow

### Compare Flow
```
User clicks Compare
       │
       ▼
useDiff: setIsComparing(true)
       │
       ▼
invoke('compute_diff_cmd', { original, changed, options })
       │
       ▼
Rust: compute_diff() → DiffResult (lines, stats, warning)
       │
       ▼
Frontend: setDiffResult(), filter via filterDiffLines()
       │
       ▼
DiffView renders (virtualized for 500+ lines)
```

### File Open Flow
```
User clicks Load Original
       │
       ▼
invoke('open_file') → native file picker
       │
       ▼
Rust: reads file, validates size (5 MiB), adds to recent files
       │
       ▼
Returns { path, content }
       │
       ▼
Frontend: updateOriginalContent(), detectLanguage()
```

### History Flow
```
Comparison saved → invoke('add_history', { original, changed })
       │
       ▼
Rust: store.rs adds entry (deduped, max 20, 20 MiB total)
       │
       ▼
Returns updated history + status (saved/disabled/too-large)
       │
       ▼
Frontend: useLocalData refreshes history list
```

## Web Fallback

When not running in Tauri (`!isTauri()`):
- **File I/O**: `<input type="file">` + `FileReader` / `blob.saveAs()`
- **Diff**: Local TypeScript `computeDiff()` (identical algorithm)
- **Highlight**: `highlight.js` via `src/utils/highlight.ts`
- **History/Recent**: Unavailable (empty arrays, disabled toggles)
- **Native dialogs**: Replaced with browser equivalents

The `DesktopAPI` interface in `src/platform/desktop.ts` abstracts this; `getDesktopAPI()` returns the Tauri implementation or `undefined`.

## TypeScript ↔ Rust Interop

Shared types are **single-sourced in Rust** (`src-tauri/src/types.rs`) and exported via [`ts-rs`](https://github.com/Aleph-Alpha/ts-rs) to `src/types/diff-generated.ts` at build time.

```rust
#[derive(TS)]
#[ts(export, export_to = "../../src/types/diff-generated.ts")]
pub struct DiffLine { ... }
```

This guarantees **compile-time parity** for:
- `DiffLine`, `DiffType`, `CharDiff`, `CharDiffType`
- `DiffOptions`, `DiffPrecision`, `DiffViewMode`
- `DiffResult`, `DiffStats`, `FileContent`, `DiffLimitError`
- `DefaultDiffOptions`

## Security Model

- **Renderer has no filesystem access** — all I/O via validated Tauri commands
- **Command arguments validated in Rust** — size limits, path traversal checks
- **Capability-scoped permissions** — each command individually allowed
- **Local store in app data dir** — `~/.config/diffchecker-desktop/` (Electron-compatible)
- **No network access** — app works fully offline
- **Content Security Policy** — Tauri default CSP applied

## Platform Targets

| Platform | Bundle Format | WebView |
|----------|---------------|---------|
| macOS | universal DMG + zipped .app (Intel + Apple Silicon) | WebKit |
| Windows | NSIS .exe installer | WebView2 |
| Linux | AppImage + .deb | WebKitGTK 4.1 |

Builds run on native GitHub Actions runners per platform; releases are unsigned (macOS Gatekeeper, Windows SmartScreen warnings expected).
