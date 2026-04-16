use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, SubmenuBuilder},
    App, Runtime,
};

/// カスタムメニュー項目の ID。`on_menu_event` のマッチで使う。
pub const MENU_ID_REFRESH: &str = "refresh";
pub const MENU_ID_SETTINGS: &str = "settings";

/// リポジトリ選択メニュー項目の ID プレフィックス。
/// 末尾に 0-origin のインデックス（0-8）を付与して 9 個の項目 ID を生成する
/// （例: "repo-select-0" …「1 番目のリポジトリ」）。
/// `on_menu_event` では [`parse_repo_select_id`] でこのプレフィックスをマッチする。
pub const MENU_ID_REPO_SELECT_PREFIX: &str = "repo-select-";

/// リポジトリ選択可能な最大数（Cmd+1〜Cmd+9 に対応する 9 項目）。
pub const REPO_SELECT_MENU_ITEM_COUNT: u32 = 9;

/// Rust → フロントエンドに emit するイベント名。
/// フロントエンド側の `listen()` と一致させる必要がある。
pub const EVENT_MENU_REFRESH: &str = "menu-refresh";
pub const EVENT_MENU_SETTINGS: &str = "menu-settings";

/// リポジトリ切り替え通知イベント。ペイロードに 0-origin のインデックス（`u32`、0〜8）を載せる。
/// フロントエンド側で `repositories[index]` を選択する。
pub const EVENT_MENU_SELECT_REPOSITORY: &str = "menu-select-repository";

/// メニュー項目 ID から [`MENU_ID_REPO_SELECT_PREFIX`] を剥がして
/// 0-origin のインデックスを取り出す。
///
/// # Arguments
/// * `id` - `on_menu_event` が受け取った項目 ID 文字列
///
/// # Returns
/// * プレフィックスに合致し、かつ `0..REPO_SELECT_MENU_ITEM_COUNT` の範囲内なら `Some(index)`
/// * プレフィックス不一致 / 数値パース失敗 / 範囲外 の場合は `None`
pub fn parse_repo_select_id(id: &str) -> Option<u32> {
    id.strip_prefix(MENU_ID_REPO_SELECT_PREFIX)
        .and_then(|s| s.parse::<u32>().ok())
        .filter(|&i| i < REPO_SELECT_MENU_ITEM_COUNT)
}

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
/// - **リポジトリ**: 1〜9 番目のリポジトリ切り替え（Cmd+1〜Cmd+9）
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
            MENU_ID_SETTINGS,
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
            MENU_ID_REFRESH,
            "再読み込み",
            true,
            Some("CmdOrCtrl+R"),
        )?)
        .build()?;

    // --- リポジトリ（Cmd+1〜Cmd+9 で番号順に切り替え） ---
    // ラベルは「N 番目のリポジトリ」固定。実リポジトリ名の動的反映は Menu 再構築が必要で
    // 今回スコープ外。リポジトリ数 < 9 の場合でも 9 項目すべて enabled のまま置き、
    // フロントエンド側で範囲外インデックスを no-op として扱う。
    let mut repo_builder = SubmenuBuilder::new(app, "リポジトリ");
    for i in 0..REPO_SELECT_MENU_ITEM_COUNT {
        let id = format!("{}{}", MENU_ID_REPO_SELECT_PREFIX, i);
        let label = format!("{} 番目のリポジトリ", i + 1);
        let accelerator = format!("CmdOrCtrl+{}", i + 1);
        let item = MenuItem::with_id(app, &id, &label, true, Some(&accelerator))?;
        repo_builder = repo_builder.item(&item);
    }
    let repo_submenu = repo_builder.build()?;

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
        &[
            &app_submenu,
            &view_submenu,
            &repo_submenu,
            &edit_submenu,
            &window_submenu,
        ],
    )
}

// メニュー構築テストについて:
// macOS の muda クレートはメインスレッドでのみ MenuChild を生成できるため、
// `cargo test` のワーカースレッドではパニックする。
// `build_menu` は分岐のない宣言的コードなので、コンパイルチェック +
// `pnpm tauri dev` での手動確認で品質を担保する。
// 一方、メニュー項目 ID の解析ロジック (`parse_repo_select_id`) は純粋関数のため
// 下記の `tests` モジュールでユニットテストする。

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_repo_select_id_valid_min() {
        assert_eq!(parse_repo_select_id("repo-select-0"), Some(0));
    }

    #[test]
    fn parse_repo_select_id_valid_max() {
        assert_eq!(parse_repo_select_id("repo-select-8"), Some(8));
    }

    #[test]
    fn parse_repo_select_id_out_of_range() {
        // 9 以上は範囲外
        assert_eq!(parse_repo_select_id("repo-select-9"), None);
        assert_eq!(parse_repo_select_id("repo-select-100"), None);
    }

    #[test]
    fn parse_repo_select_id_missing_number() {
        assert_eq!(parse_repo_select_id("repo-select-"), None);
    }

    #[test]
    fn parse_repo_select_id_other_menu_id() {
        // 無関係なメニュー項目 ID はプレフィックスにマッチしない
        assert_eq!(parse_repo_select_id("refresh"), None);
        assert_eq!(parse_repo_select_id("settings"), None);
    }

    #[test]
    fn parse_repo_select_id_non_numeric_suffix() {
        assert_eq!(parse_repo_select_id("repo-select-abc"), None);
    }
}
