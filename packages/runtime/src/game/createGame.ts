import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../constants.js";
import { BootScene } from "../scenes/BootScene.js";
import { TitleScene } from "../scenes/TitleScene.js";
import { BaseScene } from "../scenes/BaseScene.js";
import { BattleMapScene } from "../scenes/BattleMapScene.js";

export function createPhaserGame(parent: string | HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: "#0f0f23",
    scene: [BootScene, TitleScene, BaseScene, BattleMapScene],
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    render: {
      antialias: false,
      pixelArt: true,
    },
  });
}
