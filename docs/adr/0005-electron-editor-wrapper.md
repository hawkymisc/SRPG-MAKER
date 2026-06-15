# ADR 0005: Electron エディタラッパー (M6-T4)

## コンテキスト

M3 で `ProjectFileSystem` 抽象化とブラウザ File System Access API を導入済み。
M5-T6 はゲーム書き出し用 Electron シェルのみ。エディタ本体のデスクトップ版は未実装だった。

## 決定

1. **パッケージ** — `packages/editor-electron` に main/preload/projectFs を配置。エディタ UI は既存 Vite ビルドを読み込む。
2. **IPC 境界** — preload 経由で `window.srpgElectron` を公開。Renderer は Node API に触れない。
3. **保存形式** — spec 7 章のフォルダ layout (`splitProject` / `mergeSplitProject`)。単一 JSON も Electron から開閉可能（後方互換）。
4. **ファクトリ** — `createProjectFileSystem()` が bridge 検出時に `createElectronFileSystem`、否则 browser FS。
5. **開発** — `pnpm dev:editor` + `SRPG_EDITOR_URL=http://localhost:5173 pnpm dev:editor:electron`。

## 結果

- Git 管理可能なフォルダプロジェクトを OS ネイティブダイアログで開閉できる。
- ブラウザ版コードパスは維持。ゲーム書き出し (M5-T6) とは別シェル。
