use std::path::Path;
use std::process::Command;

const CODE_CANDIDATES: &[&str] = &[
    "/usr/local/bin/code",
    "/opt/homebrew/bin/code",
    "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
];

/// 候補パスのリストから最初に実在するパスを返す（テスト可能な純粋関数）
fn pick_existing_path(candidates: &[&str]) -> Option<String> {
    candidates
        .iter()
        .find(|p| Path::new(p).exists())
        .map(|p| (*p).to_string())
}

/// `code` コマンドの絶対パスを解決する。
///
/// macOS の GUI 起動（Finder/Dock）では子プロセスの PATH が
/// `/usr/bin:/bin:/usr/sbin:/sbin` に限定され、VS Code のインストーラが配置する
/// `/usr/local/bin/code` も Homebrew 系の `/opt/homebrew/bin/code` も見つからない。
/// そのため (1) 既知パスを直接チェック → (2) ログインシェル経由で `command -v code`
/// の順で解決する。
fn resolve_code_path() -> Option<String> {
    // (1) 既知の候補パスを直接確認（シェル起動より高速）
    if let Some(path) = pick_existing_path(CODE_CANDIDATES) {
        return Some(path);
    }

    // (2) ログインシェル経由でユーザーの PATH を使って解決する
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let output = Command::new(&shell)
        .args(["-l", "-c", "command -v code"])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let resolved = String::from_utf8(output.stdout).ok()?.trim().to_string();
    if resolved.is_empty() {
        None
    } else {
        Some(resolved)
    }
}

#[tauri::command]
pub fn open_in_editor(path: String) -> Result<(), String> {
    let code =
        resolve_code_path().ok_or_else(|| "code コマンドが見つかりませんでした".to_string())?;
    Command::new(code)
        .arg(&path)
        .spawn()
        .map_err(|e| format!("VS Code を起動できませんでした: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn check_code_command() -> bool {
    resolve_code_path().is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pick_existing_path_returns_first_existing() {
        // 1 つ目が存在しない架空パス、2 つ目が必ず存在する /bin/sh、3 つ目も存在する /usr/bin/env
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
