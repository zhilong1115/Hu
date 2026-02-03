import Phaser from 'phaser';
import { Round, RoundState } from '../core/Round';
import { Hand } from '../core/Hand';
import { FanEvaluator, Fan, EvaluationResult } from '../core/FanEvaluator';
import { Scoring, ScoreBreakdown } from '../core/Scoring';
import { Tile, createFullTileSet, shuffleTiles, tileKey } from '../core/Tile';
import { GameState, PlayedMeld, MeldType, MELD_MULTIPLIERS, MELD_FLOWER_CHOICES, ACHIEVEMENT_MULTIPLIERS } from '../core/GameState';
import { HandDisplay } from '../ui/HandDisplay';
import { ScorePopup } from '../ui/ScorePopup';
import { GodTileDisplay } from '../ui/GodTileDisplay';
import { FlowerCardDisplay } from '../ui/FlowerCardDisplay';
import { ScreenEffects } from '../ui/ScreenEffects';
import { GodTile } from '../roguelike/GodTile';
import { FlowerCard } from '../roguelike/FlowerCard';
import { FlowerCardManager } from '../roguelike/FlowerCardManager';
import { COMMON_GOD_TILES, RARE_GOD_TILES } from '../data/godTiles';
import { ALL_FLOWER_CARDS, createFlowerCardFromData, FlowerCardData } from '../data/flowerCards';
import { DeckVariant, DECK_VARIANTS, isRedDoraTile, getRedDoraChipBonus } from '../core/DeckVariant';
import { AudioManager } from '../audio/AudioManager';
import { debugLog } from '../errorHandler';

/**
 * GameScene — Core gameplay loop for HU!
 *
 * Balatro-style mahjong roguelike gameplay:
 * - Draw/discard tiles to build winning hands
 * - Play hands to score chips × mult
 * - Meet score target to advance to shop
 * - Limited hands and discards per round
 * - Mobile-first portrait layout with touch controls
 */
export class GameScene extends Phaser.Scene {
  // Core game state
  private _hand!: Hand;
  private _drawPile: Tile[] = [];
  private _discardPile: Tile[] = [];

  // UI components
  private _handDisplay!: HandDisplay;
  private _scorePopup!: ScorePopup;
  private _godTileDisplay!: GodTileDisplay;
  private _flowerCardDisplay!: FlowerCardDisplay;

  // UI text elements
  private _scoreText!: Phaser.GameObjects.Text;
  private _targetScoreText!: Phaser.GameObjects.Text;
  private _handsRemainingText!: Phaser.GameObjects.Text;
  private _discardsRemainingText!: Phaser.GameObjects.Text;
  private _drawPileCountText!: Phaser.GameObjects.Text;

  // Buttons
  private _playHandButton!: Phaser.GameObjects.Text;
  private _discardButton!: Phaser.GameObjects.Text;

  // Game state
  private _currentScore: number = 0;
  private _targetScore: number = 1000;
  private _handsRemaining: number = 4;  // Now called "play actions"
  private _discardsRemaining: number = 2;
  private _roundNumber: number = 1;
  private _gold: number = 0;

  // NEW: Meld tracking for new gameplay
  private _playedMelds: PlayedMeld[] = [];
  private _accumulatedMultiplier: number = 1;
  private _discardCount: number = 0;
  private _lastPlayWasKong: boolean = false;
  private _extraDiscardLimit: number = 0;  // Bonus from 点石成金

  // Stats tracking
  private _totalFansFormed: number = 0;
  private _totalGodTilesCollected: number = 0;

  // God Tiles
  private _activeGodTiles: GodTile[] = [];

  // Flower Cards
  private _flowerCardManager!: FlowerCardManager;

  // Deck Variant
  private _deckVariant!: DeckVariant;

  // NEW: Meld area display
  private _meldAreaContainer!: Phaser.GameObjects.Container;
  private _meldTexts: Phaser.GameObjects.Text[] = [];
  private _multiplierText!: Phaser.GameObjects.Text;

  // Constants - UPDATED
  private readonly INITIAL_PLAY_ACTIONS = 999;  // Unlimited plays
  private readonly INITIAL_DISCARD_ACTIONS = 5;  // More discards
  private readonly INITIAL_HAND_SIZE = 14;  // Now 14 tiles
  private readonly MAX_DISCARD_TILES = 5;
  private readonly UNUSED_PLAY_BONUS = 0;  // No bonus since unlimited
  private readonly UNUSED_DISCARD_BONUS = 2;
  private readonly BASE_CHICKEN_SCORE = 50;  // 屁胡基础分

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
    console.log('🎮 GameScene.create() STARTED');
    debugLog('🎮 GameScene.create() STARTED');
    
    // iOS fix: Reset camera state
    this.cameras.main.setAlpha(1);
    
    // Initialize from passed data (from shop scene)
    this._roundNumber = data?.roundNumber ?? 1;
    this._targetScore = data?.targetScore ?? 1000;
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
      // Start with NO flower cards - earn them by playing melds
      this._flowerCardManager = new FlowerCardManager();
    }

    this._gold = data?.gold ?? 10;
    this._currentScore = 0;
    this._handsRemaining = this.INITIAL_PLAY_ACTIONS;
    this._discardsRemaining = this.INITIAL_DISCARD_ACTIONS;
    
    // Reset new meld tracking state
    this._playedMelds = [];
    this._accumulatedMultiplier = 1;
    this._discardCount = 0;
    this._lastPlayWasKong = false;

    // Start gameplay music
    AudioManager.getInstance().playMusic('gameplay');

    // Set background
    this.cameras.main.setBackgroundColor('#1a1a1a');

    // Initialize game components
    debugLog('🎮 Initializing game state...');
    this.initializeGameState();
    debugLog('🎮 Creating UI...');
    this.createUI();
    debugLog('🎮 Dealing initial hand...');
    this.dealInitialHand();
    debugLog('🎮 GameScene ready!');

    // Fade in from shop - DISABLED for iOS compatibility
    // this.cameras.main.fadeIn(500);
    this.cameras.main.setAlpha(1); // Ensure camera is visible
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

    // 出牌次数 now unlimited, so just show discard count
    this._handsRemainingText = this.add.text(20, infoY, ``, {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#cccccc'
    }).setOrigin(0, 0.5);
    this._handsRemainingText.setVisible(false);

    this._discardsRemainingText = this.add.text(20, infoY, `弃牌次数: ${this._discardsRemaining}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#cccccc'
    }).setOrigin(0, 0.5);
    
    // NEW: Multiplier display
    this._multiplierText = this.add.text(20, infoY + 30, `倍率: ×${this._accumulatedMultiplier.toFixed(1)}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ff6b35'
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
    const buttonGap = 15;
    const buttonWidth = 80;

    this._playHandButton = this.createButton(
      centerX - buttonWidth - buttonGap,
      buttonY,
      '出牌',
      () => this.onPlayHandClicked()
    );

    this._discardButton = this.createButton(
      centerX,
      buttonY,
      '弃牌',
      () => this.onDiscardClicked()
    );

    // Use Flower Card button
    const useCardButton = this.createButton(
      centerX + buttonWidth + buttonGap,
      buttonY,
      '用花牌',
      () => this.onUseFlowerCardClicked()
    );

    // NEW: 胡牌 button - always try to win
    const huButton = this.createButton(
      centerX + (buttonWidth + buttonGap) * 2,
      buttonY,
      '胡牌',
      () => this.onHuClicked()
    );
    huButton.setStyle({ backgroundColor: '#aa4400' });

    // ── Score popup (hidden initially) ──
    this._scorePopup = new ScorePopup(this, centerX, height / 2);
    this._scorePopup.on('continue', () => {
      this.checkWinLoseCondition();
    });

    // Initial button state update
    this.updateButtonStates();
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
      padding: { x: 30, y: 15 }
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
      button.setStyle({ backgroundColor: '#333333' });
    });

    return button;
  }

  private dealInitialHand(): void {
    // Deal initial 13 tiles
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

  /* ── Button Actions ─────────────────────────────────────── */

  private onPlayHandClicked(): void {
    const selectedTiles = this._handDisplay.selectedTiles;

    if (selectedTiles.length === 0) {
      this.showMessage('请选择要出的牌', '#ff4444');
      return;
    }

    if (this._handsRemaining <= 0) {
      this.showMessage('没有出牌次数了', '#ff4444');
      return;
    }

    // NEW: Detect meld type based on selected tiles
    const meldType = this.detectMeldType(selectedTiles);
    
    if (!meldType) {
      // Not a valid meld - check if trying to declare win
      if (this.canDeclareWin()) {
        this.declareWin();
        return;
      }
      this.showMessage('选择: 吃(顺子3张)、碰(相同3张)、杠(相同4张)', '#ff4444');
      return;
    }

    // Execute the meld
    this.executeMeld(meldType, selectedTiles);
  }

  // NEW: Detect what type of meld the selected tiles form
  private detectMeldType(tiles: Tile[]): MeldType | null {
    if (tiles.length === 3) {
      if (this.isPong(tiles)) return 'pong';
      if (this.isChow(tiles)) return 'chow';
    }
    if (tiles.length === 4) {
      if (this.isKong(tiles)) return 'kong';
    }
    return null;
  }

  private isPong(tiles: Tile[]): boolean {
    if (tiles.length !== 3) return false;
    const key = tileKey(tiles[0]);
    return tiles.every(t => tileKey(t) === key);
  }

  private isChow(tiles: Tile[]): boolean {
    if (tiles.length !== 3) return false;
    const suits = new Set(tiles.map(t => t.suit));
    if (suits.size !== 1) return false;
    const suit = tiles[0].suit;
    if (suit === 'wind' || suit === 'dragon') return false;
    const values = tiles.map(t => t.value as number).sort((a, b) => a - b);
    return values[1] === values[0] + 1 && values[2] === values[1] + 1;
  }

  private isKong(tiles: Tile[]): boolean {
    if (tiles.length !== 4) return false;
    const key = tileKey(tiles[0]);
    return tiles.every(t => tileKey(t) === key);
  }

  private executeMeld(meldType: MeldType, tiles: Tile[]): void {
    for (const tile of tiles) {
      this._hand.removeTile(tile);
    }
    const multiplier = MELD_MULTIPLIERS[meldType];
    this._playedMelds.push({ type: meldType, tiles: [...tiles], multiplier });
    
    // Only kong adds to multiplier
    if (meldType === 'kong') {
      this._accumulatedMultiplier *= multiplier;
      this._lastPlayWasKong = true;
      if (this._drawPile.length > 0) {
        const drawnTile = this._drawPile.shift()!;
        this._hand.addTile(drawnTile);
      }
    } else {
      this._lastPlayWasKong = false;
    }

    AudioManager.getInstance().playSFX('tilePlace');
    const meldNames: Record<MeldType, string> = { 'chow': '吃', 'pong': '碰', 'kong': '杠' };
    const flowerCount = MELD_FLOWER_CHOICES[meldType];
    
    if (meldType === 'kong') {
      this.showMessage(`杠！×${multiplier} 选花牌`, '#ffd700');
    } else {
      this.showMessage(`${meldNames[meldType]}！选花牌`, '#00ff00');
    }

    this._handDisplay.updateDisplay();
    this.updateMeldDisplay();
    this.updateMultiplierDisplay();
    this.updateDrawPileCount();
    this.updateButtonStates();
    
    // Show flower card selection
    this.showFlowerCardSelection(flowerCount, () => {
      this.checkAutoWin();
    });
  }
  
  // NEW: Show flower card selection UI
  private showFlowerCardSelection(choiceCount: number, onComplete: () => void): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    
    // Get random flower cards
    const availableCards = ALL_FLOWER_CARDS.filter(c => c.rarity !== 'epic');
    const choices: FlowerCardData[] = [];
    for (let i = 0; i < choiceCount && availableCards.length > 0; i++) {
      const idx = Math.floor(Math.random() * availableCards.length);
      choices.push(availableCards.splice(idx, 1)[0]);
    }
    
    // Create overlay
    const overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.8);
    overlay.setOrigin(0);
    
    // Title
    const title = this.add.text(centerX, centerY - 150, `选择花牌 (${choiceCount}选1)`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '24px',
      color: '#ffd700'
    }).setOrigin(0.5);
    
    // Create card buttons
    const cardWidth = 120;
    const gap = 20;
    const totalWidth = choices.length * cardWidth + (choices.length - 1) * gap;
    const startX = centerX - totalWidth / 2 + cardWidth / 2;
    
    const cardElements: Phaser.GameObjects.Container[] = [];
    
    choices.forEach((cardData, index) => {
      const x = startX + index * (cardWidth + gap);
      const y = centerY;
      
      const container = this.add.container(x, y);
      
      // Card background
      const bg = this.add.rectangle(0, 0, cardWidth, 160, 0x2a4a2a);
      bg.setStrokeStyle(2, 0x4a8a4a);
      container.add(bg);
      
      // Card name
      const nameText = this.add.text(0, -50, cardData.name, {
        fontFamily: 'Courier New, monospace',
        fontSize: '14px',
        color: '#ffffff',
        align: 'center'
      }).setOrigin(0.5);
      container.add(nameText);
      
      // Card description
      const descText = this.add.text(0, 10, cardData.description, {
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
        color: '#aaaaaa',
        align: 'center',
        wordWrap: { width: cardWidth - 10 }
      }).setOrigin(0.5);
      container.add(descText);
      
      // Rarity indicator
      const rarityColor = cardData.rarity === 'rare' ? '#aa44ff' : '#44aa44';
      const rarityText = this.add.text(0, 60, cardData.rarity, {
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
        color: rarityColor
      }).setOrigin(0.5);
      container.add(rarityText);
      
      // Make interactive
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
        bg.setFillStyle(0x3a6a3a);
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(0x2a4a2a);
      });
      bg.on('pointerdown', () => {
        AudioManager.getInstance().playSFX('buttonClick');
        
        // Add the selected flower card
        const newCard = createFlowerCardFromData(cardData);
        this._flowerCardManager.addCard(newCard);
        this._flowerCardDisplay.setFlowerCards(this._flowerCardManager.getCards());
        
        this.showMessage(`获得: ${cardData.name}`, '#44ff44');
        
        // Clean up
        overlay.destroy();
        title.destroy();
        cardElements.forEach(c => c.destroy());
        
        onComplete();
      });
      
      cardElements.push(container);
    });
  }

  private canDeclareWin(): boolean {
    const allTiles = this.getAllTilesForWinCheck();
    if (allTiles.length !== 14) return false;
    return FanEvaluator.isWinningHand(allTiles);
  }

  private getAllTilesForWinCheck(): Tile[] {
    const allTiles: Tile[] = [];
    for (const meld of this._playedMelds) {
      allTiles.push(...meld.tiles);
    }
    allTiles.push(...this._hand.tiles);
    return allTiles;
  }

  private checkAutoWin(): void {
    const handTiles = this._hand.tiles;
    if (this._playedMelds.length === 4 && handTiles.length === 2) {
      if (tileKey(handTiles[0]) === tileKey(handTiles[1])) {
        this.time.delayedCall(500, () => this.declareWin());
      }
    } else if (this._playedMelds.length === 0 && this._hand.tiles.length === 14) {
      if (FanEvaluator.isWinningHand([...this._hand.tiles])) {
        this.showMessage('可以胡牌！', '#ffd700');
      }
    }
  }

  private declareWin(): void {
    const allTiles = this.getAllTilesForWinCheck();
    const evalResult = FanEvaluator.evaluateHand(allTiles);
    if (!evalResult.isWinning) {
      this.showMessage('牌型不能胡牌！', '#ff4444');
      return;
    }

    AudioManager.getInstance().playSFX('fanAnnounce');
    
    // Calculate score
    let fanMultiplier = 1;
    for (const fan of evalResult.fans) {
      fanMultiplier *= this.getFanMultiplier(fan.points);
    }
    
    let achievementMultiplier = 1;
    if (this._playedMelds.length === 0 && this._discardCount === 0) {
      achievementMultiplier *= ACHIEVEMENT_MULTIPLIERS.tianhu;
    } else if (this._playedMelds.length === 0 && this._discardCount === 1) {
      achievementMultiplier *= ACHIEVEMENT_MULTIPLIERS.dihu;
    }
    if (this._lastPlayWasKong) {
      achievementMultiplier *= ACHIEVEMENT_MULTIPLIERS.gangshangkaihua;
    }
    
    const finalScore = Math.floor(100 * this._accumulatedMultiplier * fanMultiplier * achievementMultiplier);
    const bonusGold = this._handsRemaining * this.UNUSED_PLAY_BONUS + this._discardsRemaining * this.UNUSED_DISCARD_BONUS;
    
    this._currentScore += finalScore;
    this._gold += bonusGold;
    this._totalFansFormed += evalResult.fans.length;

    // Effects
    const totalPoints = evalResult.fans.reduce((sum, f) => sum + f.points, 0);
    if (totalPoints >= 64) {
      ScreenEffects.shakeIntense(this);
      ScreenEffects.confetti(this, 60);
    } else if (totalPoints >= 24) {
      ScreenEffects.shake(this, 5, 300);
    }

    // Create score breakdown for popup
    const breakdown: ScoreBreakdown = {
      hand: allTiles, detectedFans: evalResult.fans, activeGodTiles: this._activeGodTiles,
      fanContributions: [], baseChips: 100, baseMult: this._accumulatedMultiplier,
      tileChipContributions: [], bonusChips: 0, chipModifiers: [], multModifiers: [],
      goldModifiers: bonusGold > 0 ? [{ source: '剩余行动', goldAdded: bonusGold, description: '' }] : [],
      totalChips: 100, totalMult: this._accumulatedMultiplier * fanMultiplier * achievementMultiplier,
      totalGold: bonusGold, finalScore: finalScore,
    };
    
    this.time.delayedCall(300, () => {
      this.showScorePopup(breakdown, evalResult.fans);
    });
    
    this.updateScoreDisplay();
    this.updateHandsRemaining();
  }

  private getFanMultiplier(points: number): number {
    if (points >= 88) return 13;
    if (points >= 64) return 10;
    if (points >= 48) return 10;
    if (points >= 24) return 4;
    if (points >= 6) return 3;
    if (points >= 4) return 4;
    return 1;
  }

  private updateMeldDisplay(): void {
    this._meldTexts.forEach(t => t.destroy());
    this._meldTexts = [];
    const startY = 150;
    const meldNames: Record<MeldType, string> = { 'chow': '吃', 'pong': '碰', 'kong': '杠' };
    this._playedMelds.forEach((meld, index) => {
      const tileStr = meld.tiles.map(t => t.displayName).join('');
      const text = this.add.text(this.scale.width / 2, startY + index * 25,
        `${meldNames[meld.type]}: ${tileStr} ×${meld.multiplier}`,
        { fontFamily: 'Courier New, monospace', fontSize: '14px', color: '#aaffaa' }
      ).setOrigin(0.5);
      this._meldTexts.push(text);
    });
  }

  private updateMultiplierDisplay(): void {
    if (this._multiplierText) {
      this._multiplierText.setText(`倍率: ×${this._accumulatedMultiplier.toFixed(1)}`);
    }
  }

  // NEW: 胡牌 button handler - try to win, or get chicken hand score
  private onHuClicked(): void {
    const allTiles = this.getAllTilesForWinCheck();
    
    // Check if we have a winning hand
    if (allTiles.length === 14 && FanEvaluator.isWinningHand(allTiles)) {
      this.declareWin();
      return;
    }
    
    // Not a winning hand - give chicken hand (屁胡) base score
    this.declareChickenHand();
  }

  // NEW: Chicken hand - no winning pattern but still score something
  private declareChickenHand(): void {
    AudioManager.getInstance().playSFX('tilePlace');
    
    // Calculate chicken score: base × meld multiplier
    const chickenScore = Math.floor(this.BASE_CHICKEN_SCORE * this._accumulatedMultiplier);
    const bonusGold = this._discardsRemaining * this.UNUSED_DISCARD_BONUS;
    
    this._currentScore += chickenScore;
    this._gold += bonusGold;
    
    this.showMessage(`屁胡！+${chickenScore}分`, '#ffaa00');
    
    // Create minimal score breakdown
    const chickenFan: Fan = { name: '屁胡', points: 1, description: '未成番，基础分' };
    const breakdown: ScoreBreakdown = {
      hand: [...this._hand.tiles],
      detectedFans: [chickenFan],
      activeGodTiles: this._activeGodTiles,
      fanContributions: [],
      baseChips: this.BASE_CHICKEN_SCORE,
      baseMult: this._accumulatedMultiplier,
      tileChipContributions: [],
      bonusChips: 0,
      chipModifiers: [],
      multModifiers: [],
      goldModifiers: bonusGold > 0 ? [{ source: '剩余弃牌', goldAdded: bonusGold, description: '' }] : [],
      totalChips: this.BASE_CHICKEN_SCORE,
      totalMult: this._accumulatedMultiplier,
      totalGold: bonusGold,
      finalScore: chickenScore,
    };
    
    this.time.delayedCall(300, () => {
      this.showScorePopup(breakdown, [chickenFan]);
    });
    
    this.updateScoreDisplay();
  }

  // OLD onPlayHandClicked code below (keeping for reference, will be removed)
  private onPlayHandClickedOLD(): void {
    const selectedTiles = this._handDisplay.selectedTiles;
    const handTiles = [...this._hand.tiles];
    const evalResult = FanEvaluator.evaluateHand(handTiles);

    if (!evalResult.isWinning) {
      this.showMessage('这不是一副胡牌！', '#ff4444');
      AudioManager.getInstance().playSFX('loseSound');
      return;
    }

    // Play fan announce sound
    AudioManager.getInstance().playSFX('fanAnnounce');

    // Calculate score with God Tiles
    let scoreBreakdown = Scoring.calculateScore(
      handTiles,
      evalResult.fans,
      this._activeGodTiles,
      {},
      evalResult.decomposition
    );

    // Apply Red Dora bonuses (if using Red Dora deck)
    let redDoraBonus = 0;
    if (this._deckVariant.id === 'redDora') {
      for (const tile of handTiles) {
        redDoraBonus += getRedDoraChipBonus(tile);
      }
    }

    // Apply deck variant scoring modifiers
    let finalChips = scoreBreakdown.totalChips + redDoraBonus;
    let finalMult = scoreBreakdown.totalMult;

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
    this._handDisplay.highlightWinningTilesSequentially(handTiles, () => {
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

  private onDiscardClicked(): void {
    const selectedTiles = this._handDisplay.selectedTiles;

    if (selectedTiles.length === 0) {
      this.showMessage('请选择要弃的牌', '#ff4444');
      return;
    }

    if (this._discardsRemaining <= 0) {
      this.showMessage('没有弃牌次数了', '#ff4444');
      return;
    }

    // NEW: Check max discard limit (including bonus from 点石成金)
    const maxDiscard = this.MAX_DISCARD_TILES + this._extraDiscardLimit;
    if (selectedTiles.length > maxDiscard) {
      this.showMessage(`最多弃${maxDiscard}张牌`, '#ff4444');
      return;
    }
    // Reset extra limit after use
    this._extraDiscardLimit = 0;

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
    
    // NEW: Track discard count for 地胡 detection
    this._discardCount++;

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
    
    // NEW: Apply multiplier bonuses
    if (result.context.bonusMult) {
      this._accumulatedMultiplier += result.context.bonusMult;
      this.showMessage(`倍率 +${result.context.bonusMult}`, '#ffd700');
    }
    if (result.context.multMultiplier && result.context.multMultiplier !== 1) {
      this._accumulatedMultiplier *= result.context.multMultiplier;
      this.showMessage(`倍率 ×${result.context.multMultiplier}`, '#ffd700');
    }
    if (result.context.bonusScore) {
      this._currentScore += result.context.bonusScore;
      this.showMessage(`基础分 +${result.context.bonusScore}`, '#00ff00');
    }
    if (result.context.extraDiscardLimit) {
      this._extraDiscardLimit += result.context.extraDiscardLimit;
      this.showMessage(`下次弃牌上限 +${result.context.extraDiscardLimit}`, '#44aaff');
    }

    // Remove card from display with animation
    this._flowerCardDisplay.removeCard(selectedCard);

    // Show success message
    this.showMessage(`使用了 ${selectedCard.name}`, '#00ff00');

    // Update UI
    this._handDisplay.updateDisplay();
    this.updateHandsRemaining();
    this.updateDiscardsRemaining();
    this.updateMultiplierDisplay();  // NEW: Update multiplier display
    this.updateScoreDisplay();       // NEW: Update score if changed
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
    const hasSelection = this._handDisplay.hasSelection;
    const has14Tiles = this._hand.tiles.length === 14;

    // Play Hand button: enabled if 14 tiles and has remaining hands
    if (has14Tiles && this._handsRemaining > 0) {
      this._playHandButton.setAlpha(1);
      this._playHandButton.setStyle({ color: '#ffffff' });
    } else {
      this._playHandButton.setAlpha(0.5);
      this._playHandButton.setStyle({ color: '#888888' });
    }

    // Discard button: enabled if has selection and has remaining discards
    if (hasSelection && this._discardsRemaining > 0) {
      this._discardButton.setAlpha(1);
      this._discardButton.setStyle({ color: '#ffffff' });
    } else {
      this._discardButton.setAlpha(0.5);
      this._discardButton.setStyle({ color: '#888888' });
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

          this.cameras.main.once('camerafadeoutcomplete', () => {
            const nextRound = this._roundNumber + 1;

            // Check if next round is a boss round (every 3rd round)
            if (nextRound % 3 === 0) {
              // scene.start() automatically stops current scene and starts target
              this.scene.start('BossGameScene', {
                roundNumber: nextRound,
                difficulty: Math.ceil(nextRound / 3),
                activeGodTiles: this._activeGodTiles,
                gold: this._gold,
                flowerCardManager: this._flowerCardManager,
                deckVariant: this._deckVariant
              });
            } else {
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

          this.cameras.main.once('camerafadeoutcomplete', () => {
            // scene.start() automatically stops current scene and starts target
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