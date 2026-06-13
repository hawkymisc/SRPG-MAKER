# M1委任プロンプト:スキーマと戦闘ロジック(プロジェクトの心臓部)

前提:M0完了。`docs/spec.md` の5.2(戦闘計算)・7章(データ仕様)を正とする。

---

マイルストーンM1を実施してください。ゴールは「描画なしで、データ定義から戦闘解決までが純粋関数として完成し、ゴールデンマスターで保護されている状態」です。

## タスク(依存順。各タスク完了時にcode-reviewerでレビュー)

1. **コアスキーマ**(schema-architectに委任)
   units / classes / weapons / items / skills / terrain / map のZodスキーマを spec 7章に従い定義。ブランド型ID、デフォルト値ファクトリ、schemaVersion=1 を含む。サンプルデータ(ユニット4体・クラス3種・武器6種・10×10マップ1枚)を `templates/sample/` に作成し、parseが通ることをテストする。

2. **戦闘状態と解決関数**(battle-logic-devに委任)
   `BattleState`(ユニット配置・ターン・フェイズ・変数/スイッチ)と、アクション型(Move/Attack/UseItem/Wait/EndPhase)を定義し、`resolveAction(state, action, rng, config): { state, log }` を実装。spec 5.2.2の計算式(攻撃力・ダメージ・命中・必殺・追撃・三すくみ・地形補正)を係数設定可能な形で実装。境界値テストを最低30ケース。

3. **移動範囲・攻撃範囲**(battle-logic-devに委任)
   ダイクストラ法による移動範囲(クラス別地形コスト・ZOC無しのMVP仕様)と、武器射程min-maxによる攻撃範囲を実装。10×10〜100×100での計算時間をテストで計測し、100×100で50ms以内を確認。

4. **敵AI 4種**(battle-logic-devに委任)
   突撃/待ち伏せ/防衛/移動のみ。`decideAction(state, unitId, rng): Action` の形式。評価関数は spec 5.2.3。同一盤面で決定が安定していること(同シードで同手)をテストする。

5. **勝敗判定と経験値**(battle-logic-devに委任)
   勝利条件4種(敵全滅/ボス撃破/ターン数/拠点防衛)と敗北条件、撃破経験値とレベルアップ(成長率判定はRNG経由)を実装。

6. **ゴールデンマスター基盤+必須10本**(test-engineerに委任)
   `docs/golden-format.md` の形式仕様に厳密に従い、ハーネス(シナリオ読込→resolveAction適用→スナップショット照合、`--update` フラグ対応)と、同ドキュメント末尾に列挙された必須10本のシナリオを作成する。ルートの `test:golden` スクリプトを実体に差し替える。

## 完了条件
- 全テスト+ゴールデンマスター10本グリーン
- shared のテストカバレッジ(行)85%以上
- code-reviewer全タスクAPPROVE
