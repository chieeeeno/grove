# ブログネタ候補

> Grove 開発で気づいた・工夫した・迷ったことをブログ記事にするためのメモ。
> 随時追記していく。

---

## 設計フェーズ

### 個人開発でも ADR（Architectural Decision Records）を書く
**タグ**: 設計, 個人開発, プロセス  
**一言**: 個人開発でも「なぜそう決めたか」を記録することで、実装中の迷いが消える。

**ネタ**:
- 13 件の ADR を策定してから実装に入った
- 設計者と実装者が同じ人間でも、時間が経つと「なんでこう決めたんだっけ」が起きる
- ADR があることで「これは ADR-0008 で決めた通りにやれば良い」と即断できる
- テンプレート: 背景 / 検討した選択肢 / 決定 / 理由 / 却下した選択肢の理由

---

### 「事後エラーより事前警告」を UX 原則として ADR に残した話（ADR-0012）
**タグ**: UX設計, フロントエンド, Tauri  
**一言**: ボタンを押してからエラーダイアログを出すのは UX が悪い。事前に分かっている問題は事前に伝える。

**ネタ**:
- VS Code ボタンの `code` コマンド不在ケースの設計が起点
- 「reactive（押したらエラー）」vs「preflight（起動時チェック + ボタン無効化）」
- バナー警告 + ボタン disabled + ツールチップという 3 点セット
- アプリ全体の原則として ADR に昇格させた経緯
- preflight が困難なケース（実行時にしか分からない条件）の例外設計

---

### 永続化キーを何にするか：worktree ラベルの設計で迷ったこと（ADR-0008）
**タグ**: 設計, データモデル, Rust  
**一言**: 「絶対パス」「UUID」「複合キー」の中から何を選ぶか。シンプルさ vs 堅牢性のトレードオフ。

**ネタ**:
- ラベルの永続化キーの選択肢: 絶対パス / ブランチ名+リポジトリID / UUID / 複合キー
- 「ユーザーが dir 名を基本変えない」という実運用ベースの判断
- rename 時のラベル消失を「仕様」として割り切った理由
- 例外ケースのためにオーバーエンジニアリングしない判断軸
- M1 で rename 機能を作れば問題ごと解決するという設計の先回り

---

### リフレッシュ戦略を段階設計する：M0 ポーリング → M1 ファイル監視（ADR-0013）
**タグ**: 設計, Rust, パフォーマンス  
**一言**: 「動くものを早く作ってから最適化」をマイルストーンに組み込む設計。

**ネタ**:
- ポーリング（5 秒間隔）vs ファイル監視（`notify` crate）のトレードオフ
- worktree 数が増えると線形コスト増になるポーリングの限界
- 最初からハイブリッドにしない理由（M0 完成スピード優先）
- M1 ファイル監視移行時の設計考慮点（デバウンス / 監視解除 / FSEvents の罠）
- 「動いてからドッグフーディングで実感して最適化」というサイクル

---

### 将来機能の実現可能性を先に検証する：スパイク調査の進め方
**タグ**: 設計, 調査, Claude Code  
**一言**: Phase 2（Claude Code エージェント連携）の実現可能性を、設計段階で三次まで検証した。

**ネタ**:
- 将来機能が「技術的に実現不可能」だと判明してから設計を変えるのはコストが高い
- スパイク調査: 公式ドキュメントを根拠として積み上げる方法
- Claude Code の `--output-format stream-json` と `claude_ai_tool_use` イベントの活用
- 三次調査まで実施して「公式裏付けあり、修正不要」を確認してから設計を確定させた

---

### AI と壁打ちしながらコードを一行も書かずにアプリを開発する
**タグ**: AI活用, 個人開発, Claude Code, 開発プロセス  
**一言**: 設計・デザイン・実装のすべてを「会話」だけで進める個人開発のプロセス記録。

**ネタ**:
- 自分でコードを書かず、Claude との会話だけで開発が進む
- 「何を作るか」「なぜそう決めるか」の意思決定は人間が行い、「どう実装するか」は AI が担う
- 設計フェーズ: 設計書・ADR・ROADMAP をすべて会話の中で策定
- デザインフェーズ: Pencil MCP を通じて AI がデザインツールを操作
- 実装フェーズ: Claude Code が Rust / TypeScript のコードを生成・修正
- 「壁打ち相手」としての AI：選択肢を出して、却下理由も含めて整理してもらう
- 会話ログが設計の根拠になる（ADR の「なぜそう決めたか」が会話から生まれる）
- このプロセスで何が難しいか：意図を正確に伝えること、判断の質を保つこと
- 個人開発の「一人でやる孤独感」が AI との壁打ちで変わる感覚

**形式案**: 開発日記 / プロセス記録として連載形式でも書けるかも

---

### AI（Claude）+ Pencil でデザインモックを作る：デザイナーなし個人開発のワークフロー
**タグ**: AI活用, デザイン, 個人開発, Claude  
**一言**: デザイナーでない開発者が、AI にデザインツール（Pencil）を操作させて本格的な UI モックを作った話。

**ネタ**:
- Pencil（.pen ファイル）は MCP サーバー経由で AI が操作できるデザインツール
- Claude に「3カラムレイアウトのメイン画面を作って」と指示するだけでモックが生成される
- カラー変数・コンポーネント・インスタンス・ダーク/ライトテーマ切替まで対応
- 実際に作ったもの: メイン画面 / 設定ダイアログ / ホバー & アクティブ状態 / 削除確認ダイアログ / ラベル編集状態遷移 / preflight 警告バナー（計6種 × ダーク/ライト）
- Figma との比較（できること・できないこと）
- 「デザイン仕様を言語で伝える」スキルが AI デザインの鍵になる
- 生成されたモックをそのまま実装の参照として使える工程の繋がり

---

## 実装フェーズ

### Chrome DevTools MCP でデザイン確認しながら実装する
**タグ**: AI活用, フロントエンド, 開発プロセス  
**一言**: AI がブラウザの DevTools を操作してスクショを撮り、レイアウトを自分で確認・修正するワークフロー。

**ネタ**:
- Tauri アプリのブラウザプレビュー（localhost:1420）+ Tauri API モック注入で UI 確認
- `initScript` で `__TAURI_INTERNALS__` をモックし、ダミーデータでレンダリング
- Chrome DevTools MCP の `take_screenshot` / `click` / `hover` / `evaluate_script` を活用
- ユーザーに毎回スクショを撮ってもらう手間がなくなる
- ホバー効果やアニメーションの確認もブラウザ上でできる

---

### lefthook でテスト必須の pre-commit を設定する
**タグ**: DX, CI, 個人開発  
**一言**: テストが落ちたらコミットできない仕組みを lefthook で構築。Husky より速くてシンプル。

**ネタ**:
- lefthook vs Husky vs simple-git-hooks の比較
- Go バイナリで並列実行がデフォルト（OXLint + Prettier + Vitest + cargo test が同時に走る）
- YAML 1ファイルで完結、lint-staged 不要
- Tauri の多言語構成（TS + Rust）でも1つの設定で両方カバー
- テスト失敗でコミットがブロックされることを実際に確認した話

---

### Claude Code の Bash ツールと PATH 問題 — package.json スクリプトで解決する
**タグ**: Claude Code, 開発環境, Tauri, トラブルシューティング  
**一言**: Claude Code のセッションから `pnpm tauri build` が動かない。`.zshrc` に PATH 足しても解決しない。原因と解決策。

**ネタ**:
- `pnpm tauri dev` / `pnpm tauri build` が Claude Code から実行できない
- エラー: `failed to run 'cargo metadata': No such file or directory`
- 原因: Claude Code の Bash ツールは**非対話シェル**で実行される
  - `.zshrc` は対話シェルのみで読み込まれる（非対話では読まれない）
  - `.zshenv` は非対話でも読まれるが、Claude Code セッション自体の PATH は起動時に固定されている
- 試した解決策
  - ❌ `~/.zshenv` に `. "$HOME/.cargo/env"` を追加 → 既にあるのに効かない
  - ❌ `~/.claude/settings.json` の `env` で `PATH` を直接書く → 他のツールが壊れる（PATH 上書き）
  - ✅ `package.json` の `tauri` スクリプトで `PATH="$HOME/.cargo/bin:$PATH" tauri` と明示
- この方法なら Claude Code からもターミナルからも両方動く
- プロジェクト固有の設定なのでグローバル汚染なし
- 副次的な学び: lefthook の rust コマンドも同じ問題がある

**副題案**: 「Claude Code の Bash ツール特性と、package.json でラップする技」

---

### Tauri アプリをビルドして触ってみる — 初回の本番ビルドと配布形式
**タグ**: Tauri, ビルド, 配布, macOS  
**一言**: Tauri 2 アプリの本番ビルドが意外と速い。生成物の種類と macOS での配布の罠。

**ネタ**:
- `pnpm tauri build` で生成されるもの
  - `Grove.app`（macOS アプリ本体）
  - `Grove_0.1.0_aarch64.dmg`（4.1MB のインストーラ）
- 初回ビルドは遅いけど、増分ビルドは45秒くらいで終わる
- .dmg 生成は `bundle_dmg.sh` が自動で実行
- 署名なしだと「開発元を確認できません」警告が出る → 右クリック→開くで回避
- Apple Developer Program の年 $99 問題（ADR-0007）
- M1 段階では署名なしで配布、M2 で再判断
- aarch64 だけ生成される（Apple Silicon のみ、Intel Mac は別ビルドが必要）

---

### 個人開発でも GitHub Issues でタスク管理する理由
**タグ**: 個人開発, GitHub, プロジェクト管理  
**一言**: PROGRESS.md と ROADMAP.md だけで管理していたタスクを GitHub Issues 23件に書き起こした話。

**ネタ**:
- M0 完成目前で、M1 以降のタスクを issue 化
- Markdown の「やりたいことリスト」との違い
  - ラベル・マイルストーンで構造化できる
  - 後から検索しやすい
  - PR と紐付けられる（`Fixes #X`）
  - クローズ時の履歴が残る
- ラベル設計: `milestone:M1/M2`, `priority:high/medium/low`, `type:feature/infra`, `phase:2`
- タイトル + 背景 + やること + 参考 のテンプレート
- 23件を `gh issue create` で一気に作成
- 副次的な効果: コミットメッセージに `#N` で参照できる
- 個人開発でもやる理由
  - 1年後の自分への手紙
  - β ユーザーへの公開ロードマップ代わり
  - OSS 化した時にそのまま使える

---

### Tauri 2 の E2E テスト戦略 — macOS で tauri-driver が使えない話
**タグ**: Tauri, テスト戦略, macOS, E2E  
**一言**: 「Playwright でええやろ」と思って調査したら、Tauri の現実がもっと厳しかった話。

**ネタ**:
- 最初は「Playwright（ブラウザモード）+ Tauri API モック」を提案してた
- Web 調査の結果、**Playwright は Tauri で直接動かない**ことが判明
  - Tauri は WebKitGTK/WKWebView を使用、Playwright は Chromium 限定
- さらに **tauri-driver が macOS 非対応**という事実
  - 公式ドキュメント: "macOS which does not provide a desktop WebDriver client"
  - Grove は macOS only（ADR-0004）なので、この経路も使えない
- 結論: **macOS only の Tauri アプリでは E2E 自動化が物理的に不可能**
- 代わりの方針: 3層テスト戦略
  1. cargo test（Rust）
  2. Vitest + 公式 `mockIPC`（フロントエンド統合）
  3. Manual QA（リリース前の関所）
- Tauri 公式が提供する `mockIPC` / `MockRuntime` の紹介
- 「調べずに方針決めると後で全部ひっくり返る」教訓
- ソース: tauri.app, GitHub Discussions, 実際のプロダクションアプリ（Spacedrive 等）の事例

**形式案**: 調査記事 / 技術選定失敗と軌道修正のログ

---

### QA チェックリストを Given/When/Then 形式で書く：個人開発の品質管理
**タグ**: QA, テスト設計, 個人開発  
**一言**: チェックボックス形式の「確認事項リスト」を、テスト実施者が迷わない Given/When/Then 形式に書き直した話。

**ネタ**:
- 最初は単純な箇条書きチェックリストを作った（約100項目）
- 指摘: 「前提条件・操作・期待値が分かる形式にしてほしい」
- Given/When/Then（BDD 風）に全面リライト → 約80テストケース
- 各テストケースに必要な準備データ（fixture リポジトリ）も明記
- 設定ファイルのパスとリセット用シェルコマンドも冒頭に掲載
- 異常系20+ ケース: 設定ファイル破損・権限なし・巨大データ・並行操作・システムスリープ等
- テストケースに ID（TC-X.Y.Z）を振って参照性を高める
- 個人開発でもここまで書くと後で自分を助けてくれる
- 「自動化できないもの」を明確にすることで Manual QA の価値が上がる

---

### AI と一緒にアプリアイコンをデザインする：Pencil で3段階の絞り込みプロセス
**タグ**: AI活用, デザイン, アプリアイコン, Pencil  
**一言**: デザイナーでない開発者が AI と対話しながらアプリアイコンを完成させるまでの試行錯誤。

**ネタ**:
- Grove のアイコンをゼロから作成
- **段階1**: 4つの方向性（シンプル木 / 木立 / ブランチ / UI統一）を並べて比較
- **段階2**: 選んだ方向性の色違い6パターン
- **段階3**: さらに A3/C1 の派生3パターン
- **段階4**: アイコン内部のサイズ比率4段階比較（51% / 63% / 74% / 86%）
- **段階5**: 最終2案をダーク背景/ライト背景で並べて確認
- 最終決定: C1（緑グラデ + trees、63%サイズ）
- macOS アイコンの「角丸を画像に焼き込む必要がある」という罠
  - iOS/Android はシステムが自動マスク
  - macOS はそのまま表示される
  - Apple の squircle（連続曲率）は厳密には単純な cornerRadius と違う
- 1024×1024 PNG を Pencil で書き出し → `tauri icon` コマンドで全形式生成
- Pencil の採用版/不採用版を .pen ファイル内で物理的に分離（座標を遠くに）
- 「AI が提案 → 人間が絞り込む → AI が調整」のサイクル

---

### 「M0 は表示だけ、実装は M1+」という割り切り：設定ダイアログの段階実装
**タグ**: 個人開発, スコープ管理, Tauri  
**一言**: 設定ダイアログにテーマ選択・エディタ選択・更新間隔の3項目があるが、M0 では1項目だけを動かす判断。

**ネタ**:
- Pencil デザインには3セクション（テーマ/エディタ/自動更新）があった
- 最初は全部 UI だけ実装して、機能は M0 外と記載
- ユーザーからの指摘: 「未対応なら隠しておいて」
- テーマ選択とエディタ選択を削除（コメントアウトではなく完全削除）
- 自動更新間隔だけを動く状態にリリース
- 「中途半端な UI が残ると混乱を招く」という学び
- `docs/design-fixes.md` に後続タスクを記録
- 段階的実装の割り切り方

---

### Pencil デザイントークンを Tailwind v4 @theme inline に変換する
**タグ**: Tailwind CSS, デザインシステム, Tauri  
**一言**: Pencil の `get_variables` でデザイントークンを取得し、CSS カスタムプロパティ → Tailwind @theme inline に変換した。

**ネタ**:
- Pencil MCP の `get_variables` でダーク/ライト両テーマの変数値を一括取得
- CSS カスタムプロパティ（:root / [data-theme="light"]）で定義
- @theme inline で Tailwind ユーティリティに変換（bg-app, text-fg, hover:bg-vs-hover 等）
- style prop からの脱却: inline style → Tailwind クラスへの移行
- ホバー/アクティブ状態もすべて Tailwind で完結

---

---

## 技術選定

### なぜ Tauri を選んだか：Electron との比較と個人開発での判断軸
**タグ**: Tauri, Electron, Rust, 技術選定  
**一言**: デスクトップアプリのフレームワーク選定で「Electron じゃなく Tauri を選んだ理由」と、その判断プロセス。

**ネタ**:
- Electron vs Tauri の基本的な違い（バンドルサイズ / メモリ / セキュリティモデル）
- Git 操作に Rust（git2 crate）を使う設計との相性
- WebView ベースなので React / Tailwind をそのまま使える
- 個人開発での学習コスト: Rust を書く必要があるがバックエンドは薄い
- Tauri 2 系で変わったこと（プラグインシステム等）

---

### 技術スタックの選定理由まとめ：Tauri 2 + React 19 + Rust
**タグ**: 技術選定, 設計, 個人開発  
**一言**: Grove のスタック全体の選定理由を一記事でまとめる。なぜこの組み合わせにしたか。

**ネタ**:
- **Tauri 2**: Electron 比でバンドルサイズ小・メモリ少、Rust との親和性
- **React 19**: 慣れた技術を選んで不確実性を減らす。新機能（Server Actions 等）は使わない
- **TypeScript**: 個人開発でも型安全は正義。Rust 側の型定義と対応関係を保ちやすい
- **Tailwind CSS v4**: デザイン変数との相性、JIT の恩恵
- **Zustand**: Redux より軽量、ボイラープレートが少ない。個人開発規模に最適
- **git2 crate**: libgit2 の Rust バインディング。`git` コマンドの子プロセス起動より安定
- **tauri-plugin-store**: JSON ファイルベースの永続化。DB は過剰なのでこれで十分

---

### macOS のみ対応にした理由：クロスプラットフォームを諦める判断（ADR-0004）
**タグ**: 技術選定, macOS, 個人開発  
**一言**: Tauri はクロスプラットフォームできるのに、なぜ macOS だけにしたか。

**ネタ**:
- 「できる」と「すべき」は違う
- 実機検証できない OS には対応できない（Linux / Windows を持っていない）
- Phase 2（Claude Code 連携）のプロセス検知が OS ごとに API が異なる
- macOS だけに絞ることで実装に集中できる
- Tauri はクロスプラットフォーム前提の設計なので後から追加も可能

---

### 個人開発での配布戦略：署名なし GitHub Releases スタートの判断（ADR-0007）
**タグ**: 配布, macOS, 個人開発, Apple Developer  
**一言**: M1（β 配布）を「署名なし・GitHub Releases のみ」で始める理由と、将来の切り替え計画。

**ネタ**:
- Apple Developer Program の年 $99 問題
- 「プロジェクトを続ける覚悟が固まったタイミングで課金する」という判断軸
- 署名なし dmg の起動時警告（「開発元が確認できません」）とその回避方法
- 知人配布フェーズでは README に手順を書けば十分
- 後から署名に切り替えるのに必要な作業量（コード変更ゼロ、設定だけ）

---

## リファクタリング・品質改善

### /simplify スキルで自分のコードを定期レビューする開発ループ
**タグ**: AI活用, コードレビュー, Claude Code, 開発プロセス
**一言**: 書いたコードに 3 種類のレビューエージェントをかけて、指摘を 1 件 1 コミットで潰していく「自分で自分をレビューする」ワークフローの実例。

**ネタ**:
- `/simplify` は 3 種類の review agent（Reuse / Quality / Efficiency）を並列起動する自作スキル
- 1 セッションで同じコード範囲に対して 3 回 simplify を回した事例:
  - 1 回目: 実装直後のコードへ → 27 件の指摘 → 11 コミットで修正
  - 2 回目: 修正されたコード範囲へ → さらに 10 件の指摘 → 10 コミットで修正
  - 3 回目: doc コメント追加後へ → 事実誤認 3 件・記述精度 4 件 → 3 コミットで修正
- **却下の勇気**: 全ての指摘に従う必要はない。プロジェクト方針（例: doc はサボらず書く）と衝突する指摘は却下する判断が重要
- 却下例: 「Rust struct と TS interface のフィールド doc は片方に集約すべき」→ 「両方に書く方針」と衝突するのでスキップ
- false positive 例: git2 の `update_index(false)` はデフォルトで OFF なので明示しても no-op
- エージェントの指摘を 1 件 1 コミットにすることで、後から差分を追いやすい
- レビュー結果を TaskCreate で追跡 → completed / deleted を使い分ける

---

### コミットは指摘項目ごとに分ける — AI ペア開発での粒度ルール
**タグ**: Git, ワークフロー, AI活用, 個人開発
**一言**: AI が「まとめて直しておきました」とやると後で追えない。レビュー指摘 1 件 = 1 コミット を徹底すると差分が読める。

**ネタ**:
- AI に「これとこれ直して」と依頼するとデフォルトで 1 コミットにまとめがち
- 「指摘項目ごとにコミット」と明示的に指示した理由
- 間違って 2 件まとめてしまった時は `git commit --amend` で分離するか、作り直す
- コミットメッセージは日本語で「なぜ直すか」を書く
- lefthook の pre-commit が走るので、各コミットでテストが通っている保証が得られる
- あとから半年経って `git log` を読んだ時に、それぞれの判断理由が追える
- 副次効果: AI の「まとめすぎ」を防ぐことで、1 つ 1 つの判断を確認できる
- コミット粒度の保全は memory（`feedback_commit_granularity.md`）に書いて全セッションで一貫化

---

## パフォーマンス最適化

### Tauri アプリの GUI 起動時に `code` コマンドが見つからない — macOS launchd の PATH 問題
**タグ**: Tauri, macOS, トラブルシューティング, PATH
**一言**: `zsh` のターミナルからは動くのに、Finder から起動すると「code コマンド見つかりません」のバナーが出続ける。犯人は macOS の launchd。

**ネタ**:
- 症状: preflight バナー（ADR-0012）が消えない。VS Code の「Install 'code' command in PATH」は実行済み
- ユーザーの誤解: 「VS Code の Install PATH は `.zshrc` に追加してるはず」→ **実は `/usr/local/bin/code` にシンボリックリンクを張るだけ**
- 本当の原因: macOS launchd は GUI 起動時に PATH = `/usr/bin:/bin:/usr/sbin:/sbin` のみ渡す。`/usr/local/bin` は入らない
- `pnpm tauri dev`（ターミナル起動）では親シェルの PATH を継承するので動く → だから開発中は気付かない
- 解決策の 2 段階:
  1. 既知パス（`/usr/local/bin/code`, `/opt/homebrew/bin/code`, `/Applications/Visual Studio Code.app/.../bin/code`）を直接 stat
  2. フォールバックで `$SHELL -l -c 'command -v code'` でログインシェル経由で解決
- さらに `OnceLock` でキャッシュして、open_in_editor のたびにシェル起動しない
- Tauri 開発者が踏みがちな罠なのでドキュメント化したい
- 類似問題: Homebrew の brew、nvm の node、pyenv の python 等も同じ

**副題案**: 「Finder 起動の Tauri は PATH が貧弱 — 実行パスは自分で解決しろ」

---

### リポジトリ切り替え時のラグを分解する — Grove パフォーマンス分析の記録
**タグ**: パフォーマンス, Tauri, Rust, libgit2
**一言**: ユーザーが体感した「カードが出るまで一瞬待つ」ラグを 5 つの要因に分解して issue 化するまで。

**ネタ**:
- 症状: ワークツリーの多いリポジトリを選択すると、メインエリアにカードが並ぶまで体感で一瞬のラグ
- 処理フローを 8 ステップに分解: click → selectedRepositoryId 更新 → useMemo → 空状態描画 → useEffect 発火 → listWorktrees IPC → Rust status 走査 → setWorktrees → カード描画
- 時間の内訳:
  - A. Rust `count_modified_files` の working tree 全走査（80%）
  - B. main worktree の走査が `thread::scope` の前に直列（10%）
  - C. React 描画（5%）
  - D. IPC シリアライズ（<5%）
  - E. 空状態フラッシュ（体感に直結、時間ではない）
- 改善案の優先順位付け: main の並列化 + 起動時 pre-fetch + スケルトン UI で 3 点セット
- プロファイリングを先にしてから最適化する価値
- 「一瞬のラグ」を issue に落とすときの分析粒度

**副題案**: 「原因を 5 つに分解して GitHub Issue に積むまで」

---

### Rust の `std::thread::scope` で worktree 走査を並列化する — rayon 不要のシンプル並列化
**タグ**: Rust, 並列処理, libgit2, git2-rs
**一言**: `std::thread::scope`（Rust 1.63+ stable）を使えば、borrow checker に怒られずに scope 内で短命スレッドを spawn できる。新 crate 不要。

**ネタ**:
- M0 では worktree 走査を `for` ループで直列実行していた
- rayon を入れる前に `std::thread::scope` を試した
- libgit2 の Repository インスタンスはスレッドセーフではないが、**別インスタンスなら別スレッドから使える**
- パス一覧を先に収集 → 各スレッドで `Repository::open` + `count_modified_files`
- scope 内で借用できるので `Arc` 不要
- 10 worktree くらいなら thread spawn のオーバーヘッドを並列化の恩恵が上回る
- コード例: `git_worktree_prune` と `Worktree` の Send/Sync 制約との付き合い方
- rayon との比較: 今回は依存減らしたかったので std で完結

---

### Zustand の setter に差分検出を入れて React.memo の連鎖を効かせる
**タグ**: React, Zustand, パフォーマンス, 状態管理
**一言**: ポーリングで 5 秒ごとに setWorktrees するが、中身が同じなら参照を維持する。これで `React.memo` の連鎖が UI まで届く。

**ネタ**:
- 素朴な実装: `setWorktrees(id, worktrees)` は毎回 `{ ...state.worktrees, [id]: worktrees }` で新参照を作る
- 問題: ポーリングで内容ゼロ変化でも store → App → Sidebar → WorktreeGrid → WorktreeCard まで再レンダーが伝播する
- 解決: setter 内で `worktreesEqual(existing, worktrees)` を判定して同一なら `return s` で state を据え置く
- ただしこれだけでは不十分 — **上流で毎回 `[...worktrees]` や新 object を作る親がいると効果が消える**
- 親側も `useMemo` で派生値を安定化して、props の参照が変わらないようにする
- `WorktreeCard` は `memo()` でラップし、callback は `useCallback` で stable に
- これで 5 秒ポーリングでも **変化ゼロなら再描画ゼロ** が成立
- 差分検出が Zustand の updater コールバックが同一参照を返した時に state を変更しない性質とセットで機能する
- ベンチマーク: Chrome DevTools の Performance パネルで「本当に再描画されてない」を確認する方法

**副題案**: 「no-op ガードの連鎖 — store から UI まで再レンダーを消す」

---

### OnceLock で Rust の重い初期化を一度だけ実行する
**タグ**: Rust, パフォーマンス, 標準ライブラリ
**一言**: プロセス寿命中に一度だけ計算したい値（`code` コマンドの絶対パスなど）を `std::sync::OnceLock` で遅延初期化。lazy_static も once_cell も不要。

**ネタ**:
- Rust 1.70+ で stable 化された `std::sync::OnceLock<T>`
- 使いどころ: 環境変数解決、外部バイナリパス解決、ログインシェル経由の PATH 取得などの**重いが結果が変わらない処理**
- 今回の例: `resolve_code_path()` はログインシェル（zsh -l）起動で数十〜数百 ms かかる
- `OnceLock::get_or_init(expensive_fn)` で初回だけ実行、2 回目以降は `Option<&'static str>` を即返し
- `lazy_static!` / `once_cell::sync::OnceCell` との比較
- スレッドセーフ（`get_or_init` は競合時も 1 回しか実行されない）
- null 可能な結果（`Option<String>`）もキャッシュできる
- キャッシュ無効化が要らない場合限定 — 環境変化に追従したいときは別の仕組み

---

## Doc コメント・ドキュメンテーション

### Doc コメントを後付けで導入するときの優先順位
**タグ**: ドキュメンテーション, Rust, TypeScript, 個人開発
**一言**: 実装が先行して doc コメントが手薄になったプロジェクトを整備するとき、どこから書けばいいか。

**ネタ**:
- 実装してから「関数の doc が足りない」と気付くのはよくある
- 整備の優先順位:
  1. 公開 API・IPC ブリッジ（呼び出し側が一次情報として参照する）
  2. DTO 構造体のフィールド（単位・センチネル値・制約）
  3. 副作用を持つ関数（store 更新・ファイル I/O）
  4. 内部ヘルパー（自明なら省略可）
- `#[tauri::command]` と JSDoc の両側で同じ情報を書く冗長性と、それを許容する判断
- `@param` / `@returns` / `# Arguments` / `# Returns` / `# Errors` を省略しないルール
- 「型で自明な情報」と「型で表現できない情報」の区別
  - 自明: `id: string` を「文字列 id」と説明するのは冗長
  - 非自明: 単位 (ms/seconds)、正規化責任、センチネル値、失敗条件
- 後付けで整備する利点: 実装を読みながら書けるので誤情報が入りにくい
- CLAUDE.md に「Doc コメントルール」を追加してルール化 → 今後の実装で自動適用

---

### AI ペア開発で「doc コメントをサボらせない」ためのルール保全
**タグ**: AI活用, ドキュメンテーション, Claude Code, プロジェクト管理
**一言**: AI が書くコードの doc コメントは油断すると「概要プロセ」で終わる。`@param` / `@returns` を必ず書かせるルール化の記録。

**ネタ**:
- AI に doc コメントを書かせると、自然文の概要だけで `@param` / `@returns` を省略しがち
- ユーザーから「params とか return の記載もサボらずに書いてください」の指摘
- **memory に feedback として保存** → 以降のセッションでも同じ方針で書く
- プロジェクトの `CLAUDE.md` にもルールを追加 → プロジェクトレベルでも保全
- 「サボらない」の具体化: 構造化セクション（@param/@returns/# Arguments）と概要文の**併用**
- 型システムで表現できる情報と、表現できない情報の境界線
- LLM は「読みやすい自然文」を優先しがちなので、構造化を明示的に指示しないと省略される
- memory / CLAUDE.md / feedback の 3 層でルールを保全する設計

---

### レビューで「事実誤認」を拾う価値 — ADR の誤引用を見つけた話
**タグ**: コードレビュー, ドキュメンテーション, AI活用
**一言**: doc コメントに ADR-0009 参照があったが、ADR-0009 は UI 言語の話で theme とは無関係だった。`/simplify` のレビューで拾えた事実誤認。

**ネタ**:
- `theme: string` の doc に「M0 では `"system"` のみサポート（ADR-0009）」と書いていた
- ADR-0009 は実際は「UI 言語は日本語のみ」で theme とは無関係
- `/simplify` の Quality review agent が拾った
- あわせて型は `"system" | "dark" | "light"` なのに doc は「`"system"` のみ」と書かれていた矛盾も発覚
- 事実誤認は読み手を誤誘導するので、重複系の指摘より優先度が高い
- AI エージェントは「事実として doc と実装が合っているか」を検証するのが得意
- 却下すべき指摘（重複削減）と採用すべき指摘（事実誤認）を見分ける基準

---

## M0 完走・運用

### 個人開発でも GitHub Issues 駆動開発する — 自分の体感バグを issue にする習慣
**タグ**: 個人開発, GitHub, 開発プロセス
**一言**: 「ちょっと遅い」「ちょっと混乱する」を全部 issue に積んで、優先度付きで積み残す。開発中の体感は揮発しやすい。

**ネタ**:
- 今日追加した 2 件:
  - #24 成功時のトースト通知（「削除したのに何もフィードバックがない」という体感から）
  - #25 選択ラグ改善（「カードが出るまで一瞬待つ」から原因分析まで）
- 体感バグを 24 時間以内に issue にしないと忘れる
- issue に書くときの情報量: 症状 + 原因分析 + 改善案の優先順位 + 計測方法
- ユーザー兼開発者だからできる issue 起票（一般ユーザーは原因分析まで書かない）
- 「自分で作って自分で使って自分で issue を立てる」サイクル
- M1 マイルストーンに積んで、M0 リリースの前に焦って直さない判断
- 優先度ラベル（priority:high/medium/low）の運用ルール

---

## M1 機能実装

### fetch と ahead/behind「計算」を責務分離する設計（Issue #8）
**タグ**: 設計, Rust, git, パフォーマンス
**一言**: 多くの Git GUI は「fetch」と「ahead/behind 表示」を同じ操作で処理するが、実はこの 2 つは独立した操作。分離すると 5 秒ポーリングでも ahead/behind を「古いけど正確に」表示できる。

**ネタ**:
- ADR-0010 で M0 は「fetch が重いから ahead/behind 実装見送り」と決めていた
- M1 で実装するときに前提を疑い直した: そもそも ahead/behind の「値」は fetch しなくても計算できる（ローカルの `refs/remotes/*` と比較するだけ）
- fetch はリモートの最新を refs/remotes に取り込む操作にすぎない
- 2 層に分離して責務を分担:
  - **計算レイヤ（常時・軽量）**: `graph_ahead_behind(local, upstream)` を 5 秒ポーリングに組み込み
  - **fetch レイヤ（明示的・重い）**: 起動時 1 回 + 手動リフレッシュ時のみ
- 結果: ポーリングでも ahead/behind が安定して更新される（refs/remotes が最新なら値は最新）
- ユーザーが fetch するタイミングを明示的に制御できる（オフライン中でも古い値で継続）
- キャッシュ層は不要（git 自身が refs/remotes に持っている）
- 「動作が遅い」という理由で機能を諦める前に、重い処理と軽い処理の切り分けができないか疑うと解像度が上がる

---

### libgit2 の認証フォールバックで対話プロンプトを出さない設計（Issue #8）
**タグ**: Rust, git, Tauri, UX
**一言**: デスクトップアプリの git fetch で認証プロンプトをポップアップさせると UX が壊れる。SSH Agent → Keychain → username の順で静かにフォールバックする設計。

**ネタ**:
- git2 の `RemoteCallbacks::credentials` でコールバックを登録する
- 通常の CLI なら対話的に ssh passphrase を聞けるが、GUI アプリでは TTY がないので詰む
- フォールバック順:
  1. SSH 公開鍵: `Cred::ssh_key_from_agent(user)`（起動中の ssh-agent に委譲）
  2. HTTPS ベーシック: `Cred::credential_helper(config, url, username)`（macOS Keychain / osxkeychain helper）
  3. username のみ: `Cred::username(user)`（サーバ初期ネゴシエーション用）
- 全部失敗したら日本語メッセージ付きの `git2::Error::from_str` を返し、呼び出し側（Tauri コマンド）でエラートーストに変換
- ユーザーが `git` コマンドでは fetch できる状態を前提にする設計（OS 標準の credential 機構を尊重）
- 部分失敗を `Ok` で返して `failures` 配列に詰める UX 設計も併せて採用（複数リモートの 1 つだけ失敗 → 他は成功として扱う）

---

### worktree のライブ絞り込み検索と、`?? ` が隠していた空状態バグ（Issue #70）
**タグ**: React, TypeScript, UX, リファクタリング
**一言**: worktree グリッドにインクリメンタル絞り込みを足す過程で、`children ?? デフォルト` が `false` を素通りさせる落とし穴を踏み抜いた話。

**ネタ**:
- 検索は純粋関数 `filterWorktrees(worktrees, query, labels)` に切り出して単体テスト可能にする（既存の `sortWorktrees` と同じ lib パターン）。表示名（ラベル優先・未設定時 `dirName`）とブランチ名への大小無視部分一致
- 空クエリ時は**引数の配列を同一参照でそのまま返す**のがミソ。`useMemo` の結果参照が安定し、ポーリングの no-op 最適化（`React.memo` 連鎖）を壊さない
- 絞り込み中は DnD を無効化する。`SortableContext`/`DndContext` を使わず素の `WorktreeCard` を描画しつつ、並び順は `sortWorktrees` で従来通り尊重
- 落とし穴: 元コードの空状態は `currentWorktrees.length > 0 && <Grid/>` が `false` を返し、`MainArea` 側の `children ?? <案内/>` が `false` を**素通り**させていた（`??` は null/undefined しか拾わない）。「worktree がありません」案内が実は表示されていなかった
- 修正: 分岐を `gridContent` 変数に抽出し、0 件ケースは明示的に `undefined` を渡す。ネストした三項より読みやすく、`undefined ?? 案内` で意図通り案内が出る
- Enter 単独確定を避ける UX 原則（ADR）を検索入力にも適用 — 確定概念がないので Enter は no-op、`Cmd+F` フォーカス / `Esc` クリアのみ

---

## メモ（記事化の優先度が低いもの / アイデア段階）

- Tauri 2 + React 19 の組み合わせで始める際の注意点（テンプレートとの差分など）
- `git2` crate で worktree 操作をする際のハマりどころ
- Tailwind CSS v4 を Tauri プロジェクトに入れる手順
- tauri-plugin-store の使い方（Zustand との連携パターン）
- 個人開発における ROADMAP.md と PROGRESS.md の運用
- `Repository::commondir()` で worktree → メインリポジトリを解決する（`.git` ファイル手動パースの代替）
- `React.memo` + `useCallback` + `useMemo` の三点セットで「変化がないときは描画しない」を実現する連鎖
- `#[tauri::command]` に generics `<R: Runtime>` を付けて MockRuntime でテストする方法
- lefthook の pre-commit で doc コメント不在を lint できるか（rustdoc の `#![warn(missing_docs)]` 活用）

