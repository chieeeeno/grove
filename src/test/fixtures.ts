import type { RepositoryConfig, WorktreeInfo, AppConfig } from "../types";

/**
 * テスト用の共通モックデータファクトリ
 *
 * 各関数は overrides を受け取り、必要なフィールドだけ上書きできる。
 */

export const mockRepository = (overrides: Partial<RepositoryConfig> = {}): RepositoryConfig => ({
  id: "repo-1",
  name: "test-repo",
  path: "/mock/test-repo",
  addedAt: "2026-04-10T00:00:00Z",
  ...overrides,
});

export const mockWorktree = (overrides: Partial<WorktreeInfo> = {}): WorktreeInfo => ({
  path: "/mock/main",
  branch: "main",
  isMain: true,
  head: "abc123",
  lastCommitMessage: "initial commit",
  lastCommitTime: 0,
  modifiedCount: 0,
  isMerged: false,
  ...overrides,
});

export const mockSubWorktree = (overrides: Partial<WorktreeInfo> = {}): WorktreeInfo =>
  mockWorktree({
    path: "/mock/feature",
    branch: "feature/test",
    isMain: false,
    head: "def456",
    lastCommitMessage: "feat: something",
    ...overrides,
  });

export const mockAppConfig = (overrides: Partial<AppConfig> = {}): AppConfig => ({
  repositories: [],
  editor: "vscode",
  theme: "system",
  refreshInterval: 5000,
  ...overrides,
});
