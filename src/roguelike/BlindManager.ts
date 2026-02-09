import { Blind, BlindType, createSmallBlind, createBigBlind, createBossBlind } from './Blind';
import { Boss } from './BossRound';

// ─── 庄 Progression Result ──────────────────────────────────────────────────

export interface BlindResult {
  cleared: boolean;
  scoreAchieved: number;
  targetScore: number;
  excessScore: number;
  baseReward: number;
  bonusReward: number;
  totalReward: number;
  handsUsed: number;
  handsRemaining: number;
}

// ─── 庄 Manager ────────────────────────────────────────────────────────────

export class BlindManager {
  private _currentBlind: Blind | null = null;
  private _currentScore: number = 0;
  private _handsUsed: number = 0;

  constructor() {}

  public get currentBlind(): Blind | null {
    return this._currentBlind;
  }

  public get currentScore(): number {
    return this._currentScore;
  }

  public get handsUsed(): number {
    return this._handsUsed;
  }

  public get handsRemaining(): number {
    if (!this._currentBlind) return 0;
    return Math.max(0, this._currentBlind.handsAllowed - this._handsUsed);
  }

  public get isBlindCleared(): boolean {
    if (!this._currentBlind) return false;
    return this._currentScore >= this._currentBlind.targetScore;
  }

  public get isBlindFailed(): boolean {
    if (!this._currentBlind) return false;
    return this.handsRemaining === 0 && !this.isBlindCleared;
  }

  /**
   * Start a new 庄 round.
   */
  public startBlind(blind: Blind): void {
    this._currentBlind = blind;
    this._currentScore = 0;
    this._handsUsed = 0;
  }

  /**
   * Record a hand played with the given score.
   */
  public playHand(score: number): void {
    if (!this._currentBlind) {
      throw new Error('No 庄 is currently active');
    }

    if (this.handsRemaining <= 0) {
      throw new Error('No hands remaining in this 庄');
    }

    this._currentScore += score;
    this._handsUsed++;
  }

  /**
   * Get the result of the current 庄.
   * Should be called when the 庄 is either cleared or failed.
   */
  public getBlindResult(): BlindResult {
    if (!this._currentBlind) {
      throw new Error('No 庄 is currently active');
    }

    const cleared = this.isBlindCleared;
    const excessScore = Math.max(0, this._currentScore - this._currentBlind.targetScore);
    const baseReward = cleared ? this._currentBlind.rewardMoney : 0;
    const bonusReward = cleared ? Math.floor(excessScore * this._currentBlind.bonusMoneyPerExcessPoint) : 0;
    const totalReward = baseReward + bonusReward;

    return {
      cleared,
      scoreAchieved: this._currentScore,
      targetScore: this._currentBlind.targetScore,
      excessScore,
      baseReward,
      bonusReward,
      totalReward,
      handsUsed: this._handsUsed,
      handsRemaining: this.handsRemaining,
    };
  }

  /**
   * Reset the 庄 manager state.
   */
  public reset(): void {
    this._currentBlind = null;
    this._currentScore = 0;
    this._handsUsed = 0;
  }

  /**
   * Get progress information for display.
   */
  public getProgress(): {
    score: number;
    target: number;
    percentage: number;
    handsUsed: number;
    handsRemaining: number;
  } {
    if (!this._currentBlind) {
      return {
        score: 0,
        target: 0,
        percentage: 0,
        handsUsed: 0,
        handsRemaining: 0,
      };
    }

    return {
      score: this._currentScore,
      target: this._currentBlind.targetScore,
      percentage: (this._currentScore / this._currentBlind.targetScore) * 100,
      handsUsed: this._handsUsed,
      handsRemaining: this.handsRemaining,
    };
  }
}

// ─── 庄 Sequence Generator ──────────────────────────────────────────────────

/**
 * Generate the sequence of 庄 for a given ante.
 * Each ante has: 小庄 → 大庄 → Boss庄
 */
export function generateBlindsForAnte(ante: number, boss: Boss): Blind[] {
  return [
    createSmallBlind(ante),
    createBigBlind(ante),
    createBossBlind(ante, boss),
  ];
}
