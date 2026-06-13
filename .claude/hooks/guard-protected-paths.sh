#!/usr/bin/env bash
# PreToolUse(Edit|Write|MultiEdit): 保護パスへの書込をブロックする
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_jq.sh
source "$SCRIPT_DIR/_jq.sh"
INPUT=$(cat)
INPUT="${INPUT//$'\r'/}"
FILE_PATH=$(_jq -r '.tool_input.file_path // empty' <<<"$INPUT")
FILE_PATH="${FILE_PATH//$'\r'/}"
[ -z "$FILE_PATH" ] && exit 0

# ゴールデンマスター: ゲームルール変更の証跡。人間承認マーカーがない限り変更禁止
if echo "$FILE_PATH" | grep -q "e2e/golden/"; then
  if [ ! -f ".allow-golden-update" ]; then
    echo "ブロック: e2e/golden/ の更新はゲームルールの変更を意味します。人間の承認後に 'touch .allow-golden-update' を実行してもらってください(コミット前にCIが自動削除)。" >&2
    exit 2
  fi
fi

# 仕様書とCLAUDE.mdはエージェントによる書換禁止(人間が管理)
case "$FILE_PATH" in
  *docs/spec.md|*CLAUDE.md)
    echo "ブロック: $FILE_PATH は人間が管理するファイルです。変更が必要な場合は提案として報告してください。" >&2
    exit 2 ;;
esac
exit 0
