import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { mockIPC } from "@tauri-apps/api/mocks";
import { useAutoRefresh } from "./useAutoRefresh";
import { useAppStore } from "../stores/appStore";
import { mockRepository, mockWorktree } from "../test/fixtures";

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
      return null;
    });
    mockIPC(invokeSpy as (cmd: string, args: unknown) => unknown);

    useAppStore.setState({
      repositories: [mockRepository({ path: "/mock/repo" })],
      selectedRepositoryId: "repo-1",
      worktrees: {},
      isRefreshing: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** invokeSpy から list_worktrees の呼び出しだけを抽出 */
  const listWorktreeCalls = () => invokeSpy.mock.calls.filter(([cmd]) => cmd === "list_worktrees");

  it("5秒間隔で list_worktrees を呼ぶ", async () => {
    renderHook(() => useAutoRefresh());

    // 初回は呼ばれない（interval のみ）
    expect(listWorktreeCalls()).toHaveLength(0);

    // 5秒後
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(listWorktreeCalls()).toHaveLength(1);
    expect(listWorktreeCalls()[0][1]).toEqual({ repositoryPath: "/mock/repo" });

    // 10秒後
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(listWorktreeCalls()).toHaveLength(2);
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
      vi.advanceTimersByTime(5000);
    });
    expect(listWorktreeCalls()).toHaveLength(1);

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    // unmount 後は呼ばれない
    expect(listWorktreeCalls()).toHaveLength(1);
  });

  it("refresh() を手動で呼べる", async () => {
    const { result } = renderHook(() => useAutoRefresh());

    // refresh を開始（内部で setTimeout を使うので即 await しない）
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

    expect(listWorktreeCalls()).toHaveLength(1);
    expect(done).toBe(true);
  });

  it("手動リフレッシュ時に isRefreshing が true になる", async () => {
    const { result } = renderHook(() => useAutoRefresh());

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

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(useAppStore.getState().isRefreshing).toBe(false);
  });

  it("手動リフレッシュ中はポーリングが skip される", async () => {
    // listWorktrees を長引かせて手動 refresh を実行中の状態にする
    let resolveList: (v: unknown) => void = () => {};
    invokeSpy.mockImplementation((cmd: string) => {
      if (cmd === "list_worktrees") {
        return new Promise((resolve) => {
          resolveList = resolve;
        });
      }
      return null;
    });

    const { result } = renderHook(() => useAutoRefresh());

    // 手動 refresh を開始（まだ resolve しない）
    let refreshPromise: Promise<void> | undefined;
    act(() => {
      refreshPromise = result.current.refresh();
    });
    expect(listWorktreeCalls()).toHaveLength(1);

    // 手動 refresh 中にポーリングが走っても skip される
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(listWorktreeCalls()).toHaveLength(1);

    // 手動 refresh を完了させる
    await act(async () => {
      resolveList([]);
      vi.advanceTimersByTime(500);
      await refreshPromise;
    });
  });
});
