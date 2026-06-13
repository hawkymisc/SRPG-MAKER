import { z } from "zod";
import type { DiscriminatedOption, FieldDef, SchemaFormContext } from "./types.js";
import {
  getDefaultValue,
  humanizeLabel,
  isOptional,
  resolveIdRefTable,
  unwrapZod,
} from "./utils.js";

function inferObjectFields(
  schema: z.ZodObject<z.ZodRawShape>,
  basePath: string,
  context: SchemaFormContext,
  hideId: boolean,
): FieldDef[] {
  const shape = schema.shape;
  const fields: FieldDef[] = [];
  for (const [key, rawField] of Object.entries(shape)) {
    const path = basePath ? `${basePath}.${key}` : key;
    if (hideId && key === "id" && !basePath) continue;
    if (context.hiddenPaths?.has(path)) continue;
    fields.push(...inferFields(rawField as z.ZodTypeAny, path, context, false));
  }
  return fields;
}

function inferDiscriminatedUnion(
  schema: z.ZodDiscriminatedUnion<string, z.ZodObject<z.ZodRawShape>[]>,
  path: string,
  context: SchemaFormContext,
): FieldDef {
  const options = schema.options as z.ZodObject<z.ZodRawShape>[];
  const unionOptions: DiscriminatedOption[] = options.map((opt) => {
    const typeField = opt.shape.type as z.ZodLiteral<string>;
    const type = typeField._def.value as string;
    const fields = inferObjectFields(opt, path, context, false).filter((f) => f.path !== `${path}.type`);
    return { type, label: type, fields };
  });
  return {
    path,
    label: humanizeLabel(path),
    kind: "discriminatedUnion",
    optional: false,
    schema,
    unionOptions,
  };
}

export function inferFields(
  schema: z.ZodTypeAny,
  path: string,
  context: SchemaFormContext,
  hideId: boolean,
): FieldDef[] {
  const outer = schema;
  const optional = isOptional(outer);
  const inner = unwrapZod(outer);
  const label = humanizeLabel(path);

  if (inner instanceof z.ZodLiteral) {
    return [
      {
        path,
        label,
        kind: "literal",
        optional,
        schema: outer,
        literalValue: inner._def.value as string | number | boolean,
      },
    ];
  }

  if (inner instanceof z.ZodString) {
    const fieldName = path.split(".").pop() ?? path;
    const idRef = resolveIdRefTable(fieldName, context.idRefOverrides);
    if (idRef) {
      if (Array.isArray(idRef)) {
        return [
          {
            path,
            label,
            kind: "idRefUnion",
            optional,
            schema: outer,
            idRefTables: idRef,
          },
        ];
      }
      return [
        {
          path,
          label,
          kind: "idRef",
          optional,
          schema: outer,
          idRefTable: idRef,
        },
      ];
    }
    return [{ path, label, kind: "string", optional, schema: outer }];
  }

  if (inner instanceof z.ZodNumber) {
    return [{ path, label, kind: "number", optional, schema: outer }];
  }

  if (inner instanceof z.ZodBoolean) {
    return [{ path, label, kind: "boolean", optional, schema: outer }];
  }

  if (inner instanceof z.ZodEnum) {
    return [
      {
        path,
        label,
        kind: "enum",
        optional,
        schema: outer,
        enumValues: inner._def.values as string[],
      },
    ];
  }

  if (inner instanceof z.ZodObject) {
    const objectFields = inferObjectFields(inner, path, context, hideId);
    if (path) {
      return [
        {
          path,
          label,
          kind: "object",
          optional,
          schema: outer,
          objectFields,
        },
      ];
    }
    return objectFields;
  }

  if (inner instanceof z.ZodArray) {
    const itemSchema = inner._def.type as z.ZodTypeAny;
    const unwrappedItem = unwrapZod(itemSchema);
    let arrayItemFields: FieldDef[] | undefined;
    if (unwrappedItem instanceof z.ZodObject) {
      arrayItemFields = inferObjectFields(unwrappedItem, `${path}[]`, context, false);
    } else if (unwrappedItem instanceof z.ZodString) {
      const fieldName = path.split(".").pop() ?? path;
      const idRef = resolveIdRefTable(fieldName, context.idRefOverrides);
      arrayItemFields = [
        {
          path: `${path}[]`,
          label: "Item",
          kind: Array.isArray(idRef) ? "idRefUnion" : idRef ? "idRef" : "string",
          optional: false,
          schema: itemSchema,
          ...(Array.isArray(idRef)
            ? { idRefTables: idRef }
            : idRef
              ? { idRefTable: idRef }
              : {}),
        },
      ];
    } else {
      arrayItemFields = inferFields(itemSchema, `${path}[]`, context, false);
    }
    return [
      {
        path,
        label,
        kind: "array",
        optional,
        schema: outer,
        arrayItemFields,
      },
    ];
  }

  if (inner instanceof z.ZodRecord) {
    const valueSchema = inner._def.valueType as z.ZodTypeAny;
    const keySchema = inner._def.keyType as z.ZodTypeAny;
    const unwrappedKey = unwrapZod(keySchema);
    if (unwrappedKey instanceof z.ZodEnum) {
      const keys = unwrappedKey._def.values as string[];
      const recordValueFields = keys.map((key) => ({
        path: `${path}.${key}`,
        label: key,
        kind: "number" as const,
        optional: false,
        schema: valueSchema,
      }));
      return [
        {
          path,
          label,
          kind: "record",
          optional,
          schema: outer,
          recordValueFields,
        },
      ];
    }
    return [{ path, label, kind: "string", optional, schema: outer }];
  }

  if (inner instanceof z.ZodDiscriminatedUnion) {
    return [inferDiscriminatedUnion(inner as z.ZodDiscriminatedUnion<string, z.ZodObject<z.ZodRawShape>[]>, path, context)];
  }

  if (inner instanceof z.ZodUnion) {
    const options = inner._def.options as z.ZodTypeAny[];
    const allStrings = options.every((o) => unwrapZod(o) instanceof z.ZodString);
    if (allStrings) {
      const tables = context.idRefOverrides?.[path.split(".").pop() ?? ""] ??
        resolveIdRefTable(path.split(".").pop() ?? "", context.idRefOverrides);
      if (tables) {
        return [
          {
            path,
            label,
            kind: Array.isArray(tables) ? "idRefUnion" : "idRef",
            optional,
            schema: outer,
            ...(Array.isArray(tables) ? { idRefTables: tables } : { idRefTable: tables }),
          },
        ];
      }
    }
  }

  return [{ path, label, kind: "string", optional, schema: outer }];
}

export function createEmptyFromSchema(schema: z.ZodTypeAny): unknown {
  const inner = unwrapZod(schema);
  if (schema instanceof z.ZodDefault) {
    return getDefaultValue(schema);
  }
  if (inner instanceof z.ZodString) return "";
  if (inner instanceof z.ZodNumber) return 0;
  if (inner instanceof z.ZodBoolean) return false;
  if (inner instanceof z.ZodEnum) return (inner._def.values as string[])[0];
  if (inner instanceof z.ZodArray) return [];
  if (inner instanceof z.ZodObject) {
    const out: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(inner.shape)) {
      out[key] = createEmptyFromSchema(field as z.ZodTypeAny);
    }
    return out;
  }
  if (inner instanceof z.ZodRecord) return {};
  if (inner instanceof z.ZodDiscriminatedUnion) {
    const first = (inner.options as z.ZodObject<z.ZodRawShape>[])[0];
    if (first) return createEmptyFromSchema(first);
  }
  return null;
}
