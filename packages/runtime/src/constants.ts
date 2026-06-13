/** Package identifier (re-exported from index). */
export const RUNTIME_PACKAGE = "@srpg/runtime" as const;

/** Tile pixel size for map rendering. */
export const TILE_SIZE = 32;

/** Sample chapter map dimensions. */
export const MAP_TILES = 10;

export const MAP_PX = TILE_SIZE * MAP_TILES;

/** HUD panel width (right of map). */
export const HUD_WIDTH = 160;

export const GAME_WIDTH = MAP_PX + HUD_WIDTH;

/** Map area height plus bottom status strip. */
export const GAME_HEIGHT = MAP_PX + 48;

export const DEFAULT_BATTLE_SEED = 42_001;

export const SAVE_KEY = "srpg-runtime-save";
