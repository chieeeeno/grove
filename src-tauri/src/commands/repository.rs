use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};
use tauri_plugin_store::StoreExt;

const STORE_PATH: &str = "grove_config.json";
const CONFIG_KEY: &str = "app_config";

// ===== 永続化モデル =====

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RepositoryConfig {
    pub id: String,
    pub name: String,
    pub path: String,
    #[serde(rename = "addedAt")]
    pub added_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub repositories: Vec<RepositoryConfig>,
    pub editor: String,
    pub theme: String,
    #[serde(rename = "refreshInterval")]
    pub refresh_interval: u32,
}

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig {
            repositories: vec![],
            editor: "vscode".to_string(),
            theme: "system".to_string(),
            refresh_interval: 5000,
        }
    }
}

// ===== コマンドの戻り値 =====

#[derive(Debug, Serialize, Deserialize)]
pub struct RepositoryInfo {
    pub id: String,
    pub name: String,
    pub path: String,
}

// ===== コマンド =====

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
        assert_eq!(loaded.repositories.len(), 1);
        assert_eq!(loaded.repositories[0].name, "test-repo");
    }
}
