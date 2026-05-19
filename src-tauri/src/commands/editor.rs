use std::process::Command;

use serde::{Deserialize, Serialize};

/// 検出済みエディタアプリ 1 件分の情報。フロントエンドへ JSON でシリアライズされる。
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct EditorApp {
    /// 識別子。`AppConfig.editor` に保存される値（例: `"vscode"`, `"zed"`）
    pub id: String,
    /// UI 表示名（例: `"VS Code"`, `"Zed"`）
    pub name: String,
    /// `.app` バンドルの絶対パス（例: `"/Applications/Zed.app"`）
    pub path: String,
}

/// 既知エディタアプリの候補定義。`(id, 表示名, パス候補リスト)` のタプルスライス。
///
/// `detect_installed_editors` は各候補のパスリストから最初に存在するものを採用する。
/// 新しいエディタを追加する場合は、フロントエンドの選択肢にも自動で追加される。
const KNOWN_EDITORS: &[(&str, &str, &[&str])] = &[
    (
        "vscode",
        "VS Code",
        &["/Applications/Visual Studio Code.app"],
    ),
    ("zed", "Zed", &["/Applications/Zed.app"]),
];

/// `KNOWN_EDITORS` から `id` に一致するエントリのパスを解決する。
///
/// # Arguments
/// * `editor_id` - 検索するエディタ識別子
///
/// # Returns
/// 一致するエントリが存在し、かつパスが実在する場合は `Some((表示名, パス))`。
/// 一致しない or パスが全て存在しない場合は `None`
fn resolve_editor(editor_id: &str) -> Option<(&'static str, String)> {
    KNOWN_EDITORS
        .iter()
        .find(|(id, _, _)| *id == editor_id)
        .and_then(|(_, name, candidates)| {
            super::pick_existing_path(candidates).map(|path| (*name, path))
        })
}

/// インストール済みの既知エディタアプリを検出して一覧を返す。
///
/// `KNOWN_EDITORS` の全候補を走査し、`.app` バンドルが実在するもののみ返す。
/// パス存在チェックは O(1) × 候補数で十分高速なため、キャッシュは行わない。
///
/// # Returns
/// 検出されたエディタアプリの `Vec<EditorApp>`。
/// 何もインストールされていなければ空ベクタを返す
#[tauri::command]
pub fn detect_installed_editors() -> Vec<EditorApp> {
    KNOWN_EDITORS
        .iter()
        .filter_map(|(id, name, candidates)| {
            super::pick_existing_path(candidates).map(|path| EditorApp {
                id: id.to_string(),
                name: name.to_string(),
                path,
            })
        })
        .collect()
}

/// 指定パスを選択中のエディタアプリで開く（`open -a <app_path> <path>` を spawn）。
///
/// 親プロセス（Grove）は起動完了を待たず、spawn 直後にリターンする。
///
/// # Arguments
/// * `path` - 開く対象の絶対パス（ファイル or ディレクトリ）
/// * `editor_id` - 使用するエディタアプリの識別子（`EditorApp::id`）
///
/// # Returns
/// * `Ok(())` - spawn 成功時（エディタ側の起動成否は保証しない）
/// * `Err(String)` - 日本語のエラーメッセージ
///
/// # Errors
/// - `editor_id` に対応するアプリが見つからない / パスが存在しない場合
/// - `Command::spawn` に失敗した場合（実行権限なし等）
///
/// # 副作用
/// 指定されたエディタアプリを `open -a` で spawn する
#[tauri::command]
pub fn open_in_editor(path: String, editor_id: String) -> Result<(), String> {
    let (name, app_path) = resolve_editor(&editor_id)
        .ok_or_else(|| format!("エディタが見つかりませんでした（ID: {}）", editor_id))?;
    Command::new("open")
        .args(["-a", &app_path, &path])
        .spawn()
        .map_err(|e| format!("{} を起動できませんでした: {}", name, e))?;
    Ok(())
}

/// 指定エディタが利用可能か（`.app` バンドルが存在するか）を返す。
///
/// ADR-0012 の preflight 用。アプリ起動時に選択中エディタについて 1 回呼び出し、
/// false ならフロント側がバナー警告 + ボタン無効化を表示する。
///
/// # Arguments
/// * `editor_id` - 確認するエディタ識別子（`AppConfig.editor` の値）
///
/// # Returns
/// * `true` - 指定エディタの `.app` バンドルが見つかった場合
/// * `false` - 見つからなかった、または未知の `editor_id` の場合
#[tauri::command]
pub fn check_editor_available(editor_id: String) -> bool {
    resolve_editor(&editor_id).is_some()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn test_known_editors_no_duplicate_ids() {
        let mut ids = HashSet::new();
        for (id, _, _) in KNOWN_EDITORS {
            assert!(ids.insert(*id), "重複した id: {}", id);
        }
    }

    #[test]
    fn test_known_editors_non_empty_paths() {
        for (id, _, candidates) in KNOWN_EDITORS {
            assert!(!candidates.is_empty(), "{} のパス候補が空です", id);
        }
    }

    #[test]
    fn test_known_editors_contains_vscode_and_zed() {
        // issue #66: VS Code と Zed の選択肢を提供する。後方互換のため id を固定する
        let ids: Vec<&str> = KNOWN_EDITORS.iter().map(|(id, _, _)| *id).collect();
        assert!(
            ids.contains(&"vscode"),
            "vscode が KNOWN_EDITORS にないべき"
        );
        assert!(ids.contains(&"zed"), "zed が KNOWN_EDITORS にないべき");
    }

    #[test]
    fn test_detect_installed_editors_returns_valid_structs() {
        let editors = detect_installed_editors();
        for e in &editors {
            assert!(!e.id.is_empty(), "id が空です");
            assert!(!e.name.is_empty(), "name が空です");
            assert!(!e.path.is_empty(), "path が空です");
            assert!(
                std::path::Path::new(&e.path).exists(),
                "{} のパス {} が存在しません",
                e.id,
                e.path
            );
        }
    }

    #[test]
    fn test_open_in_editor_invalid_id() {
        let result = open_in_editor("/tmp".to_string(), "nonexistent".to_string());
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("エディタが見つかりませんでした"));
    }

    #[test]
    fn test_resolve_editor_with_invalid_id() {
        let result = resolve_editor("nonexistent");
        assert!(result.is_none());
    }

    #[test]
    fn test_check_editor_available_returns_false_for_unknown_id() {
        assert!(!check_editor_available("nonexistent".to_string()));
        assert!(!check_editor_available(String::new()));
    }
}
