# Grove（仮） — 設計書

> Git Worktree Manager GUI アプリケーション
> Version: 0.1.0 (Draft)
> 最終更新: 2026-04-07

---

## 1. プロジェクト概要

### 1.1 背景・課題

Git worktree を活用した並列開発（特に Claude Code との併用）が一般化する中で、worktree の管理は依然として CLI ベースの操作に依存している。複数のリポジトリ × 複数の worktree を扱う開発者にとって、以下の課題がある。

- worktree の一覧性が低く、全体の状況が把握しにくい
- 各 worktree の作業状態（変更ファイル数、ahead/behind）を確認するために複数コマンドの実行が必要
- Claude Code エージェントが各 worktree でどのような作業をしているか可視化する手段がない
- VS Code で対象の worktree を開くまでに手間がかかる

### 1.2 プロダクトビジョン

Grove は、Git worktree をGUIで直感的に管理するデスクトップアプリケーションである。リポジトリ単位での worktree の一覧表示・作成・削除に加え、Claude Code エージェントの稼働状況をリアルタイムに可視化し、開発者の並列開発ワークフローを支援する。

### 1.3 ターゲットユーザー

- Git worktree を日常的に使用するフロントエンド/フルスタックエンジニア
- Claude Code を使って並列開発を行う開発者
- CUI よりも GUI での操作を好む開発者

---

## 2. 技術スタック

| レイヤー | 技術 | 備考 |
|---|---|---|
| フレームワーク | Tauri 2 | 軽量デスクトップアプリ（~5-10MB） |
| フロントエンド | React 19 + TypeScript | SPA構成 |
| スタイリング | Tailwind CSS v4 | ユーティリティファースト |
| 状態管理 | Zustand | 軽量で React との親和性が高い |
| バックエンド（Native） | Rust（Tauri commands） | Tauri の IPC 経由で呼び出し |
| Git 操作 | git2 crate（libgit2） | Rust ネイティブの Git ライブラリ |
| プロセス実行 | std::process::Command | VS Code 起動、Claude Code 連携 |
| データ永続化 | tauri-plugin-store | JSON ベースのローカルストレージ |

### 2.1 技術選定理由

**Tauri を選択した理由（vs Electron）：**

- バンドルサイズが小さい（~10MB vs ~150MB）
- メモリ消費が少ない（Claude Code と併用するため重要）
- 起動が高速（0.5秒以下）
- git2 crate による高速な Git 操作が可能
- セキュリティがデフォルトで堅牢

**考慮したトレードオフ：**

- Rust の学習コストが発生するが、Claude Code の支援により軽減可能
- Tauri のエコシステムは Electron より小さいが、本アプリに必要な機能は十分カバーされている

---

## 3. アプリケーション構成

### 3.1 画面レイアウト

3カラム構成を採用する。

```
┌──────────┬────────────────────────┬──────────────┐
│          │                        │              │
│ Sidebar  │     Main Area          │  Detail      │
│          │                        │  Panel       │
│ (リポジ  │  (Worktree カード一覧)  │ (選択した    │
│  トリ    │                        │  worktreeの  │
│  一覧)   │                        │  詳細情報)   │
│          │                        │              │
└──────────┴────────────────────────┴──────────────┘
  200px        flexible                 280px
              (カード2列 grid)       (カード選択時に表示)
```

### 3.2 左サイドバー（Sidebar）

- アプリロゴ・タイトル表示
- 登録済みリポジトリの一覧表示
  - リポジトリ名
  - worktree 数
  - アクティブなエージェント数（バッジ表示）
- 選択中リポジトリのハイライト
- 「+ Add repository」ボタン

### 3.3 メインエリア（Main Area）

- 選択中リポジトリの名前・パス表示
- 「+ Add worktree」ボタン
- Worktree カードの Grid 表示（2列、レスポンシブ）

#### Worktree カードに表示する情報

| 項目 | 説明 |
|---|---|
| ブランチ名 | カラードットと共に表示 |
| ステータスバッジ | primary / Claude Code / idle |
| 最終コミット | 相対時間 + コミットメッセージ |
| 変更ファイル数 | modified の数 |
| ahead/behind | リモートとの差分 |
| アクションボタン | VS Code / Terminal / Diff / Remove |

#### カードの状態による表示分け

| 状態 | ボーダー | バッジ | 備考 |
|---|---|---|---|
| primary (main) | 通常 | 緑「primary」 | 削除不可 |
| Claude Code 稼働中 | 青ボーダー（強調） | 青「Claude Code」 | 作業内容サマリ表示 |
| idle | 通常 | グレー「idle」 | Remove ボタン表示 |

### 3.4 詳細パネル（Detail Panel）

カードをクリックすると右側に表示される。

- **ヘッダー**: ブランチ名、worktree パス
- **Agent team セクション**:
  - Lead agent / Sub-agent の一覧
  - 各エージェントの稼働ステータス（稼働中 / 待機中）
  - 各エージェントが実行中のタスク概要
- **Changed files セクション**:
  - 変更ファイル一覧（M: modified, A: added, D: deleted）
- **Recent activity セクション**:
  - 直近のコミット履歴
  - どのエージェントがコミットしたか表示

---

## 4. 機能仕様

### 4.1 リポジトリ管理

| 機能 | 説明 |
|---|---|
| リポジトリ追加 | ローカルの Git リポジトリをディレクトリ選択で登録 |
| リポジトリ削除 | サイドバーから登録解除（実ファイルは削除しない） |
| リポジトリ切り替え | サイドバーでクリックして選択 |
| 永続化 | 登録済みリポジトリのパス一覧を tauri-plugin-store で保存 |

### 4.2 Worktree 管理

| 機能 | 説明 |
|---|---|
| 一覧表示 | `git worktree list` 相当の情報をカードで表示 |
| 新規作成 | ブランチ名を指定して worktree を作成。既存ブランチ / 新規ブランチ対応 |
| 削除 | worktree を削除。未コミットの変更がある場合は確認ダイアログを表示 |
| 自動リフレッシュ | 一定間隔（例: 5秒）で Git の状態を再取得 |

### 4.3 エディタ連携

| 機能 | 説明 |
|---|---|
| VS Code で開く | `code <worktree-path>` を実行して VS Code を起動 |
| 将来拡張 | Cursor 等の他エディタ対応（Phase 3） |

### 4.4 Claude Code エージェント連携（Phase 2）

| 機能 | 説明 |
|---|---|
| 稼働検知 | 各 worktree で Claude Code プロセスが動いているかを検知 |
| ステータス表示 | `--output-format stream-json` の出力をパースしてリアルタイム表示 |
| エージェントチーム可視化 | Lead agent / Sub-agent の一覧と各タスクの進捗を表示 |
| コミット帰属 | どのエージェントがどのコミットを行ったかを表示 |

---

## 5. データモデル

### 5.1 永続化データ（tauri-plugin-store）

```typescript
// アプリ設定
interface AppConfig {
  repositories: RepositoryConfig[];
  editor: "vscode";  // 将来: "cursor" | "other"
  theme: "system";   // 将来: "light" | "dark"
  refreshInterval: number; // ms (default: 5000)
}

// リポジトリ設定
interface RepositoryConfig {
  id: string;        // UUID
  name: string;      // 表示名
  path: string;      // 絶対パス
  addedAt: string;   // ISO 8601
}
```

### 5.2 ランタイムデータ（Zustand store）

```typescript
// Worktree 情報
interface Worktree {
  path: string;
  branch: string;
  isMain: boolean;
  head: string;           // commit hash
  lastCommitMessage: string;
  lastCommitTime: string;  // ISO 8601
  modifiedCount: number;
  ahead: number;
  behind: number;
  agentStatus: AgentStatus | null;
}

// エージェント状態（Phase 2）
interface AgentStatus {
  isRunning: boolean;
  agents: Agent[];
}

interface Agent {
  id: string;
  role: "lead" | "sub";
  status: "active" | "waiting" | "completed";
  currentTask: string;
}
```

---

## 6. Tauri コマンド設計（Rust）

### 6.1 Phase 1 で実装するコマンド

```rust
// リポジトリ検証
#[tauri::command]
fn validate_repository(path: String) -> Result<RepositoryInfo, String>

// Worktree 一覧取得
#[tauri::command]
fn list_worktrees(repo_path: String) -> Result<Vec<WorktreeInfo>, String>

// Worktree 作成
#[tauri::command]
fn create_worktree(
    repo_path: String,
    branch_name: String,
    create_new_branch: bool,
    base_branch: Option<String>,
) -> Result<WorktreeInfo, String>

// Worktree 削除
#[tauri::command]
fn remove_worktree(
    repo_path: String,
    worktree_path: String,
    force: bool,
) -> Result<(), String>

// Git ステータス取得
#[tauri::command]
fn get_worktree_status(worktree_path: String) -> Result<WorktreeStatus, String>

// VS Code で開く
#[tauri::command]
fn open_in_editor(path: String) -> Result<(), String>
```

### 6.2 Phase 2 で追加するコマンド

```rust
// Claude Code プロセス検知
#[tauri::command]
fn detect_claude_code_processes(
    worktree_path: String,
) -> Result<Vec<AgentInfo>, String>

// Claude Code ログ監視開始
#[tauri::command]
fn start_agent_monitor(
    worktree_path: String,
) -> Result<(), String>
```

---

## 7. フロントエンド コンポーネント設計

### 7.1 コンポーネントツリー

```
App
├── Sidebar
│   ├── AppLogo
│   ├── RepositoryList
│   │   └── RepositoryItem
│   └── AddRepositoryButton
├── MainArea
│   ├── MainHeader
│   │   ├── RepositoryTitle
│   │   └── AddWorktreeButton
│   └── WorktreeGrid
│       └── WorktreeCard
│           ├── CardHeader (ブランチ名 + ステータスバッジ)
│           ├── CardBody (コミット情報 + 変更数)
│           ├── AgentSummary (Phase 2, Claude Code稼働時のみ)
│           └── CardActions (VS Code / Terminal / Diff / Remove)
└── DetailPanel (カード選択時に表示)
    ├── PanelHeader
    ├── AgentTeamSection (Phase 2)
    ├── ChangedFilesSection
    └── RecentActivitySection
```

### 7.2 Zustand Store 構成

```typescript
interface AppStore {
  // リポジトリ
  repositories: RepositoryConfig[];
  selectedRepositoryId: string | null;
  addRepository: (path: string) => Promise<void>;
  removeRepository: (id: string) => void;
  selectRepository: (id: string) => void;

  // Worktree
  worktrees: Worktree[];
  selectedWorktreeIndex: number | null;
  selectWorktree: (index: number | null) => void;
  refreshWorktrees: () => Promise<void>;
  createWorktree: (branchName: string, createNew: boolean) => Promise<void>;
  removeWorktree: (path: string, force: boolean) => Promise<void>;

  // UI
  isDetailPanelOpen: boolean;
}
```

---

## 8. 開発フェーズ

### Phase 1 — MVP（基本機能）

リポジトリ管理と worktree の基本的な CRUD 操作を実装する。

- [ ] Tauri 2 + React + TypeScript プロジェクトのセットアップ
- [ ] 左サイドバー（リポジトリ一覧）
- [ ] メインエリア（worktree カード Grid 表示）
- [ ] worktree の新規作成ダイアログ
- [ ] worktree の削除（確認ダイアログ付き）
- [ ] Git status 情報の表示（変更数、ahead/behind）
- [ ] VS Code で開くボタン
- [ ] リポジトリ登録の永続化（tauri-plugin-store）
- [ ] 自動リフレッシュ（ポーリング）

### Phase 2 — Agent（Claude Code 連携）

Claude Code エージェントの状況をリアルタイムに可視化する。

- [ ] Claude Code プロセスの稼働検知
- [ ] 作業内容のリアルタイム表示
- [ ] エージェントチーム（Lead / Sub）の可視化
- [ ] 詳細パネル（右カラム）の実装
- [ ] 変更ファイル一覧の表示
- [ ] コミット履歴とエージェント帰属の表示

### Phase 3 — Polish（拡張・改善）

ユーザー体験の向上と機能拡張を行う。

- [ ] エディタ選択機能（VS Code / Cursor / その他）
- [ ] ターミナル起動ボタン
- [ ] Diff 表示機能
- [ ] 通知機能（エージェント完了時など）
- [ ] テーマ対応（ライト / ダーク / システム連動）
- [ ] 設定画面
- [ ] キーボードショートカット

---

## 9. ディレクトリ構成（想定）

```
grove/
├── src/                      # Frontend (React)
│   ├── components/
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── RepositoryList.tsx
│   │   │   └── RepositoryItem.tsx
│   │   ├── main/
│   │   │   ├── MainArea.tsx
│   │   │   ├── MainHeader.tsx
│   │   │   ├── WorktreeGrid.tsx
│   │   │   └── WorktreeCard.tsx
│   │   ├── detail/
│   │   │   ├── DetailPanel.tsx
│   │   │   ├── AgentTeamSection.tsx
│   │   │   ├── ChangedFilesSection.tsx
│   │   │   └── RecentActivitySection.tsx
│   │   └── shared/
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       └── Dialog.tsx
│   ├── stores/
│   │   └── appStore.ts
│   ├── hooks/
│   │   ├── useWorktrees.ts
│   │   └── useAutoRefresh.ts
│   ├── lib/
│   │   └── tauri.ts          # Tauri invoke wrappers
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── src-tauri/                 # Backend (Rust)
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── repository.rs
│   │   │   ├── worktree.rs
│   │   │   └── editor.rs
│   │   └── git/
│   │       ├── mod.rs
│   │       ├── worktree.rs
│   │       └── status.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── CLAUDE.md                  # Claude Code 用プロジェクト仕様
└── README.md
```

---

## 10. 既存ツールとの差別化

| 項目 | Grove | Worktrunk | wtp | LazyWorktree |
|---|---|---|---|---|
| インターフェース | GUI（デスクトップ） | CLI | CLI | TUI |
| リポジトリ管理 | 複数リポジトリ対応 | 単一 | 単一 | 単一 |
| Worktree 可視化 | カード表示 | テキスト一覧 | テキスト一覧 | テキスト一覧 |
| Claude Code 連携 | エージェント状態表示 | なし | なし | なし |
| エディタ連携 | ワンクリック起動 | なし | なし | なし |
| 対象ユーザー | GUI 好みの開発者 | CLI ユーザー | CLI ユーザー | TUI ユーザー |

---

## 付録

### A. 参考リンク

- [Tauri 2 公式ドキュメント](https://v2.tauri.app/)
- [git2 crate](https://crates.io/crates/git2)
- [tauri-plugin-store](https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/store)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)

### B. UI モックアップ

本設計書の作成過程で、以下のモックアップを作成・検討した。

1. **v1**: セレクトボックスによるリポジトリ選択 + worktree カード一覧
2. **v2**: 左サイドバーによるリポジトリ選択 + worktree カード一覧
3. **v3**: 3カラム構成（サイドバー + カード一覧 + 詳細パネル + エージェントチーム表示）

最終的に v3 の3カラム構成を採用した。
