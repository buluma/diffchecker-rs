---
type: "Reference"
title: "Frontend Architecture"
openwiki_generated: true
verified:
  - by: openwiki/0.9.0
    at: 2026-11-10T04:51:48.310Z
sources:
  - id: openwiki-source-3662004eb7e0ec9e64a6ab19
    resource: repo://src-tauri/src/types.rs
  - id: openwiki-source-a608478329d5508fc7010c4a
    resource: repo://src/components/App.tsx
  - id: openwiki-source-537e94600b9727c5e86a9089
    resource: repo://src/components/DiffView.tsx
  - id: openwiki-source-ced6dec7551b503c7d471790
    resource: repo://src/components/Editor.tsx
  - id: openwiki-source-6ba549fb867c1ec40e6861de
    resource: repo://src/hooks/useDiff.ts
  - id: openwiki-source-8f7f181782bf076ce00ed803
    resource: repo://src/hooks/useHighlightedLines.ts
  - id: openwiki-source-2e04c6ba0a775fefb919ef82
    resource: repo://src/hooks/useLocalData.ts
  - id: openwiki-source-d1afade4641722495f434a61
    resource: repo://src/platform/desktop.ts
  - id: openwiki-source-593eaf5d95341e75d8839ba1
    resource: repo://src/types/diff.ts
  - id: openwiki-source-558434bd32d94f45c32e9eed
    resource: repo://src/utils/diff.ts
generated: { by: "pi", at: "2026-11-10T04:51:48.310Z" }
---

# Frontend Architecture

The React 19 + TypeScript frontend lives in `src/` and is built with Vite. It runs as the Tauri renderer process (webview) and communicates with the Rust backend via Tauri commands.

## Component Hierarchy

```
App (src/components/App.tsx)
├── Toolbar
├── Main Content Area
│   ├── Merge View (when mergeMode)
│   │   └── Editor (merged result)
│   └── Diff View (when comparing)
│       └── DiffView
│           ├── Diff Navigation
│           ├── Side-by-Side Diff (split panes)
│           │   ├── Original pane (left)
│           │   └── Changed pane (right)
│           └── Unified Diff (single pane)
├── Editor Pair (original/changed editors, compact when diff shown)
│   ├── Editor (original)
│   └── Editor (changed)
├── HistoryPanel (sidebar, toggleable)
└── StatusBar
```

### Key Components

| Component | File | Responsibility |
|-----------|------|----------------|
| `App` | `src/components/App.tsx` | Root component, orchestrates state via hooks, handles keyboard shortcuts |
| `Toolbar` | `src/components/Toolbar.tsx` | Compare, file operations, view modes, precision, syntax, options, merge, history, save |
| `DiffView` | `src/components/DiffView.tsx` | Virtualized diff rendering (side-by-side/unified), change navigation, minimap markers, inline char/word diff, merge buttons |
| `Editor` | `src/components/Editor.tsx` | Syntax-highlighted editable textarea with line numbers, drag-and-drop, virtualized overlay |
| `HistoryPanel` | `src/components/HistoryPanel.tsx` | Recent comparisons list with restore/remove/clear, save-history toggle |
| `StatusBar` | `src/components/StatusBar.tsx` | File info, computing indicator, error messages, app version |

## Custom Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useDiff` | `src/hooks/useDiff.ts` | Core diff state: files, options, results, filtering, language detection, compare/restore/clear actions |
| `useLocalData` | `src/hooks/useLocalData.ts` | Recent files & history from Tauri backend (empty on web) |
| `useHighlightedLines` | `src/hooks/useHighlightedLines.ts` | Batch syntax highlighting via Tauri `highlight_fragments_cmd` (desktop) or `highlight.js` (web) |

## Utility Modules

| Module | File | Purpose |
|--------|------|---------|
| `diff` | `src/utils/diff.ts` | Myers O(ND) diff with line/word/char precision, custom ignore rules, inline char/word diff |
| `merge` | `src/utils/merge.ts` | Three-way merge (Left/Right per hunk), mirrors Rust `merge.rs` |
| `markers` | `src/utils/markers.ts` | Minimap change markers from grouped line positions |
| `highlight` | `src/utils/highlight.ts` | `highlight.js` integration for web syntax highlighting |
| `history` | `src/utils/history.ts` | History entry display utilities |
| `export` | `src/utils/export.ts` | Unified/side-by-side text export (mirrors Rust `export.rs`) |
| `limits` | `src/utils/limits.ts` | Input validation (5 MiB / 10k lines), mirrors Rust `limits.rs` |
| `language` | `src/utils/language.ts` | Language detection from path/content |

## Platform Abstraction

`src/platform/desktop.ts` provides the Tauri command bridge:

- **`DesktopAPI` interface** — Typed wrapper for all 20 Tauri commands
- **`tauriApi` implementation** — Calls `invoke()` with proper argument shapes and error handling
- **`getDesktopAPI()`** — Returns `tauriApi` in Tauri, `window.desktopAPI` if pre-injected, or `undefined` on web
- **`isDesktopApp()`** — Feature detection for conditional desktop-only UI (History, Save, native file dialogs)

The frontend gracefully degrades to web mode:
- File operations use `<input type="file">` + FileReader API
- Diff computation uses local TypeScript `computeDiff()`
- Highlighting uses `highlight.js`
- History/recent files are unavailable

## TypeScript Interop

Shared types are defined in Rust (`src-tauri/src/types.rs`) and exported via `ts-rs` to `src/types/diff-generated.ts`. The frontend imports from `src/types/diff.ts` which re-exports and adds web-only types.

Key shared types:
- `DiffLine`, `DiffType`, `CharDiff`, `DiffOptions`, `DiffResult`, `DiffStats`
- `FileContent`, `DiffLimitError`, `DiffPrecision`, `DiffViewMode`

## State Management

No global store — state lives in `useDiff` and `useLocalData` hooks within `App`. Key patterns:

- **Debounced diff recomputation**: 150ms delay after initial compare
- **Request ID guards**: Prevent stale async results from overwriting newer requests
- **Language detection race handling**: Incremental request IDs per side
- **Virtualized rendering**: DiffView and Editor only render visible lines (500+ lines threshold)
- **Merge mode**: Separate state for merged content + per-hunk choices, synced with Rust `build_merged_content_cmd`

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Compare |
| `Ctrl+O` | Load Original |
| `Ctrl+Shift+O` | Load Changed |
| `Ctrl+Shift+X` | Clear All |
| `Ctrl+S` | Save (merge mode or with diff) |
| `Escape` | Exit Merge Mode |

## Build & Lint

- **Vite** with React plugin, TypeScript checking
- **oxlint** for fast linting (`.oxlintrc.json`)
- **TypeScript** project references (`tsconfig.app.json`, `tsconfig.node.json`)
- Output to `dist/` for Tauri bundling
