use std::collections::HashMap;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_PATH: &str = "grove_config.json";
const LABELS_KEY: &str = "worktree_labels";

/// ラベル一覧を読み込む（キー: worktree 絶対パス、値: ラベル文字列）
#[tauri::command]
pub fn load_labels(app: AppHandle) -> Result<HashMap<String, String>, String> {
    let store = app
        .store(STORE_PATH)
        .map_err(|e| format!("ストアを開けませんでした: {}", e))?;

    let labels: HashMap<String, String> = store
        .get(LABELS_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    Ok(labels)
}

/// ラベルを保存する（ADR-0008: worktree 絶対パスをキー）
#[tauri::command]
pub fn save_label(app: AppHandle, worktree_path: String, label: String) -> Result<(), String> {
    let store = app
        .store(STORE_PATH)
        .map_err(|e| format!("ストアを開けませんでした: {}", e))?;

    let mut labels: HashMap<String, String> = store
        .get(LABELS_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    labels.insert(worktree_path, label);

    let value = serde_json::to_value(&labels).map_err(|e| format!("シリアライズ失敗: {}", e))?;
    store.set(LABELS_KEY, value);
    store
        .save()
        .map_err(|e| format!("ラベルの保存に失敗しました: {}", e))?;

    Ok(())
}

/// ラベルを削除する（worktree 削除時に連動）
#[tauri::command]
pub fn delete_label(app: AppHandle, worktree_path: String) -> Result<(), String> {
    let store = app
        .store(STORE_PATH)
        .map_err(|e| format!("ストアを開けませんでした: {}", e))?;

    let mut labels: HashMap<String, String> = store
        .get(LABELS_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    labels.remove(&worktree_path);

    let value = serde_json::to_value(&labels).map_err(|e| format!("シリアライズ失敗: {}", e))?;
    store.set(LABELS_KEY, value);
    store
        .save()
        .map_err(|e| format!("ラベルの削除に失敗しました: {}", e))?;

    Ok(())
}
