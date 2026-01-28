import { Tile, TileSuit, TileValue } from '../core/Tile';
import { Hand } from '../core/Hand';
import { Fan } from '../core/FanEvaluator';

export enum FlowerCardType {
  BAMBOO = 'bamboo',
  PLUM = 'plum',
  ORCHID = 'orchid',
  CHRYSANTHEMUM = 'chrysanthemum'
}

// Effect context passed to Flower Card effects
export interface FlowerCardEffectContext {
  // Game state
  hand: Hand;
  selectedTiles: Tile[];
  drawPile: Tile[];
  discardPile: Tile[];

  // Round state
  handsRemaining: number;
  discardsRemaining: number;
  currentScore: number;
  targetScore: number;

  // Buffs/debuffs (mutated by effects)
  damageReduction: number;
  nextAttackImmune: boolean;
  bonusFan: number;
  fanMultiplier: number;
  debuffs: string[];

  // Shop state (for shop-related effects)
  nextGodTileFree?: boolean;

  // Callbacks for complex actions
  redrawHand?: () => void;
  clearDebuffs?: () => void;
  drawFromOptions?: (options: Tile[]) => Promise<Tile>;
}

export interface FlowerEffect {
  name: string;
  description: string;
  triggerCondition: string;
  effect: (context: FlowerCardEffectContext) => void | Promise<void>;
}

export class FlowerCard {
  public readonly type: FlowerCardType;
  public readonly name: string;
  public readonly description: string;
  public readonly effects: FlowerEffect[];
  public readonly cost: number;
  public readonly rarity: string;

  constructor(
    type: FlowerCardType,
    name: string,
    description: string,
    effects: FlowerEffect[],
    cost: number,
    rarity: string
  ) {
    this.type = type;
    this.name = name;
    this.description = description;
    this.effects = effects;
    this.cost = cost;
    this.rarity = rarity;
  }

  public canPlay(context: FlowerCardEffectContext): boolean {
    // Check if the flower card can be played based on current game state
    // Most flower cards can always be played, but some have specific requirements
    return true;
  }

  public async play(context: FlowerCardEffectContext): Promise<void> {
    for (const effect of this.effects) {
      await effect.effect(context);
    }
  }

  /**
   * Check if this flower card requires tile selection
   */
  public requiresSelection(): boolean {
    // Transform cards typically need tile selection
    return this.type === FlowerCardType.CHRYSANTHEMUM &&
           this.name.includes('九九重阳');
  }

  /**
   * Get the appropriate message when card cannot be played
   */
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
      case FlowerCardType.CHRYSANTHEMUM: return '🌻';
      default: return '🌼';
    }
  }
}