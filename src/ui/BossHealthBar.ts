import Phaser from 'phaser';

/**
 * BossHealthBar — Visual health bar for boss encounters
 * Displays boss name, current/max health, and phase indicators
 */
export class BossHealthBar extends Phaser.GameObjects.Container {
  private _maxHealth: number;
  private _currentHealth: number;
  private _bossName: string;

  // Visual elements
  private _background!: Phaser.GameObjects.Rectangle;
  private _healthBarFill!: Phaser.GameObjects.Rectangle;
  private _healthBarBorder!: Phaser.GameObjects.Rectangle;
  private _nameText!: Phaser.GameObjects.Text;
  private _healthText!: Phaser.GameObjects.Text;
  private _phaseIndicator!: Phaser.GameObjects.Text;

  // Dimensions
  private readonly BAR_WIDTH = 300;
  private readonly BAR_HEIGHT = 24;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    bossName: string,
    maxHealth: number
  ) {
    super(scene, x, y);

    this._bossName = bossName;
    this._maxHealth = maxHealth;
    this._currentHealth = maxHealth;

    this.createVisuals();
    scene.add.existing(this);
  }

  private createVisuals(): void {
    // Background panel
    this._background = this.scene.add.rectangle(0, 0, this.BAR_WIDTH + 40, 100, 0x000000, 0.8);
    this._background.setStrokeStyle(2, 0xaa0000);
    this.add(this._background);

    // Boss name
    this._nameText = this.scene.add.text(0, -35, this._bossName, {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#ff6666',
      fontStyle: 'bold'
    });
    this._nameText.setOrigin(0.5);
    this.add(this._nameText);

    // Health bar border
    this._healthBarBorder = this.scene.add.rectangle(
      0, 0,
      this.BAR_WIDTH, this.BAR_HEIGHT,
      0x000000, 0
    );
    this._healthBarBorder.setStrokeStyle(2, 0xffffff);
    this.add(this._healthBarBorder);

    // Health bar fill (red gradient effect)
    this._healthBarFill = this.scene.add.rectangle(
      -this.BAR_WIDTH / 2, 0,
      this.BAR_WIDTH, this.BAR_HEIGHT - 4,
      0xff0000
    );
    this._healthBarFill.setOrigin(0, 0.5);
    this.add(this._healthBarFill);

    // Health text
    this._healthText = this.scene.add.text(0, 0, `${this._currentHealth} / ${this._maxHealth}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this._healthText.setOrigin(0.5);
    this.add(this._healthText);

    // Phase indicator
    this._phaseIndicator = this.scene.add.text(0, 30, '阶段 I', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffaa00'
    });
    this._phaseIndicator.setOrigin(0.5);
    this.add(this._phaseIndicator);
  }

  /**
   * Update health and animate the bar
   */
  public setHealth(current: number, animate: boolean = true): void {
    const oldHealth = this._currentHealth;
    this._currentHealth = Math.max(0, Math.min(this._maxHealth, current));

    this.updateHealthText();

    if (animate) {
      this.animateHealthChange(oldHealth, this._currentHealth);
    } else {
      this.updateHealthBar();
    }
  }

  /**
   * Set the boss phase (1, 2, or 3)
   */
  public setPhase(phase: number): void {
    const phaseNames = ['I', 'II', 'III'];
    const phaseName = phaseNames[phase - 1] || 'I';
    this._phaseIndicator.setText(`阶段 ${phaseName}`);

    // Flash phase indicator on phase change
    this.scene.tweens.add({
      targets: this._phaseIndicator,
      scale: 1.3,
      duration: 200,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });

    // Change color based on phase
    const phaseColors = ['#ffaa00', '#ff6600', '#ff0000'];
    this._phaseIndicator.setColor(phaseColors[phase - 1] || '#ffaa00');
  }

  /**
   * Deal damage to boss with animation
   */
  public takeDamage(amount: number): void {
    this.setHealth(this._currentHealth - amount, true);

    // Shake effect on damage
    this.scene.tweens.add({
      targets: this,
      x: this.x + 5,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut'
    });

    // Flash red
    this.scene.tweens.add({
      targets: this._healthBarFill,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Heal boss (for boss abilities that restore health)
   */
  public heal(amount: number): void {
    this.setHealth(this._currentHealth + amount, true);

    // Green flash for healing
    const originalColor = this._healthBarFill.fillColor;
    this._healthBarFill.setFillStyle(0x00ff00);

    this.scene.time.delayedCall(200, () => {
      this._healthBarFill.setFillStyle(originalColor);
    });
  }

  public get currentHealth(): number {
    return this._currentHealth;
  }

  public get maxHealth(): number {
    return this._maxHealth;
  }

  public get healthPercent(): number {
    return this._currentHealth / this._maxHealth;
  }

  private updateHealthBar(): void {
    const healthPercent = this._currentHealth / this._maxHealth;
    const newWidth = Math.max(0, this.BAR_WIDTH * healthPercent);
    this._healthBarFill.width = newWidth;

    // Change color based on health
    if (healthPercent > 0.5) {
      this._healthBarFill.setFillStyle(0xff0000);
    } else if (healthPercent > 0.25) {
      this._healthBarFill.setFillStyle(0xff6600);
    } else {
      this._healthBarFill.setFillStyle(0xff9900);
    }
  }

  private updateHealthText(): void {
    this._healthText.setText(`${Math.floor(this._currentHealth)} / ${this._maxHealth}`);
  }

  private animateHealthChange(oldHealth: number, newHealth: number): void {
    // Animate the health bar width change
    this.scene.tweens.add({
      targets: { value: oldHealth },
      value: newHealth,
      duration: 500,
      ease: 'Sine.easeOut',
      onUpdate: (tween) => {
        const current = tween.getValue() ?? 0;
        const healthPercent = current / this._maxHealth;
        const newWidth = Math.max(0, this.BAR_WIDTH * healthPercent);
        this._healthBarFill.width = newWidth;

        // Update color during animation
        if (healthPercent > 0.5) {
          this._healthBarFill.setFillStyle(0xff0000);
        } else if (healthPercent > 0.25) {
          this._healthBarFill.setFillStyle(0xff6600);
        } else {
          this._healthBarFill.setFillStyle(0xff9900);
        }
      }
    });
  }

  /**
   * Show entrance animation for boss
   */
  public showEntrance(): void {
    this.setAlpha(0);
    this.setScale(0.8);

    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scale: 1,
      duration: 800,
      ease: 'Back.easeOut'
    });

    // Pulsing name text
    this.scene.tweens.add({
      targets: this._nameText,
      scale: 1.2,
      duration: 400,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Show defeat animation
   */
  public showDefeat(): Promise<void> {
    return new Promise((resolve) => {
      // Flash red rapidly
      this.scene.tweens.add({
        targets: this._healthBarFill,
        alpha: 0,
        duration: 100,
        yoyo: true,
        repeat: 5
      });

      // Shake violently
      this.scene.tweens.add({
        targets: this,
        x: this.x + 10,
        duration: 50,
        yoyo: true,
        repeat: 8,
        ease: 'Sine.easeInOut'
      });

      // Fade out
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        scale: 0.8,
        duration: 500,
        delay: 500,
        ease: 'Sine.easeIn',
        onComplete: () => {
          resolve();
        }
      });
    });
  }
}
