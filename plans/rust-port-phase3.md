# Rust Port Plan: Phase 3 — Language Detection, Merge, Markers

## Objective
Port the remaining TypeScript utilities to Rust:
- Language detection (`src/utils/language.ts`)
- Merge construction (`src/utils/merge.ts`)
- Markers/Navigation (`src/utils/markers.ts`)

---

## Scope

### In Scope (Phase 3)
- [ ] Port `detectLanguageFromPath` and `detectLanguageFromContent` to Rust
- [ ] Port `buildMergedContent` to Rust
- [ ] Port `groupKind`, `toMarkers`, `ChangeMarker` to Rust
- [ ] Add Tauri commands for each
- [ ] Update frontend to use Rust implementations
- [ ] Keep TS fallbacks for web builds
- [ ] Port/update tests

### Out of Scope
- None (this completes the core port)

---

## Technical Design

### New Rust Modules
```
src-tauri/src/
├── language.rs    # NEW: Language detection
├── merge.rs       # NEW: Merge construction
├── markers.rs     # NEW: Markers/navigation
└── lib.rs         # Add commands
```

### Tauri Commands
```rust
#[tauri::command]
async fn detect_language(path: Option<String>, content: String) -> String

#[tauri::command]
async fn build_merged_content(lines: Vec<DiffLine>, choices: HashMap<usize, String>) -> String

#[tauri::command]
async fn compute_markers(lines: Vec<DiffLine>, view_mode: DiffViewMode, wrap_lines: bool, scroll_height: f64) -> Vec<ChangeMarker>
```

---

## Implementation Steps

### Step 1: Create `src-tauri/src/language.rs`
- Port `detectLanguageFromPath` (extension-based)
- Port `detectLanguageFromContent` (heuristic-based)
- Map extensions to language names

### Step 2: Create `src-tauri/src/merge.rs`
- Port `buildMergedContent`
- Handle left/right choices for modified lines

### Step 3: Create `src-tauri/src/markers.rs`
- Port `groupKind`, `toMarkers`
- Port `ChangeMarker` struct

### Step 4: Register Commands in `lib.rs`
- Add all three commands to `invoke_handler`

### Step 5: Update Frontend
- Update `useDiff.ts` or relevant hooks to use Rust commands
- Keep TS fallbacks in `src/utils/` for web

### Step 6: Validate
- `cargo test` passes
- `bun run test` passes
- `bun run lint` passes
- Desktop app works

---

## Timeline
- **Day 1**: Steps 1-3 (Rust modules)
- **Day 2**: Steps 4-5 (Commands + frontend)
- **Day 3**: Step 6 (Validation)