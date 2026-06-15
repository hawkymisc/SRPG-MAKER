# M5 フェーズ2受け入れ照合（spec.md 2.2）

計測日: 2026-06-15  
対象マイルストーン: M5（拠点・成長・プラグイン・Electron）

## 照合結果サマリー

| フェーズ2項目（spec 2.2） | 状態 | 備考 |
|---------------------------|------|------|
| 章(シナリオ)管理 | ✅ 達成 | ChapterSchema + プロジェクトタブ |
| 拠点画面（編成・ショップ・会話・出撃） | ✅ 達成 | BaseScene + CampaignState |
| 成長率 | ✅ 達成 | 戦闘後ロスター永続化、次戦へ level/stats 反映 |
| クラスチェンジ | ✅ 達成 | Lv.10+ / promotionClassId、拠点メニュー |
| 支援会話 | ⚠️ 部分 | 拠点 baseEventIds 会話のみ。ユニット間支援会話システムは未実装 |
| ビジュアルイベントエディタ | ✅ 達成 | 会話プレビューパネル + 顔付き MessageWindow |
| プラグインAPI | ✅ 達成 | @srpg/plugin-api + CombatHooks + 宣言的 rules |
| デスクトップ書き出し(Electron) | ✅ 達成 | game/ + shell zip、npm run dist 手順 |

## 検証コマンド（Definition of Done）

```bash
pnpm typecheck   # shared + editor + runtime + plugin-api
pnpm lint
pnpm test        # shared 151 + editor 30 + runtime 18 + plugin-api 3
pnpm test:golden # 10 scenarios
pnpm test:e2e    # editor / runtime / export 各 project
```

## 未達・制限事項（人間判断推奨）

1. **支援会話**: 専用トリガー/条件/UI なし（拠点イベントで代替）
2. **プラグイン編集UI**: rule 編集 UI は未実装。有効/無効切替は M6-T2 で追加
3. **Electron 配布**: エディタは zip 出力のみ。インストーラ生成はユーザー環境で electron-builder 実行
4. **Electron エディタ版**: デスクトップゲーム書き出しは達成。エディタ本体の Electron ラッパーは未着手
5. **イベント演出**: BGM/SE/CAMERA/SCREEN_EFFECT は引き続き最小〜スタブ

## 結論

**フェーズ2の主要ゴール（章間キャンペーン・成長・プラグイン拡張・デスクトップ書き出し）は達成。**  
支援会話の本格化と Electron エディタラッパーはフェーズ3または M6 以降で優先度付けを推奨。
