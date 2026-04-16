import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { mockIPC } from "@tauri-apps/api/mocks";
import { useAutoRefresh } from "./useAutoRefresh";
import { useAppStore } from "../stores/appStore";
import { mockRepository, mockWorktree } from "../test/fixtures";
import * as toastModule from "../lib/toast";

describe("useAutoRefresh", () => {
  let invokeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();

    // IPC を mockIPC でインターセプト
    // spy できるように vi.fn() でラップし、コマンドごとに振り分ける
    invokeSpy = vi.fn((cmd: string, _args: unknown) => {
      if (cmd === "list_worktrees") {
        return [mockWorktree()];
      }
      if (cmd === "fetch_repository") {
        return { fetchedAt: 123, remoteCount: 0, failures: [] };
      }
      return null;
    });
    mockIPC(invokeSpy as (cmd: string, args: unknown) => unknown);

    vi.spyOn(toastModule, "toastError").mockImplementation(() => {});

    useAppStore.setState({
      repositories: [mockRepository({ path: "/mock/repo" })],
      selectedRepositoryId: "repo-1",
      worktrees: {},
      isRefreshing: false,
      refreshError: null,
      lastFetchedAt: {},
      isFetching: false,
      fetchError: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** invokeSpy から list_worktrees の呼び出しだけを抽出 */
  const listWorktreeCalls = () => invokeSpy.mock.calls.filter(([cmd]) => cmd === "list_worktrees");

  it("マウント時に即時 fetch + 5秒間隔でポーリングする", async () => {
    renderHook(() => useAutoRefresh());

    // list → fetch → list の 3 段階を全て解決させるため microtask を複数回進める
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(listWorktreeCalls()).toHaveLength(2);
    expect(listWorktreeCalls()[0][1]).toEqual({ repositoryPath: "/mock/repo" });

    // 5 秒後のポーリングは silentRefresh（list のみ、fetch なし）で +1
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(listWorktreeCalls()).toHaveLength(3);

    // 10 秒後で +1
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(listWorktreeCalls()).toHaveLength(4);
  });

  it("selectedRepositoryId が null の場合はポーリングしない", async () => {
    useAppStore.setState({ selectedRepositoryId: null });

    renderHook(() => useAutoRefresh());

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    expect(listWorktreeCalls()).toHaveLength(0);
  });

  it("unmount 時に clearInterval する", async () => {
    const { unmount } = renderHook(() => useAutoRefresh());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(listWorktreeCalls()).toHaveLength(2);

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    // unmount 後は呼ばれない
    expect(listWorktreeCalls()).toHaveLength(2);
  });

  it("refresh() を手動で呼べる", async () => {
    const { result } = renderHook(() => useAutoRefresh());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(listWorktreeCalls()).toHaveLength(2);

    // 手動 refresh（list → fetch → list で +2 回、MIN_SPIN_DURATION 500ms 待つ）
    let done = false;
    act(() => {
      result.current.refresh().then(() => {
        done = true;
      });
    });

    // fake timer を進めて最低表示時間の setTimeout を解決
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(listWorktreeCalls()).toHaveLength(4);
    expect(done).toBe(true);
  });

  it("手動リフレッシュ時に isRefreshing が true になる", async () => {
    const { result } = renderHook(() => useAutoRefresh());

    // 初回の即時 fetch を解決（これ自体は isRefreshing を触らない）
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.refresh();
    });

    // 呼んだ直後は true
    expect(useAppStore.getState().isRefreshing).toBe(true);

    // 500ms 経過で false に戻る
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(useAppStore.getState().isRefreshing).toBe(false);
  });

  it("ポーリングでは isRefreshing を変更しない", async () => {
    renderHook(() => useAutoRefresh());

    // 初回の即時 fetch とそれ以降のポーリングのいずれも isRefreshing を触らない
    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(5000);
    });

    expect(useAppStore.getState().isRefreshing).toBe(false);
  });

  it("手動リフレッシュ中はポーリングが skip される", async () => {
    // listWorktrees を pending にして inFlightRef を立てたまま維持し、
    // その状態でポーリングが skip されることを検証する。
    invokeSpy.mockImplementation((cmd: string) => {
      if (cmd === "list_worktrees") {
        return new Promise(() => {
          // 意図的に resolve しない（inFlightRef が解除されない）
        });
      }
      if (cmd === "fetch_repository") {
        return { fetchedAt: 123, remoteCount: 0, failures: [] };
      }
      return null;
    });

    renderHook(() => useAutoRefresh());

    // 1 回目の list が pending のまま止まるので fetch まで到達しない
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(listWorktreeCalls()).toHaveLength(1);

    // pending 中にポーリングが走っても skip される
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(listWorktreeCalls()).toHaveLength(1);

    // さらにもう 1 ラウンド
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(listWorktreeCalls()).toHaveLength(1);
  });

  describe("エラー通知", () => {
    it("リフレッシュ失敗時にトーストが 1 回表示される", async () => {
      invokeSpy.mockImplementation((cmd: string) => {
        if (cmd === "list_worktrees") {
          return Promise.reject(new Error("接続エラー"));
        }
        if (cmd === "fetch_repository") {
          return { fetchedAt: 123, remoteCount: 0, failures: [] };
        }
        return null;
      });

      renderHook(() => useAutoRefresh());

      await act(async () => {
        await Promise.resolve();
      });

      expect(toastModule.toastError).toHaveBeenCalledWith("worktree 一覧の取得に失敗しました");
      expect(useAppStore.getState().refreshError).toBe("接続エラー");
    });

    it("連続エラー時にポーリングではトーストが抑制される", async () => {
      invokeSpy.mockImplementation((cmd: string) => {
        if (cmd === "list_worktrees") {
          return Promise.reject(new Error("接続エラー"));
        }
        if (cmd === "fetch_repository") {
          return { fetchedAt: 123, remoteCount: 0, failures: [] };
        }
        return null;
      });

      renderHook(() => useAutoRefresh());

      // 初回 fetch でエラー → refreshError がセットされる
      await act(async () => {
        await Promise.resolve();
      });
      expect(useAppStore.getState().refreshError).toBe("接続エラー");

      // 初回分のカウントを記録してから、ポーリングで増えないことを確認
      const countAfterMount = vi.mocked(toastModule.toastError).mock.calls.length;

      // ポーリング（refreshError が既にセット済みなのでトースト抑制）
      await act(async () => {
        vi.advanceTimersByTime(5000);
        await Promise.resolve();
      });
      expect(toastModule.toastError).toHaveBeenCalledTimes(countAfterMount);
    });

    it("成功後に refreshError がクリアされる", async () => {
      // まずエラーを起こす
      useAppStore.setState({ refreshError: "前回のエラー" });

      renderHook(() => useAutoRefresh());

      // 成功する fetch（デフォルト mock は成功を返す）
      await act(async () => {
        await Promise.resolve();
      });

      expect(useAppStore.getState().refreshError).toBeNull();
    });
  });

  describe("fetch 統合", () => {
    const fetchCalls = () => invokeSpy.mock.calls.filter(([cmd]) => cmd === "fetch_repository");

    it("初回選択時に fetch_repository が呼ばれ、lastFetchedAt が記録される", async () => {
      renderHook(() => useAutoRefresh());
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(fetchCalls()).toHaveLength(1);
      expect(fetchCalls()[0][1]).toEqual({ repositoryPath: "/mock/repo" });
      expect(useAppStore.getState().lastFetchedAt["repo-1"]).toBe(123);
    });

    it("fetch pending 中でも listWorktrees が先に呼ばれる（画面表示を阻害しない）", async () => {
      // fetch を pending にしても、list は先に呼ばれて画面が出ることを検証
      invokeSpy.mockImplementation((cmd: string) => {
        if (cmd === "list_worktrees") return [mockWorktree()];
        if (cmd === "fetch_repository") {
          return new Promise(() => {
            // 意図的に resolve しない
          });
        }
        return null;
      });

      renderHook(() => useAutoRefresh());
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      // fetch は pending だが、list は先に 1 回呼ばれている
      expect(listWorktreeCalls()).toHaveLength(1);
      expect(fetchCalls()).toHaveLength(1);
      // store にも worktrees がセットされている（画面表示可能な状態）
      expect(useAppStore.getState().worktrees["repo-1"]).toHaveLength(1);
    });

    it("fetch 成功後に listWorktrees が再度呼ばれる（ahead/behind 更新）", async () => {
      renderHook(() => useAutoRefresh());
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // 初回マウントで list が 2 回呼ばれる（画面表示用 + fetch 後の更新用）
      expect(listWorktreeCalls()).toHaveLength(2);
      expect(fetchCalls()).toHaveLength(1);
    });

    it("ポーリングでは fetch_repository は呼ばれない", async () => {
      renderHook(() => useAutoRefresh());
      await act(async () => {
        await Promise.resolve();
      });
      const beforePollCount = fetchCalls().length;

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(fetchCalls().length).toBe(beforePollCount);
    });

    it("既に lastFetchedAt が登録されていればマウント時の fetch は skip される", async () => {
      useAppStore.setState({ lastFetchedAt: { "repo-1": 100 } });

      renderHook(() => useAutoRefresh());
      await act(async () => {
        await Promise.resolve();
      });

      expect(fetchCalls()).toHaveLength(0);
      // list_worktrees は呼ばれる
      expect(listWorktreeCalls()).toHaveLength(1);
    });

    it("手動リフレッシュでは lastFetchedAt の有無によらず必ず fetch される", async () => {
      useAppStore.setState({ lastFetchedAt: { "repo-1": 100 } });

      const { result } = renderHook(() => useAutoRefresh());
      await act(async () => {
        await Promise.resolve();
      });
      expect(fetchCalls()).toHaveLength(0);

      act(() => {
        result.current.refresh();
      });
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(fetchCalls()).toHaveLength(1);
    });

    it("fetch 部分失敗（failures あり）でトースト通知と fetchError セット", async () => {
      invokeSpy.mockImplementation((cmd: string) => {
        if (cmd === "list_worktrees") return [mockWorktree()];
        if (cmd === "fetch_repository") {
          return { fetchedAt: 123, remoteCount: 1, failures: ["origin: timeout"] };
        }
        return null;
      });

      renderHook(() => useAutoRefresh());
      await act(async () => {
        await Promise.resolve();
      });

      expect(toastModule.toastError).toHaveBeenCalledWith(
        expect.stringContaining("origin: timeout")
      );
      expect(useAppStore.getState().fetchError).toContain("origin: timeout");
    });

    it("fetch 全失敗（reject）でトースト通知と fetchError セット、listWorktrees は続行", async () => {
      invokeSpy.mockImplementation((cmd: string) => {
        if (cmd === "list_worktrees") return [mockWorktree()];
        if (cmd === "fetch_repository") {
          return Promise.reject(new Error("すべての fetch に失敗しました: origin: boom"));
        }
        return null;
      });

      renderHook(() => useAutoRefresh());
      await act(async () => {
        await Promise.resolve();
      });

      expect(toastModule.toastError).toHaveBeenCalledWith(
        expect.stringContaining("fetch に失敗しました")
      );
      expect(useAppStore.getState().fetchError).toContain("すべての fetch に失敗しました");
      // fetch が失敗しても listWorktrees は呼ばれる
      expect(listWorktreeCalls()).toHaveLength(1);
    });

    it("fetch 成功（failures 空）で fetchError がクリアされる", async () => {
      useAppStore.setState({ fetchError: "前回の失敗" });

      renderHook(() => useAutoRefresh());
      await act(async () => {
        await Promise.resolve();
      });

      expect(useAppStore.getState().fetchError).toBeNull();
    });

    it("fetch 実行中は isFetching が true になる", async () => {
      invokeSpy.mockImplementation((cmd: string) => {
        if (cmd === "list_worktrees") return [mockWorktree()];
        if (cmd === "fetch_repository") {
          return new Promise(() => {
            // 意図的に resolve しない
          });
        }
        return null;
      });

      renderHook(() => useAutoRefresh());
      // list が解決してから fetch が開始されるタイミングまで microtask を進める
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(useAppStore.getState().isFetching).toBe(true);
    });
  });
});
