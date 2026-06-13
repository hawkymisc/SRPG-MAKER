#!/usr/bin/env bash
# jq 解決ヘルパー。PATH に無い場合は .claude/tools/jq.exe を使う。
set -euo pipefail

_jq() {
  if command -v jq >/dev/null 2>&1; then
    command jq "$@"
    return
  fi

  local hook_dir
  hook_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local bundled
  bundled="$(cd "$hook_dir/../tools" 2>/dev/null && pwd)/jq.exe"

  if [ -f "$bundled" ]; then
    "$bundled" "$@"
    return
  fi

  echo "エラー: jq が見つかりません。scripts/ensure-jq.ps1 を実行するか、winget install jqlang.jq を実行してください。" >&2
  exit 127
}
