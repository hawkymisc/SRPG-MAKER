/** Resolve asset URLs for BGM/SE per docs/spec.md section 7 (assets/audio/). */
export function audioAssetSources(
  baseUrl: string,
  category: "bgm" | "se",
  id: string,
): string[] {
  const root = `${baseUrl.replace(/\/$/, "")}/assets/audio/${category}/${id}`;
  return [`${root}.ogg`, `${root}.mp3`];
}

export function bgmAssetSources(baseUrl: string, bgmId: string): string[] {
  return audioAssetSources(baseUrl, "bgm", bgmId);
}

export function seAssetSources(baseUrl: string, seId: string): string[] {
  return audioAssetSources(baseUrl, "se", seId);
}
