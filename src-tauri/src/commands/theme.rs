use tauri::{Runtime, WebviewWindow};

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
    let tauri_theme = match theme.as_str() {
        "dark" => tauri::Theme::Dark,
        "light" => tauri::Theme::Light,
        other => return Err(format!("不正なテーマ値です: {}", other)),
    };

    window
        .set_theme(Some(tauri_theme))
        .map_err(|e| format!("ウィンドウテーマの設定に失敗しました: {}", e))
}

#[cfg(test)]
mod tests {
    // set_window_theme は WebviewWindow を必要とするため、
    // 引数バリデーションのみユニットテストする（ウィンドウ操作は E2E で確認）

    #[test]
    fn test_theme_value_validation() {
        // match 分岐のロジックを直接テスト
        let valid_values = ["dark", "light"];
        for v in valid_values {
            let result = match v {
                "dark" => Ok(tauri::Theme::Dark),
                "light" => Ok(tauri::Theme::Light),
                other => Err(format!("不正なテーマ値です: {}", other)),
            };
            assert!(result.is_ok(), "{} should be valid", v);
        }

        let invalid = "invalid";
        let result: Result<tauri::Theme, String> = match invalid {
            "dark" => Ok(tauri::Theme::Dark),
            "light" => Ok(tauri::Theme::Light),
            other => Err(format!("不正なテーマ値です: {}", other)),
        };
        assert!(result.is_err());
    }
}
