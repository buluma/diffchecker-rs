# Repository Guidelines

## Project Structure & Module Organization

This is a React 19 + TypeScript frontend bundled with Vite and packaged as a Tauri v2 app with a Rust backend.

- `src/` contains the renderer: `components/` for UI, `hooks/` for state, `utils/` for helpers, `types/` for shared types, and `assets/` for images/icons.
- `src-tauri/` contains the Tauri shell, native dialog integration, Rust commands, and local data store. Keep filesystem access and native dialogs in Rust; expose only narrowly scoped commands.
- `public/` contains files copied into the build, such as `favicon.svg` and `icons.svg`.
- Root `*.config.*` and `tsconfig*.json` files define Vite, TypeScript, and lint behavior.

## Build, Test, and Development Commands

Run `bun install` after checkout.

- `bun run dev` starts the Vite development server with hot reload.
- `bun run dev:desktop` starts Vite and the Tauri shell together.
- `bun run build` type-checks project references and creates the production renderer build in `dist/`.
- `bun run build:desktop` builds the renderer and packages the desktop app through Tauri.
- `bun run lint` runs the renderer and build-configuration TypeScript checks.
- `bun run test` runs the Vitest suite.
- `bun run preview` serves the built renderer locally for inspection.

## Coding Style & Naming Conventions

Use TypeScript and React function components for the renderer and Rust for native desktop behavior. Follow the existing two-space indentation and single-quote style in `src/`. Name components and types in PascalCase, hooks as `useThing`, utilities in camelCase, and component files after their exported component (for example, `DiffView.tsx`).

## Testing Guidelines

Add or update focused Vitest tests alongside behavior changes. Before submitting, run `bun run test`, `bun run lint`, and `bun run build` when relevant. Manually check the Tauri app with `bun run dev:desktop` when changing renderer interactions, commands, or native dialogs.

## Commit & Pull Request Guidelines

Use short, imperative commit subjects and keep each commit focused. Pull requests should explain the user-visible change, identify validation commands run, link related issues when applicable, and include screenshots or a short recording for UI changes. Call out native packaging or security-sensitive changes explicitly.

## Security & Configuration Tips

Keep the Tauri command surface narrow and capability-scoped. Validate command arguments, restrict file access to user-selected or explicitly approved recent files, and avoid committing local or secret configuration files.
