import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "../stores/appStore";
import { listWorktrees } from "../lib/tauri";

const MIN_SPIN_DURATION = 500; // 手動リフレッシュ時のスピナー最低表示時間（ms）

/**
 * 選択中リポジトリの worktree 一覧を定期的にリフレッシュする（ADR-0013）
 * ポーリング方式。M1 でファイル監視に移行予定。
 *
 * - マウント時 / 選択リポジトリ変更時に即時 1 回 fetch する
 * - 以降は refreshInterval ごとにポーリング
 * - refresh() は手動リフレッシュ用（スピナー付き）
 */
export function useAutoRefresh() {
  const selectedRepositoryId = useAppStore((s) => s.selectedRepositoryId);
  const refreshInterval = useAppStore((s) => s.refreshInterval);
  const setWorktrees = useAppStore((s) => s.setWorktrees);
  const setIsRefreshing = useAppStore((s) => s.setIsRefreshing);
  // listWorktrees が実行中かを追跡。手動 refresh とポーリングの同時実行を防ぐ。
  const inFlightRef = useRef(false);

  /** 現在選択中 repo の worktree を取得して store に反映するコア処理（スピナー制御なし） */
  const fetchAndStore = useCallback(async () => {
    const state = useAppStore.getState();
    const repo = state.repositories.find((r) => r.id === state.selectedRepositoryId);
    if (!repo) return;
    try {
      const wts = await listWorktrees(repo.path);
      setWorktrees(repo.id, wts);
    } catch (e) {
      console.error("リフレッシュ失敗:", e);
    }
  }, [setWorktrees]);

  /** 内部リフレッシュ（スピナーなし、ポーリング・初回 fetch 用） */
  const silentRefresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      await fetchAndStore();
    } finally {
      inFlightRef.current = false;
    }
  }, [fetchAndStore]);

  /** 手動リフレッシュ（スピナー付き、最低表示時間あり） */
  const refresh = useCallback(async () => {
    // inFlightRef は silent 側が同時実行を skip するために立てる。
    // 手動リフレッシュはユーザー操作なので silent と被っていても優先して走らせる。
    inFlightRef.current = true;
    setIsRefreshing(true);
    const start = Date.now();
    try {
      await fetchAndStore();
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_SPIN_DURATION) {
        await new Promise((r) => setTimeout(r, MIN_SPIN_DURATION - elapsed));
      }
      inFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, [fetchAndStore, setIsRefreshing]);

  // 選択リポジトリ変更時の即時 fetch + ポーリング開始を 1 本の useEffect に集約
  useEffect(() => {
    if (!selectedRepositoryId) return;

    silentRefresh();
    const id = setInterval(silentRefresh, refreshInterval);
    return () => clearInterval(id);
  }, [selectedRepositoryId, silentRefresh, refreshInterval]);

  return { refresh };
}
