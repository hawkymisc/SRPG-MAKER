import Phaser from "phaser";
import { MAP_PX, TILE_SIZE } from "../constants.js";

export class Cursor {
  private readonly rect: Phaser.GameObjects.Rectangle;
  private gridX = 0;
  private gridY = 0;
  private mapWidth = MAP_PX / TILE_SIZE;
  private mapHeight = MAP_PX / TILE_SIZE;

  constructor(scene: Phaser.Scene) {
    this.rect = scene.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE);
    this.rect.setStrokeStyle(2, 0xffff00, 1);
    this.rect.setFillStyle(0xffff00, 0.15);
    this.rect.setDepth(50);
    this.setGrid(0, 0);
  }

  setMapSize(width: number, height: number): void {
    this.mapWidth = width;
    this.mapHeight = height;
    this.clamp();
    this.redraw();
  }

  getGrid(): { x: number; y: number } {
    return { x: this.gridX, y: this.gridY };
  }

  setGrid(x: number, y: number): void {
    this.gridX = x;
    this.gridY = y;
    this.clamp();
    this.redraw();
  }

  move(dx: number, dy: number): void {
    this.setGrid(this.gridX + dx, this.gridY + dy);
  }

  setFromPointer(px: number, py: number): boolean {
    if (px < 0 || py < 0 || px >= MAP_PX || py >= MAP_PX) {
      return false;
    }
    this.setGrid(Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE));
    return true;
  }

  private clamp(): void {
    this.gridX = Phaser.Math.Clamp(this.gridX, 0, this.mapWidth - 1);
    this.gridY = Phaser.Math.Clamp(this.gridY, 0, this.mapHeight - 1);
  }

  private redraw(): void {
    this.rect.setPosition(
      this.gridX * TILE_SIZE + TILE_SIZE / 2,
      this.gridY * TILE_SIZE + TILE_SIZE / 2,
    );
  }
}
