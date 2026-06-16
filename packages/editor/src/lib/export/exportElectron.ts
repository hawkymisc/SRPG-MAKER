import type { Project } from "@srpg/shared";
import {
  buildExportFileEntries,
  createExportZip,
  listExportFilePaths,
  type ExportBinaryFiles,
  type ExportHtml5Options,
} from "./exportHtml5.js";
import { buildElectronShellFiles } from "./electronShell.js";
import type { ProjectAssetFiles } from "../project/projectAssets.js";
import type { SplitProjectFiles } from "./splitProject.js";
import { splitProject } from "./splitProject.js";

/** List paths in the Electron export zip (game/ + shell files). */
export function listElectronExportPaths(
  project: Project,
  runtimeFilePaths: string[],
  projectAssets: ProjectAssetFiles = {},
): string[] {
  return [
    ...listExportFilePaths(project, runtimeFilePaths, undefined, projectAssets),
    "main.mjs",
    "preload.mjs",
    "package.json",
    "README.txt",
  ].sort();
}

export interface ExportElectronResult {
  blob: Blob;
  fileName: string;
  paths: string[];
  splitFiles: SplitProjectFiles;
}

/** Build zip with HTML5 game bundle plus Electron shell (main/preload/package.json). */
export function exportElectron(options: ExportHtml5Options): ExportElectronResult {
  const splitFiles = splitProject(options.project);
  const gameEntries = buildExportFileEntries(
    options.project,
    options.runtimeFiles,
    undefined,
    options.projectAssets ?? {},
  );
  const shell = buildElectronShellFiles(options.project.name);

  const entries: ExportBinaryFiles = { ...gameEntries };
  for (const [path, text] of Object.entries(shell)) {
    entries[path] = new TextEncoder().encode(text);
  }

  const blob = createExportZip(entries);
  const slug = options.project.name.replace(/\s+/g, "_");
  const fileName = options.zipName ?? `${slug}_desktop.zip`;

  return {
    blob,
    fileName,
    paths: Object.keys(entries).sort(),
    splitFiles,
  };
}
