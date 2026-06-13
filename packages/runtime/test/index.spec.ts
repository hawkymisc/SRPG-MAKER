import { describe, expect, it } from "vitest";
import { RUNTIME_PACKAGE } from "../src/index.js";

describe("@srpg/runtime skeleton", () => {
  it("exports package identifier", () => {
    expect(RUNTIME_PACKAGE).toBe("@srpg/runtime");
  });
});
