# はじめに

## 必要な環境

| 項目 | 要件 |
|------|------|
| OS | Windows 10+ / macOS 12+ / Ubuntu LTS など |
| ブラウザ | Chrome または Edge（最新） |
| 開発用（ソースから起動する場合） | Node.js **22+**、[pnpm](https://pnpm.io/) 9+ |

配布済みのデスクトップ版がある場合は Node は不要です。本リポジトリから使う場合は以下の手順です。

## インストールと起動

```bash
git clone <リポジトリURL>
cd SRPG-MAKER
pnpm install
```

### ブラウザ版エディタ（手軽）

```bash
pnpm dev:editor
```

ブラウザで `http://localhost:5173` を開きます。

### デスクトップ版エディタ（フォルダ保存に便利）

ターミナル 1:

```bash
pnpm dev:editor
```

ターミナル 2:

```bash
pnpm dev:editor:electron
```

デスクトップ版では **フォルダ形式** でプロジェクトを開閉できます（spec 7 章）。詳細は [packages/editor-electron/README.md](../../packages/editor-electron/README.md)。

## 最初の5分

1. エディタが開いたら **プロジェクト** タブ（**Ctrl+1**）を確認
2. **新規（サンプル）** で「サンプルプロジェクト」を読み込む
3. **Ctrl+3** でマップタブ → 地形ペンやユニット配置を試す
4. **Ctrl+4** でテストプレイ → **テストプレイ開始** → タイトルから戦闘へ進む
5. 満足したら **保存** または **HTML5書き出し**（[書き出しと配布](export-and-publish.md)）

## サンプルプロジェクトについて

同梱の `templates/sample/` がベースです。章（キャンペーン）・拠点・支援会話・プラグインのサンプルが入っています。上書きする前に別名で保存することを推奨します。

## 次のステップ

- [制作の流れ](workflow.md)
- [エディタリファレンス](editor-reference.md)
