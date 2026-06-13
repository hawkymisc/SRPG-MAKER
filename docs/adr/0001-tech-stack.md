# ADR-0001: 技術スタックをTypeScript/Phaser 3/React/Electronとする

- 状態: 承認
- 日付: 2026-06-11
- 決定者: 人間(仕様書v0.2にて確定)

## 文脈
実装はAIエージェントに全面委任。配布はPC+Web+モバイル(コンソールは対象外と決定済み)。

## 決定
TypeScript monorepo。ゲーム=Phaser 3、エディタ=React 18+Zustand、デスクトップ=Electron、モバイル=Capacitor(フェーズ3)。

## 検討した代替案
- Unity: エディタGUI中心の開発フローがエージェントの自己検証と相性が悪く却下
- Godot: コンソール断念により利点が消失し却下
- PixiJS素 + Tauri: 視覚バグの検証コストとWebViewの描画非一貫性を理由にv0.1から変更

## 影響
コンソール展開は本スタックでは不可能(再決定にはADRの廃止と全面見直しが必要)。
