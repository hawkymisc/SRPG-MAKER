import { create } from "zustand";
import {
  EventDefinitionSchema,
  MapSchema,
  ChapterSchema,
  SCHEMA_VERSION,
  TerrainIdSchema,
  defaultStartChapterId,
  type Chapter,
  type ChapterId,
  type EventDefinition,
  type MapData,
  type MapPlacement,
  type Project,
  type Reinforcement,
  type WinCondition,
} from "@srpg/shared";
import { loadSampleTemplate } from "../lib/project/loadTemplate.js";
import {
  fillIndices,
  getLayerTiles,
  paintIndices,
  rectIndices,
  setLayerTiles,
  type MapLayerName,
} from "../lib/map/mapLayerUtils.js";
import { MemoryBackupStore, saveProjectAtomic } from "../lib/project/saveProject.js";
import { MemoryWriteTarget } from "../lib/project/atomicWrite.js";
import { createHistory, executeCommand, redo, undo, type Command, type HistoryState } from "./history.js";
import { toggleEnabledPlugin } from "../lib/project/plugins.js";
import type { ProjectSaveTarget, ProjectStorageKind } from "../lib/project/fileSystem.js";
import type { ProjectAssetFiles } from "../lib/project/projectAssets.js";

export type EditorTab = "project" | "database" | "map" | "testplay" | "events";
export type DbTab = "units" | "classes" | "weapons" | "items" | "skills" | "terrain";
export type MapTool = "pen" | "rect" | "fill" | "unit";

export interface MapEditState {
  selectedTerrainId: string;
  selectedUnitId: string;
  selectedFaction: MapPlacement["faction"];
  selectedAiType: NonNullable<MapPlacement["aiType"]>;
  tool: MapTool;
  layer: MapLayerName;
  rectAnchor: { x: number; y: number } | null;
  history: HistoryState<MapData>;
}

interface ProjectStore {
  project: Project | null;
  projectAssets: ProjectAssetFiles;
  dirty: boolean;
  loading: boolean;
  error: string | null;
  activeTab: EditorTab;
  dbTab: DbTab;
  selectedDbId: string | null;
  selectedMapId: string | null;
  selectedChapterId: ChapterId | null;
  selectedEventId: string | null;
  fileName: string | null;
  storageKind: ProjectStorageKind;
  projectLocation: string | null;
  runtimeDistUrl: string;
  mapEdit: MapEditState;
  testPlaySeed: number;
  testPlayInvincible: boolean;
  runtimeUrl: string;

  initNewProject: () => Promise<void>;
  openProjectData: (
    fileName: string,
    project: Project,
    meta?: {
      storageKind?: ProjectStorageKind;
      projectLocation?: string | null;
      assets?: ProjectAssetFiles;
    },
  ) => void;
  applySaveTarget: (target: ProjectSaveTarget) => void;
  setActiveTab: (tab: EditorTab) => void;
  setDbTab: (tab: DbTab) => void;
  selectDbEntry: (id: string | null) => void;
  updateDbEntry: <K extends DbTab>(tab: K, id: string, value: Project["database"][K][string]) => void;
  addDbEntry: <K extends DbTab>(tab: K, id: string, value: Project["database"][K][string]) => void;
  deleteDbEntry: (tab: DbTab, id: string) => void;
  selectMap: (mapId: string | null) => void;
  selectChapter: (chapterId: ChapterId | null) => void;
  addChapter: (chapter: Chapter) => void;
  updateChapter: (chapterId: ChapterId, chapter: Chapter) => void;
  removeChapter: (chapterId: ChapterId) => void;
  setStartChapterId: (chapterId: ChapterId | undefined) => void;
  togglePluginEnabled: (pluginId: string, enabled: boolean) => void;
  updateMap: (mapId: string, map: MapData) => void;
  setMapTool: (tool: MapTool) => void;
  setMapLayer: (layer: MapLayerName) => void;
  clearRectAnchor: () => void;
  setSelectedTerrain: (terrainId: string) => void;
  setSelectedUnit: (unitId: string) => void;
  setSelectedFaction: (faction: MapPlacement["faction"]) => void;
  setSelectedAiType: (ai: NonNullable<MapPlacement["aiType"]>) => void;
  paintTile: (mapId: string, x: number, y: number) => void;
  paintRect: (mapId: string, x: number, y: number) => void;
  fillTile: (mapId: string, x: number, y: number) => void;
  placeUnit: (mapId: string, x: number, y: number) => void;
  removePlacementAt: (mapId: string, x: number, y: number) => void;
  setWinCondition: (mapId: string, winCondition: WinCondition) => void;
  setLoseCondition: (
    mapId: string,
    loseCondition: MapData["loseCondition"],
  ) => void;
  addReinforcement: (mapId: string, reinforcement: Reinforcement) => void;
  removeReinforcement: (mapId: string, index: number) => void;
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
    layer: "bottom",
    rectAnchor: null,
    history: createHistory(),
  };
}

function pickInitialChapterId(project: Project): ChapterId | null {
  if (project.startChapterId && project.chapters?.[project.startChapterId]) {
    return project.startChapterId;
  }
  const fallback = defaultStartChapterId(project.chapters ?? {});
  return fallback ?? null;
}

function pickMapForChapter(project: Project, chapterId: ChapterId | null): string | null {
  if (!chapterId) {
    return Object.keys(project.maps)[0] ?? null;
  }
  const chapter = project.chapters?.[chapterId];
  if (chapter && project.maps[chapter.mapId]) {
    return chapter.mapId;
  }
  return Object.keys(project.maps)[0] ?? null;
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
  projectAssets: {},
  dirty: false,
  loading: false,
  error: null,
  activeTab: "project",
  dbTab: "units",
  selectedDbId: null,
  selectedMapId: null,
  selectedChapterId: null,
  selectedEventId: null,
  fileName: null,
  storageKind: "json",
  projectLocation: null,
  mapEdit: defaultMapEdit(),
  testPlaySeed: 42_001,
  testPlayInvincible: false,
  runtimeUrl: "http://localhost:5174",
  runtimeDistUrl: "http://localhost:5174",

  async initNewProject() {
    set({ loading: true, error: null });
    try {
      const project = await loadSampleTemplate();
      const chapterId = pickInitialChapterId(project);
      set({
        project,
        projectAssets: {},
        dirty: false,
        loading: false,
        fileName: "sample-project.json",
        storageKind: "json",
        projectLocation: null,
        selectedChapterId: chapterId,
        selectedMapId: pickMapForChapter(project, chapterId),
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

  openProjectData(fileName, project, meta) {
    const chapterId = pickInitialChapterId(project);
    set({
      project,
      projectAssets: meta?.assets ?? {},
      dirty: false,
      fileName,
      storageKind: meta?.storageKind ?? "json",
      projectLocation: meta?.projectLocation ?? null,
      selectedChapterId: chapterId,
      selectedMapId: pickMapForChapter(project, chapterId),
      selectedDbId: Object.keys(project.database.units)[0] ?? null,
      mapEdit: defaultMapEdit(),
      error: null,
    });
  },

  applySaveTarget(target) {
    set({
      fileName: target.fileName,
      storageKind: target.storageKind,
      projectLocation: target.projectLocation,
      dirty: false,
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

  selectChapter(chapterId) {
    const { project } = get();
    if (!project) return;
    set({
      selectedChapterId: chapterId,
      selectedMapId: pickMapForChapter(project, chapterId),
      mapEdit: defaultMapEdit(),
    });
  },

  addChapter(chapter) {
    const parsed = ChapterSchema.parse(chapter);
    const { project } = get();
    if (!project) return;
    const chapters = { ...(project.chapters ?? {}), [parsed.id]: parsed };
    set({
      project: {
        ...project,
        chapters,
        startChapterId: project.startChapterId ?? parsed.id,
      },
      dirty: true,
      selectedChapterId: parsed.id,
      selectedMapId: parsed.mapId,
    });
  },

  updateChapter(chapterId, chapter) {
    const parsed = ChapterSchema.parse(chapter);
    const { project } = get();
    if (!project || !project.chapters?.[chapterId]) return;
    set({
      project: {
        ...project,
        chapters: { ...project.chapters, [chapterId]: parsed },
      },
      dirty: true,
    });
  },

  removeChapter(chapterId) {
    const { project, selectedChapterId } = get();
    if (!project?.chapters?.[chapterId]) return;
    const rest = Object.fromEntries(
      Object.entries(project.chapters).filter(([id]) => id !== chapterId),
    ) as Project["chapters"];
    const nextStart =
      project.startChapterId === chapterId ? defaultStartChapterId(rest) : project.startChapterId;
    const nextChapterId =
      selectedChapterId === chapterId ? defaultStartChapterId(rest) ?? null : selectedChapterId;
    set({
      project: {
        ...project,
        chapters: rest,
        startChapterId: nextStart,
      },
      dirty: true,
      selectedChapterId: nextChapterId,
      selectedMapId: pickMapForChapter({ ...project, chapters: rest }, nextChapterId),
    });
  },

  setStartChapterId(chapterId) {
    const { project } = get();
    if (!project) return;
    if (chapterId !== undefined && !project.chapters?.[chapterId]) return;
    set({
      project: { ...project, startChapterId: chapterId },
      dirty: true,
    });
  },

  togglePluginEnabled(pluginId, enabled) {
    const { project } = get();
    if (!project?.plugins?.[pluginId]) return;
    set({
      project: {
        ...project,
        enabledPlugins: toggleEnabledPlugin(project.enabledPlugins ?? [], pluginId, enabled),
      },
      dirty: true,
    });
  },

  updateMap(mapId, map) {
    const { project } = get();
    if (!project) return;
    set({ project: withMap(project, mapId, map), dirty: true });
  },

  setMapTool(tool) {
    set({ mapEdit: { ...get().mapEdit, tool, rectAnchor: null } });
  },

  setMapLayer(layer) {
    set({ mapEdit: { ...get().mapEdit, layer } });
  },

  clearRectAnchor() {
    set({ mapEdit: { ...get().mapEdit, rectAnchor: null } });
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
    const layer = mapEdit.layer;
    const tiles = getLayerTiles(map, layer);
    const previous = tiles[idx] ?? TerrainIdSchema.parse("terrain_plain");
    if (previous === terrainId) return;
    applyMapCommand(get, set, mapId, {
      label: `paint ${x},${y}`,
      apply(m) {
        const next = paintIndices(getLayerTiles(m, layer), m.width, [idx], terrainId);
        return setLayerTiles(m, layer, next);
      },
      revert(m) {
        const next = paintIndices(getLayerTiles(m, layer), m.width, [idx], previous);
        return setLayerTiles(m, layer, next);
      },
    });
  },

  paintRect(mapId, x, y) {
    const { mapEdit, project } = get();
    if (!project) return;
    const map = project.maps[mapId];
    if (!map) return;
    if (!mapEdit.rectAnchor) {
      set({ mapEdit: { ...mapEdit, rectAnchor: { x, y } } });
      return;
    }
    const anchor = mapEdit.rectAnchor;
    const terrainId = TerrainIdSchema.parse(mapEdit.selectedTerrainId);
    const layer = mapEdit.layer;
    const indices = rectIndices(map.width, anchor.x, anchor.y, x, y);
    const before = getLayerTiles(map, layer);
    applyMapCommand(get, set, mapId, {
      label: `rect ${anchor.x},${anchor.y}-${x},${y}`,
      apply(m) {
        const next = paintIndices(getLayerTiles(m, layer), m.width, indices, terrainId);
        return setLayerTiles(m, layer, next);
      },
      revert(m) {
        return setLayerTiles(m, layer, [...before]);
      },
    });
    set({ mapEdit: { ...mapEdit, rectAnchor: null } });
  },

  fillTile(mapId, x, y) {
    const { mapEdit, project } = get();
    if (!project) return;
    const map = project.maps[mapId];
    if (!map) return;
    const terrainId = TerrainIdSchema.parse(mapEdit.selectedTerrainId);
    const layer = mapEdit.layer;
    const before = getLayerTiles(map, layer);
    const indices = fillIndices(before, map.width, map.height, x, y, terrainId);
    if (indices.length === 0) return;
    applyMapCommand(get, set, mapId, {
      label: `fill ${x},${y}`,
      apply(m) {
        const next = paintIndices(getLayerTiles(m, layer), m.width, indices, terrainId);
        return setLayerTiles(m, layer, next);
      },
      revert(m) {
        return setLayerTiles(m, layer, [...before]);
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

  setWinCondition(mapId, winCondition) {
    const { project } = get();
    if (!project) return;
    const map = project.maps[mapId];
    if (!map) return;
    const prev = map.winCondition;
    applyMapCommand(get, set, mapId, {
      label: "win condition",
      apply(m) {
        return { ...m, winCondition };
      },
      revert(m) {
        return { ...m, winCondition: prev };
      },
    });
  },

  setLoseCondition(mapId, loseCondition) {
    const { project } = get();
    if (!project) return;
    const map = project.maps[mapId];
    if (!map) return;
    const prev = map.loseCondition;
    applyMapCommand(get, set, mapId, {
      label: "lose condition",
      apply(m) {
        return { ...m, loseCondition };
      },
      revert(m) {
        return { ...m, loseCondition: prev };
      },
    });
  },

  addReinforcement(mapId, reinforcement) {
    const { project } = get();
    if (!project) return;
    applyMapCommand(get, set, mapId, {
      label: "add reinforcement",
      apply(m) {
        return { ...m, reinforcements: [...m.reinforcements, reinforcement] };
      },
      revert(m) {
        return {
          ...m,
          reinforcements: m.reinforcements.slice(0, -1),
        };
      },
    });
  },

  removeReinforcement(mapId, index) {
    const { project } = get();
    if (!project) return;
    const map = project.maps[mapId];
    if (!map) return;
    const removed = map.reinforcements[index];
    if (!removed) return;
    applyMapCommand(get, set, mapId, {
      label: "remove reinforcement",
      apply(m) {
        return {
          ...m,
          reinforcements: m.reinforcements.filter((_, i) => i !== index),
        };
      },
      revert(m) {
        const next = [...m.reinforcements];
        next.splice(index, 0, removed);
        return { ...m, reinforcements: next };
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
    chapters: {},
    plugins: {},
    enabledPlugins: [],
    supports: {},
  };
}
