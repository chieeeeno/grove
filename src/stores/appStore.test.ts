import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./appStore";

describe("appStore", () => {
  beforeEach(() => {
    // store をリセット
    useAppStore.setState({
      repositories: [],
      selectedRepositoryId: null,
      worktrees: {},
      labels: {},
      codeAvailable: false,
      isRefreshing: false,
    });
  });

  describe("リポジトリ管理", () => {
    const mockRepo = {
      id: "repo-1",
      name: "test-repo",
      path: "/path/to/repo",
      addedAt: "2026-04-10T00:00:00Z",
    };

    it("addRepository でリポジトリを追加できる", () => {
      useAppStore.getState().addRepository(mockRepo);
      expect(useAppStore.getState().repositories).toHaveLength(1);
      expect(useAppStore.getState().repositories[0].name).toBe("test-repo");
    });

    it("removeRepository でリポジトリを削除できる", () => {
      useAppStore.getState().addRepository(mockRepo);
      useAppStore.getState().removeRepository("repo-1");
      expect(useAppStore.getState().repositories).toHaveLength(0);
    });

    it("selectRepository で選択状態を更新できる", () => {
      useAppStore.getState().selectRepository("repo-1");
      expect(useAppStore.getState().selectedRepositoryId).toBe("repo-1");
    });

    it("selectRepository(null) で選択解除できる", () => {
      useAppStore.getState().selectRepository("repo-1");
      useAppStore.getState().selectRepository(null);
      expect(useAppStore.getState().selectedRepositoryId).toBeNull();
    });
  });

  describe("worktree 管理", () => {
    const mockWorktrees = [
      {
        path: "/path/main",
        branch: "main",
        isMain: true,
        head: "abc",
        lastCommitMessage: "init",
        lastCommitTime: 0,
        modifiedCount: 0,
      },
      {
        path: "/path/feature",
        branch: "feature",
        isMain: false,
        head: "def",
        lastCommitMessage: "feat",
        lastCommitTime: 0,
        modifiedCount: 2,
      },
    ];

    it("setWorktrees で worktree を保存できる", () => {
      useAppStore.getState().setWorktrees("repo-1", mockWorktrees);
      expect(useAppStore.getState().worktrees["repo-1"]).toHaveLength(2);
    });

    it("removeWorktreeEntry で特定の worktree を除去できる", () => {
      useAppStore.getState().setWorktrees("repo-1", mockWorktrees);
      useAppStore.getState().removeWorktreeEntry("repo-1", "/path/feature");
      expect(useAppStore.getState().worktrees["repo-1"]).toHaveLength(1);
      expect(useAppStore.getState().worktrees["repo-1"][0].isMain).toBe(true);
    });
  });

  describe("ラベル管理（ADR-0008）", () => {
    it("setLabel でラベルを保存できる", () => {
      useAppStore.getState().setLabel("/path/wt", "テスト用");
      expect(useAppStore.getState().labels["/path/wt"]).toBe("テスト用");
    });

    it("removeLabel でラベルを削除できる", () => {
      useAppStore.getState().setLabel("/path/wt", "テスト用");
      useAppStore.getState().removeLabel("/path/wt");
      expect(useAppStore.getState().labels["/path/wt"]).toBeUndefined();
    });

    it("setAllLabels で一括設定できる", () => {
      useAppStore.getState().setAllLabels({
        "/path/a": "ラベルA",
        "/path/b": "ラベルB",
      });
      expect(Object.keys(useAppStore.getState().labels)).toHaveLength(2);
    });
  });
});
