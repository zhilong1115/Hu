import Phaser from 'phaser';
import { FlowerCard } from '../roguelike/FlowerCard';

/**
 * FlowerCardDisplay — Visual display for held Flower Cards
 *
 * Shows Flower Cards in a horizontal row below the hand
 * - Click to select/use a card
 * - Tooltips on hover showing effects
 * - Visual animations when cards are used
 * - Flower type emoji indicators
 */
export class FlowerCardDisplay extends Phaser.GameObjects.Container {
  private flowerCards: FlowerCard[] = [];
  private selectedCard: FlowerCard | null = null;

  // Visual elements
  private cardContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private tooltipText: Phaser.GameObjects.Text | null = null;
  private tooltipBg: Phaser.GameObjects.Rectangle | null = null;

  // Drag state
  private draggingCard: FlowerCard | null = null;
  private draggingContainer: Phaser.GameObjects.Container | null = null;
  private dragStartPos: { x: number; y: number } = { x: 0, y: 0 };
  private dragOriginalPos: { x: number; y: number } = { x: 0, y: 0 };
  private readonly DRAG_THRESHOLD = 60; // pixels past bottom edge to trigger use

  // Layout constants (compact for landscape top-center placement)
  private readonly CARD_WIDTH = 56;
  private readonly CARD_HEIGHT = 78;
  private readonly CARD_SPACING = 6;
  private readonly MAX_VISIBLE_CARDS = 12; // display limit, no gameplay limit

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
  }

  /**
   * Set the Flower Cards to display
   */
  public setFlowerCards(cards: FlowerCard[]): void {
    this.flowerCards = [...cards]; // no upper limit
    this.updateDisplay();
  }

  /**
   * Get the currently selected flower card
   */
  public getSelectedCard(): FlowerCard | null {
    return this.selectedCard;
  }

  /**
   * Clear selection
   */
  public clearSelection(): void {
    this.selectedCard = null;
    this.updateDisplay();
  }

  /**
   * Update the visual display
   */
  public updateDisplay(): void {
    // Clear existing cards
    this.cardContainers.forEach(container => container.destroy());
    this.cardContainers.clear();
    this.removeAll(true);

    if (this.flowerCards.length === 0) {
      // Show empty slots
      this.createEmptySlots();
      return;
    }

    // Calculate layout
    const totalWidth = this.flowerCards.length * (this.CARD_WIDTH + this.CARD_SPACING) - this.CARD_SPACING;
    const startX = -totalWidth / 2;

    // Create card containers
    this.flowerCards.forEach((card, index) => {
      const x = startX + index * (this.CARD_WIDTH + this.CARD_SPACING) + this.CARD_WIDTH / 2;
      const cardContainer = this.createCardSprite(card, x, 0);
      this.cardContainers.set(card.name, cardContainer);
      this.add(cardContainer);
    });

    // Fill remaining visible slots with empty placeholders
    const emptySlots = Math.max(0, 4 - this.flowerCards.length); // show at least 4 slots
    for (let i = 0; i < emptySlots; i++) {
      const idx = this.flowerCards.length + i;
      const x = startX + idx * (this.CARD_WIDTH + this.CARD_SPACING) + this.CARD_WIDTH / 2;
      const emptySlot = this.createEmptySlot(x, 0);
      this.add(emptySlot);
    }
  }

  /**
   * Create empty slots when no cards are held
   */
  private createEmptySlots(): void {
    const slotCount = 4; // show 4 empty slots when no cards
    const totalWidth = slotCount * (this.CARD_WIDTH + this.CARD_SPACING) - this.CARD_SPACING;
    const startX = -totalWidth / 2;

    for (let i = 0; i < slotCount; i++) {
      const x = startX + i * (this.CARD_WIDTH + this.CARD_SPACING) + this.CARD_WIDTH / 2;
      const emptySlot = this.createEmptySlot(x, 0);
      this.add(emptySlot);
    }
  }

  /**
   * Create an empty slot placeholder
   */
  private createEmptySlot(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    // Dashed border for empty slot
    const bg = this.scene.add.rectangle(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT, 0x000000, 0.3);
    bg.setStrokeStyle(2, 0x555555, 0.5);
    container.add(bg);

    // Empty slot text
    const text = this.scene.add.text(0, 0, '空位', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#666666'
    });
    text.setOrigin(0.5);
    container.add(text);

    return container;
  }

  /**
   * Create a single Flower Card sprite
   */
  private createCardSprite(card: FlowerCard, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const isSelected = this.selectedCard?.name === card.name;

    // Background
    const bgColor = isSelected ? 0x444444 : 0x2a2a2a;
    const bg = this.scene.add.rectangle(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT, bgColor);
    container.add(bg);

    // Rarity border
    const borderColor = this.getRarityColorHex(card.rarity);
    const border = this.scene.add.rectangle(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT);
    border.setStrokeStyle(isSelected ? 4 : 2, borderColor);
    container.add(border);

    // Flower type emoji at top
    const emoji = this.scene.add.text(0, -18, card.getFlowerSymbol(), {
      fontFamily: 'Arial',
      fontSize: '22px'
    });
    emoji.setOrigin(0.5);
    container.add(emoji);

    // Card name
    const nameText = this.scene.add.text(0, 0, card.name, {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#ffffff',
      wordWrap: { width: this.CARD_WIDTH - 6 },
      align: 'center'
    });
    nameText.setOrigin(0.5);
    container.add(nameText);

    // Cost at bottom
    const costText = this.scene.add.text(0, 16, `${card.cost}金`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: '#ffd700'
    });
    costText.setOrigin(0.5);
    container.add(costText);

    // Rarity indicator
    const rarityText = this.scene.add.text(-this.CARD_WIDTH / 2 + 4, -this.CARD_HEIGHT / 2 + 4,
      this.getRarityText(card.rarity), {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: this.getRarityColor(card.rarity)
    });
    rarityText.setOrigin(0);
    container.add(rarityText);

    // Make interactive with drag support
    bg.setInteractive({ useHandCursor: true, draggable: true });
    bg.on('pointerover', () => {
      if (!this.draggingCard) this.showTooltip(card, x, y);
    });
    bg.on('pointerout', () => this.hideTooltip());

    // Drag start
    bg.on('dragstart', (_pointer: Phaser.Input.Pointer) => {
      this.hideTooltip();
      this.draggingCard = card;
      this.draggingContainer = container;
      this.dragOriginalPos = { x: container.x, y: container.y };
      this.selectedCard = card;

      // Visual feedback: scale up large so player can read card
      this.scene.tweens.add({
        targets: container,
        scaleX: 2.0,
        scaleY: 2.0,
        duration: 150,
        ease: 'Sine.Out'
      });
      border.setStrokeStyle(4, 0x00ffff);
      container.setDepth(100);
    });

    // Drag move
    bg.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (this.draggingContainer !== container) return;
      // Convert world drag coords to local container coords
      const localX = dragX - this.x;
      const localY = dragY - this.y;
      container.x = localX;
      container.y = localY;
    });

    // Drag end
    bg.on('dragend', (_pointer: Phaser.Input.Pointer) => {
      if (this.draggingContainer !== container) return;

      const dragDeltaY = container.y - this.dragOriginalPos.y;

      // Reset visual
      this.scene.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Sine.Out'
      });
      border.setStrokeStyle(2, borderColor);
      container.setDepth(0);

      if (dragDeltaY > this.DRAG_THRESHOLD) {
        // Dragged far enough down — use the card
        this.draggingCard = null;
        this.draggingContainer = null;
        this.emit('cardDragUsed', card);
      } else {
        // Snap back
        this.scene.tweens.add({
          targets: container,
          x: this.dragOriginalPos.x,
          y: this.dragOriginalPos.y,
          duration: 150,
          ease: 'Back.Out'
        });
        this.draggingCard = null;
        this.draggingContainer = null;
      }
    });

    // Store references for animations
    (container as any)._flowerCardBg = bg;
    (container as any)._flowerCardBorder = border;

    return container;
  }

  /**
   * Handle card click
   */
  private onCardClicked(card: FlowerCard): void {
    if (this.selectedCard?.name === card.name) {
      // Deselect
      this.selectedCard = null;
    } else {
      // Select
      this.selectedCard = card;
    }

    this.updateDisplay();
    this.emit('cardSelected', this.selectedCard);
  }

  /**
   * Remove a card from the display (after use)
   */
  public removeCard(card: FlowerCard): void {
    const index = this.flowerCards.findIndex(c => c.name === card.name);
    if (index !== -1) {
      // Animate card usage
      const container = this.cardContainers.get(card.name);
      if (container) {
        this.animateCardUsage(container, () => {
          this.flowerCards.splice(index, 1);
          this.selectedCard = null;
          this.updateDisplay();
          this.emit('cardUsed', card);
        });
      } else {
        this.flowerCards.splice(index, 1);
        this.selectedCard = null;
        this.updateDisplay();
        this.emit('cardUsed', card);
      }
    }
  }

  /**
   * Add a new card to the display
   */
  public addCard(card: FlowerCard): boolean {
    this.flowerCards.push(card);
    this.updateDisplay();
    return true;
  }

  /**
   * Get number of cards currently held
   */
  public getCardCount(): number {
    return this.flowerCards.length;
  }

  /**
   * Check if inventory is full
   */
  public isFull(): boolean {
    return false; // no upper limit on flower cards
  }

  /**
   * Animate card usage (glow and fade out)
   */
  private animateCardUsage(container: Phaser.GameObjects.Container, onComplete: () => void): void {
    // Glow effect
    this.scene.tweens.add({
      targets: container,
      scale: 1.2,
      alpha: 0.8,
      duration: 200,
      ease: 'Sine.Out'
    });

    // Fade out and move up
    this.scene.tweens.add({
      targets: container,
      alpha: 0,
      y: container.y - 50,
      scale: 0.5,
      duration: 400,
      delay: 200,
      ease: 'Back.In',
      onComplete: () => {
        onComplete();
      }
    });

    // Particle effect
    this.createUsageParticles(container.x, container.y);
  }

  /**
   * Create particle effect when card is used
   */
  private createUsageParticles(x: number, y: number): void {
    const particles = this.scene.add.particles(this.x + x, this.y + y, 'particle', {
      speed: { min: 100, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      quantity: 12,
      blendMode: 'ADD'
    });

    // Clean up after animation
    this.scene.time.delayedCall(900, () => {
      particles.destroy();
    });
  }

  /**
   * Show tooltip with card information
   */
  private showTooltip(card: FlowerCard, cardX: number, cardY: number): void {
    this.hideTooltip();

    // Build tooltip text
    const lines: string[] = [
      card.name,
      '',
      card.description,
      '',
      ...card.effects.map(e => `${e.name}: ${e.description}`)
    ];

    const tooltipContent = lines.join('\n');

    // Calculate tooltip position (above card)
    const tooltipX = this.x + cardX;
    const tooltipY = this.y + cardY - this.CARD_HEIGHT / 2 - 20;

    // Create text
    const padding = 10;
    const maxWidth = 250;

    this.tooltipText = this.scene.add.text(tooltipX, tooltipY, tooltipContent, {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff',
      wordWrap: { width: maxWidth - padding * 2 }
    });
    this.tooltipText.setOrigin(0.5, 1);

    const bounds = this.tooltipText.getBounds();
    this.tooltipBg = this.scene.add.rectangle(
      tooltipX,
      tooltipY - bounds.height / 2,
      bounds.width + padding * 2,
      bounds.height + padding * 2,
      0x000000,
      0.95
    );
    this.tooltipBg.setStrokeStyle(2, this.getRarityColorHex(card.rarity));

    // Ensure tooltip is on top
    this.tooltipBg.setDepth(1000);
    this.tooltipText.setDepth(1001);
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    if (this.tooltipBg) {
      this.tooltipBg.destroy();
      this.tooltipBg = null;
    }
    if (this.tooltipText) {
      this.tooltipText.destroy();
      this.tooltipText = null;
    }
  }

  /**
   * Get rarity text abbreviation
   */
  private getRarityText(rarity: string): string {
    const rarityMap: Record<string, string> = {
      common: '普',
      rare: '稀',
      epic: '史',
      legendary: '传'
    };
    return rarityMap[rarity] || '?';
  }

  /**
   * Get rarity color string
   */
  private getRarityColor(rarity: string): string {
    const colorMap: Record<string, string> = {
      common: '#ffffff',
      rare: '#00ff00',
      epic: '#8a2be2',
      legendary: '#ffd700'
    };
    return colorMap[rarity] || '#ffffff';
  }

  /**
   * Convert rarity string color to hex number
   */
  private getRarityColorHex(rarity: string): number {
    const colorMap: Record<string, number> = {
      common: 0xffffff,
      rare: 0x00ff00,
      epic: 0x8a2be2,
      legendary: 0xffd700
    };
    return colorMap[rarity] || 0xffffff;
  }

  /**
   * Clean up
   */
  public destroy(fromScene?: boolean): void {
    this.hideTooltip();
    super.destroy(fromScene);
  }
}
