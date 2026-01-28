import Phaser from 'phaser';
import { BossBlind } from '../roguelike/BossBlind';

/**
 * BossBlindBanner — Visual banner showing active boss blind effect
 * Displays at top of screen with pulsing/warning effects
 */
export class BossBlindBanner extends Phaser.GameObjects.Container {
  private _bossBlind: BossBlind | null = null;

  // Visual elements
  private _background!: Phaser.GameObjects.Rectangle;
  private _nameText!: Phaser.GameObjects.Text;
  private _descriptionText!: Phaser.GameObjects.Text;
  private _warningIcon!: Phaser.GameObjects.Text;

  // Dimensions
  private readonly BANNER_WIDTH = 360;
  private readonly BANNER_HEIGHT = 80;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.createVisuals();
    this.setVisible(false);
    scene.add.existing(this);
  }

  private createVisuals(): void {
    // Background with dark red gradient
    this._background = this.scene.add.rectangle(
      0, 0,
      this.BANNER_WIDTH, this.BANNER_HEIGHT,
      0x330000, 0.95
    );
    this._background.setStrokeStyle(3, 0xff0000);
    this.add(this._background);

    // Warning icon
    this._warningIcon = this.scene.add.text(-this.BANNER_WIDTH / 2 + 20, 0, '⚠', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ffaa00'
    });
    this._warningIcon.setOrigin(0.5);
    this.add(this._warningIcon);

    // Blind name
    this._nameText = this.scene.add.text(0, -15, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#ff6666',
      fontStyle: 'bold'
    });
    this._nameText.setOrigin(0.5);
    this.add(this._nameText);

    // Description
    this._descriptionText = this.scene.add.text(0, 10, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff'
    });
    this._descriptionText.setOrigin(0.5);
    this.add(this._descriptionText);

    // Add pulsing animation to warning icon
    this.scene.tweens.add({
      targets: this._warningIcon,
      scale: 1.2,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Show the banner with the given boss blind
   */
  public showBlind(bossBlind: BossBlind): void {
    this._bossBlind = bossBlind;
    this._nameText.setText(bossBlind.name);
    this._descriptionText.setText(bossBlind.description);

    this.setVisible(true);
    this.setAlpha(0);
    this.y -= 20;

    // Slide in from top
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      y: this.y + 20,
      duration: 600,
      ease: 'Back.easeOut'
    });

    // Pulsing background effect
    this.scene.tweens.add({
      targets: this._background,
      alpha: 0.85,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Hide the banner
   */
  public hide(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y - 20,
      duration: 400,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.setVisible(false);
      }
    });
  }

  /**
   * Flash the banner (for when effect triggers)
   */
  public flash(): void {
    this.scene.tweens.add({
      targets: this._background,
      alpha: 1,
      duration: 100,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut'
    });

    this.scene.tweens.add({
      targets: this,
      scale: 1.05,
      duration: 100,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Update banner text (for dynamic effects like SUIT_BAN)
   */
  public updateDescription(newDescription: string): void {
    this._descriptionText.setText(newDescription);
    this.flash();
  }

  public get bossBlind(): BossBlind | null {
    return this._bossBlind;
  }
}
