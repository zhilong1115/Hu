import Phaser from 'phaser';
import { PlayedMeld, MeldType } from '../core/GameState';
import { Tile } from '../core/Tile';
import { TileSprite, TileState } from './TileSprite';

/**
 * MeldAreaDisplay - Left side panel showing played melds (chi/pong/kong)
 *
 * Layout: Vertical stack of meld rows
 * Each meld shows the tiles + multiplier indicator
 */
export class MeldAreaDisplay extends Phaser.GameObjects.Container {
  private _melds: PlayedMeld[] = [];
  private _meldContainers: Phaser.GameObjects.Container[] = [];
  private _titleText!: Phaser.GameObjects.Text;
  private _emptyText!: Phaser.GameObjects.Text;

  private readonly MELD_GAP = 10;
  private readonly TILE_SCALE = 0.5;
  private readonly PANEL_WIDTH = 140;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.createBackground();
    this.createTitle();
    this.createEmptyText();

    scene.add.existing(this);
  }

  private createBackground(): void {
    const bg = this.scene.add.rectangle(0, 0, this.PANEL_WIDTH, 400, 0x1a1a2e, 0.8);
    bg.setOrigin(0.5, 0);
    bg.setStrokeStyle(2, 0x3a3a5e);
    this.add(bg);
  }

  private createTitle(): void {
    this._titleText = this.scene.add.text(0, 10, '出牌区', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#aaaaaa'
    });
    this._titleText.setOrigin(0.5, 0);
    this.add(this._titleText);
  }

  private createEmptyText(): void {
    this._emptyText = this.scene.add.text(0, 180, '尚无出牌', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#666666'
    });
    this._emptyText.setOrigin(0.5, 0.5);
    this.add(this._emptyText);
  }

  /**
   * Update the display with current melds
   */
  public setMelds(melds: PlayedMeld[]): void {
    this._melds = melds;
    this.updateDisplay();
  }

  /**
   * Add a new meld with animation
   */
  public addMeld(meld: PlayedMeld): void {
    this._melds.push(meld);
    this.updateDisplay();

    // Animate the new meld
    const newContainer = this._meldContainers[this._meldContainers.length - 1];
    if (newContainer) {
      newContainer.setAlpha(0);
      newContainer.setScale(0.8);
      this.scene.tweens.add({
        targets: newContainer,
        alpha: 1,
        scale: 1,
        duration: 300,
        ease: 'Back.Out'
      });
    }
  }

  private updateDisplay(): void {
    // Clear existing meld displays
    this._meldContainers.forEach(c => c.destroy());
    this._meldContainers = [];

    // Show/hide empty text
    this._emptyText.setVisible(this._melds.length === 0);

    // Create meld displays
    const startY = 40;
    const meldHeight = 80;

    this._melds.forEach((meld, index) => {
      const meldY = startY + index * (meldHeight + this.MELD_GAP);
      const container = this.createMeldDisplay(meld, meldY);
      this._meldContainers.push(container);
      this.add(container);
    });
  }

  private createMeldDisplay(meld: PlayedMeld, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, y);

    // Meld type label with color coding
    const meldNames: Record<MeldType, string> = { 'chow': '吃', 'pong': '碰', 'kong': '杠' };
    const meldColors: Record<MeldType, string> = { 'chow': '#44aa44', 'pong': '#4488ff', 'kong': '#ffaa00' };

    const label = this.scene.add.text(0, 0, meldNames[meld.type], {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: meldColors[meld.type]
    });
    label.setOrigin(0.5, 0);
    container.add(label);

    // Tile display - arranged horizontally
    const tileWidth = 26 * this.TILE_SCALE;
    const tileGap = 2;
    const tilesWidth = meld.tiles.length * tileWidth + (meld.tiles.length - 1) * tileGap;
    const startX = -tilesWidth / 2 + tileWidth / 2;

    meld.tiles.forEach((tile, i) => {
      const tileX = startX + i * (tileWidth + tileGap);
      const tileSprite = new TileSprite(this.scene, tileX, 30, tile, TileState.FaceUp);
      tileSprite.setScale(this.TILE_SCALE);
      tileSprite.disableInteractive();
      container.add(tileSprite);
    });

    // Multiplier indicator (only show for kong)
    if (meld.multiplier > 1) {
      const multText = this.scene.add.text(0, 55, `×${meld.multiplier}`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '14px',
        color: '#ffd700',
        fontStyle: 'bold'
      });
      multText.setOrigin(0.5, 0);
      container.add(multText);
    }

    return container;
  }

  /**
   * Get accumulated multiplier from all melds
   */
  public getAccumulatedMultiplier(): number {
    return this._melds.reduce((acc, meld) => acc * meld.multiplier, 1);
  }

  /**
   * Clear all melds
   */
  public clear(): void {
    this._melds = [];
    this.updateDisplay();
  }
}
