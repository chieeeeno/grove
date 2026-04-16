# review-pr-loop 独自レビュー観点チェックリスト

`review-pr-loop` スキルが `/simplify` の上乗せとしてチェックする Grove 固有の観点を列挙する。
重大度分類（critical / major / minor）の判定基準は各項目末尾に記載。

- **critical**: アプリがクラッシュする / データが壊れる / セキュリティ脆弱性
- **major**: 明確な品質低下 / CLAUDE.md ルール違反 / 既存 ADR との矛盾
- **minor**: 改善提案 / スタイル / 可読性向上

## 全言語共通

### CLAUDE.md テストルール

- [ ] 新規追加・変更したロジックに対応するテストがあるか
  - フロントエンド: `*.test.ts` / `*.test.tsx`（Vitest + @testing-library/react）
  - Rust: `#[cfg(test)]` モジュール
  - テストファイルは実装ファイルと同階層に配置
  - 重大度: **major**（CLAUDE.md ルール違反）
- [ ] Tauri API 依存部分が `src/test/setup.ts` のモックを使っているか
  - 重大度: **minor**

### CLAUDE.md Doc コメントルール

- [ ] 新規追加・変更した関数に doc コメントがあるか
- [ ] TypeScript: `@param name - 説明` と `@returns 説明` を**併用**しているか
  - どちらか片方だけ、は不可
  - 重大度: **major**
- [ ] TypeScript: 例外を投げる関数に `@throws` があるか
  - 重大度: **major**
- [ ] Rust: `pub fn` / `#[tauri::command]` に `# Arguments` / `# Returns` があるか
  - 重大度: **major**
- [ ] Rust: `Result` を返す関数に `# Errors` で Err 条件が列挙されているか
  - 重大度: **major**
- [ ] Rust: 破壊的操作・I/O を含む関数に `# 副作用` セクションがあるか
  - 重大度: **major**
- [ ] Rust: `pub struct` フィールドで単位・フォーマット・センチネル値が非自明なものに rustdoc があるか
  - 重大度: **major**（DTO は特に厳しく）
- [ ] doc コメントの記述精度: 引数の単位・許容範囲・正規化責任、戻り値の null / 空ケース、失敗条件、副作用、呼び出し側が前提とすべき状態が書かれているか
  - 重大度: **major**

### ADR との整合性

- [ ] **ADR-0008**: worktree ラベルキーは絶対パス（rename で消失許容）を前提にしているか
  - 重大度: **critical**（矛盾するとデータ紐づけが壊れる）
- [ ] **ADR-0009**: UI 文言が日本語のみか。i18n フレームワークを導入していないか
  - 重大度: **major**
- [ ] **ADR-0010**: M0 で ahead/behind を表示していないか
  - 重大度: **minor**（M1 以降は OK）
- [ ] **ADR-0011**: 変更ファイル数は合計のみ表示し、modified/added/deleted を分けていないか
  - 重大度: **minor**
- [ ] **ADR-0012**: エラーの事後ダイアログではなく、事前バナー警告 + ボタン無効化で preflight UX を守っているか
  - 重大度: **major**
- [ ] **ADR-0013**: リフレッシュ間隔が 5 秒ポーリング + 手動リフレッシュボタン + Cmd+R を維持しているか
  - 重大度: **minor**
- [ ] **ADR-0014**: 本スキル関連の運用方針と矛盾しないか
  - 重大度: **major**

### セキュリティ

- [ ] **パストラバーサル**: ユーザー入力から組み立てたパスで `..` が許容されていないか
  - Grove はファイルパスを扱うので特に重要
  - 重大度: **critical**
- [ ] **コマンドインジェクション**: `std::process::Command` や `shell: true` に未検証のユーザー入力を渡していないか
  - 重大度: **critical**
- [ ] **シェルエスケープ**: `gh` / `git` コマンド呼び出しで引用符エスケープが正しいか
  - 重大度: **major**
- [ ] **機密情報のログ出力**: トークン・絶対パス下のユーザー名がログに漏れていないか
  - 重大度: **major**

## Rust（デスクトップアプリ特有）

### panic / クラッシュ

- [ ] `unwrap()` / `expect()` を `#[tauri::command]` の関数内で使っていないか（panic でアプリがクラッシュ）
  - 重大度: **critical**
- [ ] `unwrap()` / `expect()` を Drop や panic セーフでない位置で使っていないか
  - 重大度: **critical**
- [ ] 整数オーバーフロー可能な演算を `wrapping_*` / `checked_*` なしで書いていないか
  - 重大度: **major**
- [ ] `panic!` / `unreachable!` / `todo!` が production コードに残っていないか
  - 重大度: **major**

### unsafe

- [ ] `unsafe` ブロックの安全性根拠が doc コメントに書かれているか（`// SAFETY: ...`）
  - 重大度: **critical**
- [ ] `unsafe` を使わずに書ける選択肢がないか
  - 重大度: **major**

### メモリ関連

- [ ] `Rc<RefCell>` / `Arc<Mutex>` の循環参照が発生しうる構造になっていないか
  - 重大度: **major**
- [ ] `Box::leak` / `Vec::leak` を使っていないか（使う場合は正当化理由が doc にあるか）
  - 重大度: **critical**
- [ ] 大きなバッファ（git diff 全体、worktree 全件キャッシュ等）を Arc で長期保持していないか
  - 重大度: **major**
- [ ] `String::clone()` / `Vec::clone()` が hot path で呼ばれていないか
  - 重大度: **minor**

### リソース解放

- [ ] ファイルハンドル（`File`）が `drop` 時に確実に閉じられるか、明示的な `close` 相当があるか
  - 重大度: **major**
- [ ] 子プロセス（`std::process::Child`）の `wait` / `kill` が漏れていないか
  - 重大度: **major**
- [ ] libgit2 の `Repository` 等のハンドルが RAII で解放されているか（static / leaked にしていないか）
  - 重大度: **major**
- [ ] `notify` crate 等のウォッチャーが明示的に解除されるか（リソースリーク防止）
  - 重大度: **major**

### スレッド安全性

- [ ] `Mutex` / `RwLock` を複数同時に取得する箇所でデッドロック順序が守られているか
  - 重大度: **critical**
- [ ] `MutexGuard` を長時間保持したまま await していないか
  - 重大度: **major**
- [ ] `Send` / `Sync` 境界を満たさない型を `tauri::State` に入れていないか
  - 重大度: **major**

### Tauri command のエラー伝播

- [ ] `Result<T, String>` の Err が日本語で人間可読なメッセージになっているか（ADR-0009 との整合）
  - 重大度: **major**
- [ ] `#[tauri::command]` がエラー時にフロントエンドにどう見えるかが想定されているか
  - 重大度: **major**

### 非同期 / UI スレッド

- [ ] 長時間処理を `async fn` の同期ブロックで書いていないか（UI スレッド凍結）
  - 重大度: **major**
- [ ] `tokio::task::spawn_blocking` で CPU bound タスクを分離しているか
  - 重大度: **minor**

### git2 crate

- [ ] `Repository::open` を hot path（ポーリング・描画毎）で毎回呼んでいないか
  - 重大度: **major**
- [ ] `git2` API のエラーを適切に `Result::Err` に変換しているか
  - 重大度: **major**

## TypeScript / React

### React

- [ ] `useEffect` の依存配列が正しいか（eslint-plugin-react-hooks 相当のチェック）
  - 重大度: **major**
- [ ] `useEffect` 内で state 更新が無限ループを起こさないか
  - 重大度: **critical**
- [ ] `key` prop が list レンダリングで安定しているか（index 渡しは minor、欠落は major）
  - 重大度: **major** / **minor**
- [ ] `useMemo` / `useCallback` の依存配列が網羅されているか
  - 重大度: **minor**（パフォーマンス問題がなければ）

### Zustand store

- [ ] store の state を直接 mutate していないか（`set` 経由で不変更新しているか）
  - 重大度: **critical**
- [ ] セレクタが無用に大きな state 断面を参照していないか（再レンダー起因）
  - 重大度: **minor**

### Tauri invoke

- [ ] `invoke` の Promise reject を catch して UI にエラー反映しているか
  - 重大度: **major**
- [ ] ADR-0012 に従い、事前警告で preflight できる箇所を事後エラーで処理していないか
  - 重大度: **major**

### TypeScript 型

- [ ] `any` / `as unknown as X` が不要な箇所で使われていないか
  - 重大度: **major**
- [ ] ランタイムのデータ（Tauri invoke 結果、JSON 読み込み等）に型ガードがあるか
  - 重大度: **major**

## パフォーマンス

- [ ] O(N^2) 以上のループが worktree 一覧操作等、N が増える可能性のある配列にかかっていないか
  - 重大度: **major**
- [ ] 不要な再レンダーが連鎖していないか（React DevTools Profiler で検証可能な規模か）
  - 重大度: **minor**
- [ ] 5 秒ポーリング（ADR-0013）で重い処理（大量 `git status` 等）を走らせていないか
  - 重大度: **major**
- [ ] `useEffect` 内で不要に重い処理を毎レンダー実行していないか
  - 重大度: **minor**

## 変更ファイル固有の追加観点

- [ ] `src-tauri/tauri.conf.json` を変更した場合、`bundle.macOS.signingIdentity` の ad-hoc 設定を意図せず破壊していないか（CLAUDE.md メモ参照）
  - 重大度: **major**
- [ ] `Cargo.toml` / `package.json` で依存追加時、ライセンスが Grove の配布ライセンスと矛盾しないか
  - 重大度: **major**
- [ ] `tailwind.config.ts` を新設していないか（Tailwind v4 は CSS-first 設定）
  - 重大度: **major**

## 判断の一貫性

- 同じタイプの指摘が複数ある場合、重大度を統一すること
- 判断に迷う場合はより高い重大度を採用（critical/major 寄り）
- 重大度を下げる判断は理由を明記する
