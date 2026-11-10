---
type: "Reference"
title: "Quickstart"
openwiki_generated: true
verified:
  - by: openwiki/0.9.0
    at: 2026-11-10T04:51:48.310Z
sources:
  - id: openwiki-source-fe8daedf3ab4f3ac98603a3d
    resource: repo://.bun-version
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-ca67060e890937010b96de80
    resource: repo://src-tauri/Cargo.toml
  - id: openwiki-source-d1afade4641722495f434a61
    resource: repo://src/platform/desktop.ts
  - id: openwiki-source-5e1b077422a94ae165e88e4e
    resource: repo://vite.config.ts
generated: { by: "pi", at: "2026-11-10T04:51:48.310Z" }
---

# Quickstart

Get up and running with diffchecker-rs in minutes.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Bun** | Per `.bun-version` | Package manager, test runner |
| **Rust** | Stable (1.75+) | Tauri backend compilation |
| **System libs** | See below | Linux Tauri dependencies |

### Linux System Dependencies
```bash
sudo apt-get update
sudo apt-get install -y \
  build-essential curl wget file \
  libxdo-dev libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev libwebkit2gtk-4.1-dev
```

macOS and Windows need no extra system packages (Xcode Command Line Tools / Visual Studio Build Tools recommended).

## Installation

```bash
# Clone and enter
git clone https://github.com/your-org/diffchecker-rs.git
cd diffchecker-rs

# Install JavaScript dependencies
bun install

# Rust dependencies fetch automatically on first build
```

## Project Structure

```
diffchecker-rs/
├── src/                    # React 19 + TypeScript renderer
│   ├── components/         # UI: App, DiffView, Editor, Toolbar, HistoryPanel, StatusBar
│   ├── hooks/              # useDiff, useLocalData, useHighlightedLines
│   ├── platform/           # Tauri bridge (desktop.ts)
│   ├── utils/              # diff, merge, highlight, export, limits, language, markers, history
│   ├── types/              # Shared types (diff.ts, history.ts, diff-generated.ts from Rust)
│   └── test/               # Vitest setup
├── src-tauri/              # Tauri v2 + Rust backend
│   ├── src/                # Commands & logic
│   │   ├── lib.rs          # Command handlers + Tauri setup
│   │   ├── diff.rs         # Myers O(ND) diff
│   │   ├── merge.rs        # Three-way merge
│   │   ├── highlight.rs    # Syntect syntax highlighting
│   │   ├── store.rs        # Atomic JSON persistence
│   │   ├── limits.rs       # Input validation
│   │   └── types.rs        # Shared types (exported via ts-rs)
│   ├── build.rs            # Command registration
│   ├── capabilities/       # Permission scoping
│   └── Cargo.toml          # Rust dependencies
├── public/                 # Static assets (favicon, icons.svg)
├── package.json            # Scripts, deps
├── vite.config.ts          # Vite + Vitest config
└── tsconfig.*.json         # TypeScript project references
```

## Development Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Vite dev server only (http://localhost:5173) — web renderer |
| `bun run dev:desktop` | **Full dev** — Vite + `tauri dev` with hot reload for both |
| `bun run build` | Type-check (`tsc -b`) + Vite production build → `dist/` |
| `bun run build:desktop` | Full Tauri build → platform installers in `src-tauri/target/release/bundle/` |
| `bun run lint` | TypeScript check + oxlint |
| `bun run test` | Vitest (jsdom) |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Rust unit tests |
| `bun run preview` | Serve `dist/` for inspection |

### Recommended Workflow
```bash
# 1. Start development (both processes)
bun run dev:desktop

# 2. Edit src/ → Vite HMR updates renderer instantly
#    Edit src-tauri/src/ → cargo rebuilds, Tauri restarts (~2-5s)

# 3. Validate before commit
bun run lint && bun run test
cargo test --manifest-path src-tauri/Cargo.toml
```

## Testing

```bash
# Frontend
bun run test              # All tests
bun run test --watch      # Watch mode

# Backend
cargo test --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml diff  # Filter

# Both (as in CI)
bun run test && cargo test --manifest-path src-tauri/Cargo.toml
```

## Building

### Renderer Only
```bash
bun run build
# Output: dist/
```

### Desktop App
```bash
bun run build:desktop
# Output: src-tauri/target/release/bundle/
#   macOS:  .dmg (universal) + .app.zip
#   Windows: .exe (NSIS)
#   Linux:   .AppImage + .deb
```

**Note**: Builds are **unsigned**. macOS Gatekeeper / Windows SmartScreen will warn.

## Running the App

### Web (Renderer Only)
```bash
bun run dev
# Open http://localhost:5173
# Features: Compare, merge, syntax highlight, file drag-drop
# Missing: Native dialogs, recent files, history, settings persistence
```

### Desktop
```bash
bun run dev:desktop
# Or run built binary from src-tauri/target/release/diffchecker
# Full features: Native dialogs, recent files, history, settings
```

## Key Features Tour

1. **Compare**: Paste text or drop files → `Ctrl/Cmd+Enter`
2. **Views**: Side-by-Side / Unified (toolbar buttons)
3. **Precision**: Smart / Word / Character (toolbar dropdown)
4. **Options**: Ignore whitespace, case, wrap lines, hide unchanged
5. **Syntax**: Auto-detect or manual override (toolbar dropdown)
6. **Merge**: Click `Merge Mode` → click ←/→ arrows on changes → `Save Merged File`
7. **History** (desktop): Toolbar clock icon → restore past comparisons
8. **Recent files** (desktop): Toolbar dropdown next to Load buttons

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Enter` | Compare |
| `Ctrl/Cmd + O` | Load Original |
| `Ctrl/Cmd + Shift + O` | Load Changed |
| `Ctrl/Cmd + Shift + X` | Clear All |
| `Ctrl/Cmd + S` | Save (diff or merge) |
| `Escape` | Exit Merge Mode |

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Scripts, dependencies, Bun config |
| `vite.config.ts` | Vite plugins, aliases, test config |
| `tsconfig.app.json` | Renderer TypeScript config |
| `tsconfig.node.json` | Node/Vite config TypeScript config |
| `src-tauri/Cargo.toml` | Rust dependencies, crate metadata |
| `src-tauri/build.rs` | Tauri command registration |
| `src-tauri/capabilities/default.json` | Permission scoping |
| `.oxlintrc.json` | Oxlint rules |
| `AGENTS.md` | Repository guidelines |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `bun run dev:desktop` fails | Ensure Rust toolchain installed: `rustup default stable` |
| Linux build fails | Install system dependencies (see Prerequisites) |
| Types out of sync | Run `bun run build` — ts-rs exports at build time |
| Command not found in Tauri | Check `build.rs` commands list AND `capabilities/default.json` |
| History not saving | Check `~/.config/diffchecker-desktop/` permissions |
| Port 5173 in use | Vite `strictPort: true` — kill existing process |

## Next Steps

- Read [Architecture Overview](architecture/overview.md) for system design
- Read [Development Workflow](development/workflow.md) for contribution guidelines
- Explore [Diff Engine](features/diff-engine.md) for algorithm details
- Check [Tauri Bridge](architecture/tauri-bridge.md) for adding commands
