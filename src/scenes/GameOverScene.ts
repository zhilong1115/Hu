import Phaser from 'phaser';
import { AudioManager } from '../audio/AudioManager';

interface GameOverData {
  finalScore?: number;
  roundReached?: number;
  fansFormed?: number;
  godTilesCollected?: number;
}

interface HighScoreData {
  score: number;
  rounds: number;
  date: string;
}

/**
 * GameOverScene - Run end screen for HU!
 *
 * Features:
 * - Final score display with breakdown
 * - Stats summary (rounds, fans, god tiles)
 * - Play again button
 * - Back to menu button
 * - High score comparison and saving
 * - New record celebration
 */
export class GameOverScene extends Phaser.Scene {
  private _isNewRecord: boolean = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data?: GameOverData) {
    const finalScore = data?.finalScore ?? 0;
    const roundReached = data?.roundReached ?? 1;
    const fansFormed = data?.fansFormed ?? 0;
    const godTilesCollected = data?.godTilesCollected ?? 0;

    // Check and save high score
    this.checkHighScore(finalScore, roundReached);

    // Stop music (game over)
    AudioManager.getInstance().stopMusic();

    // Play appropriate sound
    if (this._isNewRecord) {
      AudioManager.getInstance().playSFX('winJingle');
    } else {
      AudioManager.getInstance().playSFX('loseSound');
    }

    // Set background
    this.cameras.main.setBackgroundColor('#0a0a0a');

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // ── Title ──
    const titleY = 80;

    let titleText: Phaser.GameObjects.Text;
    let titleColor: string;

    if (this._isNewRecord) {
      titleText = this.add.text(centerX, titleY, '新纪录！🎉', {
        fontFamily: 'Courier New, monospace',
        fontSize: '56px',
        color: '#ffd700',
        fontStyle: 'bold'
      });
      titleColor = '#ffd700';
    } else {
      titleText = this.add.text(centerX, titleY, '游戏结束', {
        fontFamily: 'Courier New, monospace',
        fontSize: '48px',
        color: '#ff4444'
      });
      titleColor = '#ff4444';
    }
    titleText.setOrigin(0.5);
    titleText.setAlpha(0);

    // ── Score Display ──
    const scoreY = titleY + 80;

    const finalScoreText = this.add.text(centerX, scoreY, `${finalScore}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '64px',
      color: '#00ff00',
      fontStyle: 'bold'
    });
    finalScoreText.setOrigin(0.5);
    finalScoreText.setAlpha(0);

    const scoreLabelText = this.add.text(centerX, scoreY + 50, '最终分数', {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#aaaaaa'
    });
    scoreLabelText.setOrigin(0.5);
    scoreLabelText.setAlpha(0);

    // ── Stats Breakdown ──
    const statsY = scoreY + 120;

    const statsText = this.add.text(
      centerX,
      statsY,
      `回合通过: ${roundReached - 1}\n形成番型: ${fansFormed}\n收集神牌: ${godTilesCollected}`,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 10
      }
    );
    statsText.setOrigin(0.5);
    statsText.setAlpha(0);

    // ── High Score Comparison ──
    let highScoreText: Phaser.GameObjects.Text | null = null;

    if (!this._isNewRecord) {
      const highScore = this.loadHighScore();
      if (highScore) {
        highScoreText = this.add.text(
          centerX,
          statsY + 90,
          `最高分: ${highScore.score}`,
          {
            fontFamily: 'Courier New, monospace',
            fontSize: '16px',
            color: '#ffd700'
          }
        );
        highScoreText.setOrigin(0.5);
        highScoreText.setAlpha(0);
      }
    }

    // ── Encouraging Message ──
    let message = '再接再厉！';
    let messageColor = '#ffaa00';

    if (this._isNewRecord) {
      message = '你创造了新的传奇！';
      messageColor = '#ffd700';
    } else if (finalScore >= 10000) {
      message = '表现出色！';
      messageColor = '#00ff00';
    } else if (finalScore >= 5000) {
      message = '不错的成绩！';
      messageColor = '#00aaff';
    }

    const messageText = this.add.text(centerX, this.scale.height - 200, message, {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: messageColor,
      fontStyle: 'italic'
    });
    messageText.setOrigin(0.5);
    messageText.setAlpha(0);

    // ── Buttons ──
    const buttonY = this.scale.height - 120;

    const retryButton = this.createButton(
      centerX,
      buttonY,
      '再来一次',
      '#00aa00',
      () => this.onPlayAgain()
    );
    retryButton.setAlpha(0);

    const backButton = this.createButton(
      centerX,
      buttonY + 60,
      '返回主菜单',
      '#333333',
      () => this.onBackToMenu()
    );
    backButton.setAlpha(0);

    // ── Animations ──
    // Fade in from game
    this.cameras.main.fadeIn(500);

    // Animate elements sequentially
    const elements = [
      titleText,
      finalScoreText,
      scoreLabelText,
      statsText,
      highScoreText,
      messageText,
      retryButton,
      backButton
    ].filter(e => e !== null);

    elements.forEach((element, index) => {
      this.tweens.add({
        targets: element,
        alpha: 1,
        duration: 600,
        ease: 'Power2.Out',
        delay: 400 + index * 150
      });
    });

    // Special animations for new record
    if (this._isNewRecord) {
      // Pulsing title
      this.tweens.add({
        targets: titleText,
        scale: 1.1,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });

      // Score number count-up animation
      this.animateScoreCountUp(finalScoreText, finalScore);

      // Particle burst
      this.createCelebrationParticles(centerX, scoreY);
    }
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
      fontSize: '20px',
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

  private checkHighScore(finalScore: number, roundReached: number): void {
    const currentHighScore = this.loadHighScore();

    if (!currentHighScore || finalScore > currentHighScore.score) {
      // New high score!
      this._isNewRecord = true;
      this.saveHighScore(finalScore, roundReached);
    }
  }

  private loadHighScore(): HighScoreData | null {
    try {
      const stored = localStorage.getItem('hu_high_score');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load high score:', e);
    }
    return null;
  }

  private saveHighScore(score: number, rounds: number): void {
    try {
      const highScore: HighScoreData = {
        score,
        rounds,
        date: new Date().toISOString()
      };
      localStorage.setItem('hu_high_score', JSON.stringify(highScore));
    } catch (e) {
      console.warn('Failed to save high score:', e);
    }
  }

  private animateScoreCountUp(textObject: Phaser.GameObjects.Text, targetScore: number): void {
    let currentScore = 0;
    const duration = 2000;
    const steps = 60;
    const increment = targetScore / steps;

    const timer = this.time.addEvent({
      delay: duration / steps,
      callback: () => {
        currentScore += increment;
        if (currentScore >= targetScore) {
          currentScore = targetScore;
          timer.destroy();
        }
        textObject.setText(`${Math.floor(currentScore)}`);

        // Play score counting sound every few ticks
        if (Math.floor(currentScore) % 500 === 0) {
          AudioManager.getInstance().playSFX('scoreCount');
        }
      },
      repeat: steps
    });
  }

  private createCelebrationParticles(x: number, y: number): void {
    // Create golden particles for new record celebration
    const numParticles = 30;

    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2;
      const distance = Phaser.Math.Between(100, 200);

      const particle = this.add.circle(x, y, 6, 0xffd700);
      particle.setAlpha(0.8);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 1500,
        ease: 'Power2.Out',
        delay: 1000,
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  private onPlayAgain(): void {
    // Fade out before transitioning
    this.cameras.main.fadeOut(500);

    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }

  private onBackToMenu(): void {
    // Fade out before transitioning
    this.cameras.main.fadeOut(500);

    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }
}