# SRPGツクール エージェント開発キット v1.2

仕様書v0.2(同梱: `docs/spec.md`)に基づき、Claude Codeのサブエージェント体制で本プロジェクトを実装する一式。
v1.1で規約をフックによる機械的強制に格上げし、v1.2で**動作検証済みのシードコードを同梱**した。
これによりM0は「ゼロから構築」ではなく「検証と仕上げ」になり、最も判断ブレの出やすい初期工程を排除している。

## 構成

```
├── AGENTS.md                    # 共通プロジェクトメモリ(規約・強制機構・エスカレーション)
├── docs/
│   ├── spec.md                  # 仕様書v0.2(正・エージェント書換禁止)
│   ├── event-commands.md        # イベントコマンド15種の確定仕様(凍結)
│   ├── golden-format.md         # ゴールデンマスター形式仕様+必須10本のリスト
│   ├── runbook.md               # 障害対応(CI赤/GM差分/flaky/エージェントのループ)
│   ├── tasks/BOARD.md           # タスクボード(進捗の単一情報源・セッション跨ぎの再開点)
│   ├── reports/E2E-coverage.md  # Playwright E2E カバレッジ・実行・スクショ更新手順
│   └── adr/                     # 設計判断記録(0001 技術スタック / 0002 決定論 を同梱)
├── .claude/
│   ├── settings.json            # フック登録・権限deny
│   ├── hooks/                   # 保護パスガード / Bashファイアウォール / 編集後即時検査
│   └── agents/                  # サブエージェント7体
│       ├── schema-architect.md  # スキーマ・マイグレーション      [opus]
│       ├── battle-logic-dev.md  # 戦闘ロジックTDD               [inherit]
│       ├── runtime-dev.md       # Phaserランタイム              [inherit]
│       ├── editor-dev.md        # Reactエディタ                 [inherit]
│       ├── test-engineer.md     # 検証基盤(GM/E2E/lint/CI)     [inherit]
│       ├── qa-playtester.md     # 自動プレイ計測・バランス分析   [inherit]
│       └── code-reviewer.md     # 読取専用レビュー(門番)        [opus]
├── packages/shared/             # シードコード: 検証済みRNG(rng.ts)+テスト14観点
├── package.json ほかルート設定   # シードコード: monorepo / tsconfig / ガードレールESLint
├── prompts/
│   ├── 00_orchestrator.md       # 毎セッション最初に貼る運転手順(開始/委任/終了の儀式)
│   └── M0〜M4                   # マイルストーン委任プロンプト
└── .github/workflows/ci.yml     # typecheck/lint/test/golden/e2e + マーカー混入検査
```

## セットアップ

1. 新規Gitリポジトリのルートにこのキットを展開し、初回コミットする
2. リポジトリでClaude Codeを起動する(agents・settings.json・CLAUDE.mdは自動で読み込まれる)
3. `jq` が実行環境にあることを確認する(フックが使用)

## 運用フロー

スラッシュコマンドで儀式を定型化してある: `/kickoff`(開始・現在地復帰)、`/delegate <チケットID>`(委任ループ)、`/wrap`(終了・申し送り)。

1. セッション冒頭で `/kickoff`(または `prompts/00_orchestrator.md` を貼る)
2. 続けて該当マイルストーンのプロンプト(M0から順)を貼る
3. 以降はオーケストレーターが BOARD更新 → 委任 → code-reviewerレビュー → コミット を回す
4. 3往復で解決しない差し戻し・仕様矛盾・ゴールデン更新は人間にエスカレーションされる

## 人間が必ず行うこと

- **ゴールデンマスター更新の承認**: 内容を確認後 `touch .allow-golden-update` → 作業完了後に削除(CIが混入を検査)
- 仕様矛盾の裁定、schemaVersion繰り上げ・新規依存の承認
- マイルストーン完了時の受け入れ(M2以降は必ず実際に遊ぶ。qa-playtesterは数値しか見られず、手触りと面白さは人間にしか判定できない)

## トークンコストの目安

サブエージェントは各自独立のコンテキストを持つため消費は増える。M0〜M1(ロジック中心)は費用対効果が最も高く、M3(エディタUI)はレビュー往復が増えやすい。qa-playtesterの大量シミュレーションはスクリプト実行なのでLLMコストはほぼかからない。
