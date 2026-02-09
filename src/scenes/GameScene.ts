import Phaser from 'phaser';
import { Round, RoundState } from '../core/Round';
import { Hand, Meld } from '../core/Hand';
import { FanEvaluator, Fan } from '../core/FanEvaluator';
import { Scoring, ScoreBreakdown } from '../core/Scoring';
import { Tile, TileSuit, createFullTileSet, shuffleTiles, isSameTile } from '../core/Tile';
import { HandDisplay } from '../ui/HandDisplay';
import { ScorePopup } from '../ui/ScorePopup';
import { GodTileDisplay } from '../ui/GodTileDisplay';
import { FlowerCardDisplay } from '../ui/FlowerCardDisplay';
import { ScreenEffects } from '../ui/ScreenEffects';
import { BondStatusUI } from '../ui/BondStatusUI';
import { GodTile } from '../roguelike/GodTile';
import { FlowerCard } from '../roguelike/FlowerCard';
import { FlowerCardManager } from '../roguelike/FlowerCardManager';
import { ALL_FLOWER_CARDS, FlowerCardDef } from '../data/flowerCards';
import { createFlowerCardFromData } from '../roguelike/FlowerCard';
import { DeckVariant, DECK_VARIANTS, isRedDoraTile, getRedDoraChipBonus } from '../core/DeckVariant';
import { AudioManager } from '../audio/AudioManager';
import { GodTileManager } from '../core/GodTileManager';
import { GodTileBond, getGodTileById } from '../data/godTiles';
import { Material } from '../data/materials';
import { MaterialManager, materialManager } from '../core/MaterialManager';

/**
 * MeldType — Types of melds player can declare
 */
export type MeldType = 'chow' | 'pong' | 'kong';

/**
 * Meld gold rewards per GAME_DESIGN.md
 */
const MELD_GOLD_REWARDS: Record<MeldType, number> = {
  chow: 3,   // 吃
  pong: 5,   // 碰
  kong: 10   // 杠
};

/**
 * Gold bonus per unused discard when winning
 */
const UNUSED_DISCARD_GOLD_BONUS = 5;

/**
 * PlayedMeld — Stored meld with multiplier info
 */
export interface PlayedMeld {
  type: MeldType;
  tiles: Tile[];
  multiplier: number;
}

/**
 * GameScene — Core gameplay loop for HU!
 *
 * HU! Mahjong roguelike gameplay based on GAME_DESIGN.md:
 * - Start with 14 tiles
 * - Discard (弃牌) up to 5 times (redraw same count)
 * - Play melds (出牌: 吃/碰/杠) unlimited times
 * - Declare hu (胡!) when you have a winning hand
 * - Mobile-first portrait layout with touch controls
 */
export class GameScene extends Phaser.Scene {
  // Core game state
  private _hand!: Hand;
  private _drawPile: Tile[] = [];
  private _discardPile: Tile[] = [];

  // Played melds (出牌)
  private _playedMelds: PlayedMeld[] = [];
  private _meldMultiplier: number = 1; // Cumulative multiplier from melds

  // UI components
  private _handDisplay!: HandDisplay;
  private _scorePopup!: ScorePopup;
  private _godTileDisplay!: GodTileDisplay;
  private _flowerCardDisplay!: FlowerCardDisplay;
  private _bondStatusUI!: BondStatusUI;
  
  // New God Tile Manager (bond system)
  private _godTileManager!: GodTileManager;

  // Meld display container
  private _meldDisplayContainer!: Phaser.GameObjects.Container;

  // UI text elements
  private _scoreText!: Phaser.GameObjects.Text;
  private _targetScoreText!: Phaser.GameObjects.Text;
  private _handsRemainingText!: Phaser.GameObjects.Text;
  private _discardsRemainingText!: Phaser.GameObjects.Text;
  private _drawPileCountText!: Phaser.GameObjects.Text;
  private _goldText!: Phaser.GameObjects.Text;
  private _meldMultiplierText!: Phaser.GameObjects.Text;
  private _meldInfoText!: Phaser.GameObjects.Text;

  // Buttons
  private _playMeldButton!: Phaser.GameObjects.Text;
  private _discardButton!: Phaser.GameObjects.Text;
  private _huButton!: Phaser.GameObjects.Text;

  // Flower card selection overlay
  private _flowerSelectionOverlay!: Phaser.GameObjects.Container;
  private _pendingFlowerCallback: ((card: FlowerCard) => void) | null = null;

  // Game state
  private _currentScore: number = 0;
  private _targetScore: number = 50;
  private _handsRemaining: number = 3;
  private _discardsRemaining: number = 5;
  private _roundNumber: number = 1;
  private _gold: number = 0;

  // Stats tracking
  private _totalFansFormed: number = 0;
  private _totalGodTilesCollected: number = 0;

  // God Tiles
  private _activeGodTiles: GodTile[] = [];

  // Flower Cards
  private _flowerCardManager!: FlowerCardManager;

  // Pending flower effect: forces player to discard before the effect resolves
  private _pendingFlowerEffect: string | null = null;

  // Deck Variant
  private _deckVariant!: DeckVariant;

  // Constants
  private readonly INITIAL_HANDS = 3;
  private readonly INITIAL_DISCARDS = 5; // Updated: 5 discards per GAME_DESIGN.md
  private readonly INITIAL_HAND_SIZE = 14; // Updated: Start with 14 tiles

  constructor() {
    super({ key: 'GameScene' });
  }

  create(data?: {
    roundNumber?: number;
    targetScore?: number;
    activeGodTiles?: GodTile[];
    gold?: number;
    flowerCardManager?: FlowerCardManager;
    totalFansFormed?: number;
    totalGodTilesCollected?: number;
    deckVariant?: DeckVariant;
    godTileManager?: GodTileManager;
  }) {
    // Initialize from passed data (from shop scene)
    this._roundNumber = data?.roundNumber ?? 1;
    this._targetScore = data?.targetScore ?? 50;
    this._totalFansFormed = data?.totalFansFormed ?? 0;
    this._totalGodTilesCollected = data?.totalGodTilesCollected ?? 0;
    this._deckVariant = data?.deckVariant ?? DECK_VARIANTS.standard;

    // Initialize god tiles from data (players start with none, buy from shop)
    this._activeGodTiles = data?.activeGodTiles ?? [];

    // Initialize GodTileManager with active god tiles from shop
    if (data?.godTileManager) {
      this._godTileManager = data.godTileManager;
    } else {
      // Create GodTileManager and add all active god tiles by ID
      // Note: activeGodTiles uses legacy GodTile type, so we look up by ID
      this._godTileManager = new GodTileManager();
      for (const legacyTile of this._activeGodTiles) {
        // Look up the new god tile data by ID
        const newTile = getGodTileById(legacyTile.id);
        if (newTile) {
          this._godTileManager.addGodTile(newTile);
        }
      }
    }

    // Initialize Flower Card Manager
    if (data?.flowerCardManager) {
      this._flowerCardManager = data.flowerCardManager;
    } else {
      this._flowerCardManager = new FlowerCardManager();
    }

    this._gold = data?.gold ?? 10;
    console.log(`[Gold] GameScene started with gold: ${this._gold} (from data: ${data?.gold})`);
    this._currentScore = 0;
    this._handsRemaining = this.INITIAL_HANDS;
    this._discardsRemaining = this.INITIAL_DISCARDS;
    this._playedMelds = [];
    this._meldMultiplier = 1;

    // Start gameplay music
    AudioManager.getInstance().playMusic('gameplay');

    // Set background
    this.cameras.main.setBackgroundColor('#1a1a1a');

    // Initialize game components
    this.initializeGameState();
    this.createUI();
    this.dealInitialHand();

    // Fade in from shop
    this.cameras.main.fadeIn(500);
  }

  private initializeGameState(): void {
    // Create shuffled draw pile using the selected deck variant
    let tiles = this._deckVariant.createTileSet();

    // Apply pending deck modifications from season cards
    const pendingMods = this._flowerCardManager.getPendingDeckMods();
    if (pendingMods.length > 0) {
      tiles = this._flowerCardManager.applyDeckMods(tiles);
    }

    this._drawPile = shuffleTiles(tiles);
    this._discardPile = [];

    // Create hand
    this._hand = new Hand();
    this._hand.resetRoundLimits(0, this._discardsRemaining);
  }

  private createUI(): void {
    const centerX = this.scale.width / 2;
    const width = this.scale.width;
    const height = this.scale.height;

    // ── Header: Round info and score ──
    const headerY = 40;

    this.add.text(centerX, headerY, `回合 ${this._roundNumber}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this._scoreText = this.add.text(20, headerY + 40, `分数: ${this._currentScore}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#00ff00'
    }).setOrigin(0, 0.5);

    this._targetScoreText = this.add.text(width - 20, headerY + 40, `目标: ${this._targetScore}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#ffaa00'
    }).setOrigin(1, 0.5);

    // ── Game state info ──
    const infoY = headerY + 80;

    this._handsRemainingText = this.add.text(20, infoY, `剩余手数: ${this._handsRemaining}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#cccccc'
    }).setOrigin(0, 0.5);

    this._discardsRemainingText = this.add.text(20, infoY + 30, `剩余弃牌: ${this._discardsRemaining}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#cccccc'
    }).setOrigin(0, 0.5);

    this._drawPileCountText = this.add.text(width - 20, infoY, `牌堆: ${this._drawPile.length}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#cccccc'
    }).setOrigin(1, 0.5);

    // Gold display
    this._goldText = this.add.text(width - 20, infoY + 30, `金币: ${this._gold}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ffd700'
    }).setOrigin(1, 0.5);

    // ── Meld info display ──
    const meldInfoY = infoY + 60;
    this._meldMultiplierText = this.add.text(20, meldInfoY, `出牌倍率: ×${this._meldMultiplier}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ff66ff'
    }).setOrigin(0, 0.5);

    this._meldInfoText = this.add.text(width - 20, meldInfoY, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#aaaaaa'
    }).setOrigin(1, 0.5);

    // ── Bond Status UI (top-left) ──
    this._bondStatusUI = new BondStatusUI(this, 20, headerY + 120, this._godTileManager);
    
    // ── Played Melds display (above hand) ──
    const meldDisplayY = height * 0.28;
    this._meldDisplayContainer = this.add.container(centerX, meldDisplayY);

    // ── God Tiles display (above hand) ──
    const godTileY = height * 0.35;
    this._godTileDisplay = new GodTileDisplay(this, centerX, godTileY);
    this._godTileDisplay.setGodTiles(this._activeGodTiles);

    // ── Hand display (center of screen) ──
    const handY = height * 0.50;
    this._handDisplay = new HandDisplay(this, centerX, handY, this._hand, {
      maxWidth: width - 40,
      enableMultiSelect: true,
      enableAutoScale: true
    });

    // Listen to hand display events
    this._handDisplay.on('selectionChanged', (tiles: Tile[]) => {
      AudioManager.getInstance().playSFX('tileClick');
      this.updateButtonStates();
      this.updateMeldInfo();
    });

    // ── Flower Card display (below hand) ──
    const flowerCardY = height * 0.70;
    this._flowerCardDisplay = new FlowerCardDisplay(this, centerX, flowerCardY);
    this._flowerCardDisplay.setFlowerCards(this._flowerCardManager.getCards());

    // Listen to flower card events
    this._flowerCardDisplay.on('cardSelected', (card: FlowerCard | null) => {
      this.onFlowerCardSelected(card);
    });

    // ── Action buttons ──
    const buttonY = height - 100;
    const buttonGap = 10;
    const buttonWidth = 70;

    // 出牌 button (play meld: 吃/碰/杠)
    this._playMeldButton = this.createButton(
      centerX - buttonWidth * 1.5 - buttonGap,
      buttonY,
      '出牌',
      () => this.onPlayMeldClicked()
    );

    // 弃牌 button (discard)
    this._discardButton = this.createButton(
      centerX,
      buttonY,
      '弃牌',
      () => this.onDiscardClicked()
    );

    // 胡! button (declare win)
    this._huButton = this.createButton(
      centerX + buttonWidth * 1.5 + buttonGap,
      buttonY,
      '胡!',
      () => this.onHuClicked()
    );
    this._huButton.setStyle({ backgroundColor: '#8B0000' }); // Dark red for hu

    // Use Flower Card button (below main buttons)
    const useCardButton = this.createButton(
      centerX,
      buttonY + 50,
      '用花牌',
      () => this.onUseFlowerCardClicked()
    );
    useCardButton.setStyle({ fontSize: '16px', padding: { x: 15, y: 8 } });

    // ── Score popup (hidden initially) ──
    this._scorePopup = new ScorePopup(this, centerX, height / 2);
    this._scorePopup.on('continue', () => {
      this.checkWinLoseCondition();
    });

    // ── Flower card selection overlay (hidden initially) ──
    this.createFlowerSelectionOverlay();

    // Initial button state update
    this.updateButtonStates();
  }

  private createFlowerSelectionOverlay(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this._flowerSelectionOverlay = this.add.container(centerX, centerY);
    this._flowerSelectionOverlay.setVisible(false);
    this._flowerSelectionOverlay.setDepth(1000);

    // Dark background
    const bg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.8);
    bg.setInteractive(); // Block clicks behind
    this._flowerSelectionOverlay.add(bg);

    // Title
    const title = this.add.text(0, -150, '选择花牌', {
      fontFamily: 'Courier New, monospace',
      fontSize: '28px',
      color: '#ffd700'
    }).setOrigin(0.5);
    this._flowerSelectionOverlay.add(title);
  }

  private showFlowerCardSelection(count: number, includeSeason: boolean = false): Promise<FlowerCard> {
    return new Promise((resolve) => {
      // Get random flower cards from the pool
      const shuffled = [...ALL_FLOWER_CARDS].sort(() => Math.random() - 0.5);
      const options = shuffled.slice(0, count).map(data => createFlowerCardFromData(data));

      // Clear previous card buttons
      this._flowerSelectionOverlay.each((child: Phaser.GameObjects.GameObject) => {
        if (child.getData && child.getData('isCardButton')) {
          child.destroy();
        }
      });

      // Create card selection buttons
      const cardWidth = 120;
      const totalWidth = options.length * cardWidth + (options.length - 1) * 20;
      const startX = -totalWidth / 2 + cardWidth / 2;

      options.forEach((card, index) => {
        const x = startX + index * (cardWidth + 20);
        const y = 0;

        // Card background
        const cardBg = this.add.rectangle(x, y, cardWidth, 160, 0x333355)
          .setStrokeStyle(2, 0xffd700);
        cardBg.setData('isCardButton', true);
        this._flowerSelectionOverlay.add(cardBg);

        // Card symbol
        const symbol = this.add.text(x, y - 50, card.getFlowerSymbol(), {
          fontSize: '36px'
        }).setOrigin(0.5);
        symbol.setData('isCardButton', true);
        this._flowerSelectionOverlay.add(symbol);

        // Card name
        const name = this.add.text(x, y, card.name, {
          fontFamily: 'Courier New, monospace',
          fontSize: '14px',
          color: '#ffffff',
          wordWrap: { width: cardWidth - 10 },
          align: 'center'
        }).setOrigin(0.5);
        name.setData('isCardButton', true);
        this._flowerSelectionOverlay.add(name);

        // Card description (truncated)
        const desc = this.add.text(x, y + 40, card.description.substring(0, 20) + '...', {
          fontFamily: 'Courier New, monospace',
          fontSize: '10px',
          color: '#aaaaaa',
          wordWrap: { width: cardWidth - 10 },
          align: 'center'
        }).setOrigin(0.5);
        desc.setData('isCardButton', true);
        this._flowerSelectionOverlay.add(desc);

        // Make clickable
        cardBg.setInteractive({ useHandCursor: true });
        cardBg.on('pointerdown', () => {
          AudioManager.getInstance().playSFX('buttonClick');
          this._flowerSelectionOverlay.setVisible(false);
          this._flowerCardManager.addCard(card);
          this._flowerCardDisplay.setFlowerCards(this._flowerCardManager.getCards());
          resolve(card);
        });

        cardBg.on('pointerover', () => {
          cardBg.setFillStyle(0x555577);
        });

        cardBg.on('pointerout', () => {
          cardBg.setFillStyle(0x333355);
        });
      });

      // Update title based on meld type
      const title = this._flowerSelectionOverlay.getAt(1) as Phaser.GameObjects.Text;
      title.setText(`选择花牌 (${count}选1)`);

      // Show overlay
      this._flowerSelectionOverlay.setVisible(true);
    });
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    callback: () => void
  ): Phaser.GameObjects.Text {
    const button = this.add.text(x, y, label, {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 25, y: 12 }
    });
    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => {
      AudioManager.getInstance().playSFX('buttonClick');
      callback();
    });

    button.on('pointerover', () => {
      if (button.alpha === 1) {
        button.setStyle({ backgroundColor: '#555555' });
      }
    });

    button.on('pointerout', () => {
      const bgColor = button === this._huButton ? '#8B0000' : '#333333';
      button.setStyle({ backgroundColor: button.alpha === 1 ? bgColor : '#333333' });
    });

    return button;
  }

  private dealInitialHand(): void {
    // Deal initial 14 tiles (per GAME_DESIGN.md)
    const tiles: Tile[] = [];
    for (let i = 0; i < this.INITIAL_HAND_SIZE; i++) {
      if (this._drawPile.length > 0) {
        tiles.push(this._drawPile.pop()!);
      }
    }

    // Add tiles to hand
    for (const tile of tiles) {
      this._hand.addTile(tile);
    }

    // Apply god tile round start effects (Transform bond: apply materials)
    // Apply round start effects directly to hand tiles (modifies in place)
    // Cast to mutable array since applyRoundStartEffects needs to modify tile materials
    const effectDescriptions = this._godTileManager.applyRoundStartEffects(this._hand.tiles as Tile[]);
    
    // Show effect messages with slight delay for each
    effectDescriptions.forEach((desc, index) => {
      this.time.delayedCall(500 + index * 800, () => {
        this.showMessage(`🔄 ${desc}`, '#00ff00');
        AudioManager.getInstance().playSFX('tilePlace');
      });
    });
    
    // Apply gold bonus from 财神 (15 gold at round start)
    const roundStartGoldBonus = this._godTileManager.getRoundStartGoldBonus();
    if (roundStartGoldBonus > 0) {
      this._gold += roundStartGoldBonus;
      this.time.delayedCall(300, () => {
        this.updateGoldDisplay();
        this.showMessage(`💰 财神: +${roundStartGoldBonus}金币!`, '#ffd700');
      });
    }

    // Animate deal
    this._handDisplay.updateDisplay();
    
    // Refresh material indicators after effects are applied
    if (effectDescriptions.length > 0) {
      this.time.delayedCall(100, () => {
        this._handDisplay.refreshMaterialIndicators();
      });
    }
    
    this.updateDrawPileCount();
  }

  /* ── Meld Detection ─────────────────────────────────────── */

  /**
   * Detect what type of meld the selected tiles form
   */
  private detectMeldType(tiles: Tile[]): MeldType | null {
    if (tiles.length === 3) {
      // Check for Pong (碰) - 3 identical tiles
      if (this.isPong(tiles)) {
        return 'pong';
      }
      // Check for Chow (吃) - 3 consecutive same-suit tiles
      if (this.isChow(tiles)) {
        return 'chow';
      }
    } else if (tiles.length === 4) {
      // Check for Kong (杠) - 4 identical tiles
      if (this.isKong(tiles)) {
        return 'kong';
      }
    }
    return null;
  }

  private isPong(tiles: Tile[]): boolean {
    if (tiles.length !== 3) return false;
    return isSameTile(tiles[0], tiles[1]) && isSameTile(tiles[1], tiles[2]);
  }

  private isChow(tiles: Tile[]): boolean {
    if (tiles.length !== 3) return false;

    // Chows only work with number suits (Wan, Tiao, Tong)
    const numberSuits = [TileSuit.Wan, TileSuit.Tiao, TileSuit.Tong];
    if (!numberSuits.includes(tiles[0].suit)) return false;

    // All must be same suit
    if (tiles[0].suit !== tiles[1].suit || tiles[1].suit !== tiles[2].suit) {
      return false;
    }

    // Sort by value and check consecutive
    const sorted = [...tiles].sort((a, b) => a.value - b.value);
    return sorted[1].value === sorted[0].value + 1 &&
           sorted[2].value === sorted[1].value + 1;
  }

  private isKong(tiles: Tile[]): boolean {
    if (tiles.length !== 4) return false;
    return isSameTile(tiles[0], tiles[1]) &&
           isSameTile(tiles[1], tiles[2]) &&
           isSameTile(tiles[2], tiles[3]);
  }

  private getMeldName(type: MeldType): string {
    switch (type) {
      case 'chow': return '吃 (顺子)';
      case 'pong': return '碰 (刻子)';
      case 'kong': return '杠 (四张)';
    }
  }

  private getMeldFlowerCount(type: MeldType): number {
    switch (type) {
      case 'chow': return 2; // 2选1
      case 'pong': return 3; // 3选1
      case 'kong': return 5; // 5选1
    }
  }

  private getMeldMultiplier(type: MeldType): number {
    switch (type) {
      case 'chow': return 1;
      case 'pong': return 1;
      case 'kong': return 3; // Kong gives ×3
    }
  }

  /* ── Button Actions ─────────────────────────────────────── */

  /**
   * 出牌 - Play a meld (吃/碰/杠)
   */
  private async onPlayMeldClicked(): Promise<void> {
    const selectedTiles = this._handDisplay.selectedTiles;

    if (selectedTiles.length === 0) {
      this.showMessage('请选择要出的牌组合', '#ff4444');
      return;
    }

    // Detect meld type
    const meldType = this.detectMeldType(selectedTiles);

    if (!meldType) {
      this.showMessage('无效组合！需要: 吃(3连续) / 碰(3相同) / 杠(4相同)', '#ff4444');
      return;
    }

    // Play sound
    AudioManager.getInstance().playSFX('tilePlace');

    // Remove tiles from hand
    for (const tile of selectedTiles) {
      this._hand.removeTile(tile);
    }

    // Store the meld
    const meld: PlayedMeld = {
      type: meldType,
      tiles: [...selectedTiles],
      multiplier: this.getMeldMultiplier(meldType)
    };
    this._playedMelds.push(meld);

    // Update multiplier
    this._meldMultiplier *= meld.multiplier;

    // Add meld to Hand object for scoring
    this._hand.addMeld({
      type: meldType,
      tiles: [...selectedTiles]
    });

    // Add gold reward for meld
    const meldGoldReward = MELD_GOLD_REWARDS[meldType];
    const goldBefore = this._gold;
    this._gold += meldGoldReward;
    console.log(`[Gold] Meld ${meldType} reward: +${meldGoldReward}, Before: ${goldBefore}, After: ${this._gold}`);
    this.updateGoldDisplay();

    // Show meld animation with gold reward
    this.showMessage(`${this.getMeldName(meldType)} ×${meld.multiplier} +${meldGoldReward}💰`, '#00ff00');

    // Apply gold bonus from 招财猫 god tile
    const meldGoldBonus = this._godTileManager.getMeldGoldBonus();
    if (meldGoldBonus > 0) {
      this._gold += meldGoldBonus;
      this.updateGoldDisplay();
      this.showMessage(`招财猫: +${meldGoldBonus}金币!`, '#ffd700');
    }

    // Update displays
    this._handDisplay.updateDisplay();
    this.updateMeldDisplay();
    this.updateMeldMultiplierDisplay();
    this.updateButtonStates();
    
    // Update bond status UI
    this._bondStatusUI.updateDisplay();

    // Show flower card selection with potential extra choices from god tiles
    let flowerCount = this.getMeldFlowerCount(meldType);
    flowerCount += this._godTileManager.getExtraFlowerCardChoices();
    await this.showFlowerCardSelection(flowerCount, meldType === 'kong');

    // 赌运初开: 20% chance for an extra flower card on meld play
    if (this._godTileManager.hasGodTile('gamble_beginner_luck')) {
      const { success } = this._godTileManager.rollProbability(0.2);
      if (success) {
        this.showMessage('🎲 赌运初开: 额外花牌!', '#00ff00');
        await this.showFlowerCardSelection(1);
      }
    }

    // For Kong: draw one tile to compensate (杠后补牌)
    if (meldType === 'kong') {
      if (this._drawPile.length > 0) {
        const drawnTile = this._drawPile.pop()!;
        this._hand.addTile(drawnTile);
        this._handDisplay.updateDisplay();
        this.updateDrawPileCount();
        this.showMessage(`杠后补牌: ${drawnTile.displayName}`, '#00ccff');
      }
      // Kong bonus: give a bonus flower card selection
      this.showMessage('杠牌奖励: 额外花牌!', '#ffd700');
      await this.showFlowerCardSelection(2);
    }
    
    // Vision bond Lv1 effect: reveal top 2 deck cards after meld
    const visibleCount = this._godTileManager.getVisibleTilesAfterMeld();
    if (visibleCount > 0 && visibleCount < Infinity) {
      this.revealTopDeckTiles(visibleCount);
    }
  }
  
  /**
   * Reveal top N tiles from the deck (Vision bond effect)
   */
  private revealTopDeckTiles(count: number): void {
    if (this._drawPile.length === 0) return;
    
    const tilesToReveal = this._drawPile.slice(-Math.min(count, this._drawPile.length));
    const tileNames = tilesToReveal.map(t => t.displayName).join(', ');
    
    this.showMessage(`👁️ 洞察: 牌堆顶 ${tilesToReveal.length}张 → ${tileNames}`, '#00ccff');
    
    // TODO: Add visual indicator for revealed tiles in deck
  }

  /**
   * 胡! - Declare a winning hand
   */
  private onHuClicked(): void {
    // Must have a proper hand structure to hu
    // With melds, hand tiles + meld tiles should form a valid pattern
    
    // Calculate expected total tiles based on melds
    // Standard: 4 melds + 1 pair = 14 tiles (no kongs)
    // Each kong adds 1 extra tile (4 tiles instead of 3)
    const kongCount = this._playedMelds.filter(m => m.type === 'kong').length;
    const expectedTiles = 14 + kongCount;

    // Calculate actual total tiles (hand + melds)
    const handTileCount = this._hand.tiles.length;
    const meldTileCount = this._playedMelds.reduce((sum, m) => sum + m.tiles.length, 0);
    const totalTiles = handTileCount + meldTileCount;

    if (totalTiles !== expectedTiles) {
      this.showMessage(`需要${expectedTiles}张牌才能胡! (当前: ${totalTiles}张)`, '#ff4444');
      return;
    }

    // Combine hand tiles with meld tiles for evaluation
    const allTiles = [
      ...this._hand.tiles,
      ...this._playedMelds.flatMap(m => m.tiles)
    ];

    // Evaluate hand
    const evalResult = FanEvaluator.evaluateHand(allTiles as Tile[]);

    if (!evalResult.isWinning) {
      // Pihu (屁胡) fallback - give base 50 points
      this.handlePihu();
      return;
    }

    // Play fan announce sound
    AudioManager.getInstance().playSFX('fanAnnounce');

    // ── Settle On-Win flower cards (兰/竹马/菊残) ──
    const chowCount = this._playedMelds.filter(m => m.type === 'chow').length;
    const pongCount = this._playedMelds.filter(m => m.type === 'pong').length;
    const onWinResult = this._flowerCardManager.settleOnWinCards({
      discardsRemaining: this._discardsRemaining,
      chowCount,
      pongCount,
      meldCount: this._playedMelds.length,
    });

    // Show on-win card descriptions
    onWinResult.descriptions.forEach((desc, i) => {
      this.time.delayedCall(200 + i * 600, () => {
        this.showMessage(`🌺 ${desc}`, '#ff88ff');
      });
    });

    // Apply on-win gold bonus
    if (onWinResult.goldBonus > 0) {
      this._gold += onWinResult.goldBonus;
      this.updateGoldDisplay();
    }

    // Handle 玉兰花开 permanent fan boost
    const onWinCards = this._flowerCardManager.getOnWinCards();
    for (const card of onWinCards) {
      if (card.defId === 'orchid_yulan') {
        // Add permanent +5 to the fan types that were detected
        for (const fan of evalResult.fans) {
          this._flowerCardManager.addPermanentFanBoost(fan.name, 5);
        }
      }
    }

    // Calculate score with bonds integration
    let scoreBreakdownWithBonds = Scoring.calculateScoreWithBonds(
      allTiles as Tile[],
      evalResult.fans,
      this._activeGodTiles,
      this._godTileManager,
      {
        gold: this._gold,
        meldMultiplier: this._meldMultiplier
      },
      evalResult.decomposition
    );

    let finalChips = scoreBreakdownWithBonds.totalChips;
    let finalMult = scoreBreakdownWithBonds.totalMult;

    // Apply on-win flower card multiplier bonuses
    finalMult = (finalMult + onWinResult.multAdd) * onWinResult.multX;

    // Apply Red Dora bonuses (if using Red Dora deck)
    let redDoraBonus = 0;
    if (this._deckVariant.id === 'redDora') {
      for (const tile of allTiles) {
        redDoraBonus += getRedDoraChipBonus(tile);
      }
      finalChips += redDoraBonus;
    }

    // Apply deck variant scoring modifiers
    if (this._deckVariant.scoringModifier?.chipBonus) {
      finalChips += this._deckVariant.scoringModifier.chipBonus;
    }
    if (this._deckVariant.scoringModifier?.multBonus) {
      finalMult += this._deckVariant.scoringModifier.multBonus;
    }

    // Recalculate final score with modifiers
    const modifiedScore = Math.floor(finalChips * finalMult);
    let scoreBreakdown: ScoreBreakdown = {
      ...scoreBreakdownWithBonds,
      totalChips: finalChips,
      totalMult: finalMult,
      finalScore: modifiedScore
    };
    
    // Log bond effects if any
    if (scoreBreakdownWithBonds.bondEffects.length > 0) {
      console.log('Bond effects applied:', scoreBreakdownWithBonds.bondEffects);
    }
    
    // Show roulette animation if applicable
    if (scoreBreakdownWithBonds.rouletteResult) {
      const r = scoreBreakdownWithBonds.rouletteResult;
      this.showMessage(`🎲 赌神轮盘: ${r.operation}${r.value}!`, '#ffd700');
    }

    // Update flower card display after on-win settlement consumed cards
    this._flowerCardDisplay.setFlowerCards(this._flowerCardManager.getCards());

    // Handle material breaking/degradation after hu
    const breakReduction = this._godTileManager.getShatterReduction();
    const breakModifier = 1 - breakReduction; // 0 = no breaks, 0.5 = half, 1 = normal
    const breakResults = materialManager.handleBreaking(allTiles as Tile[], breakModifier);
    if (breakResults.length > 0) {
      let breakGold = 0;
      const breakMessages: string[] = [];
      for (const br of breakResults) {
        breakGold += br.goldEarned;
        if (br.newMaterial) {
          breakMessages.push(`${br.tileName}: ${br.oldMaterial} → ${br.newMaterial}`);
        } else {
          breakMessages.push(`${br.tileName}: ${br.oldMaterial} 碎裂!`);
        }
      }
      this._gold += breakGold;
      this.time.delayedCall(500, () => {
        this.showMessage(`材质变化: ${breakMessages.join(', ')}`, '#ff8800');
      });
    }

    // Deduct a hand
    this._handsRemaining--;
    this._currentScore += scoreBreakdown.finalScore;
    this._gold += scoreBreakdown.totalGold;

    // Apply unused discard bonus (+5 gold per unused discard)
    const unusedDiscardBonus = this._discardsRemaining * UNUSED_DISCARD_GOLD_BONUS;
    console.log(`[Gold] Unused discards: ${this._discardsRemaining}, Bonus per: ${UNUSED_DISCARD_GOLD_BONUS}, Total bonus: ${unusedDiscardBonus}`);
    if (unusedDiscardBonus > 0) {
      const goldBeforeBonus = this._gold;
      this._gold += unusedDiscardBonus;
      console.log(`[Gold] Unused discard bonus applied. Before: ${goldBeforeBonus}, After: ${this._gold}`);
      this.showMessage(`剩余弃牌奖励: +${unusedDiscardBonus}💰 (${this._discardsRemaining}×${UNUSED_DISCARD_GOLD_BONUS})`, '#ffd700');
    }

    // Apply deck variant gold bonus
    if (this._deckVariant.scoringModifier?.goldBonus) {
      this._gold += this._deckVariant.scoringModifier.goldBonus;
    }
    
    // Update gold display
    this.updateGoldDisplay();

    // Track stats
    this._totalFansFormed += evalResult.fans.length;

    // Add screen effects based on score
    const totalPoints = evalResult.fans.reduce((sum, f) => sum + f.points, 0);

    // Highlight winning tiles sequentially
    this._handDisplay.highlightWinningTilesSequentially(allTiles as Tile[], () => {
      // Play tile placement sounds during highlight
      AudioManager.getInstance().playSFX('tilePlace');

      // Trigger God Tile visual effects
      this._godTileDisplay.triggerActivatedTiles();

      // Add screen effects based on score quality
      if (totalPoints >= 88) {
        // Epic win - confetti + shake + zoom
        ScreenEffects.shakeIntense(this);
        ScreenEffects.confetti(this, 60);
        ScreenEffects.zoom(this, 1.05, 400);
      } else if (totalPoints >= 64) {
        // Big win - shake + particles
        ScreenEffects.shake(this, 8, 400);
        ScreenEffects.explosion(this, this.scale.width / 2, this.scale.height / 2, 0xff4444, 30);
      } else if (totalPoints >= 24) {
        // Good win - subtle shake
        ScreenEffects.shake(this, 5, 300);
        ScreenEffects.flash(this, 0xffd700, 150);
      } else if (scoreBreakdown.finalScore >= 10000) {
        // Big score even with low fan - particles
        ScreenEffects.explosion(this, this.scale.width / 2, this.scale.height / 2, 0x4da6ff, 20);
      }

      // Small delay before showing score popup
      this.time.delayedCall(300, () => {
        // Show score popup with fan pattern names
        this.showScorePopup(scoreBreakdown, evalResult.fans);
      });
    });

    // Update UI
    this.updateScoreDisplay();
    this.updateHandsRemaining();
  }

  /**
   * Handle 屁胡 (no valid pattern) - give base 50 points
   */
  private handlePihu(): void {
    AudioManager.getInstance().playSFX('tilePlace');

    // Base pihu score
    const baseScore = 50;
    const finalScore = Math.floor(baseScore * this._meldMultiplier);

    this._handsRemaining--;
    this._currentScore += finalScore;

    // Apply unused discard bonus (+5 gold per unused discard)
    const unusedDiscardBonus = this._discardsRemaining * UNUSED_DISCARD_GOLD_BONUS;
    console.log(`[Gold] Pihu - Unused discards: ${this._discardsRemaining}, Bonus: ${unusedDiscardBonus}`);
    if (unusedDiscardBonus > 0) {
      const goldBeforePihu = this._gold;
      this._gold += unusedDiscardBonus;
      console.log(`[Gold] Pihu bonus applied. Before: ${goldBeforePihu}, After: ${this._gold}`);
      this.updateGoldDisplay();
    }

    this.showMessage(`屁胡! +${finalScore}分 (基础50分 × ${this._meldMultiplier}倍)${unusedDiscardBonus > 0 ? ` +${unusedDiscardBonus}💰` : ''}`, '#ffaa00');

    // Update UI
    this.updateScoreDisplay();
    this.updateHandsRemaining();

    // Check win/lose after delay
    this.time.delayedCall(1500, () => {
      this.checkWinLoseCondition();
    });
  }

  private async onDiscardClicked(): Promise<void> {
    const selectedTiles = this._handDisplay.selectedTiles;

    if (selectedTiles.length === 0) {
      this.showMessage('请选择要弃的牌', '#ff4444');
      return;
    }

    // In forced-discard mode, bypass normal discard count check
    if (!this._pendingFlowerEffect && this._discardsRemaining <= 0) {
      this.showMessage('没有剩余弃牌次数', '#ff4444');
      return;
    }

    // 寒梅傲雪: allow discarding any number (still counts as 1 discard)
    const hasUnlimitedDiscard = this._flowerCardManager.hasDebuff('hanmei_unlimited_discard');
    if (hasUnlimitedDiscard) {
      this._flowerCardManager.removeDebuff('hanmei_unlimited_discard');
      this.showMessage('寒梅傲雪: 弃任意数量!', '#ff88ff');
    }

    // Discard selected tiles
    const success = this._hand.discardTiles(selectedTiles);

    if (!success) {
      this.showMessage('弃牌失败', '#ff4444');
      return;
    }

    // Play discard sound
    AudioManager.getInstance().playSFX('tileDiscard');

    // 暗香浮动: +5 gold per discarded tile
    if (this._flowerCardManager.hasDebuff('plum_anxiang_gold_discard')) {
      this._flowerCardManager.removeDebuff('plum_anxiang_gold_discard');
      const anxiangGold = selectedTiles.length * 5;
      this._gold += anxiangGold;
      this.updateGoldDisplay();
      this.showMessage(`暗香浮动: +${anxiangGold}金币 (${selectedTiles.length}张×5)`, '#ff88ff');
    }

    // Add to discard pile and handle bamboo material discard bonus
    let bambooGold = 0;
    for (const tile of selectedTiles) {
      bambooGold += materialManager.handleBambooDiscard(tile);
    }
    this._discardPile.push(...selectedTiles);
    if (bambooGold > 0) {
      this._gold += bambooGold;
      this.updateGoldDisplay();
      this.showMessage(`竹牌弃牌奖励: +${bambooGold}金币`, '#8BC34A');
    }

    // Apply gold bonus from 金蟾 god tile
    const discardGoldBonus = this._godTileManager.getDiscardGoldBonus();
    if (discardGoldBonus > 0) {
      const totalBonus = discardGoldBonus * selectedTiles.length;
      this._gold += totalBonus;
      this.updateGoldDisplay();
      this.showMessage(`金蟾: +${totalBonus}金币!`, '#ffd700');
    }
    
    // Gamble bond: 浑水摸鱼 - 20% chance to draw 2 extra tiles to choose from
    let extraDraws = 0;
    if (this._godTileManager.hasGodTile('gamble_muddy_waters')) {
      const { success } = this._godTileManager.rollProbability(0.2);
      if (success) {
        extraDraws = 2;
        this.showMessage('🎲 浑水摸鱼: 多摸2张!', '#00ff00');
      }
    }

    // Draw new tiles
    const tilesToDraw = Math.min(selectedTiles.length + extraDraws, this._drawPile.length);
    for (let i = 0; i < tilesToDraw; i++) {
      const tile = this._drawPile.pop()!;
      this._hand.addTile(tile);
    }
    
    // If we drew extra tiles, player needs to discard the extras
    // (For now, just add them all - could add a selection UI later)

    // Deduct discard (skip if in forced-discard mode — it's a free discard from the flower effect)
    if (!this._pendingFlowerEffect) {
      this._discardsRemaining--;
      this._hand.setDiscardsRemaining(this._discardsRemaining);
    }

    // Update display
    this._handDisplay.updateDisplay();
    this.updateDiscardsRemaining();
    this.updateDrawPileCount();
    this.updateButtonStates();
    this._bondStatusUI.updateDisplay();

    // Handle pending flower effect after discard completes
    if (this._pendingFlowerEffect) {
      const effect = this._pendingFlowerEffect;
      this._pendingFlowerEffect = null;
      this.updateButtonStates(); // Re-enable buttons immediately
      await this.handlePostDiscardFlowerEffect(effect, selectedTiles);
    }
  }

  /* ── Flower Card Actions ───────────────────────────────────── */

  private onFlowerCardSelected(card: FlowerCard | null): void {
    // Card selection handled by FlowerCardDisplay
    // Can add additional logic here if needed
  }

  private async onUseFlowerCardClicked(): Promise<void> {
    const selectedCard = this._flowerCardDisplay.getSelectedCard();

    if (!selectedCard) {
      this.showMessage('请先选择一张花牌', '#ff4444');
      return;
    }

    // Check if player can afford instant cards
    if (selectedCard.isInstant() && this._gold < selectedCard.cost) {
      this.showMessage(`金币不足！需要 ${selectedCard.cost} 金币`, '#ff4444');
      return;
    }

    // Deduct gold cost for instant cards
    if (selectedCard.isInstant()) {
      this._gold -= selectedCard.cost;
      this.updateGoldDisplay();
    }

    // Get selected tiles (for transform effects)
    const selectedTiles = this._handDisplay.selectedTiles;

    // Use the card
    const result = await this._flowerCardManager.useCard(selectedCard, {
      hand: this._hand,
      selectedTiles: selectedTiles,
      drawPile: this._drawPile,
      discardPile: this._discardPile,
      handsRemaining: this._handsRemaining,
      discardsRemaining: this._discardsRemaining,
      currentScore: this._currentScore,
      targetScore: this._targetScore,
      redrawHand: () => this.redrawHand(),
      clearDebuffs: () => this._flowerCardManager.clearDebuffs()
    });

    if (!result.success) {
      this.showMessage(selectedCard.getCannotPlayMessage(), '#ff4444');
      return;
    }

    // Update game state from context
    this._handsRemaining = result.context.handsRemaining;
    this._discardsRemaining = result.context.discardsRemaining;

    // Apply gold delta from card effects (bamboo/chrys gold generation)
    const goldDelta = (result.context as any).goldDelta || 0;
    if (goldDelta > 0) {
      this._gold += goldDelta;
      this.updateGoldDisplay();
      this.showMessage(`+${goldDelta} 金币`, '#ffdd00');
    }

    // 细水长流: 20% chance flower card is NOT consumed
    let cardPreserved = false;
    if (this._godTileManager.hasGodTile('gamble_steady_flow')) {
      const { success: preserved } = this._godTileManager.rollProbability(0.2);
      if (preserved) {
        cardPreserved = true;
        this.showMessage('🎲 细水长流: 花牌未消耗!', '#00ff00');
      }
    }

    if (!cardPreserved) {
      // Remove card from display with animation
      this._flowerCardDisplay.removeCard(selectedCard);
    }

    // Show success message
    this.showMessage(`使用了 ${selectedCard.name}`, '#00ff00');

    // Handle pending debuff effects from card usage
    await this.handlePendingFlowerDebuffs();

    // Update UI
    this._handDisplay.updateDisplay();
    this.updateHandsRemaining();
    this.updateDiscardsRemaining();
    this.updateButtonStates();
  }

  private redrawHand(): void {
    // Return all tiles to draw pile
    const tiles = [...this._hand.tiles];
    tiles.forEach(tile => this._hand.removeTile(tile));
    this._drawPile.push(...tiles);

    // Shuffle draw pile
    for (let i = this._drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this._drawPile[i], this._drawPile[j]] = [this._drawPile[j], this._drawPile[i]];
    }

    // Deal new hand
    for (let i = 0; i < this.INITIAL_HAND_SIZE && this._drawPile.length > 0; i++) {
      const tile = this._drawPile.pop()!;
      this._hand.addTile(tile);
    }

    this._handDisplay.updateDisplay();
    this.updateDrawPileCount();
  }

  /* ── Pending Flower Card Debuff Handling ────────────────── */

  /**
   * Handle all pending debuff flags set by flower card effects.
   * Called after onUseFlowerCardClicked processes a card.
   */
  private async handlePendingFlowerDebuffs(): Promise<void> {
    const mgr = this._flowerCardManager;

    // ── 梅花三弄: enter forced-discard mode ──
    if (mgr.hasDebuff('plum_sannong_pending')) {
      mgr.removeDebuff('plum_sannong_pending');
      this._pendingFlowerEffect = 'plum_sannong';
      this.showMessage('梅花三弄: 请先弃牌，然后从牌堆选牌', '#ff88ff');
      this.updateButtonStates();
    }

    // ── 一剪梅: enter forced-discard mode (discard exactly 1) ──
    if (mgr.hasDebuff('plum_yijian_pending')) {
      mgr.removeDebuff('plum_yijian_pending');
      this._pendingFlowerEffect = 'plum_yijian';
      this.showMessage('一剪梅: 请选择1张牌弃掉', '#ff88ff');
      this.updateButtonStates();
    }

    // ── 秋菊傲霜: random flower card ──
    if (mgr.hasDebuff('chrys_qiuju_random_flower')) {
      mgr.removeDebuff('chrys_qiuju_random_flower');
      await this.showFlowerCardSelection(3);
      this.showMessage('秋菊傲霜: 获得花牌!', '#ffd700');
    }

    // ── 持菊问道: 2 flower cards ──
    if (mgr.hasDebuff('chrys_chiju_2flowers')) {
      mgr.removeDebuff('chrys_chiju_2flowers');
      await this.showFlowerCardSelection(3);
      await this.showFlowerCardSelection(3);
      this.showMessage('持菊问道: 获得2张花牌!', '#ffd700');
    }

    // ── 采菊东篱: random god tile ──
    if (mgr.hasDebuff('chrys_caiju_random_god')) {
      mgr.removeDebuff('chrys_caiju_random_god');
      // Add a random god tile from the pool
      const { ALL_GOD_TILES } = await import('../data/godTiles');
      const available = ALL_GOD_TILES.filter(
        gt => !this._godTileManager.hasGodTile(gt.id)
      );
      if (available.length > 0) {
        const randomGod = available[Math.floor(Math.random() * available.length)];
        this._godTileManager.addGodTile(randomGod);
        this._activeGodTiles.push(randomGod as any);
        this._godTileDisplay.setGodTiles(this._activeGodTiles);
        this.showMessage(`采菊东篱: 获得神牌 ${randomGod.name}!`, '#ffd700');
      } else {
        this.showMessage('采菊东篱: 没有可用的神牌', '#aaaaaa');
      }
    }

    // ── 黄菊满地: random material on 1 random hand tile ──
    if (mgr.hasDebuff('chrys_huangju_random_material')) {
      mgr.removeDebuff('chrys_huangju_random_material');
      this.applyRandomMaterialToTiles(1);
    }

    // ── 金菊绽放: random material on up to 3 random tiles ──
    if (mgr.hasDebuff('chrys_jinju_3materials')) {
      mgr.removeDebuff('chrys_jinju_3materials');
      this.applyRandomMaterialToTiles(3);
    }

    // ── 满城尽带黄金甲: all hand tiles get gold material ──
    if (mgr.hasDebuff('chrys_huangjin_all_gold')) {
      mgr.removeDebuff('chrys_huangjin_all_gold');
      const tiles = this._hand.tiles as Tile[];
      for (const tile of tiles) {
        (tile as any).material = 'gold';
      }
      this._handDisplay.updateDisplay();
      this._handDisplay.refreshMaterialIndicators();
      this.showMessage('满城尽带黄金甲: 所有手牌变为金牌!', '#ffd700');
    }
  }

  /**
   * Handle flower card effects that trigger AFTER a forced discard.
   * Called from onDiscardClicked when _pendingFlowerEffect was set.
   */
  private async handlePostDiscardFlowerEffect(effect: string, discardedTiles: Tile[]): Promise<void> {
    if (effect === 'plum_sannong') {
      // 梅花三弄: reveal (discardCount+3) tiles from draw pile, pick discardCount
      const discardCount = discardedTiles.length;
      const revealCount = discardCount + 3;
      const pickCount = discardCount;

      if (revealCount > 0 && this._drawPile.length > 0) {
        const revealed: Tile[] = [];
        for (let i = 0; i < Math.min(revealCount, this._drawPile.length); i++) {
          revealed.push(this._drawPile.pop()!);
        }

        if (pickCount > 0 && pickCount <= revealed.length) {
          const picked = await this.showTileSelectionOverlay(
            revealed,
            pickCount,
            `梅花三弄: 选择 ${pickCount} 张牌加入手牌`
          );
          for (const tile of picked) {
            this._hand.addTile(tile);
          }
          const unpicked = revealed.filter(t => !picked.includes(t));
          this._drawPile.push(...unpicked);
          this.showMessage(`梅花三弄: 获得 ${pickCount} 张牌!`, '#ff88ff');
        } else {
          this.showMessage(`梅花三弄: 亮出 ${revealed.length} 张牌`, '#ff88ff');
          await this.showTileSelectionOverlay(revealed, 0, '梅花三弄: 查看牌堆顶牌');
          this._drawPile.push(...revealed);
        }
        this._handDisplay.updateDisplay();
        this.updateDrawPileCount();
      }
    } else if (effect === 'plum_yijian') {
      // 一剪梅: show ALL draw pile tiles sorted, player picks 1
      if (this._drawPile.length > 0) {
        const allDrawPile = [...this._drawPile];
        allDrawPile.sort((a, b) => {
          if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
          return a.value - b.value;
        });
        const picked = await this.showTileSelectionOverlay(
          allDrawPile,
          1,
          '一剪梅: 从牌库选择1张牌'
        );
        if (picked.length === 1) {
          const idx = this._drawPile.findIndex(t => t === picked[0]);
          if (idx !== -1) this._drawPile.splice(idx, 1);
          this._hand.addTile(picked[0]);
          // Shuffle draw pile after searching
          for (let i = this._drawPile.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this._drawPile[i], this._drawPile[j]] = [this._drawPile[j], this._drawPile[i]];
          }
          this.showMessage(`一剪梅: 获得 ${picked[0].displayName}!`, '#ff88ff');
        }
        this._handDisplay.updateDisplay();
        this.updateDrawPileCount();
      }
    }

    this.updateButtonStates();
  }

  /**
   * Apply random materials to N random hand tiles
   */
  private applyRandomMaterialToTiles(count: number): void {
    const randomMaterials: string[] = ['bronze', 'silver', 'gold', 'bamboo', 'ice', 'glass', 'jade'];
    const tiles = [...this._hand.tiles] as Tile[];
    // Shuffle and pick up to count tiles that don't have a material
    const candidates = tiles.filter(t => !(t as any).material || (t as any).material === 'none');
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    const toEnhance = shuffled.slice(0, Math.min(count, shuffled.length));

    for (const tile of toEnhance) {
      const mat = randomMaterials[Math.floor(Math.random() * randomMaterials.length)];
      (tile as any).material = mat;
    }

    if (toEnhance.length > 0) {
      this._handDisplay.updateDisplay();
      this._handDisplay.refreshMaterialIndicators();
      this.showMessage(`添加材质到 ${toEnhance.length} 张牌!`, '#ffd700');
    }
  }

  /**
   * Show a tile selection overlay - display tiles and let player pick N
   */
  private showTileSelectionOverlay(tiles: Tile[], pickCount: number, title: string): Promise<Tile[]> {
    return new Promise((resolve) => {
      const screenW = this.scale.width;
      const screenH = this.scale.height;
      const centerX = screenW / 2;
      const centerY = screenH / 2;
      const container = this.add.container(centerX, centerY);
      container.setDepth(1001);

      // Dark bg
      const bg = this.add.rectangle(0, 0, screenW, screenH, 0x000000, 0.85);
      bg.setInteractive();
      container.add(bg);

      // Title
      const titleText = this.add.text(0, -screenH / 2 + 30, title, {
        fontFamily: 'Courier New, monospace',
        fontSize: '20px',
        color: '#ffd700',
        wordWrap: { width: screenW - 40 },
        align: 'center'
      }).setOrigin(0.5);
      container.add(titleText);

      const selected: Set<number> = new Set();
      const tileButtons: Phaser.GameObjects.Rectangle[] = [];

      // Scrollable tile container
      const tileContainer = this.add.container(0, 0);
      container.add(tileContainer);

      // Layout tiles - adapt to screen width
      const tileW = 50;
      const tileH = 68;
      const gap = 6;
      const maxCols = Math.floor((screenW - 40) / (tileW + gap));
      const cols = Math.min(tiles.length, maxCols);
      const rows = Math.ceil(tiles.length / cols);
      const startX = -(cols * (tileW + gap) - gap) / 2 + tileW / 2;

      // Calculate available height for tiles (between title and confirm button)
      const titleBottom = -screenH / 2 + 60;
      const confirmTop = screenH / 2 - 60;
      const availableH = confirmTop - titleBottom - 20;
      const contentH = rows * (tileH + gap);
      const needsScroll = contentH > availableH;
      const tilesStartY = titleBottom + 10 + (needsScroll ? 0 : (availableH - contentH) / 2);

      // Set up scroll offset
      let scrollY = 0;
      const maxScroll = Math.max(0, contentH - availableH);

      // Create mask for scrollable area if needed
      if (needsScroll) {
        const maskShape = this.make.graphics({});
        maskShape.fillRect(
          centerX - screenW / 2, centerY + titleBottom,
          screenW, availableH
        );
        const mask = maskShape.createGeometryMask();
        tileContainer.setMask(mask);
      }

      const updateTilePositions = () => {
        tileContainer.setY(tilesStartY - scrollY);
      };

      tiles.forEach((tile, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (tileW + gap);
        const y = row * (tileH + gap);

        const tileBg = this.add.rectangle(x, y, tileW, tileH, 0x224422)
          .setStrokeStyle(2, 0x888888);
        tileBg.setInteractive({ useHandCursor: true });
        tileContainer.add(tileBg);
        tileButtons.push(tileBg);

        const tileLabel = this.add.text(x, y, tile.displayName, {
          fontFamily: 'Courier New, monospace',
          fontSize: '13px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: tileW - 4 }
        }).setOrigin(0.5);
        tileContainer.add(tileLabel);

        tileBg.on('pointerdown', () => {
          if (pickCount === 0) return;
          if (selected.has(i)) {
            selected.delete(i);
            tileBg.setFillStyle(0x224422);
            tileBg.setStrokeStyle(2, 0x888888);
          } else if (selected.size < pickCount) {
            selected.add(i);
            tileBg.setFillStyle(0x446644);
            tileBg.setStrokeStyle(3, 0x00ff00);
          }
          confirmBtn.setText(pickCount === 0 ? '确定' : `确定 (${selected.size}/${pickCount})`);
        });
      });

      updateTilePositions();

      // Scroll handling for large tile sets
      if (needsScroll) {
        bg.on('pointermove', (_pointer: Phaser.Input.Pointer) => {
          if (_pointer.isDown) {
            scrollY = Math.max(0, Math.min(maxScroll, scrollY - _pointer.velocity.y * 0.02));
            updateTilePositions();
          }
        });
        this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
          scrollY = Math.max(0, Math.min(maxScroll, scrollY + deltaY * 0.5));
          updateTilePositions();
        });
      }

      // Confirm button (fixed at bottom)
      const confirmBtn = this.add.text(0, screenH / 2 - 45,
        pickCount === 0 ? '确定' : `确定 (0/${pickCount})`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#336633',
        padding: { x: 30, y: 12 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      container.add(confirmBtn);

      confirmBtn.on('pointerdown', () => {
        if (pickCount > 0 && selected.size !== pickCount) {
          this.showMessage(`请选择 ${pickCount} 张牌`, '#ff4444');
          return;
        }
        const pickedTiles = Array.from(selected).map(idx => tiles[idx]);
        container.destroy();
        resolve(pickedTiles);
      });
    });
  }

  /**
   * Show hand tile selection - let player pick N tiles from their hand
   */
  private showTileSelectionFromHand(pickCount: number, title: string): Promise<Tile[]> {
    const handTiles = [...this._hand.tiles] as Tile[];
    return this.showTileSelectionOverlay(handTiles, pickCount, title);
  }

  /* ── UI Updates ────────────────────────────────────────── */

  private updateButtonStates(): void {
    const selectedTiles = this._handDisplay.selectedTiles;
    const hasSelection = selectedTiles.length > 0;
    const meldType = hasSelection ? this.detectMeldType(selectedTiles) : null;

    // Calculate total tiles and expected tiles (accounting for kongs)
    const kongCount = this._playedMelds.filter(m => m.type === 'kong').length;
    const expectedTiles = 14 + kongCount;
    const handTileCount = this._hand.tiles.length;
    const meldTileCount = this._playedMelds.reduce((sum, m) => sum + m.tiles.length, 0);
    const totalTiles = handTileCount + meldTileCount;

    // Forced-discard mode: disable 出牌 and 胡, only allow 弃牌
    if (this._pendingFlowerEffect) {
      this._playMeldButton.setAlpha(0.3);
      this._playMeldButton.setStyle({ color: '#666666', backgroundColor: '#222222' });
      this._playMeldButton.setText('出牌');

      this._huButton.setAlpha(0.3);
      this._huButton.setStyle({ color: '#666666', backgroundColor: '#222222' });

      // 弃牌 button: always enabled in forced-discard mode if has selection
      if (hasSelection) {
        this._discardButton.setAlpha(1);
        this._discardButton.setStyle({ color: '#ffdd00', backgroundColor: '#555500' });
        this._discardButton.setText('弃牌 ⚡');
      } else {
        this._discardButton.setAlpha(0.7);
        this._discardButton.setStyle({ color: '#ffdd00', backgroundColor: '#333300' });
        this._discardButton.setText('弃牌 ⚡');
      }
      return;
    }

    // 出牌 button: enabled if valid meld selected
    if (meldType) {
      this._playMeldButton.setAlpha(1);
      this._playMeldButton.setStyle({ color: '#ffffff', backgroundColor: '#336633' });
      this._playMeldButton.setText(`出牌(${meldType === 'chow' ? '吃' : meldType === 'pong' ? '碰' : '杠'})`);
    } else {
      this._playMeldButton.setAlpha(hasSelection ? 0.7 : 0.5);
      this._playMeldButton.setStyle({ color: '#888888', backgroundColor: '#333333' });
      this._playMeldButton.setText('出牌');
    }

    // 弃牌 button: enabled if has selection and has remaining discards
    if (hasSelection && this._discardsRemaining > 0) {
      this._discardButton.setAlpha(1);
      this._discardButton.setStyle({ color: '#ffffff', backgroundColor: '#333333' });
    } else {
      this._discardButton.setAlpha(0.5);
      this._discardButton.setStyle({ color: '#888888', backgroundColor: '#333333' });
    }

    // 胡! button: enabled if total tiles matches expected (14 + number of kongs)
    if (totalTiles === expectedTiles && this._handsRemaining > 0) {
      this._huButton.setAlpha(1);
      this._huButton.setStyle({ color: '#ffffff', backgroundColor: '#8B0000' });
    } else {
      this._huButton.setAlpha(0.5);
      this._huButton.setStyle({ color: '#888888', backgroundColor: '#333333' });
    }
  }

  private updateMeldInfo(): void {
    const selectedTiles = this._handDisplay.selectedTiles;

    if (selectedTiles.length === 0) {
      this._meldInfoText.setText('');
      return;
    }

    const meldType = this.detectMeldType(selectedTiles);

    if (meldType) {
      const flowerCount = this.getMeldFlowerCount(meldType);
      const mult = this.getMeldMultiplier(meldType);
      this._meldInfoText.setText(`${this.getMeldName(meldType)} → ×${mult}倍 + ${flowerCount}选1花牌`);
      this._meldInfoText.setStyle({ color: '#00ff00' });
    } else if (selectedTiles.length >= 3) {
      this._meldInfoText.setText('无效组合');
      this._meldInfoText.setStyle({ color: '#ff4444' });
    } else {
      this._meldInfoText.setText(`已选${selectedTiles.length}张 (需3-4张)`);
      this._meldInfoText.setStyle({ color: '#aaaaaa' });
    }
  }

  private updateMeldDisplay(): void {
    // Clear previous meld display
    this._meldDisplayContainer.removeAll(true);

    if (this._playedMelds.length === 0) return;

    // Display each meld
    const meldWidth = 80;
    const totalWidth = this._playedMelds.length * meldWidth;
    const startX = -totalWidth / 2 + meldWidth / 2;

    this._playedMelds.forEach((meld, index) => {
      const x = startX + index * meldWidth;

      // Meld type label
      const label = this.add.text(x, -20, meld.type === 'chow' ? '吃' : meld.type === 'pong' ? '碰' : '杠', {
        fontFamily: 'Courier New, monospace',
        fontSize: '14px',
        color: meld.type === 'kong' ? '#ff6600' : '#66ff66'
      }).setOrigin(0.5);
      this._meldDisplayContainer.add(label);

      // Show tile names
      const tileNames = meld.tiles.map(t => t.displayName).join(' ');
      const tilesText = this.add.text(x, 5, tileNames, {
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
        color: '#cccccc',
        wordWrap: { width: meldWidth - 5 },
        align: 'center'
      }).setOrigin(0.5);
      this._meldDisplayContainer.add(tilesText);

      // Multiplier if kong
      if (meld.multiplier > 1) {
        const multText = this.add.text(x, 25, `×${meld.multiplier}`, {
          fontFamily: 'Courier New, monospace',
          fontSize: '12px',
          color: '#ff6600'
        }).setOrigin(0.5);
        this._meldDisplayContainer.add(multText);
      }
    });
  }

  private updateMeldMultiplierDisplay(): void {
    this._meldMultiplierText.setText(`出牌倍率: ×${this._meldMultiplier}`);
    if (this._meldMultiplier > 1) {
      this._meldMultiplierText.setStyle({ color: '#ff6600' });
    }
  }

  private updateScoreDisplay(): void {
    this._scoreText.setText(`分数: ${this._currentScore}`);

    // Highlight if close to target
    if (this._currentScore >= this._targetScore) {
      this._scoreText.setStyle({ color: '#00ff00' });
    } else if (this._currentScore >= this._targetScore * 0.7) {
      this._scoreText.setStyle({ color: '#ffff00' });
    }
  }

  private updateHandsRemaining(): void {
    this._handsRemainingText.setText(`剩余手数: ${this._handsRemaining}`);

    if (this._handsRemaining === 0) {
      this._handsRemainingText.setStyle({ color: '#ff4444' });
    }
  }

  private updateDiscardsRemaining(): void {
    this._discardsRemainingText.setText(`剩余弃牌: ${this._discardsRemaining}`);

    if (this._discardsRemaining === 0) {
      this._discardsRemainingText.setStyle({ color: '#ff4444' });
    } else {
      this._discardsRemainingText.setStyle({ color: '#ffffff' });
    }
  }

  private updateDrawPileCount(): void {
    this._drawPileCountText.setText(`牌堆: ${this._drawPile.length}`);
  }

  private updateGoldDisplay(): void {
    this._goldText.setText(`金币: ${this._gold}`);
    
    // Flash effect when gold changes
    this.tweens.add({
      targets: this._goldText,
      scale: 1.2,
      duration: 100,
      yoyo: true,
      ease: 'Power2.Out'
    });
  }

  private showScorePopup(breakdown: ScoreBreakdown, fans: Fan[]): void {
    // Use the new Balatro-style animation
    this._scorePopup.showScoreWithAnimation(breakdown, fans);
  }

  private showMessage(message: string, color: string): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2 - 100;

    const messageText = this.add.text(centerX, centerY, message, {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: color,
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 }
    });
    messageText.setOrigin(0.5);
    messageText.setAlpha(0);

    // Fade in and out
    this.tweens.add({
      targets: messageText,
      alpha: 1,
      duration: 200,
      yoyo: true,
      hold: 1500,
      onComplete: () => {
        messageText.destroy();
      }
    });
  }

  /* ── Win/Lose Logic ────────────────────────────────────── */

  private checkWinLoseCondition(): void {
    // Win condition: reached target score
    if (this._currentScore >= this._targetScore) {
      this.onWin();
      return;
    }

    // Lose condition: no hands remaining and score not reached
    if (this._handsRemaining <= 0) {
      this.onLose();
      return;
    }
  }

  private onWin(): void {
    // Play win jingle
    AudioManager.getInstance().playSFX('winJingle');

    // Show win message
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    const winText = this.add.text(centerX, centerY - 50, '过关！', {
      fontFamily: 'Courier New, monospace',
      fontSize: '48px',
      color: '#00ff00'
    });
    winText.setOrigin(0.5);
    winText.setAlpha(0);

    // Process round end: ice tile melting
    const allHandTiles = [...this._hand.tiles, ...this._playedMelds.flatMap(m => m.tiles)] as Tile[];
    const meltedTiles = materialManager.processRoundEnd(allHandTiles);
    if (meltedTiles.length > 0) {
      const meltNames = meltedTiles.map(t => t.displayName).join(', ');
      this.time.delayedCall(300, () => {
        this.showMessage(`冰牌融化: ${meltNames}`, '#87CEEB');
      });
    }

    // Calculate round end gold from god tiles
    const roundEndGold = this._godTileManager.calculateRoundEndGold({
      currentGold: this._gold,
      flowerCardCount: this._flowerCardManager.getCards().length
    });
    if (roundEndGold.gold !== 0) {
      this._gold += roundEndGold.gold;
      this.updateGoldDisplay();
      for (const desc of roundEndGold.descriptions) {
        this.time.delayedCall(400, () => {
          this.showMessage(desc, '#ffd700');
        });
      }
    }

    this.tweens.add({
      targets: winText,
      alpha: 1,
      scale: 1.2,
      duration: 500,
      ease: 'Back.Out',
      onComplete: () => {
        this.time.delayedCall(1000, () => {
          // Fade out before transition
          this.cameras.main.fadeOut(500);

          this.time.delayedCall(500, () => {
            const nextRound = this._roundNumber + 1;

            // Check if next round is a boss round (every 3rd round)
            if (nextRound % 3 === 0) {
              // Transition to boss round
              this.scene.start('BossGameScene', {
                roundNumber: nextRound,
                difficulty: Math.ceil(nextRound / 3),
                activeGodTiles: this._activeGodTiles,
                gold: this._gold,
                flowerCardManager: this._flowerCardManager,
                deckVariant: this._deckVariant,
                godTileManager: this._godTileManager
              });
            } else {
              // Transition to shop scene
              console.log(`[Gold] Transitioning to shop with gold: ${this._gold}`);
              this.scene.start('ShopScene', {
                roundNumber: nextRound,
                currentScore: this._currentScore,
                activeGodTiles: this._activeGodTiles,
                gold: this._gold,
                flowerCardManager: this._flowerCardManager,
                totalFansFormed: this._totalFansFormed,
                totalGodTilesCollected: this._totalGodTilesCollected,
                deckVariant: this._deckVariant,
                godTileManager: this._godTileManager
              });
            }
          });
        });
      }
    });
  }

  private onLose(): void {
    // Play lose sound
    AudioManager.getInstance().playSFX('loseSound');

    // Show lose message
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    const loseText = this.add.text(centerX, centerY - 50, '游戏结束', {
      fontFamily: 'Courier New, monospace',
      fontSize: '48px',
      color: '#ff4444'
    });
    loseText.setOrigin(0.5);
    loseText.setAlpha(0);

    const scoreText = this.add.text(centerX, centerY + 20, `最终分数: ${this._currentScore}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '24px',
      color: '#ffffff'
    });
    scoreText.setOrigin(0.5);
    scoreText.setAlpha(0);

    this.tweens.add({
      targets: [loseText, scoreText],
      alpha: 1,
      duration: 500,
      ease: 'Power2.Out',
      onComplete: () => {
        this.time.delayedCall(2000, () => {
          // Fade out before transition
          this.cameras.main.fadeOut(500);

          this.time.delayedCall(500, () => {
            // Transition to game over scene
            this.scene.start('GameOverScene', {
              finalScore: this._currentScore,
              roundReached: this._roundNumber,
              fansFormed: this._totalFansFormed,
              godTilesCollected: this._activeGodTiles.length
            });
          });
        });
      }
    });
  }
}
