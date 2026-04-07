# 次回作業メモ

> 最終更新: 2026-04-07
> 前回セッション終了時点のスナップショット

---

## 前回までに完了したこと

### ドキュメント基盤
- [x] Git リポジトリ初期化（main ブランチ、`.gitignore` 配置）
- [x] ROADMAP.md 作成（M0 / M1 / M2 全マイルストーン定義）
- [x] grove-design.md 更新（ADR と整合、§11 フロー図追加）
- [x] grove-naming.md を docs/ 配下に移動

### 意思決定（ADR 13 件）
- ADR-0001 アプリ名: Grove
- ADR-0002 アプリ識別子: `io.github.chieeeeno.grove`
- ADR-0003 ライセンス: Apache-2.0
- ADR-0004 対応 OS: macOS のみ
- ADR-0005 設定ファイルパス: tauri-plugin-store デフォルト
- ADR-0006 テレメトリ: 実装しない（将来 opt-in 余地）
- ADR-0007 M1 配布: GitHub Releases / 署名なし
- ADR-0008 worktree ラベル仕様
- ADR-0009 UI 言語: 日本語のみ
- ADR-0010 ahead/behind 表示: M0 不要
- ADR-0011 変更ファイル数: 合計のみ
- ADR-0012 事前警告 UX 原則
- ADR-0013 リフレッシュ戦略: ポーリング → ファイル監視

### スパイク調査（三次まで実施）
- Phase 2 (Claude Code 連携) の実現可能性: ✅ **公式ドキュメント裏付けあり、修正不要**
- 詳細は ROADMAP.md「検証ログ」セクション参照

### 設計書のフロー図（§11）
- トリガー一覧 21 件
- アーキテクチャ図
- シーケンス図 9 種類（起動 / リポジトリ追加 / 自動リフレッシュ / 削除 / ラベル編集 / VS Code 起動 / ウィンドウ永続化 / Phase 2 プロセス検知 / Phase 2 ログ監視）

---

## 次回の最優先タスク

### 🎯 M0 着手準備（プロジェクト雛形作成）

設計は固まったので、次は実装の足場を組む段階。

1. **Tauri 2 プロジェクトの初期化**
   ```bash
   cd /Users/tomoki/work/private/grove-app
   # 既存ファイルを保ったまま初期化する方法を検討:
   #   A) 一旦別ディレクトリで `npm create tauri-app@latest` → 必要ファイルだけコピー
   #   B) サブディレクトリに作って後でフラット化
   # B が安全
   ```
   - フロントエンドテンプレートは **React + TypeScript** を選択
   - パッケージマネージャは pnpm or npm（好みで決定）
   - **bundle identifier に `io.github.chieeeeno.grove` を入れる**（ADR-0002）

2. **`tauri.conf.json` の初期設定**
   - bundle identifier: `io.github.chieeeeno.grove`
   - productName: `Grove`
   - 初期ウィンドウサイズ（とりあえず 1280×800 あたり）

3. **主要依存の追加**
   - frontend: `tailwindcss@4`, `zustand`, （ルーターは要らんはず）
   - rust: `git2`, `serde`, `tauri-plugin-store`, `tauri-plugin-window-state`

4. **LICENSE ファイル設置**
   - Apache-2.0 の公式定型文をリポジトリルートに置く（ADR-0003）
   - https://www.apache.org/licenses/LICENSE-2.0.txt
   - Copyright 行に名前と年を入れる

5. **README.md（最小版）作成**
   - プロジェクト名・概要・現状ステータス（pre-alpha など）だけ
   - インストール手順は M1 で書く

6. **ディレクトリ構造の調整**
   - 設計書 §9 のディレクトリ構成を参考にしつつ、Tauri テンプレに合わせて調整

---

## その後の優先順（M0 完成までの大まかな順序）

設計書 §11.1 のトリガー一覧と §8 のチェックリストを照らし合わせながら進める。

### Step 1: 骨組み
- [ ] 3 カラムレイアウト（Sidebar / Main / Detail Panel 枠）の HTML/CSS
- [ ] Zustand store のスケルトン（型定義のみ）
- [ ] Tauri commands のスケルトン（戻り値ダミーで OK）

### Step 2: リポジトリ管理
- [ ] `validate_repository`, `load_config`, `save_config` の実装
- [ ] サイドバーへのリポジトリ追加 / 表示
- [ ] tauri-plugin-store の動作確認

### Step 3: worktree 表示
- [ ] `list_worktrees`, `get_worktree_status` の実装（git2 crate）
- [ ] worktree カードの実装（最小フィールド）
- [ ] ラベル編集機能（ADR-0008、§11.7 状態遷移図参照）

### Step 4: worktree 操作
- [ ] `remove_worktree` の実装（force / branch 削除分岐、§11.6 参照）
- [ ] 削除確認ダイアログ
- [ ] VS Code 起動 + preflight（ADR-0012、§11.8 参照）

### Step 5: リフレッシュ
- [ ] ポーリングタイマー実装（5 秒間隔）
- [ ] 手動リフレッシュボタン + Cmd+R ショートカット
- [ ] tauri-plugin-window-state の組込み

### Step 6: 仕上げ
- [ ] エラーメッセージの日本語化（ADR-0009）
- [ ] preflight チェックの仕上げ（`code` コマンド検出）
- [ ] 自分の grove-app worktree で実用してみる（ドッグフーディング開始）

---

## 残っている検討事項 / 未決事項

実装中に判断が必要になりそうなもの:

- [ ] **パッケージマネージャ**: pnpm / npm / yarn / bun のどれを使うか
- [ ] **CI セットアップ**: M0 段階で GitHub Actions 入れるか、M1 まで待つか
- [ ] **テスト戦略**: 単体テスト / E2E どこまでやるか（個人開発なので最小限でも可）
- [ ] **エラーハンドリングの詳細**: Rust 側 `Result<_, String>` のままでいいか、エラー型を切るか
- [ ] **ロギング**: M0 で `tracing` 等を入れるか、`println!` で済ませるか
- [ ] **設計書 §6.2 の Tauri commands**: スパイク結果を反映済みだが、実装時にシグネチャ調整が必要
- [ ] **Phase 2 着手のタイミング判断**: M0 完了後すぐか、M1 機能追加と並行か

---

## 重要な参照ドキュメント

実装中に必ず見るべきもの:

- [ROADMAP.md](./ROADMAP.md) - マイルストーン定義 / スパイク結果 / M0 スコープ
- [grove-design.md](./grove-design.md) - 設計書本体 / フロー図 / データモデル
- [docs/adr/](./docs/adr/) - 全意思決定の根拠（13 件）
- [docs/grove-naming.md](./docs/grove-naming.md) - 命名選定経緯

## 次セッション開始時のチェック

1. このファイル `NEXT.md` を読む
2. `git log --oneline` で前回までのコミット履歴を確認
3. ROADMAP.md の M0 スコープを再確認
4. 上記「次回の最優先タスク」から作業開始

---

## メモ

- 設計フェーズはここで一区切り。次回からは実装フェーズに入る
- 設計書 §11 のシーケンス図は実装中に何度も見返すことになるはず
- ADR で決めた「事前警告 UX」「Enter 単独確定しない」等の原則は実装中も忘れずに
- 困ったら ADR を読み返す。設計の理由が全部書いてある
