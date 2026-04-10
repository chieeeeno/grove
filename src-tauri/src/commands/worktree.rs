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
    let message = commit.summary().unwrap_or("").to_string();
    let time = commit.time().seconds();
    (hash, message, time)
}

/// worktree の変更ファイル数を取得する（ADR-0011: 合計のみ）
fn count_modified_files(repo: &Repository) -> u32 {
    let mut opts = StatusOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(true);
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

/// worktree 削除の事前チェック結果
#[derive(Debug, Serialize, Deserialize)]
pub struct RemoveWorktreeCheck {
    pub path: String,
    pub branch: String,
    #[serde(rename = "hasUncommitted")]
    pub has_uncommitted: bool,
    #[serde(rename = "modifiedCount")]
    pub modified_count: u32,
}

#[tauri::command]
pub fn check_before_remove(worktree_path: String) -> Result<RemoveWorktreeCheck, String> {
    let repo = Repository::open(&worktree_path)
        .map_err(|e| format!("worktree を開けませんでした: {}", e))?;

    let branch = get_branch_name(&repo);
    let modified = count_modified_files(&repo);

    Ok(RemoveWorktreeCheck {
        path: worktree_path,
        branch,
        has_uncommitted: modified > 0,
        modified_count: modified,
    })
}

#[tauri::command]
pub fn remove_worktree(
    worktree_path: String,
    force: bool,
    delete_branch: bool,
) -> Result<(), String> {
    let wt_path = Path::new(&worktree_path);

    // worktree を開いてブランチ名を取得（ブランチ削除用）
    let branch_name = if delete_branch {
        let wt_repo = Repository::open(&worktree_path)
            .map_err(|e| format!("worktree を開けませんでした: {}", e))?;
        Some(get_branch_name(&wt_repo))
    } else {
        None
    };

    // 親リポジトリを .git ファイルから辿って開く
    let git_file = wt_path.join(".git");
    let git_content = std::fs::read_to_string(&git_file)
        .map_err(|e| format!(".git ファイルの読み込みに失敗: {}", e))?;
    // "gitdir: /path/to/main/.git/worktrees/<name>" から親リポジトリのパスを取得
    let gitdir = git_content
        .trim()
        .strip_prefix("gitdir: ")
        .ok_or_else(|| "不正な .git ファイル形式です".to_string())?;
    let main_git_dir = Path::new(gitdir)
        .parent() // .git/worktrees
        .and_then(|p| p.parent()) // .git
        .ok_or_else(|| "親リポジトリのパスを解決できませんでした".to_string())?;
    let main_repo = Repository::open(main_git_dir)
        .map_err(|e| format!("親リポジトリを開けませんでした: {}", e))?;

    // worktree 名を取得（パスの末尾ディレクトリ名）
    let wt_name = wt_path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "worktree 名の取得に失敗しました".to_string())?;

    // worktree を削除
    let wt = main_repo
        .find_worktree(wt_name)
        .map_err(|e| format!("worktree '{}' が見つかりません: {}", wt_name, e))?;

    if force {
        // force: ディレクトリを先に削除してから prune
        if wt_path.exists() {
            std::fs::remove_dir_all(wt_path)
                .map_err(|e| format!("worktree ディレクトリの削除に失敗: {}", e))?;
        }
        wt.prune(Some(
            git2::WorktreePruneOptions::new()
                .working_tree(true)
                .valid(true),
        ))
        .map_err(|e| format!("worktree の prune に失敗: {}", e))?;
    } else {
        wt.prune(Some(
            git2::WorktreePruneOptions::new()
                .working_tree(true)
                .valid(true),
        ))
        .map_err(|e| format!("worktree の削除に失敗: {}", e))?;

        // ディレクトリが残っていたら削除
        if wt_path.exists() {
            std::fs::remove_dir_all(wt_path)
                .map_err(|e| format!("worktree ディレクトリの削除に失敗: {}", e))?;
        }
    }

    // ブランチ削除
    if let Some(ref branch) = branch_name {
        if let Ok(mut br) = main_repo.find_branch(branch, git2::BranchType::Local) {
            br.delete()
                .map_err(|e| format!("ブランチ '{}' の削除に失敗: {}", branch, e))?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use git2::{Repository, Signature};
    use std::fs;
    use tempfile::TempDir;

    /// テスト用: 初期コミット付きの一時 git リポジトリを作成する
    fn create_test_repo() -> (TempDir, Repository) {
        let dir = TempDir::new().unwrap();
        let repo = Repository::init(dir.path()).unwrap();

        // 初期コミット
        {
            let sig = Signature::now("Test", "test@example.com").unwrap();
            let tree_id = {
                let mut index = repo.index().unwrap();
                index.write_tree().unwrap()
            };
            let tree = repo.find_tree(tree_id).unwrap();
            repo.commit(Some("HEAD"), &sig, &sig, "initial commit", &tree, &[])
                .unwrap();
        }

        (dir, repo)
    }

    #[test]
    fn test_list_worktrees_returns_main() {
        let (dir, _repo) = create_test_repo();
        let path = dir.path().to_str().unwrap().to_string();

        let result = list_worktrees(path.clone()).unwrap();

        assert_eq!(result.len(), 1);
        assert!(result[0].is_main);
        // git init のデフォルトブランチ名は環境設定に依存する
        assert!(result[0].branch == "main" || result[0].branch == "master");
        assert_eq!(result[0].last_commit_message, "initial commit");
    }

    #[test]
    fn test_list_worktrees_includes_sub_worktrees() {
        let (dir, repo) = create_test_repo();
        let main_path = dir.path().to_str().unwrap().to_string();

        // サブ worktree 用のブランチを作成
        let head = repo.head().unwrap().peel_to_commit().unwrap();
        repo.branch("feature-test", &head, false).unwrap();

        // サブ worktree を追加
        let wt_path = dir.path().join("wt-feature");
        repo.worktree(
            "wt-feature",
            wt_path.as_path(),
            Some(
                git2::WorktreeAddOptions::new().reference(Some(
                    &repo
                        .find_branch("feature-test", git2::BranchType::Local)
                        .unwrap()
                        .into_reference(),
                )),
            ),
        )
        .unwrap();

        let result = list_worktrees(main_path).unwrap();

        assert_eq!(result.len(), 2);
        assert!(result[0].is_main);
        assert!(!result[1].is_main);
        assert_eq!(result[1].branch, "feature-test");
    }

    #[test]
    fn test_get_worktree_status_clean() {
        let (dir, _repo) = create_test_repo();
        let path = dir.path().to_str().unwrap().to_string();

        let status = get_worktree_status(path).unwrap();

        assert_eq!(status.modified_count, 0);
        assert!(!status.has_uncommitted);
    }

    #[test]
    fn test_get_worktree_status_with_changes() {
        let (dir, _repo) = create_test_repo();
        let path = dir.path().to_str().unwrap().to_string();

        // untracked ファイルを作成
        fs::write(dir.path().join("new_file.txt"), "hello").unwrap();

        let status = get_worktree_status(path).unwrap();

        assert!(status.modified_count > 0);
        assert!(status.has_uncommitted);
    }

    #[test]
    fn test_count_modified_files_empty_repo() {
        let (dir, repo) = create_test_repo();
        let _ = dir; // keep alive
        assert_eq!(count_modified_files(&repo), 0);
    }

    /// テスト用: サブ worktree を作成して (メインdir, worktreeパス) を返す
    fn create_test_repo_with_worktree() -> (TempDir, String) {
        let (dir, repo) = create_test_repo();
        let main_path = dir.path().to_str().unwrap().to_string();

        let head = repo.head().unwrap().peel_to_commit().unwrap();
        repo.branch("wt-branch", &head, false).unwrap();

        let wt_path = dir.path().join("wt-sub");
        repo.worktree(
            "wt-sub",
            wt_path.as_path(),
            Some(
                git2::WorktreeAddOptions::new().reference(Some(
                    &repo
                        .find_branch("wt-branch", git2::BranchType::Local)
                        .unwrap()
                        .into_reference(),
                )),
            ),
        )
        .unwrap();

        let wt_path_str = wt_path.to_str().unwrap().to_string();
        // main_path が drop されないよう dir を返す
        (dir, wt_path_str)
    }

    #[test]
    fn test_check_before_remove() {
        let (_dir, wt_path) = create_test_repo_with_worktree();

        let check = check_before_remove(wt_path).unwrap();

        assert_eq!(check.branch, "wt-branch");
        assert!(!check.has_uncommitted);
        assert_eq!(check.modified_count, 0);
    }

    #[test]
    fn test_check_before_remove_with_changes() {
        let (_dir, wt_path) = create_test_repo_with_worktree();

        // worktree にファイルを追加
        fs::write(Path::new(&wt_path).join("dirty.txt"), "dirty").unwrap();

        let check = check_before_remove(wt_path).unwrap();

        assert!(check.has_uncommitted);
        assert!(check.modified_count > 0);
    }

    #[test]
    fn test_remove_worktree_basic() {
        let (dir, wt_path) = create_test_repo_with_worktree();
        let main_path = dir.path().to_str().unwrap().to_string();

        // 削除前: worktree が2つある
        assert_eq!(list_worktrees(main_path.clone()).unwrap().len(), 2);
        assert!(Path::new(&wt_path).exists());

        // 削除
        remove_worktree(wt_path.clone(), false, false).unwrap();

        // 削除後: worktree が1つ（メインのみ）
        assert_eq!(list_worktrees(main_path).unwrap().len(), 1);
        assert!(!Path::new(&wt_path).exists());
    }

    #[test]
    fn test_remove_worktree_with_branch_delete() {
        let (dir, wt_path) = create_test_repo_with_worktree();
        let main_path = dir.path().to_str().unwrap().to_string();
        let main_repo = Repository::open(&main_path).unwrap();

        // 削除前: ブランチが存在する
        assert!(main_repo
            .find_branch("wt-branch", git2::BranchType::Local)
            .is_ok());

        // ブランチも一緒に削除
        remove_worktree(wt_path, false, true).unwrap();

        // 削除後: ブランチも消えている
        let main_repo = Repository::open(&main_path).unwrap();
        assert!(main_repo
            .find_branch("wt-branch", git2::BranchType::Local)
            .is_err());
    }
}
