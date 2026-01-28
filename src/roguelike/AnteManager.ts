import { Blind, BlindType } from './Blind';
import { BlindManager, BlindResult, generateBlindsForAnte } from './BlindManager';
import { Boss } from './BossRound';

// ─── Ante State ─────────────────────────────────────────────────────────────

export interface AnteState {
  anteNumber: number;
  blindIndex: number; // 0 = small, 1 = big, 2 = boss
  totalMoney: number;
  blindsCleared: number;
  totalScore: number;
}

// ─── Ante Manager ───────────────────────────────────────────────────────────

export class AnteManager {
  private _currentAnte: number = 1;
  private _currentBlindIndex: number = 0; // 0 = small, 1 = big, 2 = boss
  private _totalMoney: number = 0;
  private _totalBlindsCleared: number = 0;
  private _totalScore: number = 0;
  private _blinds: Blind[] = [];
  private _bossProvider: (ante: number) => Boss;

  constructor(
    bossProvider: (ante: number) => Boss,
    startingMoney: number = 8  // Increased from 0 - allows early purchases
  ) {
    this._bossProvider = bossProvider;
    this._totalMoney = startingMoney;
    this._generateBlindsForCurrentAnte();
  }

  public get currentAnte(): number {
    return this._currentAnte;
  }

  public get currentBlindIndex(): number {
    return this._currentBlindIndex;
  }

  public get currentBlind(): Blind {
    return this._blinds[this._currentBlindIndex];
  }

  public get totalMoney(): number {
    return this._totalMoney;
  }

  public get totalBlindsCleared(): number {
    return this._totalBlindsCleared;
  }

  public get totalScore(): number {
    return this._totalScore;
  }

  public get isAnteComplete(): boolean {
    return this._currentBlindIndex >= 3; // All 3 blinds cleared
  }

  /**
   * Get the current state for save/load functionality.
   */
  public getState(): AnteState {
    return {
      anteNumber: this._currentAnte,
      blindIndex: this._currentBlindIndex,
      totalMoney: this._totalMoney,
      blindsCleared: this._totalBlindsCleared,
      totalScore: this._totalScore,
    };
  }

  /**
   * Restore state from a saved game.
   */
  public setState(state: AnteState): void {
    this._currentAnte = state.anteNumber;
    this._currentBlindIndex = state.blindIndex;
    this._totalMoney = state.totalMoney;
    this._totalBlindsCleared = state.blindsCleared;
    this._totalScore = state.totalScore;
    this._generateBlindsForCurrentAnte();
  }

  /**
   * Complete the current blind and move to the next one.
   * Returns whether the ante is complete.
   */
  public completeBlind(blindResult: BlindResult): boolean {
    if (!blindResult.cleared) {
      throw new Error('Cannot complete a blind that was not cleared');
    }

    // Award money
    this._totalMoney += blindResult.totalReward;
    this._totalBlindsCleared++;
    this._totalScore += blindResult.scoreAchieved;

    // Move to next blind
    this._currentBlindIndex++;

    // Check if ante is complete
    if (this.isAnteComplete) {
      return true;
    }

    return false;
  }

  /**
   * Advance to the next ante.
   * Should be called after all blinds in the current ante are cleared.
   */
  public advanceToNextAnte(): void {
    if (!this.isAnteComplete) {
      throw new Error('Cannot advance to next ante: current ante is not complete');
    }

    this._currentAnte++;
    this._currentBlindIndex = 0;
    this._generateBlindsForCurrentAnte();
  }

  /**
   * Add money to the player's total (e.g., from shop purchases or rewards).
   */
  public addMoney(amount: number): void {
    this._totalMoney += amount;
  }

  /**
   * Spend money (e.g., in the shop).
   * Returns whether the purchase was successful.
   */
  public spendMoney(amount: number): boolean {
    if (this._totalMoney < amount) {
      return false;
    }
    this._totalMoney -= amount;
    return true;
  }

  /**
   * Reset to the beginning of the game.
   */
  public reset(startingMoney: number = 8): void {  // Increased default from 0
    this._currentAnte = 1;
    this._currentBlindIndex = 0;
    this._totalMoney = startingMoney;
    this._totalBlindsCleared = 0;
    this._totalScore = 0;
    this._generateBlindsForCurrentAnte();
  }

  private _generateBlindsForCurrentAnte(): void {
    const boss = this._bossProvider(this._currentAnte);
    this._blinds = generateBlindsForAnte(this._currentAnte, boss);
  }

  /**
   * Get a summary of the current progress.
   */
  public getSummary(): {
    ante: number;
    blindType: BlindType;
    blindName: string;
    money: number;
    blindsCleared: number;
    totalScore: number;
  } {
    const currentBlind = this.currentBlind;
    return {
      ante: this._currentAnte,
      blindType: currentBlind.type,
      blindName: currentBlind.name,
      money: this._totalMoney,
      blindsCleared: this._totalBlindsCleared,
      totalScore: this._totalScore,
    };
  }
}
