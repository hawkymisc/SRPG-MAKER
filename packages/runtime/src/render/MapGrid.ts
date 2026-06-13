import Phaser from "phaser";
import type { MapData } from "@srpg/shared";
import type { BattleDatabase } from "@srpg/shared";
import { MAP_PX, TILE_SIZE } from "../constants.js";

const TERRAIN_COLORS: Record<string, number> = {
  terrain_plain: 0x8bc34a,
  terrain_forest: 0x2e7d32,
  terrain_fort: 0x795548,
  terrain_wall: 0x424242,
};

export class MapGrid {
  private readonly layer: Phaser.GameObjects.Layer;

  constructor(
    scene: Phaser.Scene,
    map: MapData,
    database: BattleDatabase,
  ) {
    this.layer = scene.add.layer();
    this.layer.setDepth(0);

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const idx = y * map.width + x;
        const terrainId = map.layers.bottom[idx] ?? "terrain_plain";
        const terrain = database.terrain[terrainId];
        const color = TERRAIN_COLORS[terrainId] ?? 0x888888;
        const tile = scene.add.rectangle(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE - 1,
          TILE_SIZE - 1,
          color,
        );
        tile.setStrokeStyle(1, 0x000000, 0.15);
        if (terrain?.impassable) {
          tile.setAlpha(0.55);
        }
        this.layer.add(tile);
      }
    }

    const border = scene.add.rectangle(
      MAP_PX / 2,
      MAP_PX / 2,
      MAP_PX,
      MAP_PX,
    );
    border.setStrokeStyle(2, 0x111111, 1);
    border.setFillStyle(0x000000, 0);
    this.layer.add(border);
  }

  getLayer(): Phaser.GameObjects.Layer {
    return this.layer;
  }
}

export function generateTerrainTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (const [id, color] of Object.entries(TERRAIN_COLORS)) {
    g.clear();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.lineStyle(1, 0x000000, 0.2);
    g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.generateTexture(`terrain_${id}`, TILE_SIZE, TILE_SIZE);
  }
  g.destroy();
}

export function generateUnitTextures(scene: Phaser.Scene): void {
  const factions: Array<{ key: string; color: number }> = [
    { key: "unit_player", color: 0x2196f3 },
    { key: "unit_enemy", color: 0xf44336 },
    { key: "unit_third", color: 0xff9800 },
  ];
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (const { key, color } of factions) {
    g.clear();
    g.fillStyle(color, 1);
    g.fillRoundedRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4, 4);
    g.lineStyle(2, 0xffffff, 1);
    g.strokeRoundedRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4, 4);
    g.generateTexture(key, TILE_SIZE, TILE_SIZE);
  }
  g.destroy();
}
