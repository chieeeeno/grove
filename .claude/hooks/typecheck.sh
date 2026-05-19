#!/usr/bin/env bash
# PostToolUse hook: TS/Rust ファイル編集直後に型チェックを走らせる。
#
# 入力:   stdin JSON (Claude Code PostToolUse spec)
#         .tool_input.file_path に編集対象ファイルの絶対パス
# 出力:   型エラー時のみ stderr にエラー本文（末尾 30 行）を出し exit 2
#         （exit 2 で Claude にフィードバックされ、続く修正に活かされる）
# 対象外: .ts/.tsx/.rs 以外は何もせず exit 0
#
# 依存: jq, pnpm（PATH 経由）, $HOME/.cargo/bin/cargo
set -uo pipefail

input=$(cat)

# jq が無い環境では静かに諦める（hook で開発を止めない）
if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
if [ -z "$file_path" ]; then
  exit 0
fi

project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"

run_check() {
  local label="$1"
  shift
  local output
  output=$("$@" 2>&1)
  local status=$?
  if [ $status -ne 0 ]; then
    {
      printf '[%s] type check failed (exit %d)\n' "$label" "$status"
      printf '%s\n' "$output" | tail -30
    } >&2
    exit 2
  fi
}

case "$file_path" in
  *.ts|*.tsx)
    cd "$project_dir" || exit 0
    if ! command -v pnpm >/dev/null 2>&1; then
      exit 0
    fi
    run_check "tsc" pnpm tsc --noEmit
    ;;
  *.rs)
    cd "$project_dir" || exit 0
    cargo_bin="$HOME/.cargo/bin/cargo"
    if [ ! -x "$cargo_bin" ]; then
      exit 0
    fi
    run_check "cargo check" "$cargo_bin" check --manifest-path src-tauri/Cargo.toml --lib --message-format=short
    ;;
esac

exit 0
