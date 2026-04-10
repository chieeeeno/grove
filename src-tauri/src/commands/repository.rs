use serde::{Deserialize, Serialize};
use tauri::AppHandle;
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
pub fn load_config(app: AppHandle) -> Result<AppConfig, String> {
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
pub fn save_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
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
