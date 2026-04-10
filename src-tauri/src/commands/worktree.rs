use git2::{Repository, StatusOptions};
use serde::{Deserialize, Serialize};
use std::path::Path;

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
    pub last_commit_time: i64,
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

/// worktree のパスからブランチ名を取得する
fn get_branch_name(repo: &Repository) -> String {
    repo.head()
        .ok()
        .and_then(|head| head.shorthand().map(|s| s.to_string()))
        .unwrap_or_else(|| "HEAD".to_string())
}

/// worktree の最終コミット情報を取得する
fn get_last_commit(repo: &Repository) -> (String, String, i64) {
    let head = match repo.head() {
        Ok(h) => h,
        Err(_) => return ("".to_string(), "".to_string(), 0),
    };
    let commit = match head.peel_to_commit() {
        Ok(c) => c,
        Err(_) => return ("".to_string(), "".to_string(), 0),
    };
    let hash = commit.id().to_string();
    let message = commit
        .summary()
        .unwrap_or("")
        .to_string();
    let time = commit.time().seconds();
    (hash, message, time)
}

/// worktree の変更ファイル数を取得する（ADR-0011: 合計のみ）
fn count_modified_files(repo: &Repository) -> u32 {
    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true);
    repo.statuses(Some(&mut opts))
        .map(|statuses| statuses.len() as u32)
        .unwrap_or(0)
}

#[tauri::command]
pub fn list_worktrees(repository_path: String) -> Result<Vec<WorktreeInfo>, String> {
    let main_repo = Repository::open(&repository_path)
        .map_err(|e| format!("リポジトリを開けませんでした: {}", e))?;

    let mut result: Vec<WorktreeInfo> = Vec::new();

    // メイン worktree（リポジトリ本体）
    let main_workdir = main_repo
        .workdir()
        .ok_or_else(|| "bare リポジトリは非対応です".to_string())?;
    let main_path = main_workdir
        .to_str()
        .ok_or_else(|| "パスの変換に失敗しました".to_string())?
        .trim_end_matches('/')
        .to_string();

    let (head_hash, commit_msg, commit_time) = get_last_commit(&main_repo);
    let modified = count_modified_files(&main_repo);

    result.push(WorktreeInfo {
        path: main_path,
        branch: get_branch_name(&main_repo),
        is_main: true,
        head: head_hash,
        last_commit_message: commit_msg,
        last_commit_time: commit_time,
        modified_count: modified,
    });

    // サブ worktree 一覧
    let worktree_names = main_repo
        .worktrees()
        .map_err(|e| format!("worktree 一覧の取得に失敗しました: {}", e))?;

    for name in worktree_names.iter() {
        let name = match name {
            Some(n) => n,
            None => continue,
        };

        let wt = match main_repo.find_worktree(name) {
            Ok(wt) => wt,
            Err(_) => continue,
        };

        let wt_path = wt.path().to_str().unwrap_or("").to_string();
        let wt_path = wt_path.trim_end_matches('/').to_string();

        if !Path::new(&wt_path).exists() {
            continue;
        }

        // サブ worktree を独立した Repository として開く
        let wt_repo = match Repository::open(&wt_path) {
            Ok(r) => r,
            Err(_) => continue,
        };

        let (hash, msg, time) = get_last_commit(&wt_repo);
        let modified = count_modified_files(&wt_repo);

        result.push(WorktreeInfo {
            path: wt_path,
            branch: get_branch_name(&wt_repo),
            is_main: false,
            head: hash,
            last_commit_message: msg,
            last_commit_time: time,
            modified_count: modified,
        });
    }

    Ok(result)
}

#[tauri::command]
pub fn get_worktree_status(worktree_path: String) -> Result<WorktreeStatus, String> {
    let repo = Repository::open(&worktree_path)
        .map_err(|e| format!("worktree を開けませんでした: {}", e))?;

    let modified = count_modified_files(&repo);

    Ok(WorktreeStatus {
        path: worktree_path,
        modified_count: modified,
        has_uncommitted: modified > 0,
    })
}

#[tauri::command]
pub fn remove_worktree(
    worktree_path: String,
    force: bool,
    delete_branch: bool,
) -> Result<(), String> {
    // TODO: task 5 で実装
    let _ = (worktree_path, force, delete_branch);
    Ok(())
}
