---
description: チケットをサブエージェントに委任する(引数: チケットID)
---
チケット $ARGUMENTS を委任してください。手順:
1. docs/tasks/BOARD.md で該当チケットを特定し IN_PROGRESS に更新
2. 担当サブエージェントへ、チケットID / docs/spec.md の該当節 / 触ってよいパス / 受け入れ条件(検証コマンドと期待結果)を明記して委任
3. 完了報告を受けたら code-reviewer にレビューを委任
4. APPROVEならチケットIDを含むメッセージでコミットし、BOARDをDONEに更新。REQUEST_CHANGESなら差し戻し(3往復でBLOCKED+エスカレーション)
