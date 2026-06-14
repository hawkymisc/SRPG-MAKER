import { useProjectStore } from "../store/projectStore.js";

const TILE_COLORS: Record<string, string> = {
  terrain_plain: "#6b8e4e",
  terrain_forest: "#2d5a27",
  terrain_fort: "#8b7355",
  terrain_mountain: "#6b6b6b",
  terrain_water: "#3d85c6",
};

const FACTION_COLORS: Record<string, string> = {
  player: "#4a9eff",
  enemy: "#ff4a4a",
  third: "#d4a72c",
};

export function MapTab() {
  const project = useProjectStore((s) => s.project);
  const selectedMapId = useProjectStore((s) => s.selectedMapId);
  const mapEdit = useProjectStore((s) => s.mapEdit);
  const selectMap = useProjectStore((s) => s.selectMap);
  const setMapTool = useProjectStore((s) => s.setMapTool);
  const setSelectedTerrain = useProjectStore((s) => s.setSelectedTerrain);
  const setSelectedUnit = useProjectStore((s) => s.setSelectedUnit);
  const setSelectedFaction = useProjectStore((s) => s.setSelectedFaction);
  const setSelectedAiType = useProjectStore((s) => s.setSelectedAiType);
  const paintTile = useProjectStore((s) => s.paintTile);
  const placeUnit = useProjectStore((s) => s.placeUnit);
  const removePlacementAt = useProjectStore((s) => s.removePlacementAt);
  const setWinCondition = useProjectStore((s) => s.setWinCondition);
  const mapUndo = useProjectStore((s) => s.mapUndo);
  const mapRedo = useProjectStore((s) => s.mapRedo);
  const setMapEventIds = useProjectStore((s) => s.setMapEventIds);

  if (!project) {
    return <p data-testid="map-tab">プロジェクトを読み込んでください。</p>;
  }

  const mapIds = Object.keys(project.maps);
  const map = selectedMapId ? project.maps[selectedMapId] : null;
  const terrains = Object.values(project.database.terrain);
  const eventList = Object.values(project.events ?? {});
  const attachedIds = map?.eventIds ?? [];

  const handleCellClick = (x: number, y: number, shift: boolean) => {
    if (!selectedMapId) return;
    if (shift) {
      removePlacementAt(selectedMapId, x, y);
      return;
    }
    if (mapEdit.tool === "pen") {
      paintTile(selectedMapId, x, y);
    } else {
      placeUnit(selectedMapId, x, y);
    }
  };

  return (
    <section className="panel map-panel" data-testid="map-tab">
      <div className="map-toolbar">
        <label>
          マップ
          <select
            value={selectedMapId ?? ""}
            onChange={(e) => selectMap(e.target.value || null)}
            data-testid="map-select"
          >
            {mapIds.map((id) => (
              <option key={id} value={id}>
                {project.maps[id]?.name ?? id}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={mapEdit.tool === "pen" ? "active" : ""}
          onClick={() => setMapTool("pen")}
          data-testid="map-tool-pen"
        >
          ペン
        </button>
        <button
          type="button"
          className={mapEdit.tool === "unit" ? "active" : ""}
          onClick={() => setMapTool("unit")}
          data-testid="map-tool-unit"
        >
          ユニット配置
        </button>
        <button type="button" onClick={() => selectedMapId && mapUndo(selectedMapId)} data-testid="map-undo">
          元に戻す
        </button>
        <button type="button" onClick={() => selectedMapId && mapRedo(selectedMapId)} data-testid="map-redo">
          やり直し
        </button>
      </div>

      {map ? (
        <div className="map-layout">
          <aside className="map-palette">
            <h3>タイル</h3>
            <div className="palette-grid">
              {terrains.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={mapEdit.selectedTerrainId === t.id ? "active" : ""}
                  style={{ background: TILE_COLORS[t.id] ?? "#444" }}
                  onClick={() => {
                    setSelectedTerrain(t.id);
                    setMapTool("pen");
                  }}
                  title={t.name}
                  data-testid={`terrain-${t.id}`}
                >
                  {t.name.slice(0, 2)}
                </button>
              ))}
            </div>
            <h3>ユニット</h3>
            <select
              value={mapEdit.selectedUnitId}
              onChange={(e) => setSelectedUnit(e.target.value)}
              data-testid="map-unit-select"
            >
              {Object.values(project.database.units).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <label>
              所属
              <select
                value={mapEdit.selectedFaction}
                onChange={(e) => setSelectedFaction(e.target.value as typeof mapEdit.selectedFaction)}
                data-testid="map-faction-select"
              >
                <option value="player">player</option>
                <option value="enemy">enemy</option>
                <option value="third">third</option>
              </select>
            </label>
            <label>
              AI
              <select
                value={mapEdit.selectedAiType}
                onChange={(e) => setSelectedAiType(e.target.value as typeof mapEdit.selectedAiType)}
                data-testid="map-ai-select"
              >
                <option value="charge">charge</option>
                <option value="ambush">ambush</option>
                <option value="guard">guard</option>
                <option value="move_only">move_only</option>
              </select>
            </label>
            <h3>勝利条件</h3>
            <select
              value={map.winCondition.type}
              onChange={(e) => {
                if (e.target.value === "defeat_all_enemies" && selectedMapId) {
                  setWinCondition(selectedMapId, "defeat_all_enemies");
                }
              }}
              data-testid="map-win-condition"
            >
              <option value="defeat_all_enemies">defeat_all_enemies</option>
            </select>
            <h3>イベント</h3>
            <select
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (!id || !selectedMapId || attachedIds.includes(id as never)) return;
                setMapEventIds(selectedMapId, [...attachedIds, id]);
              }}
              data-testid="map-event-attach"
              aria-label="イベントをマップに追加"
            >
              <option value="">— 追加 —</option>
              {eventList
                .filter((ev) => !attachedIds.includes(ev.id))
                .map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name ?? ev.id}
                  </option>
                ))}
            </select>
            <ul className="map-event-list" data-testid="map-event-list">
              {attachedIds.map((id) => {
                const ev = project.events?.[id];
                return (
                  <li key={id}>
                    <span data-testid={`map-event-${id}`}>{ev?.name ?? id}</span>
                    <button
                      type="button"
                      onClick={() =>
                        selectedMapId &&
                        setMapEventIds(
                          selectedMapId,
                          attachedIds.filter((eid) => eid !== id),
                        )
                      }
                      data-testid={`map-event-detach-${id}`}
                      aria-label={`${id} を外す`}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
          <div
            className="map-grid"
            style={{
              gridTemplateColumns: `repeat(${map.width}, 28px)`,
            }}
            data-testid="map-grid"
          >
            {Array.from({ length: map.height }, (_, y) =>
              Array.from({ length: map.width }, (_, x) => {
                const idx = y * map.width + x;
                const terrainId = map.layers.bottom[idx] ?? "terrain_plain";
                const placement = map.placements.find((p) => p.x === x && p.y === y);
                return (
                  <button
                    key={`${x}-${y}`}
                    type="button"
                    className="map-cell"
                    style={{ background: TILE_COLORS[terrainId] ?? "#333" }}
                    onClick={(e) => handleCellClick(x, y, e.shiftKey)}
                    data-testid={`map-cell-${x}-${y}`}
                    aria-label={`${x},${y}`}
                  >
                    {placement ? (
                      <span
                        className="unit-marker"
                        style={{ color: FACTION_COLORS[placement.faction] ?? "#fff" }}
                      >
                        ●
                      </span>
                    ) : null}
                  </button>
                );
              }),
            )}
          </div>
        </div>
      ) : (
        <p>マップを選択してください。</p>
      )}
      <p className="hint">Shift+クリックでユニット削除</p>
    </section>
  );
}
