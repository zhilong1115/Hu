import { GodTile, GodTileRarity } from './GodTile';
import { FlowerCard, FlowerCardType } from './FlowerCard';
import { ALL_LEGACY_GOD_TILES, GodTileDataEntry } from '../data/godTilesLegacy';
import { ALL_FLOWER_CARDS, FlowerCardData, createFlowerCardFromData } from '../data/flowerCards';

export interface ShopItem {
  id: string;
  type: 'god_tile' | 'flower_card';
  item: GodTile | FlowerCard;
  cost: number;
  available: boolean;
}

export class Shop {
  private _items: ShopItem[] = [];
  private _playerGold: number = 0;
  private _refreshCost: number = 3;  // Increased from 2
  private _baseRefreshCost: number = 3;  // Increased from 2
  private _refreshCount: number = 0;

  constructor(playerGold: number = 15) {  // Increased default from 10
    this._playerGold = playerGold;
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

  public buyItem(itemId: string): GodTile | FlowerCard | null {
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

    // Increment refresh cost: 3, 5, 7, 9... (slower scaling)
    this._refreshCost = this._baseRefreshCost + (this._refreshCount * 2);

    this.generateShopItems();
    return true;
  }

  public sellGodTile(godTile: GodTile): number {
    // Sell for half the cost
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

    // Generate 3-5 random shop items
    const itemCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < itemCount; i++) {
      const itemType = Math.random();
      let item: ShopItem;

      if (itemType < 0.65) {
        // 65% chance: God Tile
        item = this.createGodTileItem();
      } else {
        // 35% chance: Flower Card
        item = this.createFlowerCardItem();
      }

      this._items.push(item);
    }
  }

  private createGodTileItem(): ShopItem {
    // Weight rarities: 60% common, 25% rare, 12% epic, 3% legendary
    const rand = Math.random();
    let rarity: GodTileRarity;

    if (rand < 0.60) {
      rarity = GodTileRarity.COMMON;
    } else if (rand < 0.85) {
      rarity = GodTileRarity.RARE;
    } else if (rand < 0.97) {
      rarity = GodTileRarity.EPIC;
    } else {
      rarity = GodTileRarity.LEGENDARY;
    }

    // Pick random god tile of that rarity
    const tilesOfRarity = ALL_LEGACY_GOD_TILES.filter(t => t.rarity === rarity);
    const tileData = tilesOfRarity[Math.floor(Math.random() * tilesOfRarity.length)];
    const godTile = new GodTile(tileData);

    return {
      id: godTile.id,
      type: 'god_tile',
      item: godTile,
      cost: tileData.cost,
      available: true
    };
  }

  private createFlowerCardItem(): ShopItem {
    // Weight rarities: 60% common, 30% rare, 8% epic, 2% legendary
    const rand = Math.random();
    let rarity: string;

    if (rand < 0.60) {
      rarity = 'common';
    } else if (rand < 0.90) {
      rarity = 'rare';
    } else if (rand < 0.98) {
      rarity = 'epic';
    } else {
      rarity = 'legendary';
    }

    // Pick random flower card of that rarity
    const cardsOfRarity = ALL_FLOWER_CARDS.filter(c => c.rarity === rarity);
    const cardData = cardsOfRarity[Math.floor(Math.random() * cardsOfRarity.length)];
    const flowerCard = createFlowerCardFromData(cardData);

    return {
      id: `flower-${Date.now()}-${Math.random()}`,
      type: 'flower_card',
      item: flowerCard,
      cost: cardData.cost,
      available: true
    };
  }
}