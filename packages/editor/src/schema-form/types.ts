import type { z } from "zod";

export type DbTable =
  | "units"
  | "classes"
  | "weapons"
  | "items"
  | "skills"
  | "terrain";

export type FieldKind =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "idRef"
  | "idRefUnion"
  | "object"
  | "array"
  | "record"
  | "discriminatedUnion"
  | "literal"
  | "hidden";

export interface FieldDef {
  path: string;
  label: string;
  kind: FieldKind;
  optional: boolean;
  schema: z.ZodTypeAny;
  enumValues?: string[];
  idRefTable?: DbTable;
  idRefTables?: DbTable[];
  objectFields?: FieldDef[];
  arrayItemFields?: FieldDef[];
  recordValueFields?: FieldDef[];
  unionOptions?: DiscriminatedOption[];
  literalValue?: string | number | boolean;
}

export interface DiscriminatedOption {
  type: string;
  label: string;
  fields: FieldDef[];
}

export interface SchemaFormContext {
  idOptions: Partial<Record<DbTable, Array<{ id: string; label: string }>>>;
  hiddenPaths?: Set<string>;
  idRefOverrides?: Partial<Record<string, DbTable | DbTable[]>>;
}

export interface SchemaFormProps<T> {
  schema: z.ZodType<T>;
  value: T;
  onChange: (value: T) => void;
  context: SchemaFormContext;
  /** Top-level only: skip id field (managed by list UI). */
  hideId?: boolean;
}
