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
import { GodTile } from '../roguelike/GodTile';
import { FlowerCard } from '../roguelike/FlowerCard';
import { FlowerCardManager } from '../roguelike/FlowerCardManager';
import { COMMON_GOD_TILES, RARE_GOD_TILES } from '../data/godTilesLegacy';
import { ALL_FLOWER_CARDS, createFlowerCardFromData } from '../data/flowerCards';
import { DeckVariant, DECK_VARIANTS, isRedDoraTile, getRedDoraChipBonus } from '../core/DeckVariant';
import { AudioManager } from '../audio/AudioManager';

/**
 * MeldType — Types of melds player can declare
 */
export type MeldType = 'chow' | 'pong' | 'kong';

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

  // Meld display container
  private _meldDisplayContainer!: Phaser.GameObjects.Container;

  // UI text elements
  private _scoreText!: Phaser.GameObjects.Text;
  private _targetScoreText!: Phaser.GameObjects.Text;
  private _handsRemainingText!: Phaser.GameObjects.Text;
  private _discardsRemainingText!: Phaser.GameObjects.Text;
  private _drawPileCountText!: Phaser.GameObjects.Text;
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
  }) {
    // Initialize from passed data (from shop scene)
    this._roundNumber = data?.roundNumber ?? 1;
    this._targetScore = data?.targetScore ?? 50;
    this._totalFansFormed = data?.totalFansFormed ?? 0;
    this._totalGodTilesCollected = data?.totalGodTilesCollected ?? 0;
    this._deckVariant = data?.deckVariant ?? DECK_VARIANTS.standard;

    // For testing: add some starter God Tiles if none provided
    if (data?.activeGodTiles) {
      this._activeGodTiles = data.activeGodTiles;
    } else {
      // Add a few test God Tiles for demonstration
      this._activeGodTiles = [
        new GodTile(COMMON_GOD_TILES[0]), // 财神一万
        new GodTile(RARE_GOD_TILES[0])    // 东风神牌
      ];
    }

    // Initialize Flower Card Manager
    if (data?.flowerCardManager) {
      this._flowerCardManager = data.flowerCardManager;
    } else {
      this._flowerCardManager = new FlowerCardManager();
      // For testing: add a starter flower card
      const starterCards = ALL_FLOWER_CARDS.filter(c => c.rarity === 'common');
      if (starterCards.length > 0) {
        this._flowerCardManager.addCard(createFlowerCardFromData(starterCards[0]));
      }
    }

    this._gold = data?.gold ?? 10;
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
    this._drawPile = shuffleTiles(this._deckVariant.createTileSet());
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
    this.add.text(width - 20, infoY + 30, `金币: ${this._gold}`, {
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
      // Get random flower cards
      const availableCards = ALL_FLOWER_CARDS.filter(c => c.rarity === 'common' || c.rarity === 'rare');
      const shuffled = [...availableCards].sort(() => Math.random() - 0.5);
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

    // Animate deal
    this._handDisplay.updateDisplay();
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

    // Show meld animation
    this.showMessage(`${this.getMeldName(meldType)} ×${meld.multiplier}`, '#00ff00');

    // Update displays
    this._handDisplay.updateDisplay();
    this.updateMeldDisplay();
    this.updateMeldMultiplierDisplay();
    this.updateButtonStates();

    // Show flower card selection
    const flowerCount = this.getMeldFlowerCount(meldType);
    await this.showFlowerCardSelection(flowerCount, meldType === 'kong');

    // TODO: For Kong, also give a season card
    if (meldType === 'kong') {
      this.showMessage('获得季节牌! (待实现)', '#ffd700');
    }
  }

  /**
   * 胡! - Declare a winning hand
   */
  private onHuClicked(): void {
    // Must have a proper hand structure to hu
    // With melds, hand tiles + meld tiles should form a valid pattern

    // Calculate total tiles (hand + melds)
    const handTileCount = this._hand.tiles.length;
    const meldTileCount = this._playedMelds.reduce((sum, m) => sum + m.tiles.length, 0);
    const totalTiles = handTileCount + meldTileCount;

    if (totalTiles !== 14) {
      this.showMessage(`需要14张牌才能胡! (当前: ${totalTiles}张)`, '#ff4444');
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

    // Calculate score with God Tiles and meld multiplier
    let scoreBreakdown = Scoring.calculateScore(
      allTiles as Tile[],
      evalResult.fans,
      this._activeGodTiles,
      {},
      evalResult.decomposition
    );

    // Apply meld multiplier
    let finalChips = scoreBreakdown.totalChips;
    let finalMult = scoreBreakdown.totalMult * this._meldMultiplier;

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
    scoreBreakdown = {
      ...scoreBreakdown,
      totalChips: finalChips,
      totalMult: finalMult,
      finalScore: modifiedScore
    };

    // Deduct a hand
    this._handsRemaining--;
    this._currentScore += scoreBreakdown.finalScore;
    this._gold += scoreBreakdown.totalGold;

    // Apply deck variant gold bonus
    if (this._deckVariant.scoringModifier?.goldBonus) {
      this._gold += this._deckVariant.scoringModifier.goldBonus;
    }

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

    this.showMessage(`屁胡! +${finalScore}分 (基础50分 × ${this._meldMultiplier}倍)`, '#ffaa00');

    // Update UI
    this.updateScoreDisplay();
    this.updateHandsRemaining();

    // Check win/lose after delay
    this.time.delayedCall(1500, () => {
      this.checkWinLoseCondition();
    });
  }

  private onDiscardClicked(): void {
    const selectedTiles = this._handDisplay.selectedTiles;

    if (selectedTiles.length === 0) {
      this.showMessage('请选择要弃的牌', '#ff4444');
      return;
    }

    if (this._discardsRemaining <= 0) {
      this.showMessage('没有剩余弃牌次数', '#ff4444');
      return;
    }

    // Discard selected tiles
    const success = this._hand.discardTiles(selectedTiles);

    if (!success) {
      this.showMessage('弃牌失败', '#ff4444');
      return;
    }

    // Play discard sound
    AudioManager.getInstance().playSFX('tileDiscard');

    // Add to discard pile
    this._discardPile.push(...selectedTiles);

    // Draw new tiles
    const tilesToDraw = Math.min(selectedTiles.length, this._drawPile.length);
    for (let i = 0; i < tilesToDraw; i++) {
      const tile = this._drawPile.pop()!;
      this._hand.addTile(tile);
    }

    // Deduct discard
    this._discardsRemaining--;
    this._hand.setDiscardsRemaining(this._discardsRemaining);

    // Update display
    this._handDisplay.updateDisplay();
    this.updateDiscardsRemaining();
    this.updateDrawPileCount();
    this.updateButtonStates();
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

    // Remove card from display with animation
    this._flowerCardDisplay.removeCard(selectedCard);

    // Show success message
    this.showMessage(`使用了 ${selectedCard.name}`, '#00ff00');

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

  /* ── UI Updates ────────────────────────────────────────── */

  private updateButtonStates(): void {
    const selectedTiles = this._handDisplay.selectedTiles;
    const hasSelection = selectedTiles.length > 0;
    const meldType = hasSelection ? this.detectMeldType(selectedTiles) : null;

    // Calculate total tiles
    const handTileCount = this._hand.tiles.length;
    const meldTileCount = this._playedMelds.reduce((sum, m) => sum + m.tiles.length, 0);
    const totalTiles = handTileCount + meldTileCount;

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

    // 胡! button: enabled if total tiles = 14 and has remaining hands
    if (totalTiles === 14 && this._handsRemaining > 0) {
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
    }
  }

  private updateDrawPileCount(): void {
    this._drawPileCountText.setText(`牌堆: ${this._drawPile.length}`);
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
                deckVariant: this._deckVariant
              });
            } else {
              // Transition to shop scene
              this.scene.start('ShopScene', {
                roundNumber: nextRound,
                currentScore: this._currentScore,
                activeGodTiles: this._activeGodTiles,
                gold: this._gold,
                flowerCardManager: this._flowerCardManager,
                totalFansFormed: this._totalFansFormed,
                totalGodTilesCollected: this._totalGodTilesCollected,
                deckVariant: this._deckVariant
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
