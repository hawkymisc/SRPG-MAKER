import { PluginManifestSchema, type PluginManifest } from "@srpg/shared";

export async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return res.json() as Promise<unknown>;
}

export interface ProjectPluginMeta {
  plugins: Record<string, PluginManifest>;
  enabledPlugins: string[];
}

export async function loadProjectPluginMeta(baseUrl: string): Promise<ProjectPluginMeta> {
  const base = baseUrl.replace(/\/$/, "");
  let enabledPlugins: string[] = [];
  try {
    const meta = (await fetchJson(`${base}/project.json`)) as {
      enabledPlugins?: string[];
    };
    enabledPlugins = meta.enabledPlugins ?? [];
  } catch {
    return { plugins: {}, enabledPlugins: [] };
  }

  const plugins: Record<string, PluginManifest> = {};
  await Promise.all(
    enabledPlugins.map(async (id) => {
      try {
        const raw = await fetchJson(`${base}/plugins/${id}/plugin.json`);
        const manifest = PluginManifestSchema.parse(raw);
        if (manifest.id !== id) {
          throw new Error(`Plugin id mismatch: ${id} vs ${manifest.id}`);
        }
        plugins[id] = manifest;
      } catch {
        // Skip missing or invalid plugin files.
      }
    }),
  );

  return {
    plugins,
    enabledPlugins: enabledPlugins.filter((id) => plugins[id] !== undefined),
  };
}
