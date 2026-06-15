# SRPGツクール — Electron エディタ

デスクトップ版エディタ。ネイティブ FS で spec 7 章のフォルダ形式プロジェクトを開閉できます。

## 開発

1. 別ターミナルでエディタ Vite を起動:

```bash
pnpm dev:editor
```

2. Electron を起動:

```bash
pnpm dev:editor:electron
```

`SRPG_EDITOR_URL` はルート `package.json` の script から `http://localhost:5173` が渡されます。

## 本番ビルド

```bash
pnpm --filter @srpg/editor build
pnpm --filter @srpg/editor-electron start
```

`packages/editor/dist/index.html` を読み込みます。
