import { describe, expect, it } from "vitest";
import { toggleEnabledPlugin } from "../src/lib/project/plugins.js";

describe("toggleEnabledPlugin", () => {
  it("adds and removes plugin ids", () => {
    expect(toggleEnabledPlugin([], "plugin_a", true)).toEqual(["plugin_a"]);
    expect(toggleEnabledPlugin(["plugin_a"], "plugin_a", true)).toEqual(["plugin_a"]);
    expect(toggleEnabledPlugin(["plugin_a", "plugin_b"], "plugin_a", false)).toEqual(["plugin_b"]);
  });
});
