pub mod editor;
pub mod label;
pub mod order;
pub mod repository;
pub mod terminal;
pub mod theme;
pub mod worktree;

/// tauri-plugin-store の保存先ファイル名（全コマンドで共通）
pub const STORE_PATH: &str = "grove_config.json";
