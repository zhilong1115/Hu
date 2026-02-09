import { GodTile, GodTileRarity } from './GodTile';
import { FlowerCard } from './FlowerCard';
import { 
  GodTile as NewGodTileData, 
  GodTileRarity as NewGodTileRarity,
  getPurchasableGodTiles,
} from '../data/godTiles';
import { SeasonCardDef, generateSeasonShopCards } from '../data/seasonCards';

export interface ShopItem {
  id: string;
  type: 'god_tile' | 'flower_card' | 'season_card';
  item: GodTile | FlowerCard | SeasonCardDef;
  cost: number;
  available: boolean;
}

export class Shop {
  private _items: ShopItem[] = [];
  private _playerGold: number = 0;
  private _refreshCost: number = 3;
  private _baseRefreshCost: number = 3;
  private _refreshCount: number = 0;
  private _roundNumber: number = 1;

  constructor(playerGold: number = 15, roundNumber: number = 1) {
    this._playerGold = playerGold;
    this._roundNumber = roundNumber;
    this.generateShopItems();
  }

  public get items(): readonly ShopItem[] {
    return this._items;
  }

  public get playerGold(): number {
    return this._playerGold;
  }

  public get refreshCost(): number {
    return this._refreshCost;
  }

  public get roundNumber(): number {
    return this._roundNumber;
  }

  public buyItem(itemId: string): GodTile | FlowerCard | SeasonCardDef | null {
    const item = this._items.find(i => i.id === itemId);

    if (!item || !item.available || this._playerGold < item.cost) {
      return null;
    }

    this._playerGold -= item.cost;
    item.available = false;
    return item.item;
  }

  public refreshShop(): boolean {
    if (this._playerGold < this._refreshCost) {
      return false;
    }

    this._playerGold -= this._refreshCost;
    this._refreshCount++;
    this._refreshCost = this._baseRefreshCost + (this._refreshCount * 2);

    this.generateShopItems();
    return true;
  }

  /**
   * Sell a god tile. Returns sell price, or -1 if selling is blocked (貔貅).
   * @param godTile The god tile to sell
   * @param activeGodTiles All active god tiles (to check for 貔貅)
   */
  public sellGodTile(godTile: GodTile, activeGodTiles?: readonly GodTile[]): number {
    // Check if player has 貔貅 (forbidden to sell)
    if (activeGodTiles) {
      const hasPixiu = activeGodTiles.some(gt => gt.id === 'wealth_pixiu');
      if (hasPixiu) {
        return -1; // Selling blocked
      }
    }
    const sellPrice = Math.floor(godTile.cost / 2);
    this._playerGold += sellPrice;
    return sellPrice;
  }

  public addGold(amount: number): void {
    this._playerGold += amount;
  }

  public setGold(amount: number): void {
    this._playerGold = amount;
  }

  private generateShopItems(): void {
    this._items = [];

    // Generate 3-4 god tiles
    const godTileCount = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < godTileCount; i++) {
      this._items.push(this.createGodTileItem());
    }

    // Generate 1-2 season cards based on current round
    const seasonCards = generateSeasonShopCards(this._roundNumber, 2);
    for (const sc of seasonCards) {
      this._items.push({
        id: `season-${sc.id}-${Date.now()}-${Math.random()}`,
        type: 'season_card',
        item: sc,
        cost: sc.price,
        available: true,
      });
    }
  }

  private createGodTileItem(): ShopItem {
    const rand = Math.random();
    let newRarity: NewGodTileRarity;

    if (rand < 0.50) {
      newRarity = NewGodTileRarity.GREEN;
    } else if (rand < 0.80) {
      newRarity = NewGodTileRarity.BLUE;
    } else if (rand < 0.95) {
      newRarity = NewGodTileRarity.PURPLE;
    } else {
      newRarity = NewGodTileRarity.GOLD;
    }

    const purchasable = getPurchasableGodTiles();
    const tilesOfRarity = purchasable.filter(t => t.rarity === newRarity);
    const availableTiles = tilesOfRarity.length > 0 ? tilesOfRarity : purchasable;
    const tileData = availableTiles[Math.floor(Math.random() * availableTiles.length)];
    
    const godTile = GodTile.fromNewFormat(tileData);

    return {
      id: godTile.id,
      type: 'god_tile',
      item: godTile,
      cost: tileData.price,
      available: true
    };
  }
}
