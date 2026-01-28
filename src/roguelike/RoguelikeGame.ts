import { Round, RoundState } from '../core/Round';
import { Hand } from '../core/Hand';
import { FanEvaluator } from '../core/FanEvaluator';
import { Scoring, ScoreBreakdown } from '../core/Scoring';
import { BlindManager, BlindResult } from './BlindManager';
import { AnteManager } from './AnteManager';
import { Boss } from './BossRound';
import { GodTile } from './GodTile';

// ─── Game State ─────────────────────────────────────────────────────────────

export enum GamePhase {
  BLIND_START,      // Starting a new blind
  PLAYING_HAND,     // Player is playing a hand
  HAND_COMPLETE,    // Hand completed, showing results
  BLIND_COMPLETE,   // Blind cleared or failed
  ANTE_COMPLETE,    // Ante completed, can advance
  SHOP,             // In shop phase
  GAME_OVER,        // Game over (win or loss)
}

export interface GameState {
  phase: GamePhase;
  ante: number;
  blindIndex: number;
  money: number;
  handsRemaining: number;
  discardsRemaining: number;
  currentScore: number;
  targetScore: number;
}

// ─── Roguelike Game ─────────────────────────────────────────────────────────

export class RoguelikeGame {
  private _round: Round;
  private _blindManager: BlindManager;
  private _anteManager: AnteManager;
  private _phase: GamePhase;
  private _activeGodTiles: GodTile[] = [];

  constructor(bossProvider: (ante: number) => Boss, startingMoney: number = 8) {  // Increased from 0
    this._round = new Round();
    this._blindManager = new BlindManager();
    this._anteManager = new AnteManager(bossProvider, startingMoney);
    this._phase = GamePhase.BLIND_START;
  }

  public get phase(): GamePhase {
    return this._phase;
  }

  public get round(): Round {
    return this._round;
  }

  public get blindManager(): BlindManager {
    return this._blindManager;
  }

  public get anteManager(): AnteManager {
    return this._anteManager;
  }

  public get activeGodTiles(): readonly GodTile[] {
    return this._activeGodTiles;
  }

  /**
   * Get the current game state.
   */
  public getState(): GameState {
    const progress = this._blindManager.getProgress();

    return {
      phase: this._phase,
      ante: this._anteManager.currentAnte,
      blindIndex: this._anteManager.currentBlindIndex,
      money: this._anteManager.totalMoney,
      handsRemaining: this._blindManager.handsRemaining,
      discardsRemaining: this._round.hand.discardsRemaining,
      currentScore: progress.score,
      targetScore: progress.target,
    };
  }

  /**
   * Start a new game.
   */
  public startGame(): void {
    this._anteManager.reset();
    this._activeGodTiles = [];
    this._phase = GamePhase.BLIND_START;
    this.startNextBlind();
  }

  /**
   * Start the next blind in the sequence.
   */
  public startNextBlind(): void {
    if (this._phase !== GamePhase.BLIND_START && this._phase !== GamePhase.BLIND_COMPLETE) {
      throw new Error('Cannot start blind in current phase');
    }

    const currentBlind = this._anteManager.currentBlind;
    this._blindManager.startBlind(currentBlind);

    // Set up hand limits for this blind
    this._round.hand.resetRoundLimits(
      currentBlind.handsAllowed,
      currentBlind.discardsAllowed
    );

    this._phase = GamePhase.PLAYING_HAND;
    this.startNewHand();
  }

  /**
   * Start a new hand within the current blind.
   */
  public startNewHand(): void {
    if (this._phase !== GamePhase.PLAYING_HAND) {
      throw new Error('Cannot start hand in current phase');
    }

    this._round.reset();
    this._round.dealInitialHand();
  }

  /**
   * Play the current hand (evaluate and score).
   * This should be called when the player declares a win.
   */
  public playHand(): ScoreBreakdown | null {
    if (this._phase !== GamePhase.PLAYING_HAND) {
      throw new Error('Cannot play hand in current phase');
    }

    // Check if the hand is a winning hand
    const handTiles = [...this._round.hand.tiles];
    const evalResult = FanEvaluator.evaluateHand(handTiles);

    if (!evalResult.isWinning) {
      return null; // Not a winning hand
    }

    // Calculate score with god tiles
    const scoreBreakdown = Scoring.calculateScore(
      handTiles,
      evalResult.fans,
      this._activeGodTiles
    );

    // Record the score in the blind manager
    this._blindManager.playHand(scoreBreakdown.finalScore);

    // Check if blind is cleared or failed
    if (this._blindManager.isBlindCleared) {
      this._phase = GamePhase.HAND_COMPLETE;
      this.completeBlind();
    } else if (this._blindManager.isBlindFailed) {
      this._phase = GamePhase.GAME_OVER;
    } else {
      // Continue playing more hands
      this._phase = GamePhase.HAND_COMPLETE;
    }

    return scoreBreakdown;
  }

  /**
   * Skip the current hand (counts as a hand used without scoring).
   */
  public skipHand(): void {
    if (this._phase !== GamePhase.PLAYING_HAND) {
      throw new Error('Cannot skip hand in current phase');
    }

    // Record 0 score for this hand
    this._blindManager.playHand(0);

    // Check if blind is failed
    if (this._blindManager.isBlindFailed) {
      this._phase = GamePhase.GAME_OVER;
    } else {
      this._phase = GamePhase.HAND_COMPLETE;
    }
  }

  /**
   * Continue to the next hand after completing one.
   */
  public continueToNextHand(): void {
    if (this._phase !== GamePhase.HAND_COMPLETE) {
      throw new Error('Cannot continue to next hand in current phase');
    }

    if (this._blindManager.isBlindCleared) {
      this.completeBlind();
    } else if (this._blindManager.handsRemaining > 0) {
      this._phase = GamePhase.PLAYING_HAND;
      this.startNewHand();
    } else {
      this._phase = GamePhase.GAME_OVER;
    }
  }

  /**
   * Complete the current blind and advance.
   */
  private completeBlind(): void {
    const blindResult = this._blindManager.getBlindResult();

    if (!blindResult.cleared) {
      this._phase = GamePhase.GAME_OVER;
      return;
    }

    // Complete blind in ante manager
    const anteComplete = this._anteManager.completeBlind(blindResult);

    if (anteComplete) {
      this._phase = GamePhase.ANTE_COMPLETE;
    } else {
      this._phase = GamePhase.BLIND_COMPLETE;
    }
  }

  /**
   * Advance to the next blind after clearing the current one.
   */
  public advanceToNextBlind(): void {
    if (this._phase !== GamePhase.BLIND_COMPLETE) {
      throw new Error('Cannot advance to next blind in current phase');
    }

    this._phase = GamePhase.BLIND_START;
    this.startNextBlind();
  }

  /**
   * Advance to the next ante after clearing all blinds.
   */
  public advanceToNextAnte(): void {
    if (this._phase !== GamePhase.ANTE_COMPLETE) {
      throw new Error('Cannot advance to next ante in current phase');
    }

    this._anteManager.advanceToNextAnte();
    this._phase = GamePhase.BLIND_START;
    this.startNextBlind();
  }

  /**
   * Enter the shop phase.
   */
  public enterShop(): void {
    if (this._phase !== GamePhase.BLIND_COMPLETE && this._phase !== GamePhase.ANTE_COMPLETE) {
      throw new Error('Cannot enter shop in current phase');
    }

    this._phase = GamePhase.SHOP;
  }

  /**
   * Exit the shop phase.
   */
  public exitShop(): void {
    if (this._phase !== GamePhase.SHOP) {
      throw new Error('Cannot exit shop in current phase');
    }

    // Determine where to go after shop
    if (this._anteManager.isAnteComplete) {
      this._phase = GamePhase.ANTE_COMPLETE;
    } else {
      this._phase = GamePhase.BLIND_COMPLETE;
    }
  }

  /**
   * Add a god tile to the active collection.
   */
  public addGodTile(godTile: GodTile): void {
    this._activeGodTiles.push(godTile);
  }

  /**
   * Remove a god tile from the active collection.
   */
  public removeGodTile(godTile: GodTile): boolean {
    const index = this._activeGodTiles.findIndex(gt => gt.id === godTile.id);
    if (index !== -1) {
      this._activeGodTiles.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Check if the game is over.
   */
  public isGameOver(): boolean {
    return this._phase === GamePhase.GAME_OVER;
  }

  /**
   * Get the blind result for the current blind.
   */
  public getBlindResult(): BlindResult {
    return this._blindManager.getBlindResult();
  }
}
