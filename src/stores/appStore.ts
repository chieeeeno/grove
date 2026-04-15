import { create } from "zustand";
import type { RepositoryConfig, TerminalApp, WorktreeInfo } from "../types";

/**
 * 2 つの worktree 配列が内容的に同一かを判定する。
 *
 * ポーリングで変化ゼロのときに再レンダーを起こさないために使う差分検出用。
 * 比較対象は UI に影響するフィールドのみ（ADR-0011 に基づく）。
 *
 * @param a 比較対象の配列 A
 * @param b 比較対象の配列 B
 * @returns 同一なら true、一要素でも差分があれば false
 */
function worktreesEqual(a: WorktreeInfo[], b: WorktreeInfo[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.path !== y.path ||
      x.branch !== y.branch ||
      x.isMain !== y.isMain ||
      x.head !== y.head ||
      x.lastCommitTime !== y.lastCommitTime ||
      x.lastCommitMessage !== y.lastCommitMessage ||
      x.modifiedCount !== y.modifiedCount ||
      x.isMerged !== y.isMerged
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Grove のグローバル state。
 *
 * リポジトリ/worktree/ラベル/設定/UI 状態を一元管理する。tauri-plugin-store への
 * 永続化は行わず、永続化が必要なエントリは呼び出し側で tauri IPC（`saveConfig` /
 * `saveLabel` 等）とセットで呼ぶ設計。
 */
interface AppStore {
  // ===== リポジトリ =====

  /** 登録済みリポジトリ一覧（サイドバー表示順と一致） */
  repositories: RepositoryConfig[];
  /** 現在選択中のリポジトリ ID。未選択時は null */
  selectedRepositoryId: string | null;

  /**
   * リポジトリ一覧を全置換する。
   * @param repos 置換後のリポジトリ配列
   */
  setRepositories: (repos: RepositoryConfig[]) => void;

  /**
   * リポジトリを末尾に追加する（重複チェックなし。呼び出し側で確認する責務）。
   * @param repo 追加するリポジトリ
   */
  addRepository: (repo: RepositoryConfig) => void;

  /**
   * リポジトリを ID で削除する。
   * 該当する `worktrees[id]` エントリも同時に除去される（メモリリーク防止）。
   * 選択中だった場合のフォールバック選択は行わないので、呼び出し側で `selectRepository` する。
   * @param id 削除対象のリポジトリ ID
   */
  removeRepository: (id: string) => void;

  /**
   * 選択中リポジトリを変更する。
   * @param id 新しい選択 ID。`null` を渡すと選択解除
   */
  selectRepository: (id: string | null) => void;

  // ===== Worktree =====

  /**
   * リポジトリ ID をキーにした worktree リストのマップ。
   * key: repositoryId, value: worktree 配列
   */
  worktrees: Record<string, WorktreeInfo[]>;

  /**
   * 指定リポジトリの worktree 一覧を差し替える。
   *
   * 既存の配列と内容が同一の場合（`worktreesEqual` で判定）は state を変更しない。
   * これにより参照が安定し、React の `useMemo` や `React.memo` 経由で下流の
   * 再レンダーを抑制できる（ポーリングの no-op 最適化）。
   *
   * @param repositoryId 対象のリポジトリ ID
   * @param worktrees 新しい worktree 配列
   */
  setWorktrees: (repositoryId: string, worktrees: WorktreeInfo[]) => void;

  /**
   * 指定 repo の worktree リストから、指定 path のエントリだけを除去する。
   * worktree 削除後に store を最新化するために使う。
   *
   * @param repositoryId 対象のリポジトリ ID
   * @param worktreePath 除去する worktree の絶対パス
   */
  removeWorktreeEntry: (repositoryId: string, worktreePath: string) => void;

  // ===== 並び順 =====

  /** リポジトリ ID ごとの worktree 表示順（key: repositoryId, value: worktree 絶対パス配列） */
  worktreeOrder: Record<string, string[]>;

  /**
   * 指定リポジトリの worktree 並び順を in-memory で設定する。
   * 永続化は呼び出し側で `saveOrder` IPC とセットで行う。
   *
   * @param repositoryId 対象のリポジトリ ID
   * @param order worktree 絶対パスの配列（表示したい順番）
   */
  setWorktreeOrder: (repositoryId: string, order: string[]) => void;

  /**
   * 全リポジトリの並び順を全置換する。起動時に `loadOrder` IPC の結果を流し込む用途。
   * @param order 新しい並び順マップ
   */
  setAllWorktreeOrder: (order: Record<string, string[]>) => void;

  /**
   * 指定リポジトリの並び順データを in-memory から除去する。
   * リポジトリ削除時の連動用。永続化は別途 `deleteOrder` IPC で行う。
   *
   * @param repositoryId 削除対象のリポジトリ ID
   */
  removeWorktreeOrder: (repositoryId: string) => void;

  // ===== ラベル（worktree 絶対パスをキー、ADR-0008） =====

  /** ユーザー設定ラベルのマップ（key: worktree 絶対パス、value: ラベル文字列） */
  labels: Record<string, string>;

  /**
   * 単一 worktree のラベルを in-memory で設定する。
   *
   * この関数は store のみ更新し、tauri-plugin-store への永続化は行わない。
   * 永続化が必要な呼び出し側は `saveLabel` IPC とセットで呼ぶこと
   * （`App.tsx` の `handleSaveLabel` 参照）。
   *
   * @param worktreePath 対象 worktree の絶対パス
   * @param label ラベル文字列
   */
  setLabel: (worktreePath: string, label: string) => void;

  /**
   * 単一 worktree のラベルを in-memory で削除する。永続化は別途 `deleteLabel` IPC で行う。
   * @param worktreePath 対象 worktree の絶対パス
   */
  removeLabel: (worktreePath: string) => void;

  /**
   * ラベルマップを全置換する。起動時に `loadLabels` IPC の結果を流し込む用途。
   * @param labels 新しいラベルマップ
   */
  setAllLabels: (labels: Record<string, string>) => void;

  // ===== 設定 =====

  /**
   * UI テーマ設定。`"system"` の場合は OS のダーク/ライト設定に追従する。
   * 実際の適用は `useTheme` フックが担当し、store は設定値の保持のみ行う。
   */
  theme: "system" | "dark" | "light";
  /**
   * テーマ設定を変更する（in-memory のみ。永続化は `saveConfig` IPC で別途行う）。
   * @param v 新しいテーマ設定
   */
  setTheme: (v: "system" | "dark" | "light") => void;

  /** worktree ポーリング間隔（ミリ秒、ADR-0013 で既定 5000ms） */
  refreshInterval: number;
  /**
   * ポーリング間隔を変更する（in-memory のみ。永続化は `saveConfig` IPC で別途行う）。
   * @param v 新しい間隔（ms）
   */
  setRefreshInterval: (v: number) => void;

  // ===== UI 状態 =====

  /** `code` コマンドが利用可能か（ADR-0012 preflight 用。起動時に 1 回判定） */
  codeAvailable: boolean;
  /** @param v `code` コマンドの利用可否 */
  setCodeAvailable: (v: boolean) => void;

  /** 検出済みターミナルアプリ一覧（起動時に `detect_installed_terminals` で取得） */
  installedTerminals: TerminalApp[];
  /**
   * 検出済みターミナルアプリ一覧を設定する。
   * `terminalAvailable` も連動して更新される（1 件以上あれば true）。
   * @param terminals 検出されたターミナルアプリ配列
   */
  setInstalledTerminals: (terminals: TerminalApp[]) => void;

  /** 選択中のターミナルアプリ識別子（`AppConfig.terminal` と同期） */
  selectedTerminal: string;
  /**
   * 選択中のターミナルアプリを変更する（in-memory のみ。永続化は `saveConfig` IPC で別途行う）。
   * @param id ターミナルアプリ識別子
   */
  setSelectedTerminal: (id: string) => void;

  /** ターミナルアプリが利用可能か（ADR-0012 preflight 用。`installedTerminals.length > 0` の派生値） */
  terminalAvailable: boolean;

  /** 手動リフレッシュ実行中フラグ（スピナー表示用） */
  isRefreshing: boolean;
  /** @param v リフレッシュ中なら true */
  setIsRefreshing: (v: boolean) => void;

  /**
   * 最新のリフレッシュエラーメッセージ。
   *
   * ポーリングエラーが発生したときにセットし、連続する同一エラーでトーストが
   * 繰り返し表示されるのを抑制するために使う。fetch 成功時に `null` にリセットする。
   */
  refreshError: string | null;
  /**
   * リフレッシュエラー状態を設定する。
   * @param msg エラーメッセージ、またはクリア時は `null`
   */
  setRefreshError: (msg: string | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // リポジトリ
  repositories: [],
  selectedRepositoryId: null,
  setRepositories: (repos) => set({ repositories: repos }),
  addRepository: (repo) => set((s) => ({ repositories: [...s.repositories, repo] })),
  removeRepository: (id) =>
    set((s) => {
      // worktrees・worktreeOrder マップからも該当エントリを掃除する（メモリリーク防止）
      const { [id]: _removed, ...remainingWorktrees } = s.worktrees;
      const { [id]: _removedOrder, ...remainingOrder } = s.worktreeOrder;
      return {
        repositories: s.repositories.filter((r) => r.id !== id),
        worktrees: remainingWorktrees,
        worktreeOrder: remainingOrder,
      };
    }),
  selectRepository: (id) => set({ selectedRepositoryId: id }),

  // Worktree
  worktrees: {},
  setWorktrees: (repositoryId, worktrees) =>
    set((s) => {
      // 差分がなければ state を変更しない（ポーリング時の無駄な再レンダー防止）
      const existing = s.worktrees[repositoryId];
      if (existing && worktreesEqual(existing, worktrees)) {
        return s;
      }
      return { worktrees: { ...s.worktrees, [repositoryId]: worktrees } };
    }),
  removeWorktreeEntry: (repositoryId, worktreePath) =>
    set((s) => ({
      worktrees: {
        ...s.worktrees,
        [repositoryId]: (s.worktrees[repositoryId] ?? []).filter((w) => w.path !== worktreePath),
      },
    })),

  // 並び順
  worktreeOrder: {},
  setWorktreeOrder: (repositoryId, order) =>
    set((s) => {
      const existing = s.worktreeOrder[repositoryId];
      if (
        existing &&
        existing.length === order.length &&
        existing.every((p, i) => p === order[i])
      ) {
        return s;
      }
      return { worktreeOrder: { ...s.worktreeOrder, [repositoryId]: order } };
    }),
  setAllWorktreeOrder: (order) => set({ worktreeOrder: order }),
  removeWorktreeOrder: (repositoryId) =>
    set((s) => {
      const { [repositoryId]: _removed, ...rest } = s.worktreeOrder;
      return { worktreeOrder: rest };
    }),

  // ラベル
  labels: {},
  setLabel: (worktreePath, label) =>
    set((s) => ({ labels: { ...s.labels, [worktreePath]: label } })),
  removeLabel: (worktreePath) =>
    set((s) => {
      const next = { ...s.labels };
      delete next[worktreePath];
      return { labels: next };
    }),
  setAllLabels: (labels) => set({ labels }),

  // 設定
  theme: "system",
  setTheme: (v) => set((s) => (s.theme === v ? s : { theme: v })),
  refreshInterval: 5000,
  setRefreshInterval: (v) => set({ refreshInterval: v }),

  // UI
  codeAvailable: false,
  setCodeAvailable: (v) => set((s) => (s.codeAvailable === v ? s : { codeAvailable: v })),
  installedTerminals: [],
  setInstalledTerminals: (terminals) =>
    set({ installedTerminals: terminals, terminalAvailable: terminals.length > 0 }),
  selectedTerminal: "",
  setSelectedTerminal: (id) =>
    set((s) => (s.selectedTerminal === id ? s : { selectedTerminal: id })),
  terminalAvailable: false,
  isRefreshing: false,
  setIsRefreshing: (v) => set({ isRefreshing: v }),

  refreshError: null,
  setRefreshError: (msg) => set((s) => (s.refreshError === msg ? s : { refreshError: msg })),
}));

/**
 * 実効ターミナル ID を導出するセレクタ。
 *
 * `selectedTerminal` が設定済みならそれを返し、未設定（空文字）なら
 * `installedTerminals` の先頭をフォールバックとして返す。
 *
 * @param state AppStore の状態
 * @returns 実効ターミナル ID。検出済みターミナルが 0 件の場合は空文字
 */
export function selectEffectiveTerminalId(state: AppStore): string {
  return state.selectedTerminal || (state.installedTerminals[0]?.id ?? "");
}
