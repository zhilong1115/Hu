/**
 * FlowerCardManager v5.1 — Manages flower card inventory and usage
 * 
 * Key changes from old system:
 * - Two types: ⚡Instant (manual use) and 🎯On-Win (auto on hu)
 * - Cards cost gold to use
 * - Unused cards give +5 gold on win then disappear
 * - On-Win cards settle left→right, reorderable by player
 * - No max card limit (was 3, now unlimited within reason)
 */

import { FlowerCard, FlowerCardEffectContext } from './FlowerCard';
import { FlowerCardDef, FlowerCardTrigger, UNUSED_FLOWER_CARD_GOLD } from '../data/flowerCards';
import { Hand } from '../core/Hand';
import { Tile, TileSuit } from '../core/Tile';

export class FlowerCardManager {
  private inventory: FlowerCard[] = [];

  // Persistent buffs/debuffs that carry through rounds
  private damageReduction: number = 0;
  private nextAttackImmune: boolean = false;
  private bonusFan: number = 0;
  private fanMultiplier: number = 1.0;
  private debuffs: string[] = [];
  private nextGodTileFree: boolean = false;

  // On-Win buff tracking for current round
  private _onWinMultAdd: number = 0;      // Additive mult bonus
  private _onWinMultX: number = 1;        // Multiplicative mult bonus
  private _meldGoldBonus: number = 0;     // Extra gold per meld (竹马之交)
  private _permanentFanBoosts: Map<string, number> = new Map(); // Fan name → permanent boost

  // Pending deck modifications from season cards (applied when draw pile is created)
  private _pendingDeckMods: Array<{ type: string; params: Record<string, any> }> = [];

  constructor() {}

  // ─── Inventory Management ────────────────────────────────────────────────

  public addCard(card: FlowerCard): boolean {
    this.inventory.push(card);
    return true;
  }

  public removeCard(card: FlowerCard): boolean {
    const index = this.inventory.findIndex(c => c.name === card.name && c.defId === card.defId);
    if (index !== -1) {
      this.inventory.splice(index, 1);
      return true;
    }
    return false;
  }

  public getCards(): FlowerCard[] {
    return [...this.inventory];
  }

  public getInstantCards(): FlowerCard[] {
    return this.inventory.filter(c => c.isInstant());
  }

  public getOnWinCards(): FlowerCard[] {
    return this.inventory.filter(c => c.isOnWin());
  }

  public getCardCount(): number {
    return this.inventory.length;
  }

  public isFull(): boolean {
    // No hard limit in v5.1, but UI has practical limits
    return false;
  }

  /** Reorder on-win cards (player can drag to change settlement order) */
  public reorderOnWinCards(newOrder: FlowerCard[]): void {
    const instantCards = this.getInstantCards();
    this.inventory = [...instantCards, ...newOrder];
  }

  // ─── Card Usage ──────────────────────────────────────────────────────────

  /**
   * Use an instant flower card. Returns false if not enough gold.
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
      roundNumber?: number;
      redrawHand?: () => void;
      clearDebuffs?: () => void;
      drawFromOptions?: (options: Tile[]) => Promise<Tile>;
    }
  ): Promise<{ success: boolean; context: FlowerCardEffectContext }> {
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

  // ─── On-Win Settlement ───────────────────────────────────────────────────

  /**
   * Settle all on-win flower cards left→right.
   * Called during hu scoring.
   * Returns { multAdd, multX, goldBonus, descriptions }
   */
  public settleOnWinCards(context: {
    discardsRemaining: number;
    chowCount: number;
    pongCount: number;
    meldCount: number;
    detectedFanNames?: string[];
  }): {
    multAdd: number;
    multX: number;
    goldBonus: number;
    descriptions: string[];
    yulanFanNames?: string[];
  } {
    let multAdd = 0;
    let multX = 1;
    let goldBonus = 0;
    const descriptions: string[] = [];
    let yulanFanNames: string[] | undefined;

    const onWinCards = this.getOnWinCards();

    for (const card of onWinCards) {
      switch (card.defId) {
        case 'orchid_jinlan':
          multAdd += 3;
          descriptions.push(`${card.name}: 倍率+3`);
          break;
        case 'orchid_lanxin':
          multAdd += 5;
          descriptions.push(`${card.name}: 倍率+5`);
          break;
        case 'orchid_langui':
          multX *= 1.5;
          descriptions.push(`${card.name}: 倍率×1.5`);
          break;
        case 'orchid_konggu':
          multX *= 2;
          descriptions.push(`${card.name}: 倍率×2`);
          break;
        case 'orchid_huizhi':
          const bonus = context.discardsRemaining * 2;
          multAdd += bonus;
          descriptions.push(`${card.name}: ${context.discardsRemaining}次弃牌 → 倍率+${bonus}`);
          break;
        case 'orchid_lanting':
          const chowBonus = context.chowCount * 2;
          multAdd += chowBonus;
          descriptions.push(`${card.name}: ${context.chowCount}个顺子 → 倍率+${chowBonus}`);
          break;
        case 'orchid_youlan':
          const pongBonus = context.pongCount * 2;
          multAdd += pongBonus;
          descriptions.push(`${card.name}: ${context.pongCount}个刻子 → 倍率+${pongBonus}`);
          break;
        case 'orchid_yulan':
          // Permanent fan boost — apply to detected fan names
          if (context.detectedFanNames && context.detectedFanNames.length > 0) {
            yulanFanNames = [...context.detectedFanNames];
            for (const fanName of context.detectedFanNames) {
              this.addPermanentFanBoost(fanName, 5);
            }
          }
          descriptions.push(`${card.name}: 胡法基础倍率永久+5`);
          break;
        case 'bamboo_zhuma':
          const meldGold = context.meldCount * 5;
          goldBonus += meldGold;
          descriptions.push(`${card.name}: ${context.meldCount}次出牌 → +${meldGold}金币`);
          break;
        case 'chrys_jucan': {
          // Random multiplier: 50% ×1.5, 35% ×2, 15% ×3
          const roll = Math.random();
          let mult: number;
          if (roll < 0.5) { mult = 1.5; }
          else if (roll < 0.85) { mult = 2; }
          else { mult = 3; }
          multX *= mult;
          descriptions.push(`${card.name}: 随机倍率 ×${mult}`);
          break;
        }
        default:
          break;
      }
    }

    // Remove all on-win cards after settlement
    this.inventory = this.inventory.filter(c => c.isInstant());

    return { multAdd, multX, goldBonus, descriptions, yulanFanNames };
  }

  /**
   * Calculate gold from unused cards on win.
   * Unused = cards that haven't been played this round.
   */
  public getUnusedCardGold(): { gold: number; count: number } {
    const count = this.inventory.length;
    return {
      gold: count * UNUSED_FLOWER_CARD_GOLD,
      count
    };
  }

  /**
   * Clear all cards at end of round (花牌仅当局有效)
   */
  public clearAllCards(): void {
    this.inventory = [];
  }

  // ─── Permanent Fan Boosts ────────────────────────────────────────────────

  public getPermanentFanBoost(fanName: string): number {
    return this._permanentFanBoosts.get(fanName) ?? 0;
  }

  public addPermanentFanBoost(fanName: string, amount: number): void {
    const current = this._permanentFanBoosts.get(fanName) ?? 0;
    this._permanentFanBoosts.set(fanName, current + amount);
  }

  public getAllPermanentFanBoosts(): Map<string, number> {
    return new Map(this._permanentFanBoosts);
  }

  // ─── Pending Deck Modifications ──────────────────────────────────────────

  public addDeckMod(type: string, params: Record<string, any>): void {
    this._pendingDeckMods.push({ type, params });
  }

  public getPendingDeckMods(): Array<{ type: string; params: Record<string, any> }> {
    return [...this._pendingDeckMods];
  }

  public clearDeckMods(): void {
    this._pendingDeckMods = [];
  }

  /** Apply pending deck modifications to a tile array (draw pile). Returns modified array. */
  public applyDeckMods(tiles: Tile[]): Tile[] {
    let result = [...tiles];
    for (const mod of this._pendingDeckMods) {
      switch (mod.type) {
        case 'material_apply': {
          // Apply material to random tiles in the deck
          const { material, maxCount } = mod.params;
          const candidates = result.filter(t => !(t as any).material || (t as any).material === 'none');
          const shuffled = candidates.sort(() => Math.random() - 0.5);
          const toApply = shuffled.slice(0, Math.min(maxCount, shuffled.length));
          for (const tile of toApply) {
            (tile as any).material = material;
          }
          break;
        }
        case 'delete_value': {
          let { value } = mod.params;
          // If no value specified (no player UI yet), pick a random value
          if (value === undefined) {
            const values = [...new Set(result.map(t => t.value))];
            if (values.length > 0) value = values[Math.floor(Math.random() * values.length)];
          }
          if (value !== undefined) {
            result = result.filter(t => t.value !== value);
          }
          break;
        }
        case 'delete_suit': {
          let { suit } = mod.params;
          // If no suit specified, pick a random suit
          if (suit === undefined) {
            const suits = [...new Set(result.map(t => t.suit))];
            if (suits.length > 0) suit = suits[Math.floor(Math.random() * suits.length)];
          }
          if (suit !== undefined) {
            result = result.filter(t => t.suit !== suit);
          }
          break;
        }
        case 'delete_honors': {
          result = result.filter(t => t.suit !== TileSuit.Wind && t.suit !== TileSuit.Dragon);
          break;
        }
        case 'double_terminals': {
          const terminals = result.filter(t => t.value === 1 || t.value === 9);
          result.push(...terminals.map(t => ({ ...t, id: `${t.id}-dup-${Math.random()}` })));
          break;
        }
        case 'double_suit': {
          const { suit } = mod.params;
          const suitTiles = result.filter(t => t.suit === suit);
          result.push(...suitTiles.map(t => ({ ...t, id: `${t.id}-dup-${Math.random()}` })));
          break;
        }
        case 'copy': {
          const { tileId, copies } = mod.params;
          const original = result.find(t => t.suit === tileId.suit && t.value === tileId.value);
          if (original) {
            for (let i = 0; i < copies; i++) {
              result.push({ ...original, id: `${original.id}-copy-${i}-${Math.random()}` });
            }
          }
          break;
        }
        case 'recycle_discards': {
          // This is handled in GameScene directly since we need access to discard pile
          break;
        }
        case 'keep_3_suits': {
          let { removeSuit } = mod.params;
          // If no suit specified, pick a random number suit to remove
          if (removeSuit === undefined) {
            const numberSuits = [TileSuit.Wan, TileSuit.Tiao, TileSuit.Tong];
            removeSuit = numberSuits[Math.floor(Math.random() * numberSuits.length)];
          }
          result = result.filter(t => t.suit !== removeSuit);
          break;
        }
        case 'batch_suit': {
          const { fromValue, toSuit } = mod.params;
          for (const tile of result) {
            if (tile.value === fromValue) {
              (tile as any).suit = toSuit;
            }
          }
          break;
        }
        case 'batch_value_plus': {
          const { suit: batchSuit } = mod.params;
          for (const tile of result) {
            if (tile.suit === batchSuit && tile.value < 9) {
              (tile as any).value = tile.value + 1;
            }
          }
          break;
        }
        // ── Autumn season card effects (tile_change) ──
        case 'value_plus': {
          // Select random tiles, increase their value by delta
          const { maxCount = 3, delta = 1 } = mod.params;
          const candidates = result.filter(t => t.suit !== TileSuit.Wind && t.suit !== TileSuit.Dragon && t.value + delta <= 9);
          const shuffled = candidates.sort(() => Math.random() - 0.5);
          const toChange = shuffled.slice(0, Math.min(maxCount, shuffled.length));
          for (const tile of toChange) {
            (tile as any).value = tile.value + delta;
          }
          break;
        }
        case 'value_minus': {
          const { maxCount = 3, delta = 1 } = mod.params;
          const candidates = result.filter(t => t.suit !== TileSuit.Wind && t.suit !== TileSuit.Dragon && t.value - delta >= 1);
          const shuffled = candidates.sort(() => Math.random() - 0.5);
          const toChange = shuffled.slice(0, Math.min(maxCount, shuffled.length));
          for (const tile of toChange) {
            (tile as any).value = tile.value - delta;
          }
          break;
        }
        case 'value_any': {
          // Change 1 random tile to random same-suit value
          const { maxCount = 1 } = mod.params;
          const candidates = result.filter(t => t.suit !== TileSuit.Wind && t.suit !== TileSuit.Dragon);
          const shuffled = candidates.sort(() => Math.random() - 0.5);
          const toChange = shuffled.slice(0, Math.min(maxCount, shuffled.length));
          for (const tile of toChange) {
            (tile as any).value = Math.floor(Math.random() * 9) + 1;
          }
          break;
        }
        case 'suit_any': {
          // Change 1 random numbered tile to random suit (same value)
          const { maxCount = 1 } = mod.params;
          const numberSuits = [TileSuit.Wan, TileSuit.Tiao, TileSuit.Tong];
          const candidates = result.filter(t => numberSuits.includes(t.suit));
          const shuffled = candidates.sort(() => Math.random() - 0.5);
          const toChange = shuffled.slice(0, Math.min(maxCount, shuffled.length));
          for (const tile of toChange) {
            const otherSuits = numberSuits.filter(s => s !== tile.suit);
            (tile as any).suit = otherSuits[Math.floor(Math.random() * otherSuits.length)];
          }
          break;
        }
        case 'any': {
          // Change 1 random tile to any random tile
          const { maxCount = 1 } = mod.params;
          const numberSuits = [TileSuit.Wan, TileSuit.Tiao, TileSuit.Tong];
          const candidates = result.filter(t => numberSuits.includes(t.suit));
          const shuffled = candidates.sort(() => Math.random() - 0.5);
          const toChange = shuffled.slice(0, Math.min(maxCount, shuffled.length));
          for (const tile of toChange) {
            const newSuit = numberSuits[Math.floor(Math.random() * numberSuits.length)];
            (tile as any).suit = newSuit;
            (tile as any).value = Math.floor(Math.random() * 9) + 1;
          }
          break;
        }
        case 'swap_suit': {
          // Swap suits between 2 random tiles
          const numberSuits = [TileSuit.Wan, TileSuit.Tiao, TileSuit.Tong];
          const candidates = result.filter(t => numberSuits.includes(t.suit));
          if (candidates.length >= 2) {
            const shuffled = candidates.sort(() => Math.random() - 0.5);
            const t1 = shuffled[0], t2 = shuffled[1];
            const tempSuit = t1.suit;
            (t1 as any).suit = t2.suit;
            (t2 as any).suit = tempSuit;
          }
          break;
        }
        case 'swap_value': {
          // Swap values between 2 random tiles
          const numberSuits = [TileSuit.Wan, TileSuit.Tiao, TileSuit.Tong];
          const candidates = result.filter(t => numberSuits.includes(t.suit));
          if (candidates.length >= 2) {
            const shuffled = candidates.sort(() => Math.random() - 0.5);
            const t1 = shuffled[0], t2 = shuffled[1];
            const tempVal = t1.value;
            (t1 as any).value = t2.value;
            (t2 as any).value = tempVal;
          }
          break;
        }
        case 'shuffle_values': {
          // Pick a random suit, shuffle all values of that suit
          const numberSuits = [TileSuit.Wan, TileSuit.Tiao, TileSuit.Tong];
          const targetSuit = numberSuits[Math.floor(Math.random() * numberSuits.length)];
          const suitTiles = result.filter(t => t.suit === targetSuit);
          const values = suitTiles.map(t => t.value);
          // Fisher-Yates shuffle
          for (let i = values.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [values[i], values[j]] = [values[j], values[i]];
          }
          suitTiles.forEach((t, i) => { (t as any).value = values[i]; });
          break;
        }
        // ── Winter season cards that need player choice — apply random fallback ──
        case 'freeze': {
          // No-op: deck order is already set, just skip shuffle next round
          // (Would need game state flag - mark as pending)
          break;
        }
        case 'reorder_top': {
          // Without UI, shuffle top 10 randomly (minor benefit)
          const top10 = result.splice(-Math.min(10, result.length));
          top10.sort(() => Math.random() - 0.5);
          result.push(...top10);
          break;
        }
        default:
          break;
      }
    }
    this._pendingDeckMods = [];
    return result;
  }

  // ─── Legacy Compatibility ────────────────────────────────────────────────

  public applyBuffsToScore(baseFan: number): { fan: number; multiplier: number } {
    let fan = baseFan + this.bonusFan;
    let multiplier = this.fanMultiplier;
    this.bonusFan = 0;
    this.fanMultiplier = 1.0;
    return { fan, multiplier };
  }

  public calculateDamageReduction(incomingDamage: number): number {
    if (this.nextAttackImmune) {
      this.nextAttackImmune = false;
      return 0;
    }
    return Math.max(0, incomingDamage - this.damageReduction);
  }

  public clearDebuffs(): void {
    this.debuffs = [];
  }

  public addDebuff(debuff: string): void {
    if (!this.debuffs.includes(debuff)) {
      this.debuffs.push(debuff);
    }
  }

  public getDebuffs(): string[] {
    return [...this.debuffs];
  }

  public hasDebuff(debuff: string): boolean {
    return this.debuffs.includes(debuff);
  }

  public removeDebuff(debuff: string): void {
    const index = this.debuffs.indexOf(debuff);
    if (index !== -1) {
      this.debuffs.splice(index, 1);
    }
  }

  public isNextGodTileFree(): boolean {
    return this.nextGodTileFree;
  }

  public consumeFreeGodTile(): void {
    this.nextGodTileFree = false;
  }

  public getDamageReduction(): number {
    return this.damageReduction;
  }

  public isImmuneToNextAttack(): boolean {
    return this.nextAttackImmune;
  }

  public getBonusFan(): number {
    return this.bonusFan;
  }

  public getFanMultiplier(): number {
    return this.fanMultiplier;
  }

  public resetRoundBuffs(): void {
    this.damageReduction = 0;
  }

  private buildEffectContext(gameContext: {
    hand: Hand;
    selectedTiles: Tile[];
    drawPile: Tile[];
    discardPile: Tile[];
    handsRemaining: number;
    discardsRemaining: number;
    currentScore: number;
    targetScore: number;
    roundNumber?: number;
    redrawHand?: () => void;
    clearDebuffs?: () => void;
    drawFromOptions?: (options: Tile[]) => Promise<Tile>;
  }): FlowerCardEffectContext {
    const ctx: FlowerCardEffectContext = {
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
    // Pass roundNumber for effects that need it (e.g. 节节高升)
    if (gameContext.roundNumber) {
      (ctx as any).roundNumber = gameContext.roundNumber;
    }
    return ctx;
  }

  public serialize(): any {
    return {
      inventory: this.inventory.map(card => ({
        type: card.type,
        name: card.name,
        description: card.description,
        cost: card.cost,
        rarity: card.rarity,
        trigger: card.trigger,
        defId: card.defId,
      })),
      permanentFanBoosts: Object.fromEntries(this._permanentFanBoosts),
      damageReduction: this.damageReduction,
      nextAttackImmune: this.nextAttackImmune,
      bonusFan: this.bonusFan,
      fanMultiplier: this.fanMultiplier,
      debuffs: this.debuffs,
      nextGodTileFree: this.nextGodTileFree,
      pendingDeckMods: this._pendingDeckMods,
    };
  }

  public static deserialize(data: any, allFlowerCards: FlowerCard[]): FlowerCardManager {
    const manager = new FlowerCardManager();

    if (data.inventory) {
      data.inventory.forEach((cardData: any) => {
        const card = allFlowerCards.find(c => c.name === cardData.name);
        if (card) {
          manager.addCard(card);
        }
      });
    }

    if (data.permanentFanBoosts) {
      for (const [key, val] of Object.entries(data.permanentFanBoosts)) {
        manager._permanentFanBoosts.set(key, val as number);
      }
    }

    manager.damageReduction = data.damageReduction || 0;
    manager.nextAttackImmune = data.nextAttackImmune || false;
    manager.bonusFan = data.bonusFan || 0;
    manager.fanMultiplier = data.fanMultiplier || 1.0;
    manager.debuffs = data.debuffs || [];
    manager.nextGodTileFree = data.nextGodTileFree || false;
    manager._pendingDeckMods = data.pendingDeckMods || [];

    return manager;
  }
}
