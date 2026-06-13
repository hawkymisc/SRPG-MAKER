import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, MAP_PX } from "../constants.js";
import { SaveManager } from "../save/SaveManager.js";
import { REGISTRY_KEYS } from "../game/registry.js";

export class TitleScene extends Phaser.Scene {
  private prompt!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "Title" });
  }

  create(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f0f23);
    this.add
      .text(GAME_WIDTH / 2, MAP_PX / 2 - 24, "SRPG Runtime", {
        fontFamily: "monospace",
        fontSize: "28px",
        color: "#ffd54f",
      })
      .setOrigin(0.5);

    const hasSave = SaveManager.hasSave();
    this.prompt = this.add
      .text(
        GAME_WIDTH / 2,
        MAP_PX / 2 + 24,
        hasSave ? "Enter: 新規 | L: 続きから" : "Enter / Space: 開始",
        {
          fontFamily: "monospace",
          fontSize: "16px",
          color: "#ffffff",
        },
      )
      .setOrigin(0.5);

    this.tweens.add({
      targets: this.prompt,
      alpha: 0.3,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard?.on("keydown-ENTER", () => this.startNew());
    this.input.keyboard?.on("keydown-SPACE", () => this.startNew());
    this.input.keyboard?.on("keydown-L", () => this.startLoad());
  }

  private startNew(): void {
    this.registry.set(REGISTRY_KEYS.autoPlayAll, false);
    this.scene.start("BattleMap");
  }

  private startLoad(): void {
    const loaded = SaveManager.load();
    if (!loaded) {
      this.prompt.setText("セーブデータなし — Enterで開始");
      return;
    }
    this.registry.set(REGISTRY_KEYS.session, loaded);
    this.registry.set(REGISTRY_KEYS.seed, loaded.seed);
    this.registry.set(REGISTRY_KEYS.autoPlayAll, false);
    this.scene.start("BattleMap");
  }
}
