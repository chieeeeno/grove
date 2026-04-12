#!/usr/bin/env bash
#
# release-beta.sh — ベータ版 .dmg をビルドし GitHub Releases にプレリリースとしてアップロードする
#
# 使い方:
#   pnpm release:beta -- --dry-run    # 実行内容の確認のみ（ビルド・リリースは行わない）
#   pnpm release:beta                 # ビルド → リリース作成

set -euo pipefail

DMG_DIR="src-tauri/target/release/bundle/dmg"

APP_VERSION=$(node -e "process.stdout.write(require('./src-tauri/tauri.conf.json').version)")
BETA_TAG_PREFIX="v${APP_VERSION}-beta"

DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --) ;;
    *)
      echo "エラー: 不明なオプション '$arg'"
      echo "使い方: pnpm release:beta -- --dry-run"
      exit 1
      ;;
  esac
done

info() {
  echo "==> $1"
}

run() {
  if [ "$DRY_RUN" = true ]; then
    echo "  [dry-run] $*"
  else
    "$@"
  fi
}

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

info "最新のベータタグを取得..."

git fetch --tags --quiet

# grep がマッチなしで exit 1 を返すため、pipefail 下では grep のみ || true で吸収する
LATEST_NUM=$(
  git tag -l "${BETA_TAG_PREFIX}.*" \
    | sed "s/${BETA_TAG_PREFIX}\.//" \
    | { grep -E '^[0-9]+$' || true; } \
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

info "Tauri ビルドを実行 (ad-hoc 署名付き)..."
run env APPLE_SIGNING_IDENTITY="-" pnpm tauri build

if [ "$DRY_RUN" = true ]; then
  info "[dry-run] DMG ファイルの検出をスキップ (ビルド未実行のため)"
  DMG_FILE="${DMG_DIR}/<generated>.dmg"
else
  info "DMG ファイルを検出..."
  shopt -s nullglob
  DMG_FILES=("${DMG_DIR}"/*.dmg)
  shopt -u nullglob
  if [ ${#DMG_FILES[@]} -eq 0 ]; then
    echo "エラー: DMG ファイルが見つかりません: ${DMG_DIR}/"
    exit 1
  fi
  if [ ${#DMG_FILES[@]} -gt 1 ]; then
    echo "警告: DMG ファイルが複数見つかりました — 最初のファイルを使用: ${DMG_FILES[0]}"
  fi
  DMG_FILE="${DMG_FILES[0]}"
  info "検出: ${DMG_FILE}"

  info "ad-hoc 署名を検証..."
  APP_DIR="src-tauri/target/release/bundle/macos"
  shopt -s nullglob
  APP_FILES=("${APP_DIR}"/*.app)
  shopt -u nullglob
  if [ ${#APP_FILES[@]} -eq 0 ]; then
    echo "エラー: .app バンドルが見つかりません: ${APP_DIR}/"
    exit 1
  fi
  APP_FILE="${APP_FILES[0]}"
  if codesign --verify --verbose=2 "$APP_FILE" 2>&1; then
    info "署名検証 OK: ${APP_FILE}"
  else
    echo "エラー: 署名検証に失敗しました: ${APP_FILE}"
    exit 1
  fi
fi

info "Git タグを作成: ${NEXT_TAG}"
run git tag "$NEXT_TAG"
run git push origin "$NEXT_TAG"

info "GitHub Release を作成 (prerelease)..."
run gh release create "$NEXT_TAG" "$DMG_FILE" \
  --prerelease \
  --title "$NEXT_TAG" \
  --notes "Beta release ${NEXT_TAG}"

if [ "$DRY_RUN" = true ]; then
  echo ""
  info "ドライラン完了 — 上記の内容が実行されます"
else
  echo ""
  info "リリース完了: ${NEXT_TAG}"
  info "https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/releases/tag/${NEXT_TAG}"
fi
