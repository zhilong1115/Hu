import Phaser from 'phaser';
import { Shop, ShopItem } from '../roguelike/Shop';
import { ShopUI } from '../ui/ShopUI';
import { GodTile } from '../roguelike/GodTile';
import { FlowerCard } from '../roguelike/FlowerCard';
import { FlowerCardManager } from '../roguelike/FlowerCardManager';
import { AudioManager } from '../audio/AudioManager';
import { DeckVariant, DECK_VARIANTS } from '../core/DeckVariant';

interface ShopSceneData {
  roundNumber?: number;
  currentScore?: number;
  activeGodTiles?: GodTile[];
  gold?: number;
  flowerCardManager?: FlowerCardManager;
  totalFansFormed?: number;
  totalGodTilesCollected?: number;
  deckVariant?: DeckVariant;
}

/**
 * ShopScene - Between-rounds shop for purchasing God Tiles and Flower Cards
 *
 * Features:
 * - Display 3-5 random items (God Tiles and Flower Cards)
 * - Reroll button with increasing cost (2, 4, 6, 8...)
 * - Sell owned God Tiles for half price
 * - View owned God Tiles and Flower Cards
 * - Continue to next round
 * - Mobile-first portrait layout
 */
export class ShopScene extends Phaser.Scene {
  private _shop!: Shop;
  private _shopUI!: ShopUI;

  // Game state from previous round
  private _roundNumber: number = 1;
  private _currentScore: number = 0;
  private _activeGodTiles: GodTile[] = [];
  private _flowerCardManager!: FlowerCardManager;

  // Stats tracking
  private _totalFansFormed: number = 0;
  private _totalGodTilesCollected: number = 0;

  // Deck variant
  private _deckVariant!: DeckVariant;

  // UI components
  private _headerText!: Phaser.GameObjects.Text;
  private _goldText!: Phaser.GameObjects.Text;
  private _roundInfoText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'ShopScene' });
  }

  create(data?: ShopSceneData) {
    // Extract data from previous scene
    this._roundNumber = data?.roundNumber ?? 1;
    this._currentScore = data?.currentScore ?? 0;
    this._activeGodTiles = data?.activeGodTiles ?? [];
    this._flowerCardManager = data?.flowerCardManager ?? new FlowerCardManager();
    this._totalFansFormed = data?.totalFansFormed ?? 0;
    this._totalGodTilesCollected = data?.totalGodTilesCollected ?? 0;
    this._deckVariant = data?.deckVariant ?? DECK_VARIANTS.standard;

    const gold = data?.gold ?? 10;

    // Initialize shop
    this._shop = new Shop(gold);

    // Start shop music
    AudioManager.getInstance().playMusic('shop');

    // Set background
    this.cameras.main.setBackgroundColor('#1a1a1a');

    // Create UI
    this.createUI();

    // Fade in
    this.cameras.main.fadeIn(500);
  }

  private createUI(): void {
    const centerX = this.scale.width / 2;
    const width = this.scale.width;
    const height = this.scale.height;

    // Header
    this._headerText = this.add.text(centerX, 50, '商店', {
      fontFamily: 'Courier New, monospace',
      fontSize: '32px',
      color: '#ffd700'
    });
    this._headerText.setOrigin(0.5);

    // Round info
    this._roundInfoText = this.add.text(centerX, 100, `回合 ${this._roundNumber} 完成 | 下一回合: ${this._roundNumber + 1}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#aaaaaa'
    });
    this._roundInfoText.setOrigin(0.5);

    // Gold display
    this._goldText = this.add.text(20, 150, `金币: ${this._shop.playerGold}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#ffd700'
    });

    // Shop UI Container
    this._shopUI = new ShopUI(
      this,
      centerX,
      height * 0.50,
      this._shop,
      this._activeGodTiles,
      this._flowerCardManager
    );

    // Listen to shop events
    this._shopUI.on('itemPurchased', (item: ShopItem) => {
      this.onItemPurchased(item);
    });

    this._shopUI.on('shopRefreshed', () => {
      this.updateGoldDisplay();
    });

    this._shopUI.on('godTileSold', (godTile: GodTile, goldEarned: number) => {
      this.onGodTileSold(godTile, goldEarned);
    });

    // Next Round button
    const nextRoundButton = this.add.text(
      centerX,
      height - 80,
      '下一回合',
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#00aa00',
        padding: { x: 40, y: 15 }
      }
    );
    nextRoundButton.setOrigin(0.5);
    nextRoundButton.setInteractive({ useHandCursor: true });

    nextRoundButton.on('pointerdown', () => {
      AudioManager.getInstance().playSFX('buttonClick');
      this.onNextRoundClicked();
    });

    nextRoundButton.on('pointerover', () => {
      nextRoundButton.setStyle({ backgroundColor: '#00cc00' });
    });

    nextRoundButton.on('pointerout', () => {
      nextRoundButton.setStyle({ backgroundColor: '#00aa00' });
    });

    // Back to menu button (small, in corner)
    const backButton = this.add.text(
      width - 20,
      height - 30,
      '退出',
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 15, y: 8 }
      }
    );
    backButton.setOrigin(1, 1);
    backButton.setInteractive({ useHandCursor: true });

    backButton.on('pointerdown', () => {
      AudioManager.getInstance().playSFX('buttonClick');

      // Fade out before returning to menu
      this.cameras.main.fadeOut(500);

      this.time.delayedCall(500, () => {
        this.scene.start('MenuScene');
      });
    });

    backButton.on('pointerover', () => {
      backButton.setStyle({ backgroundColor: '#555555' });
    });

    backButton.on('pointerout', () => {
      backButton.setStyle({ backgroundColor: '#333333' });
    });
  }

  private onItemPurchased(item: ShopItem): void {
    // Play purchase sound
    AudioManager.getInstance().playSFX('shopPurchase');

    // Add purchased item to player inventory
    if (item.type === 'god_tile') {
      this._activeGodTiles.push(item.item as GodTile);
    } else if (item.type === 'flower_card') {
      this._flowerCardManager.addCard(item.item as FlowerCard);
    }

    // Update UI
    this.updateGoldDisplay();
    this._shopUI.updateOwnedItems(this._activeGodTiles, this._flowerCardManager);

    // Show feedback
    this.showPurchaseFeedback(item);
  }

  private onGodTileSold(godTile: GodTile, goldEarned: number): void {
    // Play purchase sound (selling also uses coin sound)
    AudioManager.getInstance().playSFX('shopPurchase');

    // Remove from active god tiles
    const index = this._activeGodTiles.findIndex(t => t.id === godTile.id);
    if (index !== -1) {
      this._activeGodTiles.splice(index, 1);
    }

    // Update UI
    this.updateGoldDisplay();
    this._shopUI.updateOwnedItems(this._activeGodTiles, this._flowerCardManager);

    // Show feedback
    this.showSellFeedback(godTile, goldEarned);
  }

  private updateGoldDisplay(): void {
    this._goldText.setText(`金币: ${this._shop.playerGold}`);
  }

  private showPurchaseFeedback(item: ShopItem): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    const itemName = item.type === 'god_tile'
      ? (item.item as GodTile).displayName
      : (item.item as FlowerCard).name;

    const feedbackText = this.add.text(
      centerX,
      centerY - 100,
      `购买成功!\n${itemName}`,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '20px',
        color: '#00ff00',
        align: 'center',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 }
      }
    );
    feedbackText.setOrigin(0.5);
    feedbackText.setAlpha(0);

    this.tweens.add({
      targets: feedbackText,
      alpha: 1,
      y: centerY - 120,
      duration: 300,
      ease: 'Back.Out',
      onComplete: () => {
        this.time.delayedCall(1000, () => {
          this.tweens.add({
            targets: feedbackText,
            alpha: 0,
            duration: 200,
            onComplete: () => feedbackText.destroy()
          });
        });
      }
    });
  }

  private showSellFeedback(godTile: GodTile, goldEarned: number): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    const feedbackText = this.add.text(
      centerX,
      centerY - 100,
      `卖出 ${godTile.displayName}\n获得 ${goldEarned} 金币`,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '18px',
        color: '#ffaa00',
        align: 'center',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 }
      }
    );
    feedbackText.setOrigin(0.5);
    feedbackText.setAlpha(0);

    this.tweens.add({
      targets: feedbackText,
      alpha: 1,
      y: centerY - 120,
      duration: 300,
      ease: 'Back.Out',
      onComplete: () => {
        this.time.delayedCall(1000, () => {
          this.tweens.add({
            targets: feedbackText,
            alpha: 0,
            duration: 200,
            onComplete: () => feedbackText.destroy()
          });
        });
      }
    });
  }

  private onNextRoundClicked(): void {
    // Fade out and transition to next round
    this.cameras.main.fadeOut(500);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Calculate next round target score (increase difficulty)
      const nextTargetScore = Math.floor(1000 + (this._roundNumber * 500));

      // Transition to GameScene
      this.scene.start('GameScene', {
        roundNumber: this._roundNumber + 1,
        targetScore: nextTargetScore,
        activeGodTiles: this._activeGodTiles,
        gold: this._shop.playerGold,
        flowerCardManager: this._flowerCardManager,
        totalFansFormed: this._totalFansFormed,
        totalGodTilesCollected: this._totalGodTilesCollected,
        deckVariant: this._deckVariant
      });
    });
  }
}
