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

/// worktree ラベル一覧を読み込む（ADR-0008）。
///
/// # Arguments
/// * `app` - Tauri ランタイムの AppHandle
///
/// # Returns
/// * `Ok(HashMap)` - キーは worktree の絶対パス、値はユーザーが付けたラベル文字列。
///   store にラベル未登録、または JSON デシリアライズ失敗時は空 `HashMap`
/// * `Err(String)` - 日本語のエラーメッセージ
///
/// # Errors
/// tauri-plugin-store のハンドル取得に失敗した場合のみ。
///
/// # 注意
/// worktree を rename するとキーが変わりラベルは失われる（ADR-0008 で許容済み）。
#[tauri::command]
pub fn load_labels<R: Runtime>(app: AppHandle<R>) -> Result<HashMap<String, String>, String> {
    read_labels(&app)
}

/// worktree にラベルを割り当てて保存する（ADR-0008）。既存のラベルは無条件に上書きされる。
///
/// # Arguments
/// * `app` - Tauri ランタイムの AppHandle
/// * `worktree_path` - 対象 worktree の絶対パス。文字列一致でキーとして扱うため、
///   末尾スラッシュ等の正規化は呼び出し側の責務
/// * `label` - ラベル文字列。空文字・長文の検証は行わないので UI 層で制御すること
///
/// # Returns
/// * `Ok(())` - 保存成功（即座にディスクへ flush 済み）
/// * `Err(String)` - 日本語のエラーメッセージ
///
/// # 副作用
/// `STORE_PATH` に書き込み、`store.save()` で同期的にディスクへ flush する。
///
/// # Errors
/// store のオープン / シリアライズ / save に失敗した場合。
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

/// 指定 worktree のラベルを削除する（通常は `remove_worktree` 成功後に連動呼び出しする）。
///
/// # Arguments
/// * `app` - Tauri ランタイムの AppHandle
/// * `worktree_path` - 削除対象 worktree の絶対パス
///
/// # Returns
/// * `Ok(())` - キーが存在しなくてもエラーにならず Ok を返す（冪等）
/// * `Err(String)` - 日本語のエラーメッセージ
///
/// # 副作用
/// `STORE_PATH` に書き込み、`store.save()` で同期的にディスクへ flush する。
///
/// # Errors
/// store のオープン / save に失敗した場合のみ。
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
