import Phaser from 'phaser';
import { Hand } from '../core/Hand';
import { createFullTileSet, shuffleTiles, drawTiles } from '../core/Tile';
import { HandDisplay } from '../ui/HandDisplay';
import { generateTileTextures } from '../ui/TileTextureGenerator';

/**
 * HandDemoScene — demonstrates the hand management system.
 *
 * Features:
 * - 14-tile hand with auto-sort
 * - Multi-select tiles by tapping
 * - Draw button (with draws remaining counter)
 * - Discard button (with discards remaining counter)
 * - Mobile-responsive layout
 */
export class HandDemoScene extends Phaser.Scene {
  private hand!: Hand;
  private handDisplay!: HandDisplay;
  private wall: any[] = [];

  // UI elements
  private drawButton!: Phaser.GameObjects.Text;
  private discardButton!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private drawsText!: Phaser.GameObjects.Text;
  private discardsText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'HandDemoScene' });
  }

  preload(): void {
    // Generate all tile textures
    generateTileTextures(this);
  }

  create(): void {
    const { width, height } = this.scale;

    // Add background
    this.add.rectangle(0, 0, width, height, 0x1a4d2e).setOrigin(0, 0);

    // Create title
    this.add.text(width / 2, 30, 'HU! Hand Management Demo', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Initialize hand and wall
    this.initializeGame();

    // Create hand display
    this.handDisplay = new HandDisplay(
      this,
      width / 2,
      height - 150,
      this.hand,
      {
        maxWidth: width - 40,
        enableMultiSelect: true,
        enableAutoScale: true,
      }
    );

    // Set up event listeners
    this.handDisplay.on('selectionChanged', (tiles: any[]) => {
      this.updateUI();
      this.updateDiscardButtonState();
    });

    this.handDisplay.on('tileDrawn', () => {
      this.updateUI();
    });

    this.handDisplay.on('tilesDiscarded', () => {
      this.updateUI();
    });

    // Create UI
    this.createUI();
    this.updateUI();

    // Deal initial hand with animation
    this.dealInitialHand();
  }

  private initializeGame(): void {
    // Create and shuffle wall
    const fullSet = createFullTileSet();
    const shuffled = shuffleTiles(fullSet);
    this.wall = shuffled;

    // Create hand
    this.hand = new Hand();

    // Set round limits (like Balatro)
    this.hand.resetRoundLimits(5, 3); // 5 draws, 3 discards per round
  }

  private dealInitialHand(): void {
    // Draw 13 tiles for initial hand (14th comes from draw)
    const { drawn, remaining } = drawTiles(this.wall, 13);
    this.wall = remaining;

    // Animate the deal
    this.handDisplay.animateInitialDeal(drawn, 80);
  }

  private createUI(): void {
    const { width, height } = this.scale;

    // Status text (shows selected tiles count)
    this.statusText = this.add.text(width / 2, 70, '', {
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Draws remaining
    this.drawsText = this.add.text(width / 2 - 150, height - 250, '', {
      fontSize: '18px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Discards remaining
    this.discardsText = this.add.text(width / 2 + 150, height - 250, '', {
      fontSize: '18px',
      color: '#ff6b6b',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Draw button
    this.drawButton = this.add.text(width / 2 - 120, height - 50, 'DRAW', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#2ecc71',
      padding: { x: 30, y: 15 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.handleDraw())
      .on('pointerover', () => this.drawButton.setScale(1.05))
      .on('pointerout', () => this.drawButton.setScale(1));

    // Discard button
    this.discardButton = this.add.text(width / 2 + 120, height - 50, 'DISCARD', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#e74c3c',
      padding: { x: 30, y: 15 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.handleDiscard())
      .on('pointerover', () => this.discardButton.setScale(1.05))
      .on('pointerout', () => this.discardButton.setScale(1));

    // Instructions
    this.add.text(width / 2, height - 220, 'Tap tiles to select • Multi-select enabled', {
      fontSize: '14px',
      color: '#aaaaaa',
      align: 'center'
    }).setOrigin(0.5);
  }

  private updateUI(): void {
    const selectedCount = this.handDisplay.selectedCount;
    const handSize = this.hand.tiles.length;

    // Update status text
    if (selectedCount > 0) {
      this.statusText.setText(`${selectedCount} tile${selectedCount > 1 ? 's' : ''} selected`);
      this.statusText.setColor('#ffd700');
    } else {
      this.statusText.setText(`Hand: ${handSize} tiles`);
      this.statusText.setColor('#ffffff');
    }

    // Update draws/discards text
    this.drawsText.setText(`Draws: ${this.hand.drawsRemaining}`);
    this.discardsText.setText(`Discards: ${this.hand.discardsRemaining}`);

    // Update button states
    this.updateDrawButtonState();
    this.updateDiscardButtonState();
  }

  private updateDrawButtonState(): void {
    const canDraw = this.hand.drawsRemaining > 0 && !this.hand.isFull;

    if (canDraw) {
      this.drawButton.setAlpha(1);
      this.drawButton.setInteractive();
      this.drawButton.setStyle({ backgroundColor: '#2ecc71' });
    } else {
      this.drawButton.setAlpha(0.5);
      this.drawButton.disableInteractive();
      this.drawButton.setStyle({ backgroundColor: '#7f8c8d' });
    }
  }

  private updateDiscardButtonState(): void {
    const canDiscard = this.hand.discardsRemaining > 0 && this.handDisplay.hasSelection;

    if (canDiscard) {
      this.discardButton.setAlpha(1);
      this.discardButton.setInteractive();
      this.discardButton.setStyle({ backgroundColor: '#e74c3c' });
    } else {
      this.discardButton.setAlpha(0.5);
      this.discardButton.disableInteractive();
      this.discardButton.setStyle({ backgroundColor: '#7f8c8d' });
    }
  }

  private handleDraw(): void {
    if (this.hand.drawsRemaining <= 0) {
      this.showMessage('No draws remaining!', '#ff6b6b');
      return;
    }

    if (this.hand.isFull) {
      this.showMessage('Hand is full!', '#ff6b6b');
      return;
    }

    if (this.wall.length === 0) {
      this.showMessage('Wall is empty!', '#ff6b6b');
      return;
    }

    // Draw a tile
    const { drawn, remaining } = drawTiles(this.wall, 1);
    this.wall = remaining;

    const success = this.handDisplay.drawTile(drawn[0]);
    if (success) {
      this.showMessage(`Drew: ${drawn[0].displayName}`, '#2ecc71');
    }
  }

  private handleDiscard(): void {
    if (this.hand.discardsRemaining <= 0) {
      this.showMessage('No discards remaining!', '#ff6b6b');
      return;
    }

    if (!this.handDisplay.hasSelection) {
      this.showMessage('Select tiles to discard!', '#ff6b6b');
      return;
    }

    const selectedTiles = this.handDisplay.selectedTiles;
    const success = this.handDisplay.discardSelected();

    if (success) {
      const tileNames = selectedTiles.map(t => t.displayName).join(', ');
      this.showMessage(`Discarded: ${tileNames}`, '#e74c3c');
    } else {
      this.showMessage('Could not discard tiles!', '#ff6b6b');
    }
  }

  private showMessage(text: string, color: string): void {
    const { width } = this.scale;

    const message = this.add.text(width / 2, 110, text, {
      fontSize: '16px',
      color: color,
      backgroundColor: '#000000aa',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setAlpha(0);

    // Fade in and out
    this.tweens.add({
      targets: message,
      alpha: 1,
      duration: 200,
      yoyo: true,
      hold: 1500,
      onComplete: () => message.destroy()
    });
  }
}
