use git2::{Repository, StatusOptions};
use serde::{Deserialize, Serialize};
use std::path::Path;

/// `list_worktrees` の戻り値 1 件分。
///
/// フロントエンド `WorktreeInfo` 型（src/types/index.ts）と JSON で対応する。
/// `ahead`/`behind`/`agentStatus` は M0 では返さない（ADR-0010 / Phase 2 で追加予定）。
#[derive(Debug, Serialize, Deserialize)]
pub struct WorktreeInfo {
    /// worktree の絶対パス（末尾スラッシュは除去済み）。
    pub path: String,
    /// 現在のブランチの短縮名。HEAD が detached のとき、または取得失敗時は `"HEAD"`。
    pub branch: String,
    /// メイン worktree（リポジトリ本体）かどうか。`list_worktrees` の戻り値では
    /// 常に先頭要素のみ `true`。
    #[serde(rename = "isMain")]
    pub is_main: bool,
    /// HEAD のコミットハッシュ（フル 40 文字）。HEAD が無い or 取得失敗時は空文字。
    pub head: String,
    /// 最終コミットの summary（1 行目）。取得失敗時は空文字。
    #[serde(rename = "lastCommitMessage")]
    pub last_commit_message: String,
    /// 最終コミットの時刻（Unix epoch 秒）。`0` はコミットなし or 取得失敗のセンチネル。
    /// フロント側 `relativeTime()` は `0` を空文字で表示する。
    #[serde(rename = "lastCommitTime")]
    pub last_commit_time: i64,
    /// 変更ファイル数の合計（ADR-0011: modified/added/deleted/untracked を種別で分けない）。
    #[serde(rename = "modifiedCount")]
    pub modified_count: u32,
}

/// `get_worktree_status` の戻り値。ポーリング用の軽量ステータス。
///
/// `WorktreeInfo` と違い最終コミット情報を返さないため、5 秒間隔のリフレッシュ用途で使う。
#[derive(Debug, Serialize, Deserialize)]
pub struct WorktreeStatus {
    /// 対象 worktree の絶対パス（呼び出し時の引数がそのまま返る）。
    pub path: String,
    /// 変更ファイル数の合計（untracked 込み、ADR-0011）。
    #[serde(rename = "modifiedCount")]
    pub modified_count: u32,
    /// `modified_count > 0` と等価の派生値。フロント側の条件分岐用。
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

/// リポジトリ配下の全 worktree を列挙する（メイン worktree + サブ worktree）。
///
/// # Arguments
/// * `repository_path` - メインリポジトリの絶対パス
///
/// # Returns
/// * `Ok(Vec<WorktreeInfo>)` - 先頭要素は必ずメイン worktree（`is_main = true`）。
///   以降はサブ worktree で、順序は libgit2 の `worktrees()` が返す順
///   （ソート保証なし、呼び出し側でソートすること）。開けないサブ worktree
///   （壊れている / prune 待ち）は結果から黙って除外される
/// * `Err(String)` - 日本語のエラーメッセージ
///
/// # Errors
/// - `repository_path` を `Repository::open` できない場合
/// - bare リポジトリ（workdir を持たない）の場合
/// - `worktrees()` 呼び出しの失敗
///
/// # パフォーマンス
/// 各サブ worktree の `Repository::open` + status 走査は `std::thread::scope` で
/// 並列実行する。メイン worktree の status 走査は先に直列で行うので、メインが
/// 大きい場合はそこがボトルネックになる（改善候補: #25）。
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

    // サブ worktree のパス一覧を先に収集する
    // （Worktree ハンドルはスレッドをまたげないため、パスにしてから並列化する）
    let worktree_names = main_repo
        .worktrees()
        .map_err(|e| format!("worktree 一覧の取得に失敗しました: {}", e))?;

    let sub_paths: Vec<String> = worktree_names
        .iter()
        .flatten()
        .filter_map(|name| main_repo.find_worktree(name).ok())
        .filter_map(|wt| {
            wt.path()
                .to_str()
                .map(|s| s.trim_end_matches('/').to_string())
        })
        .collect();

    // 各 worktree について Repository::open + status 走査を並列で実行する。
    // libgit2 は別 Repository インスタンスなら別スレッドから使えるので安全。
    let sub_worktrees: Vec<WorktreeInfo> = std::thread::scope(|scope| {
        let handles: Vec<_> = sub_paths
            .into_iter()
            .map(|wt_path| {
                scope.spawn(move || {
                    // Repository::open が失敗すれば存在しない or 壊れている扱いで skip するので
                    // 事前の exists() チェックは不要（無駄な syscall を削減）
                    let wt_repo = Repository::open(&wt_path).ok()?;
                    let (hash, msg, time) = get_last_commit(&wt_repo);
                    let modified = count_modified_files(&wt_repo);
                    Some(WorktreeInfo {
                        path: wt_path,
                        branch: get_branch_name(&wt_repo),
                        is_main: false,
                        head: hash,
                        last_commit_message: msg,
                        last_commit_time: time,
                        modified_count: modified,
                    })
                })
            })
            .collect();
        handles
            .into_iter()
            .filter_map(|h| h.join().ok().flatten())
            .collect()
    });

    result.extend(sub_worktrees);
    Ok(result)
}

/// 単一 worktree の変更ファイル数を取得する軽量ステータス API。
///
/// ADR-0013 の 5 秒ポーリングから呼ばれる想定（M0 時点では `list_worktrees` で
/// 十分で、このコマンドは将来のファイル監視移行まで未使用の可能性あり）。
///
/// # Arguments
/// * `worktree_path` - 対象 worktree の絶対パス
///
/// # Returns
/// * `Ok(WorktreeStatus)` - `path` は引数そのまま、`modified_count` は変更ファイル
///   合計（ADR-0011）、`has_uncommitted` は `modified_count > 0` の派生値
/// * `Err(String)` - 日本語のエラーメッセージ
///
/// # Errors
/// worktree を `Repository::open` できない場合。
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

/// `check_before_remove` の戻り値。削除前ダイアログの表示内容を組み立てるために使う。
///
/// `has_uncommitted` が true の場合、フロント側は削除ボタンでさらに確認を取ってから
/// `remove_worktree` を `force = true` で呼ぶ想定。
#[derive(Debug, Serialize, Deserialize)]
pub struct RemoveWorktreeCheck {
    /// 対象 worktree の絶対パス（呼び出し時の引数がそのまま返る）。
    pub path: String,
    /// 現在のブランチ名（`get_branch_name` と同じルール）。ダイアログの
    /// 「ブランチも一緒に削除する」チェックボックスで表示する。
    pub branch: String,
    /// 未コミットの変更があるか。true のとき force 削除が必要。
    #[serde(rename = "hasUncommitted")]
    pub has_uncommitted: bool,
    /// 変更ファイル数の合計（ADR-0011）。ダイアログで「未コミットの変更が N 件」と表示する。
    #[serde(rename = "modifiedCount")]
    pub modified_count: u32,
}

/// worktree 削除前の事前チェック。削除ダイアログの表示情報を取得する。
///
/// このコマンド自体は破壊的操作を行わない（読み取りのみ）。`has_uncommitted = true` の場合、
/// フロントは削除ダイアログで警告を出したうえで `remove_worktree` を `force = true` で呼ぶ。
///
/// # Arguments
/// * `worktree_path` - 削除対象 worktree の絶対パス
///
/// # Returns
/// * `Ok(RemoveWorktreeCheck)` - ダイアログ用のブランチ名・未コミット有無・変更件数
/// * `Err(String)` - 日本語のエラーメッセージ
///
/// # Errors
/// worktree を `Repository::open` できない場合。
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

/// worktree を削除する（オプションでブランチも削除）。
///
/// # Arguments
/// * `worktree_path` - 削除対象の絶対パス
/// * `force` - true のとき未コミットの変更があっても強制削除する。prune の前に
///   `remove_dir_all` を実行するフローに切り替わる（`check_before_remove` で
///   事前確認した結果をそのまま渡す想定）
/// * `delete_branch` - true のとき worktree が参照していたローカルブランチも削除する。
///   ブランチが存在しない（detached HEAD 等）場合はサイレントに無視する
///
/// # Returns
/// * `Ok(())` - 全ての削除ステップが成功した場合
/// * `Err(String)` - 日本語のエラーメッセージ
///
/// # 副作用（順序）
/// 1. `force = true` かつ worktree ディレクトリが残っていれば先行削除
/// 2. `Worktree::prune` で git の worktree レジストリから除外
/// 3. prune 後もディレクトリが残っていれば `remove_dir_all` でクリーンアップ
/// 4. `delete_branch = true` かつ該当ローカルブランチが存在すれば削除
///
/// # Errors
/// - worktree または親リポジトリを開けない
/// - worktree 名（末尾ディレクトリ名）の取得失敗
/// - `find_worktree` が失敗（git の worktree レジストリに存在しない）
/// - `remove_dir_all` / `prune` / `branch.delete()` の失敗
///
/// # 注意
/// 途中失敗時はディレクトリ削除だけ済んで prune 未実行、のような中途半端な状態に
/// なり得る。呼び出し側は失敗時に `list_worktrees` で再確認する想定。
#[tauri::command]
pub fn remove_worktree(
    worktree_path: String,
    force: bool,
    delete_branch: bool,
) -> Result<(), String> {
    let wt_path = Path::new(&worktree_path);

    // worktree を開いてブランチ名と親リポジトリへのパスを取得する。
    // commondir() は worktree が属する親の .git ディレクトリを返すので、
    // .git ファイルの手動パースは不要。wt_repo は以降使わないので
    // ブロックから抜ける時点で drop される（remove_dir_all との競合回避）。
    let (branch_name, main_repo) = {
        let wt_repo = Repository::open(&worktree_path)
            .map_err(|e| format!("worktree を開けませんでした: {}", e))?;
        let branch_name = if delete_branch {
            Some(get_branch_name(&wt_repo))
        } else {
            None
        };
        let main_repo = Repository::open(wt_repo.commondir())
            .map_err(|e| format!("親リポジトリを開けませんでした: {}", e))?;
        (branch_name, main_repo)
    };

    // worktree 名を取得（パスの末尾ディレクトリ名）
    let wt_name = wt_path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "worktree 名の取得に失敗しました".to_string())?;

    // worktree を削除
    let wt = main_repo
        .find_worktree(wt_name)
        .map_err(|e| format!("worktree '{}' が見つかりません: {}", wt_name, e))?;

    // force の場合は prune の前に working tree を消しておく（dirty な状態でも
    // 確実にディレクトリを消すため）。通常時は prune 後に残っていれば消す。
    // どちらの経路でも最終的に prune + remove_dir_all の両方を通る。
    if force && wt_path.exists() {
        std::fs::remove_dir_all(wt_path)
            .map_err(|e| format!("worktree ディレクトリの削除に失敗: {}", e))?;
    }

    wt.prune(Some(
        git2::WorktreePruneOptions::new()
            .working_tree(true)
            .valid(true),
    ))
    .map_err(|e| format!("worktree の削除に失敗: {}", e))?;

    if wt_path.exists() {
        std::fs::remove_dir_all(wt_path)
            .map_err(|e| format!("worktree ディレクトリの削除に失敗: {}", e))?;
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
    fn test_list_worktrees_multiple_sub_worktrees() {
        // 複数 worktree を並列で走査しても全件揃い、順序が安定していることを確認する
        let (dir, repo) = create_test_repo();
        let main_path = dir.path().to_str().unwrap().to_string();

        let head = repo.head().unwrap().peel_to_commit().unwrap();
        for name in ["wt-a", "wt-b", "wt-c"] {
            repo.branch(name, &head, false).unwrap();
            let wt_path = dir.path().join(name);
            repo.worktree(
                name,
                wt_path.as_path(),
                Some(
                    git2::WorktreeAddOptions::new().reference(Some(
                        &repo
                            .find_branch(name, git2::BranchType::Local)
                            .unwrap()
                            .into_reference(),
                    )),
                ),
            )
            .unwrap();
        }

        let result = list_worktrees(main_path).unwrap();

        assert_eq!(result.len(), 4);
        assert!(result[0].is_main);

        // 順序はソートされず worktree_names の順に従うが、いずれにせよ全件揃っていること
        let branches: Vec<&str> = result[1..].iter().map(|w| w.branch.as_str()).collect();
        assert!(branches.contains(&"wt-a"));
        assert!(branches.contains(&"wt-b"));
        assert!(branches.contains(&"wt-c"));
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
    fn test_remove_worktree_force_with_dirty_files() {
        let (dir, wt_path) = create_test_repo_with_worktree();
        let main_path = dir.path().to_str().unwrap().to_string();

        // worktree に未コミットの変更を残す
        fs::write(Path::new(&wt_path).join("dirty.txt"), "dirty").unwrap();

        // force=true で削除できる
        remove_worktree(wt_path.clone(), true, false).unwrap();

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
