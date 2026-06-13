import type { FieldDef, SchemaFormContext } from "./types.js";
import { createEmptyFromSchema } from "./inferFields.js";
import { getAtPath, setAtPath } from "./utils.js";

interface FieldRendererProps<T extends object> {
  field: FieldDef;
  value: T;
  onChange: (value: T) => void;
  context: SchemaFormContext;
}

function IdRefSelect({
  field,
  value,
  onChange,
  context,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
  context: SchemaFormContext;
}) {
  const table = field.idRefTable;
  const options = table ? (context.idOptions[table] ?? []) : [];
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid={`field-${field.path}`}
      aria-label={field.label}
    >
      <option value="">—</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function IdRefUnionSelect({
  field,
  value,
  onChange,
  context,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
  context: SchemaFormContext;
}) {
  const tables = field.idRefTables ?? [];
  const options = tables.flatMap((table) =>
    (context.idOptions[table] ?? []).map((opt) => ({ ...opt, table })),
  );
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid={`field-${field.path}`}
      aria-label={field.label}
    >
      <option value="">—</option>
      {options.map((opt) => (
        <option key={`${opt.table}:${opt.id}`} value={opt.id}>
          [{opt.table}] {opt.label}
        </option>
      ))}
    </select>
  );
}

export function FieldRenderer<T extends object>({
  field,
  value,
  onChange,
  context,
}: FieldRendererProps<T>) {
  const raw = getAtPath(value, field.path);
  const set = (next: unknown) => onChange(setAtPath(value, field.path, next));

  if (field.kind === "literal" || field.kind === "hidden") {
    return null;
  }

  if (field.kind === "object" && field.objectFields) {
    return (
      <fieldset className="schema-fieldset" data-testid={`fieldset-${field.path || "root"}`}>
        {field.path ? <legend>{field.label}</legend> : null}
        {field.objectFields.map((child) => (
          <div key={child.path} className="schema-field">
            <FieldRenderer field={child} value={value} onChange={onChange} context={context} />
          </div>
        ))}
      </fieldset>
    );
  }

  if (field.kind === "discriminatedUnion" && field.unionOptions) {
    const current = (getAtPath(value, field.path) ?? {}) as Record<string, unknown>;
    const activeType = String(current.type ?? field.unionOptions[0]?.type ?? "");
    const activeOption = field.unionOptions.find((o) => o.type === activeType) ?? field.unionOptions[0];
    return (
      <div className="schema-field" data-testid={`field-${field.path}`}>
        <label>
          {field.label}
          <select
            value={activeType}
            onChange={(e) => {
              const opt = field.unionOptions?.find((o) => o.type === e.target.value);
              if (opt) {
                const empty = createEmptyFromSchema(field.schema);
                const base =
                  empty !== null && typeof empty === "object"
                    ? (empty as Record<string, unknown>)
                    : {};
                const match = field.unionOptions?.find((o) => o.type === e.target.value);
                if (match) {
                  const fresh: Record<string, unknown> = { type: match.type };
                  for (const f of match.fields) {
                    const leaf = f.path.split(".").pop();
                    if (leaf && leaf !== "type") {
                      fresh[leaf] = createEmptyFromSchema(f.schema);
                    }
                  }
                  set({ ...base, ...fresh, type: match.type });
                }
              }
            }}
            aria-label={`${field.label} type`}
          >
            {field.unionOptions.map((opt) => (
              <option key={opt.type} value={opt.type}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        {activeOption?.fields.map((child) => (
          <FieldRenderer key={child.path} field={child} value={value} onChange={onChange} context={context} />
        ))}
      </div>
    );
  }

  if (field.kind === "record" && field.recordValueFields) {
    const record = (raw ?? {}) as Record<string, number>;
    return (
      <fieldset className="schema-fieldset" data-testid={`field-${field.path}`}>
        <legend>{field.label}</legend>
        {field.recordValueFields.map((child) => (
          <div key={child.path} className="schema-field">
            <label>
              {child.label}
              <input
                type="number"
                value={record[child.label] ?? 0}
                onChange={(e) => set({ ...record, [child.label]: Number(e.target.value) })}
                data-testid={`field-${child.path}`}
              />
            </label>
          </div>
        ))}
      </fieldset>
    );
  }

  if (field.kind === "array" && field.arrayItemFields) {
    const items = (raw ?? []) as unknown[];
    const itemTemplate = field.arrayItemFields;
    const isPrimitive = itemTemplate.length === 1 && itemTemplate[0]?.path.endsWith("[]");

    return (
      <fieldset className="schema-fieldset" data-testid={`field-${field.path}`}>
        <legend>{field.label}</legend>
        {items.map((item, index) => (
          <div key={index} className="schema-array-item">
            {isPrimitive && itemTemplate[0] ? (
              itemTemplate[0].kind === "idRef" || itemTemplate[0].kind === "idRefUnion" ? (
                itemTemplate[0].kind === "idRefUnion" ? (
                  <IdRefUnionSelect
                    field={{ ...itemTemplate[0], path: `${field.path}.${index}` }}
                    value={String(item ?? "")}
                    onChange={(v) => {
                      const next = [...items];
                      next[index] = v;
                      set(next);
                    }}
                    context={context}
                  />
                ) : (
                  <IdRefSelect
                    field={{ ...itemTemplate[0], path: `${field.path}.${index}` }}
                    value={String(item ?? "")}
                    onChange={(v) => {
                      const next = [...items];
                      next[index] = v;
                      set(next);
                    }}
                    context={context}
                  />
                )
              ) : (
                <input
                  value={String(item ?? "")}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = e.target.value;
                    set(next);
                  }}
                  data-testid={`field-${field.path}.${index}`}
                />
              )
            ) : (
              itemTemplate.map((child) => (
                <FieldRenderer
                  key={`${index}-${child.path}`}
                  field={{
                    ...child,
                    path: `${field.path}.${index}${child.path.startsWith(field.path) ? child.path.slice(field.path.length) : `.${child.path.split(".").pop()}`}`,
                  }}
                  value={value}
                  onChange={onChange}
                  context={context}
                />
              ))
            )}
            <button
              type="button"
              onClick={() => set(items.filter((_, i) => i !== index))}
              data-testid={`remove-${field.path}.${index}`}
            >
              削除
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            const itemField = itemTemplate[0];
            const newItem = itemField ? createEmptyFromSchema(itemField.schema) : "";
            set([...items, newItem]);
          }}
          data-testid={`add-${field.path}`}
        >
          追加
        </button>
      </fieldset>
    );
  }

  return (
    <div className="schema-field">
      <label>
        {field.label}
        {field.optional ? <span className="optional"> (任意)</span> : null}
        {field.kind === "string" && (
          <input
            type="text"
            value={String(raw ?? "")}
            onChange={(e) => set(e.target.value)}
            data-testid={`field-${field.path}`}
          />
        )}
        {field.kind === "number" && (
          <input
            type="number"
            value={Number(raw ?? 0)}
            onChange={(e) => set(Number(e.target.value))}
            data-testid={`field-${field.path}`}
          />
        )}
        {field.kind === "boolean" && (
          <input
            type="checkbox"
            checked={Boolean(raw)}
            onChange={(e) => set(e.target.checked)}
            data-testid={`field-${field.path}`}
          />
        )}
        {field.kind === "enum" && field.enumValues && (
          <select
            value={String(raw ?? field.enumValues[0])}
            onChange={(e) => set(e.target.value)}
            data-testid={`field-${field.path}`}
          >
            {field.enumValues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        )}
        {field.kind === "idRef" && (
          <IdRefSelect field={field} value={String(raw ?? "")} onChange={set} context={context} />
        )}
        {field.kind === "idRefUnion" && (
          <IdRefUnionSelect field={field} value={String(raw ?? "")} onChange={set} context={context} />
        )}
      </label>
    </div>
  );
}
