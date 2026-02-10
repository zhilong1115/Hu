import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { BossGameScene } from './scenes/BossGameScene';
import { ShopScene } from './scenes/ShopScene';
import { GameOverScene } from './scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#1a1a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: 640,
      height: 360
    },
    max: {
      width: 1920,
      height: 1080
    }
  },
  scene: [
    BootScene,
    MenuScene,
    GameScene,
    BossGameScene,
    ShopScene,
    GameOverScene
  ],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  }
};

// Initialize the game
const game = new Phaser.Game(config);

// Global game reference for debugging
(window as any).game = game;