import { TileSuit, TileValue, Tile } from '../core/Tile';
import { Fan } from '../core/FanEvaluator';
import { HandDecomposition } from '../core/FanEvaluator';

export enum GodTileRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

// Effect context passed to God Tile effects
export interface GodTileEffectContext {
  hand: Tile[];
  detectedFans: Fan[];
  decomposition?: HandDecomposition | null;
  baseChips: number;
  baseMult: number;
  bonusChips: number;

  // Effect outputs (mutated by effects)
  chipModifiers: { source: string; amount: number; description: string }[];
  multModifiers: { source: string; amount?: number; multiplier?: number; description: string }[];
  goldModifiers: { source: string; amount: number; description: string }[];

  // Wildcard system for legendary tiles
  wildcards?: Map<string, { suit: TileSuit; value: TileValue }[]>;
}

// Effect function type
export type GodTileEffectFunction = (context: GodTileEffectContext) => void;

export interface GodTileEffect {
  name: string;
  description: string;
  activate: GodTileEffectFunction;
}

export interface GodTileData {
  baseTile: { suit: TileSuit; value: TileValue };
  rarity: GodTileRarity;
  effects: GodTileEffect[];
  cost: number;
  displayName: string;
}

export class GodTile {
  public readonly id: string;
  public readonly baseTile: { suit: TileSuit; value: TileValue };
  public readonly rarity: GodTileRarity;
  public readonly effects: GodTileEffect[];
  public readonly cost: number;
  public readonly displayName: string;

  // Track if this tile triggered during the last scoring
  public lastTriggered: boolean = false;

  constructor(data: GodTileData) {
    this.id = `${data.baseTile.suit}-${data.baseTile.value}-${Date.now()}-${Math.random()}`;
    this.baseTile = data.baseTile;
    this.rarity = data.rarity;
    this.effects = data.effects;
    this.cost = data.cost;
    this.displayName = data.displayName;
  }

  public activateEffects(context: GodTileEffectContext): void {
    this.lastTriggered = false;

    // Track initial state to detect if effects modified anything
    const initialChipModsLen = context.chipModifiers.length;
    const initialMultModsLen = context.multModifiers.length;
    const initialGoldModsLen = context.goldModifiers.length;

    for (const effect of this.effects) {
      effect.activate(context);
    }

    // Check if any modifications were made
    this.lastTriggered =
      context.chipModifiers.length > initialChipModsLen ||
      context.multModifiers.length > initialMultModsLen ||
      context.goldModifiers.length > initialGoldModsLen;
  }

  public getRarityColor(): string {
    switch (this.rarity) {
      case GodTileRarity.COMMON: return '#ffffff';
      case GodTileRarity.RARE: return '#00ff00';
      case GodTileRarity.EPIC: return '#8a2be2';
      case GodTileRarity.LEGENDARY: return '#ffd700';
      default: return '#ffffff';
    }
  }

  public getDisplayText(): string {
    return `${this.displayName} (${this.cost}金)`;
  }

  public getEffectsDescription(): string {
    return this.effects.map(e => `${e.name}: ${e.description}`).join('\n');
  }
}
