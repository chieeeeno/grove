use std::process::Command;
use std::sync::OnceLock;

const CODE_CANDIDATES: &[&str] = &[
    "/usr/local/bin/code",
    "/opt/homebrew/bin/code",
    "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
];

/// `code` コマンドの絶対パスのキャッシュ。プロセス寿命中は一度解決すれば十分。
///
/// ログインシェル起動（`zsh -l`）は rc ファイル読み込みで数十〜数百 ms かかるため、
/// `open_in_editor` 呼び出しのたびに再解決するとクリック→VS Code 起動までの
/// 体感遅延が悪化する。`check_code_command` と `open_in_editor` で同じキャッシュを共用する。
static CODE_PATH_CACHE: OnceLock<Option<String>> = OnceLock::new();

/// `code` コマンドの絶対パスを解決する（キャッシュなしの生処理）。
///
/// macOS の GUI 起動（Finder/Dock）では子プロセスの PATH が
/// `/usr/bin:/bin:/usr/sbin:/sbin` に限定され、VS Code のインストーラが配置する
/// `/usr/local/bin/code` も Homebrew 系の `/opt/homebrew/bin/code` も見つからない。
/// そのため (1) 既知パスを直接チェック → (2) ログインシェル経由で `command -v code`
/// の順で解決する。
fn resolve_code_path_uncached() -> Option<String> {
    if let Some(path) = super::pick_existing_path(CODE_CANDIDATES) {
        return Some(path);
    }

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

/// キャッシュ経由で `code` コマンドの絶対パスを取得する
fn resolved_code_path() -> Option<&'static str> {
    CODE_PATH_CACHE
        .get_or_init(resolve_code_path_uncached)
        .as_deref()
}

/// 指定パスを VS Code で開く（子プロセスとして `code <path>` を spawn）。
///
/// 親プロセス（Grove）は起動完了を待たず、spawn 直後にリターンする。
///
/// # Arguments
/// * `path` - 開く対象の絶対パス。ファイル・ディレクトリどちらでも OK
///   （`code` の引数仕様に従う）
///
/// # Returns
/// * `Ok(())` - spawn 成功時（VS Code 側の起動成否は保証しない）
/// * `Err(String)` - 日本語のエラーメッセージ
///
/// # 副作用
/// `CODE_PATH_CACHE` にキャッシュされた `code` バイナリを子プロセスとして spawn する。
///
/// # Errors
/// - `code` コマンドが解決できない場合: `"code コマンドが見つかりませんでした"`。
///   ADR-0012 に従いフロント側は `check_code_command` で事前確認してボタンを
///   無効化するため、通常はここに到達しない
/// - `Command::spawn` に失敗した場合（実行権限なし等）
#[tauri::command]
pub fn open_in_editor(path: String) -> Result<(), String> {
    let code =
        resolved_code_path().ok_or_else(|| "code コマンドが見つかりませんでした".to_string())?;
    Command::new(code)
        .arg(&path)
        .spawn()
        .map_err(|e| format!("VS Code を起動できませんでした: {}", e))?;
    Ok(())
}

/// `code` コマンドが利用可能かを返す（ADR-0012 の preflight 用）。
///
/// 初回呼び出しは `CODE_PATH_CACHE` 初期化で数十〜数百 ms かかる可能性がある
/// （既知パスが全て外れた場合のみ `zsh -l` を起動して解決するため）。2 回目以降は
/// キャッシュヒットで即返る。
///
/// # Returns
/// * `true` - `code` コマンドの絶対パスが解決できた場合
/// * `false` - 解決できなかった場合。フロントは上部バナー警告と関連ボタン無効化を表示する
#[tauri::command]
pub fn check_code_command() -> bool {
    resolved_code_path().is_some()
}
