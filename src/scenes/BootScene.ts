import Phaser from 'phaser';
import { generateTileTextures } from '../ui/TileTextureGenerator';
import { AudioManager } from '../audio/AudioManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Update HTML loading screen progress
    this.updateHTMLLoadingProgress(0.2, 'Loading assets...');

    // Loading progress listener
    this.load.on('progress', (value: number) => {
      this.updateHTMLLoadingProgress(0.2 + value * 0.2, 'Loading assets...');
    });

    // Loading complete listener
    this.load.on('complete', () => {
      this.updateHTMLLoadingProgress(0.4, 'Assets loaded');
    });

    // ── Tile PNGs (cyberpunk neon style) ──
    // Number suits: wan(万)=man, tiao(条)=sou, tong(筒)=pin
    const suitMap: Record<string, string> = { wan: 'man', tiao: 'sou', tong: 'pin' };
    for (const [suit, filePrefix] of Object.entries(suitMap)) {
      for (let v = 1; v <= 9; v++) {
        this.load.image(`face:${suit}-${v}`, `assets/tiles/${filePrefix}_${v}.png`);
      }
    }

    // Wind tiles: east=1, south=2, west=3, north=4
    const winds: Record<number, string> = { 1: 'east', 2: 'south', 3: 'west', 4: 'north' };
    for (const [val, name] of Object.entries(winds)) {
      this.load.image(`face:wind-${val}`, `assets/tiles/wind_${name}.png`);
    }

    // Dragon tiles: red=1, green=2, white=3
    const dragons: Record<number, string> = { 1: 'red', 2: 'green', 3: 'white' };
    for (const [val, name] of Object.entries(dragons)) {
      this.load.image(`face:dragon-${val}`, `assets/tiles/dragon_${name}.png`);
    }

    // Tile back
    this.load.image('tile-back', 'assets/tiles/tile_back.png');

    // ── UI assets (PNG) ──
    this.load.image('game_bg', 'assets/ui/game_bg.png');
    this.load.image('btn_play', 'assets/ui/btn_play.png');
    this.load.image('btn_discard', 'assets/ui/btn_discard.png');
    this.load.image('btn_hu', 'assets/ui/btn_hu.png');
    this.load.image('btn_use_flower', 'assets/ui/btn_use_flower.png');
    this.load.image('panel_bg', 'assets/ui/panel_bg.png');

    // ── Effect assets (still SVG until Artist provides PNGs) ──
    const effects = [
      'god_fortune', 'god_gamble', 'god_insight', 'god_transform',
      'flower_bamboo', 'flower_chrysanthemum', 'flower_orchid', 'flower_plum',
      'material_bronze', 'material_silver', 'material_gold', 'material_jade',
      'material_bamboo_mat', 'material_ice', 'material_glass'
    ];
    for (const name of effects) {
      this.load.svg(name, `assets/effects/${name}.svg`);
    }

    // Placeholder fallback
    this.load.image('placeholder', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
  }

  create() {
    this.updateHTMLLoadingProgress(0.5, 'Initializing audio...');

    // ── Initialize Audio System ──
    const audioManager = AudioManager.getInstance();
    audioManager.resume(); // Required for browser autoplay policies

    this.updateHTMLLoadingProgress(0.6, 'Generating tiles...');

    // ── Generate all tile textures at boot time ──
    generateTileTextures(this);

    this.updateHTMLLoadingProgress(0.8, 'Generating effects...');

    // ── Generate particle texture for God Tile effects ──
    this.generateParticleTexture();

    this.updateHTMLLoadingProgress(0.9, 'Almost ready...');

    // Display "HU!" text
    const titleText = this.add.text(400, 300, 'HU!', {
      fontFamily: 'Courier New, monospace',
      fontSize: '64px',
      color: '#ff6b35'
    });
    titleText.setOrigin(0.5);

    // Add subtitle
    const subtitleText = this.add.text(400, 360, 'Roguelike Mahjong Deck Builder', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#ffffff'
    });
    subtitleText.setOrigin(0.5);

    // Add loading indicator
    const loadingText = this.add.text(400, 420, 'Loading...', {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#888888'
    });
    loadingText.setOrigin(0.5);

    // Animate loading dots
    this.time.addEvent({
      delay: 500,
      callback: () => {
        const dots = loadingText.text.match(/\./g)?.length || 0;
        if (dots < 3) {
          loadingText.setText(loadingText.text + '.');
        } else {
          loadingText.setText('Loading');
        }
      },
      loop: true
    });

    this.updateHTMLLoadingProgress(1.0, 'Ready!');

    // Auto-transition to menu after 2 seconds with fade
    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(500);

      this.time.delayedCall(500, () => {
        // Hide HTML loading screen
        this.hideHTMLLoadingScreen();
        this.scene.start('MenuScene');
      });
    });
  }

  /**
   * Generate a simple particle texture for God Tile effects
   */
  private generateParticleTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffd700, 1);
    graphics.fillCircle(8, 8, 8);

    graphics.generateTexture('particle', 16, 16);
    graphics.destroy();
  }

  /**
   * Update the HTML loading screen progress
   */
  private updateHTMLLoadingProgress(progress: number, text: string): void {
    if (typeof (window as any).updateLoadingProgress === 'function') {
      (window as any).updateLoadingProgress(progress, text);
    }
  }

  /**
   * Hide the HTML loading screen
   */
  private hideHTMLLoadingScreen(): void {
    if (typeof (window as any).hideLoadingScreen === 'function') {
      (window as any).hideLoadingScreen();
    }
  }
}
