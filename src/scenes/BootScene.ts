import Phaser from 'phaser';
import { generateTileTextures } from '../ui/TileTextureGenerator';
import { AudioManager } from '../audio/AudioManager';
import { debugLog } from '../errorHandler';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Update HTML loading screen progress
    this.updateHTMLLoadingProgress(0.2, 'Loading assets...');

    // Loading progress listener
    this.load.on('progress', (value: number) => {
      // Map progress from 0.2 to 0.4 during asset loading
      this.updateHTMLLoadingProgress(0.2 + value * 0.2, 'Loading assets...');
    });

    // Loading complete listener
    this.load.on('complete', () => {
      this.updateHTMLLoadingProgress(0.4, 'Assets loaded');
    });

    // Simulate loading time with a tiny placeholder
    this.load.image('placeholder', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
  }

  create() {
    debugLog('BootScene.create()');
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
