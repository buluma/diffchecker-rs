---
type: "Reference"
title: "Backend Architecture"
openwiki_generated: true
verified:
  - by: openwiki/0.9.0
    at: 2026-11-10T04:51:48.310Z
sources:
  - id: openwiki-source-5c9c75017a0ffb6a8bfda698
    resource: repo://src-tauri/src/diff.rs
  - id: openwiki-source-569f4713a441ec2af9d798ec
    resource: repo://src-tauri/src/export.rs
  - id: openwiki-source-6c55891c4e6acc21226b7aa1
    resource: repo://src-tauri/src/highlight.rs
  - id: openwiki-source-005ee439e532b8e580c57339
    resource: repo://src-tauri/src/history.rs
  - id: openwiki-source-c2ee3a2b40a9de2de1914f6f
    resource: repo://src-tauri/src/language.rs
  - id: openwiki-source-8fb4609cef6e3bffc73c48ee
    resource: repo://src-tauri/src/lib.rs
  - id: openwiki-source-66a7713403a87c4fc5427cd0
    resource: repo://src-tauri/src/limits.rs
  - id: openwiki-source-99b0214e9f2113a0f6a2cf92
    resource: repo://src-tauri/src/main.rs
  - id: openwiki-source-dddf70d8206e3d461fcd5a87
    resource: repo://src-tauri/src/markers.rs
  - id: openwiki-source-b31108b32199025363bcba0a
    resource: repo://src-tauri/src/merge.rs
  - id: openwiki-source-bc61deb53e87e4a755d7e6f3
    resource: repo://src-tauri/src/store.rs
  - id: openwiki-source-3662004eb7e0ec9e64a6ab19
    resource: repo://src-tauri/src/types.rs
generated: { by: "pi", at: "2026-11-10T04:51:48.310Z" }
---

# Backend Architecture

The Rust backend lives in `src-tauri/src/` and provides native functionality for the Diffchecker desktop app through Tauri commands.

## Core Modules

| Module | Purpose |
|--------|---------|
| `lib.rs` | Command registration, Tauri app setup, and command handlers |
| `main.rs` | Entry point (`diffchecker_lib::run()`) |
| `types.rs` | Shared type definitions with TypeScript export via `ts-rs` |
| `diff.rs` | Myers O(ND) diff algorithm implementation |
| `merge.rs` | Three-way merge with per-hunk conflict resolution |
| `highlight.rs` | Syntect-based syntax highlighting (50+ languages) |
| `history.rs` | History entry description utilities |
| `limits.rs` | Input validation (5 MiB / 10,000 lines) |
| `store.rs` | Local JSON persistence with atomic writes |
| `export.rs` | Diff formatting (unified & side-by-side) |
| `language.rs` | Language detection from path/content |
| `markers.rs` | Diff change markers for minimap navigation |

## Tauri Commands

All 20 commands are registered in `build.rs` and the `invoke_handler` in `lib.rs`:

### File Operations
- `open_file` — Native file picker, returns path + content
- `save_file` — Native save dialog
- `get_version` — App version from package metadata

### Recent Files
- `list_recent_files` — Up to 10 most recent paths
- `open_recent_file` — Re-open a tracked recent file

### History
- `list_history` — Up to 20 entries (20 MiB total)
- `add_history` — Save comparison (deduplicated)
- `remove_history` — Delete single entry
- `clear_history` — Wipe all history
- `get_save_history` / `set_save_history` — Persistence toggle

### Diff Computation
- `compute_diff_cmd` — Full diff with options
- `filter_diff_indices_cmd` — Indices for "hide unchanged" view
- `format_diff_cmd` — Text export (unified/side-by-side)

### Highlighting
- `highlight_code_cmd` — Full file HTML with CSS classes
- `highlight_fragments_cmd` — Per-line HTML fragments
- `detect_language_cmd` — Language ID from path/content

### Merge & Markers
- `build_merged_content_cmd` — Merge with per-hunk choices
- `compute_markers_cmd` — Minimap change markers

### Utilities
- `describe_recent_file_cmd` — "name — folder" display
- `describe_history_side_cmd` — First line preview or filename
- `validate_input_cmd` — Enforce size/line limits

## Capability Scoping

Every command has a corresponding `allow-*` permission in `capabilities/default.json`, ensuring a narrow, auditable command surface in packaged builds.

## Data Store

`store.rs` persists to `~/.config/diffchecker-desktop/` (matching the prior Electron location):

- **Atomic writes**: temp file → rename, with `.bak` backup for rollback
- **Thread safety**: Global `Mutex<()>` guards all mutations
- **Schema**: JSON files for recent-files, history, settings
- **Limits**: 10 recent files, 20 history entries, 20 MiB history total, 1 MiB per side

## Diff Algorithm

`diff.rs` implements Myers O(ND) with:
- **Precision modes**: Line / Word / Character (Smart = auto)
- **Options**: Ignore whitespace, ignore case, custom ignore rules
- **Output**: `Vec<DiffLine>` with `DiffType` (Equal/Added/Removed/Modified) and optional `char_diffs` for inline highlights

## Merge

`merge.rs` builds merged output from a full diff + `HashMap<index, MergeChoice>`:
- **Equal**: Always included
- **Added**: Included unless `Left` chosen
- **Removed**: Included unless `Right` chosen
- **Modified**: `original_content` for `Left`, `content` for `Right`

## Syntax Highlighting

`highlight.rs` uses `syntect` with `base16-ocean.dark` theme:
- **Language map**: 50+ identifiers → syntect syntax names
- **Output modes**: CSS-class spans (`highlight_code`) or inline styles (`highlight_code_inline`)
- **Fragments**: `highlight_fragments` for per-line rendering in editors

## Input Limits

`limits.rs` enforces:
- **5 MiB** max bytes per input
- **10,000** max lines per input
- Returns `DiffLimitError` with descriptive message
- Mirrored in TypeScript (`src/utils/limits.ts`) for parity

## Export

`export.rs` formats diffs as plain text:
- **Unified**: `+added`, `-removed`, `-old\n+new` for modified
- **Side-by-side**: Line numbers, `|` separators, `-`/`+` prefixes

## TypeScript Interop

`types.rs` uses `ts-rs` to export all shared types to `src/types/diff-generated.ts`, guaranteeing compile-time parity between Rust and TypeScript.
