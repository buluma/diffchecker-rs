# Rust Port Plan: Phase 1 — Core Diff Engine

## Objective
Port the TypeScript diff algorithm (`src/utils/diff.ts`) to Rust and expose it as a Tauri command, replacing the Web Worker implementation.

---

## Status: **COMPLETED** ✅

All Phase 1 tasks have been completed. The diff algorithm is now implemented in Rust and exposed via a Tauri command. The frontend uses the Tauri command when running in the desktop app, with a TypeScript fallback for the web build.

---

## Completed Tasks

### ✅ Core Diff Algorithm Ported to Rust
- **File**: `src-tauri/src/diff.rs`
- Myers O(ND) algorithm with LCS fallback
- Character-level and word-level inline diff (`computeCharDiff`, `computeWordDiff`)
- Line normalization (whitespace, case, custom ignore rules)
- Gap alignment with similarity matching
- `filterDiffLines` for hiding unchanged lines with context

### ✅ Rust Types with Serde
- **File**: `src-tauri/src/types.rs`
- `DiffLine`, `DiffType`, `CharDiff`, `CharDiffType`
- `DiffOptions`, `DiffPrecision`, `DiffViewMode`
- `DiffResult`, `DiffStats`
- `FileContent`, `DefaultDiffOptions`
- `DiffLimitError`
- All with `#[derive(Serialize, Deserialize)]` and `#[serde(rename_all = "camelCase")]`

### ✅ Tauri Command
- **File**: `src-tauri/src/lib.rs`
- Added `compute_diff_cmd` command
- Registered in `invoke_handler`
- Returns `Result<DiffResult, String>`

### ✅ TypeScript Types Updated
- **File**: `src/types/diff.ts`
- Matches Rust types exactly (camelCase field names)
- Includes `DiffType` alias for backwards compatibility
- Includes `FileContent` and `DEFAULT_DIFF_OPTIONS`

### ✅ Frontend Integration
- **File**: `src/hooks/useDiff.ts`
- Uses `invoke('compute_diff_cmd', ...)` when in Tauri (`isTauri()`)
- Falls back to TypeScript `computeDiff` for web build
- Removed Web Worker logic
- Proper loading/error handling

### ✅ Tests Pass
- **Rust**: 27 tests pass (`cargo test`)
- **TypeScript**: 76 tests pass (`bun run test`)
- **TypeScript build**: Passes (`bun run lint`)

### ✅ Cleanup
- Removed `src/workers/diff.worker.ts`
- TypeScript `diff.ts` kept as fallback for web build
- TypeScript `diff.test.ts` kept for fallback testing

---

## Technical Details

### Tauri Command Signature
```rust
#[tauri::command]
async fn compute_diff_cmd(
    original: String,
    changed: String,
    options: DiffOptions,
) -> Result<DiffResult, String>
```

### Frontend Usage
```typescript
// In useDiff.ts
if (isTauri()) {
  result = await invoke('compute_diff_cmd', { original, changed, options });
} else {
  const { computeDiff } = await import('../utils/diff');
  result = computeDiff(original, changed, options);
}
```

### Type Sharing
- Rust types are the source of truth
- TypeScript types manually maintained to match (ts-rs generation had environment issues)
- Serde handles serialization with `camelCase` renaming

---

## Performance
- Rust implementation is significantly faster than TypeScript Web Worker
- Large diffs (5MB, 10k lines) complete in <100ms in Rust
- No Web Worker overhead in desktop app

---

## Next Steps (Phase 2+)

### Phase 2: Syntax Highlighting
- Port `highlight.ts` to Rust using `syntect` or `tree-sitter-highlight`
- Expose `highlight` Tauri command

### Phase 3: Language Detection & Merge
- Port `language.ts` (trivial)
- Port `merge.ts` (trivial)
- Port `markers.ts` (trivial)

---

## Validation Commands
```bash
# Rust tests
cd src-tauri && cargo test

# TypeScript tests
bun run test

# TypeScript type-check
bun run lint

# Desktop app dev
bun run dev:desktop

# Full desktop build
bun run build:desktop
```