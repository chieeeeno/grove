import { create } from "zustand";
import type { RepositoryConfig, WorktreeInfo } from "../types";

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
    set((s) => ({ worktrees: { ...s.worktrees, [repositoryId]: worktrees } })),
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

  // UI
  codeAvailable: false,
  setCodeAvailable: (v) => set({ codeAvailable: v }),
  isRefreshing: false,
  setIsRefreshing: (v) => set({ isRefreshing: v }),
}));
