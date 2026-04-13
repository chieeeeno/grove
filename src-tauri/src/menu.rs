use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, SubmenuBuilder},
    App, Runtime,
};

/// アプリケーションのカスタムメニューバーを構築する。
///
/// Grove は日本語のみの UI（ADR-0009）のため、全メニュー項目を日本語ラベルで定義する。
/// macOS 標準のショートカットキー（Cmd+Q, Cmd+H 等）はそのまま維持する。
///
/// # Arguments
/// * `app` - Tauri の `App` ハンドル。メニュー項目の生成に必要
///
/// # Returns
/// * `Ok(Menu<R>)` - 構築済みメニュー
/// * `Err(tauri::Error)` - メニュー項目の構築に失敗した場合
///
/// # メニュー構成
/// - **Grove**: アプリメニュー（About, 設定, 隠す, 終了）
/// - **表示**: 再読み込み（Cmd+R）
/// - **編集**: クリップボード操作（macOS WebView で必須）
/// - **ウィンドウ**: 最小化, 拡大/縮小, 閉じる
pub fn build_menu<R: Runtime>(app: &App<R>) -> tauri::Result<Menu<R>> {
    // --- Grove（アプリメニュー） ---
    let app_submenu = SubmenuBuilder::new(app, "Grove")
        .item(&PredefinedMenuItem::about(
            app,
            Some("Grove について"),
            None,
        )?)
        .separator()
        .item(&MenuItem::with_id(
            app,
            "settings",
            "設定...",
            true,
            Some("CmdOrCtrl+,"),
        )?)
        .separator()
        .item(&PredefinedMenuItem::hide(app, Some("Grove を隠す"))?)
        .item(&PredefinedMenuItem::hide_others(app, Some("ほかを隠す"))?)
        .item(&PredefinedMenuItem::show_all(app, Some("すべてを表示"))?)
        .separator()
        .item(&PredefinedMenuItem::quit(app, Some("Grove を終了"))?)
        .build()?;

    // --- 表示 ---
    let view_submenu = SubmenuBuilder::new(app, "表示")
        .item(&MenuItem::with_id(
            app,
            "refresh",
            "再読み込み",
            true,
            Some("CmdOrCtrl+R"),
        )?)
        .build()?;

    // --- 編集（macOS WebView のクリップボード操作に必須） ---
    let edit_submenu = SubmenuBuilder::new(app, "編集")
        .item(&PredefinedMenuItem::cut(app, Some("切り取り"))?)
        .item(&PredefinedMenuItem::copy(app, Some("コピー"))?)
        .item(&PredefinedMenuItem::paste(app, Some("貼り付け"))?)
        .separator()
        .item(&PredefinedMenuItem::select_all(app, Some("すべてを選択"))?)
        .build()?;

    // --- ウィンドウ ---
    let window_submenu = SubmenuBuilder::new(app, "ウィンドウ")
        .item(&PredefinedMenuItem::minimize(app, Some("最小化"))?)
        .item(&PredefinedMenuItem::maximize(app, Some("拡大/縮小"))?)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, Some("閉じる"))?)
        .build()?;

    Menu::with_items(
        app,
        &[&app_submenu, &view_submenu, &edit_submenu, &window_submenu],
    )
}

// メニュー構築テストについて:
// macOS の muda クレートはメインスレッドでのみ MenuChild を生成できるため、
// `cargo test` のワーカースレッドではパニックする。
// `build_menu` は分岐のない宣言的コードなので、コンパイルチェック +
// `pnpm tauri dev` での手動確認で品質を担保する。
