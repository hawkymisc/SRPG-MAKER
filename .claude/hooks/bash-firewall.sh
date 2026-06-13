#!/usr/bin/env bash
# PreToolUse(Bash): 破壊的・非可逆コマンドをブロックする
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_jq.sh
source "$SCRIPT_DIR/_jq.sh"
INPUT=$(cat)
INPUT="${INPUT//$'\r'/}"
CMD=$(_jq -r '.tool_input.command // empty' <<<"$INPUT")
CMD="${CMD//$'\r'/}"
if echo "$CMD" | grep -qE 'rm -rf /|rm -rf \.|git push.*--force|git reset --hard|git clean -fd'; then
  echo "ブロック: 破壊的コマンドは禁止されています。必要なら人間に依頼してください。" >&2
  exit 2
fi
exit 0
