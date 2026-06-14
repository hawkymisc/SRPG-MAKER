import Phaser from "phaser";
import {
  createBattlePlacementsFromCampaign,
  listPromotableMembers,
  maxDeployCount,
  promoteMember,
  purchaseFromShop,
  resolveSpeakerLabel,
  toggleDeployedRef,
  validateFormation,
  type Chapter,
  type EventDefinition,
  type UnitId,
} from "@srpg/shared";
import { GAME_HEIGHT, GAME_WIDTH } from "../constants.js";
import { loadChapter, type ChapterData } from "../data/loadChapter.js";
import { BattleSession } from "../game/BattleSession.js";
import { CampaignSession } from "../game/CampaignSession.js";
import { REGISTRY_KEYS } from "../game/registry.js";
import { CampaignSaveManager } from "../save/CampaignSaveManager.js";
import { MessageWindow } from "../ui/MessageWindow.js";

type BaseMode = "menu" | "formation" | "shop" | "talk" | "promotion";

export class BaseScene extends Phaser.Scene {
  private campaignSession!: CampaignSession;
  private chapters!: Record<string, Chapter>;
  private eventsById!: Record<string, EventDefinition>;
  private database!: ChapterData["database"];
  private mode: BaseMode = "menu";
  private statusText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private messageWindow!: MessageWindow;
  private seed = 42_001;
  private promotableIndices: number[] = [];

  constructor() {
    super({ key: "Base" });
  }

  create(): void {
    this.campaignSession = this.registry.get(REGISTRY_KEYS.campaignSession) as CampaignSession;
    this.chapters = (this.registry.get(REGISTRY_KEYS.chapters) as Record<string, Chapter>) ?? {};
    this.eventsById =
      (this.registry.get(REGISTRY_KEYS.events) as Record<string, EventDefinition>) ?? {};
    this.database =
      (this.registry.get(REGISTRY_KEYS.chapter) as ChapterData | undefined)?.database ??
      this.registry.get("bootDatabase") as ChapterData["database"];
    this.seed = (this.registry.get(REGISTRY_KEYS.seed) as number) ?? 42_001;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a237e);
    this.add
      .text(GAME_WIDTH / 2, 40, "拠点", {
        fontFamily: "monospace",
        fontSize: "24px",
        color: "#ffd54f",
      })
      .setOrigin(0.5);

    this.statusText = this.add.text(24, 72, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffffff",
      wordWrap: { width: GAME_WIDTH - 48 },
    });

    this.bodyText = this.add.text(24, 120, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#e0e0e0",
      wordWrap: { width: GAME_WIDTH - 48 },
    });

    const shell = document.getElementById("game-shell");
    if (shell) {
      this.messageWindow = new MessageWindow(shell);
    } else {
      throw new Error("#game-shell not found");
    }

    this.renderMenu();
    this.bindInput();
  }

  private currentChapter(): Chapter | undefined {
    return this.chapters[this.campaignSession.state.currentChapterId];
  }

  private renderMenu(): void {
    this.mode = "menu";
    const chapter = this.currentChapter();
    const c = this.campaignSession.state;
    this.statusText.setText(
      `章: ${chapter?.name ?? c.currentChapterId} | 所持金: ${c.gold}G | 出撃: ${c.deployedRefs.length}体`,
    );
    this.bodyText.setText(
      [
        "1: 編成（出撃ユニット切替）",
        "2: ショップ",
        "3: 会話",
        "4: 出撃（戦闘開始）",
        "5: クラスチェンジ",
        "",
        "Esc: メニューに戻る",
      ].join("\n"),
    );
  }

  private renderFormation(): void {
    this.mode = "formation";
    const c = this.campaignSession.state;
    const chapter = this.currentChapter();
    const limit = chapter?.maxDeploy ?? c.roster.length;
    const lines = c.roster.map((member, index) => {
      const deployed = c.deployedRefs.includes(member.ref) ? "[x]" : "[ ]";
      return `${index + 1}: ${deployed} ${member.ref} Lv.${member.level} HP ${member.hp}/${member.maxHp}`;
    });
    this.statusText.setText(`編成（上限 ${limit} 体）— 数字キーで切替`);
    this.bodyText.setText(lines.join("\n") || "ロスターが空です");
  }

  private renderShop(): void {
    this.mode = "shop";
    const chapter = this.currentChapter();
    const entries = chapter?.shop ?? [];
    const lines = entries.map(
      (entry, index) => `${index + 1}: ${entry.itemId} — ${entry.price}G`,
    );
    this.statusText.setText(`ショップ — 所持金 ${this.campaignSession.state.gold}G`);
    this.bodyText.setText(
      lines.length > 0
        ? [...lines, "", "数字キーで購入"].join("\n")
        : "この章にショップはありません",
    );
  }

  private async renderTalk(): Promise<void> {
    this.mode = "talk";
    const chapter = this.currentChapter();
    const ids = chapter?.baseEventIds ?? [];
    this.statusText.setText("会話");
    if (ids.length === 0) {
      this.bodyText.setText("拠点会話はありません");
      return;
    }
    for (const eventId of ids) {
      const def = this.eventsById[eventId];
      if (!def) continue;
      for (const cmd of def.commands) {
        if (cmd.cmd === "SHOW_MESSAGE") {
          await this.messageWindow.show(cmd.text, {
            ...(cmd.speakerId !== undefined ? { speakerId: cmd.speakerId } : {}),
            speakerName: resolveSpeakerLabel(cmd.speakerId, this.database.units),
            ...(cmd.faceId !== undefined ? { faceId: cmd.faceId } : {}),
          });
        }
      }
    }
    this.messageWindow.close();
    this.renderMenu();
  }

  private renderPromotion(): void {
    this.mode = "promotion";
    const entries = listPromotableMembers(this.campaignSession.state, this.database);
    this.promotableIndices = entries.map((entry) => entry.index);
    const lines = entries.map((entry, listIndex) => {
      const unit = this.database.units[entry.member.ref];
      const fromClass = unit ? (entry.member.classId ?? unit.classId) : "?";
      const toClass = this.database.classes[entry.targetClassId]?.name ?? entry.targetClassId;
      return `${listIndex + 1}: ${entry.member.ref} (${fromClass} → ${toClass}) Lv.${entry.member.level}`;
    });
    this.statusText.setText("クラスチェンジ — 数字キーで転職");
    this.bodyText.setText(
      lines.length > 0
        ? [...lines, "", "転職には Lv.10 以上が必要"].join("\n")
        : "転職可能なユニットがいません",
    );
  }

  private promoteAtListIndex(listIndex: number): void {
    const rosterIndex = this.promotableIndices[listIndex];
    if (rosterIndex === undefined) return;
    const member = this.campaignSession.state.roster[rosterIndex];
    const unit = member ? this.database.units[member.ref] : undefined;
    if (!member || !unit) return;
    const result = promoteMember(member, unit, this.database.classes);
    if (result.error) {
      this.bodyText.setText(result.error);
      return;
    }
    const nextRoster = [...this.campaignSession.state.roster];
    nextRoster[rosterIndex] = result.member;
    this.campaignSession.state = { ...this.campaignSession.state, roster: nextRoster };
    CampaignSaveManager.save(this.campaignSession);
    this.renderPromotion();
  }

  private toggleFormationIndex(index: number): void {
    const member = this.campaignSession.state.roster[index];
    if (!member) return;
    const chapter = this.currentChapter();
    const limit = chapter?.maxDeploy ?? this.campaignSession.state.deployedRefs.length + 1;
    const deployed = !this.campaignSession.state.deployedRefs.includes(member.ref);
    this.campaignSession.state = toggleDeployedRef(
      this.campaignSession.state,
      member.ref as UnitId,
      deployed,
      limit,
    );
    CampaignSaveManager.save(this.campaignSession);
    this.renderFormation();
  }

  private buyShopIndex(index: number): void {
    const chapter = this.currentChapter();
    const entry = chapter?.shop[index];
    if (!entry) return;
    const result = purchaseFromShop(this.campaignSession.state, entry, this.database);
    if (result.error) {
      this.bodyText.setText(result.error);
      return;
    }
    this.campaignSession.state = result.campaign;
    CampaignSaveManager.save(this.campaignSession);
    this.renderShop();
  }

  private async startBattle(): Promise<void> {
    const chapterDef = this.currentChapter();
    const editorChapter = this.registry.get(REGISTRY_KEYS.chapter) as ChapterData | undefined;
    const chapter: ChapterData =
      editorChapter ??
      (await loadChapter(import.meta.env.BASE_URL, this.campaignSession.state.currentChapterId));

    const max = maxDeployCount(chapterDef, chapter.map);
    const error = validateFormation(this.campaignSession.state, max);
    if (error) {
      this.bodyText.setText(error);
      return;
    }

    const placements = createBattlePlacementsFromCampaign(
      this.campaignSession.state,
      chapter.map,
      chapter.database,
      chapterDef,
    );
    const combatHooks = this.registry.get(REGISTRY_KEYS.combatHooks) as
      | import("@srpg/shared").CombatHooks
      | undefined;
    const session = BattleSession.fromChapter(chapter, this.seed, placements, combatHooks);
    session.state = {
      ...session.state,
      variables: Object.assign({}, session.state.variables, this.campaignSession.state.variables),
      switches: Object.assign({}, session.state.switches, this.campaignSession.state.switches),
    };

    this.registry.set(REGISTRY_KEYS.chapter, chapter);
    this.registry.set(REGISTRY_KEYS.chapterId, chapter.chapterId);
    this.registry.set(REGISTRY_KEYS.session, session);
    CampaignSaveManager.save(this.campaignSession);
    this.scene.start("BattleMap");
  }

  private bindInput(): void {
    const kb = this.input.keyboard;
    if (!kb) return;

    kb.on("keydown-ONE", () => this.onDigit(0));
    kb.on("keydown-TWO", () => this.onDigit(1));
    kb.on("keydown-THREE", () => this.onDigit(2));
    kb.on("keydown-FOUR", () => this.onDigit(3));
    kb.on("keydown-FIVE", () => this.onDigit(4));
    kb.on("keydown-NUMPAD_ONE", () => this.onDigit(0));
    kb.on("keydown-NUMPAD_TWO", () => this.onDigit(1));
    kb.on("keydown-NUMPAD_THREE", () => this.onDigit(2));
    kb.on("keydown-NUMPAD_FOUR", () => this.onDigit(3));
    kb.on("keydown-NUMPAD_FIVE", () => this.onDigit(4));

    kb.on("keydown-ESC", () => {
      if (this.mode !== "menu") {
        this.renderMenu();
      }
    });

    kb.on("keydown-ENTER", () => {
      if (this.mode === "menu") {
        void this.startBattle();
      }
    });
  }

  private onDigit(index: number): void {
    if (this.mode === "menu") {
      switch (index) {
        case 0:
          this.renderFormation();
          break;
        case 1:
          this.renderShop();
          break;
        case 2:
          void this.renderTalk();
          break;
        case 3:
          void this.startBattle();
          break;
        case 4:
          this.renderPromotion();
          break;
      }
      return;
    }
    if (this.mode === "formation") {
      this.toggleFormationIndex(index);
      return;
    }
    if (this.mode === "shop") {
      this.buyShopIndex(index);
      return;
    }
    if (this.mode === "promotion") {
      this.promoteAtListIndex(index);
    }
  }
}
