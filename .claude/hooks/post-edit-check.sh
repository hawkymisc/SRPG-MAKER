#!/usr/bin/env bash
# PostToolUse(Edit|Write): TS編集直後に決定論違反を即時検出(全lintより速いGrepゲート)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_jq.sh
source "$SCRIPT_DIR/_jq.sh"
INPUT=$(cat)
INPUT="${INPUT//$'\r'/}"
FILE_PATH=$(_jq -r '.tool_input.file_path // empty' <<<"$INPUT")
FILE_PATH="${FILE_PATH//$'\r'/}"
case "$FILE_PATH" in
  *.ts|*.tsx)
    if grep -nE 'Math\.random|Date\.now|crypto\.randomUUID' "$FILE_PATH" 2>/dev/null | grep -v 'eslint-disable' ; then
      echo "警告: 決定論規約違反の可能性。シード付きRNG(shared/src/rng.ts)を使ってください。" >&2
      exit 1
    fi
    # sharedパッケージの依存境界を即時検査
    if echo "$FILE_PATH" | grep -q "packages/shared/"; then
      if grep -nE "from ['\"](phaser|react|fs|path|electron)" "$FILE_PATH" 2>/dev/null; then
        echo "警告: packages/shared から禁止依存(phaser/react/node)をimportしています。" >&2
        exit 1
      fi
    fi
    ;;
esac
exit 0
