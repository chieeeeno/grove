# review-pr-loop dogfooding ログ

`review-pr-loop` スキルを実運用で回した結果を記録する。
各エントリは 1 回の実行に対応し、気づき・課題・改善提案を残す。

---

## 2026-04-16: スキル初回セルフレビュー

### 対象

本スキル整備の成果物自体:

- `docs/design/review-pr-loop-flow.md`（初版 commit `a71f4fb`）
- `docs/adr/0014-auto-review-skill.md`（初版 commit `56a297d`）
- `.claude/skills/review-pr-loop/review-checklist.md`（初版 commit `7f09e7c`）
- `.claude/skills/review-pr-loop/SKILL.md`（初版 commit `90ab79c`）
- `docs/dev-workflow.md` への追記（初版 commit `d2f2dac`）

> 注: 上記の commit SHA は feature ブランチ上の初版。PR が squash merge 等で
> main に取り込まれると SHA が変わるため、履歴辿りには `git log --follow` や
> PR #58 を使うこと。

### 実行形態

まだスキル本体を別 PR に対して起動していないため、`review-checklist.md` に
沿った手動セルフレビュー + 設計書／ADR／SKILL 間の整合性チェックを実施した。

### セルフレビュー結果

| 観点 | 結果 |
| --- | --- |
| ADR-0014 と SKILL.md の仕様一致（push しない / 5 ループ上限 / minor は post-review） | ✅ 一致 |
| SKILL.md の総評テンプレートと設計書（flow.md）のテンプレート一致 | ✅ 一致（マーカー・絵文字・セクション構成） |
| CLAUDE.md テスト必須・Doc コメント必須ルールが checklist に反映されているか | ✅ major 重大度で明記 |
| ADR-0008〜0013 との整合性チェック項目が checklist にあるか | ✅ 各 ADR 番号を明示 |
| Rust デスクトップアプリ特有観点（panic / メモリリーク / unsafe / リソース解放） | ✅ 重点セクションあり |
| コメント誤爆防止（マーカー付きのみ minimize 対象） | ✅ SKILL.md / ADR / flow.md の 3 箇所で明記 |
| 無限ループ抑止（同一箇所 2 回書き換え検出 / 見送り 2 ループ追跡） | ✅ 仕様として明記 |
| dev-workflow.md への使い方追記と制限事項 | ✅ 追記済み |

### 気づき

- 設計書 `flow.md` とコメントテンプレートを先行コミットしたことで、SKILL.md 記述時の揺らぎを抑えられた
- `review-checklist.md` を重大度タグつきで書くことで、SKILL.md の分類ロジックが「checklist に準拠する」の一言で済むようになった
- `docs/design/review-pr-loop-flow.md` / `docs/adr/0014-auto-review-skill.md` / SKILL.md の 3 層構造で「背景 → 意思決定 → 実行手順」の役割分離ができた

### 次回以降の実運用で検証したい項目

- [ ] 軽微な PR で実際に 5 ループ以内に収束するか
- [ ] PR に紐づかないブランチで起動した際、`gh pr create` 誘導で終了するか
- [ ] Round 1 の見送りコメントが Round 2 のインプットに含まれ、再評価されるか
- [ ] 解消済みコメントが minimize されるか（マーカー誤爆がないか）
- [ ] post-review での `AskUserQuestion`（全対応 / 個別選択 / 全見送）が期待通り動くか
- [ ] 総評コメントの絵文字が GitHub 上で正しく表示されるか
- [ ] 長大な PR で 5 ループ超過時のハンドオフメッセージが人間に伝わる粒度か

---

## 実行ログテンプレート（今後の追記用）

```markdown
## YYYY-MM-DD: PR #XXX に対する実行

### 対象
- PR URL: https://github.com/chieeeeno/grove/pull/XXX
- PR のサイズ: (変更行数・ファイル数)

### 結果
- 実ループ回数: N / 5
- 終了理由: critical/major クリア / 最大ループ到達
- 指摘件数の推移:
  - Round 1: critical=X, major=Y, minor=Z
  - Round 2: ...
- 自動修正コミット数: N 件
- 見送り件数: critical/major=X, minor=Y
- post-review ユーザー判断: 全対応 / 個別選択 / 全見送
- minimize されたコメント数: N 件
- 所要時間: MM:SS

### 気づき
- ...

### 課題・改善提案
- ...
```
