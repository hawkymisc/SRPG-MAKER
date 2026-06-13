# M0委任プロンプト:基盤の検証と仕上げ

このリポジトリには動作する状態を意図したシードコードが同梱済みである:
monorepoルート設定 / ガードレールESLint(eslint.config.js)/ `packages/shared` のRNG実装とテスト / CIワークフロー / フック。
M0のゴールは「シードコードが実際に動くことを検証し、足りない骨組みを足すこと」。ゼロから作り直してはならない。

## タスク(各タスク完了時にcode-reviewerでレビュー)

1. **シードコードの検証**(test-engineerに委任)
   `pnpm install` 後、`pnpm typecheck && pnpm lint && pnpm test` を実行し全グリーンを確認。
   依存バージョンの不整合等があれば最小の修正で通す(RNGのロジック・テストの仕様変更は禁止)。
   さらにガードレールの実証として、`Math.random` を使う一時ファイルと、sharedでreactをimportする一時ファイルを作り、lintとPostToolUseフックの両方が検出することを確認してから削除する。

2. **runtime / editor パッケージの骨組み**(test-engineerに委任)
   `packages/runtime`(phaser依存)と `packages/editor`(react依存)を、sharedと同じ流儀
   (package.json / tsconfig / 空エントリ / ダミーテスト1本)で追加し、ルートの typecheck / test が3パッケージを横断して通ることを確認する。

3. **CIの実走確認**(test-engineerに委任)
   `.github/workflows/ci.yml` をワークフロー構文チェック(act または yaml lint)し、
   `pnpm test:golden` / `pnpm test:e2e` のプレースホルダがCI上で成功扱いになることを確認する。

## 完了条件
- `pnpm typecheck && pnpm lint && pnpm test` 全グリーン(3パッケージ)
- ガードレール(lint+フック)の検出が実証済み
- code-reviewer全タスクAPPROVE、BOARDのM0チケットが全てDONE
