import Phaser from 'phaser';
import { DeckVariant, getAllDeckVariants, DECK_VARIANTS } from '../core/DeckVariant';
import { AudioManager } from '../audio/AudioManager';

interface HighScoreData {
  score: number;
  rounds: number;
  date: string;
}

/**
 * MenuScene - Title screen for HU!
 *
 * Features:
 * - Stylish game title with emoji
 * - Play button to start new run
 * - Settings button (volume, controls)
 * - High score display
 * - Animated mahjong tile background
 * - Mobile-first portrait layout
 */
export class MenuScene extends Phaser.Scene {
  private _highScore: HighScoreData | null = null;
  private _floatingTiles: Phaser.GameObjects.Sprite[] = [];
  private _selectedDeckVariant: DeckVariant = DECK_VARIANTS.standard;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    // Load high score from localStorage
    this.loadHighScore();

    // Start menu music
    const audioManager = AudioManager.getInstance();
    audioManager.playMusic('menu');

    // Set background
    this.cameras.main.setBackgroundColor('#1a1a1a');

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    const width = this.scale.width;
    const height = this.scale.height;

    // Create animated background tiles
    this.createFloatingTiles();

    // ── Title Section ──
    const titleY = height * 0.25;

    // Main title
    const titleText = this.add.text(centerX, titleY, 'HU! 🀄', {
      fontFamily: 'Courier New, monospace',
      fontSize: '72px',
      color: '#ff6b35',
      fontStyle: 'bold'
    });
    titleText.setOrigin(0.5);
    titleText.setAlpha(0);

    // Subtitle
    const subtitleText = this.add.text(centerX, titleY + 60, 'Roguelike Mahjong Deck Builder', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#aaaaaa'
    });
    subtitleText.setOrigin(0.5);
    subtitleText.setAlpha(0);

    // ── Buttons Section ──
    const buttonStartY = centerY + 20;
    const buttonSpacing = 70;

    // Play button
    const playButton = this.createButton(
      centerX,
      buttonStartY,
      '开始游戏',
      '#00aa00',
      () => this.startNewGame()
    );
    playButton.setAlpha(0);

    // Settings button
    const settingsButton = this.createButton(
      centerX,
      buttonStartY + buttonSpacing,
      '设置',
      '#333333',
      () => this.showSettings()
    );
    settingsButton.setAlpha(0);

    // ── High Score Display ──
    const highScoreY = height - 100;

    let highScoreText: Phaser.GameObjects.Text;
    if (this._highScore) {
      highScoreText = this.add.text(
        centerX,
        highScoreY,
        `最高分: ${this._highScore.score} (回合 ${this._highScore.rounds})`,
        {
          fontFamily: 'Courier New, monospace',
          fontSize: '16px',
          color: '#ffd700'
        }
      );
    } else {
      highScoreText = this.add.text(
        centerX,
        highScoreY,
        '开始你的首次挑战！',
        {
          fontFamily: 'Courier New, monospace',
          fontSize: '16px',
          color: '#888888'
        }
      );
    }
    highScoreText.setOrigin(0.5);
    highScoreText.setAlpha(0);

    // ── Animations ──
    // Fade in title with bounce
    this.tweens.add({
      targets: titleText,
      alpha: 1,
      scale: { from: 0.8, to: 1 },
      duration: 800,
      ease: 'Back.Out'
    });

    // Fade in subtitle
    this.tweens.add({
      targets: subtitleText,
      alpha: 1,
      duration: 600,
      delay: 300
    });

    // Fade in buttons sequentially
    [playButton, settingsButton, highScoreText].forEach((element, index) => {
      this.tweens.add({
        targets: element,
        alpha: 1,
        duration: 500,
        delay: 600 + index * 150,
        ease: 'Power2.Out'
      });
    });

    // Pulsing title animation
    this.tweens.add({
      targets: titleText,
      scale: 1.05,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    // Fade in from boot scene
    this.cameras.main.fadeIn(500);
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    color: string,
    callback: () => void
  ): Phaser.GameObjects.Text {
    const button = this.add.text(x, y, label, {
      fontFamily: 'Courier New, monospace',
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: color,
      padding: { x: 40, y: 15 }
    });
    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => {
      AudioManager.getInstance().playSFX('buttonClick');
      callback();
    });

    button.on('pointerover', () => {
      this.tweens.add({
        targets: button,
        scale: 1.1,
        duration: 150,
        ease: 'Power2.Out'
      });

      // Brighten color
      if (color === '#00aa00') {
        button.setStyle({ backgroundColor: '#00cc00' });
      } else {
        button.setStyle({ backgroundColor: '#555555' });
      }
    });

    button.on('pointerout', () => {
      this.tweens.add({
        targets: button,
        scale: 1.0,
        duration: 150,
        ease: 'Power2.Out'
      });
      button.setStyle({ backgroundColor: color });
    });

    return button;
  }

  private createFloatingTiles(): void {
    // Create floating mahjong tiles in the background
    const tileTypes = ['m1', 'm5', 'm9', 's1', 's5', 's9', 'p1', 'p5', 'p9', 'east', 'south', 'west', 'north'];
    const numTiles = 15;

    for (let i = 0; i < numTiles; i++) {
      const tileType = Phaser.Utils.Array.GetRandom(tileTypes);
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(-100, this.scale.height + 100);

      // Create tile sprite (using generated textures)
      const tile = this.add.sprite(x, y, tileType);
      tile.setAlpha(0.15);
      tile.setScale(0.8);

      this._floatingTiles.push(tile);

      // Slow float animation
      this.tweens.add({
        targets: tile,
        y: y + Phaser.Math.Between(-150, 150),
        x: x + Phaser.Math.Between(-50, 50),
        duration: Phaser.Math.Between(8000, 12000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
        delay: Phaser.Math.Between(0, 2000)
      });

      // Slow rotation
      this.tweens.add({
        targets: tile,
        angle: Phaser.Math.Between(-15, 15),
        duration: Phaser.Math.Between(6000, 10000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
    }
  }

  private loadHighScore(): void {
    try {
      const stored = localStorage.getItem('hu_high_score');
      if (stored) {
        this._highScore = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load high score:', e);
    }
  }

  private startNewGame(): void {
    // Show deck selection overlay
    this.showDeckSelection();
  }

  private showDeckSelection(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    const width = this.scale.width;
    const height = this.scale.height;

    // Dark overlay
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.9);
    overlay.setOrigin(0);
    overlay.setAlpha(0);
    overlay.setInteractive();

    // Title
    const titleText = this.add.text(centerX, 80, '选择牌桌', {
      fontFamily: 'Courier New, monospace',
      fontSize: '32px',
      color: '#ff6b35'
    });
    titleText.setOrigin(0.5);
    titleText.setAlpha(0);

    // Deck variant cards
    const variants = getAllDeckVariants();
    const cardWidth = Math.min(width - 40, 360);
    const cardHeight = 140;
    const cardSpacing = 15;
    const startY = 150;

    const deckCards: Phaser.GameObjects.Container[] = [];

    variants.forEach((variant, index) => {
      const cardY = startY + index * (cardHeight + cardSpacing);
      const card = this.createDeckVariantCard(centerX, cardY, cardWidth, cardHeight, variant);
      card.setAlpha(0);
      deckCards.push(card);

      // Click handler
      card.setInteractive(
        new Phaser.Geom.Rectangle(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight),
        Phaser.Geom.Rectangle.Contains
      );
      card.on('pointerdown', () => {
        AudioManager.getInstance().playSFX('buttonClick');
        this._selectedDeckVariant = variant;
        this.startGameWithDeck();
        // Clean up
        this.tweens.add({
          targets: [overlay, titleText, ...deckCards],
          alpha: 0,
          duration: 300,
          onComplete: () => {
            overlay.destroy();
            titleText.destroy();
            deckCards.forEach(c => c.destroy());
          }
        });
      });

      card.on('pointerover', () => {
        this.tweens.add({
          targets: card,
          scale: 1.05,
          duration: 150,
          ease: 'Power2.Out'
        });
      });

      card.on('pointerout', () => {
        this.tweens.add({
          targets: card,
          scale: 1.0,
          duration: 150,
          ease: 'Power2.Out'
        });
      });
    });

    // Fade in all elements
    this.tweens.add({
      targets: [overlay, titleText, ...deckCards],
      alpha: 1,
      duration: 300,
      ease: 'Power2.Out'
    });
  }

  private createDeckVariantCard(
    x: number,
    y: number,
    width: number,
    height: number,
    variant: DeckVariant
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Background
    const bg = this.add.rectangle(0, 0, width, height, 0x2a2a2a);
    const borderColor = parseInt(this.getDifficultyColor(variant.difficulty).replace('#', ''), 16);
    bg.setStrokeStyle(2, borderColor);
    container.add(bg);

    // Name (Chinese)
    const nameText = this.add.text(-width / 2 + 15, -height / 2 + 15, variant.nameCN, {
      fontFamily: 'Courier New, monospace',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    nameText.setOrigin(0, 0);
    container.add(nameText);

    // Name (English)
    const nameEnText = this.add.text(-width / 2 + 15, -height / 2 + 45, variant.name, {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#888888'
    });
    nameEnText.setOrigin(0, 0);
    container.add(nameEnText);

    // Description
    const descText = this.add.text(-width / 2 + 15, -height / 2 + 70, variant.descriptionCN, {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#cccccc',
      wordWrap: { width: width - 30 }
    });
    descText.setOrigin(0, 0);
    container.add(descText);

    // Tile count
    const tileCountText = this.add.text(width / 2 - 15, -height / 2 + 15, `${variant.tileCount}张牌`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ffaa00'
    });
    tileCountText.setOrigin(1, 0);
    container.add(tileCountText);

    // Difficulty indicator
    const difficultyText = this.add.text(
      width / 2 - 15,
      height / 2 - 15,
      this.getDifficultyLabel(variant.difficulty),
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '14px',
        color: this.getDifficultyColor(variant.difficulty)
      }
    );
    difficultyText.setOrigin(1, 1);
    container.add(difficultyText);

    return container;
  }

  private getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return '#00ff00';
      case 'normal': return '#00aaff';
      case 'hard': return '#ffaa00';
      case 'expert': return '#ff4444';
      default: return '#ffffff';
    }
  }

  private getDifficultyLabel(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return '简单 ★';
      case 'normal': return '普通 ★★';
      case 'hard': return '困难 ★★★';
      case 'expert': return '专家 ★★★★';
      default: return '未知';
    }
  }

  private startGameWithDeck(): void {
    // Fade out before transitioning
    this.cameras.main.fadeOut(500);

    this.time.delayedCall(500, () => {
      this.scene.start('GameScene', {
        roundNumber: 1,
        targetScore: 500,
        deckVariant: this._selectedDeckVariant
      });
    });
  }

  private showSettings(): void {
    // Audio settings overlay
    const audioManager = AudioManager.getInstance();
    const settings = audioManager.getSettings();

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // Dark overlay
    const overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.8);
    overlay.setOrigin(0);
    overlay.setAlpha(0);
    overlay.setInteractive();

    // Settings panel
    const panel = this.add.rectangle(centerX, centerY, 420, 480, 0x222222);
    panel.setAlpha(0);

    const titleText = this.add.text(centerX, centerY - 200, '音量设置', {
      fontFamily: 'Courier New, monospace',
      fontSize: '32px',
      color: '#ffffff'
    });
    titleText.setOrigin(0.5);
    titleText.setAlpha(0);

    const elementsToFade: Phaser.GameObjects.GameObject[] = [overlay, panel, titleText];

    // Master volume slider
    const masterY = centerY - 130;
    const masterLabel = this.add.text(centerX - 180, masterY, '总音量', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#ffffff'
    });
    masterLabel.setAlpha(0);
    elementsToFade.push(masterLabel);

    const masterValue = this.add.text(centerX + 180, masterY, `${Math.round(settings.masterVolume * 100)}%`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#00ff00'
    });
    masterValue.setOrigin(1, 0);
    masterValue.setAlpha(0);
    elementsToFade.push(masterValue);

    const masterBar = this.createVolumeSlider(centerX, masterY + 30, settings.masterVolume, (value) => {
      audioManager.updateSettings({ masterVolume: value });
      masterValue.setText(`${Math.round(value * 100)}%`);
    });
    elementsToFade.push(...masterBar);

    // SFX volume slider
    const sfxY = centerY - 40;
    const sfxLabel = this.add.text(centerX - 180, sfxY, '音效音量', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#ffffff'
    });
    sfxLabel.setAlpha(0);
    elementsToFade.push(sfxLabel);

    const sfxValue = this.add.text(centerX + 180, sfxY, `${Math.round(settings.sfxVolume * 100)}%`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#00ff00'
    });
    sfxValue.setOrigin(1, 0);
    sfxValue.setAlpha(0);
    elementsToFade.push(sfxValue);

    const sfxBar = this.createVolumeSlider(centerX, sfxY + 30, settings.sfxVolume, (value) => {
      audioManager.updateSettings({ sfxVolume: value });
      sfxValue.setText(`${Math.round(value * 100)}%`);
      audioManager.playSFX('buttonClick'); // Test sound
    });
    elementsToFade.push(...sfxBar);

    // Music volume slider
    const musicY = centerY + 50;
    const musicLabel = this.add.text(centerX - 180, musicY, '音乐音量', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#ffffff'
    });
    musicLabel.setAlpha(0);
    elementsToFade.push(musicLabel);

    const musicValue = this.add.text(centerX + 180, musicY, `${Math.round(settings.musicVolume * 100)}%`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#00ff00'
    });
    musicValue.setOrigin(1, 0);
    musicValue.setAlpha(0);
    elementsToFade.push(musicValue);

    const musicBar = this.createVolumeSlider(centerX, musicY + 30, settings.musicVolume, (value) => {
      audioManager.updateSettings({ musicVolume: value });
      musicValue.setText(`${Math.round(value * 100)}%`);
    });
    elementsToFade.push(...musicBar);

    // Mute button
    const muteButton = this.add.text(
      centerX,
      centerY + 140,
      settings.muted ? '取消静音' : '静音',
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: settings.muted ? '#aa0000' : '#333333',
        padding: { x: 30, y: 12 }
      }
    );
    muteButton.setOrigin(0.5);
    muteButton.setInteractive({ useHandCursor: true });
    muteButton.setAlpha(0);

    muteButton.on('pointerdown', () => {
      const muted = audioManager.toggleMute();
      muteButton.setText(muted ? '取消静音' : '静音');
      muteButton.setStyle({ backgroundColor: muted ? '#aa0000' : '#333333' });
      if (!muted) {
        audioManager.playSFX('buttonClick');
      }
    });

    elementsToFade.push(muteButton);

    // Close button
    const closeButton = this.createButton(
      centerX,
      centerY + 200,
      '关闭',
      '#00aa00',
      () => {
        // Fade out settings
        this.tweens.add({
          targets: elementsToFade,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            elementsToFade.forEach(e => e.destroy());
          }
        });
      }
    );
    closeButton.setAlpha(0);
    elementsToFade.push(closeButton);

    // Fade in settings
    this.tweens.add({
      targets: elementsToFade,
      alpha: 1,
      duration: 300,
      ease: 'Power2.Out'
    });
  }

  private createVolumeSlider(
    x: number,
    y: number,
    initialValue: number,
    onChange: (value: number) => void
  ): Phaser.GameObjects.GameObject[] {
    const barWidth = 300;
    const barHeight = 20;

    // Background bar
    const bgBar = this.add.rectangle(x, y, barWidth, barHeight, 0x444444);
    bgBar.setAlpha(0);

    // Fill bar
    const fillBar = this.add.rectangle(
      x - barWidth / 2 + (barWidth * initialValue) / 2,
      y,
      barWidth * initialValue,
      barHeight,
      0x00ff00
    );
    fillBar.setOrigin(0, 0.5);
    fillBar.setAlpha(0);

    // Handle
    const handle = this.add.circle(x - barWidth / 2 + barWidth * initialValue, y, 12, 0xffffff);
    handle.setInteractive({ useHandCursor: true, draggable: true });
    handle.setAlpha(0);

    // Drag handling
    this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number) => {
      if (gameObject === handle) {
        const minX = x - barWidth / 2;
        const maxX = x + barWidth / 2;
        const clampedX = Phaser.Math.Clamp(dragX, minX, maxX);
        handle.x = clampedX;

        const value = (clampedX - minX) / barWidth;
        fillBar.x = minX;
        fillBar.width = barWidth * value;

        onChange(value);
      }
    });

    return [bgBar, fillBar, handle];
  }
}