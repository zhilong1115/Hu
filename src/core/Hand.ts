import { Tile, TileSuit, isSameTile, sortTiles } from './Tile';

export interface Meld {
  type: 'chow' | 'pong' | 'kong';
  tiles: Tile[];
}

export class Hand {
  private _tiles: Tile[] = [];
  private _melds: Meld[] = [];
  private _maxTiles: number = 14;
  private _drawsRemaining: number = 0;
  private _discardsRemaining: number = 0;

  constructor(tiles: Tile[] = []) {
    this._tiles = [...tiles];
  }

  public get tiles(): readonly Tile[] {
    return this._tiles;
  }

  public get melds(): readonly Meld[] {
    return this._melds;
  }

  public get size(): number {
    return this._tiles.length + this._melds.reduce((sum, meld) => sum + meld.tiles.length, 0);
  }

  public get drawsRemaining(): number {
    return this._drawsRemaining;
  }

  public get discardsRemaining(): number {
    return this._discardsRemaining;
  }

  public get maxTiles(): number {
    return this._maxTiles;
  }

  public get isFull(): boolean {
    return this._tiles.length >= this._maxTiles;
  }

  public addTile(tile: Tile): void {
    if (this._tiles.length >= this._maxTiles) {
      throw new Error(`Cannot add tile: hand is full (max ${this._maxTiles} tiles)`);
    }
    this._tiles.push(tile);
    this.sort();
  }

  public drawTile(tile: Tile): boolean {
    if (this._drawsRemaining <= 0) {
      return false;
    }
    if (this._tiles.length >= this._maxTiles) {
      return false;
    }
    this._tiles.push(tile);
    this._drawsRemaining--;
    this.sort();
    return true;
  }

  public removeTile(tile: Tile): boolean {
    const index = this._tiles.findIndex(t => t.id === tile.id);
    if (index !== -1) {
      this._tiles.splice(index, 1);
      return true;
    }
    return false;
  }

  public removeTiles(tiles: Tile[]): boolean {
    for (const tile of tiles) {
      if (!this.removeTile(tile)) {
        return false;
      }
    }
    return true;
  }

  public discardTile(tile: Tile): boolean {
    if (this._discardsRemaining <= 0) {
      return false;
    }
    const removed = this.removeTile(tile);
    if (removed) {
      this._discardsRemaining--;
    }
    return removed;
  }

  public discardTiles(tiles: Tile[]): boolean {
    if (this._discardsRemaining <= 0) {
      return false;
    }
    if (tiles.length === 0) {
      return false;
    }
    const removed = this.removeTiles(tiles);
    if (removed) {
      this._discardsRemaining--;
    }
    return removed;
  }

  public addMeld(meld: Meld): void {
    this._melds.push(meld);
  }

  public clearMelds(): void {
    this._melds = [];
  }

  public sort(): void {
    this._tiles = sortTiles(this._tiles);
  }

  public canFormChow(tile1: Tile, tile2: Tile, tile3: Tile): boolean {
    const tiles = [tile1, tile2, tile3].sort((a, b) => a.value - b.value);
    // Chows only valid for number suits
    const numberSuits = [TileSuit.Wan, TileSuit.Tiao, TileSuit.Tong];
    if (!numberSuits.includes(tiles[0].suit)) return false;
    return tiles[0].suit === tiles[1].suit &&
           tiles[1].suit === tiles[2].suit &&
           tiles[1].value === tiles[0].value + 1 &&
           tiles[2].value === tiles[1].value + 1;
  }

  public canFormPong(tile1: Tile, tile2: Tile, tile3: Tile): boolean {
    return isSameTile(tile1, tile2) && isSameTile(tile2, tile3);
  }

  public getTileCount(suit: TileSuit, value: number): number {
    return this._tiles.filter(t => t.suit === suit && t.value === value).length;
  }

  public setDrawsRemaining(draws: number): void {
    this._drawsRemaining = Math.max(0, draws);
  }

  public setDiscardsRemaining(discards: number): void {
    this._discardsRemaining = Math.max(0, discards);
  }

  public resetRoundLimits(draws: number, discards: number): void {
    this._drawsRemaining = draws;
    this._discardsRemaining = discards;
  }

  public clone(): Hand {
    const newHand = new Hand();
    newHand._tiles = this._tiles.map(t => ({ ...t }));
    newHand._melds = this._melds.map(meld => ({
      type: meld.type,
      tiles: meld.tiles.map(t => ({ ...t }))
    }));
    newHand._maxTiles = this._maxTiles;
    newHand._drawsRemaining = this._drawsRemaining;
    newHand._discardsRemaining = this._discardsRemaining;
    return newHand;
  }
}
