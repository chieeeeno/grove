use super::STORE_PATH;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};
use tauri_plugin_store::StoreExt;

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
    /// 使用するエディタ識別子。M0 では `"vscode"` のみサポート。
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
        assert!(config.terminal.is_empty(), "terminal は空文字にフォールバックすべき");
    }
}
