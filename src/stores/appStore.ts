import { create } from "zustand";
import type { RepositoryConfig, WorktreeInfo } from "../types";

/**
 * 2つの worktree 配列が内容的に同一かを判定する。
 * ポーリングで変化ゼロのときに再レンダーを起こさないために使う。
 * 比較対象は UI に影響するフィールドのみ（ADR-0011 に基づく）。
 */
function worktreesEqual(a: WorktreeInfo[], b: WorktreeInfo[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.path !== y.path ||
      x.branch !== y.branch ||
      x.isMain !== y.isMain ||
      x.head !== y.head ||
      x.lastCommitTime !== y.lastCommitTime ||
      x.lastCommitMessage !== y.lastCommitMessage ||
      x.modifiedCount !== y.modifiedCount
    ) {
      return false;
    }
  }
  return true;
}

interface AppStore {
  // ===== リポジトリ =====
  repositories: RepositoryConfig[];
  selectedRepositoryId: string | null;
  setRepositories: (repos: RepositoryConfig[]) => void;
  addRepository: (repo: RepositoryConfig) => void;
  removeRepository: (id: string) => void;
  selectRepository: (id: string | null) => void;

  // ===== Worktree =====
  // key: repositoryId
  worktrees: Record<string, WorktreeInfo[]>;
  setWorktrees: (repositoryId: string, worktrees: WorktreeInfo[]) => void;
  removeWorktreeEntry: (repositoryId: string, worktreePath: string) => void;

  // ===== ラベル（worktree 絶対パスをキー、ADR-0008） =====
  labels: Record<string, string>;
  setLabel: (worktreePath: string, label: string) => void;
  removeLabel: (worktreePath: string) => void;
  setAllLabels: (labels: Record<string, string>) => void;

  // ===== 設定 =====
  refreshInterval: number;
  setRefreshInterval: (v: number) => void;

  // ===== UI 状態 =====
  codeAvailable: boolean;
  setCodeAvailable: (v: boolean) => void;
  isRefreshing: boolean;
  setIsRefreshing: (v: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // リポジトリ
  repositories: [],
  selectedRepositoryId: null,
  setRepositories: (repos) => set({ repositories: repos }),
  addRepository: (repo) => set((s) => ({ repositories: [...s.repositories, repo] })),
  removeRepository: (id) =>
    set((s) => ({ repositories: s.repositories.filter((r) => r.id !== id) })),
  selectRepository: (id) => set({ selectedRepositoryId: id }),

  // Worktree
  worktrees: {},
  setWorktrees: (repositoryId, worktrees) =>
    set((s) => {
      // 差分がなければ state を変更しない（ポーリング時の無駄な再レンダー防止）
      const existing = s.worktrees[repositoryId];
      if (existing && worktreesEqual(existing, worktrees)) {
        return s;
      }
      return { worktrees: { ...s.worktrees, [repositoryId]: worktrees } };
    }),
  removeWorktreeEntry: (repositoryId, worktreePath) =>
    set((s) => ({
      worktrees: {
        ...s.worktrees,
        [repositoryId]: (s.worktrees[repositoryId] ?? []).filter((w) => w.path !== worktreePath),
      },
    })),

  // ラベル
  labels: {},
  setLabel: (worktreePath, label) =>
    set((s) => ({ labels: { ...s.labels, [worktreePath]: label } })),
  removeLabel: (worktreePath) =>
    set((s) => {
      const next = { ...s.labels };
      delete next[worktreePath];
      return { labels: next };
    }),
  setAllLabels: (labels) => set({ labels }),

  // 設定
  refreshInterval: 5000,
  setRefreshInterval: (v) => set({ refreshInterval: v }),

  // UI
  codeAvailable: false,
  setCodeAvailable: (v) => set({ codeAvailable: v }),
  isRefreshing: false,
  setIsRefreshing: (v) => set({ isRefreshing: v }),
}));
