# ADR 0006: 専用バトル画面 (BattleScene)

- 状態: 承認
- 日付: 2026-06-16
- 決定者: runtime-dev (M7-T3)

## 文脈

spec 2.3 フェーズ3で「戦闘アニメーション(専用バトル画面)」が要求される。
M7-T2 までマップ上の `CombatFx`（突進・ダメージ数字）で簡易演出していたが、
攻撃時にマップ座標に縛られない専用 UI が必要になった。

制約:

- 戦闘判定は `@srpg/shared` の純粋関数のまま。runtime はログ再生のみ。
- `BattleMapScene` はマップ入力・ターン進行の本体であり、戦闘演出中も裏で維持する。
- 決定論ルールは shared のみ対象。runtime の Phaser tween は演出専用でよい。

## 決定

1. **並列シーン** — `BattleScene` を `scene.launch("Battle", data)` で `BattleMap` 上に重ねる。
   完了時は `scene.stop()` し、親シーンへ `battle-playback-complete` イベントを送る。
2. **データ受け渡し** — `BattleLogEntry[]` と `BattleUnit[]` を init data で渡す。
   再生対象は `damage` / `crit` / `miss` のみ（`extractStrikePlaybackSteps`）。
3. **レイアウト** — 全画面半透明オーバーレイ。攻撃側左・防御側右にユニットスプライトと HP バー。
4. **スタイル共有** — 色・ダメージ文字列は既存 `combatFxStyle.ts` を再利用。
5. **フォールバック** — `BattleScene` が未登録の場合は従来のマップ上 `CombatFx` に退避。

## 検討した代替案

| 案 | 却下理由 |
|---|---|
| `BattleMap` 内でカメラズーム＋UI 切替 | マップ座標と UI 状態が複雑化し、テスト・保守が困難 |
| `scene.pause("BattleMap")` で単一シーン切替 | マップの DOM HUD やイベント状態の再開が煩雑 |
| shared に演出タイムライン型を追加 | 描画関心が shared 境界を侵す |

## 影響

- `createGame.ts` に `BattleScene` を登録（`active: false`）。
- 将来のスキル演出・武器エフェクトは `BattleScene` 内レイヤーへ拡張可能。
- BGM/SE (M7-T4) は別 ADR。BattleScene は現時点で無音。
