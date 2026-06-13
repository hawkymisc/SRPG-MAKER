import Phaser from "phaser";
import { loadChapter } from "../data/loadChapter.js";
import { BattleSession } from "../game/BattleSession.js";
import { REGISTRY_KEYS } from "../game/registry.js";
import { DEFAULT_BATTLE_SEED } from "../constants.js";
import { generateTerrainTextures, generateUnitTextures } from "../render/MapGrid.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "Boot" });
  }

  preload(): void {
    this.load.setBaseURL(import.meta.env.BASE_URL);
  }

  async create(): Promise<void> {
    generateTerrainTextures(this);
    generateUnitTextures(this);

    const chapter = await loadChapter(import.meta.env.BASE_URL);
    const session = BattleSession.fromChapter(chapter, DEFAULT_BATTLE_SEED);

    this.registry.set(REGISTRY_KEYS.chapter, chapter);
    this.registry.set(REGISTRY_KEYS.session, session);
    this.registry.set(REGISTRY_KEYS.seed, DEFAULT_BATTLE_SEED);
    this.registry.set(REGISTRY_KEYS.autoPlayAll, false);

    this.scene.start("Title");
  }
}
