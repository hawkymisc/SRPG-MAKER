# ADR 0008: イベント BGM/SE 再生 (M7-T4)

## コンテキスト

spec 3.3 は音声に Howler.js を採用。MVP イベントコマンド `PLAY_BGM` / `PLAY_SE` は shared インタプリタで yield 済みだが、runtime の `EventController` はスタブだった。

## 決定

1. **依存** — `packages/runtime` に `howler` + `@types/howler` を追加（shared には置かない）。
2. **パス規約** — `{baseUrl}/assets/audio/bgm/{bgmId}.ogg|mp3` および `se/` 同様（spec 7 章 `assets/audio`）。
3. **GameAudio** — BGM はループ + クロスフェード、SE はワンショット。読込失敗は無視。
4. **ヘッドレス** — `autoPlayAll` 時は `muted: true` で再生スキップ（playthrough 決定論維持）。
5. **fadeInMs** — `PLAY_BGM` の fadeInMs 待ち後に次コマンドへ。

## 結果

- クリエイターは書き出し/テンプレートの `assets/audio/` にファイルを置くだけでイベントから再生可能。
- 戦闘ロジック・RNG には影響しない。
