# Audio assets (spec.md section 7)

Place files here using event command IDs as filenames:

- `bgm/{bgmId}.ogg` or `.mp3` — e.g. `bgm/bgm_battle.ogg` for `PLAY_BGM` with `bgmId: "bgm_battle"`
- `se/{seId}.ogg` or `.mp3` — e.g. `se/se_select.ogg` for `PLAY_SE` with `seId: "se_select"`

Missing files are ignored at runtime (no crash).
