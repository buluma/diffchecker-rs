---
type: "Reference"
title: "Merge Functionality"
openwiki_generated: true
verified:
  - by: openwiki/0.9.0
    at: 2026-11-10T04:51:48.310Z
sources:
  - id: openwiki-source-8fb4609cef6e3bffc73c48ee
    resource: repo://src-tauri/src/lib.rs
  - id: openwiki-source-b31108b32199025363bcba0a
    resource: repo://src-tauri/src/merge.rs
  - id: openwiki-source-a608478329d5508fc7010c4a
    resource: repo://src/components/App.tsx
  - id: openwiki-source-537e94600b9727c5e86a9089
    resource: repo://src/components/DiffView.tsx
  - id: openwiki-source-5b46e3cd3c6b6b28f6dd7ae7
    resource: repo://src/utils/merge.ts
generated: { by: "pi", at: "2026-11-10T04:51:48.310Z" }
---

# Merge Functionality

The merge system provides **three-way merge** with per-hunk conflict resolution. Both Rust (`src-tauri/src/merge.rs`) and TypeScript (`src/utils/merge.ts`) implement identical logic.

## Merge Model

### MergeChoice
```rust
pub enum MergeChoice {
    Left,   // Keep original (left/original side)
    Right,  // Keep changed (right/modified side)
}
```

### Input
- `lines: &[DiffLine]` — Full diff result (includes Equal/Added/Removed/Modified)
- `choices: &HashMap<usize, MergeChoice>` — Per-line-index choice (only for non-Equal lines)

### Output
- `String` — Merged content with newlines

## Algorithm (`build_merged_content`)

```rust
pub fn build_merged_content(lines: &[DiffLine], choices: &HashMap<usize, MergeChoice>) -> String {
    let mut result = Vec::new();

    for (index, line) in lines.iter().enumerate() {
        let choice = choices.get(&index).copied();

        match line.r#type {
            DiffType::Equal => {
                // Always include unchanged lines
                result.push(line.content.clone());
            }
            DiffType::Added => {
                // Added in changed: include unless explicitly choosing Left (original)
                if choice != Some(MergeChoice::Left) {
                    result.push(line.content.clone());
                }
            }
            DiffType::Removed => {
                // Removed from original: include unless explicitly choosing Right (changed)
                if choice != Some(MergeChoice::Right) {
                    result.push(line.original_content.clone().unwrap_or_else(|| line.content.clone()));
                }
            }
            DiffType::Modified => {
                // Modified: choose between original_content (Left) or content (Right)
                let content = if choice == Some(MergeChoice::Left) {
                    line.original_content.clone().unwrap_or_else(|| line.content.clone())
                } else {
                    line.content.clone()
                };
                result.push(content);
            }
        }
    }

    result.join("\n")
}
```

## Decision Matrix

| DiffType | Choice: Left | Choice: Right | Choice: None (default) |
|----------|--------------|---------------|------------------------|
| **Equal** | Include | Include | Include |
| **Added** | **Exclude** | Include | Include |
| **Removed** | Include | **Exclude** | Include |
| **Modified** | Use `original_content` | Use `content` | Use `content` (Right) |

**Default (no choice)**: Behaves as `Right` for Added/Modified, `Left` for Removed — i.e., "accept all changes".

## Tauri Command

```rust
#[tauri::command]
async fn build_merged_content_cmd(
    lines: Vec<DiffLine>,
    choices: HashMap<usize, MergeChoice>,
) -> Result<String, String> {
    Ok(build_merged_content(&lines, &choices))
}
```

## Frontend Integration

### Merge Mode State (App.tsx)
```typescript
const [mergeMode, setMergeMode] = useState(false);
const [mergeChoices, setMergeChoices] = useState<Record<number, MergeChoice>>({});
const [mergedContent, setMergedContent] = useState<string>('');

// On merge choice change (from DiffView merge buttons)
const handleMergeChange = (line: DiffLine, direction: 'left' | 'right') => {
    const lineIndex = diffResult.lines.findIndex(l => l === line);
    const nextChoices = { ...mergeChoices, [lineIndex]: direction };
    setMergeChoices(nextChoices);
    updateMergedContent(diffResult.lines, nextChoices);
};

// Debounced merged content update
const updateMergedContent = useCallback((lines, choices) => {
    const request = ++mergeRequestRef.current;
    const api = getDesktopAPI();
    if (!api) {
        setMergedContent(buildMergedContent(lines, choices));  // Local fallback
        return;
    }
    api.buildMergedContent(lines, choices).then(content => {
        if (request === mergeRequestRef.current) setMergedContent(content);
    });
}, []);
```

### DiffView Merge Buttons
```typescript
// For Added/Modified lines in left (original) pane
{canMerge && (line.type === 'added' || line.type === 'modified') && (
    <button className="merge-button merge-left"
        onClick={() => onMergeChange?.(line, 'left')}
        title="Merge this change to the right"
        aria-label="Merge to right"
    >→</button>
)}

// For Removed/Modified lines in right (changed) pane
{canMerge && (line.type === 'removed' || line.type === 'modified') && (
    <button className="merge-button merge-right"
        onClick={() => onMergeChange?.(line, 'right')}
        title="Merge this change to the left"
        aria-label="Merge to left"
    >←</button>
)}
```

### Merge View (App.tsx)
When `mergeMode` is true:
- Shows editable `Editor` with `mergedContent`
- Save button writes merged result
- Cancel returns to diff view

## TypeScript Implementation (`merge.ts`)

```typescript
export function buildMergedContent(
    lines: DiffLine[],
    choices: Record<number, MergeChoice>
): string {
    // Identical logic to Rust
    // ...
}
```

Used as web fallback when `!isTauri()`.

## Testing

### Rust (`merge.rs`)
```rust
#[test] fn test_build_merged_content_preserves_unchanged() { ... }
#[test] fn test_build_merged_content_added() { ... }
#[test] fn test_build_merged_content_removed() { ... }
#[test] fn test_build_merged_content_modified() { ... }
```

### TypeScript (`merge.test.ts`)
```typescript
// Mirrors Rust tests: unchanged, added (left/right), removed (left/right), modified (left/right)
```

## Conflict Marker Handling

**No traditional conflict markers** (`<<<<<<<`, `=======`, `>>>>>>>`) are inserted. Instead:

1. **Per-hunk UI buttons** in DiffView let user pick Left/Right per change
2. **Merged preview** updates in real-time (debounced)
3. **Final output** is clean merged text — no markers

This is a **visual merge tool**, not a textual conflict marker generator.

## Data Flow

```
User clicks merge button in DiffView
       │
       ▼
handleMergeChange(line, 'left' | 'right')
       │
       ▼
setMergeChoices({ ...choices, [lineIndex]: direction })
       │
       ▼
updateMergedContent(diffLines, nextChoices)
       │
       ▼
invoke('build_merged_content_cmd', { lines, choices })  // or local buildMergedContent
       │
       ▼
setMergedContent(result)
       │
       ▼
Merge View Editor shows merged result
       │
       ▼
User clicks Save → native save dialog
```
