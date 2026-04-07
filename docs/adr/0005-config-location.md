# ADR-0005: 設定ファイルの保存場所を tauri-plugin-store のデフォルトにする

**日付**: 2026-04-07
**ステータス**: 確定

## 背景

Grove の設定（登録済みリポジトリ一覧、テーマ、リフレッシュ間隔等）の保存場所を決める必要がある。後から場所を変更すると migration コードを書く必要があるため、早期に確定したい。

## 検討した選択肢

- **A**: tauri-plugin-store のデフォルト（`~/Library/Application Support/io.github.chieeeeno.grove/`）
- **B**: `~/.config/grove/`（XDG Base Directory 準拠）
- **C**: `~/.grove/`（シンプル dotfile）

## 決定

**A: tauri-plugin-store のデフォルト**

具体的なパス: `~/Library/Application Support/io.github.chieeeeno.grove/`

## 理由

- Grove は GUI から設定を操作する前提のアプリで、ユーザーが手動で設定ファイルを編集する場面はほぼない
- Tauri の標準機能に乗ることで、パス解決コードを自分で書かなくて済む
- macOS の標準作法（Application Support 配下）に従うことで、アプリとして自然な振る舞いになる
- M0 段階では他の選択肢を選ぶ積極的理由がない
- 将来 B/C に移す必要が出ても、migration コードを書けば対応可能

## 却下した選択肢の理由

- **B**: ターミナルからのアクセスやすさは魅力だが、GUI 中心のアプリでは恩恵が薄い。macOS の標準作法から外れる
- **C**: ホームディレクトリが散らかる。XDG 準拠が好まれる現代の慣習からも外れる
