import Phaser from 'phaser';
import { BossRound } from '../roguelike/BossRound';
import { Boss } from '../roguelike/BossRound';
import { BossBlind, createBossBlind } from '../roguelike/BossBlind';
import { getRandomBoss, getBossBlindType } from '../data/bosses';
import { Hand } from '../core/Hand';
import { Tile, shuffleTiles, createFullTileSet, TileSuit } from '../core/Tile';
import { FanEvaluator, Fan } from '../core/FanEvaluator';
import { Scoring, ScoreBreakdown } from '../core/Scoring';
import { HandDisplay } from '../ui/HandDisplay';
import { ScorePopup } from '../ui/ScorePopup';
import { GodTileDisplay } from '../ui/GodTileDisplay';
import { FlowerCardDisplay } from '../ui/FlowerCardDisplay';
import { BossHealthBar } from '../ui/BossHealthBar';
import { BossBlindBanner } from '../ui/BossBlindBanner';
import { ScreenEffects } from '../ui/ScreenEffects';
import { GodTile } from '../roguelike/GodTile';
import { FlowerCard } from '../roguelike/FlowerCard';
import { FlowerCardManager } from '../roguelike/FlowerCardManager';
import { AudioManager } from '../audio/AudioManager';
import { DeckVariant, DECK_VARIANTS, getRedDoraChipBonus } from '../core/DeckVariant';
import { GodTileManager } from '../core/GodTileManager';
import { MaterialManager, materialManager } from '../core/MaterialManager';
import { ALL_FLOWER_CARDS } from '../data/flowerCards';
import { createFlowerCardFromData } from '../roguelike/FlowerCard';
import { Material } from '../data/materials';
import { BondStatusUI } from '../ui/BondStatusUI';
import { isSameTile } from '../core/Tile';

/**
 * BossGameScene — Boss encounter gameplay
 * Extends regular gameplay with boss health, abilities, and Boss庄 restrictions
 */
export class BossGameScene extends Phaser.Scene {
  // Core game state
  private _bossRound!: BossRound;
  private _hand!: Hand;
  private _drawPile: Tile[] = [];
  private _discardPile: Tile[] = [];

  // Boss-specific state
  private _boss!: Boss;
  private _bossBlind!: BossBlind;
  private _playerHealth: number = 100;

  // God Tile Manager (bond system)
  private _godTileManager!: GodTileManager;

  // Played melds (出牌)
  private _playedMelds: { type: string; tiles: Tile[]; multiplier: number }[] = [];

  // UI components
  private _handDisplay!: HandDisplay;
  private _scorePopup!: ScorePopup;
  private _godTileDisplay!: GodTileDisplay;
  private _flowerCardDisplay!: FlowerCardDisplay;
  private _bossHealthBar!: BossHealthBar;
  private _bossBlindBanner!: BossBlindBanner;
  private _bondStatusUI!: BondStatusUI;

  // UI text elements
  private _scoreText!: Phaser.GameObjects.Text;
  private _targetScoreText!: Phaser.GameObjects.Text;
  private _handsRemainingText!: Phaser.GameObjects.Text;
  private _discardsRemainingText!: Phaser.GameObjects.Text;
  private _playerHealthText!: Phaser.GameObjects.Text;
  private _goldText!: Phaser.GameObjects.Text;
  private _drawPileCountText!: Phaser.GameObjects.Text;
  private _meldMultiplierText!: Phaser.GameObjects.Text;
  private _handPatternText!: Phaser.GameObjects.Text;

  // Buttons
  private _playHandButton!: Phaser.GameObjects.Text;
  private _discardButton!: Phaser.GameObjects.Text;
  // _useCardButton removed — drag-to-use replaces it

  // Flower card selection overlay
  private _flowerSelectionOverlay!: Phaser.GameObjects.Container;

  // Pending flower effect: forces player to discard before the effect resolves
  private _pendingFlowerEffect: string | null = null;

  // Game state
  private _currentScore: number = 0;
  private _targetScore: number = 50;
  private _handsRemaining: number = 4;
  private _discardsRemaining: number = 3;
  private _roundNumber: number = 3;
  private _gold: number = 0;
  private _meldMultiplier: number = 1;

  // God Tiles & Flower Cards
  private _activeGodTiles: GodTile[] = [];
  private _flowerCardManager!: FlowerCardManager;

  // Deck variant
  private _deckVariant!: DeckVariant;

  // Constants
  private readonly INITIAL_HANDS = 4;
  private readonly INITIAL_DISCARDS = 3;
  private readonly INITIAL_HAND_SIZE = 14;

  constructor() {
    super({ key: 'BossGameScene' });
  }

  create(data?: {
    roundNumber?: number;
    difficulty?: number;
    activeGodTiles?: GodTile[];
    gold?: number;
    meldMultiplier?: number;
    flowerCardManager?: FlowerCardManager;
    deckVariant?: DeckVariant;
    godTileManager?: GodTileManager;
  }) {
    // Initialize boss
    const difficulty = data?.difficulty ?? Math.ceil((data?.roundNumber ?? 3) / 3);
    this._boss = getRandomBoss(difficulty);
    const blindType = getBossBlindType(this._boss);
    this._bossBlind = createBossBlind(blindType);

    // Initialize state
    this._roundNumber = data?.roundNumber ?? 3;
    this._activeGodTiles = data?.activeGodTiles ?? [];
    this._flowerCardManager = data?.flowerCardManager ?? new FlowerCardManager();
    this._gold = data?.gold ?? 50;
    this._meldMultiplier = data?.meldMultiplier ?? 1;
    this._deckVariant = data?.deckVariant ?? DECK_VARIANTS.standard;
    this._godTileManager = data?.godTileManager ?? new GodTileManager();

    this._currentScore = 0;
    this._handsRemaining = this.INITIAL_HANDS;
    this._discardsRemaining = this.INITIAL_DISCARDS;
    this._playedMelds = [];

    // Apply Boss庄 game state modifiers
    if (this._bossBlind.effect.modifyGameState) {
      const modified = this._bossBlind.effect.modifyGameState({
        hands: this._handsRemaining,
        discards: this._discardsRemaining
      });
      this._handsRemaining = modified.hands;
      this._discardsRemaining = modified.discards;
    }

    // Start boss music
    AudioManager.getInstance().playMusic('boss');

    // Play boss appear sound
    AudioManager.getInstance().playSFX('bossAppear');

    // Set background
    if (this.textures.exists('game_bg')) {
      const bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'game_bg');
      bg.setDisplaySize(this.scale.width, this.scale.height);
      bg.setDepth(-1);
      bg.setTint(0xff8888); // Red tint for boss scene
    } else {
      this.cameras.main.setBackgroundColor('#1a0000');
    }

    // Initialize game
    this.initializeGameState();
    this.createUI();
    this.dealInitialHand();

    // Show boss entrance
    this._bossHealthBar.showEntrance();
    this._bossBlindBanner.showBlind(this._bossBlind);

    // Fade in
    this.cameras.main.fadeIn(500);
  }

  private initializeGameState(): void {
    // Create shuffled draw pile using deck variant
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

    // Create boss round
    this._bossRound = new BossRound(this._boss, this._bossBlind);

    // Initialize Boss庄
    this._bossBlind.initialize({
      hand: this._hand,
      drawPile: this._drawPile
    });
  }

  private createUI(): void {
    const centerX = this.scale.width / 2;
    const width = this.scale.width;
    const height = this.scale.height;
    const pad = 16;
    const smallFont = '36px';
    const medFont = '44px';
    const fontFamily = 'Courier New, monospace';

    // ═══════════════════════════════════════════════════════
    // LANDSCAPE LAYOUT (1280×720) — Boss variant
    // Top-Left: Stats | Top-Center: Boss HP + Flower Cards | Top-Right: Bonds+God Tiles
    // Middle: Play Area | Middle-Right: Hand Info
    // Bottom-Left: Draw Pile | Bottom-Center: Hand | Bottom-Right: Buttons
    // ═══════════════════════════════════════════════════════

    // ── TOP-CENTER: Boss Health Bar ──
    this._bossHealthBar = new BossHealthBar(
      this, centerX, 40, this._boss.name, this._boss.maxHealth
    );

    // ── Boss庄 Banner (below health bar) ──
    this._bossBlindBanner = new BossBlindBanner(this, centerX, 90);

    // ── TOP-LEFT: Game Stats ──
    const statsX = pad;
    const statsY = pad;

    this.add.text(statsX, statsY, `BOSS 回合 ${this._roundNumber}`, {
      fontFamily, fontSize: '18px', color: '#ff6666', fontStyle: 'bold'
    });

    this._scoreText = this.add.text(statsX, statsY + 24, `分数: ${this._currentScore}`, {
      fontFamily, fontSize: medFont, color: '#00ff00'
    });

    this._targetScoreText = this.add.text(statsX, statsY + 46, `目标: ${this._targetScore}`, {
      fontFamily, fontSize: medFont, color: '#ffaa00'
    });

    this._handsRemainingText = this.add.text(statsX, statsY + 68, `手数: ${this._handsRemaining}`, {
      fontFamily, fontSize: smallFont, color: '#cccccc'
    });

    this._discardsRemainingText = this.add.text(statsX, statsY + 88, `弃牌: ${this._discardsRemaining}`, {
      fontFamily, fontSize: smallFont, color: '#cccccc'
    });

    this._playerHealthText = this.add.text(statsX, statsY + 110, `❤️ ${this._playerHealth}`, {
      fontFamily, fontSize: medFont, color: '#ff6666'
    });

    this._goldText = this.add.text(statsX, statsY + 132, `💰 ${this._gold}`, {
      fontFamily, fontSize: medFont, color: '#ffd700'
    });

    // ── TOP-CENTER (below boss): Flower Card Area ──
    const flowerCardY = 120;
    this._flowerCardDisplay = new FlowerCardDisplay(this, centerX, flowerCardY);
    this._flowerCardDisplay.setFlowerCards(this._flowerCardManager.getCards());
    this._flowerCardDisplay.on('cardSelected', (_card: FlowerCard | null) => {});
    this._flowerCardDisplay.on('cardDragUsed', (card: FlowerCard) => {
      this._flowerCardDisplay.clearSelection();
      (this._flowerCardDisplay as any).selectedCard = card;
      this.onUseFlowerCardClicked();
    });

    // ── TOP-RIGHT: Bonds + God Tiles ──
    const rightPanelX = width - pad;
    this._bondStatusUI = new BondStatusUI(this, rightPanelX - 220, statsY, this._godTileManager);

    const godTileY = statsY + 60;
    this._godTileDisplay = new GodTileDisplay(this, rightPanelX - 110, godTileY);
    this._godTileDisplay.setGodTiles(this._activeGodTiles);

    // ── MIDDLE-RIGHT: Hand Info ──
    const handInfoX = width - pad;
    const handInfoY = height * 0.40;

    this._meldMultiplierText = this.add.text(handInfoX, handInfoY, `倍率: ×${this._meldMultiplier}`, {
      fontFamily, fontSize: medFont, color: '#ff66ff'
    }).setOrigin(1, 0);

    this._handPatternText = this.add.text(handInfoX, handInfoY + 24, '屁胡 50分', {
      fontFamily, fontSize: smallFont, color: '#ffaa00',
      wordWrap: { width: 200 }, align: 'right'
    }).setOrigin(1, 0);

    // ── BOTTOM-LEFT: Draw Pile ──
    const drawPileX = pad + 40;
    const drawPileY = height - 90;

    const drawPileBg = this.add.rectangle(drawPileX, drawPileY, 70, 50, 0x331111)
      .setStrokeStyle(2, 0x664444);
    drawPileBg.setInteractive({ useHandCursor: true });
    drawPileBg.on('pointerdown', () => {
      this.showMessage(`牌堆剩余: ${this._drawPile.length}张`, '#00ccff');
    });

    this._drawPileCountText = this.add.text(drawPileX, drawPileY, `🀄 ${this._drawPile.length}`, {
      fontFamily, fontSize: medFont, color: '#cccccc'
    }).setOrigin(0.5);

    // ── BOTTOM-CENTER: Hand Tiles ──
    const handY = height - 80;
    this._handDisplay = new HandDisplay(this, centerX, handY, this._hand, {
      maxWidth: width - 300,
      enableMultiSelect: true,
      enableAutoScale: true
    });

    this._handDisplay.on('selectionChanged', () => {
      AudioManager.getInstance().playSFX('tileClick');
      this.updateButtonStates();
    });

    // ── BOTTOM-RIGHT: Action Buttons ──
    const btnBaseX = width - pad - 50;
    const btnY = height - 120;
    const btnGapV = 42;

    this._playHandButton = this.createButton(
      btnBaseX, btnY, '出牌', () => this.onPlayHandClicked()
    );

    this._discardButton = this.createButton(
      btnBaseX, btnY + btnGapV, '弃牌', () => this.onDiscardClicked()
    );

    // Flower card use: drag card out of flower area (no button needed)

    // ── Flower card selection overlay (hidden initially) ──
    this.createFlowerSelectionOverlay();

    // ── Score popup ──
    this._scorePopup = new ScorePopup(this, centerX, height / 2);
    this._scorePopup.on('continue', () => {
      this.checkWinLoseCondition();
    });

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
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#660000',
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
        button.setStyle({ backgroundColor: '#880000' });
      }
    });

    button.on('pointerout', () => {
      button.setStyle({ backgroundColor: '#660000' });
    });

    return button;
  }

  private dealInitialHand(): void {
    const tiles: Tile[] = [];
    for (let i = 0; i < this.INITIAL_HAND_SIZE; i++) {
      if (this._drawPile.length > 0) {
        tiles.push(this._drawPile.pop()!);
      }
    }

    for (const tile of tiles) {
      this._hand.addTile(tile);
    }

    // Apply god tile round start effects (Transform bond: apply materials)
    const effectDescriptions = this._godTileManager.applyRoundStartEffects(this._hand.tiles as Tile[]);
    effectDescriptions.forEach((desc, index) => {
      this.time.delayedCall(500 + index * 800, () => {
        this.showMessage(`🔄 ${desc}`, '#00ff00');
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

    this._handDisplay.updateDisplay();
    this.updateDrawPileCount();
    
    // Refresh material indicators after effects are applied
    if (effectDescriptions.length > 0) {
      this.time.delayedCall(100, () => {
        this._handDisplay.refreshMaterialIndicators();
      });
    }
  }

  /**
   * Apply 貔貅 gold gain multiplier (+50%) if owned
   */
  private applyGoldGainMultiplier(amount: number): number {
    const mult = this._godTileManager.getGoldGainMultiplier();
    if (mult > 1 && amount > 0) {
      return Math.floor(amount * mult);
    }
    return amount;
  }

  private updateDrawPileCount(): void {
    this._drawPileCountText.setText(`牌堆: ${this._drawPile.length}`);
  }

  private updateMeldMultiplierDisplay(): void {
    this._meldMultiplierText.setText(`出牌倍率: ×${this._meldMultiplier}`);
    if (this._meldMultiplier > 1) {
      this._meldMultiplierText.setStyle({ color: '#ff6600' });
    }
  }

  /* ── Button Actions ─────────────────────────────────────── */

  private onPlayHandClicked(): void {
    if (this._hand.tiles.length !== 14) {
      this.showMessage('手牌必须是14张才能胡牌', '#ff4444');
      return;
    }

    const handTiles = [...this._hand.tiles];
    const evalResult = FanEvaluator.evaluateHand(handTiles);

    if (!evalResult.isWinning) {
      this.showMessage('这不是一副胡牌！', '#ff4444');
      AudioManager.getInstance().playSFX('loseSound');
      return;
    }

    // Play fan announce sound
    AudioManager.getInstance().playSFX('fanAnnounce');

    // Check Boss庄 restrictions
    const blindCheck = this._bossRound.canWinWithBlind(handTiles, evalResult.fans);
    if (!blindCheck.allowed) {
      this.showMessage(blindCheck.reason || 'BOSS限制了这种胡牌！', '#ff4444');
      this._bossBlindBanner.flash();
      AudioManager.getInstance().playSFX('loseSound');
      return;
    }

    // ── Settle On-Win flower cards (兰/竹马/菊残) ──
    const onWinResult = this._flowerCardManager.settleOnWinCards({
      discardsRemaining: this._discardsRemaining,
      chowCount: 0,
      pongCount: 0,
      meldCount: 0,
      detectedFanNames: evalResult.fans.map(f => f.name),
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

    // Calculate score with bonds integration (same as GameScene)
    const scoreBreakdownWithBonds = Scoring.calculateScoreWithBonds(
      handTiles,
      evalResult.fans,
      this._activeGodTiles,
      this._godTileManager,
      {
        gold: this._gold,
        meldMultiplier: this._meldMultiplier,
        flowerCardManager: this._flowerCardManager
      },
      evalResult.decomposition
    );

    let finalChips = scoreBreakdownWithBonds.totalChips;
    let finalMult = scoreBreakdownWithBonds.totalMult;

    // Apply on-win flower card multiplier bonuses
    finalMult = (finalMult + onWinResult.multAdd) * onWinResult.multX;

    // Apply Red Dora bonuses (if using Red Dora deck)
    if (this._deckVariant.id === 'redDora') {
      for (const tile of handTiles) {
        finalChips += getRedDoraChipBonus(tile);
      }
    }

    // Apply deck variant scoring modifiers
    if (this._deckVariant.scoringModifier?.chipBonus) {
      finalChips += this._deckVariant.scoringModifier.chipBonus;
    }
    if (this._deckVariant.scoringModifier?.multBonus) {
      finalMult += this._deckVariant.scoringModifier.multBonus;
    }

    const modifiedScore = Math.floor(finalChips * finalMult);
    const scoreBreakdown: ScoreBreakdown = {
      ...scoreBreakdownWithBonds,
      totalChips: finalChips,
      totalMult: finalMult,
      finalScore: modifiedScore
    };

    // Apply Boss庄 score modifier
    let finalScore = scoreBreakdown.finalScore;
    if (this._bossBlind.effect.modifyScore) {
      finalScore = this._bossBlind.effect.modifyScore(
        scoreBreakdown.finalScore,
        scoreBreakdown.totalChips,
        scoreBreakdown.totalMult
      );
    }

    // Award gold for unused instant flower cards (+5 gold each per GAME_DESIGN)
    const unusedCardGold = this._flowerCardManager.getUnusedCardGold();
    if (unusedCardGold.gold > 0) {
      this._gold += unusedCardGold.gold;
      this.updateGoldDisplay();
      this.showMessage(`未使用花牌奖励: +${unusedCardGold.gold}💰 (${unusedCardGold.count}张×5)`, '#ffd700');
    }

    // Update flower card display after on-win settlement consumed cards
    this._flowerCardDisplay.setFlowerCards(this._flowerCardManager.getCards());

    // Handle material breaking/degradation after hu
    const breakReduction = this._godTileManager.getShatterReduction();
    const breakModifier = 1 - breakReduction;
    const breakResults = materialManager.handleBreaking(handTiles, breakModifier);
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

    // Log bond effects if any
    if (scoreBreakdownWithBonds.bondEffects.length > 0) {
      console.log('Bond effects applied:', scoreBreakdownWithBonds.bondEffects);
    }

    // Show roulette animation if applicable
    if (scoreBreakdownWithBonds.rouletteResult) {
      const r = scoreBreakdownWithBonds.rouletteResult;
      this.showMessage(`🎲 赌神轮盘: ${r.operation}${r.value}!`, '#ffd700');
    }

    // Check for 孤注一掷 failure (50% gold penalty)
    if ((scoreBreakdownWithBonds as any).guzhuyizhiFailed) {
      const penalty = Math.floor(this._gold * 0.5);
      this._gold -= penalty;
      this.showMessage(`孤注一掷失败: -${penalty}金币 (50%)`, '#ff4444');
    }

    // Highlight winning tiles sequentially
    this._handDisplay.highlightWinningTilesSequentially(handTiles, () => {
      // Play tile placement sound
      AudioManager.getInstance().playSFX('tilePlace');

      // Trigger God Tile visual effects
      this._godTileDisplay.triggerActivatedTiles();

      // Deal damage to boss with delay
      this.time.delayedCall(200, () => {
        const bossDamage = Math.floor(finalScore / 10);
        this._bossHealthBar.takeDamage(bossDamage);
        this._boss.health = this._bossHealthBar.currentHealth;

        // Screen shake on boss hit
        const shakeIntensity = Math.min(bossDamage / 10, 10);
        ScreenEffects.shake(this, shakeIntensity, 300);

        // Flash effect when dealing big damage
        if (bossDamage >= 500) {
          ScreenEffects.flash(this, 0xff4444, 150);
          ScreenEffects.explosion(this, this.scale.width / 2, 150, 0xff4444, 25);
          AudioManager.getInstance().playSFX('fanAnnounce'); // Extra dramatic sound
        }
      });
    });

    // Deduct hand
    this._handsRemaining--;
    this._currentScore += finalScore;
    this._gold += scoreBreakdown.totalGold;

    // Apply unused discard bonus (+5 gold per unused discard)
    const unusedDiscardBonus = this._discardsRemaining * 5;
    if (unusedDiscardBonus > 0) {
      this._gold += unusedDiscardBonus;
      this.showMessage(`剩余弃牌奖励: +${unusedDiscardBonus}💰 (${this._discardsRemaining}×5)`, '#ffd700');
    }

    // Apply deck variant gold bonus
    if (this._deckVariant.scoringModifier?.goldBonus) {
      this._gold += this._deckVariant.scoringModifier.goldBonus;
    }

    this.updateGoldDisplay();

    // Trigger boss abilities
    this._bossRound.processTurn();
    this.updatePlayerHealth();

    // Check for phase change
    if (this._bossRound.hasPhaseChanged()) {
      this._bossHealthBar.setPhase(this._bossRound.bossPhase);
      this._bossRound.acknowledgePhaseChange();

      // Intense shake on phase change
      ScreenEffects.shakeIntense(this);
      ScreenEffects.flash(this, 0xff0000, 200);
    }

    // Show score popup
    this.showScorePopup({ ...scoreBreakdown, finalScore }, evalResult.fans);

    // Update UI
    this.updateScoreDisplay();
    this.updateHandsRemaining();

    // Rotate banned suit for SUIT_BAN 庄
    if (this._bossBlind.type === 'suit_ban') {
      this._bossBlind.rotateBannedSuit();
      const suitName = this._bossBlind.bannedSuit === TileSuit.Wan ? '万' :
                      this._bossBlind.bannedSuit === TileSuit.Tiao ? '条' : '筒';
      this._bossBlindBanner.updateDescription(`本次禁用${suitName}字牌（轮换中）`);
    }
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

    // Normal discard: max 5 tiles per discard action (unless unlimited from flower effect or forced-discard mode)
    if (!hasUnlimitedDiscard && !this._pendingFlowerEffect && selectedTiles.length > 5) {
      this.showMessage('每次最多弃5张牌', '#ff4444');
      return;
    }

    // Discard selected tiles
    const success = this._pendingFlowerEffect
      ? this._hand.removeTiles(selectedTiles)
      : this._hand.discardTiles(selectedTiles);

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

    // Handle bamboo material discard bonus
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

    // Apply gold bonus from 金蟾 god tile (with 貔貅 multiplier)
    const discardGoldBonus = this._godTileManager.getDiscardGoldBonus();
    if (discardGoldBonus > 0) {
      const baseTotalBonus = discardGoldBonus * selectedTiles.length;
      const totalBonus = this.applyGoldGainMultiplier(baseTotalBonus);
      this._gold += totalBonus;
      this.updateGoldDisplay();
      this.showMessage(`金蟾: +${totalBonus}金币!`, '#ffd700');
    }

    // Gamble bond: 浑水摸鱼 - 20% chance to draw 2 extra tiles to choose from
    let extraDraws = 0;
    if (this._godTileManager.hasGodTile('gamble_muddy_waters')) {
      const { success: muddy } = this._godTileManager.rollProbability(0.2);
      if (muddy) {
        extraDraws = 2;
        this.showMessage('🎲 浑水摸鱼: 多摸2张!', '#00ff00');
      }
    }

    // Draw replacement tiles (skip in forced-discard mode — flower effect handles its own draw)
    const baseDraw = this._pendingFlowerEffect
      ? 0
      : Math.min(selectedTiles.length, this._drawPile.length);

    if (extraDraws > 0 && this._drawPile.length >= baseDraw + extraDraws) {
      const totalDraw = baseDraw + Math.min(extraDraws, this._drawPile.length - baseDraw);
      const drawnTiles: Tile[] = [];
      for (let i = 0; i < totalDraw; i++) {
        drawnTiles.push(this._drawPile.pop()!);
      }
      const picked = await this.showTileSelectionOverlay(
        drawnTiles,
        baseDraw,
        `浑水摸鱼: 选择 ${baseDraw} 张牌加入手牌`
      );
      for (const tile of picked) {
        this._hand.addTile(tile);
      }
      const unpicked = drawnTiles.filter(t => !picked.includes(t));
      this._drawPile.push(...unpicked);
    } else {
      for (let i = 0; i < baseDraw; i++) {
        const tile = this._drawPile.pop()!;
        this._hand.addTile(tile);
      }
    }

    // Deduct discard (skip if in forced-discard mode)
    if (!this._pendingFlowerEffect) {
      this._discardsRemaining--;
      this._hand.setDiscardsRemaining(this._discardsRemaining);
    }

    this._handDisplay.updateDisplay();
    this.updateDiscardsRemaining();
    this.updateDrawPileCount();
    this.updateButtonStates();
    this._bondStatusUI.updateDisplay();

    // Handle pending flower effect after discard completes
    if (this._pendingFlowerEffect) {
      const effect = this._pendingFlowerEffect;
      this._pendingFlowerEffect = null;
      this.updateButtonStates();
      await this.handlePostDiscardFlowerEffect(effect, selectedTiles);
    }
  }

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

      const bg = this.add.rectangle(0, 0, screenW, screenH, 0x000000, 0.85);
      bg.setInteractive();
      container.add(bg);

      const titleText = this.add.text(0, -screenH / 2 + 30, title, {
        fontFamily: 'Courier New, monospace',
        fontSize: '40px',
        color: '#ffd700',
        wordWrap: { width: screenW - 40 },
        align: 'center'
      }).setOrigin(0.5);
      container.add(titleText);

      const selected: Set<number> = new Set();
      const tileButtons: Phaser.GameObjects.Rectangle[] = [];
      const tileContainer = this.add.container(0, 0);
      container.add(tileContainer);

      const tileW = 50;
      const tileH = 68;
      const gap = 6;
      const maxCols = Math.floor((screenW - 40) / (tileW + gap));
      const cols = Math.min(tiles.length, maxCols);
      const rows = Math.ceil(tiles.length / cols);
      const startX = -(cols * (tileW + gap) - gap) / 2 + tileW / 2;

      const titleBottom = -screenH / 2 + 60;
      const confirmTop = screenH / 2 - 60;
      const availableH = confirmTop - titleBottom - 20;
      const contentH = rows * (tileH + gap);
      const needsScroll = contentH > availableH;
      const tilesStartY = titleBottom + 10 + (needsScroll ? 0 : (availableH - contentH) / 2);

      let scrollY = 0;
      const maxScroll = Math.max(0, contentH - availableH);

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
          fontSize: '26px',
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

      let wheelHandler: ((_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => void) | null = null;
      if (needsScroll) {
        bg.on('pointermove', (_pointer: Phaser.Input.Pointer) => {
          if (_pointer.isDown) {
            scrollY = Math.max(0, Math.min(maxScroll, scrollY - _pointer.velocity.y * 0.02));
            updateTilePositions();
          }
        });
        wheelHandler = (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
          scrollY = Math.max(0, Math.min(maxScroll, scrollY + deltaY * 0.5));
          updateTilePositions();
        };
        this.input.on('wheel', wheelHandler);
      }

      const confirmBtn = this.add.text(0, screenH / 2 - 45,
        pickCount === 0 ? '确定' : `确定 (0/${pickCount})`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '40px',
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
        if (wheelHandler) {
          this.input.off('wheel', wheelHandler);
        }
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

  private updateHandPatternDisplay(): void {
    const allTiles = [
      ...this._hand.tiles,
      ...this._playedMelds.flatMap(m => m.tiles)
    ];

    let baseScore = 50;
    let fanText = '屁胡';
    let isWinning = false;

    if (allTiles.length >= 14) {
      const evalResult = FanEvaluator.evaluateHand(allTiles as Tile[]);
      if (evalResult.isWinning && evalResult.fans.length > 0) {
        fanText = evalResult.fans.map(f => f.name).join('+');
        baseScore = evalResult.totalPoints;
        isWinning = true;
      }
    }

    const chowCount = this._playedMelds.filter(m => m.type === 'chow').length;
    const pongCount = this._playedMelds.filter(m => m.type === 'pong').length;
    const onWinCards = this._flowerCardManager.getOnWinCards();
    let previewMultAdd = 0;
    let previewMultX = 1;
    const flowerBonusTexts: string[] = [];
    for (const card of onWinCards) {
      switch (card.defId) {
        case 'orchid_jinlan': previewMultAdd += 3; flowerBonusTexts.push(`${card.name}+3`); break;
        case 'orchid_lanxin': previewMultAdd += 5; flowerBonusTexts.push(`${card.name}+5`); break;
        case 'orchid_langui': previewMultX *= 1.5; flowerBonusTexts.push(`${card.name}×1.5`); break;
        case 'orchid_konggu': previewMultX *= 2; flowerBonusTexts.push(`${card.name}×2`); break;
        case 'orchid_huizhi': {
          const b = this._discardsRemaining * 2;
          previewMultAdd += b;
          flowerBonusTexts.push(`${card.name}+${b}`);
          break;
        }
        case 'orchid_lanting': {
          const b = chowCount * 2;
          previewMultAdd += b;
          flowerBonusTexts.push(`${card.name}+${b}`);
          break;
        }
        case 'orchid_youlan': {
          const b = pongCount * 2;
          previewMultAdd += b;
          flowerBonusTexts.push(`${card.name}+${b}`);
          break;
        }
        case 'chrys_jucan':
          flowerBonusTexts.push(`${card.name}×?`);
          break;
      }
    }

    const totalMult = (this._meldMultiplier + previewMultAdd) * previewMultX;
    const estimatedScore = Math.floor(baseScore * totalMult);

    let multDisplay = `出牌倍率: ×${this._meldMultiplier}`;
    if (previewMultAdd > 0 || previewMultX > 1) {
      multDisplay += ` → 总倍率: ×${totalMult.toFixed(1)}`;
      if (flowerBonusTexts.length > 0) {
        multDisplay += `\n🌺 ${flowerBonusTexts.join(', ')}`;
      }
    }
    this._meldMultiplierText.setText(multDisplay);

    this._handPatternText.setText(`${fanText} ${estimatedScore}分`);
    this._handPatternText.setStyle({ color: isWinning ? '#00ff00' : '#ffaa00' });
  }

  private updateButtonStates(): void {
    this.updateHandPatternDisplay();
    const hasSelection = this._handDisplay.hasSelection;
    const has14Tiles = this._hand.tiles.length === 14;

    // Forced-discard mode: disable play hand and use card, only allow discard
    if (this._pendingFlowerEffect) {
      this._playHandButton.setAlpha(0.3);
      this._playHandButton.setStyle({ color: '#666666' });

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

    this._discardButton.setText('弃牌');
    if (has14Tiles && this._handsRemaining > 0) {
      this._playHandButton.setAlpha(1);
      this._playHandButton.setStyle({ color: '#ffffff' });
    } else {
      this._playHandButton.setAlpha(0.5);
      this._playHandButton.setStyle({ color: '#888888' });
    }

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
  }

  private updateGoldDisplay(): void {
    this._goldText.setText(`金币: ${this._gold}`);
  }

  private updatePlayerHealth(): void {
    this._playerHealth = this._bossRound.playerHealth;
    this._playerHealthText.setText(`生命: ${this._playerHealth}`);

    if (this._playerHealth < 30) {
      this._playerHealthText.setStyle({ color: '#ff0000' });
    } else if (this._playerHealth < 60) {
      this._playerHealthText.setStyle({ color: '#ff6666' });
    }
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
      fontSize: '18px',
      color: color,
      backgroundColor: '#000000',
      padding: { x: 15, y: 8 }
    });
    messageText.setOrigin(0.5);
    messageText.setAlpha(0);

    this.tweens.add({
      targets: messageText,
      alpha: 1,
      duration: 200,
      yoyo: true,
      hold: 1200,
      onComplete: () => {
        messageText.destroy();
      }
    });
  }

  /* ── Flower Card Actions ───────────────────────────────── */

  private createFlowerSelectionOverlay(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this._flowerSelectionOverlay = this.add.container(centerX, centerY);
    this._flowerSelectionOverlay.setVisible(false);
    this._flowerSelectionOverlay.setDepth(1000);

    const bg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.8);
    bg.setInteractive();
    this._flowerSelectionOverlay.add(bg);

    const title = this.add.text(0, -150, '选择花牌', {
      fontFamily: 'Courier New, monospace',
      fontSize: '56px',
      color: '#ffd700'
    }).setOrigin(0.5);
    this._flowerSelectionOverlay.add(title);
  }

  private showFlowerCardSelection(count: number): Promise<FlowerCard> {
    return new Promise((resolve) => {
      const shuffled = [...ALL_FLOWER_CARDS].sort(() => Math.random() - 0.5);
      const options = shuffled.slice(0, count).map(data => createFlowerCardFromData(data));

      this._flowerSelectionOverlay.each((child: Phaser.GameObjects.GameObject) => {
        if (child.getData && child.getData('isCardButton')) {
          child.destroy();
        }
      });

      const cardWidth = 120;
      const totalWidth = options.length * cardWidth + (options.length - 1) * 20;
      const startX = -totalWidth / 2 + cardWidth / 2;

      options.forEach((card, index) => {
        const x = startX + index * (cardWidth + 20);
        const y = 0;

        const cardBg = this.add.rectangle(x, y, cardWidth, 160, 0x333355)
          .setStrokeStyle(2, 0xffd700);
        cardBg.setData('isCardButton', true);
        this._flowerSelectionOverlay.add(cardBg);

        const symbol = this.add.text(x, y - 50, card.getFlowerSymbol(), {
          fontSize: '72px'
        }).setOrigin(0.5);
        symbol.setData('isCardButton', true);
        this._flowerSelectionOverlay.add(symbol);

        const name = this.add.text(x, y, card.name, {
          fontFamily: 'Courier New, monospace',
          fontSize: '28px',
          color: '#ffffff',
          wordWrap: { width: cardWidth - 10 },
          align: 'center'
        }).setOrigin(0.5);
        name.setData('isCardButton', true);
        this._flowerSelectionOverlay.add(name);

        const desc = this.add.text(x, y + 40, card.description.substring(0, 20) + '...', {
          fontFamily: 'Courier New, monospace',
          fontSize: '10px',
          color: '#aaaaaa',
          wordWrap: { width: cardWidth - 10 },
          align: 'center'
        }).setOrigin(0.5);
        desc.setData('isCardButton', true);
        this._flowerSelectionOverlay.add(desc);

        cardBg.setInteractive({ useHandCursor: true });
        cardBg.on('pointerdown', () => {
          AudioManager.getInstance().playSFX('buttonClick');
          this._flowerSelectionOverlay.setVisible(false);
          this._flowerCardManager.addCard(card);
          this._flowerCardDisplay.setFlowerCards(this._flowerCardManager.getCards());
          resolve(card);
        });

        cardBg.on('pointerover', () => cardBg.setFillStyle(0x555577));
        cardBg.on('pointerout', () => cardBg.setFillStyle(0x333355));
      });

      const title = this._flowerSelectionOverlay.getAt(1) as Phaser.GameObjects.Text;
      title.setText(`选择花牌 (${count}选1)`);
      this._flowerSelectionOverlay.setVisible(true);
    });
  }

  private async onUseFlowerCardClicked(): Promise<void> {
    const selectedCard = this._flowerCardDisplay.getSelectedCard();

    if (!selectedCard) {
      this.showMessage('请先选择一张花牌', '#ff4444');
      return;
    }

    if (selectedCard.isInstant() && this._gold < selectedCard.cost) {
      this.showMessage(`金币不足！需要 ${selectedCard.cost} 金币`, '#ff4444');
      return;
    }

    if (selectedCard.isInstant()) {
      this._gold -= selectedCard.cost;
      this.updateGoldDisplay();
    }

    const selectedTiles = this._handDisplay.selectedTiles;

    const result = await this._flowerCardManager.useCard(selectedCard, {
      hand: this._hand,
      selectedTiles: selectedTiles,
      drawPile: this._drawPile,
      discardPile: this._discardPile,
      handsRemaining: this._handsRemaining,
      discardsRemaining: this._discardsRemaining,
      currentScore: this._currentScore,
      targetScore: this._targetScore,
      roundNumber: this._roundNumber,
      redrawHand: () => this.redrawHand(),
      clearDebuffs: () => this._flowerCardManager.clearDebuffs()
    });

    if (!result.success) {
      this.showMessage(selectedCard.getCannotPlayMessage(), '#ff4444');
      return;
    }

    this._handsRemaining = result.context.handsRemaining;
    this._discardsRemaining = result.context.discardsRemaining;
    this._hand.setDiscardsRemaining(this._discardsRemaining);

    const goldDelta = (result.context as any).goldDelta || 0;
    if (goldDelta > 0) {
      this._gold += goldDelta;
      this.updateGoldDisplay();
      this.showMessage(`+${goldDelta} 金币`, '#ffdd00');
    }

    // 细水长流: 20% chance flower card is NOT consumed
    if (this._godTileManager.hasGodTile('gamble_steady_flow')) {
      const { success: preserved } = this._godTileManager.rollProbability(0.2);
      if (preserved) {
        this._flowerCardManager.addCard(selectedCard);
        this.showMessage('🎲 细水长流: 花牌未消耗!', '#00ff00');
      } else {
        this._flowerCardDisplay.removeCard(selectedCard);
      }
    } else {
      this._flowerCardDisplay.removeCard(selectedCard);
    }

    this.showMessage(`使用了 ${selectedCard.name}`, '#00ff00');

    // Handle pending debuff effects
    await this.handlePendingFlowerDebuffs();

    this._handDisplay.updateDisplay();
    this.updateHandsRemaining();
    this.updateDiscardsRemaining();
    this.updateButtonStates();
  }

  private redrawHand(): void {
    const tiles = [...this._hand.tiles];
    tiles.forEach(tile => this._hand.removeTile(tile));
    this._drawPile.push(...tiles);

    for (let i = this._drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this._drawPile[i], this._drawPile[j]] = [this._drawPile[j], this._drawPile[i]];
    }

    for (let i = 0; i < this.INITIAL_HAND_SIZE && this._drawPile.length > 0; i++) {
      const tile = this._drawPile.pop()!;
      this._hand.addTile(tile);
    }

    this._handDisplay.updateDisplay();
    this.updateDrawPileCount();
  }

  private async handlePendingFlowerDebuffs(): Promise<void> {
    const mgr = this._flowerCardManager;

    if (mgr.hasDebuff('plum_sannong_pending')) {
      mgr.removeDebuff('plum_sannong_pending');
      this._pendingFlowerEffect = 'plum_sannong';
      this.showMessage('梅花三弄: 请先弃牌，然后从牌堆选牌', '#ff88ff');
      this.updateButtonStates();
    }

    if (mgr.hasDebuff('plum_yijian_pending')) {
      mgr.removeDebuff('plum_yijian_pending');
      this._pendingFlowerEffect = 'plum_yijian';
      this.showMessage('一剪梅: 请选择1张牌弃掉', '#ff88ff');
      this.updateButtonStates();
    }

    if (mgr.hasDebuff('chrys_qiuju_random_flower')) {
      mgr.removeDebuff('chrys_qiuju_random_flower');
      await this.showFlowerCardSelection(3);
      this.showMessage('秋菊傲霜: 获得花牌!', '#ffd700');
    }

    if (mgr.hasDebuff('chrys_caiju_random_god')) {
      mgr.removeDebuff('chrys_caiju_random_god');
      const { ALL_GOD_TILES } = await import('../data/godTiles');
      const available = ALL_GOD_TILES.filter(
        (gt: any) => !this._godTileManager.hasGodTile(gt.id)
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

    if (mgr.hasDebuff('chrys_chiju_2flowers')) {
      mgr.removeDebuff('chrys_chiju_2flowers');
      await this.showFlowerCardSelection(3);
      await this.showFlowerCardSelection(3);
      this.showMessage('持菊问道: 获得2张花牌!', '#ffd700');
    }

    if (mgr.hasDebuff('chrys_huangju_random_material')) {
      mgr.removeDebuff('chrys_huangju_random_material');
      this.applyRandomMaterialToTiles(1);
    }

    if (mgr.hasDebuff('chrys_jinju_3materials')) {
      mgr.removeDebuff('chrys_jinju_3materials');
      this.applyRandomMaterialToTiles(3);
    }

    if (mgr.hasDebuff('chrys_huangjin_all_gold')) {
      mgr.removeDebuff('chrys_huangjin_all_gold');
      const tiles = this._hand.tiles as Tile[];
      for (const tile of tiles) {
        tile.material = Material.GOLD;
      }
      this._handDisplay.updateDisplay();
      this._handDisplay.refreshMaterialIndicators();
      this.showMessage('满城尽带黄金甲: 所有手牌变为金牌!', '#ffd700');
    }
  }

  private applyRandomMaterialToTiles(count: number): void {
    const randomMaterials: Material[] = [Material.BRONZE, Material.SILVER, Material.GOLD, Material.BAMBOO, Material.ICE, Material.GLASS, Material.JADE];
    const tiles = [...this._hand.tiles] as Tile[];
    const candidates = tiles.filter(t => !t.material || t.material === Material.NONE);
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    const toEnhance = shuffled.slice(0, Math.min(count, shuffled.length));

    for (const tile of toEnhance) {
      const mat = randomMaterials[Math.floor(Math.random() * randomMaterials.length)];
      tile.material = mat;
    }

    if (toEnhance.length > 0) {
      this._handDisplay.updateDisplay();
      this._handDisplay.refreshMaterialIndicators();
      this.showMessage(`添加材质到 ${toEnhance.length} 张牌!`, '#ffd700');
    }
  }

  /* ── Win/Lose Logic ────────────────────────────────────── */

  private checkWinLoseCondition(): void {
    // Check boss defeat
    if (this._bossRound.isBossDefeated()) {
      this.onBossDefeated();
      return;
    }

    // Check player defeat
    if (this._bossRound.isPlayerDefeated()) {
      this.onPlayerDefeated();
      return;
    }

    // Check score win
    if (this._currentScore >= this._targetScore) {
      this.onBossDefeated();
      return;
    }

    // Check loss (no hands remaining)
    if (this._handsRemaining <= 0) {
      this.onPlayerDefeated();
      return;
    }

    // Still have hands remaining — deal a new hand
    this.startNewHand();
  }

  /**
   * Deal a fresh hand for the next attempt within the same boss round.
   */
  private startNewHand(): void {
    // Clear existing hand tiles
    const handTiles = [...this._hand.tiles] as Tile[];
    for (const tile of handTiles) {
      this._hand.removeTile(tile);
    }

    // Clear melds from hand object (prevents stale meld accumulation)
    this._hand.clearMelds();

    // Reset discards
    this._discardsRemaining = this.INITIAL_DISCARDS;
    this._hand.resetRoundLimits(0, this._discardsRemaining);

    // Create fresh draw pile
    let tiles = this._deckVariant.createTileSet();
    const pendingMods = this._flowerCardManager.getPendingDeckMods();
    if (pendingMods.length > 0) {
      tiles = this._flowerCardManager.applyDeckMods(tiles);
    }
    this._drawPile = shuffleTiles(tiles);
    this._discardPile = [];

    // Deal new 14-tile hand
    this.dealInitialHand();

    // Re-initialize Boss庄 with new hand/draw pile
    this._bossBlind.initialize({
      hand: this._hand,
      drawPile: this._drawPile
    });

    // Update all UI
    this.updateHandsRemaining();
    this.updateDiscardsRemaining();
    this.updateButtonStates();

    this.showMessage(`新一手! 剩余${this._handsRemaining}手`, '#00ccff');
  }

  private async onBossDefeated(): Promise<void> {
    // Play win jingle
    AudioManager.getInstance().playSFX('winJingle');

    // Process round end: ice tile melting
    const allHandTiles = [...this._hand.tiles] as Tile[];
    const meltedTiles = materialManager.processRoundEnd(allHandTiles);
    if (meltedTiles.length > 0) {
      const meltNames = meltedTiles.map(t => t.displayName).join(', ');
      this.time.delayedCall(300, () => {
        this.showMessage(`冰牌融化: ${meltNames}`, '#87CEEB');
      });
    }

    // Calculate round end gold from god tiles
    const flowerCardCountForRoundEnd = this._flowerCardManager.getCards().length;
    const roundEndGold = this._godTileManager.calculateRoundEndGold({
      currentGold: this._gold,
      flowerCardCount: flowerCardCountForRoundEnd
    });

    // Clear flower cards and deck mods for this round (花牌仅当局有效)
    this._flowerCardManager.clearAllCards();
    this._flowerCardManager.clearDeckMods();

    if (roundEndGold.gold !== 0) {
      this._gold += roundEndGold.gold;
      for (const desc of roundEndGold.descriptions) {
        this.time.delayedCall(400, () => {
          this.showMessage(desc, '#ffd700');
        });
      }
    }

    // Show boss defeat animation
    await this._bossHealthBar.showDefeat();

    // Show victory message
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    const winText = this.add.text(centerX, centerY - 80, 'BOSS 击败！', {
      fontFamily: 'Courier New, monospace',
      fontSize: '48px',
      color: '#ffff00',
      fontStyle: 'bold'
    });
    winText.setOrigin(0.5);
    winText.setAlpha(0);

    // Show rewards
    const rewards = this._bossRound.getBossRewards();
    let rewardText = '奖励:\n';
    for (const reward of rewards) {
      if (reward.type === 'gold') {
        rewardText += `+${reward.amount} 金币\n`;
        this._gold += reward.amount;
      } else if (reward.type === 'god_tile') {
        rewardText += `+${reward.amount} 神牌\n`;
      } else if (reward.type === 'flower_card') {
        rewardText += `+${reward.amount} 花牌\n`;
      }
    }

    const rewardDisplay = this.add.text(centerX, centerY, rewardText, {
      fontFamily: 'Courier New, monospace',
      fontSize: '40px',
      color: '#00ff00'
    });
    rewardDisplay.setOrigin(0.5);
    rewardDisplay.setAlpha(0);

    this.tweens.add({
      targets: [winText, rewardDisplay],
      alpha: 1,
      duration: 500,
      ease: 'Power2.Out',
      onComplete: () => {
        this.time.delayedCall(2000, () => {
          // Transition to shop
          this.scene.start('ShopScene', {
            roundNumber: this._roundNumber + 1,
            currentScore: this._currentScore,
            activeGodTiles: this._activeGodTiles,
            gold: this._gold,
            meldMultiplier: this._meldMultiplier,
            flowerCardManager: this._flowerCardManager,
            deckVariant: this._deckVariant,
            godTileManager: this._godTileManager
          });
        });
      }
    });
  }

  private onPlayerDefeated(): void {
    // Play lose sound
    AudioManager.getInstance().playSFX('loseSound');

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    const loseText = this.add.text(centerX, centerY - 50, '被 BOSS 击败', {
      fontFamily: 'Courier New, monospace',
      fontSize: '40px',
      color: '#ff4444',
      fontStyle: 'bold'
    });
    loseText.setOrigin(0.5);
    loseText.setAlpha(0);

    const scoreText = this.add.text(centerX, centerY + 20, `最终分数: ${this._currentScore}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '40px',
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
          this.scene.start('GameOverScene', {
            finalScore: this._currentScore,
            roundReached: this._roundNumber
          });
        });
      }
    });
  }
}
