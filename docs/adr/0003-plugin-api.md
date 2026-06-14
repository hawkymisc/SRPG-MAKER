# ADR 0003: プラグインAPI (M5-T5)

## ステータス
Accepted

## コンテキスト
フェーズ2ではイベントコマンド15種を凍結し、拡張はプラグインAPIへ委ねる方針である。
戦闘計算式のカスタマイズが最初のユースケース。

## 決定
1. **フック型API** — `CombatHooks` を `shared` に定義し、戦闘解決 (`resolveStrike`) の各段階で適用する。
2. **宣言的ルール** — `PluginManifest.rules` (JSON) で `add` / `multiply` と条件 (`when`) を記述。`@srpg/plugin-api` が `CombatHooks` にコンパイルする。
3. **型付きプラグイン** — TS から `RegisteredPlugin.hooks` を渡せる（将来の npm プラグイン向け）。
4. **サンドボックス** — MVP では `eval` / `Function` / 任意 JS 文字列実行は禁止。フックは決定論的な純関数のみ。
5. **プロジェクト保存** — `ProjectSchema` に `plugins` / `enabledPlugins` を optional 追加（`schemaVersion` 据え置き）。

## 結果
- ゴールデンマスターはプラグイン無効時に影響なし。
- プラグイン有効時も同一入力+シードで再現可能（フックは RNG 非依存）。
- 実行環境の完全サンドボックスは M5-T6 以降で Electron 書き出しと合わせて再検討。
