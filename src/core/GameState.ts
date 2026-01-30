import { Tile, isSameTile, tileKey } from './Tile';
import { FanEvaluator, MeldCombo, EvaluationResult } from './FanEvaluator';

// ─── Types ──────────────────────────────────────────────────────────────────

export type MeldType = 'chow' | 'pong' | 'kong';

export interface PlayedMeld {
  type: MeldType;
  tiles: Tile[];
  multiplier: number;
}

export interface GameConfig {
  initialPlayActions: number;
  initialDiscardActions: number;
  maxDiscardTiles: number;
  baseScore: number;
  unusedPlayBonus: number;
  unusedDiscardBonus: number;
}

export interface WinConditionResult {
  isWinning: boolean;
  reason?: string;
  evaluation?: EvaluationResult;
}

export interface GameStateSnapshot {
  handTiles: Tile[];
  playedMelds: PlayedMeld[];
  playActionsRemaining: number;
  discardActionsRemaining: number;
  accumulatedMultiplier: number;
  discardCount: number;
  lastPlayWasKong: boolean;
}

// ─── Multiplier Constants ───────────────────────────────────────────────────

export const MELD_MULTIPLIERS: Record<MeldType, number> = {
  chow: 1.0,  // No multiplier, but get flower card
  pong: 1.0,  // No multiplier, but get flower card
  kong: 3.0,  // Has multiplier AND get flower card
};

// How many flower cards to choose from for each meld type
export const MELD_FLOWER_CHOICES: Record<MeldType, number> = {
  chow: 2,
  pong: 3,
  kong: 5,
};

// ─── Special Achievement Multipliers ────────────────────────────────────────

export const ACHIEVEMENT_MULTIPLIERS = {
  tianhu: 10,      // 天胡: Win on starting hand
  dihu: 5,         // 地胡: Win after 1 discard
  gangshangkaihua: 3,  // 杠上开花: Win on kong draw
  haidilao: 2,     // 海底捞月: Win on last play action
};

// ─── Default Config ─────────────────────────────────────────────────────────

export const DEFAULT_GAME_CONFIG: GameConfig = {
  initialPlayActions: 4,
  initialDiscardActions: 2,
  maxDiscardTiles: 5,
  baseScore: 100,
  unusedPlayBonus: 3,
  unusedDiscardBonus: 2,
};

// ─── Game State Class ───────────────────────────────────────────────────────

export class GameState {
  private _handTiles: Tile[] = [];
  private _playedMelds: PlayedMeld[] = [];
  private _playActionsRemaining: number;
  private _discardActionsRemaining: number;
  private _accumulatedMultiplier: number = 1;
  private _discardCount: number = 0;
  private _lastPlayWasKong: boolean = false;
  private _drawPile: Tile[] = [];
  private _config: GameConfig;

  constructor(config: Partial<GameConfig> = {}) {
    this._config = { ...DEFAULT_GAME_CONFIG, ...config };
    this._playActionsRemaining = this._config.initialPlayActions;
    this._discardActionsRemaining = this._config.initialDiscardActions;
  }

  // ─── Getters ────────────────────────────────────────────────────────────

  get handTiles(): Tile[] { return [...this._handTiles]; }
  get playedMelds(): PlayedMeld[] { return [...this._playedMelds]; }
  get playActionsRemaining(): number { return this._playActionsRemaining; }
  get discardActionsRemaining(): number { return this._discardActionsRemaining; }
  get accumulatedMultiplier(): number { return this._accumulatedMultiplier; }
  get discardCount(): number { return this._discardCount; }
  get config(): GameConfig { return this._config; }

  // ─── Initialization ─────────────────────────────────────────────────────

  initialize(handTiles: Tile[], drawPile: Tile[]): void {
    this._handTiles = [...handTiles];
    this._drawPile = [...drawPile];
    this._playedMelds = [];
    this._accumulatedMultiplier = 1;
    this._discardCount = 0;
    this._lastPlayWasKong = false;
    this._playActionsRemaining = this._config.initialPlayActions;
    this._discardActionsRemaining = this._config.initialDiscardActions;
  }

  // ─── Validation Methods ─────────────────────────────────────────────────

  canPlayChow(tiles: Tile[]): boolean {
    if (tiles.length !== 3) return false;
    if (this._playActionsRemaining <= 0) return false;

    // Must be same suit and numbered
    const suits = new Set(tiles.map(t => t.suit));
    if (suits.size !== 1) return false;
    const suit = tiles[0].suit;
    if (suit === 'wind' || suit === 'dragon') return false;

    // Must be consecutive
    const values = tiles.map(t => t.value).sort((a, b) => a - b);
    return values[1] === values[0] + 1 && values[2] === values[1] + 1;
  }

  canPlayPong(tiles: Tile[]): boolean {
    if (tiles.length !== 3) return false;
    if (this._playActionsRemaining <= 0) return false;

    // All tiles must be the same
    const key = tileKey(tiles[0]);
    return tiles.every(t => tileKey(t) === key);
  }

  canPlayKong(tiles: Tile[]): boolean {
    if (tiles.length !== 4) return false;
    if (this._playActionsRemaining <= 0) return false;

    // All tiles must be the same
    const key = tileKey(tiles[0]);
    return tiles.every(t => tileKey(t) === key);
  }

  canDiscard(count: number): boolean {
    if (this._discardActionsRemaining <= 0) return false;
    if (count < 1 || count > this._config.maxDiscardTiles) return false;
    if (count > this._handTiles.length) return false;
    return true;
  }

  // ─── Play Actions ───────────────────────────────────────────────────────

  playChow(tiles: Tile[]): boolean {
    if (!this.canPlayChow(tiles)) return false;
    return this._executeMeld('chow', tiles);
  }

  playPong(tiles: Tile[]): boolean {
    if (!this.canPlayPong(tiles)) return false;
    return this._executeMeld('pong', tiles);
  }

  playKong(tiles: Tile[]): boolean {
    if (!this.canPlayKong(tiles)) return false;
    const success = this._executeMeld('kong', tiles);
    
    if (success) {
      this._lastPlayWasKong = true;
      // Kong draws 1 tile
      if (this._drawPile.length > 0) {
        const drawnTile = this._drawPile.shift()!;
        this._handTiles.push(drawnTile);
      }
    }
    
    return success;
  }

  private _executeMeld(type: MeldType, tiles: Tile[]): boolean {
    // Remove tiles from hand
    for (const tile of tiles) {
      const index = this._handTiles.findIndex(t => isSameTile(t, tile));
      if (index === -1) return false;
      this._handTiles.splice(index, 1);
    }

    // Add to played melds
    const multiplier = MELD_MULTIPLIERS[type];
    this._playedMelds.push({ type, tiles: [...tiles], multiplier });

    // Update accumulated multiplier
    this._accumulatedMultiplier *= multiplier;

    // Consume action
    this._playActionsRemaining--;

    // Reset kong flag if not kong
    if (type !== 'kong') {
      this._lastPlayWasKong = false;
    }

    return true;
  }

  // ─── Discard Action ─────────────────────────────────────────────────────

  discard(tiles: Tile[]): Tile[] {
    if (!this.canDiscard(tiles.length)) return [];

    // Remove tiles from hand
    const removedTiles: Tile[] = [];
    for (const tile of tiles) {
      const index = this._handTiles.findIndex(t => isSameTile(t, tile));
      if (index !== -1) {
        removedTiles.push(this._handTiles.splice(index, 1)[0]);
      }
    }

    // Draw same number of new tiles
    const drawnTiles: Tile[] = [];
    for (let i = 0; i < removedTiles.length && this._drawPile.length > 0; i++) {
      const drawnTile = this._drawPile.shift()!;
      this._handTiles.push(drawnTile);
      drawnTiles.push(drawnTile);
    }

    // Update state
    this._discardActionsRemaining--;
    this._discardCount++;
    this._lastPlayWasKong = false;

    return drawnTiles;
  }

  // ─── Win Condition Check ────────────────────────────────────────────────

  checkWinCondition(): WinConditionResult {
    // Combine played melds with remaining hand tiles
    const allTiles: Tile[] = [];
    
    // Add tiles from played melds
    for (const meld of this._playedMelds) {
      allTiles.push(...meld.tiles);
    }
    
    // Add remaining hand tiles
    allTiles.push(...this._handTiles);

    // Must have exactly 14 tiles total
    if (allTiles.length !== 14) {
      return {
        isWinning: false,
        reason: `需要14张牌，当前${allTiles.length}张`
      };
    }

    // Special case: No melds played (七对, 国士无双, 豪华七对, 连七对)
    if (this._playedMelds.length === 0) {
      const evaluation = FanEvaluator.evaluateHand(allTiles);
      if (evaluation.isWinning) {
        return { isWinning: true, evaluation };
      }
      return {
        isWinning: false,
        reason: '牌型无法胡牌'
      };
    }

    // Standard case: Check if remaining tiles form valid structure
    // Remaining tiles should be either a pair (if 4 melds played) or form melds + pair
    const remainingCount = this._handTiles.length;
    
    if (remainingCount === 2) {
      // Should be a pair
      if (this._handTiles.length === 2 && 
          tileKey(this._handTiles[0]) === tileKey(this._handTiles[1])) {
        // Valid! All 4 melds played + 1 pair remaining
        const evaluation = FanEvaluator.evaluateHand(allTiles);
        return { isWinning: true, evaluation };
      }
      return {
        isWinning: false,
        reason: '剩余2张牌必须是对子'
      };
    }

    // For other remaining counts, check if the full hand is valid
    const evaluation = FanEvaluator.evaluateHand(allTiles);
    if (evaluation.isWinning) {
      return { isWinning: true, evaluation };
    }

    return {
      isWinning: false,
      reason: '牌型无法胡牌'
    };
  }

  // ─── Score Calculation ──────────────────────────────────────────────────

  calculateFinalScore(evaluation: EvaluationResult): {
    baseScore: number;
    meldMultiplier: number;
    fanMultiplier: number;
    achievementMultiplier: number;
    bonusGold: number;
    finalScore: number;
    breakdown: string[];
  } {
    const breakdown: string[] = [];
    
    // Base score
    const baseScore = this._config.baseScore;
    breakdown.push(`基础分: ${baseScore}`);

    // Meld multiplier (accumulated from plays)
    const meldMultiplier = this._accumulatedMultiplier;
    if (meldMultiplier > 1) {
      breakdown.push(`出牌倍率: ×${meldMultiplier.toFixed(1)}`);
    }

    // Fan multiplier from evaluation
    let fanMultiplier = 1;
    for (const fan of evaluation.fans) {
      // Map fan points to multiplier
      const mult = this._getFanMultiplier(fan.points);
      fanMultiplier *= mult;
      breakdown.push(`${fan.name}: ×${mult}`);
    }

    // Achievement multipliers
    let achievementMultiplier = 1;
    
    // 天胡: Win without any plays or discards
    if (this._playedMelds.length === 0 && this._discardCount === 0) {
      achievementMultiplier *= ACHIEVEMENT_MULTIPLIERS.tianhu;
      breakdown.push(`天胡: ×${ACHIEVEMENT_MULTIPLIERS.tianhu}`);
    }
    // 地胡: Win after only 1 discard
    else if (this._playedMelds.length === 0 && this._discardCount === 1) {
      achievementMultiplier *= ACHIEVEMENT_MULTIPLIERS.dihu;
      breakdown.push(`地胡: ×${ACHIEVEMENT_MULTIPLIERS.dihu}`);
    }
    
    // 杠上开花: Win after kong draw
    if (this._lastPlayWasKong) {
      achievementMultiplier *= ACHIEVEMENT_MULTIPLIERS.gangshangkaihua;
      breakdown.push(`杠上开花: ×${ACHIEVEMENT_MULTIPLIERS.gangshangkaihua}`);
    }

    // 海底捞月: Win on last play action
    if (this._playActionsRemaining === 0) {
      achievementMultiplier *= ACHIEVEMENT_MULTIPLIERS.haidilao;
      breakdown.push(`海底捞月: ×${ACHIEVEMENT_MULTIPLIERS.haidilao}`);
    }

    // Bonus gold from unused actions
    const bonusGold = 
      this._playActionsRemaining * this._config.unusedPlayBonus +
      this._discardActionsRemaining * this._config.unusedDiscardBonus;
    
    if (bonusGold > 0) {
      breakdown.push(`剩余行动奖励: +${bonusGold}金币`);
    }

    // Final calculation
    const finalScore = Math.floor(
      baseScore * meldMultiplier * fanMultiplier * achievementMultiplier
    );

    breakdown.push(`─────────────`);
    breakdown.push(`最终得分: ${finalScore}`);

    return {
      baseScore,
      meldMultiplier,
      fanMultiplier,
      achievementMultiplier,
      bonusGold,
      finalScore,
      breakdown
    };
  }

  private _getFanMultiplier(points: number): number {
    // Map fan points to multipliers (based on our design doc)
    if (points >= 88) return 13;  // 国士无双等
    if (points >= 64) return 10;  // 豪华七对、字一色等
    if (points >= 48) return 10;  // 连七对
    if (points >= 32) return 6;
    if (points >= 24) return 4;   // 清一色
    if (points >= 12) return 3;
    if (points >= 6) return 3;    // 对对和、混一色
    if (points >= 4) return 4;    // 七对
    if (points >= 2) return 2;    // 平和、断幺九
    return 1;
  }

  // ─── State Management ───────────────────────────────────────────────────

  getSnapshot(): GameStateSnapshot {
    return {
      handTiles: [...this._handTiles],
      playedMelds: this._playedMelds.map(m => ({ ...m, tiles: [...m.tiles] })),
      playActionsRemaining: this._playActionsRemaining,
      discardActionsRemaining: this._discardActionsRemaining,
      accumulatedMultiplier: this._accumulatedMultiplier,
      discardCount: this._discardCount,
      lastPlayWasKong: this._lastPlayWasKong,
    };
  }

  isGameOver(): boolean {
    // Game is over if no actions remaining and not winning
    if (this._playActionsRemaining === 0 && this._discardActionsRemaining === 0) {
      return true;
    }
    return false;
  }

  getTotalTileCount(): number {
    let count = this._handTiles.length;
    for (const meld of this._playedMelds) {
      count += meld.tiles.length;
    }
    return count;
  }
}
