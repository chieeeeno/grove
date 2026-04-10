import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoRefresh } from "./useAutoRefresh";
import { useAppStore } from "../stores/appStore";

// listWorktrees のモック
const mockListWorktrees = vi.fn();
vi.mock("../lib/tauri", () => ({
  listWorktrees: (...args: unknown[]) => mockListWorktrees(...args),
}));

describe("useAutoRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockListWorktrees.mockClear();
    mockListWorktrees.mockResolvedValue([
      {
        path: "/mock/main",
        branch: "main",
        isMain: true,
        head: "abc",
        lastCommitMessage: "init",
        lastCommitTime: 0,
        modifiedCount: 0,
      },
    ]);
    useAppStore.setState({
      repositories: [
        {
          id: "repo-1",
          name: "test",
          path: "/mock/repo",
          addedAt: "2026-04-10T00:00:00Z",
        },
      ],
      selectedRepositoryId: "repo-1",
      worktrees: {},
      isRefreshing: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("5秒間隔で listWorktrees を呼ぶ", async () => {
    renderHook(() => useAutoRefresh());

    // 初回は呼ばれない（interval のみ）
    expect(mockListWorktrees).not.toHaveBeenCalled();

    // 5秒後
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockListWorktrees).toHaveBeenCalledTimes(1);
    expect(mockListWorktrees).toHaveBeenCalledWith("/mock/repo");

    // 10秒後
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockListWorktrees).toHaveBeenCalledTimes(2);
  });

  it("selectedRepositoryId が null の場合はポーリングしない", async () => {
    useAppStore.setState({ selectedRepositoryId: null });

    renderHook(() => useAutoRefresh());

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    expect(mockListWorktrees).not.toHaveBeenCalled();
  });

  it("unmount 時に clearInterval する", async () => {
    const { unmount } = renderHook(() => useAutoRefresh());

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockListWorktrees).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    // unmount 後は呼ばれない
    expect(mockListWorktrees).toHaveBeenCalledTimes(1);
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

    expect(mockListWorktrees).toHaveBeenCalledTimes(1);
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
});
