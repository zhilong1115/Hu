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
import { DeckVariant, DECK_VARIANTS } from '../core/DeckVariant';
import { GodTileManager } from '../core/GodTileManager';
import { MaterialManager, materialManager } from '../core/MaterialManager';

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

  // UI components
  private _handDisplay!: HandDisplay;
  private _scorePopup!: ScorePopup;
  private _godTileDisplay!: GodTileDisplay;
  private _flowerCardDisplay!: FlowerCardDisplay;
  private _bossHealthBar!: BossHealthBar;
  private _bossBlindBanner!: BossBlindBanner;

  // UI text elements
  private _scoreText!: Phaser.GameObjects.Text;
  private _targetScoreText!: Phaser.GameObjects.Text;
  private _handsRemainingText!: Phaser.GameObjects.Text;
  private _discardsRemainingText!: Phaser.GameObjects.Text;
  private _playerHealthText!: Phaser.GameObjects.Text;
  private _goldText!: Phaser.GameObjects.Text;

  // Buttons
  private _playHandButton!: Phaser.GameObjects.Text;
  private _discardButton!: Phaser.GameObjects.Text;

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
    this.cameras.main.setBackgroundColor('#1a0000');

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

    // ── Boss Health Bar (top center) ──
    this._bossHealthBar = new BossHealthBar(
      this,
      centerX,
      80,
      this._boss.name,
      this._boss.maxHealth
    );

    // ── Boss庄 Banner (below health bar) ──
    this._bossBlindBanner = new BossBlindBanner(this, centerX, 180);

    // ── Round info ──
    const headerY = 260;

    this.add.text(centerX, headerY, `BOSS 回合 ${this._roundNumber}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '24px',
      color: '#ff6666',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // ── Score and resources ──
    const infoY = headerY + 40;

    this._scoreText = this.add.text(20, infoY, `分数: ${this._currentScore}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#00ff00'
    });

    this._targetScoreText = this.add.text(width - 20, infoY, `目标: ${this._targetScore}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ffaa00'
    }).setOrigin(1, 0);

    this._handsRemainingText = this.add.text(20, infoY + 25, `剩余手数: ${this._handsRemaining}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#cccccc'
    });

    this._discardsRemainingText = this.add.text(20, infoY + 45, `剩余弃牌: ${this._discardsRemaining}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#cccccc'
    });

    this._playerHealthText = this.add.text(width - 20, infoY + 25, `生命: ${this._playerHealth}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ff6666'
    }).setOrigin(1, 0);

    this._goldText = this.add.text(width - 20, infoY + 45, `金币: ${this._gold}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffd700'
    });
    this._goldText.setOrigin(1, 0);

    // ── God Tiles display ──
    const godTileY = height * 0.40;
    this._godTileDisplay = new GodTileDisplay(this, centerX, godTileY);
    this._godTileDisplay.setGodTiles(this._activeGodTiles);

    // ── Hand display ──
    const handY = height * 0.55;
    this._handDisplay = new HandDisplay(this, centerX, handY, this._hand, {
      maxWidth: width - 40,
      enableMultiSelect: true,
      enableAutoScale: true
    });

    this._handDisplay.on('selectionChanged', () => {
      AudioManager.getInstance().playSFX('tileClick');
      this.updateButtonStates();
    });

    // ── Flower Card display ──
    const flowerCardY = height * 0.72;
    this._flowerCardDisplay = new FlowerCardDisplay(this, centerX, flowerCardY);
    this._flowerCardDisplay.setFlowerCards(this._flowerCardManager.getCards());

    // ── Action buttons ──
    const buttonY = height - 80;

    this._playHandButton = this.createButton(
      centerX - 90,
      buttonY,
      '出牌',
      () => this.onPlayHandClicked()
    );

    this._discardButton = this.createButton(
      centerX + 10,
      buttonY,
      '弃牌',
      () => this.onDiscardClicked()
    );

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

    // Calculate score with bonds integration (same as GameScene)
    const scoreBreakdown = Scoring.calculateScoreWithBonds(
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

    // Apply Boss庄 score modifier
    let finalScore = scoreBreakdown.finalScore;
    if (this._bossBlind.effect.modifyScore) {
      finalScore = this._bossBlind.effect.modifyScore(
        scoreBreakdown.finalScore,
        scoreBreakdown.totalChips,
        scoreBreakdown.totalMult
      );
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

    this._discardPile.push(...selectedTiles);

    // Draw new tiles
    const tilesToDraw = Math.min(selectedTiles.length, this._drawPile.length);
    for (let i = 0; i < tilesToDraw; i++) {
      const tile = this._drawPile.pop()!;
      this._hand.addTile(tile);
    }

    this._discardsRemaining--;
    this._hand.setDiscardsRemaining(this._discardsRemaining);

    this._handDisplay.updateDisplay();
    this.updateDiscardsRemaining();
    this.updateButtonStates();
  }

  /* ── UI Updates ────────────────────────────────────────── */

  private updateButtonStates(): void {
    const hasSelection = this._handDisplay.hasSelection;
    const has14Tiles = this._hand.tiles.length === 14;

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
      fontSize: '20px',
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
      fontSize: '20px',
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
