import type { Project } from "@srpg/shared";
import {
  buildExportFileEntries,
  createExportZip,
  listExportFilePaths,
  WWW_PREFIX,
  type ExportBinaryFiles,
  type ExportHtml5Options,
} from "./exportHtml5.js";
import { buildCapacitorShellFiles } from "./capacitorShell.js";
import type { ProjectAssetFiles } from "../project/projectAssets.js";
import type { SplitProjectFiles } from "./splitProject.js";
import { splitProject } from "./splitProject.js";

/** List paths in the Capacitor export zip (www/ + shell files). */
export function listCapacitorExportPaths(
  project: Project,
  runtimeFilePaths: string[],
  projectAssets: ProjectAssetFiles = {},
): string[] {
  return [
    ...listExportFilePaths(project, runtimeFilePaths, WWW_PREFIX, projectAssets),
    "capacitor.config.json",
    "package.json",
    "README.txt",
  ].sort();
}

export interface ExportCapacitorResult {
  blob: Blob;
  fileName: string;
  paths: string[];
  splitFiles: SplitProjectFiles;
}

/** Build zip with HTML5 game bundle under www/ plus Capacitor shell. */
export function exportCapacitor(options: ExportHtml5Options): ExportCapacitorResult {
  const splitFiles = splitProject(options.project);
  const gameEntries = buildExportFileEntries(
    options.project,
    options.runtimeFiles,
    WWW_PREFIX,
    options.projectAssets ?? {},
  );
  const shell = buildCapacitorShellFiles(options.project.name);

  const entries: ExportBinaryFiles = { ...gameEntries };
  for (const [path, text] of Object.entries(shell)) {
    entries[path] = new TextEncoder().encode(text);
  }

  const blob = createExportZip(entries);
  const slug = options.project.name.replace(/\s+/g, "_");
  const fileName = options.zipName ?? `${slug}_mobile.zip`;

  return {
    blob,
    fileName,
    paths: Object.keys(entries).sort(),
    splitFiles,
  };
}
