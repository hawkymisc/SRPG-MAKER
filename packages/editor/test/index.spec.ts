import { describe, expect, it } from "vitest";
import { EDITOR_PACKAGE } from "../src/index.js";

describe("@srpg/editor skeleton", () => {
  it("exports package identifier", () => {
    expect(EDITOR_PACKAGE).toBe("@srpg/editor");
  });
});
