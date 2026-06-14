import { create } from "zustand";
import {
  EventDefinitionSchema,
  MapSchema,
  SCHEMA_VERSION,
  TerrainIdSchema,
  type EventDefinition,
  type MapData,
  type MapPlacement,
  type Project,
} from "@srpg/shared";
import { loadSampleTemplate } from "../lib/project/loadTemplate.js";
import { MemoryBackupStore, saveProjectAtomic } from "../lib/project/saveProject.js";
import { MemoryWriteTarget } from "../lib/project/atomicWrite.js";
import { createHistory, executeCommand, redo, undo, type Command, type HistoryState } from "./history.js";

export type EditorTab = "project" | "database" | "map" | "testplay" | "events";
export type DbTab = "units" | "classes" | "weapons" | "items" | "skills" | "terrain";
export type MapTool = "pen" | "unit";

export interface MapEditState {
  selectedTerrainId: string;
  selectedUnitId: string;
  selectedFaction: MapPlacement["faction"];
  selectedAiType: NonNullable<MapPlacement["aiType"]>;
  tool: MapTool;
  history: HistoryState<MapData>;
}

interface ProjectStore {
  project: Project | null;
  dirty: boolean;
  loading: boolean;
  error: string | null;
  activeTab: EditorTab;
  dbTab: DbTab;
  selectedDbId: string | null;
  selectedMapId: string | null;
  selectedEventId: string | null;
  fileName: string | null;
  runtimeDistUrl: string;
  mapEdit: MapEditState;
  testPlaySeed: number;
  testPlayInvincible: boolean;
  runtimeUrl: string;

  initNewProject: () => Promise<void>;
  openProjectData: (fileName: string, project: Project) => void;
  setActiveTab: (tab: EditorTab) => void;
  setDbTab: (tab: DbTab) => void;
  selectDbEntry: (id: string | null) => void;
  updateDbEntry: <K extends DbTab>(tab: K, id: string, value: Project["database"][K][string]) => void;
  addDbEntry: <K extends DbTab>(tab: K, id: string, value: Project["database"][K][string]) => void;
  deleteDbEntry: (tab: DbTab, id: string) => void;
  selectMap: (mapId: string | null) => void;
  updateMap: (mapId: string, map: MapData) => void;
  setMapTool: (tool: MapTool) => void;
  setSelectedTerrain: (terrainId: string) => void;
  setSelectedUnit: (unitId: string) => void;
  setSelectedFaction: (faction: MapPlacement["faction"]) => void;
  setSelectedAiType: (ai: NonNullable<MapPlacement["aiType"]>) => void;
  paintTile: (mapId: string, x: number, y: number) => void;
  placeUnit: (mapId: string, x: number, y: number) => void;
  removePlacementAt: (mapId: string, x: number, y: number) => void;
  setWinCondition: (mapId: string, type: "defeat_all_enemies") => void;
  mapUndo: (mapId: string) => void;
  mapRedo: (mapId: string) => void;
  selectEvent: (eventId: string | null) => void;
  addEvent: (id: string, event: EventDefinition) => void;
  updateEvent: (id: string, event: EventDefinition) => void;
  deleteEvent: (id: string) => void;
  setMapEventIds: (mapId: string, eventIds: string[]) => void;
  markClean: () => void;
  setError: (error: string | null) => void;
  setTestPlaySeed: (seed: number) => void;
  setTestPlayInvincible: (v: boolean) => void;
  saveToMemory: () => Promise<{ content: string; backups: string[] } | null>;
}

function defaultMapEdit(): MapEditState {
  return {
    selectedTerrainId: "terrain_plain",
    selectedUnitId: "unit_brigand",
    selectedFaction: "enemy",
    selectedAiType: "charge",
    tool: "pen",
    history: createHistory(),
  };
}

function withMap(project: Project, mapId: string, map: MapData): Project {
  return {
    ...project,
    maps: { ...project.maps, [mapId]: map },
  };
}

function applyMapCommand(
  get: () => ProjectStore,
  set: (partial: Partial<ProjectStore>) => void,
  mapId: string,
  command: Command<MapData>,
) {
  const { project, mapEdit } = get();
  if (!project) return;
  const map = project.maps[mapId];
  if (!map) return;
  const result = executeCommand(mapEdit.history, map, command);
  set({
    project: withMap(project, mapId, result.state),
    dirty: true,
    mapEdit: { ...mapEdit, history: result.history },
  });
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: null,
  dirty: false,
  loading: false,
  error: null,
  activeTab: "project",
  dbTab: "units",
  selectedDbId: null,
  selectedMapId: null,
  selectedEventId: null,
  fileName: null,
  mapEdit: defaultMapEdit(),
  testPlaySeed: 42_001,
  testPlayInvincible: false,
  runtimeUrl: "http://localhost:5174",
  runtimeDistUrl: "http://localhost:5174",

  async initNewProject() {
    set({ loading: true, error: null });
    try {
      const project = await loadSampleTemplate();
      const firstMapId = Object.keys(project.maps)[0] ?? null;
      set({
        project,
        dirty: false,
        loading: false,
        fileName: "sample-project.json",
        selectedMapId: firstMapId,
        selectedDbId: Object.keys(project.database.units)[0] ?? null,
        mapEdit: defaultMapEdit(),
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  openProjectData(fileName, project) {
    const firstMapId = Object.keys(project.maps)[0] ?? null;
    set({
      project,
      dirty: false,
      fileName,
      selectedMapId: firstMapId,
      selectedDbId: Object.keys(project.database.units)[0] ?? null,
      mapEdit: defaultMapEdit(),
      error: null,
    });
  },

  setActiveTab(tab) {
    set({ activeTab: tab });
  },

  setDbTab(tab) {
    set({ dbTab: tab, selectedDbId: null });
  },

  selectDbEntry(id) {
    set({ selectedDbId: id });
  },

  updateDbEntry(tab, id, value) {
    const { project } = get();
    if (!project) return;
    set({
      project: {
        ...project,
        database: {
          ...project.database,
          [tab]: { ...project.database[tab], [id]: value },
        },
      },
      dirty: true,
    });
  },

  addDbEntry(tab, id, value) {
    const { project } = get();
    if (!project || project.database[tab][id]) return;
    get().updateDbEntry(tab, id, value);
    set({ selectedDbId: id });
  },

  deleteDbEntry(tab, id) {
    const { project, selectedDbId } = get();
    if (!project) return;
    const next = { ...project.database[tab] };
    delete next[id];
    set({
      project: { ...project, database: { ...project.database, [tab]: next } },
      dirty: true,
      selectedDbId: selectedDbId === id ? null : selectedDbId,
    });
  },

  selectMap(mapId) {
    set({ selectedMapId: mapId, mapEdit: defaultMapEdit() });
  },

  updateMap(mapId, map) {
    const { project } = get();
    if (!project) return;
    set({ project: withMap(project, mapId, map), dirty: true });
  },

  setMapTool(tool) {
    set({ mapEdit: { ...get().mapEdit, tool } });
  },

  setSelectedTerrain(terrainId) {
    set({ mapEdit: { ...get().mapEdit, selectedTerrainId: terrainId } });
  },

  setSelectedUnit(unitId) {
    set({ mapEdit: { ...get().mapEdit, selectedUnitId: unitId } });
  },

  setSelectedFaction(faction) {
    set({ mapEdit: { ...get().mapEdit, selectedFaction: faction } });
  },

  setSelectedAiType(ai) {
    set({ mapEdit: { ...get().mapEdit, selectedAiType: ai } });
  },

  paintTile(mapId, x, y) {
    const { mapEdit, project } = get();
    if (!project) return;
    const map = project.maps[mapId];
    if (!map) return;
    const terrainId = TerrainIdSchema.parse(mapEdit.selectedTerrainId);
    const idx = y * map.width + x;
    const previous = map.layers.bottom[idx] ?? TerrainIdSchema.parse("terrain_plain");
    if (previous === terrainId) return;
    applyMapCommand(get, set, mapId, {
      label: `paint ${x},${y}`,
      apply(m) {
        const bottom = [...m.layers.bottom];
        bottom[idx] = terrainId;
        return { ...m, layers: { ...m.layers, bottom } };
      },
      revert(m) {
        const bottom = [...m.layers.bottom];
        bottom[idx] = previous;
        return { ...m, layers: { ...m.layers, bottom } };
      },
    });
  },

  placeUnit(mapId, x, y) {
    const { mapEdit, project } = get();
    if (!project) return;
    const map = project.maps[mapId];
    if (!map) return;
    const existing = map.placements.find((p) => p.x === x && p.y === y);
    const placement: MapPlacement = {
      ref: mapEdit.selectedUnitId as MapPlacement["ref"],
      x,
      y,
      faction: mapEdit.selectedFaction,
      isBoss: false,
      ...(mapEdit.selectedFaction === "enemy" ? { aiType: mapEdit.selectedAiType } : {}),
    };
    applyMapCommand(get, set, mapId, {
      label: `place unit ${x},${y}`,
      apply(m) {
        const without = m.placements.filter((p) => !(p.x === x && p.y === y));
        return { ...m, placements: [...without, placement] };
      },
      revert(m) {
        const without = m.placements.filter((p) => !(p.x === x && p.y === y));
        return { ...m, placements: existing ? [...without, existing] : without };
      },
    });
  },

  removePlacementAt(mapId, x, y) {
    const { project } = get();
    if (!project) return;
    const map = project.maps[mapId];
    if (!map) return;
    const removed = map.placements.find((p) => p.x === x && p.y === y);
    if (!removed) return;
    applyMapCommand(get, set, mapId, {
      label: `remove unit ${x},${y}`,
      apply(m) {
        return { ...m, placements: m.placements.filter((p) => !(p.x === x && p.y === y)) };
      },
      revert(m) {
        return { ...m, placements: [...m.placements, removed] };
      },
    });
  },

  setWinCondition(mapId, type) {
    const { project } = get();
    if (!project) return;
    const map = project.maps[mapId];
    if (!map) return;
    const prev = map.winCondition;
    applyMapCommand(get, set, mapId, {
      label: "win condition",
      apply(m) {
        return { ...m, winCondition: { type } };
      },
      revert(m) {
        return { ...m, winCondition: prev };
      },
    });
  },

  mapUndo(mapId) {
    const { project, mapEdit } = get();
    if (!project) return;
    const map = project.maps[mapId];
    if (!map) return;
    const result = undo(mapEdit.history, map);
    if (!result) return;
    set({
      project: withMap(project, mapId, result.state),
      dirty: true,
      mapEdit: { ...mapEdit, history: result.history },
    });
  },

  mapRedo(mapId) {
    const { project, mapEdit } = get();
    if (!project) return;
    const map = project.maps[mapId];
    if (!map) return;
    const result = redo(mapEdit.history, map);
    if (!result) return;
    set({
      project: withMap(project, mapId, result.state),
      dirty: true,
      mapEdit: { ...mapEdit, history: result.history },
    });
  },

  selectEvent(eventId) {
    set({ selectedEventId: eventId });
  },

  addEvent(id, event) {
    const { project } = get();
    if (!project || project.events?.[id]) return;
    const parsed = EventDefinitionSchema.parse(event);
    set({
      project: {
        ...project,
        events: { ...(project.events ?? {}), [id]: parsed },
      },
      dirty: true,
      selectedEventId: id,
    });
  },

  updateEvent(id, event) {
    const { project } = get();
    if (!project) return;
    const parsed = EventDefinitionSchema.parse(event);
    set({
      project: {
        ...project,
        events: { ...(project.events ?? {}), [id]: parsed },
      },
      dirty: true,
    });
  },

  deleteEvent(id) {
    const { project, selectedEventId } = get();
    if (!project) return;
    const next = { ...(project.events ?? {}) };
    delete next[id];
    const nextMaps = { ...project.maps };
    for (const [mapId, map] of Object.entries(nextMaps)) {
      if (map.eventIds?.includes(id as never)) {
        nextMaps[mapId] = {
          ...map,
          eventIds: map.eventIds.filter((eid) => eid !== id),
        };
      }
    }
    set({
      project: { ...project, events: next, maps: nextMaps },
      dirty: true,
      selectedEventId: selectedEventId === id ? null : selectedEventId,
    });
  },

  setMapEventIds(mapId, eventIds) {
    const { project } = get();
    if (!project) return;
    const map = project.maps[mapId];
    if (!map) return;
    set({
      project: withMap(project, mapId, { ...map, eventIds: eventIds as never[] }),
      dirty: true,
    });
  },

  markClean() {
    set({ dirty: false });
  },

  setError(error) {
    set({ error });
  },

  setTestPlaySeed(seed) {
    set({ testPlaySeed: seed });
  },

  setTestPlayInvincible(v) {
    set({ testPlayInvincible: v });
  },

  async saveToMemory() {
    const { project, fileName } = get();
    if (!project) return null;
    const key = fileName ?? project.name;
    const result = await saveProjectAtomic({
      project,
      target: new MemoryWriteTarget(),
      backupStore: new MemoryBackupStore(),
      projectKey: key,
    });
    set({ dirty: false });
    return result;
  },
}));

export function createBlankMap(id: string, name: string): MapData {
  const width = 10;
  const height = 10;
  const fill = Array.from({ length: width * height }, () => "terrain_plain" as const);
  return MapSchema.parse({
    id,
    name,
    width,
    height,
    layers: { bottom: [...fill] },
    placements: [],
    reinforcements: [],
    winCondition: { type: "defeat_all_enemies" },
    loseCondition: { allPlayerDefeated: true },
  });
}

export function createEmptyProject(name: string): Project {
  const map = createBlankMap("map_new", "新規マップ");
  return {
    schemaVersion: SCHEMA_VERSION,
    name,
    tileSize: 32,
    database: {
      units: {},
      classes: {},
      weapons: {},
      items: {},
      skills: {},
      terrain: {},
    },
    maps: { [map.id]: map },
    events: {},
  };
}
