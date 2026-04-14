use std::process::Command;

use serde::{Deserialize, Serialize};

/// 検出済みターミナルアプリ 1 件分の情報。フロントエンドへ JSON でシリアライズされる。
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct TerminalApp {
    /// 識別子。`AppConfig.terminal` に保存される値（例: `"terminal"`, `"ghostty"`）
    pub id: String,
    /// UI 表示名（例: `"Terminal.app"`, `"Ghostty"`）
    pub name: String,
    /// `.app` バンドルの絶対パス（例: `"/Applications/Ghostty.app"`）
    pub path: String,
}

/// 既知ターミナルアプリの候補定義。`(id, 表示名, パス候補リスト)` のタプルスライス。
///
/// パス候補が複数あるのは macOS バージョンによりインストール先が異なるケース
/// （Terminal.app など）に対応するため。`detect_installed_terminals` は各候補の
/// パスリストから最初に存在するものを採用する。
const KNOWN_TERMINALS: &[(&str, &str, &[&str])] = &[
    (
        "terminal",
        "Terminal.app",
        &[
            "/System/Applications/Utilities/Terminal.app",
            "/Applications/Utilities/Terminal.app",
        ],
    ),
    ("ghostty", "Ghostty", &["/Applications/Ghostty.app"]),
    ("iterm2", "iTerm2", &["/Applications/iTerm.app"]),
    ("alacritty", "Alacritty", &["/Applications/Alacritty.app"]),
    ("warp", "Warp", &["/Applications/Warp.app"]),
    ("kitty", "kitty", &["/Applications/kitty.app"]),
];

/// `KNOWN_TERMINALS` から `id` に一致するエントリのパスを解決する。
///
/// # Arguments
/// * `terminal_id` - 検索するターミナル識別子
///
/// # Returns
/// 一致するエントリが存在し、かつパスが実在する場合は `Some((表示名, パス))`。
/// 一致しない or パスが全て存在しない場合は `None`
fn resolve_terminal(terminal_id: &str) -> Option<(&'static str, String)> {
    KNOWN_TERMINALS
        .iter()
        .find(|(id, _, _)| *id == terminal_id)
        .and_then(|(_, name, candidates)| {
            super::pick_existing_path(candidates).map(|path| (*name, path))
        })
}

/// インストール済みの既知ターミナルアプリを検出して一覧を返す。
///
/// `KNOWN_TERMINALS` の全候補を走査し、`.app` バンドルが実在するもののみ返す。
/// パス存在チェックは O(1) × 候補数で十分高速なため、キャッシュは行わない。
///
/// # Returns
/// 検出されたターミナルアプリの `Vec<TerminalApp>`。
/// 何もインストールされていなければ空ベクタを返す
#[tauri::command]
pub fn detect_installed_terminals() -> Vec<TerminalApp> {
    KNOWN_TERMINALS
        .iter()
        .filter_map(|(id, name, candidates)| {
            super::pick_existing_path(candidates).map(|path| TerminalApp {
                id: id.to_string(),
                name: name.to_string(),
                path,
            })
        })
        .collect()
}

/// 指定パスを選択中のターミナルアプリで開く（`open -a <app_path> <dir>` を spawn）。
///
/// 親プロセス（Grove）は起動完了を待たず、spawn 直後にリターンする。
///
/// # Arguments
/// * `path` - 開く対象の絶対パス（ディレクトリ）
/// * `terminal_id` - 使用するターミナルアプリの識別子（`TerminalApp::id`）
///
/// # Returns
/// * `Ok(())` - spawn 成功時（ターミナルアプリ側の起動成否は保証しない）
/// * `Err(String)` - 日本語のエラーメッセージ
///
/// # Errors
/// - `terminal_id` に対応するアプリが見つからない / パスが存在しない場合
/// - `Command::spawn` に失敗した場合（実行権限なし等）
///
/// # 副作用
/// 指定されたターミナルアプリを `open -a` で spawn する
#[tauri::command]
pub fn open_in_terminal(path: String, terminal_id: String) -> Result<(), String> {
    let (name, app_path) = resolve_terminal(&terminal_id)
        .ok_or_else(|| format!("ターミナルアプリが見つかりませんでした（ID: {}）", terminal_id))?;
    Command::new("open")
        .args(["-a", &app_path, &path])
        .spawn()
        .map_err(|e| format!("{} を起動できませんでした: {}", name, e))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn test_known_terminals_no_duplicate_ids() {
        let mut ids = HashSet::new();
        for (id, _, _) in KNOWN_TERMINALS {
            assert!(ids.insert(*id), "重複した id: {}", id);
        }
    }

    #[test]
    fn test_known_terminals_non_empty_paths() {
        for (id, _, candidates) in KNOWN_TERMINALS {
            assert!(!candidates.is_empty(), "{} のパス候補が空です", id);
        }
    }

    #[test]
    fn test_detect_installed_terminals_returns_valid_structs() {
        let terminals = detect_installed_terminals();
        for t in &terminals {
            assert!(!t.id.is_empty(), "id が空です");
            assert!(!t.name.is_empty(), "name が空です");
            assert!(!t.path.is_empty(), "path が空です");
            // 返却されたパスは実在するはず
            assert!(
                std::path::Path::new(&t.path).exists(),
                "{} のパス {} が存在しません",
                t.id,
                t.path
            );
        }
    }

    #[test]
    fn test_open_in_terminal_invalid_id() {
        let result = open_in_terminal("/tmp".to_string(), "nonexistent".to_string());
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("ターミナルアプリが見つかりませんでした"));
    }

    #[test]
    fn test_resolve_terminal_with_valid_id() {
        // Terminal.app は macOS なら存在するはず
        if std::path::Path::new("/System/Applications/Utilities/Terminal.app").exists() {
            let result = resolve_terminal("terminal");
            assert!(result.is_some());
            let (name, path) = result.unwrap();
            assert_eq!(name, "Terminal.app");
            assert!(path.contains("Terminal.app"));
        }
    }

    #[test]
    fn test_resolve_terminal_with_invalid_id() {
        let result = resolve_terminal("nonexistent");
        assert!(result.is_none());
    }
}
