---
type: "Reference"
title: "Input Limits & Performance"
openwiki_generated: true
verified:
  - by: openwiki/0.9.0
    at: 2026-11-10T04:51:48.310Z
sources:
  - id: openwiki-source-5c9c75017a0ffb6a8bfda698
    resource: repo://src-tauri/src/diff.rs
  - id: openwiki-source-8fb4609cef6e3bffc73c48ee
    resource: repo://src-tauri/src/lib.rs
  - id: openwiki-source-66a7713403a87c4fc5427cd0
    resource: repo://src-tauri/src/limits.rs
  - id: openwiki-source-bc61deb53e87e4a755d7e6f3
    resource: repo://src-tauri/src/store.rs
  - id: openwiki-source-537e94600b9727c5e86a9089
    resource: repo://src/components/DiffView.tsx
  - id: openwiki-source-ced6dec7551b503c7d471790
    resource: repo://src/components/Editor.tsx
  - id: openwiki-source-6ba549fb867c1ec40e6861de
    resource: repo://src/hooks/useDiff.ts
  - id: openwiki-source-8f7f181782bf076ce00ed803
    resource: repo://src/hooks/useHighlightedLines.ts
  - id: openwiki-source-558434bd32d94f45c32e9eed
    resource: repo://src/utils/diff.ts
  - id: openwiki-source-0af415af42a4dac1b99297b8
    resource: repo://src/utils/limits.ts
generated: { by: "pi", at: "2026-11-10T04:51:48.310Z" }
---

# Input Limits & Performance

The diff engine enforces **hard limits** on input size and complexity to guarantee responsiveness and prevent DoS. Limits are **identical in Rust and TypeScript** for parity.

## Configurable Limits

| Limit | Value | Enforcement |
|-------|-------|-------------|
| **Max input bytes** | 5 MiB (5,242,880) | Per input (original/changed) |
| **Max input lines** | 10,000 | Per input |
| **Max Myers trace cells** | 200,000 | `(distance+1)²` |
| **Max Myers work units** | 2,000,000 | Total cell visits |
| **Max inline diff cells** | 4,000,000 | `original_len × changed_len` per line |
| **Max gap comparisons** | 100,000 | `removed_count × added_count` |
| **Min line similarity** | 0.5 (Dice) | Modified line pairing |
| **Context lines (filter)** | 3 | Hide unchanged mode |

## Rust Implementation (`limits.rs`)

```rust
pub const MAX_INPUT_BYTES: usize = 5 * 1024 * 1024;
pub const MAX_INPUT_LINES: usize = 10_000;

pub fn get_input_limit_error(content: &str) -> Option<DiffLimitError> {
    if content.as_bytes().len() > MAX_INPUT_BYTES {
        return Some(DiffLimitError::new("Each input is limited to 5 MiB."));
    }

    let mut lines = 1usize;
    for ch in content.chars() {
        if ch == '\n' {
            lines += 1;
            if lines > MAX_INPUT_LINES {
                return Some(DiffLimitError::new(format!(
                    "Each input is limited to {} lines.", MAX_INPUT_LINES
                )));
            }
        }
    }
    None
}
```

### Tauri Command
```rust
#[tauri::command]
fn validate_input_cmd(content: String) -> Result<(), DiffLimitError> {
    get_input_limit_error(&content).map(Err).unwrap_or(Ok(()))
}
```

## TypeScript Implementation (`limits.ts`)

```typescript
export const MAX_INPUT_BYTES = 5 * 1024 * 1024;
export const MAX_INPUT_LINES = 10_000;

export class DiffLimitError extends Error {
  constructor(public message: string) {
    super(message);
    this.name = 'DiffLimitError';
  }
}

export function getInputLimitError(content: string): DiffLimitError | null {
  if (content.length > MAX_INPUT_BYTES) {
    return new DiffLimitError('Each input is limited to 5 MiB.');
  }
  const lines = (content.match(/\n/g) || []).length + 1;
  if (lines > MAX_INPUT_LINES) {
    return new DiffLimitError(`Each input is limited to ${MAX_INPUT_LINES} lines.`);
  }
  return null;
}
```

## Diff Engine Complexity Limits

### Myers Trace Cap
```rust
const MAX_MYERS_TRACE_CELLS: usize = 200_000;
if (distance + 1) * (distance + 1) > MAX_MYERS_TRACE_CELLS {
    return Err(DiffComplexityError);
}
```
**Effect**: For edit distance > ~447, falls back to simplified alignment.

### Myers Work Cap
```rust
const MAX_MYERS_WORK: usize = 2_000_000;
if ++work > MAX_MYERS_WORK { return Err(DiffComplexityError); }
```
**Effect**: Bounds total cell visits across all diagonals.

### Fallback Behavior
When limits exceeded:
1. `compute_myers_matches` returns `Err(DiffComplexityError)`
2. `compute_diff` catches → uses empty LCS + simplified gap alignment
3. Result: All differing lines emitted as Added/Removed (no Modified pairs)
4. Warning: `"Used simplified alignment because the inputs differ too extensively for a precise diff."`

### Inline Diff Cap
```rust
const MAX_INLINE_DIFF_CELLS: usize = 4_000_000;
if orig_content.len() * changed_content.len() <= MAX_INLINE_DIFF_CELLS {
    // Compute char/word diff
} else {
    char_diffs = None;  // Still marked Modified, just no inline highlights
}
```
**Threshold**: ~2000 chars each side (2000 × 2000 = 4M)

### Gap Comparison Cap
```rust
const MAX_GAP_COMPARISONS: usize = 100_000;
if removed.len() * added.len() <= MAX_GAP_COMPARISONS {
    // Full LCS with Dice similarity
} else {
    // Positional only (same index)
}
```

## Performance Optimizations

### Virtualized Rendering
- **DiffView**: Renders only visible lines when >500 lines, no wrap, not hiding unchanged
- **Editor**: Overlays highlighted `<pre>` on `<textarea>`; only visible lines highlighted
- **Line numbers**: Virtualized with spacer divs

### Debounced Diff Recomputation
```typescript
// useDiff.ts
const delay = hasResultRef.current ? 150 : 0;
// First compare: immediate; subsequent: 150ms debounce
```

### Request ID Guards
```typescript
const requestId = ++requestIdRef.current;
// In async callback:
if (requestId !== requestIdRef.current) return;  // Stale, discard
```

### Language Detection Race Handling
```typescript
const languageRequestRef = useRef({ original: 0, changed: 0 });
// Per-side increment on content change; callback checks ID before updating
```

### Memoized Highlighting
```typescript
// useHighlightedLines
const key = JSON.stringify(lines);
const uniqueLines = [...new Set(lines)];  // Dedupe before highlighting
// Cache keyed by (lines, language)
```

## Cancellation / Timeout Handling

| Scenario | Handling |
|----------|----------|
| User types during diff | Debounced 150ms; previous request discarded via requestId |
| User switches tabs | `useEffect` cleanup cancels pending timeouts |
| Massive input (5MiB) | Validated before diff; rejected early |
| Myers timeout | Complexity caps → fallback (not async timeout) |
| App close | Tauri handles process termination |

## Testing

Rust (`limits.rs`):
```rust
#[test] fn test_max_input_bytes() { ... }
#[test] fn test_max_input_lines() { ... }
#[test] fn test_error_message_format() { ... }
```

TypeScript (`limits.test.ts`):
```typescript
it('rejects inputs beyond the configured line limit', () => { ... })
it('bounds highly dissimilar inputs with a simplified alignment warning', () => { ... })
```

## Limit Enforcement Points

| Layer | Check |
|-------|-------|
| **Editor (drop/paste)** | `getInputLimitError()` → shows toast |
| **File open (Rust)** | `open_file` reads metadata, rejects >5MiB before read |
| **File open (TS)** | `FileReader` checks `file.size` |
| **Diff compute (Rust)** | `compute_diff` validates both inputs |
| **Diff compute (TS)** | `computeDiff` validates both inputs |
| **History save** | `add_history_entry` validates per-side 1MiB |
| **Tauri command** | `validate_input_cmd` for ad-hoc checks |
