/**
 * MaterialManager - Handles material effects, breaking, and degradation
 * 
 * Materials are tracked on tiles and their effects are calculated during hu scoring.
 * The manager handles:
 * - Applying material effects to scoring (chips, mult, multX, gold)
 * - Breaking/degradation rolls after hu
 * - Ice melting after rounds
 * - Special effects (bamboo on discard, emerald synergy, jade proc, etc.)
 */

import { Tile } from './Tile';
import { Material, MaterialData, MATERIALS, getMaterialData } from '../data/materials';

/**
 * Result of applying material effects to a set of tiles
 */
export interface MaterialEffectResult {
  chips: number;       // Total chip bonus
  mult: number;        // Total additive mult bonus
  multX: number;       // Total multiplicative mult (multiply together)
  gold: number;        // Gold earned from material effects
  breakdown: MaterialEffectBreakdown[];  // Detailed breakdown for UI
}

/**
 * Individual material contribution for UI display
 */
export interface MaterialEffectBreakdown {
  tileId: string;
  tileName: string;
  material: Material;
  materialEmoji: string;
  chips: number;
  mult: number;
  multX: number;
  gold: number;
  procced?: boolean;  // For jade's 20% bonus
  specialText?: string;  // Description of special effect that triggered
}

/**
 * Result of break/degrade checks after hu
 */
export interface BreakResult {
  tileId: string;
  tileName: string;
  oldMaterial: Material;
  newMaterial: Material | null;  // null = completely destroyed
  goldEarned: number;  // For porcelain break bonus
}

/**
 * MaterialManager class
 * 
 * Manages material state and calculations for the game.
 * This is a stateful manager that tracks:
 * - Ice tile remaining rounds
 * - Emerald count for global bonus
 */
export class MaterialManager {
  // Track ice tiles: tileId -> rounds remaining before melt
  private iceTileRounds: Map<string, number> = new Map();

  /**
   * Apply all material effects for tiles participating in a hu
   * 
   * @param tiles - Tiles that are part of the winning hand
   * @param allTiles - All tiles the player has (for emerald counting)
   * @returns Combined material effects
   */
  applyMaterialEffects(tiles: Tile[], allTiles?: Tile[]): MaterialEffectResult {
    const result: MaterialEffectResult = {
      chips: 0,
      mult: 0,
      multX: 1,  // Start at 1 since we multiply
      gold: 0,
      breakdown: [],
    };

    // Count emeralds in ALL tiles (not just hu tiles) for global bonus
    const emeraldCount = this.countEmeralds(allTiles || tiles);
    const emeraldChipBonus = emeraldCount * 3;  // +3 chips per emerald to ALL tiles

    for (const tile of tiles) {
      const material = tile.material || Material.NONE;
      if (material === Material.NONE) continue;

      const data = getMaterialData(material);
      const breakdown: MaterialEffectBreakdown = {
        tileId: tile.id,
        tileName: tile.displayName,
        material: material,
        materialEmoji: data.emoji,
        chips: 0,
        mult: 0,
        multX: 1,
        gold: 0,
      };

      // Apply base chips
      breakdown.chips += data.chips;

      // Apply emerald global bonus
      if (emeraldCount > 0) {
        breakdown.chips += emeraldChipBonus;
        if (emeraldChipBonus > 0) {
          breakdown.specialText = `翡翠加成 +${emeraldChipBonus} 筹码`;
        }
      }

      // Apply base mult
      breakdown.mult += data.mult;

      // Apply multX
      if (data.multX !== 1) {
        breakdown.multX = data.multX;
      }

      // Handle special effects
      if (material === Material.JADE) {
        // Jade: 20% chance for +1 mult
        if (Math.random() < 0.2) {
          breakdown.mult += 1;
          breakdown.procced = true;
          breakdown.specialText = '🍀 玉牌触发 +1 倍率!';
        }
      }

      // Accumulate totals
      result.chips += breakdown.chips;
      result.mult += breakdown.mult;
      result.multX *= breakdown.multX;
      result.gold += breakdown.gold;
      result.breakdown.push(breakdown);
    }

    return result;
  }

  /**
   * Roll for breaks after hu for all tiles with break chances
   * 
   * @param tiles - Tiles that participated in the hu
   * @param breakChanceModifier - Modifier to break chance (e.g., 0.5 for synergy that halves breaks)
   * @returns Array of break results and gold earned
   */
  handleBreaking(tiles: Tile[], breakChanceModifier: number = 1): BreakResult[] {
    const results: BreakResult[] = [];

    for (const tile of tiles) {
      const material = tile.material || Material.NONE;
      if (material === Material.NONE) continue;

      const data = getMaterialData(material);
      if (data.breakChance <= 0) continue;

      const effectiveBreakChance = data.breakChance * breakChanceModifier;
      
      if (Math.random() < effectiveBreakChance) {
        const result: BreakResult = {
          tileId: tile.id,
          tileName: tile.displayName,
          oldMaterial: material,
          newMaterial: data.degradesTo,
          goldEarned: 0,
        };

        // Porcelain gives gold when broken
        if (material === Material.PORCELAIN) {
          result.goldEarned = 50;
        }

        // Apply the degradation
        if (data.degradesTo) {
          tile.material = data.degradesTo;
        } else {
          tile.material = Material.NONE;
        }

        results.push(result);
      }
    }

    return results;
  }

  /**
   * Degrade a material to its next tier (used when breaking)
   * Returns null if the material disappears completely
   */
  degradeMaterial(material: Material): Material | null {
    const data = getMaterialData(material);
    return data.degradesTo;
  }

  /**
   * Process round end for ice tiles - they melt after 3 rounds
   * 
   * @param tiles - All tiles to check for ice
   * @returns Array of tiles that melted this round
   */
  processRoundEnd(tiles: Tile[]): Tile[] {
    const melted: Tile[] = [];

    for (const tile of tiles) {
      if (tile.material !== Material.ICE) continue;

      // Initialize ice tracking if not present
      if (!this.iceTileRounds.has(tile.id)) {
        const data = getMaterialData(Material.ICE);
        this.iceTileRounds.set(tile.id, data.meltsAfter || 3);
      }

      const remaining = this.iceTileRounds.get(tile.id)! - 1;
      
      if (remaining <= 0) {
        // Ice melts!
        tile.material = Material.NONE;
        this.iceTileRounds.delete(tile.id);
        melted.push(tile);
      } else {
        this.iceTileRounds.set(tile.id, remaining);
      }
    }

    return melted;
  }

  /**
   * Get remaining rounds before an ice tile melts
   */
  getIceRoundsRemaining(tileId: string): number | undefined {
    return this.iceTileRounds.get(tileId);
  }

  /**
   * Handle bamboo discard - returns gold earned
   * Called when a bamboo tile is discarded
   */
  handleBambooDiscard(tile: Tile): number {
    if (tile.material === Material.BAMBOO) {
      return 5;  // +5 gold on discard
    }
    return 0;
  }

  /**
   * Count emerald tiles in a set of tiles
   */
  countEmeralds(tiles: Tile[]): number {
    return tiles.filter(t => t.material === Material.EMERALD).length;
  }

  /**
   * Apply a material to a tile
   */
  applyMaterial(tile: Tile, material: Material): void {
    // Clear ice tracking if material is changing
    if (tile.material === Material.ICE) {
      this.iceTileRounds.delete(tile.id);
    }

    tile.material = material;

    // Initialize ice tracking for new ice tiles
    if (material === Material.ICE) {
      const data = getMaterialData(Material.ICE);
      this.iceTileRounds.set(tile.id, data.meltsAfter || 3);
    }
  }

  /**
   * Remove material from a tile
   */
  removeMaterial(tile: Tile): void {
    if (tile.material === Material.ICE) {
      this.iceTileRounds.delete(tile.id);
    }
    tile.material = Material.NONE;
  }

  /**
   * Get a summary of all materials on given tiles
   */
  getMaterialSummary(tiles: Tile[]): Map<Material, number> {
    const summary = new Map<Material, number>();
    
    for (const tile of tiles) {
      const mat = tile.material || Material.NONE;
      if (mat !== Material.NONE) {
        summary.set(mat, (summary.get(mat) || 0) + 1);
      }
    }

    return summary;
  }

  /**
   * Check if any tiles have materials
   */
  hasAnyMaterials(tiles: Tile[]): boolean {
    return tiles.some(t => t.material && t.material !== Material.NONE);
  }

  /**
   * Reset manager state (call at start of new game)
   */
  reset(): void {
    this.iceTileRounds.clear();
  }

  /**
   * Upgrade a material to the next tier (for transformation god tiles)
   * Returns the upgraded material or the same if no upgrade path
   */
  static upgradeMaterial(material: Material): Material {
    const upgradeChain: Partial<Record<Material, Material>> = {
      [Material.BRONZE]: Material.SILVER,
      [Material.SILVER]: Material.GOLD,
      [Material.GLASS]: Material.COLORED_GLASS,
    };
    return upgradeChain[material] || material;
  }

  /**
   * Check if material can be upgraded
   */
  static canUpgrade(material: Material): boolean {
    return material === Material.BRONZE || 
           material === Material.SILVER || 
           material === Material.GLASS;
  }
}

/**
 * Singleton instance for game-wide material management
 */
export const materialManager = new MaterialManager();
