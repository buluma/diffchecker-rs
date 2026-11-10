---
type: "Reference"
title: "Tauri Command Bridge"
openwiki_generated: true
verified:
  - by: openwiki/0.9.0
    at: 2026-11-10T04:51:48.310Z
sources:
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
  - id: openwiki-source-6ba549fb867c1ec40e6861de
    resource: repo://src/hooks/useDiff.ts
  - id: openwiki-source-d1afade4641722495f434a61
    resource: repo://src/platform/desktop.ts
  - id: openwiki-source-558434bd32d94f45c32e9eed
    resource: repo://src/utils/diff.ts
  - id: openwiki-source-372e5034efc882a6eb3bbb4e
    resource: repo://src/utils/highlight.ts
  - id: openwiki-source-0af415af42a4dac1b99297b8
    resource: repo://src/utils/limits.ts
generated: { by: "pi", at: "2026-11-10T04:51:48.310Z" }
---

# Tauri Command Bridge

The platform abstraction layer in `src/platform/desktop.ts` connects the React frontend to Rust Tauri commands. It provides a typed `DesktopAPI` interface, graceful web fallback, and capability-scoped command registration.

## Command Registration (build.rs)

Commands are registered at compile time via `tauri_build` in `src-tauri/build.rs`:

```rust
fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "open_file", "save_file", "get_version",
            "list_recent_files", "open_recent_file",
            "list_history", "add_history", "remove_history",
            "clear_history", "get_save_history", "set_save_history",
            "compute_diff_cmd", "filter_diff_indices_cmd", "format_diff_cmd",
            "highlight_code_cmd", "highlight_fragments_cmd", "detect_language_cmd",
            "build_merged_content_cmd", "compute_markers_cmd",
            "describe_recent_file_cmd", "describe_history_side_cmd",
            "validate_input_cmd",
        ]),
    )).expect("failed to build Tauri application");
}
```

This generates the IPC bindings and ensures only listed commands are callable.

## Capability Scoping (capabilities/default.json)

Every command requires an explicit `allow-*` permission:

```json
{
  "permissions": [
    "core:default",
    "allow-open-file", "allow-save-file", "allow-get-version",
    "allow-list-recent-files", "allow-open-recent-file",
    "allow-list-history", "allow-add-history", "allow-remove-history",
    "allow-clear-history", "allow-get-save-history", "allow-set-save-history",
    "allow-compute-diff-cmd", "allow-filter-diff-indices-cmd",
    "allow-format-diff-cmd", "allow-highlight-code-cmd",
    "allow-highlight-fragments-cmd", "allow-detect-language-cmd",
    "allow-build-merged-content-cmd", "allow-compute-markers-cmd",
    "allow-describe-recent-file-cmd", "allow-describe-history-side-cmd",
    "allow-validate-input-cmd"
  ]
}
```

**Result**: Packaged builds only expose explicitly permitted commands — no accidental exposure.

## DesktopAPI Interface

`src/platform/desktop.ts` defines a typed wrapper for all commands:

```typescript
export interface DesktopAPI {
  openFile(): Promise<OpenFileResult | null>;
  saveFile(content: string, suggestedName: string): Promise<string | null>;
  getVersion(): Promise<string>;
  listRecentFiles(): Promise<RecentFile[]>;
  openRecentFile(filePath: string): Promise<OpenFileResult | null>;
  listHistory(): Promise<HistoryEntry[]>;
  addHistory(entry: { original: HistoryEntry['original']; changed: HistoryEntry['changed'] }): Promise<HistoryAddResult>;
  removeHistory(id: string): Promise<HistoryEntry[]>;
  clearHistory(): Promise<HistoryEntry[]>;
  getSaveHistory(): Promise<boolean>;
  setSaveHistory(enabled: boolean): Promise<boolean>;
  detectLanguage(path: string | null, content: string): Promise<string>;
  buildMergedContent(lines: DiffLine[], choices: Record<number, 'left' | 'right'>): Promise<string>;
  describeRecentFile(path: string): Promise<string>;
  describeHistorySide(side: HistorySide): Promise<string>;
  validateInput(content: string): Promise<void>;
}
```

## Invoke Pattern

Commands are invoked via `@tauri-apps/api/core::invoke()` with snake_case names matching Rust:

```typescript
const tauriApi: DesktopAPI = {
  async openFile() {
    try {
      return await invoke<OpenFileResult | null>('open_file');
    } catch (error) {
      return { error: String(error) };
    }
  },
  saveFile: (content, suggestedName) => invoke<string | null>('save_file', { content, suggestedName }),
  // ...
  detectLanguage: (path, content) => invoke<string>('detect_language_cmd', { path, content }),
  buildMergedContent: (lines, choices) => invoke<string>('build_merged_content_cmd', { lines, choices }),
  // ...
};
```

**Error handling**: Wrapped in try/catch; errors returned as `{ error: string }` for file operations, or thrown for others (caught by callers).

## Runtime Resolution

```typescript
export const getDesktopAPI = (): DesktopAPI | undefined => {
  if (typeof window === 'undefined') return undefined;
  if (window.desktopAPI) return window.desktopAPI;  // Pre-injected (tests)
  return isTauri() ? tauriApi : undefined;         // Tauri or undefined (web)
};

export const isDesktopApp = () =>
  typeof window !== 'undefined' && (Boolean(window.desktopAPI) || isTauri());
```

## Frontend Usage (useDiff hook)

```typescript
// In src/hooks/useDiff.ts
const result = isTauri()
  ? await invoke('compute_diff_cmd', { original, changed, options })
  : computeDiff(original, changed, options);  // Local fallback
```

## Argument Validation

**Rust side** validates all inputs:
- `open_file`/`save_file`: Native dialog, path sanitization
- `compute_diff_cmd`: Size limits (5 MiB, 10k lines) via `validate_input_cmd`
- `add_history`: Content size per side (1 MiB), total history (20 MiB)
- `open_recent_file`: Verifies path still in recent list before reading

**TypeScript side** mirrors limits in `src/utils/limits.ts` for web parity.

## Web Fallback

When `getDesktopAPI()` returns `undefined`:
| Feature | Desktop | Web Fallback |
|---------|---------|--------------|
| Open file | Native picker + Rust read | `<input type="file">` + FileReader |
| Save file | Native save dialog | `Blob` + `saveAs` |
| Diff | Rust `compute_diff_cmd` | Local `computeDiff()` |
| Highlight | `highlight_fragments_cmd` | `highlight.js` |
| Recent files | Rust store | Unavailable |
| History | Rust store | Unavailable |
| Language detect | `detect_language_cmd` | Local `detectLanguageFromPath/Content` |

The `useDiff` hook detects `isTauri()` and branches accordingly.

## Testing

- Unit tests mock `invoke` via `window.desktopAPI` injection
- `src/test/setup.ts` provides test utilities
- Rust commands tested in `src-tauri/src/*.rs` with `#[cfg(test)]`
