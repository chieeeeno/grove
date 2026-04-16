---
name: review-pr-loop
description: PR URL（または現在のブランチ）を入力として、レビュー → 自動修正 → 再レビューのループを回す自動コードレビュースキル。各ラウンド終了時に PR にサマリーコメントを投稿（前ラウンド分は minimize）し、詳細は docs/review-result/ にテンポラリ保存する。critical/major がゼロで終了した場合は LGTM コメントを、最大 5 ループ到達時は「強制停止・レビュー未完了」を明記したコメントを残す。minor 指摘は個別に PR コメント化せず、最終 LGTM（または総評）コメント内に要約リストとしてまとめて記載する。
---

# review-pr-loop

Grove リポジトリ向けの自動コードレビュースキル。PR URL を渡すだけで
`/simplify` 相当の品質レビュー + Grove 独自観点（Rust デスクトップアプリ特有の
panic / メモリリーク / リソース解放、CLAUDE.md テスト必須・Doc コメント必須、
ADR 整合）を自己ループで繰り返し、critical/major 指摘がゼロになるまで自動修正
とコミットを回す。

## 参照ドキュメント

- `docs/design/review-pr-loop-flow.md` — フローチャート・シーケンス図・コメントテンプレートの正
- `docs/adr/0014-auto-review-skill.md` — 設計意図と運用方針
- `.claude/skills/review-pr-loop/review-checklist.md` — Grove 独自レビュー観点
- `CLAUDE.md` — テスト必須・Doc コメント必須・コミット粒度のルール

上記 4 ファイルに記述と矛盾がある場合は **ADR-0014 → 設計書 → CLAUDE.md → 本 SKILL.md** の順で優先する。

## 起動トリガー

- ユーザーが PR URL をプロンプトに含めて「レビューして」「review-pr-loop を回して」等と依頼した場合
- 引数なしで `review-pr-loop` スキルが呼び出された場合（現ブランチから PR を自動検出）

## 入力

| 項目 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `pr_url` | string | なし | レビュー対象の PR URL。省略時は現ブランチから自動検出 |
| `max_loop` | number | 5 | 最大ループ回数 |

※ 外部パラメータ化はフェーズ 2 以降の拡張。当面はスキル内部の固定値。

## 実行フロー

### フェーズ 0: PR の特定とセッション初期化

1. **セッションタイムスタンプを取得** — `date +%Y%m%d-%H%M%S` の結果を
   セッション共通変数 `SESSION_TS` として保持する（例: `20260417-143522`）。
   同一スキル起動のすべてのラウンドでこの値を使い回し、レビュー結果ファイルや
   コメント本文に含めることでセッション識別子とする
2. **`docs/review-result/` ディレクトリを用意** — 存在しなければ `mkdir -p docs/review-result` で作成。
   このディレクトリは `.gitignore` 対象
3. `pr_url` が与えられていればそれを採用
4. 与えられていない場合:
   1. `git rev-parse --abbrev-ref HEAD` で現ブランチを取得
   2. `gh pr list --head <branch> --state open --json number,url` で PR を検索
   3. ヒットすれば URL を採用
   4. ヒットしなければ以下のメッセージを表示してスキル終了（commit も push もしない）:
      > 現在のブランチ `<branch>` に紐づく PR が見つかりませんでした。
      > 先に `gh pr create` で PR を作成してから再実行してください。
5. PR 番号を取得し、セッション変数 `PR_NUMBER` として保持

### フェーズ 1: レビュールーパー

`round = 1` から開始し、最大 `max_loop` まで以下を繰り返す。

#### ラウンド開始処理

1. `gh pr view <url> --json number,baseRefName,headRefName,isDraft` で PR メタ取得
2. 前ラウンドまでのスキル由来コメントを取得:
   - `gh api repos/:owner/:repo/issues/:n/comments`（PR 全体コメント）
   - `gh api repos/:owner/:repo/pulls/:n/comments`（行コメント）
   - 本文中のマーカー `<!-- review-pr-loop:round=N;kind=... -->` を含むコメントだけフィルタ
   - `kind` で分類: `skipped`（見送り理由） / `remaining`（残件） / `round-summary`（各ラウンド終了時の要約） / `summary`（最終総評） / `lgtm`（品質クリア宣言）
   - 注: `gh api` の `:owner` / `:repo` は cwd の git リモート設定から自動解決される。明示指定したい場合は `gh api repos/chieeeeno/grove/...` のようにフルパスで書く
3. `gh pr diff <url>` で最新差分を取得

#### レビュー実行

4. `/simplify` 相当のレビューを差分に対して実施（品質・重複・可読性・命名）
5. `review-checklist.md` に沿って Grove 独自観点をチェック:
   - 共通（テスト有無 / Doc コメント / ADR 整合 / セキュリティ）
   - Rust（panic / unsafe / メモリ / リソース / スレッド / Tauri command / 非同期 / git2）
   - TypeScript（React / Zustand / Tauri invoke / 型）
   - パフォーマンス
6. 前ラウンドの `kind=skipped` コメントに対して「この見送り理由は今も妥当か」を再評価
   - 妥当でない場合は critical/major として再計上
   - 同一項目が 2 ラウンド連続で「見送り妥当」判定された場合、3 ラウンド目以降は再評価スキップ（総評に明記）
7. すべての指摘を critical / major / minor に分類（基準は `review-checklist.md`）

#### 解消済みコメントの非表示化

8. 前ラウンドの `kind=skipped` / `remaining` コメントのうち、今回の差分で解消されているものを検出
9. 解消済みコメントを GitHub GraphQL `minimizeComment(classifier: RESOLVED)` で非表示化
   - **マーカー付きのスキル由来コメントのみが対象**（他者コメントは絶対に触らない）
   - **`subjectId` の取得方法**: REST API (`gh api repos/:owner/:repo/issues/:n/comments` / `pulls/:n/comments`) のレスポンスに含まれる `node_id` フィールドが GraphQL の `subjectId` に対応する。マーカー付きコメントをフィルタした後、その `node_id` を GraphQL mutation に渡す
   - 実行コマンド（`-F` で変数渡しにしてエスケープ事故を防ぐ）:
     ```
     gh api graphql \
       -F nodeId='<node_id>' \
       -f query='mutation($nodeId: ID!) {
         minimizeComment(input: {subjectId: $nodeId, classifier: RESOLVED}) {
           minimizedComment { isMinimized }
         }
       }'
     ```

#### 終了判定

このステップは「このラウンドで修正フェーズに入るか、スキップするか」を決めるだけ。
フェーズ 2（post-review）への移行は、どの経路でもラウンド終了処理（step 18-21）の
完了後に行う。

10. 以下のいずれかに該当する場合、**修正フェーズをスキップしてラウンド終了処理
    （step 18-21）に進む**:
    - `critical + major == 0` → 正常終了経路（ラウンド終了処理後、post-review へ。
      post-review で LGTM コメント投稿対象）
    - `round >= max_loop` → **最大ループ到達による強制停止経路**（ラウンド終了処理後、
      post-review へ。ただし LGTM は出さず、総評に「レビュー未完了・人間への
      ハンドオフ」を明記）
11. 上記以外（継続経路）は以下の修正フェーズ（step 12-17）に進み、完了後に
    ラウンド終了処理（step 18-21）を実施する

#### 修正フェーズ（critical/major のみ処理）

12. critical/major の指摘を「自動修正するもの」と「見送るもの」に仕分け
    - 機械的修正が困難（設計判断が必要 / 既存パターンと矛盾 / 修正範囲が大きい）なものは見送り
    - それ以外は自動修正
13. **minor 指摘は pending バッファに蓄積するだけで、このラウンドでは処理しない**
14. 見送り項目について PR にコメント投稿（後述「見送りコメント」テンプレート）
15. ブランチガード:
    - `git rev-parse --abbrev-ref HEAD` が `main` / `master` / `HEAD` の場合は commit せずに停止
16. 無限ループガード:
    - 同一ファイル × 同一行範囲を 2 ラウンド連続で書き換えた場合は停止
17. 自動修正を実装 → 対象ファイルを `git add` → `git commit`
    - コミットメッセージは日本語、1 コミット = 1 論理単位（CLAUDE.md のコミット粒度ルール）
    - **push はしない**（lefthook pre-commit が pre-commit フックで品質チェック）

#### ラウンド終了処理（すべての経路の末尾で実施）

終了判定の結果（正常終了 / 強制停止 / 継続）に関わらず、このブロックを必ず通る。
継続経路では修正フェーズ（step 12-17）を済ませてから入る。

18. **レビュー結果のテンポラリファイル保存**:
    - ファイルパス: `docs/review-result/code-review-pr${PR_NUMBER}-${SESSION_TS}-round${round}.md`
    - 内容は後述「レビュー結果テンポラリファイルの構成」を参照
    - このファイルは `.gitignore` 対象なので commit しない
19. **前ラウンドの `kind=round-summary` コメントを minimize**:
    - round >= 2 のときのみ実施（round=1 は対象なし）
    - 前ラウンドの round-summary は「履歴として内容を参照できるが閉じた状態」にする（GitHub のトグル展開で閲覧可能）
    - 使う GraphQL は `minimizeComment(classifier: OUTDATED)` — OUTDATED を使うことで「古くなった」と文脈がわかる
    - **タイミングの設計意図**: このステップをラウンド終了処理に置くのは「次ラウンド開始時点で前ラウンドのサマリーが折りたたまれた状態を保ち、最新ラウンドのサマリーが目立つようにする」ためである。解消済み指摘の minimize（step 8-9）がラウンド開始直後に置かれるのは「今ラウンドの差分を見てから解消判定する」必要があるため。この対称的な位置関係は意図的な設計
20. **ラウンドサマリーコメントを PR に投稿** (`kind=round-summary`):
    - 内容は後述「ラウンドサマリーコメント」テンプレート
    - このラウンドで検出した指摘の概要・重大度別件数・修正 or 見送りの判断内訳を簡潔に記載
21. **次ラウンド判定**（step 10-11 の結果に基づく分岐）:
    - step 10 の正常終了経路（critical/major=0）→ フェーズ 2（post-review）へ進む
    - step 10 の強制停止経路（round >= max_loop）→ フェーズ 2（post-review）へ進む
    - step 11 の継続経路 → `round += 1` してラウンド開始処理へ戻る

### フェーズ 2: post-review（全レビュー終了後）

ループを抜けたあとに実行する後処理。

1. 全ラウンドで蓄積された minor 見送り候補を集約（重複除去・要約）
2. **minor は個別に PR コメント投稿せず、まとめて最終コメント内に記載する方針**:
   - 個別の `kind=skipped` 行コメントは投稿しない（PR コメント欄のノイズを抑える）
   - 代わりに、最終 LGTM コメント（または総評コメント）の「🤔 見送り項目（minor）」セクションに
     **全件の要約リスト**（項目内容 + 指摘詳細 + 対象ファイル）を記載する
   - これにより「どんな指摘が出て、なぜ見送ったか」は 1 コメント内で網羅できる
3. critical/major の残件があれば PR に行コメント投稿（残件コメント `kind=remaining`）
4. PR 全体コメントとして絵文字つき総評を投稿（`kind=summary`）
   - 終了ステータスに応じて ✅（critical/major クリア正常終了）/ ⚠️（最大ループ到達で強制停止）を表示
   - **強制停止の場合、「レビューは未完了です。人間レビュワーによる引き取りをお願いします」** を本文に明記し、`未解決な指摘` を列挙する
   - minor 見送りサマリー（step 2 で集約したリスト）は総評にも載せてよいが、主たる記載先は LGTM コメント
5. **LGTM 判定と投稿** (`kind=lgtm`):
   - 条件: `critical + major == 0` **かつ** 最大ループに到達していないこと
   - 条件を満たす場合、別コメントとして LGTM を投稿。**本文に minor 見送りサマリー
     （項目内容 + 指摘詳細 + 対象ファイルの一覧）を必ず含める**
   - 条件を満たさない場合（強制停止）は LGTM コメントを投稿せず、総評に minor 見送りサマリーを
     記載する

## コメント仕様

すべてのスキル由来コメントには、本文冒頭にマーカーを含める:

```
<!-- review-pr-loop:round=N;kind=<skipped|remaining|round-summary|summary|lgtm>;id=<uuid>[;session=<SESSION_TS>] -->
```

- `round` はラウンド番号（1..5）、post-review フェーズは終了時のラウンド番号を流用
- `kind` は種別（5 種すべて列挙）:
  - `skipped`: 見送り理由コメント
  - `remaining`: 最終残件の行コメント
  - `round-summary`: 各ラウンド終了時のサマリーコメント
  - `summary`: post-review 最終総評
  - `lgtm`: 品質基準クリア宣言
- `id` は UUID（重複投稿検出・再生成検出用）。生成は `uuidgen` コマンドで
  1 コメントごとに新規発行する（macOS/Linux で標準搭載）。
  `uuidgen | tr 'A-Z' 'a-z'` で小文字化して揃える
- `session` は **`round-summary` と `lgtm` でのみ必須**。セッション起動時に取得した
  `SESSION_TS` の値を入れ、ローカルのテンポラリファイル
  (`docs/review-result/code-review-pr<N>-<SESSION_TS>-round<R>.md`) と突合するために使う。
  他の kind（skipped / remaining / summary）では付与しなくてよい

### 見送りコメント（`kind=skipped`）

行コメントが可能なら行コメント、不可なら PR 全体コメントで投稿:

```
<!-- review-pr-loop:round=N;kind=skipped;id=<uuid> -->
🤔 **[Round N/5] 自動修正を見送った指摘**

**指摘内容**: <要約>
**対象**: `path/to/file.rs:42-48`
**重大度**: critical / major / minor
**見送り理由**: <理由>
**確認経路**:
  - critical/major: 機械的修正が困難と判断（ループ内で自動決定）
  - minor: 全レビュー終了後の post-review フェーズでユーザーが「見送る」を選択

次のラウンドでこの見送り判断自体を再評価します。
```

### 残件コメント（`kind=remaining`）

PR の行コメントとして投稿。`gh api pulls/:n/comments` で単発投稿するか、
複数指摘をまとめて `gh api pulls/:n/reviews` で 1 レビューにする。

**必須パラメータ** (`gh api pulls/:n/comments`):

| パラメータ | 値 | 備考 |
| --- | --- | --- |
| `commit_id` | `gh pr view <url> --json headRefOid --jq .headRefOid` で取得する HEAD SHA | ラウンド開始時に取得しておく |
| `path` | 対象ファイルの PR 内パス | `gh pr diff` の `+++ b/<path>` から抽出 |
| `line` | 対象行番号（右側 = 新ファイル側） | 差分の新行番号 |
| `side` | `RIGHT`（新側）/ `LEFT`（旧側） | 既定は `RIGHT` |
| `body` | コメント本文（マーカー込み） | 下のテンプレート |

**投稿コマンド例**（単発行コメント）:

```
gh api repos/:owner/:repo/pulls/<pr-number>/comments -X POST \
  -f commit_id='<HEAD SHA>' \
  -f path='path/to/file.ts' \
  -F line=42 \
  -f side='RIGHT' \
  -f body="$(cat <<'BODY'
<!-- review-pr-loop:round=N;kind=remaining;id=<uuid> -->
🔴 **[Round N/5] 残存する指摘（重大度: critical）**

<内容>
BODY
)"
```

**複数指摘をまとめて 1 レビューにする場合**:

```
gh api repos/:owner/:repo/pulls/<pr-number>/reviews -X POST \
  --input - <<'JSON'
{
  "commit_id": "<HEAD SHA>",
  "event": "COMMENT",
  "body": "Round N のレビュー残件です。",
  "comments": [
    {"path": "src/foo.ts", "line": 42, "side": "RIGHT", "body": "<!-- ... -->\n🟠 指摘内容..."},
    {"path": "src/bar.rs", "line": 100, "side": "RIGHT", "body": "<!-- ... -->\n🟡 指摘内容..."}
  ]
}
JSON
```

> **注**: レビュー全体の `body`（ヘッダー部分）にはマーカーを付けない。
> ヘッダーは minimize の対象外であり、kind 一覧（skipped / remaining /
> round-summary / summary / lgtm）にも含まれない。マーカーは
> minimize / フィルタリングが必要な個別コメントにのみ付与する。

**本文テンプレート**（重大度に応じて絵文字を 🔴 / 🟠 / 🟡 から選択）:

```
<!-- review-pr-loop:round=N;kind=remaining;id=<uuid> -->
🔴 **[Round N/5] 残存する指摘（重大度: critical）**

<内容>
```

### 見送り・残件コメントを「行コメントで付けられない」場合のフォールバック

削除されたファイルへの指摘や、PR 差分外の観点など、行コメントが付けられない
指摘は PR 全体コメント（`gh pr comment <url> --body "..."`）で投稿する。
マーカー・重大度絵文字・Round 表記は同じ体裁。

### ラウンドサマリーコメント（`kind=round-summary`）

各ラウンド終了時に PR 全体コメントとして投稿し、「どんな指摘が検出され、
何を修正し、何を pending に回したか」を記録する。次ラウンド開始時に
`minimizeComment(classifier: OUTDATED)` で非表示化するが、削除はしないため
トグルで展開すれば内容は参照可能。

投稿コマンド: `gh pr comment <url> --body "..."`

本文テンプレート:

```
<!-- review-pr-loop:round=N;kind=round-summary;id=<uuid>;session=<SESSION_TS> -->
## 🔁 Round N/5 レビュー結果サマリー

**セッション**: `<SESSION_TS>` / **PR**: #<PR_NUMBER>
**詳細ログ**: `docs/review-result/code-review-pr<PR_NUMBER>-<SESSION_TS>-roundN.md`（ローカル）

### 🔴 critical（X 件）
- <要約 1 行>
- ...

### 🟠 major（Y 件）
- <要約 1 行>
- ...

### 🟡 minor（Z 件・pending バッファ送り）
- <要約 1 行>
- ...

### 🛠️ このラウンドでの対応
- 自動修正: N 件（commit SHA: `<abbr sha>`）
- 見送り: M 件（別コメントで理由記録）

### 次アクション
**このラウンドの終了種別**: <継続 | post-review フェーズへ移行 | ⚠️ 強制停止> — <理由を 1 行で補足>
```

### LGTM コメント（`kind=lgtm`）

全ラウンド終了後、以下の条件をすべて満たす場合のみ投稿する最終コメント。
条件: `critical + major == 0` **かつ** 最大ループに到達していない。

本文には **minor 見送りサマリー（項目ごとに「指摘内容 + 対象 + 理由」）** を必ず含める。
個別の `kind=skipped` 行コメントは投稿しないため、この LGTM コメント内のリストが
「どんな指摘が出て、なぜ見送ったか」の唯一の記録になる。

投稿コマンド: `gh pr comment <url> --body "..."`

本文テンプレート:

```
<!-- review-pr-loop:round=N;kind=lgtm;id=<uuid>;session=<SESSION_TS> -->
# ✅ LGTM

本 PR は review-pr-loop の品質基準（critical/major = 0）をクリアしました。
マージ可能な状態です。

- **セッション**: `<SESSION_TS>`
- **実ラウンド数**: N / 5
- **関連コメント**: 総評（kind=summary）に全体サマリー記載

## 🤔 見送った minor 指摘（全 K 件）

各項目で「何が指摘されたか」を、後から辿れるように要約。対応するかは将来の
PR / issue で判断してよい。

### 1. <指摘タイトル>
- **対象**: `path/to/file.md:行番号`（該当する場合）
- **指摘内容**: <1〜3 行で要約>
- **見送り理由**: <なぜ今回対応しないか、簡潔に>

### 2. <指摘タイトル>
- **対象**: ...
- **指摘内容**: ...
- **見送り理由**: ...

（必要に応じて全件繰り返す）

---

> 🙋 最終的なマージ判断は人間レビュワーでお願いします。
```

### 総評コメント（`kind=summary`）

PR 全体コメントとして `gh pr comment <url> --body "..."` で投稿:

```
<!-- review-pr-loop:round=N;kind=summary;id=<uuid>;session=<SESSION_TS> -->
# 🤖 review-pr-loop レビュー総評

**🏁 終了ステータス**: ✅ critical/major クリアで正常終了 / ⚠️ 最大ループ到達で強制終了
**🔁 ラウンド**: Round N / 5

---

## ✨ 評価ポイント
- ...

## 🛠️ 自動修正で対応済み
- ...

## 🤔 見送り項目（理由付き）
- ...

## 📝 残存する改善提案
- ...

## 📊 メトリクス
| 項目 | 値 |
| --- | --- |
| 🔁 実ループ回数 | N / 5 |
| 🔴 critical | X 件 |
| 🟠 major | Y 件 |
| 🟡 minor | Z 件 |
| ⏱️ 所要時間 | MM:SS |

---

> 🙋 このコメントは自動生成です。人間のレビュー・マージ判断は引き続きお願いします。
```

## レビュー結果テンポラリファイルの構成

各ラウンド終了時に以下のパスへマークダウンで保存する（`.gitignore` 対象）:

```
docs/review-result/code-review-pr${PR_NUMBER}-${SESSION_TS}-round${round}.md
```

ファイル名の要素:

- `${PR_NUMBER}`: 対象 PR 番号（例: `58`）
- `${SESSION_TS}`: スキル起動時に取得したタイムスタンプ `YYYYMMDD-HHMMSS`（例: `20260417-143522`）。同一セッションの全ラウンドで共通
- `${round}`: ラウンド番号（`1` 〜 `max_loop`）

同一 PR に対して異なる時刻に再起動した場合、`${SESSION_TS}` で一意化される。

内容テンプレート:

```markdown
# Round N レビュー結果（PR #<PR_NUMBER>）

- **セッション**: `<SESSION_TS>`
- **実行日時**: <開始日時>
- **対象 PR**: https://github.com/chieeeeno/grove/pull/<PR_NUMBER>
- **ベース commit**: `<base SHA>` / **HEAD commit**: `<HEAD SHA>`

## 検出された指摘

### 🔴 critical（X 件）
#### 1. <タイトル>
- **対象**: `path/to/file.ts:42-48`
- **指摘内容**: <詳細>
- **根拠**: <review-checklist の観点名 / ADR 番号 / CLAUDE.md の該当節 を参照で明記>
  - 例: `review-checklist.md「CLAUDE.md Doc コメントルール」/ CLAUDE.md 違反（@returns 未記載）`
  - 例: `review-checklist.md「Rust panic」/ ADR-0012 違反（preflight でなく事後エラー）`
- **判断**: 自動修正 / 見送り（理由: <...>）
- **修正 commit**: `<abbr sha>`（自動修正時のみ）

#### 2. ...

### 🟠 major（Y 件）
（同上の形式）

### 🟡 minor（Z 件・pending バッファ送り）
（同上の形式、ただし判断欄は post-review で確定）

## 前ラウンド見送りの再評価結果
- <id>: 引き続き見送り妥当 / 今ラウンドで対処すべき（→ critical/major に格上げ）

## このラウンドでの対応
- 自動修正: N 件
- 見送り（critical/major）: M 件
- pending（minor）: Z 件

## 関連コミット
- `<sha>`: <message>
- ...

## メモ（次ラウンドの着目点 / 気づき）
- ...
```

このテンポラリファイルは **ローカル参照専用**。人間や他のセッションが後から
見る必要がある情報は、GitHub のラウンドサマリーコメントに要約を残すこと。

## 絵文字ガイド（総評コメント用）

| 用途 | 絵文字 |
| --- | --- |
| タイトル / ボット識別 | 🤖 |
| 終了ステータス（成功） | ✅ |
| 終了ステータス（警告） | ⚠️ |
| ラウンド / 繰り返し | 🔁 |
| 評価ポイント | ✨ |
| 自動修正済み | 🛠️ |
| 見送り | 🤔 |
| 残存改善提案 | 📝 |
| メトリクス | 📊 |
| critical 重大度 | 🔴 |
| major 重大度 | 🟠 |
| minor 重大度 | 🟡 |
| 所要時間 | ⏱️ |
| 人間への呼びかけ | 🙋 |

## 安全装置（ADR-0014 に準拠）

1. **main / master への直接 commit 禁止**: `git rev-parse --abbrev-ref HEAD` で検証
2. **force push 禁止**: そもそも push しない
3. **無限ループ抑止**: 最大 5 ループで必ず停止
4. **同一箇所の繰り返し書き換え検出**: 同一ファイル × 同一行範囲を 2 ループ連続で書き換えたら停止
5. **見送り再評価のループ間追跡**: 2 ループ連続で「見送り妥当」判定なら 3 ループ目以降は再評価スキップ
6. **コメント誤爆防止**: minimize 対象はマーカー付きスキル由来コメントのみ
7. **lefthook との協調**: lefthook が PATH にある場合、commit 時に pre-commit フックが自動で oxlint / prettier / clippy / vitest を走らせる。ない場合は commit はそのまま成功するため、push 前に `pnpm lint && pnpm test` を人間が実施すること（トラブルシューティング参照）

## トラブルシューティング

### gh CLI が認証されていない

- `gh auth status` で確認
- 未認証なら `gh auth login` をユーザーに促す

### lefthook が PATH にない

- `pnpm lefthook install --force` でインストールを促す
- lefthook なしで commit した場合、品質チェックが走らないので push 前に `pnpm lint && pnpm test` を手動実行すべきことをユーザーに伝える

### 最大ループに到達しても収束しない

- critical/major の残件をすべて `kind=remaining` 行コメントとして残す
- 総評コメントで「複雑なため人間のレビューに引き継ぎ」と明記
- 次回の手動レビュー時に見送り理由と残件を参照できる

### ブランチが main/master

- 即座に commit せず停止し、「別ブランチを切ってから再実行してください」とユーザーに促す

## 実行例

minor は pending バッファに蓄積するだけで各ラウンドでは処理しない。各ラウンドの
「件数」は critical/major のみで判定し、minor は post-review に回す前提で記述する。

```
ユーザー: 現在のブランチでレビューループを回して

→ スキル: SESSION_TS=20260417-143522 を取得
         現ブランチ `feature/xxx` から PR #123 を検出
→ Round 1: critical 1, major 3 を検出（minor 4 件は pending バッファへ）
           critical 1 + major 3 を自動修正、commit
           docs/review-result/code-review-pr123-20260417-143522-round1.md を保存
           ラウンドサマリーコメント（round-summary）を PR に投稿
→ Round 2: critical 0, major 1 を検出（minor 2 件を pending バッファへ追加）
           Round 1 の round-summary コメントを minimize（OUTDATED）
           major 1 を自動修正、commit
           docs/review-result/code-review-pr123-20260417-143522-round2.md を保存
           ラウンドサマリーコメントを投稿
→ Round 3: critical 0, major 0 を検出（minor 1 件を pending バッファへ追加）
           Round 2 の round-summary コメントを minimize
           → 終了条件クリア（post-review へ）
           docs/review-result/code-review-pr123-20260417-143522-round3.md を保存
           ラウンドサマリーコメントを投稿
→ post-review: 蓄積 minor 7 件（重複除去後）をユーザーに提示
              AskUserQuestion → 「個別選択」→ 4 件対応、3 件見送り
              対応分を commit、見送り分を PR に skipped コメント投稿
→ 総評コメント（summary, ✅ 正常終了）を PR に投稿
→ LGTM コメントを PR に投稿（critical/major=0 かつ最大ループ未到達のため）
→ 完了
```

各ラウンドの minor 件数は延べではなく「そのラウンドで新たに検出された minor」。
post-review の集約時に重複除去する（同じファイル・同じ観点の指摘は 1 件に
まとめる）。

**最大ループ到達で強制停止するケース**:

```
→ Round 5: critical 0, major 2 を検出 → ループ上限到達
           Round 4 の round-summary を minimize
           自動修正 or 見送り仕分け → 修正 → commit
           round5 の結果ファイル保存
           ラウンドサマリー投稿（⚠️ 強制停止予告を含む）
→ post-review: minor を一括確認（対応する場合は commit）
→ 総評コメント（summary, ⚠️ 最大ループ到達で強制停止、レビュー未完了）を投稿
→ LGTM は投稿しない（強制停止のため）
→ 「人間レビュワーによる引き取りをお願いします」で完了
```
