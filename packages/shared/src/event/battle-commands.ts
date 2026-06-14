import type { UnitId } from "../schemas/ids.js";
import type {
  ChangeObjectiveCommandSchema,
  RemoveUnitCommandSchema,
  SpawnUnitCommandSchema,
} from "../schemas/event.js";
import type { z } from "zod";
import type { BattleState, BattleUnit } from "../battle/types.js";
import { createBattleUnitFromPlacement } from "../battle/setup.js";

type SpawnUnitCommand = z.infer<typeof SpawnUnitCommandSchema>;
type RemoveUnitCommand = z.infer<typeof RemoveUnitCommandSchema>;
type ChangeObjectiveCommand = z.infer<typeof ChangeObjectiveCommandSchema>;

export function findBattleUnitsById(units: BattleUnit[], unitId: UnitId): BattleUnit[] {
  return units.filter((u) => u.instanceId === unitId || u.ref === unitId);
}

export function applySpawnUnit(cmd: SpawnUnitCommand, state: BattleState): BattleState {
  const unit = createBattleUnitFromPlacement(
    {
      ref: cmd.unitId,
      x: cmd.x,
      y: cmd.y,
      faction: cmd.faction,
      aiType: cmd.aiType,
      isBoss: false,
    },
    state.context.database,
  );
  return { ...state, units: [...state.units, unit] };
}

export function applyRemoveUnit(cmd: RemoveUnitCommand, state: BattleState): BattleState {
  const targets = findBattleUnitsById(state.units, cmd.unitId);
  if (targets.length === 0) return state;
  const removeIds = new Set(targets.map((u) => u.instanceId));
  return {
    ...state,
    units: state.units.filter((u) => !removeIds.has(u.instanceId)),
  };
}

export function applyChangeObjective(cmd: ChangeObjectiveCommand, state: BattleState): BattleState {
  const map = state.context.map;
  return {
    ...state,
    context: {
      ...state.context,
      map: {
        ...map,
        winCondition: cmd.win ?? map.winCondition,
        loseCondition: cmd.lose ?? map.loseCondition,
      },
    },
  };
}
