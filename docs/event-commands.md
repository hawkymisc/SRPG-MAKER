# イベントコマンド仕様(MVP・15種で凍結)

MVPのイベントコマンドはこの15種で**凍結**する。追加要望はフェーズ2のプラグインAPIへ送る。
全コマンドは `{ "cmd": "<NAME>", ...params }` のJSONで表現し、Zodスキーマ(`shared/src/schemas/event.ts`)を正とする。

| # | cmd | 主なパラメータ | 挙動 |
|---|---|---|---|
| 1 | SHOW_MESSAGE | speakerId?, faceId?, text | メッセージウィンドウ表示。送り待ち |
| 2 | SHOW_CHOICES | choices[], resultVar | 選択肢表示。選択indexを変数へ格納 |
| 3 | SET_VARIABLE | varId, op(=,+,-,×), value\|varRef | 変数操作 |
| 4 | SET_SWITCH | switchId, value(on/off/toggle) | スイッチ操作 |
| 5 | BRANCH | condition(変数/スイッチ/ユニット生存), then[], else[] | 条件分岐(ネスト可・深さ最大5) |
| 6 | SPAWN_UNIT | unitId, x, y, faction, aiType? | ユニット出現(増援) |
| 7 | REMOVE_UNIT | unitId, effect(fade/warp/none) | ユニット離脱 |
| 8 | MOVE_UNIT | unitId, x, y, speed | ユニットを指定マスへ移動演出 |
| 9 | CAMERA_FOCUS | x, y \| unitId, duration | カメラ移動 |
| 10 | PLAY_BGM | bgmId, fadeInMs? | BGM変更 |
| 11 | PLAY_SE | seId | 効果音再生 |
| 12 | SCREEN_EFFECT | type(fadeIn/fadeOut/shake/tint), params | 画面効果 |
| 13 | CHANGE_OBJECTIVE | win?, lose? | 勝敗条件の差し替え |
| 14 | WAIT | ms | 待機 |
| 15 | GOTO_CHAPTER | chapterId | 章移動(イベント即終了) |

## トリガー(7種)
chapterStart / chapterEnd / turnStart(n) / unitDefeated(unitId) / tileReached(unitId?, x, y) / talk(unitA, unitB) / chestOpened(x, y)

## 実装規約
- 条件評価・変数操作(3,4,5の判定部)は shared の純粋関数。表示・演出(1,2,8〜12,14)は runtime のインタプリタ
- 各コマンドは「スキーマparse → 単体テスト → インタプリタ実装 → E2E1本」をセットで完了とする
