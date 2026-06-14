import { mergeCombatHooks, type CombatHooks } from "@srpg/shared";
import type { PluginManifest } from "@srpg/shared";
import { compilePluginManifest } from "./compile.js";

export interface RegisteredPlugin {
  manifest: PluginManifest;
  hooks?: CombatHooks;
}

export interface PluginRegistry {
  combatHooks: CombatHooks;
  manifests: PluginManifest[];
}

export function createPluginRegistry(plugins: RegisteredPlugin[]): PluginRegistry {
  const manifests = plugins.map((plugin) => plugin.manifest);
  const combatHooks = mergeCombatHooks(
    ...plugins.map((plugin) => plugin.hooks ?? compilePluginManifest(plugin.manifest)),
  );
  return { combatHooks, manifests };
}

export function createPluginRegistryFromProject(input: {
  plugins: Record<string, PluginManifest>;
  enabledPlugins: string[];
}): PluginRegistry {
  const enabled = input.enabledPlugins.filter((id) => input.plugins[id] !== undefined);
  const registered = enabled.map((id) => ({
    manifest: input.plugins[id]!,
  }));
  return createPluginRegistry(registered);
}
