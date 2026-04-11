pub mod editor;
pub mod label;
pub mod repository;
pub mod worktree;

/// tauri-plugin-store の保存先ファイル名（全コマンドで共通）
pub const STORE_PATH: &str = "grove_config.json";
