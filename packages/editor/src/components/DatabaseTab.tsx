import {
  ClassSchema,
  ItemSchema,
  SkillSchema,
  TerrainSchema,
  UnitSchema,
  WeaponSchema,
  createDefaultStats,
  createDefaultWeapon,
} from "@srpg/shared";
import type { z } from "zod";
import { SchemaForm, buildIdOptions } from "../schema-form/index.js";
import { useProjectStore, type DbTab } from "../store/projectStore.js";

const DB_TABS: Array<{ id: DbTab; label: string; schema: z.ZodType<object> }> = [
  { id: "units", label: "ユニット", schema: UnitSchema },
  { id: "classes", label: "クラス", schema: ClassSchema },
  { id: "weapons", label: "武器", schema: WeaponSchema },
  { id: "items", label: "アイテム", schema: ItemSchema },
  { id: "skills", label: "スキル", schema: SkillSchema },
  { id: "terrain", label: "地形", schema: TerrainSchema },
];

function defaultEntry(tab: DbTab, id: string): object {
  switch (tab) {
    case "units":
      return UnitSchema.parse({
        id,
        name: "新規ユニット",
        classId: "class_soldier",
        stats: createDefaultStats(),
        growth: { hp: 50, str: 40, mag: 0, skl: 40, spd: 40, lck: 30, def: 30, res: 10 },
      });
    case "classes":
      return ClassSchema.parse({
        id,
        name: "新規クラス",
        moveType: "infantry",
        baseStats: createDefaultStats(),
      });
    case "weapons":
      return createDefaultWeapon({ id: id as never, name: "新規武器" });
    case "items":
      return ItemSchema.parse({ id, name: "新規アイテム", uses: 1, effect: { type: "heal", amount: 10 } });
    case "skills":
      return SkillSchema.parse({ id, name: "新規スキル" });
    case "terrain":
      return TerrainSchema.parse({
        id,
        name: "新規地形",
        moveCosts: { infantry: 1, cavalry: 2, flying: 1, armored: 2 },
      });
  }
}

export function DatabaseTab() {
  const project = useProjectStore((s) => s.project);
  const dbTab = useProjectStore((s) => s.dbTab);
  const selectedDbId = useProjectStore((s) => s.selectedDbId);
  const setDbTab = useProjectStore((s) => s.setDbTab);
  const selectDbEntry = useProjectStore((s) => s.selectDbEntry);
  const updateDbEntry = useProjectStore((s) => s.updateDbEntry);
  const addDbEntry = useProjectStore((s) => s.addDbEntry);
  const deleteDbEntry = useProjectStore((s) => s.deleteDbEntry);

  if (!project) {
    return <p data-testid="database-tab">プロジェクトを読み込んでください。</p>;
  }

  const tabDef = DB_TABS.find((t) => t.id === dbTab)!;
  const records = project.database[dbTab];
  const ids = Object.keys(records);
  const selected = selectedDbId ? records[selectedDbId] : null;

  const handleAdd = () => {
    const id = `new_${dbTab}_${ids.length + 1}`;
    addDbEntry(dbTab, id, defaultEntry(dbTab, id) as never);
  };

  return (
    <section className="panel db-panel" data-testid="database-tab">
      <nav className="subtabs" aria-label="データベースカテゴリ">
        {DB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={dbTab === tab.id ? "active" : ""}
            onClick={() => setDbTab(tab.id)}
            data-testid={`db-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="db-layout">
        <aside className="db-list">
          <button type="button" onClick={handleAdd} data-testid="db-add-entry">
            追加
          </button>
          <ul>
            {ids.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  className={selectedDbId === id ? "active" : ""}
                  onClick={() => selectDbEntry(id)}
                  data-testid={`db-entry-${id}`}
                >
                  {(records[id] as { name?: string }).name ?? id}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <div className="db-form">
          {selected ? (
            <>
              <div className="db-form-toolbar">
                <span data-testid="db-selected-id">{selectedDbId}</span>
                <button
                  type="button"
                  onClick={() => selectedDbId && deleteDbEntry(dbTab, selectedDbId)}
                  data-testid="db-delete-entry"
                >
                  削除
                </button>
              </div>
              <SchemaForm
                schema={tabDef.schema}
                value={selected}
                hideId
                onChange={(value) => selectedDbId && updateDbEntry(dbTab, selectedDbId, value as never)}
                context={{
                  idOptions: buildIdOptions(project.database),
                  idRefOverrides: { items: ["weapons", "items"] },
                }}
              />
            </>
          ) : (
            <p>左のリストからエントリを選択するか、追加してください。</p>
          )}
        </div>
      </div>
    </section>
  );
}
