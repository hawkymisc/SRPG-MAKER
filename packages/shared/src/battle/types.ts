import type { AiType, Faction, MapData } from "../schemas/map.js";
import type { ClassDef } from "../schemas/class.js";
import type { Item } from "../schemas/item.js";
import type { Skill } from "../schemas/skill.js";
import type { Terrain } from "../schemas/terrain.js";
import type { Unit } from "../schemas/unit.js";
import type { Weapon } from "../schemas/weapon.js";
import type { Stats } from "../schemas/stats.js";
import type { VariableId, SwitchId } from "../schemas/ids.js";
import type { BattleConfig } from "./config.js";

export interface WeaponInstance {
  weaponId: string;
  durability: number;
}

export interface BattleUnit {
  instanceId: string;
  ref: string;
  name: string;
  classId: string;
  level: number;
  exp: number;
  stats: Stats;
  maxHp: number;
  hp: number;
  x: number;
  y: number;
  faction: Faction;
  equip: WeaponInstance | null;
  inventory: string[];
  skills: string[];
  aiType?: AiType;
  guardX?: number;
  guardY?: number;
  moveTargetX?: number;
  moveTargetY?: number;
  isBoss: boolean;
  hasActed: boolean;
  hasMoved: boolean;
}

export interface BattleDatabase {
  units: Record<string, Unit>;
  classes: Record<string, ClassDef>;
  weapons: Record<string, Weapon>;
  items: Record<string, Item>;
  skills: Record<string, Skill>;
  terrain: Record<string, Terrain>;
}

export interface BattleContext {
  config: BattleConfig;
  map: MapData;
  database: BattleDatabase;
}

export type BattleOutcome = "ongoing" | "win" | "lose";

export interface BattleState {
  turn: number;
  phase: Faction;
  units: BattleUnit[];
  variables: Record<VariableId, number>;
  switches: Record<SwitchId, boolean>;
  outcome: BattleOutcome;
  log: BattleLogEntry[];
  context: BattleContext;
}

export type BattleAction =
  | { type: "Move"; actor: string; x: number; y: number }
  | { type: "Attack"; actor: string; target: string }
  | { type: "UseItem"; actor: string; itemId: string; target?: string }
  | { type: "Wait"; actor: string }
  | { type: "EndPhase" };

export interface StrikeResult {
  hit: boolean;
  crit: boolean;
  damage: number;
  hitRoll: number;
  critRoll?: number;
  hitRate: number;
  critRate: number;
  attackPower: number;
}

export interface BattleLogEntry {
  kind:
    | "move"
    | "attack"
    | "miss"
    | "damage"
    | "crit"
    | "double_attack"
    | "kill"
    | "exp"
    | "level_up"
    | "heal"
    | "terrain_heal"
    | "weapon_break"
    | "reinforcement"
    | "phase_end"
    | "win"
    | "lose"
    | "wait";
  turn: number;
  phase: Faction;
  actor?: string;
  target?: string;
  message: string;
  strike?: StrikeResult;
  value?: number;
  rngRolls?: number[];
}

export interface ResolveResult {
  state: BattleState;
  log: BattleLogEntry[];
}
