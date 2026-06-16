import type { ProjectAssetFiles } from "./projectAssets.js";
import { isProjectAssetPath, normalizeAssetPath } from "./projectAssets.js";

export interface ProjectFolderPayload {
  json: Record<string, string>;
  assets: ProjectAssetFiles;
}

/** Split folder text files into project JSON vs asset path listing. */
export function partitionJsonAndAssetPaths(files: Record<string, string>): {
  json: Record<string, string>;
  assetPaths: string[];
} {
  const json: Record<string, string> = {};
  const assetPaths: string[] = [];
  for (const [path] of Object.entries(files)) {
    const normalized = normalizeAssetPath(path);
    if (isProjectAssetPath(normalized)) {
      assetPaths.push(normalized);
      continue;
    }
    if (normalized.endsWith(".json")) {
      json[normalized] = files[path]!;
    }
  }
  return { json, assetPaths };
}
