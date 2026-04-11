# 次回作業メモ

> 最終更新: 2026-04-11
> 前回セッション終了時点のスナップショット

---

## 次回の開始ポイント

### 🎯 選択肢は2つ

**A. タスク14「テスト方針の整備 + mockIPC リファクタ」から着手**
- Tauri 公式の必勝パターンに従って既存テストを整備する
- `docs/testing-strategy.md` を作成して方針を明文化
- `src/test/setup.ts` を `vi.mock` → `@tauri-apps/api/mocks` の `mockIPC` に移行
- 既存40件のテストが通ることを確認

**B. タスク13「QA 実施」から着手**
- `docs/qa-checklist.md` の約80テストケースを手動実行
- 不具合があれば修正
- 既にビルドは動くので、Grove.app を触りながら QA

**推奨**: A（テスト整備）を先にやってから B（QA）の方が、
リファクタ中に何か壊れても気づける。

---

## 残りタスク全体像

| タスク | 内容 | 状態 |
|--------|------|------|
| 1〜11 | 基本機能・デザイン・アイコン | ✅ 完了 |
| 12 | 仕上げ | ほぼ完了（ドッグフーディングのみ残） |
| 13 | QA 実施 | チェックリスト作成済み、実施は未 |
| **14** | **テスト方針整備 + mockIPC リファクタ** | **未着手** |

---

## 前回セッションでやったこと（2026-04-11 夕方〜夜）

### 機能実装・デザイン
- **設定ダイアログの永続化**
  - `refreshInterval` を store に保持
  - 変更時に tauri-plugin-store に保存 → 再起動後も復元
  - ポーリング間隔に即座に反映（useAutoRefresh から参照）
  - テーマ選択・エディタ選択は M0 未対応として非表示化
- **アプリアイコン作成**
  - Pencil で 6+ パターンデザイン（案1〜4 → 色違い A〜F → A/C 派生 → サイズ比較）
  - 最終案: C1（緑グラデ #34D399→#059669 + 白い trees アイコン、63% サイズ）
  - 1024×1024 PNG 書き出し → `tauri icon` で全形式生成（.icns / .ico / iOS / Android）
  - 採用版と不採用版を Pencil ファイル内で物理的に分離（座標を遠くに）
- **仕上げ**
  - `public/tauri.svg`, `public/vite.svg`, `src/assets/react.svg` を削除
  - `index.html` を Grove 用に更新（`lang="ja"`, `title="Grove"`）

### QA
- **QA チェックリスト作成**（`docs/qa-checklist.md`）
  - Given/When/Then 形式で約80テストケース
  - 正常系 + 異常系20+ ケース（設定破損・権限・巨大データ・並行操作・システムスリープ等）
  - fixture リポジトリの作成例・$GROVE_CONFIG シェル変数も明記
- **Tauri 公式テスト戦略の Web 調査**
  - 重要な発見: Playwright は Tauri で動かない / tauri-driver は macOS 非対応
  - 公式が `mockIPC`（フロント）と `MockRuntime`（Rust）を提供
  - 方針転換: 3層テスト戦略（cargo test + Vitest/mockIPC + Manual QA）
- タスク14「テスト方針整備 + mockIPC リファクタ」を新規追加

### 機能リクエストの追加
- ターミナルで開くボタン（M1 優先度:中）
- worktree カードのドラッグ&ドロップ並び替え（M1 優先度:低）

### インフラ整備
- **SSH リモート設定**: HTTPS → SSH に変更してプッシュ可能に
- **Tauri ビルド PATH 問題の解決**
  - Claude Code の Bash ツールは非対話シェルで `.zshenv` が効かない
  - `package.json` の `tauri` スクリプトで `PATH="$HOME/.cargo/bin:$PATH"` を明示
- **本番ビルド成功**
  - `src-tauri/target/release/bundle/macos/Grove.app`
  - `src-tauri/target/release/bundle/dmg/Grove_0.1.0_aarch64.dmg`（4.1MB）

### GitHub Issue 整備
- **ラベル作成**: `milestone:M1`, `milestone:M2`, `priority:high/medium/low`, `phase:2`, `type:feature`, `type:infra`
- **Issue 23件作成**
  - M1: 15件（高4 / 中4 / 低7）
  - M2: 8件
  - 全て「タイトル + 背景 + やること + 参考」形式で記述

---

## アプリの起動方法

ビルド済みなので、すぐ起動できる：

```bash
# .app を直接起動
open src-tauri/target/release/bundle/macos/Grove.app

# または .dmg からインストール
open src-tauri/target/release/bundle/dmg/Grove_0.1.0_aarch64.dmg
```

初回は「開発元を確認できません」警告が出るが、右クリック→開くで起動可能（ADR-0007、署名なしのため）。

---

## GitHub リモート・ブランチ状態

- リモート: `git@github.com:chieeeeno/grove.git`（SSH）
- main ブランチは最新コミットまで push 済み（前回確認時）
- ローカルに push していないコミットがあるかは次回 `git status` / `git log origin/main..HEAD` で確認

---

## 注意事項・引き継ぎ

- `pnpm tauri dev` / `pnpm tauri build` は package.json で PATH 通してあるので Claude Code から実行可能
- lefthook の pre-commit でテスト必須（失敗すると commit ブロック）
- テスト用 worktree `../grove-app-test` が残ってる可能性あり
- `.claude/settings.json` には PATH を直接書かない（他ツールが壊れる）
- 自作モック `vi.mock("@tauri-apps/api/core")` は公式 `mockIPC` にリファクタ予定（タスク14-2）

---

## 参照ドキュメント

| ファイル | 内容 |
|---------|------|
| [PROGRESS.md](./PROGRESS.md) | M0 タスク一覧・進捗 |
| [ROADMAP.md](./ROADMAP.md) | M0/M1/M2 マイルストーン定義 |
| [CLAUDE.md](./CLAUDE.md) | 開発ルール・コマンド一覧 |
| [docs/qa-checklist.md](./docs/qa-checklist.md) | QA テストケース（80件） |
| [docs/design-fixes.md](./docs/design-fixes.md) | デザイン調整メモ |
| [docs/blog-ideas.md](./docs/blog-ideas.md) | ブログネタ候補 |
| [docs/dev-workflow.md](./docs/dev-workflow.md) | 開発ワークフロー記録 |
| [docs/design/grove-ui.pen](./docs/design/grove-ui.pen) | UI デザイン（Pencil） |
| [docs/design/exports/grove-icon-1024.png](./docs/design/exports/grove-icon-1024.png) | アイコン原画像 |
| [GitHub Issues](https://github.com/chieeeeno/grove/issues) | M1/M2 機能リスト（23件） |
