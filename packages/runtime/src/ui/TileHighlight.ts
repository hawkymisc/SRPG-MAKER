import Phaser from "phaser";
import { TILE_SIZE } from "../constants.js";

export type HighlightKind = "move" | "attack" | "target";

const HIGHLIGHT_COLORS: Record<HighlightKind, number> = {
  move: 0x2196f3,
  attack: 0xff9800,
  target: 0xf44336,
};

export class TileHighlight {
  private readonly scene: Phaser.Scene;
  private readonly tiles: Phaser.GameObjects.Rectangle[] = [];
  private readonly layer: Phaser.GameObjects.Layer;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.layer = scene.add.layer();
    this.layer.setDepth(10);
  }

  show(tiles: Array<{ x: number; y: number }>, kind: HighlightKind): void {
    this.clear();
    const color = HIGHLIGHT_COLORS[kind];
    for (const tile of tiles) {
      const rect = this.scene.add.rectangle(
        tile.x * TILE_SIZE + TILE_SIZE / 2,
        tile.y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE - 2,
        TILE_SIZE - 2,
        color,
        kind === "move" ? 0.35 : 0.45,
      );
      this.tiles.push(rect);
      this.layer.add(rect);
    }
  }

  clear(): void {
    for (const tile of this.tiles) {
      tile.destroy();
    }
    this.tiles.length = 0;
  }
}
