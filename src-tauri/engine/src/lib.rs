pub mod diff;
pub mod export;
pub mod highlight;
pub mod language;
pub mod limits;
pub mod markers;
pub mod merge;
pub mod types;

#[cfg(target_arch = "wasm32")]
mod wasm;
