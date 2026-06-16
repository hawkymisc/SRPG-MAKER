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

export function listProjectAssetPaths(assets: ProjectAssetFiles): string[] {
  return Object.keys(assets).map(normalizeAssetPath).sort();
}
