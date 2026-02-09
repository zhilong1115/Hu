/**
 * FlowerCard v5.1 — Runtime flower card instance
 * 
 * Two types:
 * - ⚡ Instant: Manual use, costs gold
 * - 🎯 On-Win: Auto-trigger on hu, settles left→right, reorderable
 * 
 * Unused cards give +5 gold on win then disappear.
 */

import { FlowerCardDef, FlowerCardTrigger } from '../data/flowerCards';

export enum FlowerCardType {
  BAMBOO = 'bamboo',
  PLUM = 'plum',
  ORCHID = 'orchid',
  CHRYSANTHEMUM = 'chrysanthemum'
}

export interface FlowerCardInstance {
  id: string;           // Unique instance ID
  defId: string;        // Reference to FlowerCardDef.id
  type: FlowerCardType;
  trigger: FlowerCardTrigger;
  name: string;
  description: string;
  cost: number;
  used: boolean;        // Whether this card has been used this round
}

// Legacy compatibility exports
export interface FlowerEffect {
  name: string;
  description: string;
  triggerCondition: string;
  effect: (context: FlowerCardEffectContext) => void | Promise<void>;
}

export interface FlowerCardEffectContext {
  hand: any;
  selectedTiles: any[];
  drawPile: any[];
  discardPile: any[];
  handsRemaining: number;
  discardsRemaining: number;
  currentScore: number;
  targetScore: number;
  damageReduction: number;
  nextAttackImmune: boolean;
  bonusFan: number;
  fanMultiplier: number;
  debuffs: string[];
  nextGodTileFree?: boolean;
  redrawHand?: () => void;
  clearDebuffs?: () => void;
  drawFromOptions?: (options: any[]) => Promise<any>;
}

/**
 * Create a FlowerCardInstance from a FlowerCardDef
 */
export function createFlowerCardInstance(def: FlowerCardDef): FlowerCardInstance {
  return {
    id: `${def.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    defId: def.id,
    type: def.type,
    trigger: def.trigger,
    name: def.name,
    description: def.description,
    cost: def.cost,
    used: false,
  };
}

/**
 * Legacy FlowerCard class for backward compatibility with existing UI code
 */
export class FlowerCard {
  public readonly type: FlowerCardType;
  public readonly name: string;
  public readonly description: string;
  public readonly effects: FlowerEffect[];
  public readonly cost: number;
  public readonly rarity: string;
  public readonly trigger: FlowerCardTrigger;
  public readonly defId: string;

  constructor(
    type: FlowerCardType,
    name: string,
    description: string,
    effects: FlowerEffect[],
    cost: number,
    rarity: string,
    trigger: FlowerCardTrigger = 'instant',
    defId: string = ''
  ) {
    this.type = type;
    this.name = name;
    this.description = description;
    this.effects = effects;
    this.cost = cost;
    this.rarity = rarity;
    this.trigger = trigger;
    this.defId = defId;
  }

  public canPlay(_context: FlowerCardEffectContext): boolean {
    return true;
  }

  public async play(context: FlowerCardEffectContext): Promise<void> {
    for (const effect of this.effects) {
      await effect.effect(context);
    }
  }

  public requiresSelection(): boolean {
    return false;
  }

  public getCannotPlayMessage(): string {
    return '无法使用此花牌';
  }

  public getDisplayName(): string {
    return `${this.name} (${this.cost}金)`;
  }

  public getFlowerSymbol(): string {
    switch (this.type) {
      case FlowerCardType.BAMBOO: return '🎋';
      case FlowerCardType.PLUM: return '🌸';
      case FlowerCardType.ORCHID: return '🌺';
      case FlowerCardType.CHRYSANTHEMUM: return '🏵️';
      default: return '🌼';
    }
  }

  public isInstant(): boolean {
    return this.trigger === 'instant';
  }

  public isOnWin(): boolean {
    return this.trigger === 'on_win';
  }

  /**
   * Create a FlowerCard from a FlowerCardDef
   */
  public static fromDef(def: FlowerCardDef): FlowerCard {
    // Determine rarity based on cost
    let rarity = 'common';
    if (def.cost >= 10) rarity = 'epic';
    else if (def.cost >= 6) rarity = 'rare';

    const effects = FlowerCard.buildEffects(def);

    return new FlowerCard(
      def.type,
      def.name,
      def.description,
      effects,
      def.cost,
      rarity,
      def.trigger,
      def.id
    );
  }

  /**
   * Build effect functions based on card definition
   */
  private static buildEffects(def: FlowerCardDef): FlowerEffect[] {
    // On-win cards are handled by FlowerCardManager.settleOnWinCards()
    if (def.trigger === 'on_win') return [];

    const effect = FlowerCard.getInstantEffect(def.id);
    if (!effect) return [];
    return [{ name: def.name, description: def.description, triggerCondition: 'instant', effect }];
  }

  private static getInstantEffect(defId: string): ((ctx: FlowerCardEffectContext) => void) | null {
    switch (defId) {
      // ── 梅 (Plum) — discard enhancement ──
      case 'plum_1':
        return (ctx) => { ctx.discardsRemaining += 1; };
      case 'plum_2':
        return (ctx) => { ctx.discardsRemaining += 2; };
      case 'plum_3':
        return (ctx) => { ctx.discardsRemaining += 3; };
      case 'plum_hanmei':
        return (ctx) => {
          // Flag: next discard can discard any number (handled by game logic via debuffs)
          ctx.debuffs.push('hanmei_unlimited_discard');
        };
      case 'plum_sannong':
        return (ctx) => {
          // Show top (discardCount+3) tiles, pick discardCount to add to hand
          // Complex UI interaction — flag it for GameScene to handle
          ctx.debuffs.push('plum_sannong_pending');
        };
      case 'plum_anxiang':
        return (ctx) => {
          // Next discard: each discarded tile gives +5 gold
          ctx.debuffs.push('plum_anxiang_gold_discard');
        };
      case 'plum_yijian':
        return (ctx) => {
          // Discard 1, search for exact tile — complex UI, flag it
          ctx.debuffs.push('plum_yijian_pending');
        };
      case 'plum_taxue':
        return (ctx) => {
          if (ctx.redrawHand) ctx.redrawHand();
        };

      // ── 竹 (Bamboo) — gold generation ──
      case 'bamboo_ping':
        return (ctx) => { (ctx as any).goldDelta = ((ctx as any).goldDelta || 0) + 5; };
      case 'bamboo_cui':
        return (ctx) => { (ctx as any).goldDelta = ((ctx as any).goldDelta || 0) + 10; };
      case 'bamboo_lin':
        return (ctx) => { (ctx as any).goldDelta = ((ctx as any).goldDelta || 0) + 15; };
      case 'bamboo_jiejie':
        return (ctx) => {
          const round = (ctx as any).roundNumber || (ctx as any).currentRound || 1;
          (ctx as any).goldDelta = ((ctx as any).goldDelta || 0) + round * 5;
        };
      case 'bamboo_bian':
        return (ctx) => {
          // +3 gold per tile with material in hand
          const tiles = ctx.hand?.tiles || [];
          const materialCount = tiles.filter((t: any) => t.material && t.material !== 'none').length;
          (ctx as any).goldDelta = ((ctx as any).goldDelta || 0) + materialCount * 3;
        };
      case 'bamboo_zhishang':
        return (ctx) => {
          const tiles = ctx.hand?.tiles || [];
          let maxValue = 0;
          tiles.forEach((t: any) => { if (t.value && t.value > maxValue) maxValue = t.value; });
          (ctx as any).goldDelta = ((ctx as any).goldDelta || 0) + maxValue * 3;
        };
      case 'bamboo_shiru':
        return (ctx) => {
          (ctx as any).goldDelta = ((ctx as any).goldDelta || 0) + 30;
          ctx.discardsRemaining = Math.max(0, ctx.discardsRemaining - 1);
        };

      // ── 菊 (Chrysanthemum) — random ──
      case 'chrys_tai':
        return (ctx) => {
          const amount = Math.floor(Math.random() * 26) + 5; // 5~30
          (ctx as any).goldDelta = ((ctx as any).goldDelta || 0) + amount;
        };
      case 'chrys_qiuju':
        return (ctx) => {
          // Give random flower card — flag for GameScene
          ctx.debuffs.push('chrys_qiuju_random_flower');
        };
      case 'chrys_caiju':
        return (ctx) => {
          // Give random god tile — flag for GameScene
          ctx.debuffs.push('chrys_caiju_random_god');
        };
      case 'chrys_huangju':
        return (ctx) => {
          // Add random material to 1 random hand tile — flag for GameScene
          ctx.debuffs.push('chrys_huangju_random_material');
        };
      case 'chrys_chiju':
        return (ctx) => {
          const roll = Math.random();
          if (roll < 0.33) {
            // 2 flower cards
            ctx.debuffs.push('chrys_chiju_2flowers');
          } else if (roll < 0.66) {
            // +20 gold
            (ctx as any).goldDelta = ((ctx as any).goldDelta || 0) + 20;
          } else {
            // +2 discards
            ctx.discardsRemaining += 2;
          }
        };
      case 'chrys_jinju':
        return (ctx) => {
          // Add random material to up to 3 random tiles
          ctx.debuffs.push('chrys_jinju_3materials');
        };
      case 'chrys_huangjin':
        return (ctx) => {
          const roll = Math.random();
          if (roll < 0.5) {
            // All hand tiles get gold material
            ctx.debuffs.push('chrys_huangjin_all_gold');
          } else if (roll < 0.8) {
            // +50 gold
            (ctx as any).goldDelta = ((ctx as any).goldDelta || 0) + 50;
          }
          // 20% nothing happens
        };

      default:
        return null;
    }
  }
}

/**
 * Legacy helper for backward compatibility
 */
export function createFlowerCardFromData(data: FlowerCardDef): FlowerCard {
  return FlowerCard.fromDef(data);
}
