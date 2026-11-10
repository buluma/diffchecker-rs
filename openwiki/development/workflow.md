---
type: "Reference"
title: "Development Workflow"
openwiki_generated: true
verified:
  - by: openwiki/0.9.0
    at: 2026-11-10T04:51:48.310Z
sources:
  - id: openwiki-source-bbf3d58bf1c2c539fc59e66c
    resource: repo://.oxlintrc.json
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-7d9c2c95cd6f848332130fbd
    resource: repo://src-tauri/build.rs
  - id: openwiki-source-00ff4b2512b6dbfa268cbfa4
    resource: repo://src-tauri/capabilities/default.json
  - id: openwiki-source-ca67060e890937010b96de80
    resource: repo://src-tauri/Cargo.toml
  - id: openwiki-source-8fb4609cef6e3bffc73c48ee
    resource: repo://src-tauri/src/lib.rs
  - id: openwiki-source-d1afade4641722495f434a61
    resource: repo://src/platform/desktop.ts
  - id: openwiki-source-5e1b077422a94ae165e88e4e
    resource: repo://vite.config.ts
generated: { by: "pi", at: "2026-11-10T04:51:48.310Z" }
---

# Development Workflow

## Prerequisites

- **Bun** (version from `.bun-version`)
- **Rust toolchain** (stable) for Tauri backend
- **System libraries** (Linux): `build-essential`, `libwebkit2gtk-4.1-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `libxdo-dev`

```bash
# Install Bun dependencies
bun install

# Rust dependencies are fetched automatically by cargo during build
```

## Development Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite dev server only (web renderer at `http://localhost:5173`) |
| `bun run dev:desktop` | Start Vite + `tauri dev` (hot reload for both renderer and Rust) |
| `bun run build` | Type-check (`tsc -b`) + Vite production build → `dist/` |
| `bun run build:desktop` | Full Tauri build → platform installers in `src-tauri/target/release/bundle/` |
| `bun run lint` | TypeScript check (`tsc -b --pretty false`) + oxlint |
| `bun run test` | Run Vitest suite (jsdom environment) |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Run Rust unit tests |
| `bun run preview` | Serve built renderer from `dist/` for inspection |

## Tauri Development Workflow

```bash
# 1. Start development (both processes with hot reload)
bun run dev:desktop

# 2. Make changes to:
#    - src/              → Vite HMR updates renderer instantly
#    - src-tauri/src/    → cargo rebuilds, Tauri restarts app (fast)
#    - src-tauri/Cargo.toml → restart dev:desktop

# 3. Test changes:
bun run test                    # Frontend tests
cargo test --manifest-path src-tauri/Cargo.toml  # Backend tests

# 4. Validate before commit:
bun run lint                    # TypeScript + oxlint
bun run build                   # Full renderer build check
```

**Hot reload behavior**:
- Renderer: Vite HMR preserves React state
- Rust: `tauri dev` watches `src-tauri/` and rebuilds/restarts the binary (typically 2-5s)

## Linting Setup

### TypeScript (`tsc -b`)
- Project references: `tsconfig.app.json` (renderer), `tsconfig.node.json` (Vite config)
- Strict mode enabled
- Runs as part of `bun run lint` and `bun run build`

### Oxlint (`.oxlintrc.json`)
```json
{
  "plugins": ["react", "typescript", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```
- Fast Rust-based linter (oxc)
- React hooks rules enforced
- TypeScript-aware via oxc parser
- Runs after `tsc` in `bun run lint`

### Rust
- Standard `cargo check` / `cargo clippy` (not in `bun run lint`; run manually)
- `cargo test` includes clippy-style checks in CI

## Testing

### Frontend (Vitest)
```bash
bun run test
```
- Environment: `jsdom` (configured in `vite.config.ts`)
- Setup: `src/test/setup.ts` (testing-library/jest-dom)
- Tests colocated: `*.test.ts` / `*.test.tsx` alongside source
- Coverage: Diff algorithms, merge logic, markers, limits, history, components

### Backend (Rust)
```bash
cargo test --manifest-path src-tauri/Cargo.toml
```
- Unit tests in `#[cfg(test)]` modules beside implementation
- Key areas: store (persistence, deduplication), merge, highlight, diff, limits, history
- Temp directories for isolated store tests

## Git Workflow (from AGENTS.md)

### Commit Guidelines
- **Short, imperative subjects** (e.g., "Add merge conflict resolution")
- **Focused commits** — one logical change per commit
- No commit message templates; clarity over convention

### Pull Request Guidelines
1. **Explain the user-visible change**
2. **Identify validation commands run** (lint, test, build)
3. **Link related issues** when applicable
4. **Include screenshots/recordings** for UI changes
5. **Call out native packaging or security-sensitive changes** explicitly

### Branch/PR Process
- Work on feature branches
- Squash-merge to main (clean history)
- CI runs on PR: `bun run lint`, `bun run test`, `cargo test`, `bun run build`
- `bunx tauri build --no-bundle` when changing commands, capabilities, or packaging

## Project Structure Reference

```
diffchecker-rs/
├── src/                          # Renderer (React + TypeScript)
│   ├── components/               # UI components
│   ├── hooks/                    # State hooks (useDiff, useLocalData, useHighlightedLines)
│   ├── platform/                 # Tauri bridge (desktop.ts)
│   ├── utils/                    # Algorithms (diff, merge, highlight, export, limits, language, markers, history)
│   ├── types/                    # Shared types (diff.ts, history.ts, diff-generated.ts from Rust)
│   ├── test/                     # Vitest setup
│   └── assets/                   # Images, icons
├── src-tauri/                    # Tauri shell + Rust backend
│   ├── src/                      # Rust commands & logic
│   │   ├── lib.rs                # Command handlers + Tauri setup
│   │   ├── main.rs               # Entry point
│   │   ├── types.rs              # Shared types (exported via ts-rs)
│   │   ├── diff.rs               # Myers diff algorithm
│   │   ├── merge.rs              # Three-way merge
│   │   ├── highlight.rs          # Syntect syntax highlighting
│   │   ├── store.rs              # Atomic JSON persistence
│   │   ├── history.rs            # History descriptions
│   │   ├── limits.rs             # Input validation
│   │   ├── export.rs             # Diff formatting
│   │   ├── language.rs           # Language detection
│   │   └── markers.rs            # Minimap markers
│   ├── build.rs                  # Tauri command registration
│   ├── capabilities/default.json # Permission scoping
│   └── Cargo.toml                # Rust dependencies
├── public/                       # Static assets (favicon, icons.svg)
├── dist/                         # Vite build output (gitignored)
├── package.json                  # Scripts, deps, Bun config
├── vite.config.ts                # Vite + Vitest config
├── tsconfig.*.json               # TypeScript project references
├── .oxlintrc.json                # Oxlint rules
└── AGENTS.md                     # Repository guidelines
```

## Release Process

1. Update version in `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`
2. Commit: `chore: release v1.x.x`
3. Tag: `git tag v1.x.x && git push origin v1.x.x`
4. GitHub Actions builds on native runners (macOS, Windows, Linux)
5. Unsigned installers attached to GitHub Release:
   - macOS: universal DMG + zipped .app
   - Windows: NSIS .exe
   - Linux: AppImage + .deb

## Debugging Tips

| Issue | Approach |
|-------|----------|
| Renderer not updating | Check Vite HMR console; `bun run dev` for pure web debugging |
| Rust changes not picked up | Restart `dev:desktop`; check `cargo build` output |
| Command not found | Verify in `build.rs` commands list AND `capabilities/default.json` |
| Type mismatch TS/Rust | Run `bun run build` — ts-rs export happens at build time |
| History not persisting | Check `~/.config/diffchecker-desktop/` permissions |

## Adding a New Tauri Command

1. **Rust**: Add `#[tauri::command]` function in `src-tauri/src/lib.rs`, register in `build.rs`
2. **Capability**: Add `allow-<command-name>` to `src-tauri/capabilities/default.json`
3. **TypeScript**: Add to `DesktopAPI` in `src/platform/desktop.ts`
4. **Hook**: Call via `invoke()` in `useDiff` or `useLocalData`
5. **Test**: Add Rust unit test + frontend integration test
6. **Validate**: `bun run lint && bun run build && bun run dev:desktop`
