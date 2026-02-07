import { Tile } from './Tile';
import { Fan, HandDecomposition } from './FanEvaluator';
import { GodTile, GodTileEffectContext } from '../roguelike/GodTile';
import { GodTileManager } from './GodTileManager';
import { Material } from '../data/materials';
import { MaterialManager, MaterialEffectResult } from './MaterialManager';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FanContribution {
  fan: Fan;
  baseChips: number;
  baseMult: number;
}

export interface TileChipContribution {
  tile: Tile;
  chips: number;
  reason: string;
}

export interface ChipModifier {
  source: string;
  chipsAdded: number;
  description: string;
}

export interface MultModifier {
  source: string;
  multAdded?: number;
  multMultiplier?: number;
  description: string;
}

export interface GoldModifier {
  source: string;
  goldAdded: number;
  description: string;
}

export interface ScoreBreakdown {
  // Input
  hand: Tile[];
  detectedFans: Fan[];
  activeGodTiles: GodTile[];
  decomposition?: HandDecomposition | null;

  // Base values from fans
  fanContributions: FanContribution[];
  baseChips: number;
  baseMult: number;

  // Tile-by-tile chip contributions
  tileChipContributions: TileChipContribution[];
  bonusChips: number;

  // God Tile modifiers
  chipModifiers: ChipModifier[];
  multModifiers: MultModifier[];
  goldModifiers: GoldModifier[];

  // Final calculation
  totalChips: number;      // baseChips + bonusChips + chip modifiers
  totalMult: number;       // baseMult × mult multipliers + mult additions
  totalGold: number;       // gold earned from this win
  finalScore: number;      // totalChips × totalMult
}

// Legacy alias for compatibility
export type ScoreResult = ScoreBreakdown;

export interface ScoringOptions {
  baseChipsPerTile?: number;
  baseChipsPerHonorTile?: number;
  baseChipsPerTerminalTile?: number;
}

// ─── Default Chip Values ────────────────────────────────────────────────────
// Tuned to provide ~80-130 chips from a typical 13-tile hand
// (mix of number tiles with some honors/terminals)

const DEFAULT_OPTIONS: Required<ScoringOptions> = {
  baseChipsPerTile: 6,           // Number tiles (2-8) - slightly increased
  baseChipsPerHonorTile: 12,     // Wind/dragon tiles - more valuable
  baseChipsPerTerminalTile: 9,   // 1s and 9s - terminal bonus
};

// ─── Helper Functions ───────────────────────────────────────────────────────

function isTileHonor(tile: Tile): boolean {
  return tile.suit === 'wind' || tile.suit === 'dragon';
}

function isTileTerminal(tile: Tile): boolean {
  return (tile.suit === 'wan' || tile.suit === 'tiao' || tile.suit === 'tong') &&
         (tile.value === 1 || tile.value === 9);
}

function getChipsForTile(tile: Tile, options: Required<ScoringOptions>): { chips: number; reason: string } {
  if (isTileHonor(tile)) {
    return {
      chips: options.baseChipsPerHonorTile,
      reason: 'honor tile'
    };
  }
  if (isTileTerminal(tile)) {
    return {
      chips: options.baseChipsPerTerminalTile,
      reason: 'terminal tile'
    };
  }
  return {
    chips: options.baseChipsPerTile,
    reason: 'number tile'
  };
}

/**
 * Get base chips and mult from fan definitions.
 * In Balatro-style, each fan contributes to both chips and mult.
 * We'll use a mapping based on fan points:
 * - Higher point fans give more chips and mult
 *
 * Balance targets:
 * - Early game (Ante 1-2): 150-450 score with basic fans
 * - Mid game (Ante 3-5): 600-1500 score with mid-tier fans
 * - Late game (Ante 6-8): 1500-3000+ score with high-tier fans
 */
function getFanChipsAndMult(fan: Fan): { chips: number; mult: number } {
  const points = fan.points;

  // Mapping: fan points → (base chips, base mult)
  // Tuned for smooth progression curve
  if (points >= 88) return { chips: 600, mult: 25 };    // 88番 (double yakuman) - massive power
  if (points >= 64) return { chips: 400, mult: 18 };    // 64番 (yakuman) - game-winning
  if (points >= 48) return { chips: 250, mult: 14 };    // 48番 (rare) - very strong
  if (points >= 32) return { chips: 180, mult: 12 };    // 32番 (expert) - powerful
  if (points >= 24) return { chips: 120, mult: 10 };    // 24番 (expert) - strong
  if (points >= 16) return { chips: 90, mult: 7 };      // 16番 (very hard) - good
  if (points >= 12) return { chips: 70, mult: 6 };      // 12番 (hard) - solid
  if (points >= 8) return { chips: 55, mult: 5 };       // 8番 (hard) - decent
  if (points >= 6) return { chips: 45, mult: 4 };       // 6番 (medium-hard) - mid-tier
  if (points >= 4) return { chips: 35, mult: 3 };       // 4番 (medium) - early-mid
  if (points >= 2) return { chips: 25, mult: 2 };       // 2番 (easy) - basic
  return { chips: 15, mult: 1 };                        // 1番 (trivial) - minimal
}

// ─── Main Scoring Function ──────────────────────────────────────────────────

export class Scoring {
  /**
   * Calculate Balatro-style score from a hand, detected fans, and active god tiles.
   *
   * Formula: (base_chips + bonus_chips + chip_modifiers) × (base_mult × mult_multipliers + mult_additions)
   */
  public static calculateScore(
    hand: Tile[],
    detectedFans: Fan[],
    activeGodTiles: GodTile[] = [],
    options: ScoringOptions = {},
    decomposition?: HandDecomposition | null
  ): ScoreBreakdown {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // ── Step 1: Calculate base chips and mult from fans ──
    const fanContributions: FanContribution[] = [];
    let baseChips = 0;
    let baseMult = 1;

    for (const fan of detectedFans) {
      const { chips, mult } = getFanChipsAndMult(fan);
      fanContributions.push({ fan, baseChips: chips, baseMult: mult });
      baseChips += chips;
      baseMult += mult;
    }

    // Ensure at least mult = 1
    if (baseMult < 1) baseMult = 1;

    // ── Step 2: Calculate per-tile chip contributions ──
    const tileChipContributions: TileChipContribution[] = [];
    let bonusChips = 0;

    for (const tile of hand) {
      const { chips, reason } = getChipsForTile(tile, opts);
      tileChipContributions.push({ tile, chips, reason });
      bonusChips += chips;
    }

    // ── Step 2b: Apply Material effects ──
    const materialManager = new MaterialManager();
    const materialResult = materialManager.applyMaterialEffects(hand, hand);

    bonusChips += materialResult.chips;
    // materialResult.mult and materialResult.multX are applied later in final calc

    // ── Step 3: Apply God Tile modifiers ──
    const chipModifiers: ChipModifier[] = [];
    const multModifiers: MultModifier[] = [];
    const goldModifiers: GoldModifier[] = [];

    let additionalChips = 0;
    let additionalMult = materialResult.mult;
    let multMultiplier = materialResult.multX;
    let totalGold = materialResult.gold;

    // Add material modifiers to breakdown
    if (materialResult.chips > 0) {
      chipModifiers.push({
        source: '材质效果',
        chipsAdded: materialResult.chips,
        description: `材质牌筹码加成 +${materialResult.chips}`
      });
    }
    if (materialResult.mult > 0) {
      multModifiers.push({
        source: '材质效果',
        multAdded: materialResult.mult,
        description: `材质牌倍率加成 +${materialResult.mult}`
      });
    }
    if (materialResult.multX > 1) {
      multModifiers.push({
        source: '材质效果',
        multMultiplier: materialResult.multX,
        description: `材质牌倍率乘数 ×${materialResult.multX}`
      });
    }

    // Create effect context
    const effectContext: GodTileEffectContext = {
      hand,
      detectedFans,
      decomposition,
      baseChips,
      baseMult,
      bonusChips,
      chipModifiers: [],
      multModifiers: [],
      goldModifiers: []
    };

    // Activate all God Tile effects
    for (const godTile of activeGodTiles) {
      godTile.activateEffects(effectContext);
    }

    // Collect modifiers from context
    chipModifiers.push(...effectContext.chipModifiers.map(m => ({
      source: m.source,
      chipsAdded: m.amount,
      description: m.description
    })));

    multModifiers.push(...effectContext.multModifiers.map(m => ({
      source: m.source,
      multAdded: m.amount,
      multMultiplier: m.multiplier,
      description: m.description
    })));

    goldModifiers.push(...effectContext.goldModifiers.map(m => ({
      source: m.source,
      goldAdded: m.amount,
      description: m.description
    })));

    // Calculate totals
    for (const mod of chipModifiers) {
      additionalChips += mod.chipsAdded;
    }

    for (const mod of multModifiers) {
      if (mod.multAdded) additionalMult += mod.multAdded;
      if (mod.multMultiplier) multMultiplier *= mod.multMultiplier;
    }

    for (const mod of goldModifiers) {
      totalGold += mod.goldAdded;
    }

    // ── Step 4: Calculate final score ──
    const totalChips = baseChips + bonusChips + additionalChips;
    const totalMult = (baseMult * multMultiplier) + additionalMult;
    const finalScore = Math.floor(totalChips * totalMult);

    return {
      hand,
      detectedFans,
      activeGodTiles,
      decomposition,
      fanContributions,
      baseChips,
      baseMult,
      tileChipContributions,
      bonusChips,
      chipModifiers,
      multModifiers,
      goldModifiers,
      totalChips,
      totalMult,
      totalGold,
      finalScore,
    };
  }


  /**
   * Format score breakdown for display/animation.
   */
  public static formatScoreBreakdown(breakdown: ScoreBreakdown): string {
    let output = '=== Score Breakdown ===\n\n';

    // Fans
    output += '[ Fans ]\n';
    for (const fc of breakdown.fanContributions) {
      output += `  ${fc.fan.name} (${fc.fan.points}番): +${fc.baseChips} chips, +${fc.baseMult} mult\n`;
    }
    output += `  Total from fans: ${breakdown.baseChips} chips, ${breakdown.baseMult} mult\n\n`;

    // Tiles
    output += '[ Tiles ]\n';
    const tileSummary = breakdown.tileChipContributions.reduce((acc, tc) => {
      acc[tc.reason] = (acc[tc.reason] || 0) + tc.chips;
      return acc;
    }, {} as Record<string, number>);
    for (const [reason, chips] of Object.entries(tileSummary)) {
      output += `  ${reason}: ${chips} chips\n`;
    }
    output += `  Total from tiles: ${breakdown.bonusChips} chips\n\n`;

    // God Tile modifiers
    if (breakdown.chipModifiers.length > 0 || breakdown.multModifiers.length > 0 || breakdown.goldModifiers.length > 0) {
      output += '[ God Tile Effects ]\n';
      for (const mod of breakdown.chipModifiers) {
        output += `  ${mod.source}: +${mod.chipsAdded} chips (${mod.description})\n`;
      }
      for (const mod of breakdown.multModifiers) {
        if (mod.multAdded) {
          output += `  ${mod.source}: +${mod.multAdded} mult (${mod.description})\n`;
        }
        if (mod.multMultiplier) {
          output += `  ${mod.source}: ×${mod.multMultiplier} mult (${mod.description})\n`;
        }
      }
      for (const mod of breakdown.goldModifiers) {
        output += `  ${mod.source}: +${mod.goldAdded} gold (${mod.description})\n`;
      }
      output += '\n';
    }

    // Final calculation
    output += '[ Final Score ]\n';
    output += `  ${breakdown.totalChips} chips × ${breakdown.totalMult.toFixed(1)} mult = ${breakdown.finalScore} points\n`;

    return output;
  }

  /**
   * Legacy helper: Check if a score result meets a winning threshold.
   * For compatibility with older Round.ts code.
   */
  public static isWinningScore(breakdown: ScoreBreakdown, threshold: number = 100): boolean {
    return breakdown.finalScore >= threshold;
  }
  
  /**
   * Calculate score with full bond integration
   * This is the enhanced scoring that includes bond effects from the new GodTileManager
   */
  public static calculateScoreWithBonds(
    hand: Tile[],
    detectedFans: Fan[],
    activeGodTiles: GodTile[] = [],
    godTileManager: GodTileManager | null = null,
    options: ScoringOptions & {
      gold?: number;
      meldMultiplier?: number;
    } = {},
    decomposition?: HandDecomposition | null
  ): ScoreBreakdown & { 
    bondEffects: string[];
    rouletteResult?: { operation: '+' | '-' | '×'; value: number } | null;
  } {
    // Get base score breakdown
    const baseBreakdown = this.calculateScore(hand, detectedFans, activeGodTiles, options, decomposition);
    
    const bondEffects: string[] = [];
    let rouletteResult: { operation: '+' | '-' | '×'; value: number } | null = null;
    
    // If no GodTileManager, return base breakdown
    if (!godTileManager) {
      return { ...baseBreakdown, bondEffects, rouletteResult };
    }
    
    // Count material tiles in the hand
    const materialTileCount = hand.filter(t => t.material && t.material !== Material.NONE).length;
    
    // Calculate bond scoring bonuses
    const bondBonus = godTileManager.calculateBondScoringBonus({
      gold: options.gold ?? 0,
      materialTileCount
    });
    
    bondEffects.push(...bondBonus.description);
    
    // Apply bond bonuses to totals
    let totalChips = baseBreakdown.totalChips;
    let totalMult = baseBreakdown.totalMult + bondBonus.additiveMult;
    
    // Apply multiplicative mult from bonds
    totalMult *= bondBonus.multiplicativeMult;
    
    // Apply meld multiplier if provided
    if (options.meldMultiplier && options.meldMultiplier > 1) {
      totalMult *= options.meldMultiplier;
      bondEffects.push(`出牌倍率: ×${options.meldMultiplier}`);
    }
    
    // Calculate score before roulette
    let finalScore = Math.floor(totalChips * totalMult);
    
    // Check for Gamble Lv3 roulette
    if (godTileManager.shouldShowRoulette()) {
      const roulette = godTileManager.rollGambleRoulette();
      if (roulette) {
        rouletteResult = { operation: roulette.operation, value: roulette.value };
        
        switch (roulette.operation) {
          case '+':
            totalMult += roulette.value;
            bondEffects.push(`🎲 赌神轮盘: +${roulette.value}倍率`);
            break;
          case '-':
            totalMult = Math.max(1, totalMult - roulette.value);
            bondEffects.push(`🎲 赌神轮盘: -${roulette.value}倍率`);
            break;
          case '×':
            finalScore = Math.floor(totalChips * totalMult * roulette.value);
            bondEffects.push(`🎲 赌神轮盘: ×${roulette.value}分数`);
            break;
        }
        
        // Recalculate if not multiplication (which was already applied)
        if (roulette.operation !== '×') {
          finalScore = Math.floor(totalChips * totalMult);
        }
      }
    }
    
    // Add bond modifiers to the breakdown
    const bondMultModifiers: MultModifier[] = bondBonus.description.map((desc, i) => ({
      source: `羁绊效果 ${i + 1}`,
      multAdded: bondBonus.additiveMult > 0 ? bondBonus.additiveMult : undefined,
      multMultiplier: bondBonus.multiplicativeMult > 1 ? bondBonus.multiplicativeMult : undefined,
      description: desc
    }));
    
    return {
      ...baseBreakdown,
      totalChips,
      totalMult,
      finalScore,
      multModifiers: [...baseBreakdown.multModifiers, ...bondMultModifiers],
      bondEffects,
      rouletteResult
    };
  }
}
