import { describe, expect, it } from "vitest";
import { fillIndices, paintIndices, rectIndices } from "../src/lib/map/mapLayerUtils.js";

describe("mapLayerUtils", () => {
  const width = 4;
  const height = 4;
  const plain = "terrain_plain" as const;
  const forest = "terrain_forest" as const;
  const tiles = Array.from({ length: 16 }, () => plain);

  it("rectIndices covers inclusive bounds", () => {
    expect(rectIndices(width, 1, 1, 2, 2).sort()).toEqual([5, 6, 9, 10].sort());
  });

  it("fillIndices floods matching region", () => {
    const mixed = [...tiles];
    mixed[5] = forest;
    mixed[6] = forest;
    mixed[9] = forest;
    const indices = fillIndices(mixed, width, height, 0, 0, forest);
    expect(indices).toHaveLength(13);
    expect(indices).not.toContain(5);
  });

  it("paintIndices updates only given cells", () => {
    const next = paintIndices(tiles, width, [0, 15], forest);
    expect(next[0]).toBe(forest);
    expect(next[15]).toBe(forest);
    expect(next[7]).toBe(plain);
  });
});
