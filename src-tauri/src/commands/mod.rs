pub mod editor;
pub mod label;
pub mod order;
pub mod repository;
pub mod terminal;
pub mod theme;
pub mod worktree;

/// tauri-plugin-store の保存先ファイル名（全コマンドで共通）
pub const STORE_PATH: &str = "grove_config.json";

/// 候補パスのリストから最初に実在するパスを返す。
///
/// `editor` / `terminal` モジュールなど、外部ツールのパス解決で共通に使う
/// テスト可能な純粋関数。
///
/// # Arguments
/// * `candidates` - チェック対象のパス候補スライス
///
/// # Returns
/// 最初に存在が確認できたパスの `Some(String)`。全て存在しなければ `None`
pub(crate) fn pick_existing_path(candidates: &[&str]) -> Option<String> {
    use std::path::Path;
    candidates
        .iter()
        .find(|p| Path::new(p).exists())
        .map(|p| (*p).to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pick_existing_path_returns_first_existing() {
        let candidates = ["/nonexistent/foo/bar", "/bin/sh", "/usr/bin/env"];
        assert_eq!(pick_existing_path(&candidates), Some("/bin/sh".to_string()));
    }

    #[test]
    fn test_pick_existing_path_returns_none_when_all_missing() {
        let candidates = ["/nonexistent/foo", "/nonexistent/bar"];
        assert_eq!(pick_existing_path(&candidates), None);
    }

    #[test]
    fn test_pick_existing_path_empty_list() {
        let candidates: [&str; 0] = [];
        assert_eq!(pick_existing_path(&candidates), None);
    }
}
