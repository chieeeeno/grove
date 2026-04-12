mod commands;

use commands::{editor, label, order, repository, worktree};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // リポジトリ
            repository::validate_repository,
            repository::load_config,
            repository::save_config,
            // Worktree
            worktree::list_worktrees,
            worktree::get_worktree_status,
            worktree::check_before_remove,
            worktree::remove_worktree,
            // ラベル（ADR-0008）
            label::load_labels,
            label::save_label,
            label::delete_label,
            // 並び順
            order::load_order,
            order::save_order,
            order::delete_order,
            // エディタ
            editor::open_in_editor,
            editor::check_code_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
