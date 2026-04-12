#!/usr/bin/env bash
#
# release-beta.sh — ベータ版 .dmg をビルドし GitHub Releases にプレリリースとしてアップロードする
#
# 使い方:
#   pnpm release:beta              # ビルド → リリース作成
#   pnpm release:beta --dry-run    # 実行内容の確認のみ（ビルド・リリースは行わない）

set -euo pipefail

# ──────────────────────────────────────────────
# 定数
# ──────────────────────────────────────────────
BETA_TAG_PREFIX="v0.1.0-beta"
DMG_DIR="src-tauri/target/release/bundle/dmg"

# ──────────────────────────────────────────────
# ドライランフラグの解析
# ──────────────────────────────────────────────
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *)
      echo "エラー: 不明なオプション '$arg'"
      echo "使い方: pnpm release:beta [--dry-run]"
      exit 1
      ;;
  esac
done

# ──────────────────────────────────────────────
# ユーティリティ
# ──────────────────────────────────────────────

## ステップごとの進捗メッセージを出力する
## @param $1 - 表示するメッセージ
info() {
  echo "==> $1"
}

## ドライラン時はコマンドを表示するだけで実行しない
## 通常時はそのまま実行する
## @param $@ - 実行するコマンドと引数
run() {
  if [ "$DRY_RUN" = true ]; then
    echo "  [dry-run] $*"
  else
    "$@"
  fi
}

# ──────────────────────────────────────────────
# 1. 前提チェック
# ──────────────────────────────────────────────
info "前提チェック..."

if ! command -v gh &>/dev/null; then
  echo "エラー: gh CLI がインストールされていません"
  echo "  → brew install gh"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "エラー: gh CLI が認証されていません"
  echo "  → gh auth login"
  exit 1
fi

# ──────────────────────────────────────────────
# 2. ワーキングツリーの状態確認
# ──────────────────────────────────────────────
if [ -n "$(git status --porcelain)" ]; then
  echo "警告: 未コミットの変更があります"
  git status --short
  echo ""
  read -rp "このまま続行しますか? (y/N): " answer
  if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
    echo "中断しました"
    exit 1
  fi
fi

# ──────────────────────────────────────────────
# 3. タグの自動インクリメント
# ──────────────────────────────────────────────
info "最新のベータタグを取得..."

# リモートタグも含めて最新を取得
git fetch --tags --quiet

LATEST_NUM=$(
  git tag -l "${BETA_TAG_PREFIX}.*" \
    | sed "s/${BETA_TAG_PREFIX}\.//" \
    | sort -n \
    | tail -1
)

if [ -z "$LATEST_NUM" ]; then
  NEXT_NUM=1
else
  NEXT_NUM=$((LATEST_NUM + 1))
fi

NEXT_TAG="${BETA_TAG_PREFIX}.${NEXT_NUM}"
info "次のタグ: ${NEXT_TAG}"

# ──────────────────────────────────────────────
# 4. Tauri ビルド
# ──────────────────────────────────────────────
info "Tauri ビルドを実行..."
run pnpm tauri build

# ──────────────────────────────────────────────
# 5. DMG ファイルの検出
# ──────────────────────────────────────────────
if [ "$DRY_RUN" = true ]; then
  info "[dry-run] DMG ファイルの検出をスキップ (ビルド未実行のため)"
  DMG_FILE="${DMG_DIR}/Grove_0.1.0_aarch64.dmg (予測パス)"
else
  info "DMG ファイルを検出..."
  DMG_FILES=("${DMG_DIR}"/*.dmg)
  if [ ${#DMG_FILES[@]} -eq 0 ] || [ ! -f "${DMG_FILES[0]}" ]; then
    echo "エラー: DMG ファイルが見つかりません: ${DMG_DIR}/"
    exit 1
  fi
  DMG_FILE="${DMG_FILES[0]}"
  info "検出: ${DMG_FILE}"
fi

# ──────────────────────────────────────────────
# 6. Git タグを作成
# ──────────────────────────────────────────────
info "Git タグを作成: ${NEXT_TAG}"
run git tag "$NEXT_TAG"
run git push origin "$NEXT_TAG"

# ──────────────────────────────────────────────
# 7. GitHub Release 作成 & アップロード
# ──────────────────────────────────────────────
info "GitHub Release を作成 (prerelease)..."
if [ "$DRY_RUN" = true ]; then
  echo "  [dry-run] gh release create ${NEXT_TAG} \"${DMG_FILE}\" --prerelease --title \"${NEXT_TAG}\" --notes \"Beta release ${NEXT_TAG}\""
else
  gh release create "$NEXT_TAG" "$DMG_FILE" \
    --prerelease \
    --title "$NEXT_TAG" \
    --notes "Beta release ${NEXT_TAG}"
fi

# ──────────────────────────────────────────────
# 完了
# ──────────────────────────────────────────────
if [ "$DRY_RUN" = true ]; then
  echo ""
  info "ドライラン完了 — 上記の内容が実行されます"
else
  echo ""
  info "リリース完了: ${NEXT_TAG}"
  info "https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/releases/tag/${NEXT_TAG}"
fi
