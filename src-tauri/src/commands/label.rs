use super::STORE_PATH;
use std::collections::HashMap;
use tauri::{AppHandle, Runtime};
use tauri_plugin_store::StoreExt;

const LABELS_KEY: &str = "worktree_labels";

/// store からラベル一覧を読み込む（内部ヘルパー）
fn read_labels<R: Runtime>(app: &AppHandle<R>) -> Result<HashMap<String, String>, String> {
    let store = app
        .store(STORE_PATH)
        .map_err(|e| format!("ストアを開けませんでした: {}", e))?;

    Ok(store
        .get(LABELS_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default())
}

/// ラベル一覧を mutate して store に書き戻す（内部ヘルパー）
///
/// 失敗時のエラーメッセージは呼び出し側で上書きできるように context で受け取る。
fn update_labels<R: Runtime>(
    app: &AppHandle<R>,
    context: &str,
    mutator: impl FnOnce(&mut HashMap<String, String>),
) -> Result<(), String> {
    let store = app
        .store(STORE_PATH)
        .map_err(|e| format!("ストアを開けませんでした: {}", e))?;

    let mut labels: HashMap<String, String> = store
        .get(LABELS_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    mutator(&mut labels);

    let value = serde_json::to_value(&labels).map_err(|e| format!("シリアライズ失敗: {}", e))?;
    store.set(LABELS_KEY, value);
    store.save().map_err(|e| format!("{}: {}", context, e))?;

    Ok(())
}

/// ラベル一覧を読み込む（キー: worktree 絶対パス、値: ラベル文字列）
#[tauri::command]
pub fn load_labels<R: Runtime>(app: AppHandle<R>) -> Result<HashMap<String, String>, String> {
    read_labels(&app)
}

/// ラベルを保存する（ADR-0008: worktree 絶対パスをキー）
#[tauri::command]
pub fn save_label<R: Runtime>(
    app: AppHandle<R>,
    worktree_path: String,
    label: String,
) -> Result<(), String> {
    update_labels(&app, "ラベルの保存に失敗しました", |labels| {
        labels.insert(worktree_path, label);
    })
}

/// ラベルを削除する（worktree 削除時に連動）
#[tauri::command]
pub fn delete_label<R: Runtime>(app: AppHandle<R>, worktree_path: String) -> Result<(), String> {
    update_labels(&app, "ラベルの削除に失敗しました", |labels| {
        labels.remove(&worktree_path);
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::test::{mock_builder, mock_context, noop_assets};

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
    fn test_load_labels_initial_state() {
        let app = build_mock_app();
        let labels = load_labels(app.handle().clone()).unwrap();
        assert!(labels.is_empty());
    }

    #[test]
    fn test_save_then_load_label() {
        let app = build_mock_app();
        let handle = app.handle().clone();

        // 保存
        save_label(
            handle.clone(),
            "/mock/wt-1".to_string(),
            "テスト用ラベル".to_string(),
        )
        .unwrap();

        // 読み込みで同じ内容が返る
        let labels = load_labels(handle).unwrap();
        assert_eq!(labels.len(), 1);
        assert_eq!(
            labels.get("/mock/wt-1"),
            Some(&"テスト用ラベル".to_string())
        );
    }

    #[test]
    fn test_save_multiple_labels() {
        let app = build_mock_app();
        let handle = app.handle().clone();

        save_label(
            handle.clone(),
            "/mock/wt-1".to_string(),
            "ラベルA".to_string(),
        )
        .unwrap();
        save_label(
            handle.clone(),
            "/mock/wt-2".to_string(),
            "ラベルB".to_string(),
        )
        .unwrap();

        let labels = load_labels(handle).unwrap();
        assert_eq!(labels.len(), 2);
        assert_eq!(labels.get("/mock/wt-1"), Some(&"ラベルA".to_string()));
        assert_eq!(labels.get("/mock/wt-2"), Some(&"ラベルB".to_string()));
    }

    #[test]
    fn test_delete_label() {
        let app = build_mock_app();
        let handle = app.handle().clone();

        save_label(
            handle.clone(),
            "/mock/wt-1".to_string(),
            "削除予定".to_string(),
        )
        .unwrap();

        delete_label(handle.clone(), "/mock/wt-1".to_string()).unwrap();

        let labels = load_labels(handle).unwrap();
        assert!(labels.is_empty());
    }

    #[test]
    fn test_delete_nonexistent_label() {
        // 存在しないキーに対する delete はエラーにならない
        let app = build_mock_app();
        let handle = app.handle().clone();

        let result = delete_label(handle, "/mock/nonexistent".to_string());
        assert!(result.is_ok());
    }

    #[test]
    fn test_save_label_overwrite() {
        // 同じキーに対する save は上書き
        let app = build_mock_app();
        let handle = app.handle().clone();

        save_label(
            handle.clone(),
            "/mock/wt-1".to_string(),
            "旧ラベル".to_string(),
        )
        .unwrap();
        save_label(
            handle.clone(),
            "/mock/wt-1".to_string(),
            "新ラベル".to_string(),
        )
        .unwrap();

        let labels = load_labels(handle).unwrap();
        assert_eq!(labels.len(), 1);
        assert_eq!(labels.get("/mock/wt-1"), Some(&"新ラベル".to_string()));
    }
}
