// ===== 永続化モデル（tauri-plugin-store） =====

/**
 * ユーザーが登録したリポジトリ 1 件分の設定。
 * tauri-plugin-store に永続化される。Rust 側 `commands::repository::RepositoryConfig`
 * と JSON で対応する。
 */
export interface RepositoryConfig {
  /**
   * リポジトリ識別子。M0 では絶対パスをそのまま使用（Rust 側 `validate_repository`
   * が `id = path.clone()` を返すため）。M1 以降で UUID 化する可能性あり。
   */
  id: string;
  /** サイドバーに表示するリポジトリ名。workdir の末尾ディレクトリ名から生成される */
  name: string;
  /** リポジトリの絶対パス（workdir ルート） */
  path: string;
  /** リポジトリ追加日時。ISO 8601 文字列（例: `"2026-04-10T00:00:00Z"`） */
  addedAt: string;
}

/**
 * アプリ全体の永続化設定。
 *
 * `saveConfig` は差分更新ではなく全置換で保存するため、部分更新したい場合は
 * 現在の state とマージしてから渡すこと（`App.tsx` の `buildConfigFromStore()` 参照）。
 */
export interface AppConfig {
  /** 登録済みリポジトリ一覧。順序はサイドバー表示順と一致する */
  repositories: RepositoryConfig[];
  /** 使用するエディタ識別子。M0 では `"vscode"` のみサポート */
  editor: "vscode";
  /**
   * UI テーマ。`"system"` は OS のダーク/ライト設定に追従する。
   * 設定ダイアログから 3 値を選択可能（#16 で実装済み）。
   */
  theme: "system" | "dark" | "light";
  /** worktree リフレッシュ間隔（ミリ秒）。ADR-0013 で既定 5000ms */
  refreshInterval: number;
  /**
   * 選択中のターミナルアプリ識別子。`TerminalApp.id` の値。
   * 空文字は未設定を表し、検出リストの先頭をフォールバックとして使用する。
   */
  terminal: string;
  /**
   * 前回終了時に選択していたリポジトリ ID。
   * `null` は未設定を表し、起動時は `repositories[0]` にフォールバックする。
   * Rust 側 `Option<String>` の `None` は `null` としてシリアライズされる。
   */
  selectedRepositoryId: string | null;
}

/**
 * Rust 側 `detect_installed_terminals` が返す、検出済みターミナルアプリ 1 件分の情報。
 * 設定ダイアログの選択肢と `open_in_terminal` の `terminal_id` 引数に使う。
 */
export interface TerminalApp {
  /** 識別子。`AppConfig.terminal` に保存される値（例: `"terminal"`, `"ghostty"`） */
  id: string;
  /** UI 表示名（例: `"Terminal.app"`, `"Ghostty"`） */
  name: string;
  /** `.app` バンドルの絶対パス */
  path: string;
}

// ===== Rust コマンドの戻り値 =====

/**
 * `validate_repository` コマンドの戻り値。
 * フロントエンドが `RepositoryConfig` を組み立てる際の素材として使う
 * （`addedAt` は呼び出し側で現在時刻から付与する）。
 */
export interface RepositoryInfo {
  /** M0 では `path` と同値（Rust 側で `id = path.clone()` しているため） */
  id: string;
  /** workdir ディレクトリの末尾名。取得失敗時は `"unknown"` */
  name: string;
  /** 検証に成功したリポジトリの絶対パス */
  path: string;
}

/**
 * `list_worktrees` の戻り値 1 件分。
 *
 * `agentStatus` は M0 では返さない（Phase 2 で追加予定）。
 */
export interface WorktreeInfo {
  /** worktree の絶対パス（末尾スラッシュは除去済み） */
  path: string;
  /** 現在のブランチの短縮名。detached HEAD や取得失敗時は `"HEAD"` */
  branch: string;
  /** メイン worktree（リポジトリ本体）かどうか */
  isMain: boolean;
  /** HEAD のコミットハッシュ（フル 40 文字）。コミットなし / 取得失敗時は空文字 */
  head: string;
  /** 最終コミットの summary（1 行目）。取得失敗時は空文字 */
  lastCommitMessage: string;
  /**
   * 最終コミットの時刻（Unix epoch 秒）。
   * `0` はコミットなし or 取得失敗のセンチネルで、`relativeTime()` は空文字を返す。
   */
  lastCommitTime: number;
  /** 変更ファイル数の合計（ADR-0011: modified/added/deleted/untracked を種別で分けない） */
  modifiedCount: number;
  /**
   * メインブランチとの関係を示すステータス。
   * - `"idle"` — メインと同じコミット（独自コミットなし）
   * - `"active"` — 独自コミットあり（作業中）
   * - `"merged"` — メインにマージ済み（削除候補）
   *
   * メイン worktree 自身は常に `"idle"`。
   */
  branchStatus: "idle" | "active" | "merged";
  /**
   * リモート追跡ブランチ（upstream）に対して、ローカルが先行しているコミット数。
   * upstream 未設定 / detached HEAD / 計算失敗の場合は `null`。
   * Rust 側 `Option<u32>` の `None` は JSON の `null` にシリアライズされる。
   */
  ahead: number | null;
  /**
   * リモート追跡ブランチ（upstream）に対して、ローカルが遅れているコミット数。
   * upstream 未設定 / detached HEAD / 計算失敗の場合は `null`。
   */
  behind: number | null;
}

/**
 * `fetch_repository` コマンドの戻り値。
 *
 * 1 つでも成功すれば Ok として返り、部分失敗は `failures` に詰めて通知する。
 * 全 remote が失敗した場合のみ例外が投げられる（呼び出し側で catch）。
 */
export interface FetchOutcome {
  /** fetch 完了時刻（Unix epoch 秒）。「Last fetched: X 分前」表示に使う */
  fetchedAt: number;
  /** リポジトリに設定されている remote の総数（`0` は fetch 対象なし） */
  remoteCount: number;
  /**
   * 失敗した remote の情報。書式は `"<remote-name>: <理由>"`。
   * 空配列なら全成功、1 件以上あれば部分失敗。
   */
  failures: string[];
}

/**
 * `get_worktree_status` の戻り値。ポーリング用の軽量ステータス。
 * `WorktreeInfo` と違いコミット情報は返さない。
 */
export interface WorktreeStatus {
  /** 対象 worktree の絶対パス（コマンド呼び出し時の引数がそのまま返る） */
  path: string;
  /** 変更ファイル数の合計（ADR-0011） */
  modifiedCount: number;
  /** `modifiedCount > 0` と等価の派生値。フロント側の条件分岐用 */
  hasUncommitted: boolean;
}

// ===== UI 状態 =====

/**
 * Claude Code agent の実行状態（Phase 2 で実装予定の予約型）。
 *
 * M0 では参照箇所なし（CLAUDE.md / grove-design.md のデータモデル仕様として
 * 保持する）。Phase 2 で worktree と agent プロセスの対応付けを実装する際に
 * 使う想定。
 */
export type AgentStatus = "running" | "idle";
