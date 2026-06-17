---
name: E2E フレーク報告
about: Playwright E2E が CI で繰り返し失敗するときの調査用テンプレート
title: "[E2E flake] "
labels: e2e, flaky
---

## 失敗したシナリオ

<!-- 例: export-variants › survive_turns win condition reaches victory -->

- プロジェクト（chromium / editor / export）:
- spec ファイル:
- テスト名:

## 再現状況

- [ ] ローカル `pnpm test:e2e` で再現する
- [ ] プロジェクト限定（`pnpm test:e2e:runtime` 等）でのみ再現する
- [ ] CI のみ（リトライ後も失敗）

連続失敗回数（CI）: <!-- 3 回以上で起票推奨 -->

## ログ・証跡

- 失敗した workflow run URL:
- Playwright artifact（`playwright-report/`, `test-results/`）は添付済みか:
- エラーメッセージ（抜粋）:

```
```

## 直近の関連変更

<!-- マージ・コミット・依存更新など -->

## 仮説（任意）

<!-- タイムアウト / ポート競合 / スクショ差分 / 初回ビルド遅延 など -->

## 参照

- [E2E カバレッジ・運用](../docs/reports/E2E-coverage.md)
- [障害対応ランブック](../docs/runbook.md)
