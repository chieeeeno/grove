use tauri::{Runtime, WebviewWindow};

/// テーマ文字列を `tauri::Theme` に変換する。
///
/// # Arguments
/// * `s` - `"dark"` または `"light"`
///
/// # Returns
/// * `Ok(tauri::Theme)` - 変換成功
/// * `Err(String)` - 不正な値の場合
///
/// # Errors
/// `s` が `"dark"` / `"light"` 以外の場合
fn parse_theme(s: &str) -> Result<tauri::Theme, String> {
    match s {
        "dark" => Ok(tauri::Theme::Dark),
        "light" => Ok(tauri::Theme::Light),
        other => Err(format!("不正なテーマ値です: {}", other)),
    }
}

/// macOS タイトルバーのテーマを同期する。
///
/// フロントエンドの `useTheme` フックが resolvedTheme を計算した後に呼び出し、
/// Web ビュー側の CSS テーマと OS ネイティブのウィンドウ装飾を一致させる。
///
/// # Arguments
/// * `window` - 対象のウィンドウハンドル（Tauri が DI する）
/// * `theme` - `"dark"` または `"light"`（resolved 済みの値）
///
/// # Returns
/// * `Ok(())` - テーマ設定成功
/// * `Err(String)` - 不正な theme 値、またはウィンドウ API 失敗時のエラーメッセージ
///
/// # Errors
/// - `theme` が `"dark"` / `"light"` 以外の場合
/// - Tauri の `set_theme()` API が失敗した場合
#[tauri::command]
pub fn set_window_theme<R: Runtime>(window: WebviewWindow<R>, theme: String) -> Result<(), String> {
    let tauri_theme = parse_theme(&theme)?;

    window
        .set_theme(Some(tauri_theme))
        .map_err(|e| format!("ウィンドウテーマの設定に失敗しました: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_theme_valid_values() {
        assert!(matches!(parse_theme("dark"), Ok(tauri::Theme::Dark)));
        assert!(matches!(parse_theme("light"), Ok(tauri::Theme::Light)));
    }

    #[test]
    fn test_parse_theme_invalid_values() {
        assert!(parse_theme("system").is_err());
        assert!(parse_theme("invalid").is_err());
        assert!(parse_theme("").is_err());
    }
}
