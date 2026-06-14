# M4 MVP受け入れ照合（spec.md 2.1）

計測日: 2026-06-13  
対象マイルストーン: M4（イベント + HTML5書き出し → MVPβ）

## 照合結果サマリー

| MVP項目（spec 2.1） | 状態 | 備考 |
|---------------------|------|------|
| マップエディタ（タイル・地形） | ✅ 達成 | ペン/Undo、ボトムレイヤー。矩形/塗りつぶし/top層は未実装 |
| DBエディタ（ユニット/クラス/武器/アイテム/スキル） | ✅ 達成 | schema-form 6タブ。地形タブ含む |
| 戦闘基本ループ（移動・攻撃・待機） | ✅ 達成 | shared + runtime、ゴールデン10本 |
| 勝利/敗北条件（4種） | ⚠️ 部分 | ロジック4種実装済。エディタUIは defeat_all_enemies のみ |
| イベントシステム | ✅ 達成 | 15コマンド+7トリガー、chapterStart等。会話演出はMVP最小 |
| 簡易敵AI（4種） | ✅ 達成 | charge/ambush/guard/move_only |
| テストプレイ | ✅ 達成 | iframe/別ウィンドウ、postMessage連携 |
| HTML5書き出し | ✅ 達成 | zip（game/ 配下にruntime+データ）、export E2E PASS |

## 未達・制限事項（人間判断推奨）

1. **マップエディタ拡張**: 矩形/塗りつぶし、top/objectレイヤー、増援ターンUI
2. **勝利条件UI**: エディタから boss撃破/ターン数/拠点防衛の設定UI未整備（スキーマ・ロジックは存在）
3. **イベント演出**: CAMERA/BGM/SE/SCREEN_EFFECT はスタブ〜最小実装。本格演出はフェーズ2
4. **無敵デバッグ**: フラグはregistry格納のみ、戦闘ロジック未反映
5. **プロジェクト保存形式**: 単一JSON + HTML5分割書き出し。フォルダ編集ワークフローはフェーズ2寄り
6. **書き出し前準備**: runtime を事前ビルドし preview/dist を取得する必要あり（CIでは fixture スクリプトで自動化）

## 検証コマンド（Definition of Done）

```bash
pnpm typecheck   # 各パッケージ
pnpm lint
pnpm test        # shared 131 + runtime 14 + editor 19
pnpm test:golden # 10 scenarios
pnpm test:e2e    # 6 scenarios（runtimeスクショ4 + editor1 + export1）
```

## 結論

**MVPβとしての主要ゴール（イベント付き章の作成・HTML5配布・E2E）は達成。**  
上記「未達・制限」はフェーズ2またはポリッシュとして優先度付けを推奨。
