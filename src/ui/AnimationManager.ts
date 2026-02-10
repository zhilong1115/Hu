import Phaser from 'phaser';

/**
 * AnimationManager — Centralized animation/VFX system for HU!
 * 
 * Provides reusable, performant animation methods using Phaser tweens,
 * graphics-based particles, and camera effects.
 * 
 * Categories:
 * - Tile animations (draw, discard, select, meld)
 * - Win/score effects (hu celebration, fan banners, score counter)
 * - Resource effects (gold gain/spend)
 * - UI polish (button feedback, round banners, transitions)
 * - Ambient effects (background particles, draw pile)
 * - Balatro-style scoring popups
 */
export class AnimationManager {
  private scene: Phaser.Scene;
  private ambientParticles: Phaser.GameObjects.Graphics[] = [];
  private ambientTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  destroy(): void {
    this.stopAmbientParticles();
  }

  /* ══════════════════════════════════════════════════════════
   * 1. TILE ANIMATIONS
   * ══════════════════════════════════════════════════════════ */

  /**
   * Draw tile: slide in from right with bounce
   */
  drawTile(
    target: Phaser.GameObjects.GameObject,
    fromX: number,
    toX: number,
    toY: number,
    onComplete?: () => void
  ): void {
    const obj = target as any;
    obj.x = fromX;
    obj.y = toY - 20;
    obj.alpha = 0;

    this.scene.tweens.add({
      targets: target,
      x: toX,
      y: toY,
      alpha: 1,
      duration: 350,
      ease: 'Back.Out',
      onComplete: () => onComplete?.()
    });
  }

  /**
   * Discard tiles: fly out to discard area with fade and scale
   */
  discardTiles(
    targets: Phaser.GameObjects.GameObject[],
    discardX: number,
    discardY: number,
    onComplete?: () => void
  ): void {
    if (targets.length === 0) {
      onComplete?.();
      return;
    }

    let completed = 0;
    targets.forEach((target, i) => {
      this.scene.tweens.add({
        targets: target,
        x: discardX,
        y: discardY,
        alpha: 0,
        scale: 0.5,
        rotation: (Math.random() - 0.5) * 0.5,
        duration: 300,
        delay: i * 40,
        ease: 'Power2.In',
        onComplete: () => {
          completed++;
          if (completed === targets.length) onComplete?.();
        }
      });
    });
  }

  /**
   * Select tile: bounce up with glow pulse
   */
  selectTile(target: Phaser.GameObjects.GameObject): void {
    const obj = target as any;
    this.scene.tweens.add({
      targets: target,
      y: (obj.y || 0) - 8,
      duration: 150,
      ease: 'Back.Out',
    });
  }

  /**
   * Deselect tile: settle back
   */
  deselectTile(target: Phaser.GameObjects.GameObject, originalY: number): void {
    this.scene.tweens.add({
      targets: target,
      y: originalY,
      duration: 120,
      ease: 'Power2.Out',
    });
  }

  /**
   * Meld play: tiles fly from hand positions to meld display area
   */
  meldPlay(
    tileObjects: Phaser.GameObjects.GameObject[],
    targetX: number,
    targetY: number,
    onComplete?: () => void
  ): void {
    if (tileObjects.length === 0) {
      onComplete?.();
      return;
    }

    let completed = 0;
    const spacing = 35;
    const startX = targetX - ((tileObjects.length - 1) * spacing) / 2;

    tileObjects.forEach((tile, i) => {
      const destX = startX + i * spacing;
      this.scene.tweens.add({
        targets: tile,
        x: destX,
        y: targetY,
        scale: 0.8,
        duration: 400,
        delay: i * 60,
        ease: 'Back.Out',
        onComplete: () => {
          completed++;
          if (completed === tileObjects.length) {
            // Group squeeze together
            this.scene.tweens.add({
              targets: tileObjects,
              scale: 0.7,
              duration: 150,
              yoyo: true,
              ease: 'Sine.InOut',
              onComplete: () => onComplete?.()
            });
          }
        }
      });
    });
  }

  /**
   * Initial deal: staggered slide-in from right
   */
  initialDeal(
    tileObjects: Phaser.GameObjects.GameObject[],
    finalPositions: { x: number; y: number }[],
    onComplete?: () => void
  ): void {
    if (tileObjects.length === 0) {
      onComplete?.();
      return;
    }

    let completed = 0;
    const screenW = this.scene.scale.width;

    tileObjects.forEach((tile, i) => {
      const obj = tile as any;
      obj.x = screenW + 50;
      obj.y = finalPositions[i]?.y ?? 0;
      obj.alpha = 0;
      obj.scale = 0.8;

      this.scene.tweens.add({
        targets: tile,
        x: finalPositions[i]?.x ?? 0,
        alpha: 1,
        scale: 1,
        duration: 300,
        delay: i * 40,
        ease: 'Back.Out',
        onComplete: () => {
          completed++;
          if (completed === tileObjects.length) onComplete?.();
        }
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
   * 2. WIN / SCORE EFFECTS
   * ══════════════════════════════════════════════════════════ */

  /**
   * Hu win celebration: white flash → particle explosion → score zoom
   */
  huCelebration(onComplete?: () => void): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    // Phase 1: White flash
    const flash = this.scene.add.rectangle(cx, cy, w, h, 0xffffff, 0.8);
    flash.setDepth(9998);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      ease: 'Power2.Out',
      onComplete: () => flash.destroy()
    });

    // Phase 2: Camera shake
    this.scene.cameras.main.shake(400, 0.008);

    // Phase 3: Particle explosion from center
    this.scene.time.delayedCall(200, () => {
      this.particleExplosion(cx, cy, [0xffd700, 0xff6b35, 0xff4444, 0x4da6ff], 40);
      this.shockwaveRing(cx, cy, 0xffd700, 200);
    });

    // Complete after effects settle
    this.scene.time.delayedCall(800, () => onComplete?.());
  }

  /**
   * Fan announcement: name scales in with golden glow, stacks vertically
   */
  fanAnnouncement(
    fanNames: string[],
    startY: number,
    onComplete?: () => void
  ): void {
    const cx = this.scene.scale.width / 2;
    const spacing = 45;

    fanNames.forEach((name, i) => {
      this.scene.time.delayedCall(i * 500, () => {
        // Glow background
        const glow = this.scene.add.rectangle(cx, startY + i * spacing, 300, 40, 0xffd700, 0.15);
        glow.setDepth(9000);
        glow.setScale(0);

        // Fan name text
        const text = this.scene.add.text(cx, startY + i * spacing, `✦ ${name} ✦`, {
          fontFamily: 'Courier New, monospace',
          fontSize: '22px',
          color: '#ffd700',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3
        }).setOrigin(0.5).setDepth(9001).setScale(0).setAlpha(0);

        // Scale in glow
        this.scene.tweens.add({
          targets: glow,
          scale: 1,
          duration: 300,
          ease: 'Back.Out'
        });

        // Scale in text
        this.scene.tweens.add({
          targets: text,
          scale: 1.1,
          alpha: 1,
          duration: 400,
          ease: 'Back.Out',
          onComplete: () => {
            // Settle
            this.scene.tweens.add({
              targets: text,
              scale: 1,
              duration: 200,
              ease: 'Sine.Out'
            });
          }
        });

        // Auto-fade after delay
        this.scene.time.delayedCall(2500, () => {
          this.scene.tweens.add({
            targets: [glow, text],
            alpha: 0,
            duration: 500,
            onComplete: () => {
              glow.destroy();
              text.destroy();
            }
          });
        });
      });
    });

    // Fire onComplete after all fans shown
    this.scene.time.delayedCall(fanNames.length * 500 + 800, () => onComplete?.());
  }

  /**
   * Score counter: numbers roll up slot-machine style
   */
  scoreRollUp(
    textObject: Phaser.GameObjects.Text,
    fromValue: number,
    toValue: number,
    duration: number = 800,
    onComplete?: () => void
  ): void {
    const valueObj = { value: fromValue };

    this.scene.tweens.add({
      targets: valueObj,
      value: toValue,
      duration,
      ease: 'Power2.Out',
      onUpdate: () => {
        textObject.setText(Math.floor(valueObj.value).toString());
      },
      onComplete: () => {
        textObject.setText(toValue.toString());
        // Pop effect
        this.scene.tweens.add({
          targets: textObject,
          scale: 1.3,
          duration: 100,
          yoyo: true,
          ease: 'Sine.InOut',
          onComplete: () => onComplete?.()
        });
      }
    });
  }

  /**
   * Pihu consolation: smaller, muted animation
   */
  pihuAnimation(x: number, y: number, score: number, onComplete?: () => void): void {
    const text = this.scene.add.text(x, y, `屁胡 +${score}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '24px',
      color: '#999966',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0).setDepth(9000);

    this.scene.tweens.add({
      targets: text,
      alpha: 0.8,
      y: y - 30,
      scale: { from: 0.8, to: 1 },
      duration: 400,
      ease: 'Power2.Out',
      onComplete: () => {
        this.scene.time.delayedCall(1000, () => {
          this.scene.tweens.add({
            targets: text,
            alpha: 0,
            y: y - 60,
            duration: 400,
            onComplete: () => {
              text.destroy();
              onComplete?.();
            }
          });
        });
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
   * 3. RESOURCE EFFECTS
   * ══════════════════════════════════════════════════════════ */

  /**
   * Gold gain: coin particles fly from source to gold counter
   */
  goldGain(
    sourceX: number, sourceY: number,
    targetX: number, targetY: number,
    amount: number,
    onComplete?: () => void
  ): void {
    const particleCount = Math.min(amount, 12);
    let completed = 0;

    for (let i = 0; i < particleCount; i++) {
      const coin = this.scene.add.text(
        sourceX + (Math.random() - 0.5) * 40,
        sourceY + (Math.random() - 0.5) * 40,
        '💰',
        { fontSize: '20px' }
      ).setOrigin(0.5).setDepth(9500);

      this.scene.tweens.add({
        targets: coin,
        x: targetX,
        y: targetY,
        scale: 0.5,
        duration: 400 + i * 50,
        delay: i * 30,
        ease: 'Power2.In',
        onComplete: () => {
          coin.destroy();
          completed++;
          if (completed === particleCount) onComplete?.();
        }
      });
    }
  }

  /**
   * Gold spend: counter shakes with red flash
   */
  goldSpend(target: Phaser.GameObjects.Text): void {
    // Red flash
    const originalColor = target.style.color;
    target.setStyle({ color: '#ff4444' });

    // Shake
    const origX = target.x;
    this.scene.tweens.add({
      targets: target,
      x: origX - 5,
      duration: 40,
      yoyo: true,
      repeat: 4,
      ease: 'Sine.InOut',
      onComplete: () => {
        target.x = origX;
        target.setStyle({ color: originalColor as string });
      }
    });

    // Scale down briefly
    this.scene.tweens.add({
      targets: target,
      scale: 0.9,
      duration: 100,
      yoyo: true,
      ease: 'Power2.Out'
    });
  }

  /* ══════════════════════════════════════════════════════════
   * 4. UI POLISH
   * ══════════════════════════════════════════════════════════ */

  /**
   * Button press feedback: scale down + release
   */
  buttonPress(target: Phaser.GameObjects.GameObject): void {
    this.scene.tweens.add({
      targets: target,
      scale: 0.92,
      duration: 60,
      yoyo: true,
      ease: 'Sine.InOut'
    });
  }

  /**
   * Button hover glow: subtle scale up
   */
  buttonHover(target: Phaser.GameObjects.GameObject, hoverIn: boolean): void {
    this.scene.tweens.add({
      targets: target,
      scale: hoverIn ? 1.08 : 1.0,
      duration: 150,
      ease: 'Power2.Out'
    });
  }

  /**
   * Round start banner: "回合 X" slides in from top, holds, slides out
   */
  roundStartBanner(roundNumber: number, onComplete?: () => void): void {
    const cx = this.scene.scale.width / 2;
    const h = this.scene.scale.height;

    // Banner background
    const bannerBg = this.scene.add.rectangle(cx, -60, 400, 70, 0x000000, 0.85);
    bannerBg.setStrokeStyle(3, 0xffd700);
    bannerBg.setDepth(9900);

    // Banner text
    const bannerText = this.scene.add.text(cx, -60, `回合 ${roundNumber}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '36px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(9901);

    // Slide in
    const targetY = h * 0.2;
    this.scene.tweens.add({
      targets: [bannerBg, bannerText],
      y: targetY,
      duration: 500,
      ease: 'Back.Out',
      onComplete: () => {
        // Hold
        this.scene.time.delayedCall(1200, () => {
          // Slide out
          this.scene.tweens.add({
            targets: [bannerBg, bannerText],
            y: -60,
            alpha: 0,
            duration: 400,
            ease: 'Power2.In',
            onComplete: () => {
              bannerBg.destroy();
              bannerText.destroy();
              onComplete?.();
            }
          });
        });
      }
    });
  }

  /**
   * Round end transition: fade to black
   */
  roundEndTransition(onComplete?: () => void): void {
    this.scene.cameras.main.fadeOut(600, 0, 0, 0);
    this.scene.time.delayedCall(600, () => onComplete?.());
  }

  /* ══════════════════════════════════════════════════════════
   * 5. AMBIENT EFFECTS
   * ══════════════════════════════════════════════════════════ */

  /**
   * Background: floating particles (subtle, continuous)
   */
  startAmbientParticles(color: number = 0xffd700, count: number = 15): void {
    this.stopAmbientParticles();

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    for (let i = 0; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = 1 + Math.random() * 2;

      const p = this.scene.add.graphics();
      p.fillStyle(color, 0.15 + Math.random() * 0.1);
      p.fillCircle(0, 0, size);
      p.setPosition(x, y);
      p.setDepth(0);

      this.ambientParticles.push(p);

      // Float upward slowly
      this.scene.tweens.add({
        targets: p,
        y: y - 100 - Math.random() * 200,
        x: x + (Math.random() - 0.5) * 100,
        alpha: 0,
        duration: 5000 + Math.random() * 5000,
        delay: Math.random() * 3000,
        repeat: -1,
        onRepeat: () => {
          p.setPosition(Math.random() * w, h + 20);
          p.setAlpha(0.15 + Math.random() * 0.1);
        }
      });
    }
  }

  stopAmbientParticles(): void {
    this.ambientParticles.forEach(p => {
      this.scene.tweens.killTweensOf(p);
      p.destroy();
    });
    this.ambientParticles = [];
  }

  /**
   * Draw pile wobble: slight wobble when tiles remain
   */
  drawPileWobble(target: Phaser.GameObjects.GameObject): void {
    this.scene.tweens.add({
      targets: target,
      angle: { from: -1, to: 1 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }

  /**
   * Draw pile shake: urgent shake when low (<5 tiles)
   */
  drawPileLowShake(target: Phaser.GameObjects.GameObject): void {
    this.scene.tweens.killTweensOf(target);

    this.scene.tweens.add({
      targets: target,
      angle: { from: -3, to: 3 },
      duration: 150,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }

  /* ══════════════════════════════════════════════════════════
   * 6. BALATRO-STYLE SCORING POPUP
   * ══════════════════════════════════════════════════════════ */

  /**
   * Score breakdown: each multiplier step shows as floating number
   * that combines visually (×2 → ×3 → final score flies to total)
   */
  scoreBreakdownSequence(
    steps: { label: string; value: number; type: 'chips' | 'mult' | 'bonus' }[],
    finalScore: number,
    targetScoreObj: Phaser.GameObjects.Text,
    onComplete?: () => void
  ): void {
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;

    steps.forEach((step, i) => {
      this.scene.time.delayedCall(i * 600, () => {
        const color = step.type === 'chips' ? '#4da6ff'
          : step.type === 'mult' ? '#ff6b6b'
          : '#ffd700';

        const text = this.scene.add.text(cx, cy - 40, `${step.label} ${step.value}`, {
          fontFamily: 'Courier New, monospace',
          fontSize: '28px',
          color,
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4
        }).setOrigin(0.5).setDepth(9100).setScale(0).setAlpha(0);

        // Pop in
        this.scene.tweens.add({
          targets: text,
          scale: 1.2,
          alpha: 1,
          duration: 250,
          ease: 'Back.Out',
          onComplete: () => {
            // Settle
            this.scene.tweens.add({
              targets: text,
              scale: 1,
              duration: 150,
              ease: 'Sine.Out'
            });

            // Fade out
            this.scene.time.delayedCall(400, () => {
              this.scene.tweens.add({
                targets: text,
                alpha: 0,
                y: cy - 80,
                duration: 300,
                onComplete: () => text.destroy()
              });
            });
          }
        });
      });
    });

    // Final score flies to total
    const totalDelay = steps.length * 600 + 200;
    this.scene.time.delayedCall(totalDelay, () => {
      const finalText = this.scene.add.text(cx, cy, `${finalScore}`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '48px',
        color: '#ffd700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5
      }).setOrigin(0.5).setDepth(9200).setScale(0);

      this.scene.tweens.add({
        targets: finalText,
        scale: 1.5,
        duration: 300,
        ease: 'Back.Out',
        onComplete: () => {
          // Flash
          this.particleExplosion(cx, cy, [0xffd700], 15);

          this.scene.time.delayedCall(500, () => {
            // Fly to score counter
            this.scene.tweens.add({
              targets: finalText,
              x: targetScoreObj.x,
              y: targetScoreObj.y,
              scale: 0.3,
              alpha: 0,
              duration: 500,
              ease: 'Power2.In',
              onComplete: () => {
                finalText.destroy();
                // Bump the score counter
                this.scene.tweens.add({
                  targets: targetScoreObj,
                  scale: 1.3,
                  duration: 100,
                  yoyo: true,
                  ease: 'Sine.InOut'
                });
                onComplete?.();
              }
            });
          });
        }
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
   * HELPER UTILITIES
   * ══════════════════════════════════════════════════════════ */

  /**
   * Particle explosion from a point
   */
  particleExplosion(
    x: number, y: number,
    colors: number[],
    count: number = 20
  ): void {
    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 2 + Math.random() * 4;
      const particle = this.scene.add.circle(x, y, size, color);
      particle.setDepth(9500);
      particle.setAlpha(0.9);

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const dist = 60 + Math.random() * 100;

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0,
        duration: 500 + Math.random() * 300,
        ease: 'Power2.Out',
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Shockwave ring effect
   */
  shockwaveRing(x: number, y: number, color: number, maxRadius: number = 150): void {
    const ring = this.scene.add.circle(x, y, 10);
    ring.setStrokeStyle(3, color, 0.8);
    ring.setDepth(9400);

    this.scene.tweens.add({
      targets: ring,
      scale: maxRadius / 10,
      alpha: 0,
      duration: 600,
      ease: 'Power2.Out',
      onComplete: () => ring.destroy()
    });
  }

  /**
   * Text float-up: creates temporary text that floats up and fades
   */
  floatText(
    x: number, y: number,
    text: string,
    color: string = '#ffffff',
    fontSize: string = '20px',
    duration: number = 1500
  ): Phaser.GameObjects.Text {
    const textObj = this.scene.add.text(x, y, text, {
      fontFamily: 'Courier New, monospace',
      fontSize,
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(9000).setAlpha(0);

    this.scene.tweens.add({
      targets: textObj,
      alpha: 1,
      y: y - 40,
      duration: 300,
      ease: 'Power2.Out'
    });

    this.scene.time.delayedCall(duration - 500, () => {
      this.scene.tweens.add({
        targets: textObj,
        alpha: 0,
        y: y - 80,
        duration: 500,
        onComplete: () => textObj.destroy()
      });
    });

    return textObj;
  }
}
