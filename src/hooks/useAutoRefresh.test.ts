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

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockListWorktrees).toHaveBeenCalledTimes(1);
  });
});
