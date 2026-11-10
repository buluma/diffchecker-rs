---
type: "Reference"
title: "Diff Engine"
openwiki_generated: true
verified:
  - by: openwiki/0.9.0
    at: 2026-11-10T04:51:48.310Z
sources:
  - id: openwiki-source-5c9c75017a0ffb6a8bfda698
    resource: repo://src-tauri/src/diff.rs
  - id: openwiki-source-537e94600b9727c5e86a9089
    resource: repo://src/components/DiffView.tsx
  - id: openwiki-source-c1f80c8f300d2cbda7fd8c3f
    resource: repo://src/utils/diff-parity-fixtures.json
  - id: openwiki-source-3f0f4fd3ccf2ad3cca039c5b
    resource: repo://src/utils/diff.test.ts
  - id: openwiki-source-558434bd32d94f45c32e9eed
    resource: repo://src/utils/diff.ts
generated: { by: "pi", at: "2026-11-10T04:51:48.310Z" }
---

# Diff Engine

The diff engine implements the **Myers O(ND) algorithm** for line-level diffing with **inline character/word diffs** via LCS. Both Rust (`src-tauri/src/diff.rs`) and TypeScript (`src/utils/diff.ts`) implementations are **algorithmically identical** and validated by shared parity fixtures.

## Algorithm Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        computeDiff()                                 │
├─────────────────────────────────────────────────────────────────────┤
│  1. Validate input (5 MiB / 10k lines)                               │
│  2. Split into lines → normalize per options                         │
│  3. Myers O(ND) on normalized lines → LCS matches                   │
│  4. Align gaps between matches → pair similar lines as Modified     │
│  5. Emit Equal/Added/Removed/Modified with line numbers             │
│  6. For Modified: inline char/word diff (Smart/Word/Character)      │
│  7. Return DiffResult { lines, stats, warning? }                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Core Data Structures

### DiffLine (shared via ts-rs)
```typescript
type DiffType = 'equal' | 'added' | 'removed' | 'modified';

interface DiffLine {
  type: DiffType;
  originalLineNumber: number | null;
  changedLineNumber: number | null;
  content: string;                    // Changed side content
  originalContent?: string;           // Original side (for modified/removed)
  changedContent?: string;            // Changed side (for modified)
  charDiffs?: CharDiff[];             // Inline diff (null if too large)
}

interface CharDiff {
  type: 'equal' | 'added' | 'removed';
  value: string;
}
```

### DiffOptions
```typescript
interface DiffOptions {
  precision: 'smart' | 'word' | 'character';
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  wrapLines: boolean;
  hideUnchangedLines: boolean;
  viewMode: 'side-by-side' | 'unified';
  customIgnoreRules: string[];  // Literal string replacements
}
```

### DiffResult
```typescript
interface DiffResult {
  lines: DiffLine[];
  stats: { added, removed, modified, unchanged: number };
  warning?: string;  // "Used simplified alignment..."
}
```

## Myers O(ND) Algorithm

Both implementations use the **Myers difference algorithm** with bounded complexity:

| Limit | Value | Purpose |
|-------|-------|---------|
| `MAX_MYERS_TRACE_CELLS` | 200,000 | `(distance+1)²` cap on trace matrix |
| `MAX_MYERS_WORK` | 2,000,000 | Total cell visits across all diagonals |
| Fallback | Simplified positional alignment | When limits exceeded |

**Behavior**: For highly dissimilar inputs (e.g., 400 completely different lines), Myers hits work limit → falls back to emitting all lines as Added/Removed with a warning.

## Precision Modes

| Mode | Inline Diff Granularity | Selection Logic (Smart) |
|------|------------------------|------------------------|
| **Character** | Per-character LCS | Short lines (<50 chars), numbers, special chars |
| **Word** | Per-word LCS (whitespace-delimited) | Prose-like text |
| **Smart** | Auto | Character for code/IDs, Word for prose |

**Cell cap**: `MAX_INLINE_DIFF_CELLS = 4,000,000` (original_len × changed_len). Exceeds → `charDiffs = null`.

## Gap Alignment (Modified Line Pairing)

Between two LCS matches, lines exist only on one side or differ. The engine pairs them as **Modified** when similar:

```typescript
// Similarity = Dice coefficient on character bigrams
similarity(a, b) = 2 × shared_bigrams / (bigrams_a + bigrams_b)
threshold: MIN_LINE_SIMILARITY = 0.5

// Also: trim-whitespace equality always counts as similar
```

**Large gap optimization**: `MAX_GAP_COMPARISONS = 100,000` (removed × added). Beyond → positional-only pairing (same index).

## Filter (Hide Unchanged)

`filterDiffLines(lines, options)` keeps **3 lines of context** around each change when `hideUnchangedLines: true`.

## Parity Testing

### Shared Fixtures
`src-tauri/src/diff-parity-fixtures.json` (included in both test suites):

```json
[
  { "name": "basic replacement", "original": "a\nb\nc", "changed": "a\nx\nc", ... },
  { "name": "ignore whitespace", "original": "a  b", "changed": "a b", "ignoreWhitespace": true, ... }
]
```

### Rust Test (`src-tauri/src/diff.rs`)
```rust
#[test]
fn shared_browser_and_desktop_fixtures() {
    let fixtures = include_str!("../../src/utils/diff-parity-fixtures.json");
    for fixture in fixtures {
        let result = compute_diff(...).unwrap();
        assert_eq!(result.line_types, fixture.types);
        assert_eq!(result.stats, fixture.stats);
    }
}
```

### TypeScript Test (`src/utils/diff.test.ts`)
```typescript
it('keeps optimal line matches across varied insertions, deletions, and replacements', () => {
  // Property-based: 250 random sequences, verify LCS length matches reference
});

it('bounds highly dissimilar inputs with a simplified alignment warning', () => {
  // 500 unrelated lines → all added/removed + warning
});
```

## Key Differences: Rust vs TypeScript

| Aspect | Rust | TypeScript |
|--------|------|------------|
| Word split | `split_inclusive(|c| c.is_whitespace())` | `split(/(\s+)/)` |
| Case folding | `to_lowercase()` (Unicode) | `toLowerCase()` (ASCII) |
| Bigrams | `HashMap<String, usize>` | `Map<string, number>` |
| Error type | `DiffLimitError` (enum) | `DiffLimitError` (class) |
| Line numbers | 1-indexed `usize` | 1-indexed `number` |

## Integration Points

- **Frontend**: `useDiff` hook calls `compute_diff_cmd` (desktop) or local `computeDiff()` (web)
- **DiffView**: Renders `DiffLine[]` with virtualized scrolling, inline `charDiffs`
- **Merge**: `build_merged_content` consumes `DiffLine[]` + choices
- **Export**: `format_diff_cmd` formats `DiffLine[]` as unified/side-by-side text
- **Minimap**: `compute_markers_cmd` uses grouped change positions
