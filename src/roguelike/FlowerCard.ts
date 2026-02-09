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

    return new FlowerCard(
      def.type,
      def.name,
      def.description,
      [], // Effects handled by game logic now
      def.cost,
      rarity,
      def.trigger,
      def.id
    );
  }
}

/**
 * Legacy helper for backward compatibility
 */
export function createFlowerCardFromData(data: FlowerCardDef): FlowerCard {
  return FlowerCard.fromDef(data);
}
