# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## パッケージマネージャー

**pnpm を使うこと。** `npm` / `yarn` は使わない。

```bash
# パッケージ追加
pnpm add <package>
pnpm add -D <package>   # devDependency
```

## 開発コマンド

```bash
# Tauri アプリ開発サーバー起動（フロントエンド + Rust を同時起動）
pnpm tauri dev

# フロントエンドのみ（Vite dev server, ポート 1420）
pnpm dev

# ビルド
pnpm tauri build        # デスクトップアプリのリリースビルド
pnpm build              # フロントエンドのみ（tsc + vite build）
```

```bash
# テスト
pnpm test               # フロントエンド（Vitest）
pnpm test:watch          # フロントエンド（ウォッチモード）
cargo test --manifest-path src-tauri/Cargo.toml --lib  # Rust

# リント & フォーマット
pnpm lint               # OXLint（フロントエンド）
pnpm format             # Prettier（フロントエンド、自動修正）
pnpm format:check       # Prettier（差分チェックのみ）
cargo fmt --manifest-path src-tauri/Cargo.toml         # rustfmt
cargo clippy --manifest-path src-tauri/Cargo.toml --lib  # clippy
```

## アーキテクチャ概要

Grove は Git worktree を GUI 管理するデスクトップアプリ（Tauri 2）。フロントエンド（React + TypeScript）と Rust バックエンドが Tauri IPC を通じて通信する。

### 3カラムレイアウト

```
Sidebar (200px)  |  Main Area (flexible)  |  Detail Panel (280px)
リポジトリ一覧   |  Worktree カード 2列     |  選択 worktree 詳細（Phase 2）
```

### フロントエンド構造（実装予定パス）

```
src/
├── types/index.ts          # 全型定義（AppConfig, RepositoryConfig, Worktree等）
├── stores/appStore.ts      # Zustand store（リポジトリ・worktree・UI状態）
├── lib/tauri.ts            # Tauri invoke ラッパー関数群
└── components/
    ├── Sidebar.tsx
    ├── MainArea.tsx
    └── DetailPanel.tsx
```

### Rust バックエンド構造（実装予定パス）

```
src-tauri/src/
├── lib.rs                  # Tauri builder + コマンド登録
└── commands/
    ├── mod.rs
    ├── repository.rs       # validate_repository, load_config, save_config
    ├── worktree.rs         # list_worktrees, get_worktree_status, remove_worktree
    └── editor.rs           # open_in_editor, check_code_command
```

Git 操作はすべて `git2` crate（libgit2）を使用する。`git` コマンドのプロセス実行は使わない。

### データ永続化

- **tauri-plugin-store**: `AppConfig`（登録済みリポジトリ一覧、エディタ設定、リフレッシュ間隔）を JSON で保存
- **Zustand**: `Worktree` 等のランタイムデータのみ（永続化しない）

## 主要な設計決定（ADR 要約）

**Preflight UX（ADR-0012）**: `code` コマンドが未検出の場合、事後エラーダイアログではなく上部バナー警告 + ボタン無効化で事前に通知する。

**Enter キー確定禁止（ADR + UX 原則）**: ラベル編集など入力 UI の確定は「確定ボタン」または `Cmd+Enter` のみ。`Enter` 単独での確定は誤操作防止のため使わない。

**worktree ラベルキー（ADR-0008）**: worktree の**絶対パス**をキーとして永続化する。worktree を rename した場合はラベルが消失する（許容済み）。

**リフレッシュ戦略（ADR-0013）**: 5秒間隔のポーリング + 手動リフレッシュボタン + `Cmd+R` ショートカット。

**変更ファイル表示（ADR-0011）**: modified/added/deleted の種別は分けず合計数のみ表示。

**UI 言語（ADR-0009）**: 日本語のみ。国際化（i18n）は対応しない。

**ahead/behind（ADR-0010）**: M0 では非表示。M1 以降で実装。

## データモデル（grove-design.md §5 準拠）

```typescript
// 永続化（tauri-plugin-store）
interface AppConfig {
  repositories: RepositoryConfig[];
  editor: "vscode";
  theme: "system";
  refreshInterval: number; // ms, default: 5000
}

interface RepositoryConfig {
  id: string;       // UUID
  name: string;
  path: string;     // 絶対パス
  addedAt: string;  // ISO 8601
}

// ランタイム（Zustand）
interface Worktree {
  path: string;
  branch: string;
  isMain: boolean;
  head: string;
  lastCommitMessage: string;
  lastCommitTime: string;
  modifiedCount: number;
  ahead: number;
  behind: number;
  agentStatus: AgentStatus | null;
}
```

## 参照ドキュメント

- `grove-design.md` — 詳細設計書（全機能仕様・コマンド設計・データモデル）
- `docs/adr/` — 意思決定記録 13 件（ADR と設計書に齟齬がある場合は **ADR を優先**）
- `PROGRESS.md` — M0 タスク一覧（チェックボックス形式）
- `ROADMAP.md` — M0/M1/M2 マイルストーン定義
- `docs/design/grove-ui.pen` — UI デザインモック（Pencil MCP で参照）

## Tailwind CSS v4

`tailwind.config.ts` は存在しない。v4 は CSS-first 設定で、`src/index.css` の `@import "tailwindcss"` と `vite.config.ts` の `@tailwindcss/vite` プラグインで動作する。
