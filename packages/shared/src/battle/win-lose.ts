import type { BattleLogEntry, BattleOutcome, BattleState } from "./types.js";

export function checkWinCondition(state: BattleState): BattleOutcome {
  if (state.outcome !== "ongoing") return state.outcome;

  const { winCondition } = state.context.map;
  const alive = state.units.filter((u) => u.hp > 0);

  switch (winCondition.type) {
    case "defeat_all_enemies": {
      const enemies = alive.filter((u) => u.faction === "enemy" || u.faction === "third");
      return enemies.length === 0 ? "win" : "ongoing";
    }
    case "defeat_boss": {
      const boss = state.units.find(
        (u) => u.ref === winCondition.bossRef || u.instanceId === winCondition.bossRef,
      );
      if (boss && boss.hp <= 0) return "win";
      return "ongoing";
    }
    case "survive_turns": {
      return state.turn >= winCondition.turns ? "win" : "ongoing";
    }
    case "defend_point": {
      const defender = alive.find(
        (u) =>
          u.faction === "player" &&
          u.x === winCondition.x &&
          u.y === winCondition.y,
      );
      if (state.turn >= winCondition.turns && defender) return "win";
      return "ongoing";
    }
    default:
      return "ongoing";
  }
}

export function checkLoseCondition(state: BattleState): BattleOutcome {
  if (state.outcome !== "ongoing") return state.outcome;

  const { loseCondition } = state.context.map;
  const alivePlayers = state.units.filter((u) => u.hp > 0 && u.faction === "player");

  if (loseCondition.allPlayerDefeated && alivePlayers.length === 0) {
    return "lose";
  }
  if (loseCondition.turnLimit !== undefined && state.turn > loseCondition.turnLimit) {
    return "lose";
  }
  return "ongoing";
}

export function evaluateOutcome(state: BattleState): { outcome: BattleOutcome; logs: BattleLogEntry[] } {
  const logs: BattleLogEntry[] = [];
  const win = checkWinCondition(state);
  if (win === "win") {
    logs.push({
      kind: "win",
      turn: state.turn,
      phase: state.phase,
      message: "Victory condition met",
    });
    return { outcome: "win", logs };
  }
  const lose = checkLoseCondition(state);
  if (lose === "lose") {
    logs.push({
      kind: "lose",
      turn: state.turn,
      phase: state.phase,
      message: "Defeat condition met",
    });
    return { outcome: "lose", logs };
  }
  return { outcome: "ongoing", logs };
}
