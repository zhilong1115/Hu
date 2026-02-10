/**
 * BondStatusUI - Displays active bond levels and their effects
 * 
 * Shows a compact panel with:
 * - 4 bond icons (🎲👁️💰🔄)
 * - Current level for each (0/1/2/3)
 * - Visual indicator when bonds are active
 */

import Phaser from 'phaser';
import { GodTileManager, BondStatus } from '../core/GodTileManager';
import { GodTileBond, BOND_INFO, BOND_LEVELS } from '../data/godTiles';

interface BondUIElement {
  container: Phaser.GameObjects.Container;
  icon: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  progressBar: Phaser.GameObjects.Graphics;
  background: Phaser.GameObjects.Rectangle;
}

export class BondStatusUI extends Phaser.GameObjects.Container {
  private bondElements: Map<GodTileBond, BondUIElement> = new Map();
  private godTileManager: GodTileManager;
  private tooltip: Phaser.GameObjects.Container | null = null;
  
  private readonly BOND_SIZE = 96;
  private readonly BOND_GAP = 12;
  private readonly PANEL_PADDING = 10;
  
  // Bond order for display
  private readonly BOND_ORDER: GodTileBond[] = [
    GodTileBond.GAMBLE,
    GodTileBond.VISION,
    GodTileBond.WEALTH,
    GodTileBond.TRANSFORM
  ];
  
  // Level colors
  private readonly LEVEL_COLORS = {
    0: 0x555555,  // Inactive - gray
    1: 0x4CAF50,  // Level 1 - green
    2: 0x2196F3,  // Level 2 - blue
    3: 0xFFD700,  // Level 3 - gold
  };
  
  constructor(scene: Phaser.Scene, x: number, y: number, godTileManager: GodTileManager) {
    super(scene, x, y);
    this.godTileManager = godTileManager;
    
    scene.add.existing(this);
    
    this.createUI();
    this.updateDisplay();
  }
  
  private createUI(): void {
    // Create panel background
    const totalWidth = this.BOND_ORDER.length * this.BOND_SIZE + 
                      (this.BOND_ORDER.length - 1) * this.BOND_GAP + 
                      this.PANEL_PADDING * 2;
    const totalHeight = this.BOND_SIZE + this.PANEL_PADDING * 2 + 20; // Extra for level text
    
    const panelBg = this.scene.add.rectangle(
      totalWidth / 2 - this.PANEL_PADDING,
      totalHeight / 2 - this.PANEL_PADDING,
      totalWidth,
      totalHeight,
      0x1a1a2e,
      0.9
    );
    panelBg.setStrokeStyle(1, 0x444466);
    this.add(panelBg);
    
    // Title
    const title = this.scene.add.text(
      totalWidth / 2 - this.PANEL_PADDING,
      -5,
      '羁绊',
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '48px',
        color: '#888888'
      }
    ).setOrigin(0.5, 1);
    this.add(title);
    
    // Create bond elements
    this.BOND_ORDER.forEach((bond, index) => {
      const element = this.createBondElement(bond, index);
      this.bondElements.set(bond, element);
    });
  }
  
  private createBondElement(bond: GodTileBond, index: number): BondUIElement {
    const x = index * (this.BOND_SIZE + this.BOND_GAP);
    const y = 0;
    
    // Container for this bond
    const container = this.scene.add.container(x, y);
    this.add(container);
    
    // Background circle
    const background = this.scene.add.rectangle(
      this.BOND_SIZE / 2,
      this.BOND_SIZE / 2,
      this.BOND_SIZE - 4,
      this.BOND_SIZE - 4,
      0x333344,
      1
    );
    background.setStrokeStyle(2, 0x555555);
    container.add(background);
    
    // Progress bar (ring around the icon)
    const progressBar = this.scene.add.graphics();
    container.add(progressBar);
    
    // Icon
    const bondInfo = BOND_INFO[bond];
    const icon = this.scene.add.text(
      this.BOND_SIZE / 2,
      this.BOND_SIZE / 2 - 2,
      bondInfo.icon,
      {
        fontSize: '48px'
      }
    ).setOrigin(0.5);
    container.add(icon);
    
    // Level text (below icon)
    const levelText = this.scene.add.text(
      this.BOND_SIZE / 2,
      this.BOND_SIZE + 5,
      '0/2',
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
        color: '#888888'
      }
    ).setOrigin(0.5, 0);
    container.add(levelText);
    
    // Make interactive for tooltips
    background.setInteractive({ useHandCursor: true });
    
    background.on('pointerover', () => {
      this.showTooltip(bond, x + this.BOND_SIZE / 2, y + this.BOND_SIZE + 25);
    });
    
    background.on('pointerout', () => {
      this.hideTooltip();
    });
    
    return { container, icon, levelText, progressBar, background };
  }
  
  /**
   * Update the display based on current GodTileManager state
   */
  public updateDisplay(): void {
    for (const [bond, element] of this.bondElements) {
      const status = this.godTileManager.getBondStatus(bond);
      this.updateBondElement(bond, element, status);
    }
  }
  
  private updateBondElement(bond: GodTileBond, element: BondUIElement, status: BondStatus): void {
    const { level, ownedCount } = status;
    const levels = BOND_LEVELS[bond];
    
    // Determine next threshold
    let nextThreshold = levels[0]?.required ?? 2;
    for (const lvl of levels) {
      if (ownedCount < lvl.required) {
        nextThreshold = lvl.required;
        break;
      }
      nextThreshold = lvl.required;
    }
    
    // Update level text
    element.levelText.setText(`${ownedCount}/${nextThreshold}`);
    
    // Update colors based on level
    const levelColor = this.LEVEL_COLORS[level as keyof typeof this.LEVEL_COLORS] ?? this.LEVEL_COLORS[0];
    element.background.setStrokeStyle(2, levelColor);
    element.levelText.setColor(level > 0 ? '#ffffff' : '#888888');
    
    // Update progress bar
    this.drawProgressRing(element.progressBar, status, bond);
    
    // Add glow effect for active bonds
    if (level > 0) {
      element.icon.setAlpha(1);
      element.background.setFillStyle(0x333344 + (level * 0x111111));
    } else {
      element.icon.setAlpha(0.5);
      element.background.setFillStyle(0x222233);
    }
  }
  
  private drawProgressRing(graphics: Phaser.GameObjects.Graphics, status: BondStatus, bond: GodTileBond): void {
    graphics.clear();
    
    const centerX = this.BOND_SIZE / 2;
    const centerY = this.BOND_SIZE / 2;
    const radius = (this.BOND_SIZE - 8) / 2;
    const levels = BOND_LEVELS[bond];
    
    // Draw level segments
    const totalSegments = 6; // Max tiles per bond
    const segmentAngle = (Math.PI * 2) / totalSegments;
    const startAngle = -Math.PI / 2; // Start from top
    
    for (let i = 0; i < totalSegments; i++) {
      const angle = startAngle + i * segmentAngle;
      const endAngle = angle + segmentAngle - 0.1; // Small gap between segments
      
      let color = 0x333333; // Unfilled
      
      if (i < status.ownedCount) {
        // Determine color based on which level this segment contributes to
        if (i < (levels[0]?.required ?? 2)) {
          color = status.level >= 1 ? this.LEVEL_COLORS[1] : 0x4CAF50 - 0x333333;
        } else if (i < (levels[1]?.required ?? 4)) {
          color = status.level >= 2 ? this.LEVEL_COLORS[2] : 0x2196F3 - 0x333333;
        } else {
          color = status.level >= 3 ? this.LEVEL_COLORS[3] : 0xFFD700 - 0x333333;
        }
      }
      
      graphics.lineStyle(3, color, 1);
      graphics.beginPath();
      graphics.arc(centerX, centerY, radius, angle, endAngle);
      graphics.strokePath();
    }
  }
  
  private showTooltip(bond: GodTileBond, x: number, y: number): void {
    this.hideTooltip();
    
    const status = this.godTileManager.getBondStatus(bond);
    const bondInfo = BOND_INFO[bond];
    const levels = BOND_LEVELS[bond];
    
    // Create tooltip container
    this.tooltip = this.scene.add.container(x, y);
    this.add(this.tooltip);
    
    // Build tooltip text
    let tooltipLines = [
      `${bondInfo.icon} ${bondInfo.name}羁绊`,
      `${bondInfo.description}`,
      `────────────`,
    ];
    
    // Add level effects
    for (const lvl of levels) {
      const isActive = status.ownedCount >= lvl.required;
      const prefix = isActive ? '✓' : '○';
      const colorTag = isActive ? '[active]' : '';
      tooltipLines.push(`${prefix} Lv${lvl.level} (${lvl.required}张): ${lvl.effect}`);
    }
    
    // Add owned god tiles for this bond
    const ownedTiles = this.godTileManager.getOwnedByBond(bond);
    if (ownedTiles.length > 0) {
      tooltipLines.push(`────────────`);
      tooltipLines.push(`拥有的神牌:`);
      for (const tile of ownedTiles) {
        const rarityIcon = tile.rarity === 'green' ? '🟢' : tile.rarity === 'blue' ? '🔵' : tile.rarity === 'purple' ? '🟣' : '🟠';
        tooltipLines.push(`${rarityIcon} ${tile.name}`);
      }
    }
    
    // Add current status
    tooltipLines.push(`────────────`);
    tooltipLines.push(`当前: ${status.ownedCount}张 / Lv${status.level}`);
    if (status.levelName !== '无') {
      tooltipLines.push(`称号: ${status.levelName}`);
    }
    
    // Calculate tooltip size
    const lineHeight = 16;
    const padding = 10;
    const maxWidth = 250;
    const tooltipHeight = tooltipLines.length * lineHeight + padding * 2;
    
    // Background
    const bg = this.scene.add.rectangle(
      0, tooltipHeight / 2,
      maxWidth,
      tooltipHeight,
      0x1a1a2e,
      0.95
    );
    bg.setStrokeStyle(1, 0x666688);
    this.tooltip.add(bg);
    
    // Text lines
    tooltipLines.forEach((line, index) => {
      const isActive = line.startsWith('✓');
      const text = this.scene.add.text(
        -maxWidth / 2 + padding,
        padding + index * lineHeight,
        line,
        {
          fontFamily: 'Courier New, monospace',
          fontSize: '22px',
          color: isActive ? '#00ff00' : (line.startsWith('○') ? '#888888' : '#ffffff'),
          wordWrap: { width: maxWidth - padding * 2 }
        }
      );
      this.tooltip!.add(text);
    });
    
    // Adjust position to stay on screen
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    const worldPos = this.getWorldTransformMatrix();
    
    if (worldPos.tx + x + maxWidth / 2 > screenWidth) {
      this.tooltip.x = x - maxWidth / 2 - 20;
    }
    if (worldPos.ty + y + tooltipHeight > screenHeight) {
      this.tooltip.y = y - tooltipHeight - 60;
    }
  }
  
  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
  }
  
  /**
   * Set a new GodTileManager and refresh the display
   */
  public setGodTileManager(manager: GodTileManager): void {
    this.godTileManager = manager;
    this.updateDisplay();
  }
  
  /**
   * Animate a level-up effect for a specific bond
   */
  public animateLevelUp(bond: GodTileBond): void {
    const element = this.bondElements.get(bond);
    if (!element) return;
    
    // Flash and scale animation
    this.scene.tweens.add({
      targets: element.icon,
      scale: { from: 1, to: 1.5 },
      alpha: { from: 1, to: 0.8 },
      duration: 200,
      yoyo: true,
      ease: 'Back.Out'
    });
    
    // Glow effect on background
    const originalColor = element.background.fillColor;
    this.scene.tweens.addCounter({
      from: 0,
      to: 255,
      duration: 500,
      onUpdate: (tween) => {
        const value = Math.floor(tween.getValue() ?? 0);
        element.background.setFillStyle(0xFFFF00 - (value << 8), 1);
      },
      onComplete: () => {
        this.updateDisplay();
      }
    });
  }
  
  /**
   * Highlight bonds that would activate with the next god tile addition
   */
  public highlightPotentialLevelUps(): void {
    for (const [bond, element] of this.bondElements) {
      const status = this.godTileManager.getBondStatus(bond);
      const levels = BOND_LEVELS[bond];
      
      // Check if adding one more would level up
      for (const lvl of levels) {
        if (status.ownedCount + 1 === lvl.required) {
          // Pulse animation
          this.scene.tweens.add({
            targets: element.background,
            alpha: { from: 1, to: 0.6 },
            duration: 500,
            yoyo: true,
            repeat: -1
          });
          break;
        }
      }
    }
  }
  
  /**
   * Stop all highlight animations
   */
  public clearHighlights(): void {
    for (const [_, element] of this.bondElements) {
      this.scene.tweens.killTweensOf(element.background);
      element.background.setAlpha(1);
    }
  }
}
