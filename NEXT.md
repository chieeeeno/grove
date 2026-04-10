# 次回作業メモ

> 最終更新: 2026-04-11
> 前回セッション終了時点のスナップショット

---

## 次回の開始ポイント

### 🎯 タスク11「アプリアイコン」から着手する

残りタスクは以下の3つ：

```
11. アプリアイコン
  - アイコンデザインの作成（Grove のコンセプトに合ったアイコン）
  - 各サイズのアイコンファイル生成（tauri icon コマンド用の 1024x1024 PNG）
  - tauri.conf.json のアイコン設定を更新
  - macOS 用 .icns ファイルの生成・配置

12. 仕上げ
  - テンプレート由来の不要ファイル削除（public/tauri.svg 等）
  - UI テキストの日本語化（ADR-0009）
  - エラーメッセージの日本語化
  - preflight 警告バナーの日本語テキスト
  - ドッグフーディング開始
  - NEXT.md の更新

13. QA（動作確認）
  - QA チェック項目の洗い出し
  - チェックリストの実施
  - 不具合修正
  - （任意）QA 自動テスト化
```

---

## 前回セッションでやったこと

### 実装完了（タスク1〜9）
- タスク0: テスト環境セットアップ（Vitest + cargo test）
- タスク1: UI の骨組み（3カラムレイアウト・型定義・store・Rust コマンド・invoke ラッパー）
- タスク2: リポジトリ管理（追加・削除・選択・永続化）
- タスク3: worktree 表示（list_worktrees 実装 + WorktreeCard/Grid）
- タスク4: worktree ラベル機能（EditableLabel + store 永続化）
- タスク5: worktree 削除（確認ダイアログ + remove_worktree 実装）
- タスク6: エディタ連携（preflight チェック + バナー + disabled ボタン）
- タスク7: 自動リフレッシュ（5秒ポーリング + Cmd+R ショートカット）
- タスク8: アプリ起動シーケンス（既に実装済み）
- タスク9: 設定ダイアログ（自動更新間隔の変更 + store 永続化）

### デザイン調整（タスク10）
- Tailwind @theme inline でカスタムカラー定義
- 全コンポーネントの style prop → Tailwind クラスに移行
- ホバーエフェクト追加（VS Code / Remove / サイドバー / アイコンボタン）
- カスタムスクロールバー（WKWebView 向け）
- リフレッシュボタンのスピンアニメーション（最低500ms表示）

### 開発環境整備
- OXLint + Prettier（リンター・フォーマッター）
- lefthook（pre-commit で lint + format + test を自動実行）
- Chrome DevTools MCP でブラウザ上の UI 確認環境を構築
- Pencil MCP でスクロールバーデザインを作成

### テスト状況
- フロントエンド: 40テスト（Vitest）
- Rust: 9テスト（cargo test）
- lefthook で pre-commit 時にテスト必須

---

## 注意事項

- テスト用 worktree が残っている可能性あり: `git worktree remove ../grove-app-test`
- `pnpm tauri dev` 起動時は `~/.cargo/bin` が PATH に入っている必要あり
- lefthook インストール: `pnpm lefthook install --force`

---

## 参照ドキュメント

- [PROGRESS.md](./PROGRESS.md) — M0 タスク一覧（チェックボックス）
- [CLAUDE.md](./CLAUDE.md) — 開発ルール・コマンド一覧
- [grove-design.md](./grove-design.md) — 設計書
- [docs/adr/](./docs/adr/) — 意思決定記録（ADR 13件）
- [docs/design/grove-ui.pen](./docs/design/grove-ui.pen) — UI デザインモック
- [docs/design-fixes.md](./docs/design-fixes.md) — デザイン調整メモ
- [docs/blog-ideas.md](./docs/blog-ideas.md) — ブログネタ候補
- [docs/dev-workflow.md](./docs/dev-workflow.md) — 開発ワークフロー記録
