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
