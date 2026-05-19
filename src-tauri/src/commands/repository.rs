use super::STORE_PATH;
use git2::{Cred, FetchOptions, RemoteCallbacks};
use serde::{Deserialize, Serialize};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Runtime};
use tauri_plugin_store::StoreExt;

/// `fetch_repository` 全体に対するタイムアウト。
///
/// libssh2 レイヤでハンドシェイクが blocking するケース（SSH Agent に鍵がない、
/// リモート不応答など）への保険。credentials callback からの Err が libgit2 に
/// 素直に伝播しないケースがあるため、timeout で強制打ち切りする。
const FETCH_TIMEOUT: Duration = Duration::from_secs(30);

const CONFIG_KEY: &str = "app_config";

// ===== 永続化モデル =====

/// tauri-plugin-store に永続化される、ユーザーが登録したリポジトリ 1 件分の設定。
///
/// フロントエンド（`src/types/index.ts` の `RepositoryConfig`）と JSON スキーマが
/// 一致する必要がある。フィールド名は `#[serde(rename)]` で camelCase に変換する。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RepositoryConfig {
    /// リポジトリ識別子。M0 では `path` と同値（`validate_repository` が
    /// そのまま返す）。M1 以降で UUID 化する可能性あり。
    pub id: String,
    /// サイドバーに表示するリポジトリ名。`validate_repository` では workdir の末尾
    /// ディレクトリ名から生成する。
    pub name: String,
    /// リポジトリの絶対パス（workdir ルート）。
    pub path: String,
    /// リポジトリ追加日時。ISO 8601 文字列（例: `"2026-04-10T00:00:00Z"`）。
    /// フロント側で生成してから `save_config` に渡すため、Rust 側では書式検証しない。
    #[serde(rename = "addedAt")]
    pub added_at: String,
}

/// アプリ全体の永続化設定。tauri-plugin-store の `STORE_PATH` にキー `"app_config"` で保存する。
///
/// フロントエンドの `AppConfig`（src/types/index.ts）と JSON 形式を共有する。
/// 部分更新 API は持たず、`save_config` は常に全置換。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    /// 登録済みリポジトリ一覧。順序はサイドバー表示順と一致する。
    pub repositories: Vec<RepositoryConfig>,
    /// 使用するエディタ識別子。`detect_installed_editors` が返す `EditorApp::id` の値
    /// （例: `"vscode"`, `"zed"`）。
    /// 既存ユーザーが保存した `"vscode"` 値はそのまま有効。空文字（既定値）の場合は
    /// フロント側で検出リストの先頭をフォールバックとして使用する。
    pub editor: String,
    /// UI テーマ。`"system"` / `"dark"` / `"light"` の 3 値（#16 で実装済み）。
    pub theme: String,
    /// worktree リフレッシュ間隔（ミリ秒）。ADR-0013 で既定 5000ms。
    #[serde(rename = "refreshInterval")]
    pub refresh_interval: u32,
    /// 選択中のターミナルアプリ識別子。`detect_installed_terminals` が返す `TerminalApp::id` の値。
    /// 空文字の場合は検出リストの先頭をフォールバックとして使用する。
    ///
    /// 既存ユーザーの store に `terminal` キーが無い場合でも `#[serde(default)]` により
    /// 空文字にフォールバックし、他フィールドのデシリアライズに影響しない。
    #[serde(default)]
    pub terminal: String,
    /// 前回終了時に選択していたリポジトリ ID。未設定・未保存の場合は `None`。
    ///
    /// 起動時に `repositories` リストに存在しない ID だった場合は先頭リポジトリを
    /// フォールバックとして使用する。既存ユーザーの store にキーが無い場合でも
    /// `#[serde(default)]` により `None` にフォールバックする。
    #[serde(default, rename = "selectedRepositoryId")]
    pub selected_repository_id: Option<String>,
}

impl Default for AppConfig {
    /// M0 の既定値（リポジトリ空、VS Code、system テーマ、5 秒ポーリング）を返す。
    fn default() -> Self {
        AppConfig {
            repositories: vec![],
            editor: "vscode".to_string(),
            theme: "system".to_string(),
            refresh_interval: 5000,
            terminal: String::new(),
            selected_repository_id: None,
        }
    }
}

// ===== コマンドの戻り値 =====

/// `validate_repository` コマンドの戻り値。
/// フロントエンドが `RepositoryConfig` を組み立てる際の素材として使う
/// （`addedAt` は呼び出し側で現在時刻から付与する）。
#[derive(Debug, Serialize, Deserialize)]
pub struct RepositoryInfo {
    /// 現状は `path` と同値。`RepositoryConfig::id` と同じ扱い。
    pub id: String,
    /// workdir ディレクトリの末尾名。取得失敗時は `"unknown"`。
    pub name: String,
    /// 検証に成功したリポジトリの絶対パス。
    pub path: String,
}

/// `fetch_repository` コマンドの戻り値。
///
/// リモートごとに fetch を試み、1 つでも成功すれば `Ok(FetchOutcome)` を返す。
/// 全 remote が失敗した場合のみエラーとして扱う（フロント側のエラーバナー表示用）。
#[derive(Debug, Serialize, Deserialize)]
pub struct FetchOutcome {
    /// fetch 完了時刻（Unix epoch 秒）。呼び出し側は「Last fetched: X 分前」表示に使う。
    #[serde(rename = "fetchedAt")]
    pub fetched_at: i64,
    /// リポジトリに設定されている remote の総数（fetch 対象の母数）。`0` の場合は
    /// リモート未設定（`failures` も空、`Err` ではなく `Ok` で返す）。
    #[serde(rename = "remoteCount")]
    pub remote_count: u32,
    /// 失敗した remote の情報。書式は `"<remote-name>: <理由>"`。
    /// 1 件以上の成功があれば `Ok` として返し、部分失敗はこのフィールドで通知する。
    pub failures: Vec<String>,
}

// ===== コマンド =====

/// 指定パスが開ける git リポジトリか検証し、表示用のメタ情報を返す。
///
/// 副作用なし（読み取りのみ）。
///
/// # Arguments
/// * `path` - 検証対象のローカル絶対パス。リポジトリの workdir ルートを想定する
///
/// # Returns
/// * `Ok(RepositoryInfo)` - `id` は M0 では `path` と同値、`name` は workdir の
///   末尾ディレクトリ名（取得失敗時は `"unknown"`）、`path` は引数そのまま
/// * `Err(String)` - 日本語のエラーメッセージ
///
/// # Errors
/// - 指定パスを git リポジトリとして開けない場合（存在しない / `.git` が無い / 権限不足等）
/// - bare リポジトリ（workdir を持たない）の場合: `"bare リポジトリは非対応です"`
#[tauri::command]
pub fn validate_repository(path: String) -> Result<RepositoryInfo, String> {
    let repo = git2::Repository::open(&path)
        .map_err(|e| format!("リポジトリを開けませんでした: {}", e))?;

    let workdir = repo
        .workdir()
        .ok_or_else(|| "bare リポジトリは非対応です".to_string())?;

    let name = workdir
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    Ok(RepositoryInfo {
        id: path.clone(),
        name,
        path,
    })
}

/// 単一リモートに対して fetch を実行する。
///
/// 認証は libgit2 の `RemoteCallbacks::credentials` で以下の通り設定する。
/// - `SSH_KEY`: `ssh_key_from_agent` に委譲。失敗時は即 Err（fall-through しない）
/// - `USER_PASS_PLAINTEXT` / `DEFAULT`: `credential_helper`（macOS Keychain 等）
/// - `USERNAME`: `Cred::username`（サーバが username を要求する初期ネゴシエーション用）
///
/// 該当 credential type が要求されたら 1 回だけ試し、失敗したら即 Err を返す。
/// fall-through 形式にすると libssh2 レイヤに進んでハンドシェイクで blocking する
/// ケースがあるため、早期失敗を libgit2 に伝えるのが狙い。対話的プロンプトは出さない。
fn fetch_one_remote(repo: &git2::Repository, remote_name: &str) -> Result<(), git2::Error> {
    let mut remote = repo.find_remote(remote_name)?;

    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(|url, username_from_url, allowed_types| {
        if allowed_types.contains(git2::CredentialType::SSH_KEY) {
            let user = username_from_url.unwrap_or("git");
            // エラー時はフロントのトーストでそのまま表示できる具体的メッセージに差し替える
            return Cred::ssh_key_from_agent(user).map_err(|_| {
                git2::Error::from_str(
                    "SSH Agent に鍵が登録されていません（ssh-add で登録してください）",
                )
            });
        }
        if allowed_types.contains(git2::CredentialType::USER_PASS_PLAINTEXT)
            || allowed_types.contains(git2::CredentialType::DEFAULT)
        {
            let config = git2::Config::open_default()?;
            return Cred::credential_helper(&config, url, username_from_url);
        }
        if allowed_types.contains(git2::CredentialType::USERNAME) {
            let user = username_from_url.unwrap_or("git");
            return Cred::username(user);
        }
        Err(git2::Error::from_str(
            "利用可能な認証情報がありません（SSH Agent / Keychain を確認してください）",
        ))
    });

    let mut fetch_opts = FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);

    // refspec 空配列 → remote の既定 refspec（fetch = ...）を使う
    remote.fetch::<&str>(&[], Some(&mut fetch_opts), None)?;
    Ok(())
}

/// Unix epoch 秒を取得する（時計異常時のフォールバックは `0`）。
fn now_unix_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// リポジトリに設定された全リモートに対して fetch を実行する。
///
/// 長時間ブロックする可能性があるため `spawn_blocking` で別スレッドへ逃がし、
/// さらに [`FETCH_TIMEOUT`] でラップして hang を防ぐ。認証は [`fetch_one_remote`]
/// のフォールバック順に従い、対話的プロンプトは出さない。
///
/// # Arguments
/// * `repository_path` - 対象リポジトリの絶対パス
///
/// # Returns
/// * `Ok(FetchOutcome)` - 1 つでも成功、または remote 0 件の場合。部分失敗は
///   `FetchOutcome::failures` で通知する
/// * `Err(String)` - リポジトリを開けない、全 remote が失敗、またはタイムアウトの場合
///
/// # Errors
/// - `repository_path` を `Repository::open` できない
/// - `remotes()` 呼び出しの失敗
/// - 全 remote の fetch が失敗（日本語のエラーメッセージで詳細を返す）
/// - [`FETCH_TIMEOUT`]（30 秒）を超過した場合: "fetch がタイムアウトしました ..."
///
/// # 副作用
/// 各 remote の `refs/remotes/<remote>/*` を更新する。ネットワーク通信を伴う。
/// タイムアウト発動時、`spawn_blocking` 内の libgit2 処理は中断できないため
/// バックグラウンドスレッドとして応答が返るまで残る（実害なしと判断）。
#[tauri::command]
pub async fn fetch_repository(repository_path: String) -> Result<FetchOutcome, String> {
    let handle =
        tauri::async_runtime::spawn_blocking(move || fetch_repository_inner(&repository_path));
    match tokio::time::timeout(FETCH_TIMEOUT, handle).await {
        Ok(Ok(result)) => result,
        Ok(Err(join_err)) => Err(format!("タスク実行に失敗しました: {}", join_err)),
        Err(_) => Err(format!(
            "fetch がタイムアウトしました ({} 秒)。ネットワークまたは認証設定を確認してください",
            FETCH_TIMEOUT.as_secs()
        )),
    }
}

fn fetch_repository_inner(repository_path: &str) -> Result<FetchOutcome, String> {
    let repo = git2::Repository::open(repository_path)
        .map_err(|e| format!("リポジトリを開けませんでした: {}", e))?;

    let remotes = repo
        .remotes()
        .map_err(|e| format!("リモート一覧の取得に失敗しました: {}", e))?;

    let remote_names: Vec<String> = remotes.iter().flatten().map(|s| s.to_string()).collect();
    let remote_count = remote_names.len() as u32;

    let mut failures: Vec<String> = Vec::new();
    for name in &remote_names {
        if let Err(e) = fetch_one_remote(&repo, name) {
            failures.push(format!("{}: {}", name, e));
        }
    }

    let all_failed = remote_count > 0 && failures.len() as u32 == remote_count;
    if all_failed {
        return Err(format!(
            "すべての fetch に失敗しました: {}",
            failures.join(", ")
        ));
    }

    Ok(FetchOutcome {
        fetched_at: now_unix_seconds(),
        remote_count,
        failures,
    })
}

/// tauri-plugin-store から `AppConfig` を読み込む。
///
/// 初回起動時でも Ok を返す（フォールバック値付き）。
///
/// # Arguments
/// * `app` - Tauri ランタイムの AppHandle（MockRuntime でもテスト可能なように generics 化）
///
/// # Returns
/// * `Ok(AppConfig)` - store にキー `"app_config"` があればそれを、無い or JSON
///   デシリアライズ失敗時は `AppConfig::default()`（ADR-0013 の既定値）を返す
/// * `Err(String)` - 日本語のエラーメッセージ
///
/// # Errors
/// tauri-plugin-store のハンドル取得に失敗した場合のみ（ディスク障害等）。
#[tauri::command]
pub fn load_config<R: Runtime>(app: AppHandle<R>) -> Result<AppConfig, String> {
    let store = app
        .store(STORE_PATH)
        .map_err(|e| format!("ストアを開けませんでした: {}", e))?;

    let config: AppConfig = store
        .get(CONFIG_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    Ok(config)
}

/// `AppConfig` を tauri-plugin-store に **全置換** で保存する（差分更新ではない）。
///
/// 部分更新したい場合は呼び出し側で現在の state とマージしてから渡すこと
/// （フロント側は `App.tsx` の `buildConfigFromStore()` がその役割）。
///
/// # Arguments
/// * `app` - Tauri ランタイムの AppHandle
/// * `config` - 保存する `AppConfig` の完全な状態
///
/// # Returns
/// * `Ok(())` - 保存成功（`store.save()` で同期的にディスクへ flush 済み）
/// * `Err(String)` - 日本語のエラーメッセージ
///
/// # 副作用
/// `STORE_PATH`（例: `~/Library/Application Support/<app id>/grove_config.json`）
/// を書き換え、同期的にディスクへ永続化する。
///
/// # Errors
/// - store ハンドルの取得失敗
/// - `serde_json::to_value` のシリアライズ失敗（現実的には発生しない）
/// - `store.save()` のディスク書き込み失敗
#[tauri::command]
pub fn save_config<R: Runtime>(app: AppHandle<R>, config: AppConfig) -> Result<(), String> {
    let store = app
        .store(STORE_PATH)
        .map_err(|e| format!("ストアを開けませんでした: {}", e))?;

    let value = serde_json::to_value(&config).map_err(|e| format!("シリアライズ失敗: {}", e))?;

    store.set(CONFIG_KEY, value);
    store
        .save()
        .map_err(|e| format!("設定の保存に失敗しました: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::test::{mock_builder, mock_context, noop_assets};
    use tempfile::TempDir;

    /// MockRuntime で tauri-plugin-store 込みのテスト用アプリを作る
    ///
    /// tauri-plugin-store はメモリキャッシュを持つため、テスト間で state が共有される。
    /// 各テストは最初に既存のストアをクリアして独立性を確保する必要がある。
    fn build_mock_app() -> tauri::App<tauri::test::MockRuntime> {
        let app = mock_builder()
            .plugin(tauri_plugin_store::Builder::default().build())
            .build(mock_context(noop_assets()))
            .expect("mock app のビルドに失敗");

        // ストアをクリア（他テストからの state 持ち越しを防ぐ）
        if let Ok(store) = app.handle().store(STORE_PATH) {
            store.clear();
            let _ = store.save();
        }

        app
    }

    #[test]
    fn test_validate_repository_with_invalid_path() {
        // git でないパスを渡した場合はエラー
        let result = validate_repository("/tmp/definitely-not-a-repo-xyz123".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn test_app_config_default() {
        let config = AppConfig::default();
        assert_eq!(config.editor, "vscode");
        assert_eq!(config.theme, "system");
        assert_eq!(config.refresh_interval, 5000);
        assert!(config.terminal.is_empty());
        assert!(config.repositories.is_empty());
        assert!(
            config.selected_repository_id.is_none(),
            "selected_repository_id のデフォルトは None であるべき"
        );
    }

    #[test]
    fn test_load_config_initial_state() {
        // MockRuntime 上で load_config を呼んで、デフォルト値が返ることを検証
        let app = build_mock_app();
        let handle = app.handle().clone();

        let result = load_config(handle);
        assert!(result.is_ok(), "load_config がエラー: {:?}", result);

        let config = result.unwrap();
        assert_eq!(config.editor, "vscode");
        assert_eq!(config.theme, "system");
        assert_eq!(config.refresh_interval, 5000);
        assert!(config.terminal.is_empty());
        assert!(config.repositories.is_empty());
        assert!(
            config.selected_repository_id.is_none(),
            "load_config の初期状態で selected_repository_id は None であるべき"
        );
    }

    #[test]
    fn test_save_then_load_config() {
        // save_config → load_config で往復できることを検証
        let app = build_mock_app();
        let handle = app.handle().clone();

        let config = AppConfig {
            repositories: vec![RepositoryConfig {
                id: "repo-1".to_string(),
                name: "test-repo".to_string(),
                path: "/mock/test-repo".to_string(),
                added_at: "2026-04-10T00:00:00Z".to_string(),
            }],
            editor: "vscode".to_string(),
            theme: "dark".to_string(),
            refresh_interval: 10000,
            terminal: "ghostty".to_string(),
            selected_repository_id: Some("repo-1".to_string()),
        };

        // 保存
        let save_result = save_config(handle.clone(), config.clone());
        assert!(
            save_result.is_ok(),
            "save_config がエラー: {:?}",
            save_result
        );

        // 読み込みで同じ内容が返る
        let loaded = load_config(handle).unwrap();
        assert_eq!(loaded.theme, "dark");
        assert_eq!(loaded.refresh_interval, 10000);
        assert_eq!(loaded.terminal, "ghostty");
        assert_eq!(loaded.repositories.len(), 1);
        assert_eq!(loaded.repositories[0].name, "test-repo");
        assert_eq!(
            loaded.selected_repository_id,
            Some("repo-1".to_string()),
            "selected_repository_id が保存・復元されるべき"
        );
    }

    #[test]
    fn test_load_config_missing_terminal_field() {
        // terminal フィールドが無い JSON でも他フィールドが正常にデシリアライズされることを検証
        // （既存ユーザーの store に terminal が無いケースの後方互換テスト）
        let json = serde_json::json!({
            "repositories": [],
            "editor": "vscode",
            "theme": "light",
            "refreshInterval": 3000
        });
        let config: AppConfig = serde_json::from_value(json).expect("デシリアライズに失敗");
        assert_eq!(config.theme, "light");
        assert_eq!(config.refresh_interval, 3000);
        assert!(
            config.terminal.is_empty(),
            "terminal は空文字にフォールバックすべき"
        );
    }

    #[test]
    fn test_fetch_repository_noop_when_no_remotes() {
        let dir = TempDir::new().unwrap();
        git2::Repository::init(dir.path()).unwrap();
        let path = dir.path().to_str().unwrap().to_string();

        let outcome = fetch_repository_inner(&path).expect("remote 0 件は Ok を返すべき");
        assert_eq!(outcome.remote_count, 0);
        assert!(outcome.failures.is_empty());
        assert!(outcome.fetched_at > 0);
    }

    #[test]
    fn test_fetch_repository_fails_for_invalid_remote_url() {
        // 存在しないローカルパスを remote として設定したリポジトリで fetch すると、
        // 唯一の remote が失敗 → 全失敗扱いで Err が返る
        let dir = TempDir::new().unwrap();
        let repo = git2::Repository::init(dir.path()).unwrap();
        let path = dir.path().to_str().unwrap().to_string();

        repo.remote("origin", "/tmp/grove-nonexistent-repo-xyz-12345")
            .unwrap();
        drop(repo);

        let err = fetch_repository_inner(&path).expect_err("全 remote 失敗時は Err のはず");
        assert!(
            err.contains("origin"),
            "エラーメッセージに remote 名が含まれるべき: {}",
            err
        );
    }

    #[test]
    fn test_fetch_repository_returns_err_when_path_is_not_repo() {
        let err = fetch_repository_inner("/tmp/grove-definitely-not-a-repo-xyz")
            .expect_err("非リポジトリは Err を返すべき");
        assert!(err.contains("リポジトリ"));
    }

    #[test]
    fn test_load_config_missing_selected_repository_id_field() {
        // selectedRepositoryId フィールドが無い JSON でも他フィールドが正常にデシリアライズされることを検証
        // （既存ユーザーの store に selectedRepositoryId が無いケースの後方互換テスト）
        let json = serde_json::json!({
            "repositories": [],
            "editor": "vscode",
            "theme": "system",
            "refreshInterval": 5000,
            "terminal": ""
        });
        let config: AppConfig = serde_json::from_value(json).expect("デシリアライズに失敗");
        assert_eq!(config.theme, "system");
        assert!(
            config.selected_repository_id.is_none(),
            "selectedRepositoryId が無い場合は None にフォールバックすべき"
        );
    }
}
