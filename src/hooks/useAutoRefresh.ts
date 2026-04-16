import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "../stores/appStore";
import { fetchRepository, listWorktrees } from "../lib/tauri";
import { toastError } from "../lib/toast";
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
 * fetch 戦略（Issue #8 / ADR-0010）:
 * - ポーリング: listWorktrees のみ（ahead/behind は refs/remotes から再計算）
 * - 選択リポジトリ切替時: lastFetchedAt 未登録なら初回 fetch、登録済みなら skip
 * - 手動リフレッシュ: 必ず fetch（force=true）
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
  const setRefreshError = useAppStore((s) => s.setRefreshError);
  const setIsFetching = useAppStore((s) => s.setIsFetching);
  const setLastFetchedAt = useAppStore((s) => s.setLastFetchedAt);
  const setFetchError = useAppStore((s) => s.setFetchError);
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
      setRefreshError(null);
    } catch (e) {
      console.error("リフレッシュ失敗:", e);
      // 連続する同一エラーでトーストが繰り返し表示されるのを抑制する。
      // refreshError が null（= 直前は正常だった）のときだけトーストを出す。
      if (useAppStore.getState().refreshError === null) {
        toastError("worktree 一覧の取得に失敗しました");
      }
      setRefreshError(e instanceof Error ? e.message : String(e));
    }
  }, [setWorktrees, setRefreshError]);

  /**
   * 内部リフレッシュ（スピナーなし、ポーリング用）。
   * listWorktrees のみを呼び、fetch はしない。
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
   * listWorktrees → fetch →（成功時）再 listWorktrees の順で実行する。
   *
   * - **list を先に呼ぶ**: fetch が遅延 / hang しても画面は即出す。ahead/behind は
   *   前回の refs/remotes から計算された値（または未 fetch なら `null`）
   * - **fetch はベストエフォート**: `shouldFetch` のときだけ実行
   * - **成功時のみ再 list**: fetch 後に最新 refs で ahead/behind を更新。
   *   全失敗時は refs/remotes が変わっていないので再 list しない
   *
   * `force=false` の場合は `lastFetchedAt[repoId]` 未登録時のみ fetch。
   * `force=true`（手動リフレッシュ）は常に fetch を走らせる。
   *
   * @param force true なら lastFetchedAt の有無によらず必ず fetch する
   */
  const fetchAndRefresh = useCallback(
    async (force: boolean): Promise<void> => {
      const state = useAppStore.getState();
      const repo = state.repositories.find((r) => r.id === state.selectedRepositoryId);
      if (!repo) return;
      if (!force && inFlightRef.current) return;

      const alreadyFetched = state.lastFetchedAt[repo.id] !== undefined;
      const shouldFetch = force || !alreadyFetched;

      inFlightRef.current = true;
      try {
        // ① 先に list を走らせて画面を出す（fetch の hang に画面表示が引きずられない）
        await fetchAndStore();

        if (!shouldFetch) return;

        // ② fetch をベストエフォートで実行
        setIsFetching(true);
        let fetchSucceeded = false;
        try {
          const outcome = await fetchRepository(repo.path);
          setLastFetchedAt(repo.id, outcome.fetchedAt);
          if (outcome.failures.length > 0) {
            const message = `一部リモートの fetch に失敗しました: ${outcome.failures.join(", ")}`;
            // 同一メッセージの連続通知はトースト抑制（refreshError と同じ流儀）
            if (useAppStore.getState().fetchError !== message) {
              toastError(message);
            }
            setFetchError(message);
          } else {
            setFetchError(null);
          }
          // 部分失敗でも 1 つ以上 fetch できているので再 list する
          fetchSucceeded = true;
        } catch (e) {
          console.error("fetch 失敗:", e);
          const message = e instanceof Error ? e.message : String(e);
          if (useAppStore.getState().fetchError !== message) {
            toastError(`fetch に失敗しました: ${message}`);
          }
          setFetchError(message);
          // fetch 全失敗時は refs/remotes が更新されていないので再 list しない
        } finally {
          setIsFetching(false);
        }

        // ③ fetch が成功（or 部分成功）したら再度 list を呼んで ahead/behind を更新
        if (fetchSucceeded) {
          await fetchAndStore();
        }
      } finally {
        inFlightRef.current = false;
      }
    },
    [fetchAndStore, setIsFetching, setLastFetchedAt, setFetchError]
  );

  /**
   * 手動リフレッシュ（スピナー付き、最低表示時間 500ms 保証）。
   *
   * 必ず fetch + listWorktrees を実行する（force=true）。ユーザー操作起因のため
   * ポーリングと被っていても優先して走らせる。
   *
   * @returns スピナー表示時間 (≥500ms) 経過後に resolve
   */
  const refresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    const start = Date.now();
    try {
      await fetchAndRefresh(true);
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_SPIN_DURATION) {
        await new Promise((r) => setTimeout(r, MIN_SPIN_DURATION - elapsed));
      }
      setIsRefreshing(false);
    }
  }, [fetchAndRefresh, setIsRefreshing]);

  // 選択リポジトリ変更時の初回 fetch + ポーリング開始を 1 本の useEffect に集約
  useEffect(() => {
    if (!selectedRepositoryId) return;

    // 初回選択（lastFetchedAt 未登録）なら fetch + list、既に fetch 済みなら list のみ
    void fetchAndRefresh(false);
    // 以降のポーリングは listWorktrees のみ（fetch は手動リフレッシュ時のみ）
    const id = setInterval(silentRefresh, refreshInterval);
    return () => clearInterval(id);
  }, [selectedRepositoryId, silentRefresh, fetchAndRefresh, refreshInterval]);

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
