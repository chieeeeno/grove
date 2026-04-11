# 次回作業メモ

> 最終更新: 2026-04-11
> 前回セッション終了時点のスナップショット

---

## 次回の開始ポイント

### 🎯 タスク14「テスト方針の整備と既存テストのリファクタ」から着手する

前回のセッションで Tauri 公式のテスト戦略を調査した結果、
既存テストの書き方が公式推奨と異なることが判明。リファクタと方針ドキュメント化が必要。

#### 作業順序

```
1. 14-1: docs/testing-strategy.md 作成
   - Tauri テスト機能の背景（mockIPC / MockRuntime / WebDriver）
   - プラットフォーム制約（macOS の tauri-driver 非対応）
   - Grove の3層テスト戦略
   - 新機能実装時の判断フロー

2. 14-2: src/test/setup.ts のリファクタ
   - vi.mock("@tauri-apps/api/core") → mockIPC() に移行
   - 各テストで beforeEach(mockIPC) / afterEach(clearMocks)
   - 既存40件が通ることを確認

3. 14-3（任意）: Rust MockRuntime 導入検討

4. QA（タスク13）の実施
   - docs/qa-checklist.md の80件を手動実行
   - 不具合があれば修正

5. ドッグフーディング開始（タスク12の残り）
```

---

## 前回セッションでやったこと（2026-04-11）

### 実装完了
- **タスク9**: 設定ダイアログ（自動更新間隔の変更・永続化）
- **タスク10**: デザイン調整全般
  - Tailwind @theme inline でカスタムカラー定義
  - style prop → Tailwind クラス移行
  - ホバーエフェクト全実装
  - カスタムスクロールバー
  - リフレッシュアニメーション（最低500ms表示）
- **タスク11**: アプリアイコン
  - Pencil で複数パターン作成 → C1（緑グラデ + trees）採用
  - 1024×1024 PNG 書き出し → `tauri icon` で全サイズ生成
  - 採用版と不採用版を .pen ファイル内で分離配置
- **タスク12**: 仕上げ（一部）
  - テンプレート由来の不要ファイル削除
  - index.html を Grove 用に更新（lang="ja", title="Grove"）
  - 日本語化は既に対応済みだったので完了マーク
- **タスク13**: QA チェックリスト作成
  - `docs/qa-checklist.md` に Given/When/Then 形式で約80 TC
  - 正常系 + 異常系20+ ケース
  - `$GROVE_CONFIG` 変数・fixture 作成例も明記

### 調査・方針決定
- **Tauri 公式のテスト戦略を Web 調査**
  - mockIPC / MockRuntime の存在を確認
  - tauri-driver が macOS 非対応であることを確認
  - Playwright が Tauri で直接動かないことを確認
- **E2E 自動化は M0 では実施しない** 方針に決定
  - 3層（cargo test + Vitest + Manual QA）で品質担保
- **タスク14を新規追加**: テスト方針ドキュメント化 + mockIPC リファクタ

### GitHub
- `https://github.com/chieeeeno/grove` にリモート設定済み
- main ブランチ push 済み（初回プッシュ後のローカルコミットは未 push）

---

## 残りタスクの全体像

| タスク | 内容 | 状態 |
|--------|------|------|
| 1〜11 | 基本機能・デザイン調整・アイコン | ✅ 完了 |
| 12 | 仕上げ | ほぼ完了（ドッグフーディング残り） |
| 13 | QA チェックリスト | 作成完了、実施は未 |
| **14** | **テスト方針整備 + リファクタ** | **次回着手** |

---

## 注意事項

- `pnpm tauri dev` 起動時は `~/.cargo/bin` が PATH に必要
- lefthook の pre-commit でテスト必須（失敗すると commit できない）
- テスト用 worktree `../grove-app-test` が残ってる可能性あり
- GitHub にまだ push されてないコミットが複数ある（次回開始時に `git push` 検討）

---

## 参照ドキュメント

- [PROGRESS.md](./PROGRESS.md) — M0 タスク一覧
- [CLAUDE.md](./CLAUDE.md) — 開発ルール・コマンド一覧
- [docs/qa-checklist.md](./docs/qa-checklist.md) — QA テストケース
- [docs/design-fixes.md](./docs/design-fixes.md) — デザイン調整メモ
- [docs/blog-ideas.md](./docs/blog-ideas.md) — ブログネタ候補
- [docs/dev-workflow.md](./docs/dev-workflow.md) — 開発ワークフロー記録
- [docs/design/grove-ui.pen](./docs/design/grove-ui.pen) — UI デザイン（Pencil）
- [docs/design/exports/grove-icon-1024.png](./docs/design/exports/grove-icon-1024.png) — アイコン原画像
