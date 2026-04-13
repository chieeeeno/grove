import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./appStore";

describe("appStore", () => {
  beforeEach(() => {
    // store をリセット
    useAppStore.setState({
      repositories: [],
      selectedRepositoryId: null,
      worktrees: {},
      worktreeOrder: {},
      labels: {},
      theme: "system",
      codeAvailable: false,
      isRefreshing: false,
      refreshError: null,
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

    it("removeRepository で worktrees マップからも該当エントリが消える", () => {
      useAppStore.getState().addRepository(mockRepo);
      useAppStore.getState().setWorktrees("repo-1", [
        {
          path: "/path/wt",
          branch: "main",
          isMain: true,
          head: "abc",
          lastCommitMessage: "init",
          lastCommitTime: 0,
          modifiedCount: 0,
        },
      ]);
      expect(useAppStore.getState().worktrees["repo-1"]).toHaveLength(1);

      useAppStore.getState().removeRepository("repo-1");
      expect(useAppStore.getState().worktrees["repo-1"]).toBeUndefined();
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

    it("setWorktrees: 同じ内容なら参照を変えない（差分検出）", () => {
      useAppStore.getState().setWorktrees("repo-1", mockWorktrees);
      const before = useAppStore.getState().worktrees["repo-1"];

      // 新しい配列だが内容は同じ（ポーリングの典型ケース）
      const sameContent = mockWorktrees.map((w) => ({ ...w }));
      useAppStore.getState().setWorktrees("repo-1", sameContent);
      const after = useAppStore.getState().worktrees["repo-1"];

      expect(after).toBe(before);
    });

    it("setWorktrees: 内容が変わった場合は新しい参照に入れ替わる", () => {
      useAppStore.getState().setWorktrees("repo-1", mockWorktrees);
      const before = useAppStore.getState().worktrees["repo-1"];

      // modifiedCount が変化
      const changed = [{ ...mockWorktrees[0] }, { ...mockWorktrees[1], modifiedCount: 5 }];
      useAppStore.getState().setWorktrees("repo-1", changed);
      const after = useAppStore.getState().worktrees["repo-1"];

      expect(after).not.toBe(before);
      expect(after[1].modifiedCount).toBe(5);
    });
  });

  describe("並び順管理", () => {
    it("setWorktreeOrder で並び順を保存できる", () => {
      const order = ["/path/wt-1", "/path/wt-2"];
      useAppStore.getState().setWorktreeOrder("repo-1", order);
      expect(useAppStore.getState().worktreeOrder["repo-1"]).toEqual(order);
    });

    it("setAllWorktreeOrder で一括設定できる", () => {
      const allOrder = {
        "repo-a": ["/path/a-1", "/path/a-2"],
        "repo-b": ["/path/b-1"],
      };
      useAppStore.getState().setAllWorktreeOrder(allOrder);
      expect(useAppStore.getState().worktreeOrder).toEqual(allOrder);
    });

    it("removeWorktreeOrder で指定リポジトリの並び順を削除できる", () => {
      useAppStore.getState().setWorktreeOrder("repo-1", ["/path/wt-1"]);
      useAppStore.getState().setWorktreeOrder("repo-2", ["/path/wt-2"]);
      useAppStore.getState().removeWorktreeOrder("repo-1");

      expect(useAppStore.getState().worktreeOrder["repo-1"]).toBeUndefined();
      expect(useAppStore.getState().worktreeOrder["repo-2"]).toEqual(["/path/wt-2"]);
    });

    it("removeRepository で worktreeOrder からも該当エントリが消える", () => {
      useAppStore.getState().addRepository({
        id: "repo-1",
        name: "test",
        path: "/path/to/repo",
        addedAt: "2026-04-10T00:00:00Z",
      });
      useAppStore.getState().setWorktreeOrder("repo-1", ["/path/wt-1"]);

      useAppStore.getState().removeRepository("repo-1");
      expect(useAppStore.getState().worktreeOrder["repo-1"]).toBeUndefined();
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

  describe("テーマ管理", () => {
    it("初期値は system", () => {
      expect(useAppStore.getState().theme).toBe("system");
    });

    it("setTheme で dark に変更できる", () => {
      useAppStore.getState().setTheme("dark");
      expect(useAppStore.getState().theme).toBe("dark");
    });

    it("setTheme で light に変更できる", () => {
      useAppStore.getState().setTheme("light");
      expect(useAppStore.getState().theme).toBe("light");
    });

    it("setTheme で system に戻せる", () => {
      useAppStore.getState().setTheme("dark");
      useAppStore.getState().setTheme("system");
      expect(useAppStore.getState().theme).toBe("system");
    });
  });

  describe("refreshError 管理", () => {
    it("初期値は null", () => {
      expect(useAppStore.getState().refreshError).toBeNull();
    });

    it("setRefreshError でエラーメッセージをセットできる", () => {
      useAppStore.getState().setRefreshError("リフレッシュ失敗");
      expect(useAppStore.getState().refreshError).toBe("リフレッシュ失敗");
    });

    it("setRefreshError(null) でクリアできる", () => {
      useAppStore.getState().setRefreshError("リフレッシュ失敗");
      useAppStore.getState().setRefreshError(null);
      expect(useAppStore.getState().refreshError).toBeNull();
    });
  });
});
