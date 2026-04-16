# 開発者向けガイド

Grove のソースから開発・ビルド・テストを行うための手順書。

## 前提ツール

| ツール | バージョン | インストール例 |
|---|---|---|
| macOS | 12 Monterey 以降（Apple Silicon） | — |
| Node.js | 24（CI で動作確認中。20 LTS 以降であれば概ね動作） | [nodejs.org](https://nodejs.org/) または `mise install node@24` |
| pnpm | 9 以降 | `corepack enable && corepack prepare pnpm@latest --activate` |
| Rust | stable（rustup 経由） | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Xcode Command Line Tools | — | `xcode-select --install` |

パッケージマネージャーは **pnpm のみ**。`npm` / `yarn` は使わない。

## セットアップ

```bash
git clone https://github.com/chieeeeno/grove.git
cd grove
pnpm install
pnpm lefthook install --force   # pre-commit フック（OXLint + Prettier + rustfmt + clippy）を有効化
```

## 開発サーバー

```bash
pnpm tauri dev        # Tauri アプリ本体を起動（フロントエンド + Rust を同時ビルド）
pnpm dev              # フロントエンドのみ（Vite dev server, ポート 1420）
```

通常の開発では `pnpm tauri dev` を使う。UI のみの確認用に `pnpm dev` を使うこともできる（ただし Tauri コマンドは呼べない）。

## テスト

```bash
# フロントエンド（Vitest）
pnpm test
pnpm test:watch

# Rust（cargo test）
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

テスト戦略の全体像は [docs/testing-strategy.md](./testing-strategy.md) を参照。

## リント・フォーマット

```bash
# フロントエンド
pnpm lint             # OXLint
pnpm format           # Prettier（自動修正）
pnpm format:check     # Prettier（差分チェックのみ）

# Rust
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --lib
```

`lefthook` による pre-commit フックで `.ts` / `.tsx` → OXLint + Prettier、`.rs` → rustfmt + clippy が並列実行される。

## リリースビルド

```bash
pnpm tauri build      # デスクトップアプリのリリースビルド（.dmg / .app を生成）
pnpm build            # フロントエンドのみ（tsc + vite build）
```

ベータリリース（GitHub Releases にプレリリースを作成）:

```bash
pnpm release:beta -- --dry-run    # 実行内容の確認のみ
pnpm release:beta                 # ビルド → タグ作成 → gh release アップロード
```

## 参考ドキュメント

| ファイル | 役割 |
|---|---|
| [CLAUDE.md](../CLAUDE.md) | AI ペアプロ向けの作業規約・Doc コメントルール等 |
| [grove-design.md](../grove-design.md) | 設計書本体（機能要件 / データモデル / API / フロー図） |
| [docs/adr/](./adr/) | 意思決定記録 |
| [ROADMAP.md](../ROADMAP.md) | マイルストーン定義・スコープ管理（M0 / M1 / M2） |
| [docs/testing-strategy.md](./testing-strategy.md) | 3 層テスト戦略（Rust / TS / Manual QA） |
| [docs/dev-workflow.md](./dev-workflow.md) | プロジェクトの開発ワークフロー記録 |
| [PROGRESS.md](../PROGRESS.md) | M0 タスク一覧と進捗 |

## macOS コード署名について

M1 時点では署名なしで GitHub Releases に配布している。背景と判断は [ADR-0007](./adr/0007-distribution.md) を参照。Developer ID 署名への切り替え手順は:

```bash
APPLE_SIGNING_IDENTITY="Developer ID Application: ..." pnpm tauri build
```
