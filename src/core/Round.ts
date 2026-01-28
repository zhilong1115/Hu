import { Hand } from './Hand';
import { Tile, createFullTileSet, shuffleTiles } from './Tile';
import { FanEvaluator } from './FanEvaluator';
import { Scoring, ScoreResult } from './Scoring';
import { DeckVariant, DECK_VARIANTS } from './DeckVariant';

export enum RoundState {
  DEALING,
  PLAYING,
  DISCARDING,
  WAITING,
  FINISHED
}

export class Round {
  private _hand: Hand;
  private _drawPile: Tile[];
  private _discardPile: Tile[];
  private _state: RoundState;
  private _currentTile: Tile | null = null;
  private _deckVariant: DeckVariant;

  constructor(deckVariant?: DeckVariant) {
    this._hand = new Hand();
    this._deckVariant = deckVariant || DECK_VARIANTS.standard;
    this._drawPile = this.createShuffledDeck();
    this._discardPile = [];
    this._state = RoundState.DEALING;
  }

  public get deckVariant(): DeckVariant {
    return this._deckVariant;
  }

  public get hand(): Hand {
    return this._hand;
  }

  public get state(): RoundState {
    return this._state;
  }

  public get currentTile(): Tile | null {
    return this._currentTile;
  }

  public get drawPileCount(): number {
    return this._drawPile.length;
  }

  public get discardPile(): readonly Tile[] {
    return this._discardPile;
  }

  public dealInitialHand(): void {
    if (this._state !== RoundState.DEALING) {
      throw new Error('Cannot deal when not in dealing state');
    }

    for (let i = 0; i < 13; i++) {
      if (this._drawPile.length > 0) {
        this._hand.addTile(this._drawPile.pop()!);
      }
    }

    this._hand.sort();
    this._state = RoundState.PLAYING;
  }

  public drawTile(): Tile | null {
    if (this._drawPile.length === 0) {
      return null;
    }

    const tile = this._drawPile.pop()!;
    this._currentTile = tile;
    this._hand.addTile(tile);
    this._hand.sort();
    this._state = RoundState.DISCARDING;

    return tile;
  }

  public discardTile(tile: Tile): boolean {
    if (this._state !== RoundState.DISCARDING) {
      return false;
    }

    if (this._hand.removeTile(tile)) {
      this._discardPile.push(tile);
      this._currentTile = null;
      this._state = RoundState.PLAYING;
      return true;
    }

    return false;
  }

  public canWin(): boolean {
    const handTiles = [...this._hand.tiles];
    const result = FanEvaluator.evaluateHand(handTiles);
    if (!result.isWinning) return false;
    const score = Scoring.calculateScore(handTiles, result.fans);
    return Scoring.isWinningScore(score);
  }

  public declareWin(): ScoreResult | null {
    if (!this.canWin()) {
      return null;
    }

    const handTiles = [...this._hand.tiles];
    const result = FanEvaluator.evaluateHand(handTiles);
    const score = Scoring.calculateScore(handTiles, result.fans);
    this._state = RoundState.FINISHED;

    return score;
  }

  public reset(): void {
    this._hand = new Hand();
    this._drawPile = this.createShuffledDeck();
    this._discardPile = [];
    this._state = RoundState.DEALING;
    this._currentTile = null;
  }

  private createShuffledDeck(): Tile[] {
    return shuffleTiles(this._deckVariant.createTileSet());
  }

  public getHandStatus(): {
    tileCount: number;
    canDraw: boolean;
    canDiscard: boolean;
    canWin: boolean;
  } {
    return {
      tileCount: this._hand.size,
      canDraw: this._state === RoundState.PLAYING && this._drawPile.length > 0,
      canDiscard: this._state === RoundState.DISCARDING,
      canWin: this.canWin()
    };
  }
}
