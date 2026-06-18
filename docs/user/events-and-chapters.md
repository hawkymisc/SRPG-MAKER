# イベントと章

## イベントとは

マップ上の出来事を **コマンド列** で記述します。開戦メッセージ、増援、BGM 切替、勝敗条件の変更などが該当します。

### トリガー（7 種）

| トリガー | 発火タイミング |
|----------|----------------|
| `chapterStart` | 章開始時 |
| `chapterEnd` | 章クリア時 |
| `turnStart` | 指定ターン開始時 |
| `unitDefeated` | ユニット撃破時 |
| `tileReached` | 指定マス到達時 |
| `talk` | 隣接ユニット同士の会話 |
| `chestOpened` | 宝箱を開けた時 |

イベントタブ（**Ctrl+5**）でイベント ID を選び、コマンド行を追加・並べ替えします。

### コマンド（15 種・凍結）

MVP では次の 15 種のみ使用できます。パラメータの詳細は [event-commands.md](../event-commands.md) を参照してください。

`SHOW_MESSAGE` · `SHOW_CHOICES` · `SET_VARIABLE` · `SET_SWITCH` · `BRANCH` · `SPAWN_UNIT` · `REMOVE_UNIT` · `MOVE_UNIT` · `CAMERA_FOCUS` · `PLAY_BGM` · `PLAY_SE` · `SCREEN_EFFECT` · `CHANGE_OBJECTIVE` · `WAIT` · `GOTO_CHAPTER`

## 章（キャンペーン）

複数マップを **章** で束ね、拠点画面から出撃する流れを作れます。

1. **章定義** — 章名、紐づくマップ ID、並び順
2. **拠点** — 編成（`maxDeploy`）、ショップ、拠点イベント
3. **章間** — `nextChapterId` で次章へ

プロジェクトタブの章パネルで編集します。テストプレイではタイトル → 拠点 → 出撃 → 戦闘の順で進みます。

## 支援会話

ユニット同士の支援（バフ付与など）は `supports/supports.json` で定義します。サンプルプロジェクトに例があります。

## 制作のコツ

- 章開始は `chapterStart` + `SHOW_MESSAGE` で導入を書く
- 増援は `turnStart` + `SPAWN_UNIT` の組み合わせが一般的
- ボス戦の勝利条件変更は `CHANGE_OBJECTIVE`（テストプレイで必ず確認）
- 条件分岐は `BRANCH`（ネストは最大 5 段まで）

## プラグインとの関係

フェーズ2以降、イベントの拡張は **プラグイン API** 経由を想定しています。MVP の 15 コマンド以外の組み込みはツール更新を待つか、プラグインで対応します。
