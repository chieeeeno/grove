use tauri::{Runtime, WebviewWindow};

/// テーマ文字列を `Option<tauri::Theme>` に変換する。
///
/// `"system"` は `None` を返し、OS テーマへの追従を意味する。
/// `"dark"` / `"light"` はそれぞれ固定テーマに対応する。
///
/// # Arguments
/// * `s` - `"system"` / `"dark"` / `"light"` のいずれか
///
/// # Returns
/// * `Ok(None)` - OS 追従（`"system"`）
/// * `Ok(Some(tauri::Theme))` - 固定テーマ
/// * `Err(String)` - 不正な値の場合
///
/// # Errors
/// `s` が上記 3 値以外の場合
fn parse_theme(s: &str) -> Result<Option<tauri::Theme>, String> {
    match s {
        "system" => Ok(None),
        "dark" => Ok(Some(tauri::Theme::Dark)),
        "light" => Ok(Some(tauri::Theme::Light)),
        other => Err(format!("不正なテーマ値です: {}", other)),
    }
}

/// ウィンドウテーマを設定する。
///
/// `"system"` を受け取ると `set_theme(None)` を呼び、OS のテーマに追従させる。
/// これにより WebView 内の `prefers-color-scheme` メディアクエリが OS 設定を反映する。
/// `"dark"` / `"light"` を受け取ると固定テーマに設定する。
///
/// # Arguments
/// * `window` - 対象のウィンドウハンドル（Tauri が DI する）
/// * `theme` - `"system"` / `"dark"` / `"light"`
///
/// # Returns
/// * `Ok(())` - テーマ設定成功
/// * `Err(String)` - 不正な theme 値、またはウィンドウ API 失敗時のエラーメッセージ
///
/// # Errors
/// - `theme` が `"system"` / `"dark"` / `"light"` 以外の場合
/// - Tauri の `set_theme()` API が失敗した場合
#[tauri::command]
pub fn set_window_theme<R: Runtime>(window: WebviewWindow<R>, theme: String) -> Result<(), String> {
    let tauri_theme = parse_theme(&theme)?;

    window
        .set_theme(tauri_theme)
        .map_err(|e| format!("ウィンドウテーマの設定に失敗しました: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_theme_valid_values() {
        assert!(matches!(parse_theme("system"), Ok(None)));
        assert!(matches!(parse_theme("dark"), Ok(Some(tauri::Theme::Dark))));
        assert!(matches!(
            parse_theme("light"),
            Ok(Some(tauri::Theme::Light))
        ));
    }

    #[test]
    fn test_parse_theme_invalid_values() {
        assert!(parse_theme("invalid").is_err());
        assert!(parse_theme("").is_err());
    }
}
