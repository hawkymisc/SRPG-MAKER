# ADR 0007: Capacitor モバイル書き出し (M7-T5)

## コンテキスト

spec 2.3 は iOS/Android 向けモバイル書き出しを Capacitor で行うと定めている。M5-T6 で Electron デスクトップ zip 書き出しは達成済み。ランタイムは Phaser 3 の Web ビルドであり、ネイティブラップが妥当。

## 決定

1. **エディタ zip 生成** — `exportCapacitor()` が HTML5 ランタイム + プロジェクトデータを `www/` に配置し、Capacitor 設定・package.json・README を同梱する（M5-T6 Electron と同型）。
2. **webDir** — Capacitor 慣習に従い `www/`。Electron 書き出しの `game/` とは別プレフィックス。
3. **依存関係** — モノレポには Capacitor を追加しない。書き出し zip 内の `package.json` のみが `@capacitor/*` を参照する。
4. **プラットフォーム** — `android/` / `ios/` は zip に含めず、ユーザーが `npx cap add` で生成（Electron の node_modules 同様）。
5. **UI** — プロジェクトタブに「モバイル書き出し」ボタン。

## 結果

- クリエイターは zip 展開 → npm install → cap add/sync でストアビルド可能。
- エディタ・shared・runtime の実行時依存は増えない。
