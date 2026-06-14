import type { Rng } from "../rng.js";
import { canDoubleAttack, resolveStrike } from "./combat.js";
import { applyExpGain, calcKillExp } from "./exp.js";
import { canMoveTo, getTerrainAt } from "./movement.js";
import { getAttackableTargets } from "./range.js";
import { createBattleUnitFromPlacement } from "./setup.js";
import { evaluateOutcome } from "./win-lose.js";
import type {
  BattleAction,
  BattleLogEntry,
  BattleState,
  BattleUnit,
  ResolveResult,
} from "./types.js";
import type { BattleConfig } from "./config.js";

function updateUnit(state: BattleState, unitId: string, patch: Partial<BattleUnit>): BattleState {
  return {
    ...state,
    units: state.units.map((u) => (u.instanceId === unitId ? { ...u, ...patch } : u)),
  };
}

function appendLog(state: BattleState, entries: BattleLogEntry[]): BattleState {
  return { ...state, log: [...state.log, ...entries] };
}

function getUnit(state: BattleState, id: string): BattleUnit {
  const unit = state.units.find((u) => u.instanceId === id);
  if (!unit) throw new Error(`Unknown unit: ${id}`);
  return unit;
}

function applyTerrainHeal(state: BattleState): { state: BattleState; logs: BattleLogEntry[] } {
  const logs: BattleLogEntry[] = [];
  let next = state;
  const { config } = state.context;

  for (const unit of next.units) {
    if (unit.hp <= 0) continue;
    const terrain = getTerrainAt(next, unit.x, unit.y);
    const heal = terrain?.healPerTurn ?? 0;
  const amount = heal > 0 ? heal : terrain?.id === "terrain_fort" ? config.fortHealAmount : 0;
    if (amount <= 0 || unit.hp >= unit.maxHp) continue;
    const newHp = Math.min(unit.maxHp, unit.hp + amount);
    next = updateUnit(next, unit.instanceId, { hp: newHp });
    logs.push({
      kind: "terrain_heal",
      turn: next.turn,
      phase: next.phase,
      actor: unit.instanceId,
      value: newHp - unit.hp,
      message: `${unit.name} healed ${newHp - unit.hp} from terrain`,
    });
  }
  return { state: next, logs };
}

function spawnReinforcements(state: BattleState): { state: BattleState; logs: BattleLogEntry[] } {
  const logs: BattleLogEntry[] = [];
  const pending = state.context.map.reinforcements.filter((r) => r.turn === state.turn);
  if (pending.length === 0) return { state, logs };

  const newUnits = pending.map((r) => createBattleUnitFromPlacement(r, state.context.database));
  for (const u of newUnits) {
    logs.push({
      kind: "reinforcement",
      turn: state.turn,
      phase: state.phase,
      actor: u.instanceId,
      message: `${u.name} reinforced at (${u.x},${u.y})`,
    });
  }
  return { state: { ...state, units: [...state.units, ...newUnits] }, logs };
}

function resolveMove(
  state: BattleState,
  action: Extract<BattleAction, { type: "Move" }>,
): ResolveResult {
  const actor = getUnit(state, action.actor);
  if (!canMoveTo(state, action.actor, action.x, action.y)) {
    throw new Error(`Invalid move for ${action.actor} to (${action.x},${action.y})`);
  }
  const entry: BattleLogEntry = {
    kind: "move",
    turn: state.turn,
    phase: state.phase,
    actor: action.actor,
    message: `${actor.name} moved to (${action.x},${action.y})`,
  };
  const next = updateUnit(state, action.actor, {
    x: action.x,
    y: action.y,
    hasMoved: true,
  });
  return { state: appendLog(next, [entry]), log: [entry] };
}

function resolveAttack(
  state: BattleState,
  action: Extract<BattleAction, { type: "Attack" }>,
  rng: Rng,
): ResolveResult {
  const actor = getUnit(state, action.actor);
  const target = getUnit(state, action.target);
  const targets = getAttackableTargets(state, action.actor);
  if (!targets.some((t) => t.unitId === action.target)) {
    throw new Error(`Target ${action.target} not in attack range`);
  }
  if (!actor.equip) throw new Error(`Actor ${action.actor} has no weapon`);

  const weapon = state.context.database.weapons[actor.equip.weaponId];
  if (!weapon) throw new Error(`Unknown weapon ${actor.equip.weaponId}`);
  if (actor.equip.durability <= 0) {
    throw new Error(`Weapon ${weapon.name} is broken`);
  }

  const defenderWeapon = target.equip
    ? state.context.database.weapons[target.equip.weaponId] ?? null
    : null;
  const terrain = getTerrainAt(state, target.x, target.y);
  const config = state.context.config;
  const logs: BattleLogEntry[] = [];
  let next = state;

  const strikeCount = canDoubleAttack(actor, target, config) ? 2 : 1;
  if (strikeCount === 2) {
    logs.push({
      kind: "double_attack",
      turn: state.turn,
      phase: state.phase,
      actor: action.actor,
      target: action.target,
      message: `${actor.name} performs a double attack`,
    });
  }

  let currentTarget = target;
  for (let i = 0; i < strikeCount && currentTarget.hp > 0; i++) {
    const strike = resolveStrike(
      actor,
      currentTarget,
      weapon,
      defenderWeapon,
      terrain,
      config,
      rng,
      state.context.combatHooks,
    );
    const strikeLog: BattleLogEntry = {
      kind: strike.hit ? (strike.crit ? "crit" : "damage") : "miss",
      turn: state.turn,
      phase: state.phase,
      actor: action.actor,
      target: action.target,
      message: strike.hit
        ? `${actor.name} dealt ${strike.damage} damage to ${currentTarget.name}`
        : `${actor.name} missed ${currentTarget.name}`,
      strike,
      rngRolls: [strike.hitRoll, ...(strike.critRoll !== undefined ? [strike.critRoll] : [])],
    };
    logs.push(strikeLog);

    if (strike.hit) {
      const newHp = Math.max(0, currentTarget.hp - strike.damage);
      next = updateUnit(next, currentTarget.instanceId, { hp: newHp });
      currentTarget = { ...currentTarget, hp: newHp };

      if (newHp === 0) {
        logs.push({
          kind: "kill",
          turn: state.turn,
          phase: state.phase,
          actor: action.actor,
          target: action.target,
          message: `${currentTarget.name} was defeated`,
        });
        const expAmount = calcKillExp(currentTarget, config);
        const template = state.context.database.units[actor.ref];
        const growth = template?.growth ?? {
          hp: 0,
          str: 0,
          mag: 0,
          skl: 0,
          spd: 0,
          lck: 0,
          def: 0,
          res: 0,
        };
        const expResult = applyExpGain(
          getUnit(next, action.actor),
          expAmount,
          growth,
          config,
          rng,
          state.turn,
          state.phase,
        );
        next = updateUnit(next, action.actor, expResult.unit);
        logs.push(...expResult.logs);
      }
    }
  }

  const durability = actor.equip.durability - 1;
  const equip = { ...actor.equip, durability };
  next = updateUnit(next, action.actor, { equip, hasActed: true });
  if (durability <= 0) {
    logs.push({
      kind: "weapon_break",
      turn: state.turn,
      phase: state.phase,
      actor: action.actor,
      message: `${weapon.name} broke`,
    });
    next = updateUnit(next, action.actor, { equip: null });
  }

  return { state: appendLog(next, logs), log: logs };
}

function resolveUseItem(
  state: BattleState,
  action: Extract<BattleAction, { type: "UseItem" }>,
): ResolveResult {
  const actor = getUnit(state, action.actor);
  const targetId = action.target ?? action.actor;
  const target = getUnit(state, targetId);
  const item = state.context.database.items[action.itemId];
  if (!item) throw new Error(`Unknown item ${action.itemId}`);
  if (!actor.inventory.includes(action.itemId)) {
    throw new Error(`Actor does not have item ${action.itemId}`);
  }

  const logs: BattleLogEntry[] = [];
  let next = state;
  if (item.effect.type === "heal") {
    const newHp = Math.min(target.maxHp, target.hp + item.effect.amount);
    next = updateUnit(next, targetId, { hp: newHp, hasActed: true });
    logs.push({
      kind: "heal",
      turn: state.turn,
      phase: state.phase,
      actor: action.actor,
      target: targetId,
      value: newHp - target.hp,
      message: `${target.name} healed ${newHp - target.hp} HP`,
    });
  }
  return { state: appendLog(next, logs), log: logs };
}

function resolveWait(
  state: BattleState,
  action: Extract<BattleAction, { type: "Wait" }>,
): ResolveResult {
  const actor = getUnit(state, action.actor);
  const entry: BattleLogEntry = {
    kind: "wait",
    turn: state.turn,
    phase: state.phase,
    actor: action.actor,
    message: `${actor.name} waited`,
  };
  const next = updateUnit(state, action.actor, { hasActed: true });
  return { state: appendLog(next, [entry]), log: [entry] };
}

const PHASE_ORDER = ["player", "enemy", "third"] as const;

function resolveEndPhase(state: BattleState): ResolveResult {
  const logs: BattleLogEntry[] = [];
  let next: BattleState = {
    ...state,
    units: state.units.map((u) => ({ ...u, hasActed: false, hasMoved: false })),
  };

  const healResult = applyTerrainHeal(next);
  next = appendLog(healResult.state, healResult.logs);
  logs.push(...healResult.logs);

  const currentIdx = PHASE_ORDER.indexOf(state.phase);
  const nextPhase = PHASE_ORDER[currentIdx + 1];

  if (nextPhase) {
    next = { ...next, phase: nextPhase };
    logs.push({
      kind: "phase_end",
      turn: state.turn,
      phase: state.phase,
      message: `Phase ended, now ${nextPhase}`,
    });
    return { state: appendLog(next, []), log: logs };
  }

  const newTurn = state.turn + 1;
  next = { ...next, turn: newTurn, phase: "player" };
  logs.push({
    kind: "phase_end",
    turn: state.turn,
    phase: state.phase,
    message: `Turn ${newTurn} begins`,
  });

  const reinResult = spawnReinforcements(next);
  next = appendLog(reinResult.state, reinResult.logs);
  logs.push(...reinResult.logs);

  const outcomeResult = evaluateOutcome(next);
  next = { ...next, outcome: outcomeResult.outcome };
  next = appendLog(next, outcomeResult.logs);
  logs.push(...outcomeResult.logs);

  return { state: next, log: logs };
}

export function resolveAction(
  state: BattleState,
  action: BattleAction,
  rng: Rng,
  config?: BattleConfig,
): ResolveResult {
  if (state.outcome !== "ongoing") {
    return { state, log: [] };
  }

  const merged: BattleState = config
    ? { ...state, context: { ...state.context, config: { ...state.context.config, ...config } } }
    : state;

  let result: ResolveResult;
  switch (action.type) {
    case "Move":
      result = resolveMove(merged, action);
      break;
    case "Attack":
      result = resolveAttack(merged, action, rng);
      break;
    case "UseItem":
      result = resolveUseItem(merged, action);
      break;
    case "Wait":
      result = resolveWait(merged, action);
      break;
    case "EndPhase":
      result = resolveEndPhase(merged);
      break;
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unknown action: ${String(_exhaustive)}`);
    }
  }

  if (action.type !== "EndPhase") {
    const outcomeResult = evaluateOutcome(result.state);
    const next = appendLog(
      { ...result.state, outcome: outcomeResult.outcome },
      outcomeResult.logs,
    );
    return {
      state: next,
      log: [...result.log, ...outcomeResult.logs],
    };
  }

  return result;
}
