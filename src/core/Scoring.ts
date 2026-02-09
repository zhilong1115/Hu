import { Tile } from './Tile';
import { Fan, HandDecomposition } from './FanEvaluator';
import { GodTile, GodTileEffectContext } from '../roguelike/GodTile';
import { GodTileManager } from './GodTileManager';
import { Material } from '../data/materials';
import { MaterialManager, MaterialEffectResult } from './MaterialManager';
import { getFanMultiplier } from '../data/fans';
import { FlowerCardManager } from '../roguelike/FlowerCardManager';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FanContribution {
  fan: Fan;
  multiplier: number;  // The ×N multiplier from fans.ts
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

  // Fan contributions (multiplicative)
  fanContributions: FanContribution[];
  fanMultiplier: number;        // Product of all fan multipliers

  // Base score
  baseScore: number;            // 基础分 (100 default)

  // Modifiers
  chipModifiers: ChipModifier[];
  multModifiers: MultModifier[];
  goldModifiers: GoldModifier[];

  // Material effects
  materialChips: number;
  materialMult: number;
  materialMultX: number;

  // Final calculation
  // 最终得分 = 基础分 × 出牌倍率 × 番型倍率 × 成就倍率 × 羁绊加成
  totalMult: number;            // Combined multiplier (for display/compat)
  totalChips: number;           // Base score + material chips (for compat with GameScene)
  totalGold: number;
  finalScore: number;
  guzhuyizhiFailed?: boolean;   // 孤注一掷 failure flag (-50% gold)
}

// Legacy aliases for compatibility
export type ScoreResult = ScoreBreakdown;

// Keep these for backward compat but they're unused in new system
export interface TileChipContribution {
  tile: Tile;
  chips: number;
  reason: string;
}

export interface ScoringOptions {
  baseScore?: number;  // Base score (default 100)
}

const DEFAULT_BASE_SCORE = 100;

// ─── Main Scoring Function ──────────────────────────────────────────────────

export class Scoring {
  /**
   * Calculate score using multiplicative multipliers.
   *
   * Formula: 基础分 × 番型倍率 × (god tile & material modifiers)
   * 
   * Fan multipliers stack multiplicatively:
   *   清一色(×8) + 对对和(×5) = ×40
   */
  public static calculateScore(
    hand: Tile[],
    detectedFans: Fan[],
    activeGodTiles: GodTile[] = [],
    options: ScoringOptions = {},
    decomposition?: HandDecomposition | null
  ): ScoreBreakdown {
    const baseScore = options.baseScore ?? DEFAULT_BASE_SCORE;

    // ── Step 1: Calculate fan multiplier (multiplicative stacking) ──
    const fanContributions: FanContribution[] = [];
    let fanMultiplier = 1;

    for (const fan of detectedFans) {
      const mult = getFanMultiplier(fan.name);
      fanContributions.push({ fan, multiplier: mult });
      fanMultiplier *= mult;  // Multiplicative stacking
    }

    // Ensure minimum ×1
    if (fanMultiplier < 1) fanMultiplier = 1;

    // ── Step 2: Apply Material effects ──
    const materialManager = new MaterialManager();
    const materialResult = materialManager.applyMaterialEffects(hand, hand);

    // ── Step 3: Apply God Tile modifiers ──
    const chipModifiers: ChipModifier[] = [];
    const multModifiers: MultModifier[] = [];
    const goldModifiers: GoldModifier[] = [];

    let additionalMult = 0;
    let multMultiplier = 1;
    let totalGold = materialResult.gold;
    let additionalChips = 0;

    // Add material modifiers to breakdown (will be accumulated in the loop below)
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

    // Create effect context for god tiles
    const effectContext: GodTileEffectContext & { activeGodTileCount?: number } = {
      hand,
      detectedFans,
      decomposition,
      baseChips: baseScore,
      baseMult: fanMultiplier,
      bonusChips: 0,
      chipModifiers: [],
      multModifiers: [],
      goldModifiers: [],
      activeGodTileCount: activeGodTiles.length,
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

    // Calculate totals from modifiers
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
    // 最终得分 = (基础分 + 材质筹码) × 番型倍率 × 材质/神牌乘数 + 加法倍率
    const totalChips = baseScore + additionalChips;
    const totalMult = (fanMultiplier * multMultiplier) + additionalMult;
    const finalScore = Math.floor(totalChips * totalMult);

    return {
      hand,
      detectedFans,
      activeGodTiles,
      decomposition,
      fanContributions,
      fanMultiplier,
      baseScore,
      chipModifiers,
      multModifiers,
      goldModifiers,
      materialChips: materialResult.chips,
      materialMult: materialResult.mult,
      materialMultX: materialResult.multX,
      totalChips,
      totalMult,
      totalGold,
      finalScore,
      guzhuyizhiFailed: (effectContext as any).guzhuyizhiFailed ?? false,
    };
  }

  /**
   * Format score breakdown for display/animation.
   */
  public static formatScoreBreakdown(breakdown: ScoreBreakdown): string {
    let output = '=== Score Breakdown ===\n\n';

    // Fans (multiplicative)
    output += '[ Fans ]\n';
    for (const fc of breakdown.fanContributions) {
      output += `  ${fc.fan.name}: ×${fc.multiplier}\n`;
    }
    output += `  Combined fan multiplier: ×${breakdown.fanMultiplier}\n\n`;

    // Base
    output += `[ Base Score: ${breakdown.baseScore} ]\n\n`;

    // Modifiers
    if (breakdown.chipModifiers.length > 0 || breakdown.multModifiers.length > 0 || breakdown.goldModifiers.length > 0) {
      output += '[ Modifiers ]\n';
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

    // Final
    output += '[ Final Score ]\n';
    output += `  ${breakdown.totalChips} base × ${breakdown.totalMult.toFixed(1)} mult = ${breakdown.finalScore} points\n`;

    return output;
  }

  /**
   * Legacy helper: Check if a score result meets a winning threshold.
   */
  public static isWinningScore(breakdown: ScoreBreakdown, threshold: number = 100): boolean {
    return breakdown.finalScore >= threshold;
  }

  /**
   * Calculate score with full bond integration.
   * Enhanced scoring that includes bond effects from GodTileManager.
   */
  public static calculateScoreWithBonds(
    hand: Tile[],
    detectedFans: Fan[],
    activeGodTiles: GodTile[] = [],
    godTileManager: GodTileManager | null = null,
    options: ScoringOptions & {
      gold?: number;
      meldMultiplier?: number;
      flowerCardManager?: FlowerCardManager | null;
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

    // Apply permanent fan boosts from spring season cards / 玉兰花开
    const fcm = options.flowerCardManager;
    let permanentFanBoostMult = 0;
    if (fcm) {
      for (const fan of detectedFans) {
        const boost = fcm.getPermanentFanBoost(fan.name);
        if (boost > 0) {
          permanentFanBoostMult += boost;
          bondEffects.push(`${fan.name} 永久加成: +${boost}倍率`);
        }
      }
    }

    // If no GodTileManager and no permanent boosts, return base breakdown
    if (!godTileManager && permanentFanBoostMult === 0) {
      return { ...baseBreakdown, bondEffects, rouletteResult };
    }

    // Count material tiles in the hand
    const materialTileCount = hand.filter(t => t.material && t.material !== Material.NONE).length;

    // Calculate bond scoring bonuses (only if manager exists)
    const bondBonus = godTileManager
      ? godTileManager.calculateBondScoringBonus({
          gold: options.gold ?? 0,
          materialTileCount
        })
      : { additiveMult: 0, multiplicativeMult: 1, description: [] as string[] };

    bondEffects.push(...bondBonus.description);

    // Apply bond bonuses to totals
    let totalChips = baseBreakdown.totalChips;
    let totalMult = baseBreakdown.totalMult + bondBonus.additiveMult + permanentFanBoostMult;

    // Apply multiplicative mult from bonds
    totalMult *= bondBonus.multiplicativeMult;

    // Apply meld multiplier (出牌倍率)
    if (options.meldMultiplier && options.meldMultiplier > 1) {
      totalMult *= options.meldMultiplier;
      bondEffects.push(`出牌倍率: ×${options.meldMultiplier}`);
    }

    // Calculate score before roulette
    let finalScore = Math.floor(totalChips * totalMult);

    // Check for Gamble Lv3 roulette
    if (godTileManager?.shouldShowRoulette()) {
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
      rouletteResult,
      guzhuyizhiFailed: baseBreakdown.guzhuyizhiFailed,
    };
  }
}
