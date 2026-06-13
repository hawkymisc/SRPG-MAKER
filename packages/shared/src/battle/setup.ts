import { DEFAULT_BATTLE_CONFIG, type BattleConfig } from "./config.js";
import type { BattleContext, BattleDatabase, BattleState, BattleUnit } from "./types.js";
import type { MapData } from "../schemas/map.js";
import type { MapPlacement, Reinforcement } from "../schemas/map.js";

let instanceCounter = 0;

export function resetInstanceCounter(): void {
  instanceCounter = 0;
}

function nextInstanceId(ref: string): string {
  instanceCounter += 1;
  return `${ref}_${instanceCounter}`;
}

export function createBattleUnitFromPlacement(
  placement: PlacementInput | Reinforcement,
  database: BattleDatabase,
): BattleUnit {
  const template = database.units[placement.ref];
  if (!template) {
    throw new Error(`Unknown unit ref: ${placement.ref}`);
  }
  const equipId = placement.equip ?? template.items.find((id) => database.weapons[id]);
  const weapon = equipId ? database.weapons[equipId] : undefined;
  const stats = {
    ...template.stats,
    ...("statsOverride" in placement ? placement.statsOverride : undefined),
  };

  const unit: BattleUnit = {
    instanceId: nextInstanceId(placement.ref),
    ref: placement.ref,
    name: template.name,
    classId: template.classId,
    level: template.level,
    exp: 0,
    stats,
    maxHp: stats.hp,
    hp: "hp" in placement && placement.hp !== undefined ? placement.hp : stats.hp,
    x: placement.x,
    y: placement.y,
    faction: placement.faction,
    equip: weapon
      ? {
          weaponId: weapon.id,
          durability:
            "equipDurability" in placement && placement.equipDurability !== undefined
              ? placement.equipDurability
              : weapon.durability,
        }
      : null,
    inventory: [...template.items],
    skills: [...template.skills],
    isBoss: "isBoss" in placement ? (placement.isBoss ?? false) : false,
    hasActed: false,
    hasMoved: false,
  };

  if ("aiType" in placement && placement.aiType !== undefined) {
    unit.aiType = placement.aiType;
  }
  if ("guardX" in placement && placement.guardX !== undefined) {
    unit.guardX = placement.guardX;
  }
  if ("guardY" in placement && placement.guardY !== undefined) {
    unit.guardY = placement.guardY;
  }
  if ("moveTargetX" in placement && placement.moveTargetX !== undefined) {
    unit.moveTargetX = placement.moveTargetX;
  }
  if ("moveTargetY" in placement && placement.moveTargetY !== undefined) {
    unit.moveTargetY = placement.moveTargetY;
  }

  return unit;
}

export type PlacementInput = MapPlacement & {
  ref: string;
  equipDurability?: number;
  hp?: number;
  statsOverride?: Partial<import("../schemas/stats.js").Stats>;
};

export interface BattleSetupOptions {
  map: MapData;
  database: BattleDatabase;
  config?: BattleConfig;
  configOverride?: Partial<BattleConfig>;
  placements?: PlacementInput[];
}

export function createInitialBattleState(options: BattleSetupOptions): BattleState {
  resetInstanceCounter();
  const config: BattleConfig = {
    ...DEFAULT_BATTLE_CONFIG,
    ...options.config,
    ...options.configOverride,
  };
  const placements = options.placements ?? options.map.placements;
  const units = placements.map((p) =>
    createBattleUnitFromPlacement(p, options.database),
  );

  const context: BattleContext = {
    config,
    map: options.map,
    database: options.database,
  };

  return {
    turn: 1,
    phase: "player",
    units,
    variables: {},
    switches: {},
    outcome: "ongoing",
    log: [],
    context,
  };
}
