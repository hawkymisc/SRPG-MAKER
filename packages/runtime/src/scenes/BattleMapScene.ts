import type { BattleLogEntry, BattleUnit, UnitId } from "@srpg/shared";
import {
  calcMovementRange,
  getAttackableTargets,
  getTerrainAt,
} from "@srpg/shared";
import Phaser from "phaser";
import { DEFAULT_BATTLE_SEED, MAP_PX } from "../constants.js";
import { loadChapter, type ChapterData } from "../data/loadChapter.js";
import { EventController } from "../event/EventController.js";
import { BattleSession } from "../game/BattleSession.js";
import { REGISTRY_KEYS } from "../game/registry.js";
import { MapGrid } from "../render/MapGrid.js";
import {
  shouldDelayAfterKill,
} from "../battle/battleStrikePlayback.js";
import { BATTLE_PLAYBACK_COMPLETE, BATTLE_SCENE_KEY } from "./BattleScene.js";
import { CombatFx } from "../render/CombatFx.js";
import { GameAudio } from "../audio/GameAudio.js";
import { UnitSprites } from "../render/UnitSprites.js";
import { SaveManager } from "../save/SaveManager.js";
import { ActionMenu, type ActionMenuChoice } from "../ui/ActionMenu.js";
import { ChoiceDialog } from "../ui/ChoiceDialog.js";
import { CombatPreviewPanel } from "../ui/CombatPreviewPanel.js";
import { Cursor } from "../ui/Cursor.js";
import { createStatusBar, Hud } from "../ui/Hud.js";
import { MessageWindow } from "../ui/MessageWindow.js";
import { TileHighlight } from "../ui/TileHighlight.js";
import { applyVictoryToCampaign } from "../game/campaignBridge.js";
import type { CampaignSession } from "../game/CampaignSession.js";
import { installRuntimeTestHooks, type RuntimeTestApi } from "../testHooks.js";

type UiMode =
  | "idle"
  | "select_unit"
  | "move"
  | "action_menu"
  | "attack"
  | "animating"
  | "enemy_phase"
  | "ended"
  | "event";

export class BattleMapScene extends Phaser.Scene {
  private session!: BattleSession;
  private chapter!: ChapterData;
  private autoPlayAll = false;

  private cursor!: Cursor;
  private highlight!: TileHighlight;
  private unitSprites!: UnitSprites;
  private combatFx!: CombatFx;
  private hud!: Hud;
  private actionMenu!: ActionMenu;
  private combatPreview!: CombatPreviewPanel;
  private messageWindow!: MessageWindow;
  private choiceDialog!: ChoiceDialog;
  private eventController!: EventController;
  private gameAudio!: GameAudio;

  private mode: UiMode = "idle";
  private selectedUnitId: string | null = null;
  private moveOrigin: { x: number; y: number } | null = null;
  private recentLogs: BattleLogEntry[] = [];
  private inputLocked = false;
  private saveKey!: Phaser.Input.Keyboard.Key;
  private loadKey!: Phaser.Input.Keyboard.Key;
  private ctrlKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: "BattleMap" });
  }

  create(): void {
    void this.bootstrap();
  }

  shutdown(): void {
    this.gameAudio?.destroy();
  }

  private async bootstrap(): Promise<void> {
    this.chapter = this.registry.get(REGISTRY_KEYS.chapter) as ChapterData;
    this.session =
      (this.registry.get(REGISTRY_KEYS.session) as BattleSession | undefined) ??
      BattleSession.fromChapter(this.chapter, DEFAULT_BATTLE_SEED);
    this.autoPlayAll = (this.registry.get(REGISTRY_KEYS.autoPlayAll) as boolean) ?? false;

    this.add.rectangle(MAP_PX / 2, MAP_PX / 2, MAP_PX, MAP_PX, 0x263238);
    new MapGrid(this, this.chapter.map, this.chapter.database);
    this.unitSprites = new UnitSprites(this);
    this.combatFx = new CombatFx(this);
    this.gameAudio = new GameAudio(import.meta.env.BASE_URL, { muted: this.autoPlayAll });
    this.cursor = new Cursor(this);
    this.cursor.setMapSize(this.chapter.map.width, this.chapter.map.height);
    this.highlight = new TileHighlight(this);

    const shell = document.getElementById("game-shell");
    if (!shell) {
      throw new Error("#game-shell not found");
    }
    this.hud = new Hud(shell, MAP_PX);
    createStatusBar(shell);
    this.actionMenu = new ActionMenu(shell, MAP_PX);
    this.combatPreview = new CombatPreviewPanel(shell, MAP_PX);
    this.messageWindow = new MessageWindow(shell);
    this.choiceDialog = new ChoiceDialog(shell, MAP_PX);
    this.eventController = new EventController(this.chapter.events, this.session, {
      messageWindow: this.messageWindow,
      choiceDialog: this.choiceDialog,
      unitSprites: this.unitSprites,
      scene: this,
      gameAudio: this.gameAudio,
      autoAdvanceEvents: this.autoPlayAll,
      units: this.chapter.database.units,
      onStateChanged: () => this.refreshView(),
      onGotoChapter: (chapterId) => this.gotoChapter(chapterId),
    });

    this.refreshView();
    this.bindInput();
    installRuntimeTestHooks(this);

    const kb = this.input.keyboard;
    if (kb) {
      this.saveKey = kb.addKey("S");
      this.loadKey = kb.addKey("L");
      this.ctrlKey = kb.addKey("CTRL");
    }

    await this.fireChapterStartEvents();

    if (this.autoPlayAll) {
      void this.runAutoPlayLoop();
    } else if (this.session.state.phase !== "player") {
      void this.runEnemyPhase();
    } else {
      this.mode = "select_unit";
    }
  }

  private async fireChapterStartEvents(): Promise<void> {
    await this.runEvents({ type: "chapterStart" });
  }

  private async gotoChapter(chapterId: string): Promise<void> {
    const chapter = await loadChapter(import.meta.env.BASE_URL, chapterId);
    this.chapter = chapter;
    this.session = BattleSession.fromChapter(
      chapter,
      this.session.seed,
      undefined,
      this.registry.get(REGISTRY_KEYS.combatHooks),
    );
    this.registry.set(REGISTRY_KEYS.chapter, chapter);
    this.registry.set(REGISTRY_KEYS.chapterId, chapterId);
    this.registry.set(REGISTRY_KEYS.session, this.session);
    this.eventController = new EventController(chapter.events, this.session, {
      messageWindow: this.messageWindow,
      choiceDialog: this.choiceDialog,
      unitSprites: this.unitSprites,
      scene: this,
      gameAudio: this.gameAudio,
      autoAdvanceEvents: this.autoPlayAll,
      units: chapter.database.units,
      onStateChanged: () => this.refreshView(),
      onGotoChapter: (nextId) => this.gotoChapter(nextId),
    });
    this.resetSelection();
    this.recentLogs = [];
    this.refreshView();
    await this.fireChapterStartEvents();
    this.mode = this.session.state.phase === "player" ? "select_unit" : "idle";
  }

  private async runEvents(
    trigger: Parameters<EventController["fireTrigger"]>[0],
  ): Promise<void> {
    if (this.chapter.events.length === 0) {
      return;
    }
    const prevMode = this.mode;
    this.mode = "event";
    this.inputLocked = true;
    try {
      await this.eventController.fireTrigger(trigger);
    } finally {
      this.inputLocked = false;
      if (this.session.state.outcome !== "ongoing") {
        this.mode = "ended";
      } else {
        this.mode = prevMode === "event" ? "select_unit" : prevMode;
      }
      this.refreshView();
    }
  }

  private async processKillLogs(logs: BattleLogEntry[]): Promise<void> {
    for (const log of logs) {
      if (log.kind !== "kill" || !log.target) {
        continue;
      }
      const defeated = this.session.state.units.find((u) => u.instanceId === log.target);
      if (!defeated) {
        continue;
      }
      await this.runEvents({ type: "unitDefeated", unitId: defeated.ref as UnitId });
    }
  }

  private async processTurnStart(prevTurn: number): Promise<void> {
    if (this.session.state.turn > prevTurn) {
      await this.runEvents({ type: "turnStart", turn: this.session.state.turn });
    }
  }

  private async processTileReached(unit: BattleUnit, x: number, y: number): Promise<void> {
    await this.runEvents({ type: "tileReached", x, y, unitId: unit.ref as UnitId });
  }

  private async applyAction(action: Parameters<BattleSession["apply"]>[0]): Promise<BattleLogEntry[]> {
    const prevTurn = this.session.state.turn;
    const playerInvincible = this.registry.get(REGISTRY_KEYS.debugInvincible) === true;
    const logs = this.session.apply(action, { playerInvincible });
    this.pushLogs(logs);
    await this.processKillLogs(logs);
    if (action.type === "EndPhase") {
      await this.processTurnStart(prevTurn);
    }
    return logs;
  }

  getTestApi(): RuntimeTestApi {
    return {
      getState: () => this.session.state,
      getMode: () => this.mode,
      getSession: () => this.session,
      setAutoPlayAll: (enabled: boolean) => {
        this.autoPlayAll = enabled;
        this.registry.set(REGISTRY_KEYS.autoPlayAll, enabled);
      },
      stepAutoPlay: async () => {
        await this.runOneAutoStep();
      },
      runAutoPlay: (maxTurns = 100) => this.session.runAutoPlay(maxTurns),
      forceMode: (mode: string) => {
        this.mode = mode as UiMode;
      },
      selectUnitAt: (x: number, y: number) => {
        this.cursor.setGrid(x, y);
        void this.onConfirm();
      },
      save: () => SaveManager.save(this.session),
      load: () => {
        const loaded = SaveManager.load();
        if (loaded) {
          this.session = loaded;
          this.refreshView();
        }
        return loaded;
      },
      fireEventTrigger: async (trigger) => {
        await this.runEvents(trigger);
      },
      advanceMessage: () => {
        this.messageWindow.advance();
      },
      isMessageOpen: () => this.messageWindow.isOpen(),
      prepareScreenshot: (view) => {
        this.inputLocked = false;
        let player = this.session.state.units.find(
          (u) => u.hp > 0 && u.faction === "player" && !u.hasActed,
        );
        if (!player) {
          player = this.session.state.units.find((u) => u.hp > 0 && u.faction === "player");
        }
        if (!player) {
          return;
        }
        this.selectedUnitId = player.instanceId;
        if (view === "combat_preview") {
          const enemies = this.session.state.units.filter(
            (u) => u.hp > 0 && u.faction === "enemy",
          );
          const reachable = calcMovementRange(this.session.state, player.instanceId);
          let moveTarget: { x: number; y: number } | undefined;
          for (const enemy of enemies) {
            for (const tile of reachable) {
              if (Math.abs(tile.x - enemy.x) + Math.abs(tile.y - enemy.y) === 1) {
                moveTarget = { x: tile.x, y: tile.y };
                break;
              }
            }
            if (moveTarget) {
              break;
            }
          }
          if (moveTarget) {
            this.session.apply({
              type: "Move",
              actor: player.instanceId,
              x: moveTarget.x,
              y: moveTarget.y,
            });
            player = this.getUnit(player.instanceId);
          }
        }
        this.cursor.setGrid(player.x, player.y);
        if (view === "action_menu") {
          this.openActionMenu();
          return;
        }
        const targets = getAttackableTargets(this.session.state, player.instanceId);
        const target = targets[0];
        if (!target) {
          this.openActionMenu();
          return;
        }
        const defender = this.getUnit(target.unitId);
        this.mode = "attack";
        this.highlight.show(
          targets.map((t) => ({ x: t.x, y: t.y, cost: 0 })),
          "attack",
        );
        this.combatPreview.show(this.session.state, player, defender);
        this.hud.setStatus(`攻撃先を選択 (${defender.name})`);
        this.refreshView();
      },
    };
  }

  private bindInput(): void {
    const kb = this.input.keyboard;
    if (!kb) {
      return;
    }

    kb.on("keydown-UP", () => this.onMoveCursor(0, -1));
    kb.on("keydown-DOWN", () => this.onMoveCursor(0, 1));
    kb.on("keydown-LEFT", () => this.onMoveCursor(-1, 0));
    kb.on("keydown-RIGHT", () => this.onMoveCursor(1, 0));
    kb.on("keydown-W", () => this.onMoveCursor(0, -1));
    kb.on("keydown-S", () => this.onMoveCursor(0, 1));
    kb.on("keydown-A", () => this.onMoveCursor(-1, 0));
    kb.on("keydown-D", () => this.onMoveCursor(1, 0));
    kb.on("keydown-ENTER", () => void this.onConfirm());
    kb.on("keydown-Z", () => void this.onConfirm());
    kb.on("keydown-X", () => this.onCancel());
    kb.on("keydown-ESC", () => this.onCancel());

    kb.on("keydown-SPACE", (ev: KeyboardEvent) => {
      if (this.mode === "ended") {
        void this.exitBattle();
        ev.preventDefault();
      }
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.inputLocked) {
        return;
      }
      if (this.cursor.setFromPointer(pointer.x, pointer.y)) {
        void this.onConfirm();
      }
    });
  }

  private onMoveCursor(dx: number, dy: number): void {
    if (this.inputLocked || this.mode === "event") {
      return;
    }
    if (this.messageWindow.isOpen()) {
      return;
    }
    if (this.choiceDialog.isOpen()) {
      this.choiceDialog.move(dy !== 0 ? dy : dx);
      return;
    }
    if (this.actionMenu.isOpen()) {
      this.actionMenu.moveSelection(dy !== 0 ? dy : dx);
      return;
    }
    this.cursor.move(dx, dy);
    if (this.mode === "attack" && this.selectedUnitId) {
      this.updateAttackPreview();
    }
  }

  private async onConfirm(): Promise<void> {
    if (this.inputLocked || this.mode === "animating" || this.mode === "enemy_phase" || this.mode === "event") {
      return;
    }
    if (this.messageWindow.isOpen()) {
      this.messageWindow.advance();
      return;
    }
    if (this.choiceDialog.isOpen()) {
      this.choiceDialog.confirm();
      return;
    }
    if (this.actionMenu.isOpen()) {
      this.actionMenu.confirm();
      return;
    }
    if (this.mode === "ended") {
      void this.exitBattle();
      return;
    }

    const { x, y } = this.cursor.getGrid();

    if (this.mode === "select_unit" || this.mode === "idle") {
      await this.trySelectUnit(x, y);
      return;
    }
    if (this.mode === "move" && this.selectedUnitId) {
      await this.tryMove(x, y);
      return;
    }
    if (this.mode === "attack" && this.selectedUnitId) {
      await this.tryAttack(x, y);
    }
  }

  private onCancel(): void {
    if (this.inputLocked) {
      return;
    }
    if (this.actionMenu.isOpen()) {
      this.actionMenu.cancel();
      return;
    }
    if (this.mode === "move" || this.mode === "action_menu" || this.mode === "attack") {
      this.resetSelection();
      this.mode = "select_unit";
    }
  }

  private async trySelectUnit(x: number, y: number): Promise<void> {
    if (this.session.state.phase !== "player" || this.session.state.outcome !== "ongoing") {
      return;
    }
    const unit = this.unitAt(x, y);
    if (!unit || unit.faction !== "player" || unit.hasActed) {
      return;
    }
    this.selectedUnitId = unit.instanceId;
    this.moveOrigin = { x: unit.x, y: unit.y };
    const range = calcMovementRange(this.session.state, unit.instanceId);
    this.highlight.show(range, "move");
    this.mode = "move";
  }

  private async tryMove(x: number, y: number): Promise<void> {
    if (!this.selectedUnitId) {
      return;
    }
    const unit = this.getUnit(this.selectedUnitId);
    if (x === unit.x && y === unit.y) {
      this.openActionMenu();
      return;
    }
    const reachable = calcMovementRange(this.session.state, this.selectedUnitId);
    if (!reachable.some((t) => t.x === x && t.y === y)) {
      return;
    }

    this.inputLocked = true;
    await this.applyAction({
      type: "Move",
      actor: this.selectedUnitId,
      x,
      y,
    });
    await this.unitSprites.animateMove(this.selectedUnitId, x, y);
    await this.processTileReached(this.getUnit(this.selectedUnitId), x, y);
    this.refreshView();
    this.inputLocked = false;
    this.openActionMenu();
  }

  private openActionMenu(): void {
    if (!this.selectedUnitId) {
      return;
    }
    const unit = this.getUnit(this.selectedUnitId);
    const targets = getAttackableTargets(this.session.state, unit.instanceId);
    const hasItem = unit.inventory.some((id) => {
      const item = this.session.state.context.database.items[id];
      return item?.effect.type === "heal";
    });
    this.highlight.clear();
    this.mode = "action_menu";
    this.actionMenu.open(
      [
        { id: "attack", label: "攻撃", enabled: targets.length > 0 },
        { id: "item", label: "アイテム", enabled: hasItem && !unit.hasActed },
        { id: "wait", label: "待機", enabled: true },
        { id: "cancel", label: "戻る", enabled: true },
      ],
      (choice) => void this.onMenuChoice(choice),
    );
  }

  private async onMenuChoice(choice: ActionMenuChoice): Promise<void> {
    if (!this.selectedUnitId) {
      return;
    }
    if (choice === "cancel") {
      if (this.moveOrigin) {
        const unit = this.getUnit(this.selectedUnitId);
        if (unit.hasMoved && (unit.x !== this.moveOrigin.x || unit.y !== this.moveOrigin.y)) {
          this.resetSelection();
          this.mode = "select_unit";
          return;
        }
      }
      const range = calcMovementRange(this.session.state, this.selectedUnitId);
      this.highlight.show(range, "move");
      this.mode = "move";
      return;
    }
    if (choice === "wait") {
      await this.applyAction({ type: "Wait", actor: this.selectedUnitId });
      this.resetSelection();
      this.refreshView();
      await this.afterPlayerAction();
      return;
    }
    if (choice === "item") {
      const unit = this.getUnit(this.selectedUnitId);
      const healId = unit.inventory.find((id) => {
        const item = this.session.state.context.database.items[id];
        return item?.effect.type === "heal";
      });
      if (!healId) {
        return;
      }
      await this.applyAction({
        type: "UseItem",
        actor: this.selectedUnitId,
        itemId: healId,
        target: this.selectedUnitId,
      });
      this.resetSelection();
      this.refreshView();
      await this.afterPlayerAction();
      return;
    }
    if (choice === "attack") {
      const targets = getAttackableTargets(this.session.state, this.selectedUnitId);
      this.highlight.show(
        targets.map((t) => ({ x: t.x, y: t.y })),
        "attack",
      );
      this.mode = "attack";
      this.updateAttackPreview();
    }
  }

  private updateAttackPreview(): void {
    if (!this.selectedUnitId) {
      return;
    }
    const { x, y } = this.cursor.getGrid();
    const target = this.unitAt(x, y);
    const attacker = this.getUnit(this.selectedUnitId);
    if (target && target.faction !== attacker.faction) {
      this.combatPreview.show(this.session.state, attacker, target);
    } else {
      this.combatPreview.hide();
    }
  }

  private async tryAttack(x: number, y: number): Promise<void> {
    if (!this.selectedUnitId) {
      return;
    }
    const target = this.unitAt(x, y);
    if (!target) {
      return;
    }
    const valid = getAttackableTargets(this.session.state, this.selectedUnitId);
    if (!valid.some((t) => t.unitId === target.instanceId)) {
      return;
    }

    this.inputLocked = true;
    const logs = await this.applyAction({
      type: "Attack",
      actor: this.selectedUnitId,
      target: target.instanceId,
    });
    await this.playCombatLogs(logs, target.instanceId);
    this.combatPreview.hide();
    this.resetSelection();
    this.refreshView();
    this.inputLocked = false;
    await this.afterPlayerAction();
  }

  private async playCombatLogs(logs: BattleLogEntry[], primaryTargetId: string): Promise<void> {
    this.mode = "animating";

    const playedOnBattleScreen = await this.tryPlayBattleScreen(logs, primaryTargetId);
    if (!playedOnBattleScreen) {
      await this.playMapCombatFx(logs);
    }

    if (shouldDelayAfterKill(logs, primaryTargetId)) {
      await this.delay(160);
    }
  }

  private async tryPlayBattleScreen(
    logs: BattleLogEntry[],
    primaryTargetId: string,
  ): Promise<boolean> {
    const battleScene = this.scene.get(BATTLE_SCENE_KEY);
    if (!battleScene) {
      return false;
    }

    await new Promise<void>((resolve) => {
      this.events.once(BATTLE_PLAYBACK_COMPLETE, resolve);
      this.scene.launch(BATTLE_SCENE_KEY, {
        logs,
        primaryTargetId,
        units: this.session.state.units,
        parentSceneKey: this.scene.key,
      });
    });
    return true;
  }

  private async playMapCombatFx(logs: BattleLogEntry[]): Promise<void> {
    const strikeKinds = new Set(["damage", "crit", "miss"]);
    for (const log of logs) {
      if (!strikeKinds.has(log.kind) || !log.target || !log.actor) {
        continue;
      }
      const kind = log.kind as "damage" | "crit" | "miss";
      await this.combatFx.playStrike(
        this.unitSprites,
        log.actor,
        log.target,
        kind,
        log.strike?.damage,
      );
    }
  }

  private async afterPlayerAction(): Promise<void> {
    if (this.session.state.outcome !== "ongoing") {
      this.mode = "ended";
      this.refreshView();
      return;
    }
    const playerPending = this.session.state.units.some(
      (u) => u.hp > 0 && u.faction === "player" && !u.hasActed,
    );
    if (!playerPending) {
      await this.applyAction({ type: "EndPhase" });
      this.refreshView();
      await this.runEnemyPhase();
      return;
    }
    this.mode = "select_unit";
    this.refreshView();
  }

  private async runEnemyPhase(): Promise<void> {
    if (this.session.state.outcome !== "ongoing") {
      this.mode = "ended";
      this.refreshView();
      return;
    }

    while (
      this.session.state.outcome === "ongoing" &&
      this.session.state.phase !== "player"
    ) {
      this.mode = "enemy_phase";
      this.highlight.clear();
      this.refreshView();

      const pending = this.session.state.units.filter(
        (u) => u.hp > 0 && u.faction === this.session.state.phase && !u.hasActed,
      );
      if (pending.length === 0) {
        await this.applyAction({ type: "EndPhase" });
        this.refreshView();
        continue;
      }

      const unit = pending[0]!;
      const action = this.session.decideForUnit(unit.instanceId);
      this.inputLocked = true;
      const before = { x: unit.x, y: unit.y };
      const logs = await this.applyAction(action);
      if (action.type === "Move") {
        await this.unitSprites.animateMove(unit.instanceId, action.x, action.y);
        await this.processTileReached(this.getUnit(unit.instanceId), action.x, action.y);
      } else if (action.type === "Attack") {
        this.cursor.setGrid(before.x, before.y);
        await this.playCombatLogs(logs, action.target);
      }
      this.refreshView();
      this.inputLocked = false;
      await this.delay(80);

      if (this.session.state.outcome !== "ongoing") {
        this.mode = "ended";
        this.refreshView();
        return;
      }
    }

    if (this.autoPlayAll && this.session.state.phase === "player" && this.session.state.outcome === "ongoing") {
      await this.runOneAutoStep();
      return;
    }

    this.mode = this.session.state.outcome === "ongoing" ? "select_unit" : "ended";
    this.refreshView();
  }

  private async runAutoPlayLoop(): Promise<void> {
    while (this.session.state.outcome === "ongoing") {
      await this.runOneAutoStep();
      await this.delay(60);
    }
    this.mode = "ended";
    this.refreshView();
  }

  private async runOneAutoStep(): Promise<void> {
    if (this.session.state.outcome !== "ongoing") {
      return;
    }
    const phase = this.session.state.phase;
    const pending = this.session.state.units.filter(
      (u) => u.hp > 0 && u.faction === phase && !u.hasActed,
    );
    if (pending.length === 0) {
      await this.applyAction({ type: "EndPhase" });
      this.refreshView();
      return;
    }
    const unit = pending[0]!;
    const action = this.session.decideForUnit(unit.instanceId);
    this.inputLocked = true;
    const logs = await this.applyAction(action);
    if (action.type === "Move") {
      await this.unitSprites.animateMove(unit.instanceId, action.x, action.y);
      await this.processTileReached(this.getUnit(unit.instanceId), action.x, action.y);
    } else if (action.type === "Attack") {
      await this.playCombatLogs(logs, action.target);
    }
    this.refreshView();
    this.inputLocked = false;
  }

  private resetSelection(): void {
    this.selectedUnitId = null;
    this.moveOrigin = null;
    this.highlight.clear();
    this.combatPreview.hide();
    this.actionMenu.close();
  }

  private unitAt(x: number, y: number): BattleUnit | undefined {
    return this.session.state.units.find((u) => u.hp > 0 && u.x === x && u.y === y);
  }

  private getUnit(id: string): BattleUnit {
    const unit = this.session.state.units.find((u) => u.instanceId === id);
    if (!unit) {
      throw new Error(`Unit not found: ${id}`);
    }
    return unit;
  }

  private pushLogs(logs: BattleLogEntry[]): void {
    this.recentLogs.push(...logs);
    if (this.recentLogs.length > 40) {
      this.recentLogs = this.recentLogs.slice(-40);
    }
  }

  private async exitBattle(): Promise<void> {
    const useCampaign = this.registry.get(REGISTRY_KEYS.useCampaign) === true;
    if (this.session.state.outcome === "win" && useCampaign) {
      await this.runEvents({ type: "chapterEnd" });
      const campaignSession = this.registry.get(REGISTRY_KEYS.campaignSession) as
        | CampaignSession
        | undefined;
      const chapters = this.registry.get(REGISTRY_KEYS.chapters) ?? {};
      if (campaignSession) {
        applyVictoryToCampaign(
          campaignSession,
          chapters,
          this.session.state,
          this.chapter.chapterId,
        );
        this.scene.start("Base");
        return;
      }
    }
    this.scene.start("Title");
  }

  private refreshView(): void {
    this.unitSprites.sync(this.session.state.units);
    this.hud.update(this.session.state, this.recentLogs, SaveManager.hasSave());

    if (
      this.session.state.outcome === "ongoing" &&
      !this.inputLocked &&
      this.mode === "select_unit"
    ) {
      const { x, y } = this.cursor.getGrid();
      const terrain = getTerrainAt(this.session.state, x, y);
      if (terrain) {
        this.hud.setStatus(`${terrain.name} (${x},${y})`);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(ms, resolve);
    });
  }

  override update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.saveKey) && this.ctrlKey.isDown) {
      SaveManager.save(this.session);
      this.refreshView();
    }
    if (Phaser.Input.Keyboard.JustDown(this.loadKey) && this.ctrlKey.isDown) {
      const loaded = SaveManager.load();
      if (loaded) {
        this.session = loaded;
        this.resetSelection();
        this.mode = this.session.state.phase === "player" ? "select_unit" : "idle";
        this.refreshView();
        if (this.session.state.phase !== "player") {
          void this.runEnemyPhase();
        }
      }
    }
  }
}
