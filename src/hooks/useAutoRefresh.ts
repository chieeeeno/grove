import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "../stores/appStore";
import { listWorktrees } from "../lib/tauri";

const DEFAULT_INTERVAL = 5000; // ADR-0013: 5秒間隔

/**
 * 選択中リポジトリの worktree 一覧を定期的にリフレッシュする（ADR-0013）
 * ポーリング方式。M1 でファイル監視に移行予定。
 */
export function useAutoRefresh() {
  const repositories = useAppStore((s) => s.repositories);
  const selectedRepositoryId = useAppStore((s) => s.selectedRepositoryId);
  const setWorktrees = useAppStore((s) => s.setWorktrees);
  const setIsRefreshing = useAppStore((s) => s.setIsRefreshing);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const repo = repositories.find((r) => r.id === selectedRepositoryId);
    if (!repo) return;

    setIsRefreshing(true);
    try {
      const wts = await listWorktrees(repo.path);
      setWorktrees(repo.id, wts);
    } catch (e) {
      console.error("自動リフレッシュ失敗:", e);
    } finally {
      setIsRefreshing(false);
    }
  }, [repositories, selectedRepositoryId, setWorktrees, setIsRefreshing]);

  // ポーリング開始・停止
  useEffect(() => {
    if (!selectedRepositoryId) return;

    intervalRef.current = setInterval(refresh, DEFAULT_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [selectedRepositoryId, refresh]);

  return { refresh };
}
