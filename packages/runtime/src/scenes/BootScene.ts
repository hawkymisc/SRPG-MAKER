import Phaser from "phaser";
import {
  defaultStartChapterId,
  chapterLoadStem,
} from "@srpg/shared";
import { createPluginRegistryFromProject } from "@srpg/plugin-api";
import {
  loadChapter,
  loadChapterFromEditorStorage,
  loadChaptersRecord,
  loadEventsRecord,
  loadSupportsRecord,
} from "../data/loadChapter.js";
import { loadProjectPluginMeta } from "../plugins/loadPlugins.js";
import { BattleSession } from "../game/BattleSession.js";
import { CampaignSession } from "../game/CampaignSession.js";
import { REGISTRY_KEYS } from "../game/registry.js";
import { DEFAULT_BATTLE_SEED } from "../constants.js";
import { generateTerrainTextures, generateUnitTextures } from "../render/MapGrid.js";
import { bootstrapCampaignFromChapter } from "../game/campaignBridge.js";

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
    const baseUrl = import.meta.env.BASE_URL;
    const chapters =
      editorPayload?.chapters ?? (await loadChaptersRecord(baseUrl));
    const eventsById =
      editorPayload?.eventsById ?? (await loadEventsRecord(baseUrl));
    const supports =
      editorPayload?.supports ?? (await loadSupportsRecord(baseUrl));
    const useCampaign = Object.keys(chapters).length > 0;

    const chapter = editorPayload
      ? {
          map: editorPayload.map,
          database: editorPayload.database,
          events: editorPayload.events ?? [],
          chapterId: editorPayload.chapterId ?? "chapter01",
        }
      : await loadChapter(baseUrl);

    const seed = editorPayload?.seed ?? DEFAULT_BATTLE_SEED;
    this.registry.set(REGISTRY_KEYS.seed, seed);
    this.registry.set(REGISTRY_KEYS.autoPlayAll, false);
    this.registry.set("bootDatabase", chapter.database);

    const pluginMeta = editorPayload?.plugins
      ? {
          plugins: editorPayload.plugins,
          enabledPlugins: editorPayload.enabledPlugins ?? Object.keys(editorPayload.plugins),
        }
      : await loadProjectPluginMeta(baseUrl);
    const pluginRegistry = createPluginRegistryFromProject(pluginMeta);
    this.registry.set(REGISTRY_KEYS.combatHooks, pluginRegistry.combatHooks);

    if (editorPayload?.debug?.invincible) {
      this.registry.set(REGISTRY_KEYS.debugInvincible, true);
    }

    if (useCampaign) {
      const startId =
        editorPayload?.startChapterId ??
        defaultStartChapterId(chapters) ??
        chapter.chapterId;
      const stem = chapterLoadStem(startId, chapters, { [chapter.map.id]: chapter.map });
      const startChapter =
        editorPayload && editorPayload.chapterId === startId
          ? chapter
          : await loadChapter(baseUrl, stem);

      const existingCampaign = editorPayload?.campaign
        ? new CampaignSession(editorPayload.campaign, seed)
        : undefined;
      const campaignSession = bootstrapCampaignFromChapter(
        startChapter,
        chapters,
        startId,
        seed,
        existingCampaign,
      );

      this.registry.set(REGISTRY_KEYS.useCampaign, true);
      this.registry.set(REGISTRY_KEYS.campaignSession, campaignSession);
      this.registry.set(REGISTRY_KEYS.chapters, chapters);
      this.registry.set(REGISTRY_KEYS.events, eventsById);
      this.registry.set(REGISTRY_KEYS.supports, supports);
      this.registry.set(REGISTRY_KEYS.chapter, startChapter);
      this.scene.start("Title");
      return;
    }

    const session = BattleSession.fromChapter(
      chapter,
      seed,
      undefined,
      pluginRegistry.combatHooks,
    );
    this.registry.set(REGISTRY_KEYS.chapter, chapter);
    this.registry.set(REGISTRY_KEYS.chapterId, chapter.chapterId);
    this.registry.set(REGISTRY_KEYS.session, session);
    this.registry.set(REGISTRY_KEYS.useCampaign, false);
    this.scene.start("Title");
  }
}
