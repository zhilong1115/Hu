import Phaser from 'phaser';
import { Hand } from '../core/Hand';
import { Tile } from '../core/Tile';
import { TileSprite, TileState } from './TileSprite';

export interface HandDisplayConfig {
  maxWidth?: number;        // Max width for the hand display (defaults to scene width)
  tileGap?: number;         // Gap between tiles (default 5)
  enableMultiSelect?: boolean; // Allow selecting multiple tiles (default true)
  enableAutoScale?: boolean;   // Auto-scale tiles to fit screen (default true)
}

/**
 * HandDisplay — UI component for displaying and interacting with a Hand.
 *
 * Features:
 * - Horizontal layout of TileSprite instances
 * - Multi-select support (tap multiple tiles)
 * - Mobile-first responsive scaling
 * - Auto-sort when tiles are added/removed
 * - Selected tiles use TileState.Selected (raised + glow)
 * - Draw/discard limit tracking
 */
export class HandDisplay extends Phaser.GameObjects.Container {
  private _hand: Hand;
  private _config: Required<HandDisplayConfig>;
  private _tileSprites: TileSprite[] = [];
  private _selectedTiles: Set<string> = new Set(); // Set of tile IDs

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    hand: Hand,
    config: HandDisplayConfig = {}
  ) {
    super(scene, x, y);

    this._hand = hand;
    this._config = {
      maxWidth: config.maxWidth ?? scene.scale.width,
      tileGap: config.tileGap ?? 5,
      enableMultiSelect: config.enableMultiSelect ?? true,
      enableAutoScale: config.enableAutoScale ?? true,
    };

    this.createDisplay();
    scene.add.existing(this);
  }

  /* ── public getters ────────────────────────────────────── */

  public get hand(): Hand {
    return this._hand;
  }

  public get selectedTiles(): Tile[] {
    return this._tileSprites
      .filter(sprite => this._selectedTiles.has(sprite.tile.id))
      .map(sprite => sprite.tile);
  }

  public get selectedCount(): number {
    return this._selectedTiles.size;
  }

  public get hasSelection(): boolean {
    return this._selectedTiles.size > 0;
  }

  /* ── public methods ────────────────────────────────────── */

  /**
   * Rebuild the entire display from scratch.
   */
  public updateDisplay(): void {
    this.clearTileSprites();
    this._selectedTiles.clear();
    this.createDisplay();
  }

  /**
   * Select a tile (adds to selection if multi-select enabled).
   */
  public selectTile(tile: Tile): void {
    if (!this._config.enableMultiSelect) {
      this._selectedTiles.clear();
      this._tileSprites.forEach(s => s.setTileState(TileState.FaceUp, false));
    }

    this._selectedTiles.add(tile.id);
    const sprite = this._tileSprites.find(s => s.tile.id === tile.id);
    if (sprite) {
      sprite.setTileState(TileState.Selected, true);
    }

    this.emit('selectionChanged', this.selectedTiles);
  }

  /**
   * Deselect a tile.
   */
  public deselectTile(tile: Tile): void {
    this._selectedTiles.delete(tile.id);
    const sprite = this._tileSprites.find(s => s.tile.id === tile.id);
    if (sprite) {
      sprite.setTileState(TileState.FaceUp, true);
    }

    this.emit('selectionChanged', this.selectedTiles);
  }

  /**
   * Toggle selection on a tile.
   */
  public toggleTile(tile: Tile): void {
    if (this._selectedTiles.has(tile.id)) {
      this.deselectTile(tile);
    } else {
      this.selectTile(tile);
    }
  }

  /**
   * Clear all selections.
   */
  public deselectAll(): void {
    this._selectedTiles.clear();
    this._tileSprites.forEach(sprite => {
      sprite.setTileState(TileState.FaceUp, true);
    });

    this.emit('selectionChanged', []);
  }

  /**
   * Discard the currently selected tiles.
   * Returns true if successful, false if no discards remaining or no tiles selected.
   */
  public discardSelected(): boolean {
    if (this._selectedTiles.size === 0) {
      return false;
    }

    const tilesToDiscard = this.selectedTiles;
    const success = this._hand.discardTiles(tilesToDiscard);

    if (success) {
      this.animateTileRemove(tilesToDiscard, () => {
        this.updateDisplay();
        this.emit('tilesDiscarded', tilesToDiscard);
      });
    }

    return success;
  }

  /**
   * Draw a tile from the wall and add to hand with animation.
   */
  public drawTile(tile: Tile): boolean {
    const success = this._hand.drawTile(tile);
    if (success) {
      this.animateTileAdd(tile);
      this.emit('tileDrawn', tile);
    }
    return success;
  }

  /**
   * Highlight discardable tiles (typically all tiles in hand).
   */
  public highlightDiscardableTiles(color: number = 0x00ff00): void {
    this._tileSprites.forEach(sprite => {
      sprite.highlight(color);
    });
  }

  /**
   * Remove all highlights.
   */
  public removeAllHighlights(): void {
    this._tileSprites.forEach(sprite => {
      sprite.removeHighlight();
    });
  }

  /**
   * Set the state of all tiles (useful for face-down mode).
   */
  public setAllTileStates(state: TileState): void {
    this._tileSprites.forEach(sprite => {
      sprite.setTileState(state, false);
    });
  }

  /* ── private methods: display creation ─────────────────── */

  private createDisplay(): void {
    const tiles = this._hand.tiles;
    if (tiles.length === 0) return;

    const tileWidth = TileSprite.tileWidth;
    const totalWidth = tiles.length * tileWidth + (tiles.length - 1) * this._config.tileGap;

    // Calculate scale factor if auto-scaling is enabled
    let scaleFactor = 1;
    if (this._config.enableAutoScale && totalWidth > this._config.maxWidth) {
      scaleFactor = this._config.maxWidth / totalWidth;
    }

    const scaledTileWidth = tileWidth * scaleFactor;
    const scaledGap = this._config.tileGap * scaleFactor;
    const finalWidth = tiles.length * scaledTileWidth + (tiles.length - 1) * scaledGap;
    const startX = -finalWidth / 2 + scaledTileWidth / 2;

    tiles.forEach((tile, index) => {
      const tileX = startX + index * (scaledTileWidth + scaledGap);
      const tileSprite = new TileSprite(this.scene, tileX, 0, tile, TileState.FaceUp);

      // Apply scale
      tileSprite.setScale(scaleFactor);

      // Set up click handler
      tileSprite.on('tileClicked', (clickedTile: Tile) => {
        this.handleTileClick(tileSprite, clickedTile);
      });

      this._tileSprites.push(tileSprite);
      this.add(tileSprite);
    });
  }

  private handleTileClick(tileSprite: TileSprite, tile: Tile): void {
    this.toggleTile(tile);
    this.emit('tileClicked', tile, this.selectedTiles);
  }

  private clearTileSprites(): void {
    this._tileSprites.forEach(sprite => {
      sprite.destroy();
    });
    this._tileSprites = [];
  }

  /* ── animations ─────────────────────────────────────────── */

  public animateTileAdd(tile: Tile): void {
    this.updateDisplay();

    const newTileSprite = this._tileSprites.find(s => s.tile.id === tile.id);
    if (newTileSprite) {
      newTileSprite.y = -100;
      newTileSprite.alpha = 0;

      this.scene.tweens.add({
        targets: newTileSprite,
        y: 0,
        alpha: 1,
        duration: 300,
        ease: 'Back.Out'
      });
    }
  }

  public animateTileRemove(tiles: Tile | Tile[], callback?: () => void): void {
    const tilesToRemove = Array.isArray(tiles) ? tiles : [tiles];
    const sprites = tilesToRemove
      .map(tile => this._tileSprites.find(s => s.tile.id === tile.id))
      .filter(s => s !== undefined) as TileSprite[];

    if (sprites.length === 0) {
      callback?.();
      return;
    }

    let completed = 0;
    sprites.forEach(sprite => {
      this.scene.tweens.add({
        targets: sprite,
        y: 100,
        alpha: 0,
        duration: 200,
        ease: 'Power2.In',
        onComplete: () => {
          completed++;
          if (completed === sprites.length) {
            callback?.();
          }
        }
      });
    });
  }

  /**
   * Animate drawing tiles in sequence (for initial deal).
   */
  public animateInitialDeal(tiles: Tile[], delayBetween: number = 50): void {
    tiles.forEach((tile, index) => {
      this.scene.time.delayedCall(index * delayBetween, () => {
        this._hand.addTile(tile);
        this.animateTileAdd(tile);
      });
    });
  }

  /* ── utility ────────────────────────────────────────────── */

  /**
   * Get the current scale factor being applied to tiles.
   */
  public getScaleFactor(): number {
    if (this._tileSprites.length === 0) return 1;
    return this._tileSprites[0].scale;
  }

  /**
   * Update the max width (useful for handling window resize).
   */
  public updateMaxWidth(maxWidth: number): void {
    this._config.maxWidth = maxWidth;
    this.updateDisplay();
  }

  /**
   * Highlight winning tiles sequentially with a wave effect
   */
  public highlightWinningTilesSequentially(tiles: Tile[], callback?: () => void): void {
    const sprites = tiles
      .map(tile => this._tileSprites.find(s => s.tile.id === tile.id))
      .filter(s => s !== undefined) as TileSprite[];

    if (sprites.length === 0) {
      callback?.();
      return;
    }

    let completed = 0;
    const delayBetween = 80;

    sprites.forEach((sprite, index) => {
      this.scene.time.delayedCall(index * delayBetween, () => {
        // Pulse and glow effect
        sprite.highlight(0xffd700);

        this.scene.tweens.add({
          targets: sprite,
          scale: sprite.scale * 1.15,
          duration: 150,
          yoyo: true,
          ease: 'Sine.Out',
          onComplete: () => {
            completed++;
            if (completed === sprites.length && callback) {
              // Hold the highlight for a moment before callback
              this.scene.time.delayedCall(300, () => {
                sprites.forEach(s => s.removeHighlight());
                callback();
              });
            }
          }
        });
      });
    });
  }

  /**
   * Flash all tiles in hand (for dramatic reveals)
   */
  public flashAllTiles(color: number = 0xffffff, duration: number = 100): void {
    this._tileSprites.forEach((sprite, index) => {
      this.scene.time.delayedCall(index * 20, () => {
        sprite.highlight(color);
        this.scene.time.delayedCall(duration, () => {
          sprite.removeHighlight();
        });
      });
    });
  }
}
