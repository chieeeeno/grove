import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "../stores/appStore";
import { listWorktrees } from "../lib/tauri";

const MIN_SPIN_DURATION = 500; // 手動リフレッシュ時のスピナー最低表示時間（ms）

/**
 * 選択中リポジトリの worktree 一覧を定期的にリフレッシュする（ADR-0013）
 * ポーリング方式。M1 でファイル監視に移行予定。
 */
export function useAutoRefresh() {
  const repositories = useAppStore((s) => s.repositories);
  const selectedRepositoryId = useAppStore((s) => s.selectedRepositoryId);
  const setWorktrees = useAppStore((s) => s.setWorktrees);
  const refreshInterval = useAppStore((s) => s.refreshInterval);
  const setIsRefreshing = useAppStore((s) => s.setIsRefreshing);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 内部リフレッシュ（スピナーなし、ポーリング用） */
  const silentRefresh = useCallback(async () => {
    const repo = repositories.find((r) => r.id === selectedRepositoryId);
    if (!repo) return;

    try {
      const wts = await listWorktrees(repo.path);
      setWorktrees(repo.id, wts);
    } catch (e) {
      console.error("自動リフレッシュ失敗:", e);
    }
  }, [repositories, selectedRepositoryId, setWorktrees]);

  /** 手動リフレッシュ（スピナー付き、最低表示時間あり） */
  const refresh = useCallback(async () => {
    const repo = repositories.find((r) => r.id === selectedRepositoryId);
    if (!repo) return;

    setIsRefreshing(true);
    const start = Date.now();
    try {
      const wts = await listWorktrees(repo.path);
      setWorktrees(repo.id, wts);
    } catch (e) {
      console.error("リフレッシュ失敗:", e);
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_SPIN_DURATION) {
        await new Promise((r) => setTimeout(r, MIN_SPIN_DURATION - elapsed));
      }
      setIsRefreshing(false);
    }
  }, [repositories, selectedRepositoryId, setWorktrees, setIsRefreshing]);

  // ポーリング（スピナーなし）
  useEffect(() => {
    if (!selectedRepositoryId) return;

    intervalRef.current = setInterval(silentRefresh, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [selectedRepositoryId, silentRefresh, refreshInterval]);

  return { refresh };
}
