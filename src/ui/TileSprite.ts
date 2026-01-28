import Phaser from 'phaser';
import { Tile } from '../core/Tile';
import { TILE_W, TILE_H, getTileTextureKey } from './TileTextureGenerator';
import { isRedDoraTile } from '../core/DeckVariant';

/* ── Tile visual states ─────────────────────────────────── */
export enum TileState {
  FaceUp = 'face-up',
  FaceDown = 'face-down',
  Selected = 'selected',
  Disabled = 'disabled',
}

/* ── Shadow / glow constants ────────────────────────────── */
const SHADOW_OFFSET_X = 2;
const SHADOW_OFFSET_Y = 3;
const SHADOW_COLOR = 0x000000;
const SHADOW_ALPHA = 0.25;

const SELECTED_RAISE = -8;
const SELECTED_GLOW_COLOR = 0xffd700;
const SELECTED_GLOW_ALPHA = 0.55;
const SELECTED_GLOW_PAD = 3;

const DISABLED_TINT = 0x888888;

// Red Dora constants
const RED_DORA_TINT = 0xff5555;
const RED_DORA_MARKER_COLOR = 0xff0000;
const RED_DORA_MARKER_SIZE = 6;

/**
 * TileSprite — visual representation of a mahjong tile.
 *
 * Uses pre-generated canvas textures (from TileTextureGenerator) for
 * tile faces and backs. Supports four states: face-up, face-down,
 * selected (raised + glow), and disabled (greyed out).
 *
 * Mobile-first sizing: dimensions come from TILE_W / TILE_H constants.
 * The container can be scaled externally for responsive layouts.
 */
export class TileSprite extends Phaser.GameObjects.Container {
  private _tile: Tile;
  private _tileState: TileState;

  // Visual layers (bottom → top) — assigned in buildLayers()
  private _shadow!: Phaser.GameObjects.Graphics;
  private _glow!: Phaser.GameObjects.Graphics;
  private _faceImage!: Phaser.GameObjects.Image;
  private _backImage!: Phaser.GameObjects.Image;
  private _redDoraMarker?: Phaser.GameObjects.Graphics;  // Red dora indicator

  // Interaction hit area
  private _hitZone!: Phaser.GameObjects.Zone;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    tile: Tile,
    initialState: TileState = TileState.FaceUp,
  ) {
    super(scene, x, y);

    this._tile = tile;
    this._tileState = initialState;

    this.buildLayers();
    this.applyState();
    this.setupInteraction();

    scene.add.existing(this as Phaser.GameObjects.Container);
  }

  /* ── public getters / setters ──────────────────────────── */

  public get tile(): Tile {
    return this._tile;
  }

  public get tileState(): TileState {
    return this._tileState;
  }

  /** Change tile data (e.g. when reusing pooled sprites). */
  public setTile(tile: Tile): void {
    this._tile = tile;
    const key = getTileTextureKey(tile.suit, tile.value);
    this._faceImage.setTexture(key);
    this.applyState();
  }

  /** Convenience: is the tile currently in the Selected state? */
  public get selected(): boolean {
    return this._tileState === TileState.Selected;
  }

  /** Convenience setter — toggles between Selected and FaceUp. */
  public set selected(value: boolean) {
    this.setTileState(value ? TileState.Selected : TileState.FaceUp);
  }

  /** Transition to a new visual state with optional tween. */
  public setTileState(newState: TileState, animate = true): void {
    if (newState === this._tileState) return;
    const prev = this._tileState;
    this._tileState = newState;
    this.applyState();

    if (animate) {
      this.animateTransition(prev, newState);
    }
  }

  /* ── visual construction ───────────────────────────────── */

  private buildLayers(): void {
    const w = TILE_W;
    const h = TILE_H;

    // Shadow (drawn with Graphics for soft rounded rect)
    this._shadow = new Phaser.GameObjects.Graphics(this.scene);
    this.drawRoundedRect(this._shadow, SHADOW_OFFSET_X, SHADOW_OFFSET_Y, w, h, 6, SHADOW_COLOR, SHADOW_ALPHA);
    this.add(this._shadow);

    // Glow layer (hidden by default, shown when Selected)
    this._glow = new Phaser.GameObjects.Graphics(this.scene);
    this._glow.setVisible(false);
    this.add(this._glow);

    // Face image (centred within container)
    const faceKey = getTileTextureKey(this._tile.suit, this._tile.value);
    this._faceImage = new Phaser.GameObjects.Image(this.scene, 0, 0, faceKey);
    this._faceImage.setOrigin(0.5, 0.5);
    this.add(this._faceImage);

    // Back image
    this._backImage = new Phaser.GameObjects.Image(this.scene, 0, 0, 'tile-back');
    this._backImage.setOrigin(0.5, 0.5);
    this._backImage.setVisible(false);
    this.add(this._backImage);

    // Red Dora marker (if this is a red dora tile)
    if (isRedDoraTile(this._tile)) {
      this._redDoraMarker = new Phaser.GameObjects.Graphics(this.scene);
      this.drawRedDoraMarker(this._redDoraMarker);
      this.add(this._redDoraMarker);
    }

    // Hit zone for pointer events
    this._hitZone = new Phaser.GameObjects.Zone(this.scene, 0, 0, w, h);
    this._hitZone.setOrigin(0.5, 0.5);
    this.add(this._hitZone);
  }

  private drawRedDoraMarker(g: Phaser.GameObjects.Graphics): void {
    const w = TILE_W;
    const h = TILE_H;
    const size = RED_DORA_MARKER_SIZE;

    g.clear();

    // Draw a red dot in the top-right corner
    g.fillStyle(RED_DORA_MARKER_COLOR, 1);
    g.fillCircle(w / 2 - size - 3, -h / 2 + size + 3, size);

    // Add a subtle glow around the dot
    g.fillStyle(RED_DORA_MARKER_COLOR, 0.3);
    g.fillCircle(w / 2 - size - 3, -h / 2 + size + 3, size + 2);
  }

  private drawRoundedRect(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number,
    w: number, h: number,
    r: number,
    colour: number,
    alpha: number,
  ): void {
    g.clear();
    g.fillStyle(colour, alpha);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
  }

  /* ── state application ─────────────────────────────────── */

  private applyState(): void {
    const w = TILE_W;
    const h = TILE_H;
    const p = SELECTED_GLOW_PAD;

    switch (this._tileState) {
      case TileState.FaceUp:
        this._faceImage.setVisible(true);
        this._backImage.setVisible(false);
        this._faceImage.clearTint();
        // Apply red tint for Red Dora tiles
        if (isRedDoraTile(this._tile)) {
          this._faceImage.setTint(RED_DORA_TINT);
        }
        this._faceImage.setAlpha(1);
        this._glow.setVisible(false);
        this._faceImage.y = 0;
        // Reset red dora marker position
        if (this._redDoraMarker) {
          this._redDoraMarker.y = 0;
        }
        this._shadow.setAlpha(1);
        this.drawRoundedRect(this._shadow, SHADOW_OFFSET_X, SHADOW_OFFSET_Y, w, h, 6, SHADOW_COLOR, SHADOW_ALPHA);
        break;

      case TileState.FaceDown:
        this._faceImage.setVisible(false);
        this._backImage.setVisible(true);
        this._backImage.clearTint();
        this._backImage.setAlpha(1);
        this._glow.setVisible(false);
        this._backImage.y = 0;
        this._shadow.setAlpha(1);
        this.drawRoundedRect(this._shadow, SHADOW_OFFSET_X, SHADOW_OFFSET_Y, w, h, 6, SHADOW_COLOR, SHADOW_ALPHA);
        break;

      case TileState.Selected:
        this._faceImage.setVisible(true);
        this._backImage.setVisible(false);
        this._faceImage.clearTint();
        // Apply red tint for Red Dora tiles
        if (isRedDoraTile(this._tile)) {
          this._faceImage.setTint(RED_DORA_TINT);
        }
        this._faceImage.setAlpha(1);
        this._faceImage.y = SELECTED_RAISE;
        // Bigger shadow when raised
        this.drawRoundedRect(this._shadow, SHADOW_OFFSET_X + 1, SHADOW_OFFSET_Y + 4, w, h, 6, SHADOW_COLOR, SHADOW_ALPHA * 0.8);
        // Glow outline
        this._glow.clear();
        this._glow.fillStyle(SELECTED_GLOW_COLOR, SELECTED_GLOW_ALPHA);
        this._glow.fillRoundedRect(
          -(w / 2 + p), SELECTED_RAISE - h / 2 - p,
          w + p * 2, h + p * 2,
          8,
        );
        this._glow.setVisible(true);
        // Re-add face on top of glow
        this.bringToTop(this._faceImage);
        // Update red dora marker position if present
        if (this._redDoraMarker) {
          this._redDoraMarker.y = SELECTED_RAISE;
          this.bringToTop(this._redDoraMarker);
        }
        this.bringToTop(this._hitZone);
        break;

      case TileState.Disabled:
        this._faceImage.setVisible(true);
        this._backImage.setVisible(false);
        this._faceImage.setTint(DISABLED_TINT);
        this._faceImage.setAlpha(0.6);
        this._glow.setVisible(false);
        this._faceImage.y = 0;
        this._shadow.setAlpha(0.4);
        this.drawRoundedRect(this._shadow, SHADOW_OFFSET_X, SHADOW_OFFSET_Y, w, h, 6, SHADOW_COLOR, SHADOW_ALPHA * 0.5);
        break;
    }
  }

  /* ── transitions ───────────────────────────────────────── */

  private animateTransition(from: TileState, to: TileState): void {
    if (to === TileState.Selected) {
      // Pop-up ease
      this.scene.tweens.add({
        targets: this._faceImage,
        y: SELECTED_RAISE,
        duration: 150,
        ease: 'Back.Out',
      });
    } else if (from === TileState.Selected && to === TileState.FaceUp) {
      // Settle back down
      this.scene.tweens.add({
        targets: this._faceImage,
        y: 0,
        duration: 120,
        ease: 'Power2.Out',
      });
    }
  }

  /* ── interaction ───────────────────────────────────────── */

  private setupInteraction(): void {
    this._hitZone.setInteractive({ useHandCursor: true });

    this._hitZone.on('pointerover', () => {
      if (this._tileState === TileState.Disabled) return;
      if (this._tileState !== TileState.Selected) {
        // Subtle hover lift
        this.scene.tweens.add({
          targets: this._faceImage.visible ? this._faceImage : this._backImage,
          y: -2,
          duration: 80,
          ease: 'Sine.Out',
        });
      }
    });

    this._hitZone.on('pointerout', () => {
      if (this._tileState === TileState.Disabled) return;
      if (this._tileState === TileState.FaceUp || this._tileState === TileState.FaceDown) {
        this.scene.tweens.add({
          targets: this._faceImage.visible ? this._faceImage : this._backImage,
          y: 0,
          duration: 80,
          ease: 'Sine.Out',
        });
      }
    });

    this._hitZone.on('pointerdown', () => {
      if (this._tileState === TileState.Disabled) return;
      this.emit('tileClicked', this._tile);
    });
  }

  /* ── public helpers ────────────────────────────────────── */

  /** Highlight the tile border temporarily (e.g. for discardable tiles). */
  public highlight(color: number = 0x00ff00): void {
    this._glow.clear();
    this._glow.lineStyle(3, color, 0.9);
    const w = TILE_W;
    const h = TILE_H;
    const p = 3;
    const yOff = this._tileState === TileState.Selected ? SELECTED_RAISE : 0;
    this._glow.strokeRoundedRect(
      -(w / 2 + p), yOff - h / 2 - p,
      w + p * 2, h + p * 2,
      7,
    );
    this._glow.setVisible(true);
  }

  /** Remove any temporary highlight. */
  public removeHighlight(): void {
    if (this._tileState !== TileState.Selected) {
      this._glow.setVisible(false);
    } else {
      // Re-apply selected glow
      this.applyState();
    }
  }

  /** Pulse highlight effect (for winning tiles) */
  public pulseHighlight(color: number = 0xffd700, duration: number = 300): void {
    this.highlight(color);

    // Pulse the glow alpha
    this._glow.setAlpha(1);
    this.scene.tweens.add({
      targets: this._glow,
      alpha: 0.3,
      duration: duration / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }

  /** Stop pulse animation */
  public stopPulse(): void {
    this.scene.tweens.killTweensOf(this._glow);
    this._glow.setAlpha(1);
    this.removeHighlight();
  }

  /** Dimensions for layout calculations. */
  public static get tileWidth(): number {
    return TILE_W;
  }

  public static get tileHeight(): number {
    return TILE_H;
  }
}
