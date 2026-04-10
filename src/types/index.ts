// ===== 永続化モデル（tauri-plugin-store） =====

export interface RepositoryConfig {
  id: string;       // UUID
  name: string;
  path: string;     // 絶対パス
  addedAt: string;  // ISO 8601
}

export interface AppConfig {
  repositories: RepositoryConfig[];
  editor: "vscode";
  theme: "system" | "dark" | "light";
  refreshInterval: number; // ms, default: 5000
}

// ===== Rust コマンドの戻り値 =====

export interface RepositoryInfo {
  id: string;
  name: string;
  path: string;
}

export interface WorktreeInfo {
  path: string;
  branch: string;
  isMain: boolean;
  head: string;
  lastCommitMessage: string;
  lastCommitTime: number; // Unix timestamp (seconds)
  modifiedCount: number;
}

export interface WorktreeStatus {
  path: string;
  modifiedCount: number;
  hasUncommitted: boolean;
}

// ===== UI 状態 =====

export type AgentStatus = "running" | "idle";

export interface WorktreeWithMeta extends WorktreeInfo {
  label: string;         // ユーザー設定ラベル。未設定時はディレクトリ名
  repositoryId: string;
  agentStatus: AgentStatus | null; // Phase 2 で実装
}
