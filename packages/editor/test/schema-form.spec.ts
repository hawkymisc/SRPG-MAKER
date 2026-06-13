import { describe, expect, it } from "vitest";
import { SkillSchema, UnitSchema } from "@srpg/shared";
import { inferFields } from "../src/schema-form/inferFields.js";
import { setAtPath, getAtPath } from "../src/schema-form/utils.js";

describe("schema-form inferFields", () => {
  it("infers string, number, and enum fields from SkillSchema", () => {
    const fields = inferFields(SkillSchema, "", { idOptions: {} }, true);
    const paths = fields.map((f) => f.path);
    expect(paths).toContain("name");
    expect(paths).toContain("description");
    expect(paths).toContain("critBonus");
    expect(fields.find((f) => f.path === "name")?.kind).toBe("string");
    expect(fields.find((f) => f.path === "critBonus")?.kind).toBe("number");
  });

  it("hides id field when hideId is true", () => {
    const fields = inferFields(SkillSchema, "", { idOptions: {} }, true);
    expect(fields.some((f) => f.path === "id")).toBe(false);
  });

  it("resolves classId as idRef", () => {
    const fields = inferFields(UnitSchema, "", { idOptions: {} }, true);
    const classField = fields.find((f) => f.path === "classId");
    expect(classField?.kind).toBe("idRef");
    expect(classField?.idRefTable).toBe("classes");
  });
});

describe("schema-form path utils", () => {
  it("sets and gets nested paths", () => {
    const base = { stats: { hp: 10, mov: 5 } };
    const next = setAtPath(base, "stats.hp", 20);
    expect(getAtPath(next, "stats.hp")).toBe(20);
    expect(getAtPath(base, "stats.hp")).toBe(10);
  });
});
