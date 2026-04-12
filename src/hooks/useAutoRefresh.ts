import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "../stores/appStore";
import { listWorktrees } from "../lib/tauri";
import type { RepositoryConfig } from "../types";

const MIN_SPIN_DURATION = 500; // 手動リフレッシュ時のスピナー最低表示時間（ms）

/**
 * 選択中リポジトリの worktree 一覧を定期的にリフレッシュするフック（ADR-0013）。
 *
 * 5 秒ポーリング方式で、M1 以降はファイル監視に移行予定。
 * マウント時および `selectedRepositoryId` 変更時に即時 1 回 fetch し、以降は
 * `refreshInterval` ごとにポーリングする。`refresh()` はユーザーの手動リフレッシュ
 * 用（Cmd+R / リフレッシュボタン）でスピナー制御を伴う。
 *
 * ポーリングと手動 refresh の競合は `inFlightRef` でガード:
 * - 手動 refresh は silent と被っていても優先して走る
 * - silent ポーリングは inFlight 中ならスキップする
 *
 * エラーは `console.error` でログするだけで throw しない。
 *
 * @returns `refresh` 関数を持つオブジェクト。呼ぶと手動リフレッシュが走り、
 *          スピナーが最低 500ms 表示される
 */
export function useAutoRefresh(): {
  refresh: () => Promise<void>;
  prefetchAll: (repos: RepositoryConfig[], selectedId: string | null) => void;
} {
  const selectedRepositoryId = useAppStore((s) => s.selectedRepositoryId);
  const refreshInterval = useAppStore((s) => s.refreshInterval);
  const setWorktrees = useAppStore((s) => s.setWorktrees);
  const setIsRefreshing = useAppStore((s) => s.setIsRefreshing);
  /** listWorktrees 実行中かどうか。手動 refresh とポーリングの同時実行を防ぐ。 */
  const inFlightRef = useRef(false);

  /**
   * 現在選択中 repo の worktree を取得して store に反映するコア処理。
   * スピナー制御・inFlight 管理は行わない。エラーはログだけ。
   *
   * @returns fetch と store 反映が完了したら resolve
   */
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

  /**
   * 内部リフレッシュ（スピナーなし、ポーリング・初回 fetch 用）。
   *
   * 既に実行中（inFlightRef = true）ならサイレントにスキップする。
   *
   * @returns 完了時に resolve
   */
  const silentRefresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      await fetchAndStore();
    } finally {
      inFlightRef.current = false;
    }
  }, [fetchAndStore]);

  /**
   * 手動リフレッシュ（スピナー付き、最低表示時間 500ms 保証）。
   *
   * `inFlightRef` は silent 側が同時実行を skip するためにこちらでも立てるが、
   * 手動リフレッシュはユーザー操作なので silent と被っていても優先して走らせる
   * （inFlightRef が立っていても中断しない）。
   *
   * @returns スピナー表示時間 (≥500ms) 経過後に resolve
   */
  const refresh = useCallback(async (): Promise<void> => {
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

  /**
   * 選択中以外のリポジトリの worktree を裏で pre-fetch する。
   * 初回リポジトリ切り替え時にキャッシュヒットさせてラグを解消する。
   * 選択中リポジトリは silentRefresh が担当するので skip する。
   */
  const prefetchAll = useCallback(
    (repos: RepositoryConfig[], selectedId: string | null) => {
      for (const repo of repos) {
        if (repo.id === selectedId) continue;
        listWorktrees(repo.path)
          .then((wts) => setWorktrees(repo.id, wts))
          .catch(console.error);
      }
    },
    [setWorktrees]
  );

  return { refresh, prefetchAll };
}
