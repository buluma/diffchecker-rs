---
type: "Reference"
title: "Testing Strategy"
openwiki_generated: true
verified:
  - by: openwiki/0.9.0
    at: 2026-11-10T04:51:48.310Z
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-ca67060e890937010b96de80
    resource: repo://src-tauri/Cargo.toml
  - id: openwiki-source-5c9c75017a0ffb6a8bfda698
    resource: repo://src-tauri/src/diff.rs
  - id: openwiki-source-b31108b32199025363bcba0a
    resource: repo://src-tauri/src/merge.rs
  - id: openwiki-source-bc61deb53e87e4a755d7e6f3
    resource: repo://src-tauri/src/store.rs
  - id: openwiki-source-16015426d3d88b504eed8604
    resource: repo://src/components/App.desktop.test.tsx
  - id: openwiki-source-2e792a0b32466a96f86552af
    resource: repo://src/components/App.test.tsx
  - id: openwiki-source-991a3aaa436bd565cf973c8d
    resource: repo://src/test/setup.ts
  - id: openwiki-source-c1f80c8f300d2cbda7fd8c3f
    resource: repo://src/utils/diff-parity-fixtures.json
  - id: openwiki-source-3f0f4fd3ccf2ad3cca039c5b
    resource: repo://src/utils/diff.test.ts
  - id: openwiki-source-5e1b077422a94ae165e88e4e
    resource: repo://vite.config.ts
generated: { by: "pi", at: "2026-11-10T04:51:48.310Z" }
---

# Testing Strategy

The project uses **Vitest** for the React/TypeScript frontend and **Rust's built-in test framework** for the backend. Tests are **colocated** with source code.

## Frontend: Vitest

### Configuration (`vite.config.ts`)
```typescript
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
}
```

### Setup (`src/test/setup.ts`)
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());
```

### Commands
```bash
bun run test              # Run all tests
bun run test --watch      # Watch mode
bun run test --coverage   # Coverage report
```

### Test Organization

| Pattern | Location | Example |
|---------|----------|---------|
| Utility tests | `src/utils/*.test.ts` | `diff.test.ts`, `merge.test.ts`, `limits.test.ts` |
| Component tests | `src/components/*.test.tsx` | `App.test.tsx`, `DiffView.test.tsx`, `Editor.test.tsx` |
| Hook tests | `src/hooks/*.test.ts` | (via component tests) |
| Parity fixtures | `src/utils/diff-parity-fixtures.json` | Shared with Rust |

### Naming Conventions
- **File**: `*.test.ts` / `*.test.tsx` (same directory as source)
- **Describe block**: Module/function name (`describe('computeDiff', ...)`)
- **Test case**: Behavior description (`it('rejects inputs beyond line limit', ...)`)

### Key Test Suites

#### Diff Algorithm (`diff.test.ts`)
```typescript
// Property-based: 250 random sequences, verify LCS optimality
it('keeps optimal line matches across varied insertions, deletions, and replacements', ...)

// Boundary: 10,001 lines → DiffLimitError
it('rejects inputs beyond the configured line limit', ...)

// Complexity: 500 unrelated lines → simplified alignment + warning
it('bounds highly dissimilar inputs with a simplified alignment warning', ...)

// Inline diff: character/word precision
it('records inline character changes for a modified line', ...)

// Options: ignoreWhitespace, ignoreCase, customIgnoreRules
it('recognizes lines as equal after ignored normalization', ...)
```

#### Merge (`merge.test.ts`)
```typescript
// Mirrors Rust tests: unchanged, added, removed, modified with Left/Right choices
```

#### Limits (`limits.test.ts`)
```typescript
// Line limit, byte limit, error messages
```

#### Components
- **App.test.tsx**: Integration — keyboard shortcuts, file load, compare, merge mode
- **DiffView.test.tsx**: Rendering, virtualization, navigation, merge buttons
- **Editor.test.tsx**: Change handling, drag-drop, highlight, line numbers
- **StatusBar.test.tsx**: Message display, version
- **App.desktop.test.tsx**: Desktop-only features (history, recent files, native dialogs)

### Testing Patterns

#### Mocking Tauri
```typescript
// App.desktop.test.tsx
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  isTauri: () => true,
}));

// window.desktopAPI injection for useLocalData
Object.defineProperty(window, 'desktopAPI', { value: mockApi });
```

#### Async Helpers
```typescript
// Wait for debounced diff
await waitFor(() => expect(screen.getByText('1 change')).toBeInTheDocument());
```

#### Snapshot Testing
```typescript
// DiffView.test.tsx
expect(container).toMatchSnapshot();
```

## Backend: Rust `cargo test`

### Configuration (`Cargo.toml`)
```toml
[dev-dependencies]
tempfile = "3"
```

### Commands
```bash
cargo test --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture  # Show println!
cargo test --manifest-path src-tauri/Cargo.toml diff  # Filter
```

### Test Organization
- **Inline** in source files: `#[cfg(test)] mod tests { ... }`
- **Colocated** with implementation:
  - `store.rs` → persistence, deduplication, limits
  - `merge.rs` → merge logic
  - `highlight.rs` → highlighting, language mapping
  - `diff.rs` → Myers, parity fixtures, limits
  - `limits.rs` → validation
  - `history.rs` → display utilities

### Key Test Suites

#### Store (`store.rs`)
```rust
#[test]
fn reads_existing_electron_store_files_and_setting_names() { ... }  // Migration
#[test]
fn history_defaults_on_and_deduplicates_saved_comparisons() { ... }
#[test]
fn recent_files_keep_the_ten_most_recent_paths() { ... }
```

#### Diff (`diff.rs`)
```rust
#[test]
fn shared_browser_and_desktop_fixtures() { ... }  // Loads diff-parity-fixtures.json
#[test]
fn myers_matches_lcs_for_short_sequences() { ... }  // Exhaustive up to length 5
#[test]
fn large_unrelated_inputs_use_bounded_fallback() { ... }  // Warning + all added/removed
#[test]
fn accepts_maximum_line_count_and_rejects_excess_bytes() { ... }
```

#### Merge (`merge.rs`)
```rust
#[test] fn test_build_merged_content_preserves_unchanged() { ... }
#[test] fn test_build_merged_content_added() { ... }
#[test] fn test_build_merged_content_removed() { ... }
#[test] fn test_build_merged_content_modified() { ... }
```

#### Highlight (`highlight.rs`)
```rust
#[test] fn test_highlight_javascript() { ... }
#[test] fn test_highlight_rust() { ... }
#[test] fn fragments_escape_markup_and_preserve_empty_lines() { ... }
```

#### Limits (`limits.rs`)
```rust
#[test] fn test_max_input_bytes() { ... }
#[test] fn test_max_input_lines() { ... }
```

## Diff Parity Testing

### Shared Fixtures
`src/utils/diff-parity-fixtures.json` — JSON array of test cases:
```json
[
  {
    "name": "basic replacement",
    "original": "a\nb\nc",
    "changed": "a\nx\nc",
    "ignoreCase": false,
    "ignoreWhitespace": false,
    "ignoreRules": [],
    "types": ["equal", "modified", "equal"],
    "stats": { "added": 0, "removed": 0, "modified": 1, "unchanged": 2 }
  }
]
```

### Rust Consumption
```rust
#[test]
fn shared_browser_and_desktop_fixtures() {
    let fixtures: serde_json::Value = serde_json::from_str(
        include_str!("../../src/utils/diff-parity-fixtures.json")
    ).unwrap();
    for fixture in fixtures.as_array().unwrap() {
        let result = compute_diff(...).unwrap();
        assert_eq!(result.line_types, fixture["types"]);
        assert_eq!(result.stats, fixture["stats"]);
    }
}
```

### TypeScript Consumption
```typescript
// diff.test.ts uses same fixtures indirectly via property-based tests
// No direct JSON import; instead generates random cases and verifies LCS optimality
```

### Property-Based Testing (TypeScript)
```typescript
it('keeps optimal line matches across varied insertions, deletions, and replacements', () => {
  let seed = 41;
  const next = () => { seed = (seed * 48271) % 0x7fffffff; return seed; };
  for (let sample = 0; sample < 250; sample++) {
    const original = Array.from({ length: 1 + next() % 8 }, () => `line-${next() % 5}`);
    const changed = Array.from({ length: 1 + next() % 8 }, () => `line-${next() % 5}`);
    const result = computeDiff(original.join('\n'), changed.join('\n'), DEFAULT_DIFF_OPTIONS);
    expect(result.stats.unchanged).toBe(referenceLcsLength(original, changed));
  }
});
```

## CI Integration

GitHub Actions runs on every PR:
```yaml
- name: Test frontend
  run: bun run test
- name: Test backend
  run: cargo test --manifest-path src-tauri/Cargo.toml
- name: Lint
  run: bun run lint
- name: Build
  run: bun run build
```

## Coverage Gaps

| Area | Status |
|------|--------|
| Frontend utils | ✓ Good (diff, merge, limits, history, markers) |
| Frontend components | ✓ Good (App, DiffView, Editor, Toolbar, StatusBar) |
| Hooks | ○ Via component tests |
| Tauri commands | ○ Via App.desktop.test.tsx mocks |
| Rust commands | ✓ Unit tests in lib.rs modules |
| Integration (full Tauri) | ✗ Not automated |
| E2E | ✗ Manual via `bun run dev:desktop` |
