---
type: "Reference"
title: "History & Local Storage"
openwiki_generated: true
verified:
  - by: openwiki/0.9.0
    at: 2026-11-10T04:51:48.310Z
sources:
  - id: openwiki-source-00ff4b2512b6dbfa268cbfa4
    resource: repo://src-tauri/capabilities/default.json
  - id: openwiki-source-8fb4609cef6e3bffc73c48ee
    resource: repo://src-tauri/src/lib.rs
  - id: openwiki-source-bc61deb53e87e4a755d7e6f3
    resource: repo://src-tauri/src/store.rs
  - id: openwiki-source-943937414acd91c70185d910
    resource: repo://src/components/HistoryPanel.tsx
  - id: openwiki-source-9690f05ae6bd7e4ffa4bbeb8
    resource: repo://src/components/Toolbar.tsx
  - id: openwiki-source-2e04c6ba0a775fefb919ef82
    resource: repo://src/hooks/useLocalData.ts
  - id: openwiki-source-d1afade4641722495f434a61
    resource: repo://src/platform/desktop.ts
generated: { by: "pi", at: "2026-11-10T04:51:48.310Z" }
---

# History & Local Storage

The history system tracks **recent files** and **comparison history** with local persistence via the Rust backend. The web fallback has no persistence.

## Data Model

### HistoryEntry (shared via ts-rs)
```rust
pub struct HistoryEntry {
    pub id: String,           // UUID v4
    pub created_at: u64,      // Milliseconds since epoch
    pub original: HistorySide,
    pub changed: HistorySide,
}

pub struct HistorySide {
    pub path: Option<String>,
    pub content: String,
}
```

### RecentFile
```rust
pub struct RecentFile {
    pub path: String,
    pub opened_at: u64,
}
```

### Settings
```rust
struct Settings {
    save_history: Option<bool>,  // Default: true
}
```

## Rust Backend (`store.rs`)

### Persistence Location
`~/.config/diffchecker-desktop/` (matching prior Electron app):
- `recent-files.json` — max 10 entries
- `history.json` — max 20 entries, max 20 MiB total, max 1 MiB per side
- `settings.json` — `{ "saveHistory": true }`

### Atomic Write Pattern
```rust
fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let data = serde_json::to_vec(value)?;
    let temp = path.with_extension(format!("json.{}.tmp", Uuid::new_v4()));
    fs::write(&temp, data)?;
    if path.exists() {
        let backup = path.with_extension("json.bak");
        fs::rename(path, &backup)?;           // Current → backup
        fs::rename(&temp, path)?;             // Temp → current
        fs::remove_file(backup)?;             // Remove backup
    } else {
        fs::rename(&temp, path)?;             // Temp → current (new file)
    }
    Ok(())
}
```

### Concurrency
Global `Mutex<()>` (`STORE_LOCK`) guards all mutations.

### Key Functions
```rust
pub fn add_recent_file(directory: &Path, path: &str) -> Result<(), String>
pub fn list_recent_files(directory: &Path) -> Result<Vec<RecentFile>, String>
pub fn add_history_entry(directory: &Path, original: HistorySide, changed: HistorySide) -> Result<HistoryAddResult, String>
pub fn list_history(directory: &Path) -> Result<Vec<HistoryEntry>, String>
pub fn remove_history_entry(directory: &Path, id: &str) -> Result<Vec<HistoryEntry>, String>
pub fn clear_history(directory: &Path) -> Result<Vec<HistoryEntry>, String>
pub fn get_save_history(directory: &Path) -> Result<bool, String>
pub fn set_save_history(directory: &Path, enabled: bool) -> Result<bool, String>
```

### Deduplication
`add_history_entry` skips if identical `(original.path, original.content, changed.path, changed.content)` already exists.

### Size Limits
| Limit | Value |
|-------|-------|
| Max recent files | 10 |
| Max history entries | 20 |
| Max bytes per side | 1 MiB |
| Max total history | 20 MiB |
| Auto-evict oldest when over budget | Yes |

### History Status
`add_history` returns `HistoryAddResult { entries, status }`:
- `"saved"` — Normal save
- `"disabled"` — `save_history` setting is false
- `"too-large"` — Side content exceeds 1 MiB

### Electron Compatibility
Reads existing `camelCase` JSON keys (`openedAt`, `createdAt`, `saveHistory`) and writes `snake_case` (`opened_at`, `created_at`, `save_history`). Backup `.bak` files enable migration.

## Tauri Commands

```rust
#[tauri::command] fn list_recent_files(app: AppHandle) -> Result<Vec<RecentFile>, String>
#[tauri::command] fn open_recent_file(app: AppHandle, path: String) -> Result<Option<OpenedFile>, String>
#[tauri::command] fn list_history(app: AppHandle) -> Result<Vec<HistoryEntry>, String>
#[tauri::command] async fn add_history(app: AppHandle, original: HistorySide, changed: HistorySide) -> Result<HistoryAddResult, String>
#[tauri::command] fn remove_history(app: AppHandle, id: String) -> Result<Vec<HistoryEntry>, String>
#[tauri::command] fn clear_history(app: AppHandle) -> Result<Vec<HistoryEntry>, String>
#[tauri::command] fn get_save_history(app: AppHandle) -> Result<bool, String>
#[tauri::command] fn set_save_history(app: AppHandle, enabled: bool) -> Result<bool, String>
```

## Frontend Integration

### useLocalData Hook (`useLocalData.ts`)
```typescript
export function useLocalData() {
  const api = getDesktopAPI();  // undefined on web
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [saveHistory, setSaveHistoryState] = useState(true);

  // Load on mount
  useEffect(() => {
    if (!api) return;
    api.listRecentFiles().then(setRecentFiles);
    api.listHistory().then(setHistory);
    api.getSaveHistory().then(setSaveHistoryState);
  }, [api]);

  // Actions return promises that update local state
  const recordComparison = async (original, changed) => { ... }
  const removeHistoryEntry = async (id) => { ... }
  const setSaveHistory = async (enabled) => { ... }
  const clearHistory = async () => { ... }
}
```

### HistoryPanel Component (`HistoryPanel.tsx`)

**UI**:
- Toggle button in Toolbar (desktop only)
- Sidebar overlay with close button
- Save history checkbox (persists setting)
- List of entries with:
  - `describe_recent_file` / `describe_history_side` for display
  - Restore button → loads both sides, shows diff
  - Remove button → deletes entry
- Clear all button

**Interactions**:
```typescript
const handleRestore = (entry: HistoryEntry) => {
  restoreComparison(entry.original, entry.changed);  // Via useDiff
  setShowHistory(false);
};
```

### Display Utilities (`history.rs` / `history.ts`)

```rust
pub fn describe_recent_file(file_path: &str) -> String {
    // "filename — parent_folder" or just "filename"
}

pub fn describe_side(side: &HistorySide) -> String {
    // Path filename if available, else first non-empty line (truncated to 40 chars), else "(empty)"
}
```

## Web Fallback

| Feature | Desktop | Web |
|---------|---------|-----|
| Recent files | ✓ Persisted | ✗ Empty array |
| History | ✓ Persisted | ✗ Empty array |
| Save history toggle | ✓ Persisted | ✗ No-op |
| File open/save | Native dialogs | `<input type="file">` / Blob download |

The `useLocalData` hook returns empty arrays/no-ops when `getDesktopAPI()` is `undefined`.

## Testing

Rust tests (`store.rs`):
```rust
#[test]
fn reads_existing_electron_store_files_and_setting_names() { ... }  // camelCase migration
#[test]
fn history_defaults_on_and_deduplicates_saved_comparisons() { ... }
#[test]
fn recent_files_keep_the_ten_most_recent_paths() { ... }
```

TypeScript tests (`history.test.ts`):
```typescript
// Tests for describe_recent_file, describe_side utilities
```
