import type { WinCondition } from "@srpg/shared";
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
  const setMapLayer = useProjectStore((s) => s.setMapLayer);
  const paintRect = useProjectStore((s) => s.paintRect);
  const fillTile = useProjectStore((s) => s.fillTile);
  const setLoseCondition = useProjectStore((s) => s.setLoseCondition);
  const addReinforcement = useProjectStore((s) => s.addReinforcement);
  const removeReinforcement = useProjectStore((s) => s.removeReinforcement);
  const clearRectAnchor = useProjectStore((s) => s.clearRectAnchor);
  const setMapEventIds = useProjectStore((s) => s.setMapEventIds);

  if (!project) {
    return <p data-testid="map-tab">プロジェクトを読み込んでください。</p>;
  }

  const mapIds = Object.keys(project.maps);
  const map = selectedMapId ? project.maps[selectedMapId] : null;
  const terrains = Object.values(project.database.terrain);
  const eventList = Object.values(project.events ?? {});
  const attachedIds = map?.eventIds ?? [];

  const updateWinType = (type: WinCondition["type"]) => {
    if (!selectedMapId) return;
    switch (type) {
      case "defeat_all_enemies":
        setWinCondition(selectedMapId, { type });
        break;
      case "defeat_boss":
        setWinCondition(selectedMapId, {
          type,
          bossRef: mapEdit.selectedUnitId || "unit_brigand",
        });
        break;
      case "survive_turns":
        setWinCondition(selectedMapId, { type, turns: 10 });
        break;
      case "defend_point":
        setWinCondition(selectedMapId, { type, x: 4, y: 4, turns: 10 });
        break;
    }
  };

  const handleCellClick = (x: number, y: number, shift: boolean) => {
    if (!selectedMapId) return;
    if (shift) {
      removePlacementAt(selectedMapId, x, y);
      return;
    }
    switch (mapEdit.tool) {
      case "pen":
        paintTile(selectedMapId, x, y);
        break;
      case "fill":
        fillTile(selectedMapId, x, y);
        break;
      case "rect":
        paintRect(selectedMapId, x, y);
        break;
      case "unit":
        placeUnit(selectedMapId, x, y);
        break;
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
          className={mapEdit.tool === "rect" ? "active" : ""}
          onClick={() => setMapTool("rect")}
          data-testid="map-tool-rect"
        >
          矩形
        </button>
        <button
          type="button"
          className={mapEdit.tool === "fill" ? "active" : ""}
          onClick={() => setMapTool("fill")}
          data-testid="map-tool-fill"
        >
          塗りつぶし
        </button>
        <button
          type="button"
          className={mapEdit.tool === "unit" ? "active" : ""}
          onClick={() => setMapTool("unit")}
          data-testid="map-tool-unit"
        >
          ユニット配置
        </button>
        <label>
          レイヤー
          <select
            value={mapEdit.layer}
            onChange={(e) => setMapLayer(e.target.value as "bottom" | "top")}
            data-testid="map-layer-select"
          >
            <option value="bottom">bottom</option>
            <option value="top">top</option>
          </select>
        </label>
        {mapEdit.tool === "rect" && mapEdit.rectAnchor ? (
          <button type="button" onClick={() => clearRectAnchor()} data-testid="map-rect-cancel">
            矩形キャンセル
          </button>
        ) : null}
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
              onChange={(e) => updateWinType(e.target.value as WinCondition["type"])}
              data-testid="map-win-condition"
            >
              <option value="defeat_all_enemies">敵全滅</option>
              <option value="defeat_boss">ボス撃破</option>
              <option value="survive_turns">ターン数生存</option>
              <option value="defend_point">拠点防衛</option>
            </select>
            {map.winCondition.type === "defeat_boss" ? (
              <label>
                ボス ref
                <input
                  value={map.winCondition.bossRef}
                  onChange={(e) =>
                    selectedMapId &&
                    setWinCondition(selectedMapId, {
                      type: "defeat_boss",
                      bossRef: e.target.value,
                    })
                  }
                  data-testid="map-win-boss-ref"
                />
              </label>
            ) : null}
            {map.winCondition.type === "survive_turns" ? (
              <label>
                ターン数
                <input
                  type="number"
                  min={1}
                  value={map.winCondition.turns}
                  onChange={(e) =>
                    selectedMapId &&
                    setWinCondition(selectedMapId, {
                      type: "survive_turns",
                      turns: Number(e.target.value),
                    })
                  }
                  data-testid="map-win-turns"
                />
              </label>
            ) : null}
            {map.winCondition.type === "defend_point" ? (
              <div className="win-defend-fields">
                <label>
                  X
                  <input
                    type="number"
                    min={0}
                    value={map.winCondition.x}
                    onChange={(e) => {
                      if (!selectedMapId || map.winCondition.type !== "defend_point") return;
                      setWinCondition(selectedMapId, {
                        type: "defend_point",
                        x: Number(e.target.value),
                        y: map.winCondition.y,
                        turns: map.winCondition.turns,
                      });
                    }}
                    data-testid="map-win-defend-x"
                  />
                </label>
                <label>
                  Y
                  <input
                    type="number"
                    min={0}
                    value={map.winCondition.y}
                    onChange={(e) => {
                      if (!selectedMapId || map.winCondition.type !== "defend_point") return;
                      setWinCondition(selectedMapId, {
                        type: "defend_point",
                        x: map.winCondition.x,
                        y: Number(e.target.value),
                        turns: map.winCondition.turns,
                      });
                    }}
                    data-testid="map-win-defend-y"
                  />
                </label>
                <label>
                  ターン
                  <input
                    type="number"
                    min={1}
                    value={map.winCondition.turns}
                    onChange={(e) => {
                      if (!selectedMapId || map.winCondition.type !== "defend_point") return;
                      setWinCondition(selectedMapId, {
                        type: "defend_point",
                        x: map.winCondition.x,
                        y: map.winCondition.y,
                        turns: Number(e.target.value),
                      });
                    }}
                    data-testid="map-win-defend-turns"
                  />
                </label>
              </div>
            ) : null}
            <h3>敗北条件</h3>
            <label>
              <input
                type="checkbox"
                checked={map.loseCondition.allPlayerDefeated}
                onChange={(e) =>
                  selectedMapId &&
                  setLoseCondition(selectedMapId, {
                    ...map.loseCondition,
                    allPlayerDefeated: e.target.checked,
                  })
                }
                data-testid="map-lose-all-defeated"
              />
              自軍全滅で敗北
            </label>
            <label>
              ターン上限（任意）
              <input
                type="number"
                min={1}
                value={map.loseCondition.turnLimit ?? ""}
                onChange={(e) => {
                  if (!selectedMapId) return;
                  const raw = e.target.value;
                  setLoseCondition(selectedMapId, {
                    ...map.loseCondition,
                    turnLimit: raw === "" ? undefined : Number(raw),
                  });
                }}
                data-testid="map-lose-turn-limit"
              />
            </label>
            <h3>増援</h3>
            <button
              type="button"
              onClick={() =>
                selectedMapId &&
                addReinforcement(selectedMapId, {
                  turn: 3,
                  ref: mapEdit.selectedUnitId as never,
                  x: 5,
                  y: 5,
                  faction: "enemy",
                  aiType: mapEdit.selectedAiType,
                })
              }
              data-testid="map-reinforcement-add"
            >
              増援を追加
            </button>
            <ul className="reinforcement-list" data-testid="map-reinforcement-list">
              {map.reinforcements.map((r, index) => (
                <li key={`${r.turn}-${r.x}-${r.y}-${index}`}>
                  T{r.turn} {r.ref} ({r.x},{r.y})
                  <button
                    type="button"
                    onClick={() => selectedMapId && removeReinforcement(selectedMapId, index)}
                    data-testid={`map-reinforcement-remove-${index}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
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
                const layerTiles =
                  mapEdit.layer === "top"
                    ? (map.layers.top ?? map.layers.bottom)
                    : map.layers.bottom;
                const terrainId = layerTiles[idx] ?? "terrain_plain";
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
      <p className="hint">
        Shift+クリックでユニット削除。矩形は始点→終点の2クリック。
        {mapEdit.rectAnchor
          ? ` 矩形始点: (${mapEdit.rectAnchor.x},${mapEdit.rectAnchor.y})`
          : ""}
      </p>
    </section>
  );
}
