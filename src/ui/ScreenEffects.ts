import Phaser from 'phaser';

/**
 * ScreenEffects — Utility class for screen-wide visual effects
 *
 * Provides reusable effects like screen shake, flash, and particles
 * Designed to be mobile-performant using Phaser tweens
 */
export class ScreenEffects {
  /**
   * Screen shake effect (subtle camera shake)
   */
  public static shake(
    scene: Phaser.Scene,
    intensity: number = 5,
    duration: number = 300
  ): void {
    scene.cameras.main.shake(duration, intensity / 1000);
  }

  /**
   * Intense screen shake for big moments
   */
  public static shakeIntense(scene: Phaser.Scene): void {
    scene.cameras.main.shake(500, 0.01);
  }

  /**
   * Screen flash effect
   */
  public static flash(
    scene: Phaser.Scene,
    color: number = 0xffffff,
    duration: number = 100
  ): void {
    const flash = scene.add.rectangle(
      scene.scale.width / 2,
      scene.scale.height / 2,
      scene.scale.width,
      scene.scale.height,
      color,
      0.5
    );
    flash.setDepth(9999);

    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: duration,
      ease: 'Power2.Out',
      onComplete: () => {
        flash.destroy();
      }
    });
  }

  /**
   * Create explosion particles at a position
   */
  public static explosion(
    scene: Phaser.Scene,
    x: number,
    y: number,
    color: number = 0xffd700,
    particleCount: number = 20
  ): void {
    for (let i = 0; i < particleCount; i++) {
      const particle = scene.add.circle(x, y, 4, color);
      particle.setAlpha(1);
      particle.setDepth(1000);

      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const speed = 100 + Math.random() * 100;
      const distance = speed * 0.8;

      scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration: 600 + Math.random() * 300,
        ease: 'Power2.Out',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  /**
   * Create confetti particles across the screen (for big wins)
   */
  public static confetti(scene: Phaser.Scene, particleCount: number = 50): void {
    const colors = [0xffd700, 0xff6b6b, 0x4da6ff, 0x6bff6b, 0xff6bff];
    const width = scene.scale.width;
    const height = scene.scale.height;

    for (let i = 0; i < particleCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const x = Math.random() * width;
      const y = -20 - Math.random() * 100;

      const particle = scene.add.rectangle(x, y, 8, 8, color);
      particle.setDepth(1000);
      particle.setRotation(Math.random() * Math.PI * 2);

      const fallDistance = height + 100;
      const fallDuration = 2000 + Math.random() * 1000;
      const horizontalDrift = (Math.random() - 0.5) * 200;

      scene.tweens.add({
        targets: particle,
        y: y + fallDistance,
        x: x + horizontalDrift,
        rotation: particle.rotation + Math.PI * 4 * (Math.random() > 0.5 ? 1 : -1),
        alpha: 0,
        duration: fallDuration,
        ease: 'Quad.In',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  /**
   * Pulse effect on a game object
   */
  public static pulse(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    scale: number = 1.2,
    duration: number = 200
  ): void {
    scene.tweens.add({
      targets: target,
      scale: scale,
      duration: duration,
      yoyo: true,
      ease: 'Sine.InOut'
    });
  }

  /**
   * Bounce effect on a game object
   */
  public static bounce(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    height: number = 20,
    duration: number = 300
  ): void {
    const originalY = (target as any).y;
    scene.tweens.add({
      targets: target,
      y: originalY - height,
      duration: duration / 2,
      ease: 'Quad.Out',
      yoyo: true
    });
  }

  /**
   * Zoom effect on camera
   */
  public static zoom(
    scene: Phaser.Scene,
    zoomLevel: number = 1.1,
    duration: number = 200
  ): void {
    const camera = scene.cameras.main;
    const originalZoom = camera.zoom;

    scene.tweens.add({
      targets: camera,
      zoom: zoomLevel,
      duration: duration / 2,
      ease: 'Sine.Out',
      yoyo: true,
      onComplete: () => {
        camera.setZoom(originalZoom);
      }
    });
  }

  /**
   * Create a shockwave ring effect
   */
  public static shockwave(
    scene: Phaser.Scene,
    x: number,
    y: number,
    color: number = 0xffffff,
    maxRadius: number = 150
  ): void {
    const ring = scene.add.circle(x, y, 10);
    ring.setStrokeStyle(3, color, 1);
    ring.setDepth(999);

    scene.tweens.add({
      targets: ring,
      scale: maxRadius / 10,
      alpha: 0,
      duration: 600,
      ease: 'Power2.Out',
      onComplete: () => {
        ring.destroy();
      }
    });
  }

  /**
   * Slow motion effect (time scale)
   */
  public static slowMotion(
    scene: Phaser.Scene,
    timeScale: number = 0.5,
    duration: number = 500
  ): void {
    scene.time.timeScale = timeScale;

    scene.time.delayedCall(duration, () => {
      scene.tweens.add({
        targets: scene.time,
        timeScale: 1,
        duration: 200,
        ease: 'Power2.Out'
      });
    });
  }

  /**
   * Ripple effect from a point
   */
  public static ripple(
    scene: Phaser.Scene,
    x: number,
    y: number,
    count: number = 3,
    color: number = 0x4da6ff
  ): void {
    for (let i = 0; i < count; i++) {
      scene.time.delayedCall(i * 150, () => {
        const ring = scene.add.circle(x, y, 5);
        ring.setStrokeStyle(2, color, 0.6);
        ring.setDepth(998);

        scene.tweens.add({
          targets: ring,
          scale: 15,
          alpha: 0,
          duration: 800,
          ease: 'Power2.Out',
          onComplete: () => {
            ring.destroy();
          }
        });
      });
    }
  }
}
