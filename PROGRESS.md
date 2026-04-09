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

---

## M0 実装タスク

### 1. UI の骨組み

#### 1-1. レイアウト
- [ ] 3 カラムレイアウトの実装（Sidebar 200px / Main flexible / Detail Panel 280px）
- [ ] Sidebar コンポーネント作成（空の枠）
- [ ] MainArea コンポーネント作成（空の枠）
- [ ] DetailPanel コンポーネント作成（空の枠、M0 では非表示でも可）
- [ ] テンプレートのデモ画面（App.tsx, App.css）をクリーンアップ

#### 1-2. 型定義
- [ ] `src/types/index.ts` 作成（RepositoryConfig, Worktree, AppStore 等）
- [ ] 設計書 §5 のデータモデルに基づく TypeScript 型の定義

#### 1-3. Zustand store
- [ ] `src/stores/appStore.ts` 作成
- [ ] リポジトリ管理の state / actions のスケルトン
- [ ] worktree 管理の state / actions のスケルトン
- [ ] UI 状態の state（isDetailPanelOpen 等）

#### 1-4. Tauri commands スケルトン（Rust 側）
- [ ] `src-tauri/src/commands/` ディレクトリ作成
- [ ] `src-tauri/src/commands/mod.rs` 作成
- [ ] `src-tauri/src/commands/repository.rs` 作成（`validate_repository`, `load_config`, `save_config` のスケルトン）
- [ ] `src-tauri/src/commands/worktree.rs` 作成（`list_worktrees`, `get_worktree_status`, `remove_worktree` のスケルトン）
- [ ] `src-tauri/src/commands/editor.rs` 作成（`open_in_editor`, `check_code_command` のスケルトン）
- [ ] `lib.rs` にコマンド登録

#### 1-5. Tauri invoke ラッパー（Frontend 側）
- [ ] `src/lib/tauri.ts` 作成（invoke ラッパー関数群）

---

### 2. リポジトリ管理

#### 2-1. Rust 側
- [ ] `validate_repository` 実装（git2 で Repository::open してリポジトリ情報を返す）
- [ ] `load_config` 実装（tauri-plugin-store から AppConfig 読込）
- [ ] `save_config` 実装（tauri-plugin-store に AppConfig 書込）
- [ ] RepositoryInfo / AppConfig の Rust 構造体定義（serde Serialize/Deserialize）

#### 2-2. Frontend 側
- [ ] サイドバーにリポジトリ一覧を表示
- [ ] リポジトリ追加ボタン（「+ リポジトリを追加」）
- [ ] ディレクトリ選択ダイアログ（Tauri Dialog API）→ validate → store 保存
- [ ] リポジトリ削除（サイドバーから登録解除、実ファイルは消さない）
- [ ] リポジトリ選択（クリックで切り替え、selectedRepositoryId 更新）
- [ ] 選択中リポジトリのハイライト表示
- [ ] リポジトリ名の表示（ディレクトリ名から自動取得）
- [ ] 各リポジトリの worktree 数をバッジ表示

---

### 3. worktree 表示

#### 3-1. Rust 側
- [ ] `list_worktrees` 実装（git2 で worktree 一覧取得）
- [ ] `get_worktree_status` 実装（git status --porcelain 相当、変更ファイル数カウント）
- [ ] WorktreeInfo / WorktreeStatus の Rust 構造体定義
- [ ] 最終コミット情報の取得（hash, message, time）
- [ ] main/primary worktree の判定ロジック

#### 3-2. Frontend 側
- [ ] WorktreeGrid コンポーネント（2 列 Grid レイアウト）
- [ ] WorktreeCard コンポーネント
- [ ] カード表示: ラベル（デフォルトは dir 名）
- [ ] カード表示: ブランチ名（副次情報、小さく表示）
- [ ] カード表示: 変更ファイル数（合計のみ、ADR-0011）
- [ ] カード表示: 最終コミット（相対時間 + メッセージ）
- [ ] カード表示: VS Code ボタン
- [ ] カード表示: Remove ボタン
- [ ] main worktree のバッジ表示（Remove ボタン非表示）

---

### 4. worktree ラベル機能（ADR-0008）

#### 4-1. Rust 側
- [ ] ラベルの store 保存（worktree 絶対パスをキー）
- [ ] ラベルの store 読込
- [ ] ラベルの store 削除（worktree 削除時に連動）

#### 4-2. Frontend 側
- [ ] ラベル表示モード（デフォルト: worktree ディレクトリ名）
- [ ] 鉛筆アイコン → 編集モード切替
- [ ] インライン input 表示
- [ ] 確定ボタン（チェックマークアイコン）
- [ ] × アイコン（キャンセル）
- [ ] Cmd+Enter で確定
- [ ] Esc でキャンセル
- [ ] Enter 単独では確定しない（ADR-0008）
- [ ] 確定後に store 保存 → 表示モードに戻る
- [ ] 状態遷移: Idle → Editing → Saving → Idle（§11.7 参照）

---

### 5. worktree 削除（§11.6 参照）

#### 5-1. Rust 側
- [ ] `remove_worktree` 実装（git worktree remove）
- [ ] force オプション対応（未コミット変更がある場合）
- [ ] ブランチ削除オプション対応（git branch -D）
- [ ] 削除前の未コミット変更チェック（get_worktree_status 連携）

#### 5-2. Frontend 側
- [ ] 確認ダイアログコンポーネント
- [ ] ダイアログ表示: worktree 名・パス
- [ ] ダイアログ表示: 未コミット変更がある場合の警告メッセージ
- [ ] 「ブランチも一緒に削除する」チェックボックス
- [ ] 「削除」ボタン / 「キャンセル」ボタン
- [ ] 削除成功後にカードを除去 + store からラベル削除

---

### 6. エディタ連携（§11.8 参照）

#### 6-1. Rust 側
- [ ] `open_in_editor` 実装（`std::process::Command` で `code <path>` 実行）
- [ ] `check_code_command` 実装（`which code` で存在確認）

#### 6-2. Frontend 側
- [ ] 起動時 preflight チェック呼出（§11.3 参照）
- [ ] `codeAvailable` state を Zustand に保持
- [ ] code 不在時: アプリ上部にバナー警告表示
- [ ] code 不在時: 全カードの VS Code ボタンを disabled 化
- [ ] disabled ボタンのホバー時ツールチップ（「code コマンドが必要です」）
- [ ] VS Code ボタンクリック → `open_in_editor` 呼出

---

### 7. 自動リフレッシュ（ADR-0013、§11.5 参照）

#### 7-1. ポーリング
- [ ] `useAutoRefresh` カスタムフック作成
- [ ] setInterval（5 秒）で全リポジトリの worktree 一覧 + status 再取得
- [ ] 前回 state との diff 検出 → 変化がある場合のみ store 更新
- [ ] コンポーネント unmount 時に clearInterval

#### 7-2. 手動リフレッシュ
- [ ] リフレッシュボタン（上部ヘッダー or MainArea 内）
- [ ] クリックで即時 refreshWorktrees() 実行
- [ ] Cmd+R グローバルショートカット登録
- [ ] リフレッシュ中のローディング表示（任意）

---

### 8. アプリ起動シーケンス（§11.3 参照）

- [ ] アプリ起動時に `load_config` → リポジトリ一覧取得
- [ ] 起動時に `check_code_command` → preflight チェック
- [ ] 起動時に各リポジトリの `list_worktrees` → worktree 一覧取得
- [ ] 起動後にポーリングタイマー開始
- [ ] tauri-plugin-window-state によるウィンドウサイズ復元の確認

---

### 9. 仕上げ

- [ ] テンプレート由来の不要ファイル削除（public/tauri.svg, public/vite.svg, src/assets/react.svg 等）
- [ ] UI テキストの日本語化（ADR-0009）
- [ ] エラーメッセージの日本語化
- [ ] preflight 警告バナーの日本語テキスト
- [ ] 自分の grove-app worktree でドッグフーディング開始
- [ ] NEXT.md の更新（次セッションへの引き継ぎ）

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
