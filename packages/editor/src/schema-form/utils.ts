import { z } from "zod";

export function unwrapZod(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return unwrapZod(schema._def.innerType as z.ZodTypeAny);
  }
  if (schema instanceof z.ZodDefault) {
    return unwrapZod(schema._def.innerType as z.ZodTypeAny);
  }
  if (schema instanceof z.ZodBranded) {
    return unwrapZod(schema._def.type as z.ZodTypeAny);
  }
  if (schema instanceof z.ZodEffects) {
    return unwrapZod(schema._def.schema as z.ZodTypeAny);
  }
  return schema;
}

export function isOptional(schema: z.ZodTypeAny): boolean {
  return schema instanceof z.ZodOptional || schema instanceof z.ZodDefault;
}

export function getDefaultValue(schema: z.ZodTypeAny): unknown {
  if (schema instanceof z.ZodDefault) {
    const def = schema._def.defaultValue;
    return typeof def === "function" ? def() : def;
  }
  return undefined;
}

export function humanizeLabel(path: string): string {
  const leaf = path.split(".").pop() ?? path;
  return leaf
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

const ID_REF_BY_FIELD: Record<string, import("./types.js").DbTable | import("./types.js").DbTable[]> = {
  id: "units",
  classId: "classes",
  promotionClassId: "classes",
  ref: "units",
  equip: "weapons",
  bossRef: "units",
};

export function resolveIdRefTable(
  fieldName: string,
  overrides?: Partial<Record<string, import("./types.js").DbTable | import("./types.js").DbTable[]>>,
): import("./types.js").DbTable | import("./types.js").DbTable[] | undefined {
  if (overrides?.[fieldName]) {
    return overrides[fieldName];
  }
  if (fieldName.endsWith("Id") && fieldName !== "id") {
    const base = fieldName.slice(0, -2);
    const tableMap: Record<string, import("./types.js").DbTable> = {
      class: "classes",
      weapon: "weapons",
      item: "items",
      skill: "skills",
      terrain: "terrain",
      unit: "units",
      promotionClass: "classes",
    };
    return tableMap[base];
  }
  return ID_REF_BY_FIELD[fieldName];
}

export function getAtPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function setAtPath<T extends object>(obj: T, path: string, value: unknown): T {
  const parts = path.split(".");
  if (parts.length === 1) {
    return { ...obj, [parts[0]!]: value };
  }
  const [head, ...rest] = parts;
  const child = (obj as Record<string, unknown>)[head!];
  const nextChild =
    child !== null && child !== undefined && typeof child === "object"
      ? child
      : {};
  return {
    ...obj,
    [head!]: setAtPath(nextChild as object, rest.join("."), value),
  };
}
