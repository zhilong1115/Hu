import Phaser from 'phaser';
import { ScoreBreakdown } from '../core/Scoring';
import { Fan } from '../core/FanEvaluator';

// Legacy interface for compatibility
export interface ScoreResult {
  finalScore: number;
  totalPoints: number;
  fans: Fan[];
}

export class ScorePopup extends Phaser.GameObjects.Container {
  private _background!: Phaser.GameObjects.Rectangle;
  private _titleText!: Phaser.GameObjects.Text;
  private _scoreText!: Phaser.GameObjects.Text;
  private _fanListText!: Phaser.GameObjects.Text;
  private _closeButton!: Phaser.GameObjects.Text;

  // New elements for Balatro-style animations
  private _chipsText!: Phaser.GameObjects.Text;
  private _multText!: Phaser.GameObjects.Text;
  private _operatorText!: Phaser.GameObjects.Text;
  private _equalsText!: Phaser.GameObjects.Text;
  private _finalScoreText!: Phaser.GameObjects.Text;
  private _fanNameBanner!: Phaser.GameObjects.Container;

  // Animation state
  private _animationRunning: boolean = false;
  private _currentBreakdown: ScoreBreakdown | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.createUI();
    this.visible = false;

    scene.add.existing(this);
  }

  public showScore(scoreResult: ScoreResult): void {
    this.updateContent(scoreResult);
    this.visible = true;
    this.alpha = 0;

    // Animate in
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: 'Back.Out'
    });
  }

  /**
   * Show score with full Balatro-style animation sequence
   */
  public showScoreWithAnimation(breakdown: ScoreBreakdown, fans: Fan[]): void {
    this._currentBreakdown = breakdown;
    this._animationRunning = true;

    // Start hidden
    this.visible = true;
    this.alpha = 0;
    this.scale = 0.95;

    // Hide all score elements initially
    this._chipsText.setAlpha(0);
    this._multText.setAlpha(0);
    this._operatorText.setAlpha(0);
    this._equalsText.setAlpha(0);
    this._finalScoreText.setAlpha(0);

    // Reset text content
    this._chipsText.setText('0');
    this._multText.setText('x1.0');
    this._finalScoreText.setText('0');

    // Phase 1: Fade in background
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: 'Back.Out',
      onComplete: () => {
        // Phase 2: Show fan name banner
        this.showFanBanner(fans, () => {
          // Phase 3: Animate score calculation
          this.animateScoreCalculation(breakdown);
        });
      }
    });
  }

  public hide(callback?: () => void): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.8,
      duration: 200,
      ease: 'Power2.In',
      onComplete: () => {
        this.visible = false;
        callback?.();
      }
    });
  }

  private createUI(): void {
    // Background
    this._background = new Phaser.GameObjects.Rectangle(this.scene, 0, 0, 450, 350, 0x2c1810);
    this._background.setStrokeStyle(4, 0xff6b35);
    this._background.alpha = 0.95;
    this.add(this._background);

    // Title
    this._titleText = new Phaser.GameObjects.Text(this.scene, 0, -150, '胡牌！', {
      fontFamily: 'Courier New, monospace',
      fontSize: '32px',
      color: '#ff6b35',
      align: 'center'
    });
    this._titleText.setOrigin(0.5);
    this.add(this._titleText);

    // Balatro-style score breakdown display
    // Chips text (left side)
    this._chipsText = new Phaser.GameObjects.Text(this.scene, -80, -50, '0', {
      fontFamily: 'Courier New, monospace',
      fontSize: '48px',
      color: '#4da6ff',
      align: 'center',
      fontStyle: 'bold'
    });
    this._chipsText.setOrigin(0.5);
    this.add(this._chipsText);

    // Operator (×)
    this._operatorText = new Phaser.GameObjects.Text(this.scene, 0, -50, '×', {
      fontFamily: 'Courier New, monospace',
      fontSize: '36px',
      color: '#ffffff',
      align: 'center'
    });
    this._operatorText.setOrigin(0.5);
    this.add(this._operatorText);

    // Mult text (right side)
    this._multText = new Phaser.GameObjects.Text(this.scene, 80, -50, 'x1.0', {
      fontFamily: 'Courier New, monospace',
      fontSize: '48px',
      color: '#ff6b6b',
      align: 'center',
      fontStyle: 'bold'
    });
    this._multText.setOrigin(0.5);
    this.add(this._multText);

    // Equals sign
    this._equalsText = new Phaser.GameObjects.Text(this.scene, 0, 10, '=', {
      fontFamily: 'Courier New, monospace',
      fontSize: '24px',
      color: '#cccccc',
      align: 'center'
    });
    this._equalsText.setOrigin(0.5);
    this.add(this._equalsText);

    // Final score
    this._finalScoreText = new Phaser.GameObjects.Text(this.scene, 0, 50, '0', {
      fontFamily: 'Courier New, monospace',
      fontSize: '56px',
      color: '#ffd700',
      align: 'center',
      fontStyle: 'bold'
    });
    this._finalScoreText.setOrigin(0.5);
    this.add(this._finalScoreText);

    // Legacy elements (kept for compatibility)
    this._scoreText = new Phaser.GameObjects.Text(this.scene, 0, -80, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '24px',
      color: '#ffffff',
      align: 'center'
    });
    this._scoreText.setOrigin(0.5);
    this._scoreText.setVisible(false); // Hidden by default
    this.add(this._scoreText);

    // Fan list
    this._fanListText = new Phaser.GameObjects.Text(this.scene, 0, 90, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#cccccc',
      align: 'center',
      wordWrap: { width: 400 }
    });
    this._fanListText.setOrigin(0.5);
    this.add(this._fanListText);

    // Fan name banner (created separately)
    this._fanNameBanner = this.scene.add.container(0, -150);
    this._fanNameBanner.setAlpha(0);
    this.add(this._fanNameBanner);

    // Close button
    this._closeButton = new Phaser.GameObjects.Text(this.scene, 0, 140, '继续', {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    this._closeButton.setOrigin(0.5);
    this._closeButton.setInteractive();
    this._closeButton.on('pointerdown', () => {
      this.hide();
      this.emit('continue');
    });

    // Hover effect for close button
    this._closeButton.on('pointerover', () => {
      this._closeButton.setStyle({ backgroundColor: '#555555' });
    });
    this._closeButton.on('pointerout', () => {
      this._closeButton.setStyle({ backgroundColor: '#333333' });
    });

    this.add(this._closeButton);

    // Initial scale for animation
    this.scale = 0.8;
  }

  private updateContent(scoreResult: ScoreResult): void {
    // Update score text
    this._scoreText.setText(`${scoreResult.finalScore} 分`);

    // Update fan list
    if (scoreResult.fans.length > 0) {
      const fanTexts = scoreResult.fans.map(fan => `${fan.name} (${fan.points}番)`);
      this._fanListText.setText(`番型: ${fanTexts.join(', ')}\n总计: ${scoreResult.totalPoints}番`);
    } else {
      this._fanListText.setText('无番');
    }

    // Change title based on score quality
    if (scoreResult.totalPoints >= 88) {
      this._titleText.setText('88番满贯！');
      this._titleText.setStyle({ color: '#ffd700' }); // Gold
    } else if (scoreResult.totalPoints >= 64) {
      this._titleText.setText('64番大满贯！');
      this._titleText.setStyle({ color: '#ff4444' }); // Red
    } else if (scoreResult.totalPoints >= 24) {
      this._titleText.setText('满贯！');
      this._titleText.setStyle({ color: '#ff6b35' }); // Orange
    } else {
      this._titleText.setText('胡牌！');
      this._titleText.setStyle({ color: '#ffffff' }); // White
    }
  }

  public showError(message: string): void {
    this._titleText.setText('无法胡牌');
    this._titleText.setStyle({ color: '#ff4444' });
    this._scoreText.setText('');
    this._fanListText.setText(message);

    this.visible = true;
    this.alpha = 0;

    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: 'Back.Out'
    });

    // Auto-hide after 2 seconds for errors
    this.scene.time.delayedCall(2000, () => {
      this.hide();
    });
  }

  /* ── Balatro-style Animation Methods ─────────────────────── */

  /**
   * Show fan name banner with slide-in animation
   */
  private showFanBanner(fans: Fan[], onComplete: () => void): void {
    if (fans.length === 0) {
      onComplete();
      return;
    }

    // Clear existing banner
    this._fanNameBanner.removeAll(true);

    // Get the most valuable fan to display
    const primaryFan = fans.reduce((max, fan) => fan.points > max.points ? fan : max);

    // Create banner background
    const bannerBg = this.scene.add.rectangle(0, 0, 350, 50, 0x000000, 0.8);
    const bannerBorder = this.scene.add.rectangle(0, 0, 350, 50);
    bannerBorder.setStrokeStyle(3, this.getFanColor(primaryFan.points));

    // Create banner text
    const bannerText = this.scene.add.text(0, 0, primaryFan.name, {
      fontFamily: 'Courier New, monospace',
      fontSize: '24px',
      color: this.getFanColorString(primaryFan.points),
      align: 'center',
      fontStyle: 'bold'
    });
    bannerText.setOrigin(0.5);

    this._fanNameBanner.add([bannerBg, bannerBorder, bannerText]);

    // Animate slide in from left
    this._fanNameBanner.x = -400;
    this._fanNameBanner.setAlpha(1);

    this.scene.tweens.add({
      targets: this._fanNameBanner,
      x: 0,
      duration: 400,
      ease: 'Back.Out',
      onComplete: () => {
        // Hold for a moment
        this.scene.time.delayedCall(800, () => {
          // Slide out to right
          this.scene.tweens.add({
            targets: this._fanNameBanner,
            x: 400,
            alpha: 0,
            duration: 300,
            ease: 'Power2.In',
            onComplete: onComplete
          });
        });
      }
    });
  }

  /**
   * Animate chips counting up (slot machine style)
   */
  private animateChipsCounting(targetChips: number, duration: number): void {
    this._chipsText.setAlpha(1);

    const startValue = 0;
    const valueObj = { value: startValue };

    this.scene.tweens.add({
      targets: valueObj,
      value: targetChips,
      duration: duration,
      ease: 'Power2.Out',
      onUpdate: () => {
        this._chipsText.setText(Math.floor(valueObj.value).toString());
      },
      onComplete: () => {
        // Final flash
        this.scene.tweens.add({
          targets: this._chipsText,
          scale: 1.2,
          duration: 100,
          yoyo: true,
          ease: 'Sine.InOut'
        });
      }
    });
  }

  /**
   * Animate mult multiplying in with dramatic zoom
   */
  private animateMultReveal(targetMult: number, duration: number, onComplete: () => void): void {
    this._multText.setAlpha(1);
    this._operatorText.setAlpha(1);

    // Start from scale 0 and zoom in
    this._multText.setScale(0);

    const multText = this._multText;
    const valueObj = { value: 1.0 };

    // Zoom in animation
    this.scene.tweens.add({
      targets: this._multText,
      scale: 1.2,
      duration: duration / 2,
      ease: 'Back.Out',
      onComplete: () => {
        // Count up the mult value
        this.scene.tweens.add({
          targets: valueObj,
          value: targetMult,
          duration: duration / 2,
          ease: 'Power2.Out',
          onUpdate: () => {
            multText.setText(`x${valueObj.value.toFixed(1)}`);
          },
          onComplete: () => {
            // Flash effect
            this.scene.tweens.add({
              targets: this._multText,
              scale: 1.0,
              duration: 150,
              ease: 'Sine.InOut'
            });

            // Flash the background
            this.scene.tweens.add({
              targets: this._background,
              alpha: 1,
              duration: 100,
              yoyo: true,
              repeat: 1,
              onComplete: onComplete
            });
          }
        });
      }
    });
  }

  /**
   * Animate final score reveal with impact effect
   */
  private animateFinalScoreReveal(finalScore: number): void {
    this._equalsText.setAlpha(1);
    this._finalScoreText.setAlpha(1);

    // Start small and explode outward
    this._finalScoreText.setScale(0);

    const valueObj = { value: 0 };

    // Dramatic reveal
    this.scene.tweens.add({
      targets: this._finalScoreText,
      scale: 1.3,
      duration: 400,
      ease: 'Back.Out',
      onStart: () => {
        // Screen flash effect (on background)
        this.scene.tweens.add({
          targets: this._background,
          alpha: 1,
          duration: 50,
          yoyo: true,
          repeat: 2
        });
      },
      onComplete: () => {
        // Settle to normal size
        this.scene.tweens.add({
          targets: this._finalScoreText,
          scale: 1.0,
          duration: 200,
          ease: 'Sine.Out'
        });
      }
    });

    // Count up the score
    this.scene.tweens.add({
      targets: valueObj,
      value: finalScore,
      duration: 600,
      ease: 'Power2.Out',
      onUpdate: () => {
        this._finalScoreText.setText(Math.floor(valueObj.value).toString());
      },
      onComplete: () => {
        // Add particles for big wins
        if (finalScore >= 10000) {
          this.createBigWinParticles();
        }

        // Enable continue button
        this._animationRunning = false;

        // Pulse animation on continue button
        this.scene.tweens.add({
          targets: this._closeButton,
          scale: 1.1,
          duration: 300,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut'
        });
      }
    });
  }

  /**
   * Full score calculation animation sequence
   */
  private animateScoreCalculation(breakdown: ScoreBreakdown): void {
    // Update fan list
    if (breakdown.detectedFans.length > 0) {
      const fanTexts = breakdown.detectedFans.map(fan => `${fan.name} (${fan.points}番)`);
      this._fanListText.setText(fanTexts.join(' • '));
    }

    // Phase 1: Chips counting up (1 second)
    this.animateChipsCounting(breakdown.totalChips, 1000);

    // Phase 2: Mult reveal (0.8 seconds), starts after chips
    this.scene.time.delayedCall(1000, () => {
      this.animateMultReveal(breakdown.totalMult, 800, () => {
        // Phase 3: Final score reveal (starts immediately after mult)
        this.animateFinalScoreReveal(breakdown.finalScore);
      });
    });
  }

  /**
   * Create particle effects for big wins
   */
  private createBigWinParticles(): void {
    // Create simple graphics-based particles
    const particleCount = 30;
    const centerX = this.x;
    const centerY = this.y;

    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.circle(0, 50, 3, 0xffd700);
      particle.setAlpha(1);
      this.add(particle);

      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 100 + Math.random() * 100;

      this.scene.tweens.add({
        targets: particle,
        x: Math.cos(angle) * speed,
        y: 50 + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0,
        duration: 1000,
        ease: 'Power2.Out',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  /**
   * Get color for fan based on point value
   */
  private getFanColor(points: number): number {
    if (points >= 88) return 0xffd700; // Gold
    if (points >= 64) return 0xff4444; // Red
    if (points >= 24) return 0xff6b35; // Orange
    return 0xffffff; // White
  }

  /**
   * Get color string for fan based on point value
   */
  private getFanColorString(points: number): string {
    if (points >= 88) return '#ffd700'; // Gold
    if (points >= 64) return '#ff4444'; // Red
    if (points >= 24) return '#ff6b35'; // Orange
    return '#ffffff'; // White
  }
}