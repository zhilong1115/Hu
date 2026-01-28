import Phaser from 'phaser';
import { GodTile } from '../roguelike/GodTile';

/**
 * GodTileDisplay — Visual display for active God Tiles
 *
 * Shows God Tiles in a horizontal row above the hand
 * - Tooltips on hover showing effects
 * - Visual triggers (glow/pulse) when effects activate
 * - Rarity-colored borders
 */
export class GodTileDisplay {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private godTiles: GodTile[] = [];

  // Visual elements
  private container!: Phaser.GameObjects.Container;
  private tileSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private tooltipText: Phaser.GameObjects.Text | null = null;
  private tooltipBg: Phaser.GameObjects.Rectangle | null = null;

  // Layout constants
  private readonly TILE_SIZE = 60;
  private readonly TILE_SPACING = 10;
  private readonly MAX_TILES_PER_ROW = 8;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    this.container = this.scene.add.container(x, y);
  }

  /**
   * Set the God Tiles to display
   */
  public setGodTiles(godTiles: GodTile[]): void {
    this.godTiles = godTiles;
    this.updateDisplay();
  }

  /**
   * Update the visual display
   */
  public updateDisplay(): void {
    // Clear existing sprites
    this.tileSprites.forEach(sprite => sprite.destroy());
    this.tileSprites.clear();
    this.container.removeAll(true);

    if (this.godTiles.length === 0) {
      return;
    }

    // Calculate layout
    const totalWidth = Math.min(this.godTiles.length, this.MAX_TILES_PER_ROW) * (this.TILE_SIZE + this.TILE_SPACING);
    const startX = -totalWidth / 2;

    // Create tile sprites
    this.godTiles.forEach((godTile, index) => {
      const col = index % this.MAX_TILES_PER_ROW;
      const row = Math.floor(index / this.MAX_TILES_PER_ROW);

      const x = startX + col * (this.TILE_SIZE + this.TILE_SPACING) + this.TILE_SIZE / 2;
      const y = row * (this.TILE_SIZE + this.TILE_SPACING);

      const tileContainer = this.createTileSprite(godTile, x, y);
      this.tileSprites.set(godTile.id, tileContainer);
      this.container.add(tileContainer);
    });
  }

  /**
   * Create a single God Tile sprite with rarity border and interactivity
   */
  private createTileSprite(godTile: GodTile, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    // Background
    const bg = this.scene.add.rectangle(0, 0, this.TILE_SIZE, this.TILE_SIZE, 0x2a2a2a);
    container.add(bg);

    // Rarity border
    const borderColor = this.getRarityColorHex(godTile.rarity);
    const border = this.scene.add.rectangle(0, 0, this.TILE_SIZE, this.TILE_SIZE);
    border.setStrokeStyle(3, borderColor);
    container.add(border);

    // Tile display text (e.g., "1万")
    const tileText = this.getTileDisplayText(godTile);
    const text = this.scene.add.text(0, -5, tileText, {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#ffffff'
    });
    text.setOrigin(0.5);
    container.add(text);

    // Rarity indicator (small text at bottom)
    const rarityText = this.scene.add.text(0, 15, this.getRarityText(godTile.rarity), {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: godTile.getRarityColor()
    });
    rarityText.setOrigin(0.5);
    container.add(rarityText);

    // Make interactive for tooltip
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => this.showTooltip(godTile, x, y));
    bg.on('pointerout', () => this.hideTooltip());

    // Store reference for trigger animation
    (container as any)._godTileBg = bg;
    (container as any)._godTileBorder = border;

    return container;
  }

  /**
   * Get display text for God Tile (shows the base tile)
   */
  private getTileDisplayText(godTile: GodTile): string {
    const { suit, value } = godTile.baseTile;

    // Map suits to Chinese characters
    const suitMap: Record<string, string> = {
      wan: '万',
      tiao: '条',
      tong: '筒',
      wind: '风',
      dragon: '龙'
    };

    // Special handling for honor tiles
    if (suit === 'wind') {
      const windNames = ['东', '南', '西', '北'];
      return windNames[value - 1] || '风';
    }
    if (suit === 'dragon') {
      const dragonNames = ['红', '发', '白'];
      return dragonNames[value - 1] || '龙';
    }

    return `${value}${suitMap[suit] || ''}`;
  }

  /**
   * Get rarity text abbreviation
   */
  private getRarityText(rarity: string): string {
    const rarityMap: Record<string, string> = {
      common: '普',
      rare: '稀',
      epic: '史',
      legendary: '传'
    };
    return rarityMap[rarity] || '?';
  }

  /**
   * Convert rarity string color to hex number
   */
  private getRarityColorHex(rarity: string): number {
    const colorMap: Record<string, number> = {
      common: 0xffffff,
      rare: 0x00ff00,
      epic: 0x8a2be2,
      legendary: 0xffd700
    };
    return colorMap[rarity] || 0xffffff;
  }

  /**
   * Show tooltip with God Tile information
   */
  private showTooltip(godTile: GodTile, tileX: number, tileY: number): void {
    this.hideTooltip();

    // Build tooltip text
    const lines: string[] = [
      godTile.displayName,
      '',
      ...godTile.effects.map(e => `${e.name}:`)
    ];

    // Add effect descriptions (wrapped)
    godTile.effects.forEach(e => {
      lines.push(`  ${e.description}`);
    });

    const tooltipContent = lines.join('\n');

    // Calculate tooltip position (above or below tile)
    const tooltipX = this.x + tileX;
    const tooltipY = this.y + tileY - this.TILE_SIZE - 20;

    // Create background
    const padding = 10;
    const lineHeight = 16;
    const maxWidth = 250;

    this.tooltipText = this.scene.add.text(tooltipX, tooltipY, tooltipContent, {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#ffffff',
      wordWrap: { width: maxWidth - padding * 2 }
    });
    this.tooltipText.setOrigin(0.5, 1);

    const bounds = this.tooltipText.getBounds();
    this.tooltipBg = this.scene.add.rectangle(
      tooltipX,
      tooltipY - bounds.height / 2,
      bounds.width + padding * 2,
      bounds.height + padding * 2,
      0x000000,
      0.9
    );
    this.tooltipBg.setStrokeStyle(2, this.getRarityColorHex(godTile.rarity));

    // Ensure tooltip is on top
    this.tooltipBg.setDepth(1000);
    this.tooltipText.setDepth(1001);
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    if (this.tooltipBg) {
      this.tooltipBg.destroy();
      this.tooltipBg = null;
    }
    if (this.tooltipText) {
      this.tooltipText.destroy();
      this.tooltipText = null;
    }
  }

  /**
   * Trigger visual effect for a God Tile (called when effect activates)
   */
  public triggerGodTile(godTileId: string): void {
    const container = this.tileSprites.get(godTileId);
    if (!container) return;

    const bg = (container as any)._godTileBg;
    const border = (container as any)._godTileBorder;

    if (!bg || !border) return;

    // Enhanced pulse animation with elastic bounce
    this.scene.tweens.add({
      targets: container,
      scale: 1.3,
      duration: 250,
      ease: 'Back.Out',
      yoyo: true,
      onComplete: () => {
        // Secondary pulse
        this.scene.tweens.add({
          targets: container,
          scale: 1.1,
          duration: 150,
          yoyo: true,
          ease: 'Sine.InOut'
        });
      }
    });

    // Enhanced glow effect with multiple colors
    const godTile = this.godTiles.find(gt => gt.id === godTileId);
    const glowColor = godTile ? this.getRarityColorHex(godTile.rarity) : 0xffd700;

    // Create pulsing glow overlay
    const glow = this.scene.add.rectangle(container.x, container.y, this.TILE_SIZE + 10, this.TILE_SIZE + 10);
    glow.setStrokeStyle(4, glowColor, 0.8);
    glow.setAlpha(0);
    this.container.add(glow);

    this.scene.tweens.add({
      targets: glow,
      alpha: 1,
      scale: 1.2,
      duration: 200,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.InOut',
      onComplete: () => {
        glow.destroy();
      }
    });

    // Flash the background
    this.scene.tweens.add({
      targets: bg,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.InOut'
    });

    // Add enhanced particle effect
    this.createTriggerParticles(container.x, container.y, glowColor);
  }

  /**
   * Create particle effect when God Tile triggers
   */
  private createTriggerParticles(x: number, y: number, color: number = 0xffd700): void {
    // Create simple circle particles (more mobile-performant than particle emitter)
    const particleCount = 12;
    const worldX = this.x + x;
    const worldY = this.y + y;

    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.circle(worldX, worldY, 3, color);
      particle.setAlpha(1);
      particle.setDepth(100);

      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 30 + Math.random() * 20;

      this.scene.tweens.add({
        targets: particle,
        x: worldX + Math.cos(angle) * distance,
        y: worldY + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration: 500 + Math.random() * 200,
        ease: 'Power2.Out',
        onComplete: () => {
          particle.destroy();
        }
      });
    }

    // Add a shockwave ring effect
    const ring = this.scene.add.circle(worldX, worldY, 5);
    ring.setStrokeStyle(2, color, 1);
    ring.setAlpha(0.8);
    ring.setDepth(99);

    this.scene.tweens.add({
      targets: ring,
      scale: 4,
      alpha: 0,
      duration: 600,
      ease: 'Power2.Out',
      onComplete: () => {
        ring.destroy();
      }
    });
  }

  /**
   * Trigger all God Tiles that activated in the last scoring
   */
  public triggerActivatedTiles(): void {
    this.godTiles.forEach(godTile => {
      if (godTile.lastTriggered) {
        this.triggerGodTile(godTile.id);
      }
    });
  }

  /**
   * Destroy the display
   */
  public destroy(): void {
    this.hideTooltip();
    this.container.destroy();
  }
}
