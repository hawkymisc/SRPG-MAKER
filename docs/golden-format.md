# ゴールデンマスター形式仕様

ゴールデンマスター(GM)は「シード+初期状態+入力列 → 期待結果」の組で、ゲームルールの回帰を検出する。
`e2e/golden/scenarios/<name>.json`(入力)と `e2e/golden/snapshots/<name>.expected.json`(期待結果)の対で管理する。

## シナリオファイル

```json
{
  "name": "triangle-advantage",
  "description": "剣→斧の三すくみ有利で命中・威力補正が乗ること",
  "specRef": "spec 5.2.2",
  "seed": 42,
  "setup": {
    "map": "templates/sample/maps/test10.json",
    "units": [
      { "ref": "unit_alm", "x": 2, "y": 2, "faction": "player", "equip": "wpn_iron_sword" },
      { "ref": "unit_brigand", "x": 3, "y": 2, "faction": "enemy", "equip": "wpn_iron_axe" }
    ],
    "configOverride": {}
  },
  "actions": [
    { "type": "Attack", "actor": "unit_alm", "target": "unit_brigand" },
    { "type": "EndPhase" }
  ]
}
```

## スナップショット(ハーネスが自動生成)

`resolveAction` を全actionに適用した後の以下を保存する:
- 全ユニットの位置・HP・経験値・武器耐久
- 戦闘ログ全件(ダメージ値・命中判定の乱数値含む)
- 乱数消費数 / ターン・フェイズ / 勝敗状態

## 運用ルール

1. スナップショットの再生成は `pnpm test:golden --update` でのみ行う(手編集禁止)
2. `e2e/golden/` への書込はフックで保護されており、人間が `.allow-golden-update` を作成した場合のみ可能
3. 差分が出たPRは、説明に「どの計算がどう変わったか」を必ず記載する
4. シナリオ名は検証対象を表す英語ケバブケース。1シナリオ=1検証観点とし、欲張らない

## M1で必須の10本(test-engineerはこのリストから着手)
triangle-advantage / triangle-disadvantage / double-attack-threshold(速さ差ちょうど) / critical-hit / terrain-avoid(森) / terrain-heal(砦) / min-damage-zero / weapon-break(耐久0) / reinforcement-turn3 / win-by-boss-kill
