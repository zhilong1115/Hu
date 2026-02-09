import { TileSuit, TileValue, Tile } from '../core/Tile';
import { Fan } from '../core/FanEvaluator';
import { HandDecomposition } from '../core/FanEvaluator';
import { 
  GodTile as NewGodTile, 
  GodTileRarity as NewGodTileRarity,
  GodTileBond 
} from '../data/godTiles';

// Legacy rarity enum (mapped from new system)
export enum GodTileRarity {
  COMMON = 'common',    // Maps to GREEN
  RARE = 'rare',        // Maps to BLUE
  EPIC = 'epic',        // Maps to PURPLE
  LEGENDARY = 'legendary' // Maps to GOLD
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

// Map new rarity to legacy rarity
function mapNewRarityToLegacy(newRarity: NewGodTileRarity): GodTileRarity {
  switch (newRarity) {
    case NewGodTileRarity.GREEN: return GodTileRarity.COMMON;
    case NewGodTileRarity.BLUE: return GodTileRarity.RARE;
    case NewGodTileRarity.PURPLE: return GodTileRarity.EPIC;
    case NewGodTileRarity.GOLD: return GodTileRarity.LEGENDARY;
    default: return GodTileRarity.COMMON;
  }
}

// Create an effect from new god tile data with proper implementations
function createPlaceholderEffect(newTile: NewGodTile): GodTileEffect {
  return {
    name: newTile.name,
    description: newTile.description,
    activate: (context: GodTileEffectContext) => {
      const effect = newTile.effect;

      // Only onScore effects are activated during scoring
      if (effect.trigger !== 'onScore') return;

      switch (newTile.id) {
        case 'gamble_big_bet': {
          // 豪赌一番: 50% score +30%, fail -10%
          const roll = Math.random();
          const prob = effect.probability ?? 0.5;
          if (roll < prob) {
            context.multModifiers.push({
              source: newTile.name,
              multiplier: 1.3,
              description: '豪赌一番成功! 得分 +30%'
            });
          } else {
            context.multModifiers.push({
              source: newTile.name,
              multiplier: 0.9,
              description: '豪赌一番失败 得分 -10%'
            });
          }
          break;
        }
        case 'gamble_all_in': {
          // 孤注一掷: 75% score × god tile count, fail -50% gold
          const roll = Math.random();
          const prob = effect.probability ?? 0.75;
          if (roll < prob) {
            // Use actual god tile count from context (set by Scoring before calling)
            const godTileCount = Math.max(1, (context as GodTileEffectContext & { activeGodTileCount?: number }).activeGodTileCount ?? 1);
            context.multModifiers.push({
              source: newTile.name,
              multiplier: godTileCount,
              description: `孤注一掷成功! 得分 ×${godTileCount} (神牌数)`
            });
          } else {
            context.goldModifiers.push({
              source: newTile.name,
              amount: -Math.floor(50), // Penalty placeholder; actual gold handled in GameScene
              description: '孤注一掷失败 -50%金币'
            });
          }
          break;
        }
        default:
          // Other onScore effects: no-op (handled by bond system or GodTileManager)
          break;
      }
    }
  };
}

export class GodTile {
  public readonly id: string;
  public readonly baseTile: { suit: TileSuit; value: TileValue };
  public readonly rarity: GodTileRarity;
  public readonly effects: GodTileEffect[];
  public readonly cost: number;
  public readonly displayName: string;
  
  // New god tile properties
  public readonly bond?: GodTileBond;
  public readonly newRarity?: NewGodTileRarity;

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

  /**
   * Create a GodTile instance from the new god tile data format
   */
  public static fromNewFormat(newTile: NewGodTile): GodTile {
    const legacyRarity = mapNewRarityToLegacy(newTile.rarity);
    
    // Create a GodTileData compatible object
    const data: GodTileData = {
      baseTile: { suit: TileSuit.Dragon, value: 1 }, // Placeholder, not used for display
      rarity: legacyRarity,
      effects: [createPlaceholderEffect(newTile)],
      cost: newTile.price,
      displayName: newTile.name
    };
    
    const godTile = new GodTile(data);
    
    // Override id to use the new tile's id
    (godTile as { id: string }).id = newTile.id;
    
    // Store new properties
    (godTile as { bond?: GodTileBond }).bond = newTile.bond;
    (godTile as { newRarity?: NewGodTileRarity }).newRarity = newTile.rarity;
    
    return godTile;
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
    // Use new rarity colors if available
    if (this.newRarity) {
      switch (this.newRarity) {
        case NewGodTileRarity.GREEN: return '#4CAF50';
        case NewGodTileRarity.BLUE: return '#2196F3';
        case NewGodTileRarity.PURPLE: return '#9C27B0';
        case NewGodTileRarity.GOLD: return '#FFD700';
      }
    }
    
    // Fallback to legacy colors
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
  
  /**
   * Get bond information for display
   */
  public getBondInfo(): { name: string; icon: string } | null {
    if (!this.bond) return null;
    
    switch (this.bond) {
      case GodTileBond.GAMBLE: return { name: '赌博', icon: '🎲' };
      case GodTileBond.VISION: return { name: '洞察', icon: '👁️' };
      case GodTileBond.WEALTH: return { name: '财运', icon: '💰' };
      case GodTileBond.TRANSFORM: return { name: '转化', icon: '🔄' };
      default: return null;
    }
  }
}
