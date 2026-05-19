import { invoke } from "@tauri-apps/api/core";
import type {
  AppConfig,
  EditorApp,
  FetchOutcome,
  RepositoryInfo,
  TerminalApp,
  WorktreeInfo,
  WorktreeStatus,
} from "../types";

// ===== リポジトリ =====

/**
 * パスが有効な git リポジトリか検証し、リポジトリ情報を返す。
 *
 * 副作用なし（読み取りのみ）。`id` は現状 `path` と同値、`name` は workdir の
 * 末尾ディレクトリ名で、取得できなければ `"unknown"` が入る。
 *
 * @param path 検証対象のローカル絶対パス
 * @returns 検証に成功したリポジトリの `{ id, name, path }`
 * @throws パスが存在しない / `.git` が無い / bare リポジトリ / 権限不足の場合に reject
 */
export const validateRepository = (path: string): Promise<RepositoryInfo> =>
  invoke("validate_repository", { path });

/**
 * tauri-plugin-store から AppConfig を読み込む。
 *
 * 初回起動時（store が空）でも JSON デシリアライズに失敗しても、どちらも
 * デフォルト値の AppConfig が返る（reject ではない）。
 *
 * @returns 永続化されている `AppConfig`。未登録 or 破損時は `AppConfig::default()`
 *          相当（空 repositories / editor="vscode" / theme="system" / refreshInterval=5000）
 * @throws tauri-plugin-store のハンドル取得に失敗した場合のみ reject
 */
export const loadConfig = (): Promise<AppConfig> => invoke("load_config");

/**
 * AppConfig を **全置換** で保存する（差分更新ではない）。
 *
 * 部分更新したい場合は呼び出し側で現在の state とマージしてから渡すこと。
 * このプロジェクトでは `App.tsx` の `buildConfigFromStore()` がその役割を担う。
 * Rust 側で `store.save()` を呼ぶためディスクに同期 flush される。
 *
 * @param config 保存する AppConfig の完全な状態
 * @returns 保存完了時に resolve する Promise
 * @throws store オープン失敗 / シリアライズ失敗 / ディスク書き込み失敗時に reject
 */
export const saveConfig = (config: AppConfig): Promise<void> => invoke("save_config", { config });

/**
 * リポジトリの全リモートに対して `git fetch` を実行する。
 *
 * ネットワーク通信を伴うため遅い。ポーリング（5 秒間隔）では呼ばず、起動時と
 * 手動リフレッシュ時のみ呼ぶ設計。認証は Rust 側で SSH Agent → Keychain →
 * username の順にフォールバックし、対話プロンプトは出さない。
 *
 * @param repositoryPath 対象リポジトリの絶対パス
 * @returns `fetchedAt`: Unix epoch 秒 / `remoteCount`: remote 総数 /
 *          `failures`: `"<remote>: <理由>"` の配列（空配列なら全成功）
 * @throws リポジトリを開けない、または全 remote が失敗した場合に reject
 */
export const fetchRepository = (repositoryPath: string): Promise<FetchOutcome> =>
  invoke("fetch_repository", { repositoryPath });

// ===== Worktree =====

/**
 * リポジトリ配下の worktree 一覧を取得する。
 *
 * 5 秒ポーリングで頻繁に呼ばれるホットパス。各サブ worktree の status 走査は
 * Rust 側で `std::thread::scope` により並列実行される。
 *
 * @param repositoryPath メインリポジトリの絶対パス
 * @returns worktree 情報の配列。先頭要素は必ずメイン worktree（`isMain: true`）、
 *          以降のサブ worktree の順序は libgit2 の返却順に依存する（ソート保証なし、
 *          呼び出し側でソートすること）。開けないサブ worktree（壊れている / prune 待ち）
 *          はサイレントに除外される
 * @throws メインリポジトリを開けない / bare リポジトリの場合に reject
 */
export const listWorktrees = (repositoryPath: string): Promise<WorktreeInfo[]> =>
  invoke("list_worktrees", { repositoryPath });

/**
 * 単一 worktree の変更ファイル数を取得する（ADR-0011: 種別合計のみ）。
 *
 * `listWorktrees` より軽量でコミット情報は返さない。M0 時点では呼び出し箇所なし
 * （`listWorktrees` が同等情報を返すため）。M1 のファイル監視移行で単一 worktree
 * だけ差分更新したい場面で利用する予定。
 *
 * @param worktreePath 対象 worktree の絶対パス
 * @returns `{ path, modifiedCount, hasUncommitted }`。`hasUncommitted` は
 *          `modifiedCount > 0` の派生値
 * @throws worktree を Repository として開けない場合に reject
 */
export const getWorktreeStatus = (worktreePath: string): Promise<WorktreeStatus> =>
  invoke("get_worktree_status", { worktreePath });

/**
 * worktree 削除の事前チェック。削除ダイアログの表示情報を取得する。
 *
 * このコマンド自体は破壊的操作を行わない。`hasUncommitted` が true のとき、
 * フロントは削除ダイアログで警告を出したうえで `removeWorktree` を `force=true` で呼ぶ。
 *
 * @param worktreePath 削除対象 worktree の絶対パス
 * @returns `path`: 引数と同じ絶対パス /
 *          `branch`: 現在のブランチ名（detached HEAD のときは `"HEAD"`） /
 *          `modifiedCount`: 変更ファイル数合計（ADR-0011） /
 *          `hasUncommitted`: `modifiedCount > 0` の派生値（`WorktreeStatus` と同じ規約）
 * @throws worktree を開けない場合に reject
 */
export const checkBeforeRemove = (
  worktreePath: string
): Promise<{
  path: string;
  branch: string;
  hasUncommitted: boolean;
  modifiedCount: number;
}> => invoke("check_before_remove", { worktreePath });

/**
 * worktree を削除する。
 *
 * @param worktreePath 削除対象の絶対パス
 * @param force        未コミット変更があっても強制削除するか。通常は
 *                     `checkBeforeRemove` の `hasUncommitted` をそのまま渡し、
 *                     ダイアログで確認した結果をそのまま反映させる
 * @param deleteBranch worktree が参照していたローカルブランチも削除するか。
 *                     ブランチが存在しない（detached HEAD 等）場合は
 *                     サイレントに無視される
 * @returns 削除完了時に resolve する Promise
 * @throws 途中失敗時（prune 失敗、ブランチ削除失敗等）に reject。その場合は
 *         ディレクトリ削除だけ済んだ中途半端な状態になり得るので、呼び出し側は
 *         `listWorktrees` で再確認すること
 */
export const removeWorktree = (
  worktreePath: string,
  force: boolean,
  deleteBranch: boolean
): Promise<void> => invoke("remove_worktree", { worktreePath, force, deleteBranch });

// ===== ラベル（ADR-0008） =====

/**
 * 全ラベルを読み込む。
 *
 * worktree を rename するとキーが変わりラベルは失われる（ADR-0008 で許容済み）。
 *
 * @returns `Record<worktree 絶対パス, ユーザー設定ラベル文字列>`。
 *          未登録時は空オブジェクト
 * @throws tauri-plugin-store のハンドル取得に失敗した場合のみ reject
 */
export const loadLabels = (): Promise<Record<string, string>> => invoke("load_labels");

/**
 * worktree にラベルを割り当てて保存する（既存は無条件に上書き）。
 *
 * @param worktreePath 対象 worktree の絶対パス。文字列一致でキーとなるため、
 *                     末尾スラッシュ等の正規化は呼び出し側の責務
 * @param label        任意のラベル文字列。空文字・長文の検証は行わないので
 *                     UI 層で制御すること
 * @returns 保存完了時に resolve する Promise
 * @throws store オープン / シリアライズ / save 失敗時に reject
 */
export const saveLabel = (worktreePath: string, label: string): Promise<void> =>
  invoke("save_label", { worktreePath, label });

/**
 * ラベルを削除する。キーが存在しなくてもエラーにならない（冪等）。
 * 通常は `removeWorktree` 成功後に連動呼び出しする。
 *
 * @param worktreePath 対象 worktree の絶対パス
 * @returns 削除完了時に resolve する Promise
 * @throws store オープン / save 失敗時に reject
 */
export const deleteLabel = (worktreePath: string): Promise<void> =>
  invoke("delete_label", { worktreePath });

// ===== 並び順 =====

/**
 * 全リポジトリの worktree 並び順を読み込む。
 *
 * @returns `Record<リポジトリ ID, worktree 絶対パスの配列>`。
 *          未登録時は空オブジェクト
 * @throws tauri-plugin-store のハンドル取得に失敗した場合のみ reject
 */
export const loadOrder = (): Promise<Record<string, string[]>> => invoke("load_order");

/**
 * 指定リポジトリの worktree 並び順を保存する。他リポジトリの順序は影響を受けない。
 *
 * @param repositoryId 対象リポジトリの UUID
 * @param order worktree 絶対パスの配列（表示したい順番）
 * @returns 保存完了時に resolve する Promise
 * @throws store オープン / シリアライズ / save 失敗時に reject
 */
export const saveOrder = (repositoryId: string, order: string[]): Promise<void> =>
  invoke("save_order", { repositoryId, order });

/**
 * 指定リポジトリの並び順データを削除する（リポジトリ削除時の連動用）。
 * キーが存在しなくてもエラーにならない（冪等）。
 *
 * @param repositoryId 削除対象リポジトリの UUID
 * @returns 削除完了時に resolve する Promise
 * @throws store オープン / save 失敗時に reject
 */
export const deleteOrder = (repositoryId: string): Promise<void> =>
  invoke("delete_order", { repositoryId });

// ===== テーマ =====

/**
 * ウィンドウテーマを設定する。
 *
 * `"system"` を渡すと `set_theme(None)` が呼ばれ、OS テーマに追従する。
 * これにより WebView 内の `prefers-color-scheme` が OS 設定を反映し、
 * `matchMedia` の change イベントが正しく発火するようになる。
 * `"dark"` / `"light"` はウィンドウテーマを固定する。
 *
 * @param theme `"system"` / `"dark"` / `"light"`
 * @returns テーマ設定完了時に resolve する Promise
 * @throws 不正な theme 値 / ウィンドウ API 失敗時に reject
 */
export const setWindowTheme = (theme: "system" | "dark" | "light"): Promise<void> =>
  invoke("set_window_theme", { theme });

// ===== エディタ =====

/**
 * インストール済みの既知エディタアプリを検出して一覧を返す。
 *
 * 起動時に 1 回呼ばれる想定。設定ダイアログ表示時にも再呼び出し可能
 * （キャッシュなしで毎回走査するが、パス存在チェックのみなので十分高速）。
 *
 * @returns 検出されたエディタアプリの配列。何もインストールされていなければ空配列
 */
export const detectInstalledEditors = (): Promise<EditorApp[]> =>
  invoke("detect_installed_editors");

/**
 * 指定パスを選択中のエディタアプリで開く（`open -a <app> <path>` を spawn）。
 *
 * 親プロセスは起動完了を待たずに即 resolve する。ADR-0012 により、呼び出し側は
 * 事前に `checkEditorAvailable` で可否を確認してボタンを無効化しておく想定。
 *
 * @param path 開く対象の絶対パス（ファイル or ディレクトリ）
 * @param editorId 使用するエディタアプリの識別子（`EditorApp.id`）
 * @returns spawn 完了時に resolve する Promise
 * @throws 指定エディタが見つからない / spawn 失敗時に reject
 */
export const openInEditor = (path: string, editorId: string): Promise<void> =>
  invoke("open_in_editor", { path, editorId });

/**
 * 指定エディタが利用可能か（`.app` バンドルが存在するか）を返す（ADR-0012 preflight）。
 *
 * アプリ起動時と設定ダイアログでエディタを切り替えた直後に呼ぶ想定。
 *
 * @param editorId 確認するエディタ識別子（`AppConfig.editor` の値）
 * @returns 指定エディタが利用可能なら true。false のときフロントは上部バナー警告と
 *          関連ボタン無効化を表示する
 */
export const checkEditorAvailable = (editorId: string): Promise<boolean> =>
  invoke("check_editor_available", { editorId });

// ===== ターミナル =====

/**
 * インストール済みの既知ターミナルアプリを検出して一覧を返す。
 *
 * 起動時に 1 回呼ばれる想定。設定ダイアログ表示時にも再呼び出し可能
 * （キャッシュなしで毎回走査するが、パス存在チェックのみなので十分高速）。
 *
 * @returns 検出されたターミナルアプリの配列。何もインストールされていなければ空配列
 */
export const detectInstalledTerminals = (): Promise<TerminalApp[]> =>
  invoke("detect_installed_terminals");

/**
 * 指定パスを選択中のターミナルアプリで開く（`open -a <app> <path>` を spawn）。
 *
 * 親プロセスは起動完了を待たずに即 resolve する。ADR-0012 により、呼び出し側は
 * 事前に `detectInstalledTerminals` で可否を確認してボタンを無効化しておく想定。
 *
 * @param path 開く対象の絶対パス（ディレクトリ）
 * @param terminalId 使用するターミナルアプリの識別子（`TerminalApp.id`）
 * @returns spawn 完了時に resolve する Promise
 * @throws 指定ターミナルが見つからない / spawn 失敗時に reject
 */
export const openInTerminal = (path: string, terminalId: string): Promise<void> =>
  invoke("open_in_terminal", { path, terminalId });
