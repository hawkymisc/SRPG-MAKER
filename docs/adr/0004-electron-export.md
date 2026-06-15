# ADR 0004: Electron デスクトップ書き出し (M5-T6)

## ステータス
Accepted

## コンテキスト
フェーズ2では HTML5 書き出しに加え、Win/mac/Linux 向けデスクトップ配布が必要。
エディタはブラウザで動作するため、ビルド時に Electron バイナリを同梱できない。

## 決定
1. **書き出し形式** — HTML5 の `game/` バンドル + ルートに Electron シェル (`main.mjs`, `preload.mjs`, `package.json`, `README.txt`) を zip 化。
2. **配布物生成** — ユーザー環境で `npm install && npm run dist`（electron-builder）を実行する方式。CI/エディタ内でのクロスコンパイルは MVP 外。
3. **セキュリティ** — `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`。preload は将来 API 用の空スクリプト。
4. **テンプレート配置** — `packages/editor/src/lib/export/electronShell.ts` に文字列テンプレート（ブラウザから fs 不要）。

## 結果
- エディタの「Electron書き出し」ボタン1つで zip 取得可能。
- HTML5 書き出しとのゲームデータ互換性を維持。
- 完全な Electron エディタラッパー（M3 の File System Access 抽象化）は別タスク。
