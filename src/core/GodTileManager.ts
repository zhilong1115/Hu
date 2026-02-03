/**
 * GodTileManager - Manages owned god tiles and bond levels
 * 
 * Features:
 * - Track owned god tiles (max 7)
 * - Calculate bond levels based on owned tiles
 * - Handle auto-unlock for gold tiles
 * - Provide helper methods for game logic
 */

import {
  GodTile,
  GodTileBond,
  GodTileRarity,
  BOND_LEVELS,
  ALL_GOD_TILES,
  getGodTilesByBond,
  getGodTileById
} from '../data/godTiles';
import { Material } from '../data/materials';
import { Tile } from './Tile';

export const MAX_GOD_TILES = 7;

export interface BondStatus {
  bond: GodTileBond;
  ownedCount: number;
  level: number;
  levelName: string;
  nextLevelRequired: number | null;
  activeEffects: string[];
}

export class GodTileManager {
  private ownedTiles: GodTile[] = [];
  
  constructor(initialTiles: GodTile[] = []) {
    this.ownedTiles = [...initialTiles];
    this.checkAutoUnlocks();
  }
  
  // ─── Core Methods ────────────────────────────────────────────────────────
  
  /** Get all owned god tiles */
  getOwnedTiles(): GodTile[] {
    return [...this.ownedTiles];
  }
  
  /** Get number of owned god tiles */
  getOwnedCount(): number {
    return this.ownedTiles.length;
  }
  
  /** Check if at max capacity */
  isFull(): boolean {
    return this.ownedTiles.length >= MAX_GOD_TILES;
  }
  
  /** Check if a specific god tile is owned */
  hasGodTile(tileId: string): boolean {
    return this.ownedTiles.some(t => t.id === tileId);
  }
  
  /** Add a god tile (returns false if full or already owned) */
  addGodTile(tile: GodTile): boolean {
    if (this.isFull()) {
      console.warn('Cannot add god tile: at max capacity');
      return false;
    }
    
    if (this.hasGodTile(tile.id)) {
      console.warn('Cannot add god tile: already owned');
      return false;
    }
    
    this.ownedTiles.push(tile);
    this.checkAutoUnlocks();
    return true;
  }
  
  /** Add a god tile by ID */
  addGodTileById(tileId: string): boolean {
    const tile = getGodTileById(tileId);
    if (!tile) {
      console.warn(`God tile not found: ${tileId}`);
      return false;
    }
    return this.addGodTile(tile);
  }
  
  /** Remove a god tile (returns the removed tile or null) */
  removeGodTile(tileId: string): GodTile | null {
    const index = this.ownedTiles.findIndex(t => t.id === tileId);
    if (index === -1) {
      return null;
    }
    
    const [removed] = this.ownedTiles.splice(index, 1);
    
    // Check if any auto-unlock tiles should be removed
    this.checkAutoUnlockRemovals();
    
    return removed;
  }
  
  /** Clear all owned tiles */
  clearAll(): void {
    this.ownedTiles = [];
  }
  
  // ─── Bond Methods ────────────────────────────────────────────────────────
  
  /** Get owned tiles of a specific bond */
  getOwnedByBond(bond: GodTileBond): GodTile[] {
    return this.ownedTiles.filter(t => t.bond === bond);
  }
  
  /** Get count of owned tiles for a bond */
  getBondCount(bond: GodTileBond): number {
    return this.getOwnedByBond(bond).length;
  }
  
  /** Get the current level for a bond (0 = no bonus, 1-3 = active levels) */
  getBondLevel(bond: GodTileBond): number {
    const count = this.getBondCount(bond);
    const levels = BOND_LEVELS[bond];
    
    let activeLevel = 0;
    for (const level of levels) {
      if (count >= level.required) {
        activeLevel = level.level;
      }
    }
    
    return activeLevel;
  }
  
  /** Get detailed status for a bond */
  getBondStatus(bond: GodTileBond): BondStatus {
    const count = this.getBondCount(bond);
    const level = this.getBondLevel(bond);
    const levels = BOND_LEVELS[bond];
    
    // Get current level info
    const currentLevelInfo = levels.find(l => l.level === level);
    const nextLevelInfo = levels.find(l => l.level === level + 1);
    
    // Collect all active effects
    const activeEffects: string[] = [];
    for (const l of levels) {
      if (count >= l.required) {
        activeEffects.push(l.effect);
      }
    }
    
    return {
      bond,
      ownedCount: count,
      level,
      levelName: currentLevelInfo?.name ?? '无',
      nextLevelRequired: nextLevelInfo?.required ?? null,
      activeEffects
    };
  }
  
  /** Get status for all bonds */
  getAllBondStatuses(): BondStatus[] {
    return Object.values(GodTileBond).map(bond => this.getBondStatus(bond));
  }
  
  // ─── Auto-Unlock Logic ───────────────────────────────────────────────────
  
  /** Check and add auto-unlock gold tiles */
  private checkAutoUnlocks(): void {
    // Check gamble bond for 概率之骰
    const gambleTiles = this.getOwnedByBond(GodTileBond.GAMBLE);
    const nonGoldGambleTiles = gambleTiles.filter(t => t.rarity !== GodTileRarity.GOLD);
    
    // If we have all 6 non-gold gamble tiles, auto-unlock 概率之骰
    if (nonGoldGambleTiles.length === 6 && !this.hasGodTile('gamble_probability_dice')) {
      const dice = getGodTileById('gamble_probability_dice');
      if (dice && !this.isFull()) {
        this.ownedTiles.push(dice);
        console.log('Auto-unlocked: 概率之骰');
      }
    }
  }
  
  /** Check if any auto-unlock tiles should be removed */
  private checkAutoUnlockRemovals(): void {
    // If 概率之骰 is owned but we don't have all 6 non-gold gamble tiles anymore
    if (this.hasGodTile('gamble_probability_dice')) {
      const gambleTiles = this.getOwnedByBond(GodTileBond.GAMBLE);
      const nonGoldGambleTiles = gambleTiles.filter(t => t.rarity !== GodTileRarity.GOLD);
      
      if (nonGoldGambleTiles.length < 6) {
        this.ownedTiles = this.ownedTiles.filter(t => t.id !== 'gamble_probability_dice');
        console.log('Removed auto-unlock: 概率之骰');
      }
    }
  }
  
  // ─── Effect Queries ──────────────────────────────────────────────────────
  
  /** Get all tiles with a specific trigger */
  getTilesWithTrigger(trigger: string): GodTile[] {
    return this.ownedTiles.filter(t => t.effect.trigger === trigger);
  }
  
  // ─── Round Start Effects (Transform Bond) ─────────────────────────────────
  
  /**
   * Map from targetMaterial string to Material enum
   */
  private static readonly MATERIAL_MAP: Record<string, Material> = {
    'copper': Material.BRONZE,
    'bronze': Material.BRONZE,
    'ice': Material.ICE,
    'bamboo': Material.BAMBOO,
    'silver': Material.SILVER,
    'glass': Material.GLASS,
    'gold': Material.GOLD,
    'glazed': Material.COLORED_GLASS,
    'colored_glass': Material.COLORED_GLASS,
    'jade': Material.JADE,
  };
  
  /**
   * Apply all round start effects to the player's hand tiles.
   * This should be called after dealing the initial hand but before displaying.
   * 
   * @param tiles - The hand tiles to apply effects to
   * @returns Array of descriptions of effects that were applied
   */
  applyRoundStartEffects(tiles: Tile[]): string[] {
    const descriptions: string[] = [];
    const roundStartTiles = this.getTilesWithTrigger('onRoundStart');
    
    for (const godTile of roundStartTiles) {
      const effect = godTile.effect;
      
      // Handle transform effects (转化系神牌)
      if (effect.targetMaterial) {
        const targetMaterial = GodTileManager.MATERIAL_MAP[effect.targetMaterial];
        if (!targetMaterial) continue;
        
        // Check for upgrade effects (点石成金, 点石成玉)
        if (effect.condition?.includes('升级') || effect.condition?.includes('铜/银')) {
          // Upgrade all bronze/silver tiles to target material
          const upgradedCount = this.upgradeMetalTilesToMaterial(tiles, targetMaterial);
          if (upgradedCount > 0) {
            descriptions.push(`${godTile.name}: ${upgradedCount}张牌 → ${this.getMaterialName(targetMaterial)}`);
          }
        } else if (effect.tileCount && effect.tileCount > 0) {
          // Apply material to random tiles
          const applied = this.applyMaterialToRandomTiles(tiles, targetMaterial, effect.tileCount);
          if (applied > 0) {
            descriptions.push(`${godTile.name}: ${applied}张牌 → ${this.getMaterialName(targetMaterial)}`);
          }
        }
      }
    }
    
    return descriptions;
  }
  
  /**
   * Apply a material to random tiles that don't already have a material
   */
  private applyMaterialToRandomTiles(tiles: Tile[], material: Material, count: number): number {
    // Filter tiles without materials
    const eligibleTiles = tiles.filter(t => !t.material || t.material === Material.NONE);
    
    if (eligibleTiles.length === 0) return 0;
    
    // Shuffle and pick up to count tiles
    const shuffled = [...eligibleTiles].sort(() => Math.random() - 0.5);
    const toApply = shuffled.slice(0, Math.min(count, shuffled.length));
    
    for (const tile of toApply) {
      tile.material = material;
    }
    
    return toApply.length;
  }
  
  /**
   * Upgrade all bronze/silver tiles to the target material (for 点石成金/点石成玉)
   */
  private upgradeMetalTilesToMaterial(tiles: Tile[], targetMaterial: Material): number {
    let upgradedCount = 0;
    
    for (const tile of tiles) {
      if (tile.material === Material.BRONZE || tile.material === Material.SILVER) {
        tile.material = targetMaterial;
        upgradedCount++;
      }
    }
    
    return upgradedCount;
  }
  
  /**
   * Get Chinese name for a material
   */
  private getMaterialName(material: Material): string {
    const names: Record<Material, string> = {
      [Material.NONE]: '无',
      [Material.BRONZE]: '铜牌 🥉',
      [Material.SILVER]: '银牌 🥈',
      [Material.GOLD]: '金牌 🥇',
      [Material.BAMBOO]: '竹牌 🎋',
      [Material.ICE]: '冰牌 🧊',
      [Material.GLASS]: '玻璃牌 🫧',
      [Material.COLORED_GLASS]: '琉璃牌 🔮',
      [Material.JADE]: '玉牌 🍀',
      [Material.PORCELAIN]: '瓷牌 🏺',
      [Material.EMERALD]: '翡翠牌 💎',
    };
    return names[material] || material;
  }
  
  /** Check if any probability bonuses apply (from 赌博 bond) */
  getProbabilityBonus(): number {
    const level = this.getBondLevel(GodTileBond.GAMBLE);
    if (level >= 1) {
      return 0.1; // +10% to all probability effects
    }
    return 0;
  }
  
  /** Check if negative probability effects are blocked (赌王 level) */
  isNegativeBlocked(): boolean {
    return this.getBondLevel(GodTileBond.GAMBLE) >= 2;
  }
  
  /** Check if all probabilities are 100% (概率之骰) */
  isGuaranteedProbability(): boolean {
    return this.hasGodTile('gamble_probability_dice');
  }
  
  /** Calculate probability with bonuses */
  calculateProbability(baseProbability: number): number {
    if (this.isGuaranteedProbability()) {
      return 1.0;
    }
    
    const bonus = this.getProbabilityBonus();
    return Math.min(1.0, baseProbability + bonus);
  }
  
  /** Roll with probability (considering bonuses) */
  rollProbability(baseProbability: number): { success: boolean; rolledValue: number } {
    const actualProbability = this.calculateProbability(baseProbability);
    const roll = Math.random();
    
    return {
      success: roll < actualProbability,
      rolledValue: roll
    };
  }
  
  // ─── Wealth Bond Queries ─────────────────────────────────────────────────
  
  /** Calculate multiplier bonus from gold (财运 bond) */
  calculateGoldMultiplier(currentGold: number): number {
    const level = this.getBondLevel(GodTileBond.WEALTH);
    
    if (level === 0) return 0;
    
    if (level === 1) {
      // 每 50金币 → +1倍率
      return Math.floor(currentGold / 50);
    } else if (level === 2) {
      // 每 30金币 → +1倍率
      return Math.floor(currentGold / 30);
    } else {
      // 每 20金币 → ×1.5倍率 (this is multiplicative, so return the mult factor)
      const stacks = Math.floor(currentGold / 20);
      return Math.pow(1.5, stacks);
    }
  }
  
  /** Check for 福禄寿 effects */
  hasThreeStarsBonus(currentGold: number): boolean {
    return this.hasGodTile('wealth_three_stars') && currentGold > 200;
  }
  
  /** Check if selling is blocked (貔貅) */
  isSellingBlocked(): boolean {
    return this.hasGodTile('wealth_pixiu');
  }
  
  /** Get gold gain multiplier (from 貔貅) */
  getGoldGainMultiplier(): number {
    if (this.hasGodTile('wealth_pixiu')) {
      return 1.5;
    }
    return 1.0;
  }
  
  // ─── Transform Bond Queries ──────────────────────────────────────────────
  
  /** Get material multiplier bonus (转化 bond) */
  getMaterialMultiplier(): number {
    const level = this.getBondLevel(GodTileBond.TRANSFORM);
    
    if (level === 0) return 0;
    if (level === 1) return 1;  // +1 per material tile
    if (level === 2) return 2;  // +2 per material tile
    return 0; // Level 3 uses ×1.5 per tile instead
  }
  
  /** Check if level 3 transform is active (×1.5 per material) */
  isMaterialMultiplicative(): boolean {
    return this.getBondLevel(GodTileBond.TRANSFORM) >= 3;
  }
  
  /** Get material shatter reduction */
  getShatterReduction(): number {
    const level = this.getBondLevel(GodTileBond.TRANSFORM);
    if (level >= 3) return 1.0; // No shatter at all
    if (level >= 2) return 0.5; // 50% reduced shatter
    return 0;
  }
  
  // ─── Vision Bond Queries ─────────────────────────────────────────────────
  
  /** Get number of visible tiles at top of deck (洞察 bond) */
  getVisibleTileCount(): number {
    const level = this.getBondLevel(GodTileBond.VISION);
    if (level >= 3) {
      return Infinity; // All tiles visible
    }
    if (level >= 1) {
      return 2; // 2 tiles visible after each play
    }
    return 0;
  }
  
  /** Check if player can pick from visible tiles (操纵师) */
  canPickFromVisible(): boolean {
    return this.getBondLevel(GodTileBond.VISION) >= 2;
  }
  
  // ─── Scoring Integration ─────────────────────────────────────────────────
  
  /**
   * Calculate all bond-based scoring bonuses for hu
   * Returns additive mult bonus and multiplicative mult bonus
   */
  calculateBondScoringBonus(context: {
    gold: number;
    materialTileCount: number;
  }): { 
    additiveMult: number; 
    multiplicativeMult: number;
    description: string[];
  } {
    let additiveMult = 0;
    let multiplicativeMult = 1;
    const descriptions: string[] = [];
    
    // Wealth Bond (财运)
    const wealthLevel = this.getBondLevel(GodTileBond.WEALTH);
    if (wealthLevel === 1) {
      // 每 50金币 → +1倍率
      const bonus = Math.floor(context.gold / 50);
      if (bonus > 0) {
        additiveMult += bonus;
        descriptions.push(`财源广进: ${context.gold}金币 → +${bonus}倍率`);
      }
    } else if (wealthLevel === 2) {
      // 每 30金币 → +1倍率
      const bonus = Math.floor(context.gold / 30);
      if (bonus > 0) {
        additiveMult += bonus;
        descriptions.push(`点石成金: ${context.gold}金币 → +${bonus}倍率`);
      }
    } else if (wealthLevel >= 3) {
      // 每 20金币 → ×1.5倍率
      const stacks = Math.floor(context.gold / 20);
      if (stacks > 0) {
        const mult = Math.pow(1.5, stacks);
        multiplicativeMult *= mult;
        descriptions.push(`富可敌国: ${context.gold}金币 → ×${mult.toFixed(2)}倍率`);
      }
    }
    
    // Transform Bond (转化)
    const transformLevel = this.getBondLevel(GodTileBond.TRANSFORM);
    if (transformLevel === 1) {
      // 每张材质牌 → +1倍率
      if (context.materialTileCount > 0) {
        additiveMult += context.materialTileCount;
        descriptions.push(`偷天换日: ${context.materialTileCount}张材质牌 → +${context.materialTileCount}倍率`);
      }
    } else if (transformLevel === 2) {
      // 每张材质牌 → +2倍率
      if (context.materialTileCount > 0) {
        const bonus = context.materialTileCount * 2;
        additiveMult += bonus;
        descriptions.push(`造物主: ${context.materialTileCount}张材质牌 → +${bonus}倍率`);
      }
    } else if (transformLevel >= 3) {
      // 每张材质牌 → ×1.5倍率
      if (context.materialTileCount > 0) {
        const mult = Math.pow(1.5, context.materialTileCount);
        multiplicativeMult *= mult;
        descriptions.push(`万象归一: ${context.materialTileCount}张材质牌 → ×${mult.toFixed(2)}倍率`);
      }
    }
    
    // 福禄寿 special effect (gold > 200 → all mult ×2)
    if (this.hasThreeStarsBonus(context.gold)) {
      multiplicativeMult *= 2;
      descriptions.push(`福禄寿: 金币>${context.gold} → 全部倍率×2`);
    }
    
    return { additiveMult, multiplicativeMult, description: descriptions };
  }
  
  /**
   * Apply Gamble bond Lv3 roulette effect
   * Returns a multiplier result: { operation: '+' | '-' | '×', value: 1 | 3 | 5 | 9 }
   */
  rollGambleRoulette(): { operation: '+' | '-' | '×'; value: number; resultMult: number } | null {
    const level = this.getBondLevel(GodTileBond.GAMBLE);
    if (level < 3) return null;
    
    const operations: ('+' | '-' | '×')[] = ['+', '-', '×'];
    const values = [1, 3, 5, 9];
    
    const operation = operations[Math.floor(Math.random() * operations.length)];
    const value = values[Math.floor(Math.random() * values.length)];
    
    let resultMult = 1;
    switch (operation) {
      case '+':
        // +value to multiplier (we return it as a multiplier effect)
        // This will be applied as additive mult
        resultMult = value; // Will be added
        break;
      case '-':
        // -value from multiplier
        resultMult = -value; // Will be subtracted
        break;
      case '×':
        // ×value to score
        resultMult = value; // Will multiply final score
        break;
    }
    
    return { operation, value, resultMult };
  }
  
  /**
   * Check if should show roulette on score settlement
   */
  shouldShowRoulette(): boolean {
    return this.getBondLevel(GodTileBond.GAMBLE) >= 3;
  }
  
  /**
   * Get the number of visible deck tiles to reveal after a meld
   * Vision bond Lv1: 2 tiles visible after each meld
   */
  getVisibleTilesAfterMeld(): number {
    const level = this.getBondLevel(GodTileBond.VISION);
    if (level >= 3) {
      return Infinity; // All visible
    }
    if (level >= 1) {
      return 2;
    }
    return 0;
  }
  
  /**
   * Check if entire deck should be visible
   */
  isFullDeckVisible(): boolean {
    return this.getBondLevel(GodTileBond.VISION) >= 3;
  }
  
  /**
   * Get the number of extra flower cards to show during selection
   * Based on god tile effects
   */
  getExtraFlowerCardChoices(): number {
    let extra = 0;
    
    // 灵光一闪: 抽花牌时，额外多看 1张 再选
    if (this.hasGodTile('vision_inspiration')) {
      extra += 1;
    }
    
    return extra;
  }
  
  /**
   * Get gold bonus on meld (from 招财猫)
   */
  getMeldGoldBonus(): number {
    if (this.hasGodTile('wealth_lucky_cat')) {
      return 8;
    }
    return 0;
  }
  
  /**
   * Get gold bonus per discarded tile (from 金蟾)
   */
  getDiscardGoldBonus(): number {
    if (this.hasGodTile('wealth_golden_toad')) {
      return 3;
    }
    return 0;
  }
  
  /**
   * Calculate round start gold bonus (from 财神)
   */
  getRoundStartGoldBonus(): number {
    if (this.hasGodTile('wealth_god_of_wealth')) {
      return 15;
    }
    return 0;
  }
  
  /**
   * Get gold earned at round end (from various god tiles)
   */
  calculateRoundEndGold(context: {
    currentGold: number;
    flowerCardCount: number;
  }): { gold: number; descriptions: string[] } {
    let gold = 0;
    const descriptions: string[] = [];
    
    // 聚宝盆: 回合结束时，获得 当前金币10% 的额外金币
    if (this.hasGodTile('wealth_treasure_bowl')) {
      const bonus = Math.floor(context.currentGold * 0.1);
      gold += bonus;
      if (bonus > 0) {
        descriptions.push(`聚宝盆: +${bonus}金币 (${context.currentGold}的10%)`);
      }
    }
    
    // 摇钱树: 每持有1张花牌，回合结束 +5金币
    if (this.hasGodTile('wealth_money_tree')) {
      const bonus = context.flowerCardCount * 5;
      gold += bonus;
      if (bonus > 0) {
        descriptions.push(`摇钱树: +${bonus}金币 (${context.flowerCardCount}张花牌×5)`);
      }
    }
    
    // 财运亨通: 回合结束 50% +15金币，失败-5金币
    if (this.hasGodTile('gamble_fortune_flow')) {
      const { success } = this.rollProbability(0.5);
      if (success || this.isNegativeBlocked()) {
        gold += 15;
        descriptions.push(`财运亨通: +15金币 (成功!)`);
      } else {
        gold -= 5;
        descriptions.push(`财运亨通: -5金币 (失败)`);
      }
    }
    
    // Apply 貔貅 modifier
    const gainMult = this.getGoldGainMultiplier();
    if (gainMult > 1 && gold > 0) {
      const originalGold = gold;
      gold = Math.floor(gold * gainMult);
      descriptions.push(`貔貅: 金币+50% (${originalGold} → ${gold})`);
    }
    
    return { gold, descriptions };
  }
  
  // ─── Serialization ───────────────────────────────────────────────────────
  
  /** Export state for saving */
  toJSON(): { ownedTileIds: string[] } {
    return {
      ownedTileIds: this.ownedTiles.map(t => t.id)
    };
  }
  
  /** Import state from save */
  static fromJSON(data: { ownedTileIds: string[] }): GodTileManager {
    const tiles = data.ownedTileIds
      .map(id => getGodTileById(id))
      .filter((t): t is GodTile => t !== undefined);
    
    return new GodTileManager(tiles);
  }
}

// ─── Singleton Instance (optional, for global access) ──────────────────────

let globalManager: GodTileManager | null = null;

export function getGlobalGodTileManager(): GodTileManager {
  if (!globalManager) {
    globalManager = new GodTileManager();
  }
  return globalManager;
}

export function setGlobalGodTileManager(manager: GodTileManager): void {
  globalManager = manager;
}

export function resetGlobalGodTileManager(): void {
  globalManager = new GodTileManager();
}
