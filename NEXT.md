# 次回作業メモ

> 最終更新: 2026-04-10
> 前回セッション終了時点のスナップショット

---

## 次回の開始ポイント

### 🎯 M0 実装タスク「1. UI の骨組み」から着手する

PROGRESS.md のタスク 1 を上から順にすべて実装する。
実装タスクは「下のレイヤーから積み上げる」方針で進める（Rust → Frontend の順）。

#### タスク 1 の内訳（すべて未着手）

```
1-1. レイアウト
  - 3 カラムレイアウトの実装（Sidebar 200px / Main flexible / Detail Panel 280px）
  - Sidebar コンポーネント作成（空の枠）
  - MainArea コンポーネント作成（空の枠）
  - DetailPanel コンポーネント作成（空の枠、M0 では非表示でも可）
  - テンプレートのデモ画面（App.tsx, App.css）をクリーンアップ

1-2. 型定義
  - src/types/index.ts 作成（RepositoryConfig, Worktree, AppStore 等）
  - 設計書 §5 のデータモデルに基づく TypeScript 型の定義

1-3. Zustand store
  - src/stores/appStore.ts 作成
  - リポジトリ管理の state / actions のスケルトン
  - worktree 管理の state / actions のスケルトン
  - UI 状態の state（isDetailPanelOpen 等）

1-4. Tauri commands スケルトン（Rust 側）
  - src-tauri/src/commands/ ディレクトリ作成
  - src-tauri/src/commands/mod.rs
  - src-tauri/src/commands/repository.rs（validate_repository, load_config, save_config）
  - src-tauri/src/commands/worktree.rs（list_worktrees, get_worktree_status, remove_worktree）
  - src-tauri/src/commands/editor.rs（open_in_editor, check_code_command）
  - lib.rs にコマンド登録

1-5. Tauri invoke ラッパー（Frontend 側）
  - src/lib/tauri.ts 作成（invoke ラッパー関数群）
```

#### 実装方針

- Rust 側スケルトン（1-4）→ 型定義（1-2）→ store（1-3）→ invoke ラッパー（1-5）→ レイアウト（1-1）の順が自然
- スケルトン段階なので戻り値はダミーで OK
- `npm run tauri dev` でビルドが通ることを確認しながら進める

---

## 前回セッションでやったこと

- `docs/blog-ideas.md` 作成（ブログネタ帳、8〜9 本分のネタをストック）
- `docs/dev-workflow.md` 作成（開発ワークフロー記録）
- 実装ファイル（src/types, src/stores, src/lib, src-tauri/src/commands）は一度作ったが破棄
  → 次回セッションで改めてタスク 1 から実装する

---

## 参照ドキュメント

- [PROGRESS.md](./PROGRESS.md) — M0 タスク一覧（チェックボックス）
- [grove-design.md](./grove-design.md) — 設計書（§5 データモデル、§6 Tauri commands）
- [docs/adr/](./docs/adr/) — 意思決定記録（ADR 13 件）
- [docs/design/grove-ui.pen](./docs/design/grove-ui.pen) — UI デザインモック（実装の参照）
