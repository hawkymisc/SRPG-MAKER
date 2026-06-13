import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createRng,
  createInitialBattleState,
  resolveAction,
  MapSchema,
  UnitSchema,
  ClassSchema,
  WeaponSchema,
  ItemSchema,
  SkillSchema,
  TerrainSchema,
  type BattleAction,
  type BattleState,
  type BattleConfig,
} from "@srpg/shared";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SCENARIOS_DIR = join(ROOT, "e2e/golden/scenarios");
const SNAPSHOTS_DIR = join(ROOT, "e2e/golden/snapshots");

interface GoldenScenario {
  name: string;
  description: string;
  specRef?: string;
  seed: number;
  setup: {
    map: string;
    units: Array<{
      ref: string;
      x: number;
      y: number;
      faction: "player" | "enemy" | "third";
      equip?: string;
      equipDurability?: number;
      hp?: number;
      statsOverride?: Record<string, number>;
      isBoss?: boolean;
    }>;
    reinforcements?: unknown[];
    winCondition?: unknown;
    loseCondition?: unknown;
    configOverride?: Partial<BattleConfig>;
  };
  actions: Array<Record<string, unknown>>;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function loadDatabase() {
  const dbDir = join(ROOT, "templates/sample/database");
  const load = <S extends { parse: (v: unknown) => unknown }>(file: string, schema: S) => {
    const raw = readJson(join(dbDir, file)) as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) out[k] = schema.parse(v);
    return out;
  };
  return {
    units: load("units.json", UnitSchema),
    classes: load("classes.json", ClassSchema),
    weapons: load("weapons.json", WeaponSchema),
    items: load("items.json", ItemSchema),
    skills: load("skills.json", SkillSchema),
    terrain: load("terrain.json", TerrainSchema),
  };
}

function resolveRef(state: BattleState, ref: string): string {
  const unit =
    state.units.find((u) => u.ref === ref && u.hp > 0) ?? state.units.find((u) => u.ref === ref);
  if (!unit) throw new Error(`Unknown unit ref: ${ref}`);
  return unit.instanceId;
}

function toAction(state: BattleState, raw: Record<string, unknown>): BattleAction {
  switch (raw.type) {
    case "Move":
      return {
        type: "Move",
        actor: resolveRef(state, raw.actor as string),
        x: raw.x as number,
        y: raw.y as number,
      };
    case "Attack":
      return {
        type: "Attack",
        actor: resolveRef(state, raw.actor as string),
        target: resolveRef(state, raw.target as string),
      };
    case "UseItem":
      return {
        type: "UseItem",
        actor: resolveRef(state, raw.actor as string),
        itemId: raw.itemId as string,
        target: raw.target ? resolveRef(state, raw.target as string) : undefined,
      };
    case "Wait":
      return { type: "Wait", actor: resolveRef(state, raw.actor as string) };
    case "EndPhase":
      return { type: "EndPhase" };
    default:
      throw new Error(`Unknown action type: ${String(raw.type)}`);
  }
}

export function buildSnapshot(state: BattleState, rngConsumed: number) {
  return {
    units: state.units.map((u) => ({
      ref: u.ref,
      x: u.x,
      y: u.y,
      hp: u.hp,
      exp: u.exp,
      equipDurability: u.equip?.durability ?? null,
    })),
    log: state.log,
    rngConsumed,
    turn: state.turn,
    phase: state.phase,
    outcome: state.outcome,
  };
}

export function runScenario(scenario: GoldenScenario) {
  const database = loadDatabase();
  const mapRaw = readJson(join(ROOT, scenario.setup.map));
  const map = MapSchema.parse({
    ...mapRaw,
    placements: [],
    reinforcements: scenario.setup.reinforcements ?? (mapRaw as { reinforcements?: unknown[] }).reinforcements ?? [],
    winCondition: scenario.setup.winCondition ?? (mapRaw as { winCondition: unknown }).winCondition,
    loseCondition: scenario.setup.loseCondition ?? (mapRaw as { loseCondition: unknown }).loseCondition,
  });

  let state = createInitialBattleState({
    map,
    database: database as never,
    placements: scenario.setup.units,
    configOverride: scenario.setup.configOverride,
  });

  const rng = createRng(scenario.seed);
  for (const raw of scenario.actions) {
    const action = toAction(state, raw);
    const result = resolveAction(state, action, rng);
    state = result.state;
  }

  return buildSnapshot(state, rng.consumed());
}

function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, null, 2) + "\n";
}

export function main(argv: string[]): void {
  const update = argv.includes("--update");
  mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  const files = readdirSync(SCENARIOS_DIR).filter((f) => f.endsWith(".json"));
  let failed = 0;

  for (const file of files) {
    const name = file.replace(/\.json$/, "");
    const scenario = readJson(join(SCENARIOS_DIR, file)) as GoldenScenario;
    const actual = runScenario(scenario);
    const snapshotPath = join(SNAPSHOTS_DIR, `${name}.expected.json`);

    if (update || !existsSync(snapshotPath)) {
      writeFileSync(snapshotPath, stableStringify(actual));
      console.log(`updated: ${name}`);
      continue;
    }

    const expected = readJson(snapshotPath);
    const a = stableStringify(actual);
    const e = stableStringify(expected);
    if (a !== e) {
      console.error(`FAIL: ${name}`);
      failed += 1;
    } else {
      console.log(`ok: ${name}`);
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
  console.log(`golden: ${files.length} scenarios passed`);
}

main(process.argv.slice(2));
