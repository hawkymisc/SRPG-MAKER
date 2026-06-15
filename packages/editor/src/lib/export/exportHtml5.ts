import { zipSync } from "fflate";
import type { Project } from "@srpg/shared";
import { splitProject, type SplitProjectFiles } from "./splitProject.js";

export type ExportBinaryFiles = Record<string, Uint8Array>;

const GAME_PREFIX = "game/";
const WWW_PREFIX = "www/";

export { GAME_PREFIX, WWW_PREFIX };

/** Merge split project JSON + runtime dist bytes into a portable zip (under assetPrefix). */
export function buildExportFileEntries(
  project: Project,
  runtimeFiles: ExportBinaryFiles,
  assetPrefix: string = GAME_PREFIX,
): ExportBinaryFiles {
  const split = splitProject(project);
  const entries: ExportBinaryFiles = {};

  for (const [path, text] of Object.entries(split)) {
    entries[`${assetPrefix}${path}`] = new TextEncoder().encode(text);
  }

  for (const [path, data] of Object.entries(runtimeFiles)) {
    const normalized = path.replace(/^\/+/, "");
    entries[`${assetPrefix}${normalized}`] = data;
  }

  return entries;
}

/** List paths that will appear in the export zip (for tests / UI preview). */
export function listExportFilePaths(
  project: Project,
  runtimeFilePaths: string[],
  assetPrefix: string = GAME_PREFIX,
): string[] {
  const splitPaths = Object.keys(splitProject(project)).map((p) => `${assetPrefix}${p}`);
  const runtimePaths = runtimeFilePaths.map((p) => `${assetPrefix}${p.replace(/^\/+/, "")}`);
  return [...splitPaths, ...runtimePaths].sort();
}

/** Create a zip blob from path → bytes map. */
export function createExportZip(entries: ExportBinaryFiles): Blob {
  const zipped = zipSync(entries, { level: 6 });
  return new Blob([zipped], { type: "application/zip" });
}

/** Parse asset references from Vite-built index.html. */
export function parseRuntimeIndexHtml(html: string): string[] {
  const paths = new Set<string>();
  const scriptRe = /\bsrc=["']([^"']+)["']/g;
  const linkRe = /\bhref=["']([^"']+)["']/g;
  for (const re of [scriptRe, linkRe]) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      const href = match[1];
      if (!href || href.startsWith("http") || href.startsWith("data:")) continue;
      paths.add(href.replace(/^\.\//, ""));
    }
  }
  paths.add("index.html");
  return [...paths];
}

export interface FetchRuntimeDistOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

/** Fetch runtime dist files referenced by index.html (relative paths, base: './'). */
export async function fetchRuntimeDist(
  options: FetchRuntimeDistOptions,
): Promise<ExportBinaryFiles> {
  const fetchFn = options.fetchImpl ?? fetch;
  const base = options.baseUrl.replace(/\/$/, "");
  const indexRes = await fetchFn(`${base}/index.html`);
  if (!indexRes.ok) {
    throw new Error(`Failed to fetch runtime index.html: ${indexRes.status}`);
  }
  const html = await indexRes.text();
  const paths = parseRuntimeIndexHtml(html);
  const files: ExportBinaryFiles = { "index.html": new TextEncoder().encode(html) };

  await Promise.all(
    paths
      .filter((p) => p !== "index.html")
      .map(async (relPath) => {
        const res = await fetchFn(`${base}/${relPath}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch runtime asset ${relPath}: ${res.status}`);
        }
        files[relPath] = new Uint8Array(await res.arrayBuffer());
      }),
  );

  return files;
}

export interface ExportHtml5Options {
  project: Project;
  runtimeFiles: ExportBinaryFiles;
  zipName?: string;
}

export interface ExportHtml5Result {
  blob: Blob;
  fileName: string;
  paths: string[];
  splitFiles: SplitProjectFiles;
}

/** Build zip blob and metadata for HTML5 export. */
export function exportHtml5(options: ExportHtml5Options): ExportHtml5Result {
  const splitFiles = splitProject(options.project);
  const entries = buildExportFileEntries(options.project, options.runtimeFiles);
  const blob = createExportZip(entries);
  const fileName = options.zipName ?? `${options.project.name.replace(/\s+/g, "_")}_html5.zip`;
  return {
    blob,
    fileName,
    paths: Object.keys(entries).sort(),
    splitFiles,
  };
}

/** Trigger browser download of the export zip. */
export function downloadExportBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
