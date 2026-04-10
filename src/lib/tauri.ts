import { invoke } from "@tauri-apps/api/core";
import type { AppConfig, RepositoryInfo, WorktreeInfo, WorktreeStatus } from "../types";

// ===== リポジトリ =====

/** パスが有効な git リポジトリか検証し、リポジトリ情報を返す */
export const validateRepository = (path: string): Promise<RepositoryInfo> =>
  invoke("validate_repository", { path });

/** tauri-plugin-store から AppConfig を読み込む */
export const loadConfig = (): Promise<AppConfig> => invoke("load_config");

/** tauri-plugin-store に AppConfig を書き込む */
export const saveConfig = (config: AppConfig): Promise<void> => invoke("save_config", { config });

// ===== Worktree =====

/** リポジトリ配下の worktree 一覧を取得する */
export const listWorktrees = (repositoryPath: string): Promise<WorktreeInfo[]> =>
  invoke("list_worktrees", { repositoryPath });

/** worktree の変更ファイル数を取得する */
export const getWorktreeStatus = (worktreePath: string): Promise<WorktreeStatus> =>
  invoke("get_worktree_status", { worktreePath });

/** worktree を削除する（force: 未コミット変更を強制削除、deleteBranch: ブランチも削除） */
export const removeWorktree = (
  worktreePath: string,
  force: boolean,
  deleteBranch: boolean
): Promise<void> => invoke("remove_worktree", { worktreePath, force, deleteBranch });

// ===== ラベル（ADR-0008） =====

/** 全ラベルを読み込む（キー: worktree 絶対パス） */
export const loadLabels = (): Promise<Record<string, string>> => invoke("load_labels");

/** ラベルを保存する */
export const saveLabel = (worktreePath: string, label: string): Promise<void> =>
  invoke("save_label", { worktreePath, label });

/** ラベルを削除する */
export const deleteLabel = (worktreePath: string): Promise<void> =>
  invoke("delete_label", { worktreePath });

// ===== エディタ =====

/** VS Code でパスを開く */
export const openInEditor = (path: string): Promise<void> => invoke("open_in_editor", { path });

/** `code` コマンドが利用可能か確認する（ADR-0012 preflight） */
export const checkCodeCommand = (): Promise<boolean> => invoke("check_code_command");
