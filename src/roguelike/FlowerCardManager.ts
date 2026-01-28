import { FlowerCard, FlowerCardEffectContext } from './FlowerCard';
import { Hand } from '../core/Hand';
import { Tile } from '../core/Tile';

/**
 * FlowerCardManager — Manages flower card inventory and usage
 *
 * Handles:
 * - Flower card inventory (max 3 cards)
 * - Card usage with proper context
 * - Buff/debuff tracking
 * - Card acquisition and removal
 */
export class FlowerCardManager {
  private inventory: FlowerCard[] = [];
  private readonly maxCards: number = 3;

  // Persistent buffs/debuffs that carry through rounds
  private damageReduction: number = 0;
  private nextAttackImmune: boolean = false;
  private bonusFan: number = 0;
  private fanMultiplier: number = 1.0;
  private debuffs: string[] = [];
  private nextGodTileFree: boolean = false;

  constructor() {}

  /**
   * Add a flower card to inventory
   */
  public addCard(card: FlowerCard): boolean {
    if (this.inventory.length >= this.maxCards) {
      return false;
    }

    this.inventory.push(card);
    return true;
  }

  /**
   * Remove a flower card from inventory
   */
  public removeCard(card: FlowerCard): boolean {
    const index = this.inventory.findIndex(c => c.name === card.name);
    if (index !== -1) {
      this.inventory.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all cards in inventory
   */
  public getCards(): FlowerCard[] {
    return [...this.inventory];
  }

  /**
   * Get card count
   */
  public getCardCount(): number {
    return this.inventory.length;
  }

  /**
   * Check if inventory is full
   */
  public isFull(): boolean {
    return this.inventory.length >= this.maxCards;
  }

  /**
   * Use a flower card
   */
  public async useCard(
    card: FlowerCard,
    gameContext: {
      hand: Hand;
      selectedTiles: Tile[];
      drawPile: Tile[];
      discardPile: Tile[];
      handsRemaining: number;
      discardsRemaining: number;
      currentScore: number;
      targetScore: number;
      redrawHand?: () => void;
      clearDebuffs?: () => void;
      drawFromOptions?: (options: Tile[]) => Promise<Tile>;
    }
  ): Promise<{ success: boolean; context: FlowerCardEffectContext }> {
    // Check if card can be played
    const context = this.buildEffectContext(gameContext);

    if (!card.canPlay(context)) {
      return { success: false, context };
    }

    // Apply card effects
    await card.play(context);

    // Remove card from inventory after use
    this.removeCard(card);

    return { success: true, context };
  }

  /**
   * Build effect context for card usage
   */
  private buildEffectContext(gameContext: {
    hand: Hand;
    selectedTiles: Tile[];
    drawPile: Tile[];
    discardPile: Tile[];
    handsRemaining: number;
    discardsRemaining: number;
    currentScore: number;
    targetScore: number;
    redrawHand?: () => void;
    clearDebuffs?: () => void;
    drawFromOptions?: (options: Tile[]) => Promise<Tile>;
  }): FlowerCardEffectContext {
    return {
      hand: gameContext.hand,
      selectedTiles: gameContext.selectedTiles,
      drawPile: gameContext.drawPile,
      discardPile: gameContext.discardPile,
      handsRemaining: gameContext.handsRemaining,
      discardsRemaining: gameContext.discardsRemaining,
      currentScore: gameContext.currentScore,
      targetScore: gameContext.targetScore,
      damageReduction: this.damageReduction,
      nextAttackImmune: this.nextAttackImmune,
      bonusFan: this.bonusFan,
      fanMultiplier: this.fanMultiplier,
      debuffs: this.debuffs,
      nextGodTileFree: this.nextGodTileFree,
      redrawHand: gameContext.redrawHand,
      clearDebuffs: gameContext.clearDebuffs,
      drawFromOptions: gameContext.drawFromOptions
    };
  }

  /**
   * Apply buffs to scoring (called during score calculation)
   */
  public applyBuffsToScore(baseFan: number): { fan: number; multiplier: number } {
    let fan = baseFan + this.bonusFan;
    let multiplier = this.fanMultiplier;

    // Reset one-time bonuses after use
    this.bonusFan = 0;
    this.fanMultiplier = 1.0;

    return { fan, multiplier };
  }

  /**
   * Calculate damage reduction for boss attacks
   */
  public calculateDamageReduction(incomingDamage: number): number {
    if (this.nextAttackImmune) {
      this.nextAttackImmune = false;
      return 0; // No damage taken
    }

    const reducedDamage = Math.max(0, incomingDamage - this.damageReduction);
    return reducedDamage;
  }

  /**
   * Clear all debuffs
   */
  public clearDebuffs(): void {
    this.debuffs = [];
  }

  /**
   * Add a debuff
   */
  public addDebuff(debuff: string): void {
    if (!this.debuffs.includes(debuff)) {
      this.debuffs.push(debuff);
    }
  }

  /**
   * Get all active debuffs
   */
  public getDebuffs(): string[] {
    return [...this.debuffs];
  }

  /**
   * Check if next God Tile is free
   */
  public isNextGodTileFree(): boolean {
    return this.nextGodTileFree;
  }

  /**
   * Consume the free God Tile buff
   */
  public consumeFreeGodTile(): void {
    this.nextGodTileFree = false;
  }

  /**
   * Get damage reduction value
   */
  public getDamageReduction(): number {
    return this.damageReduction;
  }

  /**
   * Check if immune to next attack
   */
  public isImmuneToNextAttack(): boolean {
    return this.nextAttackImmune;
  }

  /**
   * Get bonus fan
   */
  public getBonusFan(): number {
    return this.bonusFan;
  }

  /**
   * Get fan multiplier
   */
  public getFanMultiplier(): number {
    return this.fanMultiplier;
  }

  /**
   * Reset buffs for new round (keep persistent ones)
   */
  public resetRoundBuffs(): void {
    // Damage reduction is typically per-round
    this.damageReduction = 0;
    // Keep other buffs that may persist
  }

  /**
   * Serialize state for saving
   */
  public serialize(): any {
    return {
      inventory: this.inventory.map(card => ({
        type: card.type,
        name: card.name,
        description: card.description,
        cost: card.cost,
        rarity: card.rarity
      })),
      damageReduction: this.damageReduction,
      nextAttackImmune: this.nextAttackImmune,
      bonusFan: this.bonusFan,
      fanMultiplier: this.fanMultiplier,
      debuffs: this.debuffs,
      nextGodTileFree: this.nextGodTileFree
    };
  }

  /**
   * Deserialize state from save
   */
  public static deserialize(data: any, allFlowerCards: FlowerCard[]): FlowerCardManager {
    const manager = new FlowerCardManager();

    // Restore inventory
    if (data.inventory) {
      data.inventory.forEach((cardData: any) => {
        const card = allFlowerCards.find(c => c.name === cardData.name);
        if (card) {
          manager.addCard(card);
        }
      });
    }

    // Restore buffs/debuffs
    manager.damageReduction = data.damageReduction || 0;
    manager.nextAttackImmune = data.nextAttackImmune || false;
    manager.bonusFan = data.bonusFan || 0;
    manager.fanMultiplier = data.fanMultiplier || 1.0;
    manager.debuffs = data.debuffs || [];
    manager.nextGodTileFree = data.nextGodTileFree || false;

    return manager;
  }
}
