# Grove

Git worktree を GUI で直感的に管理する macOS デスクトップアプリケーション。

複数リポジトリの worktree を一覧表示し、各 worktree の状態（ブランチ / 変更ファイル数 / ahead・behind / 最終コミット）をひと目で把握できる。

## ステータス

**β 配布中（Pre-release）** — M1 マイルストーン進行中。GitHub Releases でプレリリース版を配布。
正式版（M2）ではコード署名・自動更新・Homebrew tap 配布を予定。

## スクリーンショット

<!-- TODO: docs/images/ にメイン画面のスクリーンショットを追加後、下記 img タグを有効化する -->
<!-- ![Grove メイン画面](./docs/images/screenshot-main.png) -->

*スクリーンショットは準備中。*

## できること

- 複数の Git リポジトリを登録してサイドバーから切り替え
- 各リポジトリの worktree をカード一覧で表示（ブランチ名 / 変更ファイル数合計 / ahead・behind / 最終コミット）
- ブランチステータスバッジ（`active` / `merged`）で作業状況を可視化
- worktree ごとにカスタムラベルを付けられる（インライン編集）
- worktree カードをドラッグ＆ドロップで並び替え（順序は永続化）
- VS Code / ターミナルで worktree を 1 クリック起動（ターミナルアプリは設定で選択可）
- worktree の削除（未コミット変更の警告 + ブランチ同時削除オプション）
- 5 秒ごとの自動リフレッシュ + 手動リフレッシュで remote fetch（`Cmd+R`）
- `Last fetched` 表示で最終 fetch からの経過時間を常時確認
- 操作結果はトースト通知でフィードバック（成功 / エラー）
- `code` / ターミナルアプリ未検出時は起動時に警告バナーで事前通知（[ADR-0012](./docs/adr/0012-preflight-ux-principle.md)）

## 前提条件

- **macOS 12 Monterey 以降**（Apple Silicon）
- **Git 2.5 以降**（worktree 機能が利用可能なバージョン）
- **Visual Studio Code**（任意）
  - `code` コマンドが PATH 上にあると「VS Code で開く」ボタンが使える
  - VS Code 未インストール / `code` 未導入でも Grove 自体は動作する（該当ボタンのみ無効化）
  - `code` コマンドの導入: VS Code を起動 → Command Palette（`Cmd+Shift+P`）→ `Shell Command: Install 'code' command in PATH`
- **ターミナルアプリ**（任意）
  - macOS 標準の `Terminal.app` がデフォルト。設定で iTerm2 / Warp 等に切り替え可能
  - 未検出時は「ターミナルで開く」ボタンが無効化される

## インストール

### 1. `.dmg` をダウンロード

[GitHub Releases](https://github.com/chieeeeno/grove/releases) から最新のプレリリース（`v0.1.0-beta.x`）の `Grove_0.1.0_aarch64.dmg` をダウンロードする。

### 2. Applications フォルダにドラッグ

ダウンロードした `.dmg` を開き、表示された Grove.app を **Applications** フォルダにドラッグ＆ドロップする。

### 3. 初回起動（右クリック → 開く）

Grove は現在 **コード署名をしていないβ版** のため、ダブルクリックでの起動は macOS の Gatekeeper にブロックされる。初回は以下の手順で起動する:

1. Finder で Applications フォルダを開く
2. **Grove.app を右クリック**（または Control+クリック）
3. メニューから「**開く**」を選択
4. 「"Grove" の開発元を確認できません。開いてもよろしいですか？」ダイアログで「**開く**」をクリック

2 回目以降は通常のダブルクリックで起動できる。詳細な背景は [ADR-0007: 配布形態](./docs/adr/0007-distribution.md) を参照。

> M2 で Apple Developer Program の署名を導入する計画あり（[#19](https://github.com/chieeeeno/grove/issues/19)）。

## 基本的な使い方

### リポジトリを追加する

1. サイドバーの「**+**」ボタンをクリック
2. ディレクトリ選択ダイアログで Git リポジトリのルートを選ぶ
3. サイドバーに追加され、worktree 数がバッジで表示される

### worktree 一覧の見方

メインエリアには選択中リポジトリの worktree がカード一覧で表示される。ヘッダー右側の `Last fetched: 〜前` で最終 fetch からの経過時間を確認できる。

- **ラベル**: 鉛筆アイコンでカスタム名に編集できる（デフォルトはディレクトリ名）
- **ブランチ名**: その worktree がチェックアウトしているブランチ
- **ステータスバッジ**: `active`（作業中）/ `merged`（マージ済み）/ idle（表示なし）
- **変更ファイル数**: modified / added / deleted の合計数（[ADR-0011](./docs/adr/0011-changed-files-display.md)）
- **ahead / behind**: upstream ブランチとのコミット差分（`↑ N` / `↓ N`。未追跡の場合は表示なし、[ADR-0010](./docs/adr/0010-ahead-behind-display.md)）
- **最終コミット**: 相対時間 + コミットメッセージ
- **main バッジ**: primary worktree には `main` バッジが付き、Remove ボタンは非表示

### カードを並び替える

非 main の worktree カードはドラッグ＆ドロップで並び替えできる。並び順はリポジトリごとに保存される。

### VS Code で開く

各カードの「VS Code で開く」ボタンをクリックすると `code <worktree のパス>` が実行される。`code` コマンドが見つからない場合は上部に警告バナーが出て、全ボタンが無効化される（ホバーでツールチップ表示）。

### ターミナルで開く

「<ターミナルアプリ名> で開く」ボタンで、設定中のターミナルアプリで該当 worktree のパスを開く。ターミナルアプリが検出できない場合はボタンが無効化される。

### ラベルを編集する

1. カードのラベル横の **鉛筆アイコン** をクリック
2. インライン入力モードに切り替わる
3. **チェックアイコン** または **`Cmd+Enter`** で確定
4. **`Esc`** または **× アイコン** でキャンセル

> `Enter` 単独では確定しない（誤操作防止、[ADR-0008](./docs/adr/0008-worktree-label.md)）。

### worktree を削除する

1. カードの **Remove ボタン** をクリック
2. 確認ダイアログが表示される
   - 未コミットの変更がある場合は警告が出る
   - 「ブランチも一緒に削除」チェックボックスで同時削除を選択可
3. 「削除」で確定

### リフレッシュ

- **自動**: 5 秒間隔でローカル worktree 状態を再取得（`git fetch` は実行しない、[ADR-0013](./docs/adr/0013-refresh-strategy.md)）
- **手動**: ヘッダーのリフレッシュボタン — `git fetch` を実行してから worktree 一覧を更新する（ahead / behind と `Last fetched` が更新される）
- **キーボード**: `Cmd+R`（手動リフレッシュと同じ。fetch 込み）

## 既知の問題（Known Issues）

- **初回起動時に「開発元が確認できません」警告が出る** — 署名なし配布のため（[ADR-0007](./docs/adr/0007-distribution.md)）。上記の「右クリック→開く」で回避可能。M2 で署名導入予定（[#19](https://github.com/chieeeeno/grove/issues/19)）
- **M1 で実装予定の機能はまだ未対応**:
  - worktree 新規作成（[#4](https://github.com/chieeeeno/grove/issues/4)） — 現状は外部ツールで作成後、Grove で管理
  - worktree rename（[#2](https://github.com/chieeeeno/grove/issues/2)）
  - ファイル監視ベースのリフレッシュ（[#1](https://github.com/chieeeeno/grove/issues/1)） — 現状はポーリングのみ

## 開発者向け

ソースからビルド・テストを行う場合は [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) を参照。

## ライセンス

[Apache License 2.0](./LICENSE)

## 参考ドキュメント

- [grove-design.md](./grove-design.md) — 設計書本体
- [ROADMAP.md](./ROADMAP.md) — マイルストーン（M0 / M1 / M2）
- [docs/adr/](./docs/adr/) — 意思決定記録（ADR、13 件）
