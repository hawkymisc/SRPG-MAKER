import type { CombatHooks } from "@srpg/shared";
import type { PlacementInput } from "@srpg/shared";
import {
  createInitialBattleState,
  createRng,
  decideAction,
  evaluateOutcome,
  resolveAction,
  restoreRng,
  type BattleAction,
  type BattleLogEntry,
  type BattleOutcome,
  type BattleState,
  type Rng,
} from "@srpg/shared";
import type { ChapterData } from "../data/loadChapter.js";
import { DEFAULT_BATTLE_SEED } from "../constants.js";

export interface BattleSaveData {
  version: 1;
  seed: number;
  rngConsumed: number;
  state: BattleState;
}

export interface AutoPlayResult {
  outcome: BattleOutcome;
  turns: number;
  steps: number;
}

export interface ApplyOptions {
  playerInvincible?: boolean;
}

export class BattleSession {
  readonly seed: number;
  private rng: Rng;
  state: BattleState;

  constructor(state: BattleState, seed: number, rngConsumed = 0) {
    this.state = state;
    this.seed = seed;
    this.rng = rngConsumed > 0 ? restoreRng(seed, rngConsumed) : createRng(seed);
  }

  static fromChapter(
    chapter: ChapterData,
    seed = DEFAULT_BATTLE_SEED,
    placements?: PlacementInput[],
    combatHooks?: CombatHooks,
  ): BattleSession {
    const state = createInitialBattleState({
      map: chapter.map,
      database: chapter.database,
      ...(placements !== undefined ? { placements } : {}),
      ...(combatHooks !== undefined ? { combatHooks } : {}),
    });
    return new BattleSession(state, seed);
  }

  getRng(): Rng {
    return this.rng;
  }

  getRngConsumed(): number {
    return this.rng.consumed();
  }

  apply(action: BattleAction, options?: ApplyOptions): BattleLogEntry[] {
    const playerHp =
      options?.playerInvincible && action.type === "Attack"
        ? new Map(
            this.state.units
              .filter((u) => u.faction === "player")
              .map((u) => [u.instanceId, u.hp] as const),
          )
        : null;

    const result = resolveAction(this.state, action, this.rng);
    let nextState = result.state;

    if (playerHp) {
      nextState = {
        ...nextState,
        units: nextState.units.map((u) =>
          u.faction === "player" && playerHp.has(u.instanceId)
            ? { ...u, hp: playerHp.get(u.instanceId)! }
            : u,
        ),
      };
      if (nextState.outcome === "lose") {
        const recheck = evaluateOutcome({ ...nextState, outcome: "ongoing" });
        nextState = { ...nextState, outcome: recheck.outcome };
      }
    }

    this.state = nextState;
    return result.log;
  }

  decideForUnit(unitId: string): BattleAction {
    return decideAction(this.state, unitId, this.rng);
  }

  serialize(): BattleSaveData {
    return {
      version: 1,
      seed: this.seed,
      rngConsumed: this.rng.consumed(),
      state: this.state,
    };
  }

  static deserialize(data: BattleSaveData): BattleSession {
    if (data.version !== 1) {
      throw new Error(`Unsupported save version: ${String(data.version)}`);
    }
    return new BattleSession(data.state, data.seed, data.rngConsumed);
  }

  /** Run AI for every faction until win/lose or turn limit. */
  runAutoPlay(maxTurns = 100): AutoPlayResult {
    let steps = 0;
    const maxSteps = maxTurns * 32;
    const startTurn = this.state.turn;

    while (this.state.outcome === "ongoing" && this.state.turn - startTurn < maxTurns && steps < maxSteps) {
      const acted = this.runOnePhaseStep();
      if (!acted) {
        this.apply({ type: "EndPhase" });
      }
      steps += 1;
    }

    return {
      outcome: this.state.outcome,
      turns: this.state.turn - startTurn,
      steps,
    };
  }

  /** One AI decision for the current phase, or false when phase is complete. */
  runOnePhaseStep(): boolean {
    const phase = this.state.phase;
    const pending = this.state.units.filter(
      (u) => u.hp > 0 && u.faction === phase && !u.hasActed,
    );
    if (pending.length === 0) {
      return false;
    }
    const unit = pending[0]!;
    const action = this.decideForUnit(unit.instanceId);
    this.apply(action);
    return true;
  }
}
