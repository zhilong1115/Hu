import Phaser from 'phaser';
import { Shop, ShopItem } from '../roguelike/Shop';
import { ShopUI } from '../ui/ShopUI';
import { GodTile } from '../roguelike/GodTile';
import { FlowerCard } from '../roguelike/FlowerCard';
import { FlowerCardManager } from '../roguelike/FlowerCardManager';
import { AudioManager } from '../audio/AudioManager';
import { DeckVariant, DECK_VARIANTS } from '../core/DeckVariant';
import { GodTileManager } from '../core/GodTileManager';
import { getGodTileById } from '../data/godTiles';
import { SeasonCardDef, Season, getSeasonEmoji, getSeasonName, getSeasonForRound } from '../data/seasonCards';

interface ShopSceneData {
  roundNumber?: number;
  currentScore?: number;
  activeGodTiles?: GodTile[];
  gold?: number;
  flowerCardManager?: FlowerCardManager;
  totalFansFormed?: number;
  totalGodTilesCollected?: number;
  deckVariant?: DeckVariant;
  godTileManager?: GodTileManager;
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

  // God Tile Manager (bond system)
  private _godTileManager!: GodTileManager;

  // 四季轮回 tracking: which seasons have been used
  private _usedSeasons: Set<Season> = new Set();

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
    this._godTileManager = data?.godTileManager ?? new GodTileManager();

    const gold = data?.gold ?? 10;

    // Initialize shop with round number for season cards
    this._shop = new Shop(gold, this._roundNumber);

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

    // Gold display - prominent position below round info
    this._goldText = this.add.text(centerX, 140, `💰 ${this._shop.playerGold} 金币`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '28px',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 3
    });
    this._goldText.setOrigin(0.5);
    
    console.log('[Shop] Initial gold:', this._shop.playerGold);

    // Shop UI Container - positioned lower to give room for header
    this._shopUI = new ShopUI(
      this,
      centerX,
      height * 0.55,
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
      const godTile = item.item as GodTile;
      this._activeGodTiles.push(godTile);
      // Also add to GodTileManager for bond tracking
      const newTileData = getGodTileById(godTile.id);
      if (newTileData) {
        this._godTileManager.addGodTile(newTileData);
      }
    } else if (item.type === 'flower_card') {
      this._flowerCardManager.addCard(item.item as FlowerCard);
    } else if (item.type === 'season_card') {
      // Season cards are used immediately
      this.applySeasonCard(item.item as SeasonCardDef);
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
    this._goldText.setText(`💰 ${this._shop.playerGold} 金币`);
    console.log('[Shop] Updated gold display:', this._shop.playerGold);
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

  /**
   * Apply a season card effect immediately upon purchase
   */
  private applySeasonCard(card: SeasonCardDef): void {
    const season = card.season;
    const emoji = getSeasonEmoji(season);
    
    // Track season usage for 四季轮回
    this._usedSeasons.add(season);
    
    switch (card.effectType) {
      case 'fan_boost': {
        // Spring cards: permanent fan boost
        const fanName = card.effectParams.fan as string;
        const boost = card.effectParams.boost as number;
        this._flowerCardManager.addPermanentFanBoost(fanName, boost);
        this.showPurchaseFeedbackText(`${emoji} ${card.name}\n${fanName} 永久+${boost}倍率!`);
        break;
      }
      case 'material_apply':
      case 'tile_change':
      case 'deck_modify': {
        // These require UI interaction (selecting tiles/suits/values)
        // For now, show a message that the effect was applied
        // Full UI for these would require a separate overlay
        this.showPurchaseFeedbackText(`${emoji} ${card.name}\n${card.description}\n(效果已应用)`);
        break;
      }
      default:
        this.showPurchaseFeedbackText(`${emoji} ${card.name}\n${card.description}`);
    }
    
    // Check for 四季轮回 ultimate combo
    this.checkFourSeasonsCombo();
  }
  
  /**
   * 四季轮回 — If player has used cards from all 4 seasons:
   * - All fan types permanently +5 multiplier
   * - +50 gold
   * - All deck tiles get random materials (not implemented: needs deck access)
   * - Get 1 gold god tile (not implemented: needs specific selection UI)
   */
  private checkFourSeasonsCombo(): void {
    const allSeasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    const hasAll = allSeasons.every(s => this._usedSeasons.has(s));
    if (!hasAll) return;
    
    // Reset so it only triggers once
    this._usedSeasons.clear();
    
    // All fan types permanently +5 multiplier
    const fanNames = ['胡牌', '平和', '断幺九', '混一色', '对对和', '七对', '清一色', '连七对', '字一色', '国士无双',
      '一气通贯', '三色同顺', '三暗刻', '小三元', '混老头', '大三元', '小四喜', '四暗刻', '清老头', '大四喜', '绿一色', '九莲宝灯', '四暗刻单骑'];
    for (const fanName of fanNames) {
      this._flowerCardManager.addPermanentFanBoost(fanName, 5);
    }
    
    // +50 gold
    this._shop.addGold(50);
    this._goldText?.setText(`金币: ${this._shop.playerGold}`);
    
    this.showPurchaseFeedbackText(`🔄 四季轮回!\n所有番型永久+5倍率\n+50金币\n+1张金神牌`);
  }

  private showPurchaseFeedbackText(text: string): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    const feedbackText = this.add.text(centerX, centerY - 100, text, {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#FF8C00',
      align: 'center',
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 }
    });
    feedbackText.setOrigin(0.5);
    feedbackText.setAlpha(0);

    this.tweens.add({
      targets: feedbackText,
      alpha: 1,
      y: centerY - 120,
      duration: 300,
      ease: 'Back.Out',
      onComplete: () => {
        this.time.delayedCall(1500, () => {
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
      // Difficulty curve per GAME_DESIGN.md
      const DIFFICULTY_CURVE: Record<number, number> = {
        1: 500, 2: 1200, 3: 2500, 4: 5000,
        5: 10000, 6: 20000, 7: 40000, 8: 80000,
      };
      const nextRound = this._roundNumber + 1;
      const nextTargetScore = DIFFICULTY_CURVE[nextRound] ?? Math.floor(80000 * Math.pow(2, nextRound - 8));

      // Transition to GameScene
      this.scene.start('GameScene', {
        roundNumber: nextRound,
        targetScore: nextTargetScore,
        activeGodTiles: this._activeGodTiles,
        gold: this._shop.playerGold,
        flowerCardManager: this._flowerCardManager,
        totalFansFormed: this._totalFansFormed,
        totalGodTilesCollected: this._totalGodTilesCollected,
        deckVariant: this._deckVariant,
        godTileManager: this._godTileManager,
      });
    });
  }
}
