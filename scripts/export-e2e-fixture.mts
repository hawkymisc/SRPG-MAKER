/**
 * Build HTML5 export fixture for Playwright (M4-T6).
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
  type Project,
} from "@srpg/shared";
import {
  buildExportFileEntries,
  exportHtml5,
  parseRuntimeIndexHtml,
  type ExportBinaryFiles,
} from "../packages/editor/src/lib/export/exportHtml5.js";
import { mergeSplitProject, type SplitProjectFiles } from "../packages/editor/src/lib/export/splitProject.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SAMPLE_ROOT = resolve(ROOT, "templates/sample");
const RUNTIME_DIST = resolve(ROOT, "packages/runtime/dist");
const FIXTURE_ROOT = resolve(ROOT, "e2e/fixtures/exported-game");

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

function loadSampleProject(): Project {
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

  const mapRaw = JSON.parse(readFileSync(join(SAMPLE_ROOT, "maps/chapter01.json"), "utf8"));
  const map = MapSchema.parse({
    ...mapRaw,
    eventIds: ["ev_chapter01_intro"],
  });
  files["maps/chapter01.json"] = `${JSON.stringify(map, null, 2)}\n`;

  const eventsRaw: unknown = JSON.parse(readFileSync(join(SAMPLE_ROOT, "events/chapter01.json"), "utf8"));
  const events: Record<string, EventDefinition> = {};
  if (Array.isArray(eventsRaw)) {
    for (const entry of eventsRaw) {
      const parsed = EventDefinitionSchema.parse(entry);
      events[parsed.id] = parsed;
    }
  }

  files["events/common.json"] = `${JSON.stringify(events, null, 2)}\n`;
  files["events/chapter01.json"] = readFileSync(join(SAMPLE_ROOT, "events/chapter01.json"), "utf8");
  return mergeSplitProject(files);
}

function writeExportFixture(): void {
  ensureRuntimeDist();

  const project = loadSampleProject();
  const runtimeFiles = readRuntimeDist(RUNTIME_DIST);
  const result = exportHtml5({ project, runtimeFiles, zipName: "sample_html5.zip" });
  const entries = buildExportFileEntries(project, runtimeFiles);

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
}

writeExportFixture();
