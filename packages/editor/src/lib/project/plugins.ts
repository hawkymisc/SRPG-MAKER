/** Toggle a plugin id in the enabledPlugins list (pure helper). */
export function toggleEnabledPlugin(
  enabledPlugins: string[],
  pluginId: string,
  enabled: boolean,
): string[] {
  if (enabled) {
    return enabledPlugins.includes(pluginId) ? enabledPlugins : [...enabledPlugins, pluginId];
  }
  return enabledPlugins.filter((id) => id !== pluginId);
}
