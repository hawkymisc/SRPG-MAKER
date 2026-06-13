import Phaser from "phaser";
import { loadChapter, loadChapterFromEditorStorage } from "../data/loadChapter.js";
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

    const editorPayload = loadChapterFromEditorStorage();
    const chapter = editorPayload
      ? { map: editorPayload.map, database: editorPayload.database }
      : await loadChapter(import.meta.env.BASE_URL);
    const seed = editorPayload?.seed ?? DEFAULT_BATTLE_SEED;
    const session = BattleSession.fromChapter(chapter, seed);

    this.registry.set(REGISTRY_KEYS.chapter, chapter);
    this.registry.set(REGISTRY_KEYS.session, session);
    this.registry.set(REGISTRY_KEYS.seed, seed);
    this.registry.set(REGISTRY_KEYS.autoPlayAll, false);
    if (editorPayload?.debug?.invincible) {
      this.registry.set(REGISTRY_KEYS.debugInvincible, true);
    }

    this.scene.start("Title");
  }
}
