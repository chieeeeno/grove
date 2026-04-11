# Grove 進捗管理

> M0（自分用 α）の全タスクを洗い出し、進捗を管理する。
> タスク完了時は `- [ ]` を `- [x]` に更新してコミットする。

---

## 完了済み

### 設計フェーズ
- [x] 設計書 grove-design.md 作成・更新
- [x] ROADMAP.md 作成（M0/M1/M2 マイルストーン定義）
- [x] ADR 13件 策定
- [x] 処理フロー・シーケンス図（§11）追加
- [x] Phase 2 スパイク調査（三次まで、公式ドキュメント裏付けあり）

### プロジェクト基盤
- [x] Git リポジトリ初期化
- [x] Tauri 2 + React 19 + TypeScript プロジェクト雛形作成
- [x] bundle identifier 設定（`io.github.chieeeeno.grove`）
- [x] Tailwind CSS v4 導入
- [x] Zustand 導入
- [x] git2 crate 導入
- [x] tauri-plugin-store 導入
- [x] tauri-plugin-window-state 導入
- [x] LICENSE ファイル設置（Apache-2.0）
- [x] README.md 最小版作成

### UI デザイン
- [x] デザイン変数定義（カラー・スペーシング・角丸、ダーク/ライト両テーマ対応）
- [x] メイン画面（ダーク / ライト）: 3カラムレイアウト、カード3種（primary / idle / Claude Code 稼働中）
- [x] 設定ダイアログ（ダーク / ライト）: テーマ切替（ライト / ダーク / システム）、エディタ選択、自動更新間隔
- [x] ホバー & アクティブ状態（ダーク / ライト）: VS Code ボタン / Remove ボタン / カード / サイドバー項目 / アイコンボタン
- [x] 削除確認ダイアログ（ダーク / ライト）: 未コミット警告 + ブランチ削除チェックボックス
- [x] ラベル編集の状態遷移: 表示モード（Idle）→ 編集モード（Editing）
- [x] preflight 警告バナー: code 未検出時の上部バナー + disabled ボタン + ツールチップ
- [x] デザインファイル: `docs/design/grove-ui.pen`

---

## M0 実装タスク

### 0. テスト環境セットアップ

#### 0-1. フロントエンド（Vitest + React Testing Library）
- [x] Vitest / jsdom / @testing-library/react / @testing-library/jest-dom を devDependencies に追加
- [x] vite.config.ts に test 設定を追加
- [x] テスト用 setup ファイル作成（src/test/setup.ts）
- [x] package.json に `test` スクリプト追加
- [x] サンプルテスト作成（動作確認用）

#### 0-2. Rust（cargo test）
- [x] 既存コマンドにユニットテストを追加（#[cfg(test)] モジュール）
- [x] テスト用のヘルパー関数（一時リポジトリ作成等）を用意
- [x] `cargo test` で全テストが通ることを確認

---

### 1. UI の骨組み

#### 1-1. レイアウト
- [x] 3 カラムレイアウトの実装（Sidebar 220px / Main flexible / Detail Panel は M0 非表示）
- [x] Sidebar コンポーネント作成（デザイン通りの構造）
- [x] MainArea コンポーネント作成（デザイン通りの構造）
- [x] DetailPanel コンポーネント作成（空の枠、M0 では非表示でも可）
- [x] テンプレートのデモ画面（App.tsx, App.css）をクリーンアップ

#### 1-2. 型定義
- [x] `src/types/index.ts` 作成（RepositoryConfig, Worktree, AppStore 等）
- [x] 設計書 §5 のデータモデルに基づく TypeScript 型の定義

#### 1-3. Zustand store
- [x] `src/stores/appStore.ts` 作成
- [x] リポジトリ管理の state / actions のスケルトン
- [x] worktree 管理の state / actions のスケルトン
- [x] UI 状態の state（codeAvailable, isRefreshing 等）

#### 1-4. Tauri commands スケルトン（Rust 側）
- [x] `src-tauri/src/commands/` ディレクトリ作成
- [x] `src-tauri/src/commands/mod.rs` 作成
- [x] `src-tauri/src/commands/repository.rs` 作成（`validate_repository`, `load_config`, `save_config` 実装済み）
- [x] `src-tauri/src/commands/worktree.rs` 作成（`list_worktrees`, `get_worktree_status`, `remove_worktree` スケルトン）
- [x] `src-tauri/src/commands/editor.rs` 作成（`open_in_editor`, `check_code_command` 実装済み）
- [x] `lib.rs` にコマンド登録

#### 1-5. Tauri invoke ラッパー（Frontend 側）
- [x] `src/lib/tauri.ts` 作成（invoke ラッパー関数群）

---

### 2. リポジトリ管理

#### 2-1. Rust 側
- [x] `validate_repository` 実装（git2 で Repository::open してリポジトリ情報を返す）
- [x] `load_config` 実装（tauri-plugin-store から AppConfig 読込）
- [x] `save_config` 実装（tauri-plugin-store に AppConfig 書込）
- [x] RepositoryInfo / AppConfig の Rust 構造体定義（serde Serialize/Deserialize）

#### 2-2. Frontend 側
- [x] サイドバーにリポジトリ一覧を表示
- [x] リポジトリ追加ボタン（「+ リポジトリを追加」）
- [x] ディレクトリ選択ダイアログ（Tauri Dialog API）→ validate → store 保存
- [x] リポジトリ削除（サイドバーから登録解除、実ファイルは消さない）
- [x] リポジトリ選択（クリックで切り替え、selectedRepositoryId 更新）
- [x] 選択中リポジトリのハイライト表示
- [x] リポジトリ名の表示（ディレクトリ名から自動取得）
- [x] 各リポジトリの worktree 数をバッジ表示

---

### 3. worktree 表示

#### 3-1. Rust 側
- [x] `list_worktrees` 実装（git2 で worktree 一覧取得）
- [x] `get_worktree_status` 実装（git status --porcelain 相当、変更ファイル数カウント）
- [x] WorktreeInfo / WorktreeStatus の Rust 構造体定義
- [x] 最終コミット情報の取得（hash, message, time）
- [x] main/primary worktree の判定ロジック

#### 3-2. Frontend 側
- [x] WorktreeGrid コンポーネント（2 列 Grid レイアウト）
- [x] WorktreeCard コンポーネント
- [x] カード表示: ラベル（デフォルトは dir 名）
- [x] カード表示: ブランチ名（副次情報、小さく表示）
- [x] カード表示: 変更ファイル数（合計のみ、ADR-0011）
- [x] カード表示: 最終コミット（相対時間 + メッセージ）
- [x] カード表示: VS Code ボタン
- [x] カード表示: Remove ボタン
- [x] main worktree のバッジ表示（Remove ボタン非表示）

---

### 4. worktree ラベル機能（ADR-0008）

#### 4-1. Rust 側
- [x] ラベルの store 保存（worktree 絶対パスをキー）
- [x] ラベルの store 読込
- [x] ラベルの store 削除（worktree 削除時に連動）

#### 4-2. Frontend 側
- [x] ラベル表示モード（デフォルト: worktree ディレクトリ名）
- [x] 鉛筆アイコン → 編集モード切替
- [x] インライン input 表示
- [x] 確定ボタン（チェックマークアイコン）
- [x] × アイコン（キャンセル）
- [x] Cmd+Enter で確定
- [x] Esc でキャンセル
- [x] Enter 単独では確定しない（ADR-0008）
- [x] 確定後に store 保存 → 表示モードに戻る
- [x] 状態遷移: Idle → Editing → Saving → Idle（§11.7 参照）

---

### 5. worktree 削除（§11.6 参照）

#### 5-1. Rust 側
- [x] `remove_worktree` 実装（git worktree remove）
- [x] force オプション対応（未コミット変更がある場合）
- [x] ブランチ削除オプション対応（git branch -D）
- [x] 削除前の未コミット変更チェック（check_before_remove）

#### 5-2. Frontend 側
- [x] 確認ダイアログコンポーネント
- [x] ダイアログ表示: worktree 名・パス
- [x] ダイアログ表示: 未コミット変更がある場合の警告メッセージ
- [x] 「ブランチも一緒に削除する」チェックボックス
- [x] 「削除」ボタン / 「キャンセル」ボタン
- [x] 削除成功後にカードを除去 + store からラベル削除

---

### 6. エディタ連携（§11.8 参照）

#### 6-1. Rust 側
- [x] `open_in_editor` 実装（`std::process::Command` で `code <path>` 実行）
- [x] `check_code_command` 実装（`which code` で存在確認）

#### 6-2. Frontend 側
- [x] 起動時 preflight チェック呼出（§11.3 参照）
- [x] `codeAvailable` state を Zustand に保持
- [x] code 不在時: アプリ上部にバナー警告表示
- [x] code 不在時: 全カードの VS Code ボタンを disabled 化
- [x] disabled ボタンのホバー時ツールチップ（「code コマンドが必要です」）
- [x] VS Code ボタンクリック → `open_in_editor` 呼出

---

### 7. 自動リフレッシュ（ADR-0013、§11.5 参照）

#### 7-1. ポーリング
- [x] `useAutoRefresh` カスタムフック作成
- [x] setInterval（5 秒）で選択中リポジトリの worktree 一覧 + status 再取得
- [x] コンポーネント unmount 時に clearInterval

#### 7-2. 手動リフレッシュ
- [x] リフレッシュボタン（上部ヘッダー or MainArea 内）
- [x] クリックで即時 refresh() 実行
- [x] Cmd+R グローバルショートカット登録
- [x] リフレッシュ中のローディング表示（isRefreshing でアイコン回転）

---

### 8. アプリ起動シーケンス（§11.3 参照）

- [x] アプリ起動時に `load_config` → リポジトリ一覧取得
- [x] 起動時に `check_code_command` → preflight チェック
- [x] 起動時に各リポジトリの `list_worktrees` → worktree 一覧取得
- [x] 起動後にポーリングタイマー開始
- [x] tauri-plugin-window-state によるウィンドウサイズ復元の確認

---

### 9. 設定ダイアログ

#### 9-1. Frontend 側
- [x] SettingsDialog コンポーネント作成（モーダル）
- [x] ダイアログ表示: テーマ選択（M0 ではダーク固定、表示のみ）
- [x] ダイアログ表示: エディタ選択（M0 では VS Code 固定、表示のみ）
- [x] ダイアログ表示: 自動更新間隔の変更（5秒 / 10秒 / 30秒）
- [x] サイドバーの「設定」ボタンからダイアログを開く
- [x] 設定変更時に store + tauri-plugin-store に保存

---

### 10. デザイン調整

- [x] ホバーエフェクト追加（VS Code / Remove / サイドバー / アイコンボタン）
- [x] style prop を Tailwind @theme inline に移行
- [x] カスタムスクロールバー
- [x] リフレッシュボタンのスピンアニメーション改善
- [x] カードのホバーエフェクト削除（クリック対象ではないため）
- [ ] その他 `docs/design-fixes.md` に記載の項目

---

### 11. アプリアイコン

- [x] アイコンデザインの作成（Pencil で複数案を作成 → C1 採用）
- [x] 1024×1024 PNG の書き出し（`docs/design/exports/grove-icon-1024.png`）
- [x] `tauri icon` コマンドで全プラットフォーム向けアイコン生成
- [x] macOS 用 .icns ファイルの配置（`tauri.conf.json` のパスは変更不要）

---

### 12. 仕上げ

- [x] テンプレート由来の不要ファイル削除（public/tauri.svg, public/vite.svg, src/assets/react.svg）
- [x] index.html を Grove 用に更新（lang="ja" / title=Grove / vite.svg 参照削除）
- [x] UI テキストの日本語化（ADR-0009）
- [x] エラーメッセージの日本語化
- [x] preflight 警告バナーの日本語テキスト
- [ ] 自分の grove-app worktree でドッグフーディング開始（タスク13 QA で実施）
- [ ] NEXT.md の更新（次セッションへの引き継ぎ）

---

### 13. QA（動作確認）

- [x] QA チェック項目の洗い出し（`docs/qa-checklist.md` に約80テストケース）
- [ ] QA チェックリストの実施
- [ ] 発見した不具合の修正

---

### 14. テスト方針の整備と既存テストのリファクタ

**背景:**
Tauri 公式の必勝パターンを Web 調査した結果（2026-04）、以下が判明:

1. **Tauri 公式は mockIPC / MockRuntime を提供**
   - フロントエンド: `@tauri-apps/api/mocks` の `mockIPC` で IPC 呼び出しをモック
   - Rust 側: `tauri::test::MockRuntime` でネイティブ webview 非起動の統合テスト
   - 現在 Grove は `vi.mock("@tauri-apps/api/core")` で自作モックしているが、公式 API に統一すべき

2. **tauri-driver は macOS 非対応**
   - 公式ドキュメント: "macOS which does not provide a desktop WebDriver client"
   - Windows/Linux 向けの WebdriverIO + tauri-driver の例はあるが、macOS では動作しない
   - Grove は macOS only（ADR-0004）なので、この経路は使えない

3. **Playwright も Tauri では直接動かない**
   - Tauri は WebKitGTK/WKWebView を使用、Playwright は Chromium ベース
   - サードパーティの `srsholmes/tauri-playwright` は存在するが成熟度不明
   - `pnpm dev` で Vite サーバーを立てて Playwright でブラウザテストする案もあるが、
     その場合 Tauri API を別途モックする必要があり公式 `mockIPC` と重複する

**結論:**
- E2E 自動化は M0 スコープでは実施しない（macOS 制約のため実現不可能）
- Layer 1（Rust）+ Layer 2（Vitest + mockIPC）+ Manual QA の3層構成で品質を担保
- 既存の自作モックを公式 `mockIPC` に移行してメンテナンス性を向上

#### 14-1. テスト方針ドキュメント作成
- [ ] `docs/testing-strategy.md` を作成
  - Tauri テスト機能の背景説明（mockIPC / MockRuntime / WebDriver）
  - プラットフォーム制約（macOS での E2E 自動化不可）
  - Grove 採用の3層テスト戦略の定義と各層の役割
  - 新機能実装時の判断フロー（どのレイヤーで書くか）
  - モック戦略（公式 mockIPC への統一理由）
  - M2 以降で再検討する事項（Windows/Linux 対応時の E2E 導入）

#### 14-2. フロントエンドテストのリファクタ（mockIPC 移行）
- [ ] `src/test/setup.ts` を `vi.mock` から公式 `@tauri-apps/api/mocks` の `mockIPC` に移行
- [ ] 各テストファイルで `beforeEach(() => mockIPC(...))` / `afterEach(() => clearMocks())` パターンに統一
- [ ] 既存テスト40件が全て通ることを確認
- [ ] テストヘルパー関数の整理（共通モックデータ・fixture の切り出し）
- [ ] リファクタ前後でカバレッジが劣化していないことを確認

#### 14-3. Rust テストの強化（任意、M1 でも可）
- [ ] `tauri::test::MockRuntime` の導入検討
- [ ] AppHandle を要求するコマンド（`load_config` / `save_config` / `load_labels` 等）の統合テスト追加
- [ ] 現在は単体関数のみテストしているが、実際の Tauri ランタイム上での挙動も検証

---

### 13-1. E2E 自動化（M2 以降の検討事項、M0 スコープ外）

**なぜ M0 でやらないか:**
Tauri は macOS で WebDriver 非対応であり、tauri-driver を使った
E2E 自動化が物理的に不可能。
Playwright も WebKitGTK/WKWebView に直接接続できない。

**Grove が macOS only な理由（再掲、ADR-0004）:**
- 開発者が macOS しか所有していないため他 OS の実機検証ができない
- Phase 2（Claude Code 連携）のプロセス検知が OS ごとに API が異なる
- M1 の β 配布も mac ユーザー知人への配布で十分

**Windows/Linux 対応時（M2 以降）に検討する選択肢:**
- tauri-driver + WebdriverIO（Windows/Linux のみサポート）
- srsholmes/tauri-playwright（サードパーティ、成熟度要確認）
- 独自の CLI ベースの E2E フレームワーク（dev.to の事例あり）

それまでは Manual QA（`docs/qa-checklist.md`）を関所として運用する。

---

## M0 スコープ外（M1 以降）

実装しないことを明示しておく。間違って着手しないための安全装置。

- ❌ worktree 新規作成機能（M1）
- ❌ worktree rename 機能（M1 早期）
- ❌ ahead/behind 表示（M1+、ADR-0010）
- ❌ ファイル監視ベースのリフレッシュ（M1 早期、ADR-0013）
- ❌ 選択中リポジトリの永続化（M1）
- ❌ Detail Panel（M1+）
- ❌ Claude Code エージェント可視化（Phase 2）
- ❌ Terminal 起動 / Diff 表示ボタン（M2）
- ❌ テーマ対応（M2）
- ❌ i18n / 英語対応（M2、ADR-0009）
- ❌ テレメトリ（M2、ADR-0006）
- ❌ コード署名（M2 で再判断、ADR-0007）

---

## 参照ドキュメント

| ドキュメント | 用途 |
|---|---|
| [ROADMAP.md](./ROADMAP.md) | マイルストーン定義 / M0 スコープ / スパイク結果 |
| [grove-design.md](./grove-design.md) | 設計書 / §11 フロー図 / データモデル / Tauri commands |
| [docs/adr/](./docs/adr/) | 全意思決定の根拠（13 件） |
| [NEXT.md](./NEXT.md) | セッション間引き継ぎメモ |
