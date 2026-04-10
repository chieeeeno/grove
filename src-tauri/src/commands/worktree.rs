use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct WorktreeInfo {
    pub path: String,
    pub branch: String,
    #[serde(rename = "isMain")]
    pub is_main: bool,
    pub head: String,
    #[serde(rename = "lastCommitMessage")]
    pub last_commit_message: String,
    #[serde(rename = "lastCommitTime")]
    pub last_commit_time: i64, // Unix timestamp (seconds)
    #[serde(rename = "modifiedCount")]
    pub modified_count: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorktreeStatus {
    pub path: String,
    #[serde(rename = "modifiedCount")]
    pub modified_count: u32,
    #[serde(rename = "hasUncommitted")]
    pub has_uncommitted: bool,
}

#[tauri::command]
pub fn list_worktrees(repository_path: String) -> Result<Vec<WorktreeInfo>, String> {
    // TODO: task 3 で git2 を使って実装
    let _ = repository_path;
    Ok(vec![])
}

#[tauri::command]
pub fn get_worktree_status(worktree_path: String) -> Result<WorktreeStatus, String> {
    // TODO: task 3 で git2 を使って実装
    Ok(WorktreeStatus {
        path: worktree_path,
        modified_count: 0,
        has_uncommitted: false,
    })
}

#[tauri::command]
pub fn remove_worktree(
    worktree_path: String,
    force: bool,
    delete_branch: bool,
) -> Result<(), String> {
    // TODO: task 5 で git2 を使って実装
    let _ = (worktree_path, force, delete_branch);
    Ok(())
}
