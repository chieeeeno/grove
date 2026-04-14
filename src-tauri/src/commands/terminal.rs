use std::path::Path;
use std::process::Command;
use std::sync::OnceLock;

const TERMINAL_CANDIDATES: &[&str] = &[
    "/System/Applications/Utilities/Terminal.app",
    "/Applications/Utilities/Terminal.app",
];

/// Terminal.app のパスのキャッシュ。プロセス寿命中は一度解決すれば十分。
static TERMINAL_PATH_CACHE: OnceLock<Option<String>> = OnceLock::new();

/// 候補パスのリストから最初に実在するパスを返す（テスト可能な純粋関数）。
///
/// # Arguments
/// * `candidates` - チェック対象のパス候補スライス
///
/// # Returns
/// 最初に存在が確認できたパスの `Some(String)`。全て存在しなければ `None`
fn pick_existing_path(candidates: &[&str]) -> Option<String> {
    candidates
        .iter()
        .find(|p| Path::new(p).exists())
        .map(|p| (*p).to_string())
}

/// Terminal.app のパスを解決する（キャッシュなしの生処理）。
///
/// macOS の標準インストール先 2 箇所を順にチェックする。
///
/// # Returns
/// Terminal.app が見つかった場合はそのパスの `Some(String)`、なければ `None`
fn resolve_terminal_path_uncached() -> Option<String> {
    pick_existing_path(TERMINAL_CANDIDATES)
}

/// キャッシュ経由で Terminal.app のパスを取得する。
///
/// # Returns
/// Terminal.app のパス。見つからなければ `None`
fn resolved_terminal_path() -> Option<&'static str> {
    TERMINAL_PATH_CACHE
        .get_or_init(resolve_terminal_path_uncached)
        .as_deref()
}

/// 指定パスを Terminal.app で開く（`open -a Terminal <path>` を spawn）。
///
/// 親プロセス（Grove）は起動完了を待たず、spawn 直後にリターンする。
///
/// # Arguments
/// * `path` - 開く対象の絶対パス（ディレクトリ）
///
/// # Returns
/// * `Ok(())` - spawn 成功時（Terminal.app 側の起動成否は保証しない）
/// * `Err(String)` - 日本語のエラーメッセージ
///
/// # 副作用
/// `TERMINAL_PATH_CACHE` にキャッシュされた Terminal.app を `open -a` で spawn する。
///
/// # Errors
/// - Terminal.app が解決できない場合: `"Terminal.app が見つかりませんでした"`。
///   ADR-0012 に従いフロント側は `check_terminal_app` で事前確認してボタンを
///   無効化するため、通常はここに到達しない
/// - `Command::spawn` に失敗した場合（実行権限なし等）
#[tauri::command]
pub fn open_in_terminal(path: String) -> Result<(), String> {
    let terminal = resolved_terminal_path()
        .ok_or_else(|| "Terminal.app が見つかりませんでした".to_string())?;
    Command::new("open")
        .args(["-a", terminal, &path])
        .spawn()
        .map_err(|e| format!("Terminal.app を起動できませんでした: {}", e))?;
    Ok(())
}

/// Terminal.app が利用可能かを返す（ADR-0012 の preflight 用）。
///
/// 初回呼び出しは `TERMINAL_PATH_CACHE` 初期化で候補パスの存在チェックを行う。
/// 2 回目以降はキャッシュヒットで即返る。
///
/// # Returns
/// * `true` - Terminal.app のパスが解決できた場合
/// * `false` - 解決できなかった場合。フロントは上部バナー警告と関連ボタン無効化を表示する
#[tauri::command]
pub fn check_terminal_app() -> bool {
    resolved_terminal_path().is_some()
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
