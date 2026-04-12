use super::STORE_PATH;
use std::collections::HashMap;
use tauri::{AppHandle, Runtime};
use tauri_plugin_store::StoreExt;

const ORDER_KEY: &str = "worktree_order";

/// store から並び順データを読み込む（内部ヘルパー）。
///
/// # Returns
/// キーはリポジトリ ID、値は worktree 絶対パスの配列。
/// 未登録・デシリアライズ失敗時は空 `HashMap`。
fn read_order<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<HashMap<String, Vec<String>>, String> {
    let store = app
        .store(STORE_PATH)
        .map_err(|e| format!("ストアを開けませんでした: {}", e))?;

    Ok(store
        .get(ORDER_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default())
}

/// 並び順データを mutate して store に書き戻す（内部ヘルパー）。
///
/// # Arguments
/// * `app` - Tauri ランタイムの AppHandle
/// * `context` - 失敗時のエラーメッセージに使う文脈
/// * `mutator` - `HashMap<String, Vec<String>>` を in-place 変更するクロージャ
fn update_order<R: Runtime>(
    app: &AppHandle<R>,
    context: &str,
    mutator: impl FnOnce(&mut HashMap<String, Vec<String>>),
) -> Result<(), String> {
    let store = app
        .store(STORE_PATH)
        .map_err(|e| format!("ストアを開けませんでした: {}", e))?;

    let mut order: HashMap<String, Vec<String>> = store
        .get(ORDER_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    mutator(&mut order);

    let value = serde_json::to_value(&order).map_err(|e| format!("シリアライズ失敗: {}", e))?;
    store.set(ORDER_KEY, value);
    store.save().map_err(|e| format!("{}: {}", context, e))?;

    Ok(())
}

/// 全リポジトリの worktree 並び順を読み込む。
///
/// # Arguments
/// * `app` - Tauri ランタイムの AppHandle
///
/// # Returns
/// * `Ok(HashMap)` - キーはリポジトリ ID、値は worktree 絶対パスの配列。
///   store に未登録、または JSON デシリアライズ失敗時は空 `HashMap`
/// * `Err(String)` - 日本語のエラーメッセージ
///
/// # Errors
/// tauri-plugin-store のハンドル取得に失敗した場合のみ。
#[tauri::command]
pub fn load_order<R: Runtime>(
    app: AppHandle<R>,
) -> Result<HashMap<String, Vec<String>>, String> {
    read_order(&app)
}

/// 指定リポジトリの worktree 並び順を保存する。
/// 他リポジトリの順序は影響を受けない。
///
/// # Arguments
/// * `app` - Tauri ランタイムの AppHandle
/// * `repository_id` - 対象リポジトリの UUID
/// * `order` - worktree 絶対パスの配列（表示したい順番）
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
pub fn save_order<R: Runtime>(
    app: AppHandle<R>,
    repository_id: String,
    order: Vec<String>,
) -> Result<(), String> {
    update_order(&app, "並び順の保存に失敗しました", |map| {
        map.insert(repository_id, order);
    })
}

/// 指定リポジトリの並び順データを削除する（リポジトリ削除時の連動用）。
///
/// # Arguments
/// * `app` - Tauri ランタイムの AppHandle
/// * `repository_id` - 削除対象リポジトリの UUID
///
/// # Returns
/// * `Ok(())` - キーが存在しなくてもエラーにならず Ok を返す（冪等）
/// * `Err(String)` - 日本語のエラーメッセージ
///
/// # 副作用
/// `STORE_PATH` に書き込み、`store.save()` で同期的にディスクへ flush する。
///
/// # Errors
/// store のオープン / シリアライズ / save に失敗した場合。
#[tauri::command]
pub fn delete_order<R: Runtime>(
    app: AppHandle<R>,
    repository_id: String,
) -> Result<(), String> {
    update_order(&app, "並び順の削除に失敗しました", |map| {
        map.remove(&repository_id);
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
    fn test_load_order_initial_state() {
        let app = build_mock_app();
        let order = load_order(app.handle().clone()).unwrap();
        assert!(order.is_empty());
    }

    #[test]
    fn test_save_then_load_order() {
        let app = build_mock_app();
        let handle = app.handle().clone();

        let paths = vec!["/mock/wt-1".to_string(), "/mock/wt-2".to_string()];
        save_order(handle.clone(), "repo-1".to_string(), paths.clone()).unwrap();

        let order = load_order(handle).unwrap();
        assert_eq!(order.len(), 1);
        assert_eq!(order.get("repo-1"), Some(&paths));
    }

    #[test]
    fn test_save_order_multiple_repositories() {
        let app = build_mock_app();
        let handle = app.handle().clone();

        let paths_a = vec!["/mock/a-1".to_string(), "/mock/a-2".to_string()];
        let paths_b = vec!["/mock/b-1".to_string()];

        save_order(handle.clone(), "repo-a".to_string(), paths_a.clone()).unwrap();
        save_order(handle.clone(), "repo-b".to_string(), paths_b.clone()).unwrap();

        let order = load_order(handle).unwrap();
        assert_eq!(order.len(), 2);
        assert_eq!(order.get("repo-a"), Some(&paths_a));
        assert_eq!(order.get("repo-b"), Some(&paths_b));
    }

    #[test]
    fn test_save_order_overwrite() {
        let app = build_mock_app();
        let handle = app.handle().clone();

        let old = vec!["/mock/wt-1".to_string(), "/mock/wt-2".to_string()];
        let new = vec!["/mock/wt-2".to_string(), "/mock/wt-1".to_string()];

        save_order(handle.clone(), "repo-1".to_string(), old).unwrap();
        save_order(handle.clone(), "repo-1".to_string(), new.clone()).unwrap();

        let order = load_order(handle).unwrap();
        assert_eq!(order.len(), 1);
        assert_eq!(order.get("repo-1"), Some(&new));
    }

    #[test]
    fn test_delete_order() {
        let app = build_mock_app();
        let handle = app.handle().clone();

        save_order(
            handle.clone(),
            "repo-1".to_string(),
            vec!["/mock/wt-1".to_string()],
        )
        .unwrap();

        delete_order(handle.clone(), "repo-1".to_string()).unwrap();

        let order = load_order(handle).unwrap();
        assert!(order.is_empty());
    }

    #[test]
    fn test_delete_order_preserves_other_repositories() {
        let app = build_mock_app();
        let handle = app.handle().clone();

        let paths_a = vec!["/mock/a-1".to_string()];
        let paths_b = vec!["/mock/b-1".to_string()];

        save_order(handle.clone(), "repo-a".to_string(), paths_a.clone()).unwrap();
        save_order(handle.clone(), "repo-b".to_string(), paths_b).unwrap();

        delete_order(handle.clone(), "repo-b".to_string()).unwrap();

        let order = load_order(handle).unwrap();
        assert_eq!(order.len(), 1);
        assert_eq!(order.get("repo-a"), Some(&paths_a));
    }

    #[test]
    fn test_delete_nonexistent_order() {
        let app = build_mock_app();
        let handle = app.handle().clone();

        let result = delete_order(handle, "nonexistent".to_string());
        assert!(result.is_ok());
    }
}
