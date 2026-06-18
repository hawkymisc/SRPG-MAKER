/**
 * Build HTML5 export fixture for Playwright (M4-T6 + E2E Phase 3 variants).
 * Uses editor export pipeline; fixture is served from e2e/fixtures/exported-game/game/.
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EventDefinitionSchema,
  MapSchema,
  SCHEMA_VERSION,
  type EventDefinition,
  type Map,
  type Project,
} from "@srpg/shared";
import {
  buildExportFileEntries,
  exportHtml5,
  parseRuntimeIndexHtml,
  type ExportBinaryFiles,
} from "../packages/editor/src/lib/export/exportHtml5.js";
import type { ProjectAssetFiles } from "../packages/editor/src/lib/project/projectAssets.js";
import { mergeSplitProject, type SplitProjectFiles } from "../packages/editor/src/lib/export/splitProject.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Minimal binary placeholders bundled into the HTML5 export E2E fixture. */
const E2E_SAMPLE_ASSETS: ProjectAssetFiles = {
  "assets/audio/bgm/bgm_intro.ogg": new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0x00]),
  "assets/audio/se/se_select.ogg": new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0x01]),
};
const SAMPLE_ROOT = resolve(ROOT, "templates/sample");
const RUNTIME_DIST = resolve(ROOT, "packages/runtime/dist");
const FIXTURE_ROOT = resolve(ROOT, "e2e/fixtures/exported-game");
const VARIANTS_DIR = resolve(ROOT, "e2e/fixtures/export-variants");

const DB_TABLES = ["units", "classes", "weapons", "items", "skills", "terrain"] as const;

function ensureRuntimeDist(): void {
  execSync("npm run build --prefix packages/runtime", { cwd: ROOT, stdio: "inherit" });
}

function readRuntimeDist(distDir: string): ExportBinaryFiles {
  const html = readFileSync(join(distDir, "index.html"), "utf8");
  const paths = parseRuntimeIndexHtml(html);
  const files: ExportBinaryFiles = {
    "index.html": new TextEncoder().encode(html),
  };
  for (const relPath of paths) {
    if (relPath === "index.html") continue;
    files[relPath] = readFileSync(join(distDir, relPath));
  }
  return files;
}

function loadSplitFilesBase(): SplitProjectFiles {
  const files: SplitProjectFiles = {
    "project.json": `${JSON.stringify(
      {
        schemaVersion: SCHEMA_VERSION,
        name: "サンプルプロジェクト",
        tileSize: 32,
      },
      null,
      2,
    )}\n`,
  };

  for (const table of DB_TABLES) {
    files[`database/${table}.json`] = readFileSync(join(SAMPLE_ROOT, "database", `${table}.json`), "utf8");
  }

  return files;
}

function readSampleMapRaw(): Record<string, unknown> {
  return JSON.parse(readFileSync(join(SAMPLE_ROOT, "maps/chapter01.json"), "utf8")) as Record<
    string,
    unknown
  >;
}

function loadSampleEvents(): { common: Record<string, EventDefinition>; chapter01: string } {
  const eventsRaw: unknown = JSON.parse(readFileSync(join(SAMPLE_ROOT, "events/chapter01.json"), "utf8"));
  const common: Record<string, EventDefinition> = {};
  if (Array.isArray(eventsRaw)) {
    for (const entry of eventsRaw) {
      const parsed = EventDefinitionSchema.parse(entry);
      common[parsed.id] = parsed;
    }
  }
  return {
    common,
    chapter01: readFileSync(join(SAMPLE_ROOT, "events/chapter01.json"), "utf8"),
  };
}

function projectFromSplit(
  files: SplitProjectFiles,
  options: { includeChapters?: boolean; includeIntroEvent?: boolean } = {},
): Project {
  const includeChapters = options.includeChapters ?? true;
  const includeIntroEvent = options.includeIntroEvent ?? true;

  const mapRaw = readSampleMapRaw();
  const map = MapSchema.parse({
    ...mapRaw,
    eventIds: includeIntroEvent ? ["ev_chapter01_intro"] : [],
  });
  files["maps/chapter01.json"] = `${JSON.stringify(map, null, 2)}\n`;

  const events = loadSampleEvents();
  files["events/common.json"] = `${JSON.stringify(includeIntroEvent ? events.common : {}, null, 2)}\n`;
  files["events/chapter01.json"] = includeIntroEvent ? events.chapter01 : "[]\n";

  if (includeChapters) {
    files["chapters/chapters.json"] = readFileSync(join(SAMPLE_ROOT, "chapters/chapters.json"), "utf8");
  } else {
    files["chapters/chapters.json"] = "{}\n";
  }

  return mergeSplitProject(files);
}

function loadSampleProject(): Project {
  return projectFromSplit(loadSplitFilesBase());
}

function loadProjectWithMap(map: Map, options?: { includeChapters?: boolean; includeIntroEvent?: boolean }): Project {
  const files = loadSplitFilesBase();
  files["maps/chapter01.json"] = `${JSON.stringify(map, null, 2)}\n`;
  files["events/common.json"] = "{}\n";
  files["events/chapter01.json"] = "[]\n";
  files["chapters/chapters.json"] = options?.includeChapters === false ? "{}\n" : readFileSync(join(SAMPLE_ROOT, "chapters/chapters.json"), "utf8");
  return mergeSplitProject(files);
}

function bossWinMap(): Map {
  const base = JSON.parse(readFileSync(join(SAMPLE_ROOT, "maps/test10.json"), "utf8")) as Record<
    string,
    unknown
  >;
  return MapSchema.parse({
    ...base,
    id: "map_chapter01",
    name: "ボス撃破テスト",
    placements: [
      { ref: "unit_alm", x: 2, y: 2, faction: "player", equip: "wpn_steel_sword" },
      { ref: "unit_boss", x: 3, y: 2, faction: "enemy", equip: "wpn_steel_sword", isBoss: true },
    ],
    eventIds: [],
    winCondition: { type: "defeat_boss", bossRef: "unit_boss" },
  });
}

function surviveTurnsMap(): Map {
  return MapSchema.parse({
    ...readSampleMapRaw(),
    placements: [
      { ref: "unit_alm", x: 1, y: 4, faction: "player", equip: "wpn_iron_sword" },
      { ref: "unit_lukas", x: 1, y: 5, faction: "player", equip: "wpn_iron_lance" },
      { ref: "unit_brigand", x: 8, y: 8, faction: "enemy", equip: "wpn_iron_axe", aiType: "guard" },
    ],
    eventIds: [],
    winCondition: { type: "survive_turns", turns: 2 },
  });
}

function loseBattleMap(): Map {
  return MapSchema.parse({
    ...readSampleMapRaw(),
    placements: [
      { ref: "unit_alm", x: 1, y: 4, faction: "player", equip: "wpn_iron_sword" },
      { ref: "unit_brigand", x: 8, y: 4, faction: "enemy", equip: "wpn_iron_axe", aiType: "guard" },
    ],
    eventIds: [],
    winCondition: { type: "survive_turns", turns: 99 },
    loseCondition: { allPlayerDefeated: false, turnLimit: 1 },
  });
}

function battleOnlySaveMap(): Map {
  return MapSchema.parse({
    ...readSampleMapRaw(),
    placements: [
      { ref: "unit_alm", x: 1, y: 4, faction: "player", equip: "wpn_iron_sword" },
      { ref: "unit_lukas", x: 1, y: 5, faction: "player", equip: "wpn_iron_lance" },
      { ref: "unit_brigand", x: 7, y: 4, faction: "enemy", equip: "wpn_iron_axe", aiType: "guard" },
      { ref: "unit_brigand", x: 7, y: 5, faction: "enemy", equip: "wpn_iron_axe", aiType: "guard" },
    ],
    eventIds: [],
    winCondition: { type: "defeat_all_enemies" },
  });
}

async function writeVariantDir(
  name: string,
  project: Project,
  runtimeFiles: ExportBinaryFiles,
  projectAssets: ProjectAssetFiles = {},
): Promise<void> {
  const entries = buildExportFileEntries(project, runtimeFiles, "game/", projectAssets);
  const variantRoot = join(VARIANTS_DIR, name);
  mkdirSync(variantRoot, { recursive: true });

  for (const [relPath, data] of Object.entries(entries)) {
    const outPath = join(variantRoot, relPath);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, data);
  }
}

async function writeExportFixture(): Promise<void> {
  ensureRuntimeDist();

  const project = loadSampleProject();
  const runtimeFiles = readRuntimeDist(RUNTIME_DIST);
  const result = exportHtml5({
    project,
    runtimeFiles,
    projectAssets: E2E_SAMPLE_ASSETS,
    zipName: "sample_html5.zip",
  });
  const entries = buildExportFileEntries(project, runtimeFiles, "game/", E2E_SAMPLE_ASSETS);

  mkdirSync(FIXTURE_ROOT, { recursive: true });

  for (const [relPath, data] of Object.entries(entries)) {
    const outPath = join(FIXTURE_ROOT, relPath);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, data);
  }

  writeFileSync(
    join(FIXTURE_ROOT, "manifest.json"),
    `${JSON.stringify(
      {
        fileName: result.fileName,
        paths: result.paths,
        gameEntry: "game/index.html",
      },
      null,
      2,
    )}\n`,
  );

  console.log(`export fixture: ${FIXTURE_ROOT} (${result.paths.length} entries)`);

  await writeVariantDir("defeat-boss", loadProjectWithMap(bossWinMap(), { includeChapters: false }), runtimeFiles);
  await writeVariantDir("survive-turns", loadProjectWithMap(surviveTurnsMap()), runtimeFiles);
  await writeVariantDir("lose-battle", loadProjectWithMap(loseBattleMap(), { includeChapters: false }), runtimeFiles);
  await writeVariantDir(
    "battle-only-save",
    loadProjectWithMap(battleOnlySaveMap(), { includeChapters: false }),
    runtimeFiles,
  );

  console.log(`export variants: ${VARIANTS_DIR} (4 dirs)`);
}

void writeExportFixture();
