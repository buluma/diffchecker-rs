import { $ } from 'bun';

await $`cargo build --locked --manifest-path src-tauri/Cargo.toml --package diffchecker-engine --target wasm32-unknown-unknown --target-dir src-tauri/target --release`;
await $`wasm-bindgen --target web --out-dir src/platform/wasm src-tauri/target/wasm32-unknown-unknown/release/diffchecker_engine.wasm`;
