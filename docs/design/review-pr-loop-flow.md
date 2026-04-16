# review-pr-loop スキル フロー設計

自動コードレビュースキルの制御フローとシーケンスを図で示す設計書。

## 前提

| 項目 | 決定 |
| --- | --- |
| 起動入力 | PR URL（任意）。省略時は現在のブランチから自動検出 |
| PR 未検出時 | `gh pr create` を案内してスキル終了（レビューしない） |
| push の扱い | commit のみ自動、push は人間（lefthook で最終防衛） |
| レビュー実装 | simplify スキル + Grove 独自観点の上乗せ |
| レビュー観点 | コード品質 / テスト有無 / Doc コメント / セキュリティ / パフォーマンス / Rust デスクトップアプリ特有（panic, メモリリーク, unsafe, リソース解放） |
| 終了条件 | critical + major = 0、または最大 5 ループ到達 |
| ループ上限 | 5 回 |
| コメント形式 | critical/major は行コメント、総評は PR 全体コメント |
| minor 見送り時 | ループ中は一旦まとめて保留。全レビュー終了後、個別 PR コメント化はせず、最終 LGTM（または総評）コメント内の「🤔 見送った minor 指摘」セクションに全件の要約リストとして記載する |
| 見送り記録 | 見送り内容 + 理由 + ループ回数を PR コメントに残す |
| 見送り再評価 | 次ループで前回見送りコメントを読み込み、見送り判断自体を再レビュー |
| ループ番号可視化 | 全コメントに `[Round N/5]` を明記 |
| 対応完了コメント | GitHub GraphQL `minimizeComment(RESOLVED)` で非表示化 |
| 誤爆防止 | マーカー `<!-- review-pr-loop:round=N;kind=... -->` 付きコメントのみを操作対象にする |
| uuid 生成 | `uuidgen` コマンドで 1 コメントごとに新規発行（macOS/Linux 標準搭載） |
| セッション識別 | スキル起動時に `date +%Y%m%d-%H%M%S` で `SESSION_TS` を取得し全ラウンドで共通利用 |
| レビュー結果保存 | 各ラウンド終了時に `docs/review-result/code-review-pr<PR>-<SESSION_TS>-round<R>.md` に詳細ログを保存（`.gitignore` 対象、ローカル参照専用） |
| ラウンドサマリー | 各ラウンド終了時に PR に `kind=round-summary` コメントを投稿。次ラウンド開始時に前ラウンド分を `minimizeComment(OUTDATED)` で非表示化（削除せずトグル展開で閲覧可能） |
| LGTM 判定 | 正常終了（critical/major=0 かつ最大ループ未到達）なら `kind=lgtm` コメントを投稿。最大ループ到達時は LGTM 不投稿、総評に「強制停止・レビュー未完了」を明記 |

## フローチャート（全体制御）

```mermaid
flowchart TD
    Start([スキル起動]) --> InitSession[SESSION_TS を取得<br/>docs/review-result/ を用意]
    InitSession --> HasUrl{PR URL 引数あり?}
    HasUrl -- Yes --> FetchMeta[gh pr view でメタ取得<br/>PR_NUMBER を保持]
    HasUrl -- No --> DetectBranch[現在のブランチを取得]
    DetectBranch --> FindPR[gh pr list --head で PR 検索]
    FindPR --> PrExists{PR あり?}
    PrExists -- No --> PromptCreate[gh pr create を案内して終了]
    PromptCreate --> EndNoPR([終了])
    PrExists -- Yes --> FetchMeta
    FetchMeta --> InitRound[round = 1]

    InitRound --> LoadPrevComments[前ループのスキル由来コメント取得<br/>マーカー review-pr-loop でフィルタ<br/>kind: skipped/remaining/round-summary/summary/lgtm]
    LoadPrevComments --> FetchDiff[gh pr diff で最新差分取得]
    FetchDiff --> RunSimplify[simplify スキル相当のレビュー]
    RunSimplify --> RunCustom[review-checklist の独自観点チェック]
    RunCustom --> ReevalSkipped[前回見送り理由の妥当性を再評価]
    ReevalSkipped --> Classify[critical / major / minor に分類]
    Classify --> MinimizeResolved[修正済み指摘コメントを minimize RESOLVED]

    MinimizeResolved --> CheckDone{critical + major == 0<br/>または round >= 5?}
    CheckDone -- Yes --> SaveResultFinal[レビュー結果を<br/>code-review-pr-ts-roundN.md に保存]
    CheckDone -- No --> SplitFix[critical/major の修正 / 見送り仕分け<br/>minor は pending バッファに蓄積]
    SplitFix --> PostSkipped[critical/major の見送り項目を<br/>PR コメント投稿 Round N]
    PostSkipped --> BranchGuard{現ブランチが<br/>main/master/detached HEAD?}
    BranchGuard -- Yes --> AbortBranch[main/master/HEAD への直接 commit 禁止で停止]
    AbortBranch --> EndAbort([終了])
    BranchGuard -- No --> ApplyFix[critical/major の自動修正を実装]
    ApplyFix --> LoopGuard{同一ファイル同一行を<br/>2 回書き換え?}
    LoopGuard -- Yes --> AbortLoop[無限ループ検出で停止]
    AbortLoop --> EndAbort
    LoopGuard -- No --> Commit[git commit<br/>push はしない]
    Commit --> SaveResult[レビュー結果を<br/>code-review-pr-ts-roundN.md に保存]
    SaveResult --> MinimizePrev[前ラウンドの round-summary を<br/>minimize OUTDATED]
    MinimizePrev --> PostRoundSummary[round-summary コメントを投稿]
    PostRoundSummary --> Increment[round += 1]
    Increment --> LoadPrevComments

    SaveResultFinal --> MinimizePrevFinal[前ラウンドの round-summary を<br/>minimize OUTDATED]
    MinimizePrevFinal --> PostRoundSummaryFinal[最終ラウンドの round-summary を投稿]
    PostRoundSummaryFinal --> PostReview([post-review へ])

    PostReview --> AggregateMinor[蓄積された minor 見送り候補を集約<br/>重複除去・要約]
    AggregateMinor --> PostFinal[総評 + 残件行コメント投稿<br/>minor 個別コメントは投稿しない]
    PostFinal --> CheckLGTM{critical/major=0 かつ<br/>最大ループ未到達?}
    CheckLGTM -- Yes --> PostLGTM[LGTM コメントを投稿<br/>本文に minor 見送りサマリー（全件要約）を記載]
    PostLGTM --> EndDone([完了])
    CheckLGTM -- No --> EndForced([完了<br/>強制停止・未完了をユーザーに通知<br/>総評に minor 見送りサマリーも記載])
```

## シーケンス図（1 ラウンド分の詳細）

```mermaid
sequenceDiagram
    autonumber
    actor User as ユーザー
    participant Skill as review-pr-loop スキル
    participant GH as GitHub (gh CLI / GraphQL)
    participant Simplify as simplify スキル
    participant Git as ローカル Git
    participant FS as ローカルファイルシステム

    User->>Skill: スキル起動（PR URL 任意）
    Skill->>Skill: SESSION_TS = date +%Y%m%d-%H%M%S
    Skill->>FS: mkdir -p docs/review-result/
    alt PR URL 未指定
        Skill->>Git: git rev-parse --abbrev-ref HEAD
        Git-->>Skill: 現ブランチ名
        Skill->>GH: gh pr list --head <branch>
        GH-->>Skill: PR 一覧
        alt PR なし
            Skill-->>User: gh pr create を案内して終了
        end
    end

    Skill->>GH: gh pr view / pr diff / issue comments / pulls comments
    GH-->>Skill: PR メタ + 差分 + 既存コメント（マーカー付き）

    Skill->>Skill: 既存コメントを分類<br/>(skipped/remaining/round-summary/summary/lgtm)
    Skill->>Simplify: simplify 実行依頼（差分を入力）
    Simplify-->>Skill: 品質指摘一覧
    Skill->>Skill: review-checklist で独自観点チェック<br/>（Rust panic/リーク / Doc / Test / ADR 整合）
    Skill->>Skill: 前回見送り理由の妥当性を再評価
    Skill->>Skill: critical / major / minor に分類

    Skill->>GH: 解消済み指摘コメントを minimizeComment(RESOLVED)
    GH-->>Skill: 非表示化完了

    alt 終了条件（critical+major=0 or round>=5）
        Skill->>FS: レビュー結果を code-review-pr<PR>-<TS>-roundN.md に保存
        opt round >= 2
            Skill->>GH: 前ラウンドの round-summary を minimizeComment(OUTDATED)
        end
        Skill->>GH: ラウンドサマリーコメント投稿（kind=round-summary）
        Note over Skill: post-review フェーズへ
        Skill->>Skill: 全ラウンドで蓄積した minor 見送り候補を集約（重複除去・要約）
        Skill->>GH: 行コメント（critical/major 残件）+ PR 全体総評を投稿
        alt critical+major=0 かつ round < max_loop
            Skill->>GH: LGTM コメント投稿（kind=lgtm、本文に minor 見送りサマリーを全件記載）
            Skill-->>User: ✅ 完了レポート
        else 最大ループ到達
            Note over Skill,User: 総評に「⚠️ 強制停止・レビュー未完了」+ minor 見送りサマリーを明記<br/>LGTM は投稿しない
            Skill-->>User: ⚠️ 完了レポート（人間にハンドオフ）
        end
    else 継続
        Skill->>Skill: critical/major の修正 / 見送り仕分け<br/>minor は pending バッファに蓄積
        Skill->>GH: critical/major の見送り項目コメント投稿（Round N + 理由）
        Skill->>Git: 現ブランチが main/master/detached HEAD でないことを確認
        Skill->>Skill: 同一箇所を 2 回書き換えていないか確認
        Skill->>Skill: critical/major の自動修正を実装
        Skill->>Git: git add + git commit（push はしない）
        Git-->>Skill: lefthook pre-commit 通過
        Skill->>FS: レビュー結果を code-review-pr<PR>-<TS>-roundN.md に保存
        opt round >= 2
            Skill->>GH: 前ラウンドの round-summary を minimizeComment(OUTDATED)
        end
        Skill->>GH: ラウンドサマリーコメント投稿（kind=round-summary）
        Skill->>Skill: round += 1
        Note over Skill: 次ラウンドの冒頭に戻る
    end
```

## コメント本文テンプレート

### A. 見送り理由コメント（ループ途中）

```
<!-- review-pr-loop:round=N;kind=skipped;id=<uuid> -->
🤔 **[Round N/5] 自動修正を見送った指摘**

**指摘内容**: <要約>
**対象**: `path/to/file.rs:42-48`
**重大度**: critical / major / minor
**見送り理由**: <理由 — 例: 設計判断が必要 / 既存パターンと矛盾 / 修正範囲が大きい / post-review でユーザーが見送り選択>
**確認経路**:
  - critical/major: 機械的修正が困難と判断（ループ内で自動決定）
  - minor: 全レビュー終了後の post-review フェーズでユーザーが「見送る」を選択

次のループでこの見送り判断自体を再評価します。
```

### B. 残件の行コメント（終了時）

重大度に応じて先頭に 🔴（critical）/ 🟠（major）/ 🟡（minor）を付与する。

```
<!-- review-pr-loop:round=N;kind=remaining;id=<uuid> -->
🔴 / 🟠 / 🟡 **[Round N/5] 残存する指摘（重大度: critical/major/minor）**

<内容>
```

### C. 総評コメント（終了時）

アイキャッチとして各セクションに絵文字を付与し、PR 一覧から視認しやすくする。

```
<!-- review-pr-loop:round=N;kind=summary;id=<uuid>;session=<SESSION_TS> -->
# 🤖 review-pr-loop レビュー総評

**🏁 終了ステータス**: ✅ critical/major クリア で正常終了 / ⚠️ 最大ループ到達で強制終了
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

### D. ラウンドサマリーコメント（各ラウンド終了時）

各ラウンドで「何を検出し、何を修正し、何を pending に回したか」を PR に
要約として残す。次ラウンド開始時に `minimizeComment(OUTDATED)` で非表示化
するが、削除はしないためトグルで展開すれば内容は参照可能。

```
<!-- review-pr-loop:round=N;kind=round-summary;id=<uuid>;session=<SESSION_TS> -->
## 🔁 Round N/5 レビュー結果サマリー

**セッション**: `<SESSION_TS>` / **PR**: #<PR_NUMBER>
**詳細ログ**: `docs/review-result/code-review-pr<PR_NUMBER>-<SESSION_TS>-roundN.md`（ローカル）

### 🔴 critical（X 件）
- <要約 1 行>

### 🟠 major（Y 件）
- <要約 1 行>

### 🟡 minor（Z 件・pending バッファ送り）
- <要約 1 行>

### 🛠️ このラウンドでの対応
- 自動修正: N 件（commit SHA: `<abbr sha>`）
- 見送り: M 件

### 次アクション
- 継続 / post-review へ移行 / ⚠️ 強制停止
```

### E. LGTM コメント（品質クリア時の最終コメント）

全ラウンド終了後、以下をすべて満たす場合のみ投稿:

- `critical + major == 0`
- 最大ループに到達していない（正常終了）

本文には **minor 見送りサマリー（全件の要約リスト）** を必ず含める。個別の
`kind=skipped` 行コメントは投稿しないため、この LGTM コメント内のリストが
「どんな指摘が出て、なぜ見送ったか」の唯一の履歴記録となる。

```
<!-- review-pr-loop:round=N;kind=lgtm;id=<uuid>;session=<SESSION_TS> -->
# ✅ LGTM

本 PR は review-pr-loop の品質基準（critical/major = 0）をクリアしました。
マージ可能な状態です。

- **セッション**: `<SESSION_TS>`
- **実ラウンド数**: N / 5
- **関連コメント**: 総評（kind=summary）に全体サマリー記載

## 🤔 見送った minor 指摘（全 K 件）

### 1. <指摘タイトル>
- **対象**: `path/to/file.md:行番号`（該当する場合）
- **指摘内容**: <1〜3 行で要約>
- **見送り理由**: <なぜ今回対応しないか、簡潔に>

（全件繰り返す）

---

> 🙋 最終的なマージ判断は人間レビュワーでお願いします。
```

最大ループに到達して強制停止した場合は LGTM を投稿せず、総評コメント
（kind=summary）本文に「⚠️ 最大ループ到達で強制停止、レビュー未完了。
人間レビュワーによる引き取りをお願いします」を明記する。その際、minor
見送りサマリーも総評内に同じ形式で記載する。

絵文字の用途ガイド:

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

## 安全装置まとめ

- `main` / `master` / detached HEAD への直接 commit は `git rev-parse --abbrev-ref HEAD` でブロック（detached HEAD は戻り値が `HEAD` になる）
- force push は実行しない（push 自体しない設計）
- 同一ファイル × 同一行範囲を 2 ループ連続で書き換えた場合は無限ループとして停止
- 同じ指摘を 2 ループ連続で「見送り」と判断した場合、3 ループ目以降は再評価をスキップ（総評には明記）
- minimize 対象は `<!-- review-pr-loop:... -->` マーカー付きコメントのみ（他者コメント誤爆防止）
- minor 指摘はループ中は自動判断せず pending バッファに蓄積し、全レビュー終了後の post-review フェーズでまとめてユーザーに提示 → AskUserQuestion で「全対応 / 個別選択 / 全見送」を確認する
- post-review での minor 修正も main/master/detached HEAD では実行しない（同じ branch guard を通す）
