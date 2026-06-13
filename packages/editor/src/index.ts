/** @srpg/editor — React editor application */
export const EDITOR_PACKAGE = "@srpg/editor" as const;
export { SchemaForm, buildIdOptions, inferFields } from "./schema-form/index.js";
export type { SchemaFormContext, FieldDef, DbTable } from "./schema-form/index.js";
