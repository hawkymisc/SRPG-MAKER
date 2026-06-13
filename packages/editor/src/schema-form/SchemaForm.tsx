import { inferFields } from "./inferFields.js";
import { FieldRenderer } from "./FieldRenderer.js";
import type { SchemaFormContext, SchemaFormProps } from "./types.js";

export function SchemaForm<T extends object>({
  schema,
  value,
  onChange,
  context,
  hideId = false,
}: SchemaFormProps<T>) {
  const fields = inferFields(schema, "", context, hideId);
  return (
    <form
      className="schema-form"
      onSubmit={(e) => e.preventDefault()}
      data-testid="schema-form"
    >
      {fields.map((field) => (
        <FieldRenderer key={field.path || field.label} field={field} value={value} onChange={onChange} context={context} />
      ))}
    </form>
  );
}

export function buildIdOptions(
  database: Record<string, Record<string, { id: string; name: string }>>,
): SchemaFormProps<object>["context"]["idOptions"] {
  return {
    units: Object.values(database.units ?? {}).map((u) => ({ id: u.id, label: u.name })),
    classes: Object.values(database.classes ?? {}).map((c) => ({ id: c.id, label: c.name })),
    weapons: Object.values(database.weapons ?? {}).map((w) => ({ id: w.id, label: w.name })),
    items: Object.values(database.items ?? {}).map((i) => ({ id: i.id, label: i.name })),
    skills: Object.values(database.skills ?? {}).map((s) => ({ id: s.id, label: s.name })),
    terrain: Object.values(database.terrain ?? {}).map((t) => ({ id: t.id, label: t.name })),
  };
}

export type { SchemaFormContext, SchemaFormProps };
export { inferFields } from "./inferFields.js";
export type { FieldDef, DbTable } from "./types.js";
