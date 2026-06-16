/** Binary project assets under `assets/` (spec.md section 7). */
export type ProjectAssetFiles = Record<string, Uint8Array>;

export const ASSETS_ROOT_PREFIX = "assets/";

export function isProjectAssetPath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/");
  return normalized.startsWith(ASSETS_ROOT_PREFIX) && !normalized.endsWith(".json");
}

export function normalizeAssetPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function uint8ArrayToBase64(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]!);
  }
  return btoa(binary);
}

export function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export function assetsToBase64(assets: ProjectAssetFiles): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, data] of Object.entries(assets)) {
    out[normalizeAssetPath(path)] = uint8ArrayToBase64(data);
  }
  return out;
}

export function assetsFromBase64(encoded: Record<string, string>): ProjectAssetFiles {
  const out: ProjectAssetFiles = {};
  for (const [path, b64] of Object.entries(encoded)) {
    out[normalizeAssetPath(path)] = base64ToUint8Array(b64);
  }
  return out;
}

export type AssetCategory = "images" | "bgm" | "se";

export function assetPathForUpload(category: AssetCategory, fileName: string): string {
  const safeName = fileName.replace(/\\/g, "/").split("/").pop() ?? "asset.bin";
  switch (category) {
    case "images":
      return `assets/images/${safeName}`;
    case "bgm":
      return `assets/audio/bgm/${safeName}`;
    case "se":
      return `assets/audio/se/${safeName}`;
  }
}

export function categorizeAssetPath(path: string): AssetCategory | "other" {
  const normalized = normalizeAssetPath(path);
  if (normalized.startsWith("assets/images/")) {
    return "images";
  }
  if (normalized.startsWith("assets/audio/bgm/")) {
    return "bgm";
  }
  if (normalized.startsWith("assets/audio/se/")) {
    return "se";
  }
  return "other";
}

export function isImageAssetPath(path: string): boolean {
  return /\.(png|jpe?g|webp|gif)$/i.test(path);
}

export function formatAssetSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function listProjectAssetPaths(assets: ProjectAssetFiles): string[] {
  return Object.keys(assets).map(normalizeAssetPath).sort();
}
