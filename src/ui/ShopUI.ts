import Phaser from 'phaser';
import { Shop, ShopItem } from '../roguelike/Shop';
import { GodTile } from '../roguelike/GodTile';
import { FlowerCard } from '../roguelike/FlowerCard';
import { FlowerCardManager } from '../roguelike/FlowerCardManager';

/**
 * ShopUI - Mobile-first UI component for the shop
 *
 * Features:
 * - Display shop items with rarity colors and effects
 * - Reroll button with increasing cost
 * - Owned God Tiles display with sell buttons
 * - Owned Flower Cards display
 * - Hover/tap preview for item details
 * - Touch-friendly buttons
 */
export class ShopUI extends Phaser.GameObjects.Container {
  private _shop: Shop;
  private _activeGodTiles: GodTile[];
  private _flowerCardManager: FlowerCardManager;

  // UI sections
  private _shopItemsContainer!: Phaser.GameObjects.Container;
  private _ownedGodTilesContainer!: Phaser.GameObjects.Container;
  private _ownedFlowerCardsContainer!: Phaser.GameObjects.Container;
  private _rerollButton!: Phaser.GameObjects.Text;

  // Preview popup
  private _previewPopup?: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    shop: Shop,
    activeGodTiles: GodTile[],
    flowerCardManager: FlowerCardManager
  ) {
    super(scene, x, y);

    this._shop = shop;
    this._activeGodTiles = activeGodTiles;
    this._flowerCardManager = flowerCardManager;

    this.createUI();
    scene.add.existing(this);
  }

  private createUI(): void {
    const width = this.scene.scale.width - 40;

    // Section 1: Shop items (for sale)
    this.createShopItemsSection(-width / 2, -200, width);

    // Section 2: Reroll button
    this.createRerollButton(0, 60);

    // Section 3: Owned God Tiles (with sell option)
    this.createOwnedGodTilesSection(-width / 2, 120, width);

    // Section 4: Owned Flower Cards
    this.createOwnedFlowerCardsSection(-width / 2, 240, width);
  }

  private createShopItemsSection(x: number, y: number, width: number): void {
    const sectionLabel = new Phaser.GameObjects.Text(
      this.scene,
      x,
      y - 20,
      '商品',
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '18px',
        color: '#ffd700'
      }
    );
    this.add(sectionLabel);

    this._shopItemsContainer = new Phaser.GameObjects.Container(this.scene, x, y);
    this.add(this._shopItemsContainer);

    this.updateShopItems();
  }

  private createRerollButton(x: number, y: number): void {
    this._rerollButton = new Phaser.GameObjects.Text(
      this.scene,
      x,
      y,
      `刷新商品 (${this._shop.refreshCost}金)`,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#444444',
        padding: { x: 20, y: 10 }
      }
    );
    this._rerollButton.setOrigin(0.5);
    this._rerollButton.setInteractive({ useHandCursor: true });

    this._rerollButton.on('pointerdown', () => {
      if (this._shop.refreshShop()) {
        this.updateShopItems();
        this.updateRerollButton();
        this.emit('shopRefreshed');
      } else {
        this.showInsufficientGoldMessage();
      }
    });

    this._rerollButton.on('pointerover', () => {
      this._rerollButton.setStyle({ backgroundColor: '#666666' });
    });

    this._rerollButton.on('pointerout', () => {
      this._rerollButton.setStyle({ backgroundColor: '#444444' });
    });

    this.add(this._rerollButton);
    this.updateRerollButton();
  }

  private createOwnedGodTilesSection(x: number, y: number, width: number): void {
    const sectionLabel = new Phaser.GameObjects.Text(
      this.scene,
      x,
      y - 20,
      `拥有的神牌 (${this._activeGodTiles.length})`,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '16px',
        color: '#aaaaaa'
      }
    );
    this.add(sectionLabel);

    this._ownedGodTilesContainer = new Phaser.GameObjects.Container(this.scene, x, y);
    this.add(this._ownedGodTilesContainer);

    this.updateOwnedGodTiles();
  }

  private createOwnedFlowerCardsSection(x: number, y: number, width: number): void {
    const flowerCards = this._flowerCardManager.getCards();

    const sectionLabel = new Phaser.GameObjects.Text(
      this.scene,
      x,
      y - 20,
      `拥有的花牌 (${flowerCards.length})`,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '16px',
        color: '#aaaaaa'
      }
    );
    this.add(sectionLabel);

    this._ownedFlowerCardsContainer = new Phaser.GameObjects.Container(this.scene, x, y);
    this.add(this._ownedFlowerCardsContainer);

    this.updateOwnedFlowerCards();
  }

  private updateShopItems(): void {
    this._shopItemsContainer.removeAll(true);

    const items = this._shop.items;
    const itemWidth = 110;
    const itemHeight = 140;
    const itemsPerRow = Math.min(items.length, 3);
    const startX = 0;

    items.forEach((item, index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      const xPos = startX + col * itemWidth;
      const yPos = row * itemHeight;

      const itemCard = this.createShopItemCard(item, xPos, yPos);
      this._shopItemsContainer.add(itemCard);
    });
  }

  private createShopItemCard(item: ShopItem, x: number, y: number): Phaser.GameObjects.Container {
    const container = new Phaser.GameObjects.Container(this.scene, x, y);

    const cardWidth = 100;
    const cardHeight = 130;

    // Get item info
    const isGodTile = item.type === 'god_tile';
    const godTile = isGodTile ? (item.item as GodTile) : null;
    const flowerCard = !isGodTile ? (item.item as FlowerCard) : null;

    const itemName = isGodTile ? godTile!.displayName : flowerCard!.name;
    const rarityColor = isGodTile ? godTile!.getRarityColor() : this.getFlowerCardRarityColor(flowerCard!.rarity);

    // Card background
    const bg = new Phaser.GameObjects.Rectangle(
      this.scene,
      0,
      0,
      cardWidth,
      cardHeight,
      item.available ? 0x2a2a2a : 0x1a1a1a
    );
    bg.setStrokeStyle(2, item.available ? Phaser.Display.Color.HexStringToColor(rarityColor).color : 0x666666);
    container.add(bg);

    // Item type icon
    const typeIcon = new Phaser.GameObjects.Text(
      this.scene,
      0,
      -cardHeight / 2 + 15,
      isGodTile ? '神' : flowerCard!.getFlowerSymbol(),
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '16px',
        color: rarityColor
      }
    );
    typeIcon.setOrigin(0.5);
    container.add(typeIcon);

    // Item name
    const nameText = new Phaser.GameObjects.Text(
      this.scene,
      0,
      -cardHeight / 2 + 40,
      itemName,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        color: item.available ? '#ffffff' : '#666666',
        align: 'center',
        wordWrap: { width: cardWidth - 10 }
      }
    );
    nameText.setOrigin(0.5);
    container.add(nameText);

    if (item.available) {
      // Cost
      const costText = new Phaser.GameObjects.Text(
        this.scene,
        0,
        cardHeight / 2 - 45,
        `${item.cost}💰`,
        {
          fontFamily: 'Courier New, monospace',
          fontSize: '14px',
          color: '#ffd700'
        }
      );
      costText.setOrigin(0.5);
      container.add(costText);

      // Buy button
      const canAfford = this._shop.playerGold >= item.cost;
      const buyButton = new Phaser.GameObjects.Text(
        this.scene,
        0,
        cardHeight / 2 - 20,
        '购买',
        {
          fontFamily: 'Courier New, monospace',
          fontSize: '12px',
          color: '#ffffff',
          backgroundColor: canAfford ? '#00aa00' : '#880000',
          padding: { x: 12, y: 6 }
        }
      );
      buyButton.setOrigin(0.5);

      if (canAfford) {
        buyButton.setInteractive({ useHandCursor: true });
        buyButton.on('pointerdown', () => this.onBuyItem(item));
        buyButton.on('pointerover', () => {
          buyButton.setStyle({ backgroundColor: '#00cc00' });
        });
        buyButton.on('pointerout', () => {
          buyButton.setStyle({ backgroundColor: '#00aa00' });
        });
      }

      container.add(buyButton);

      // Preview on hover/tap
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => this.showItemPreview(item, container));
      bg.on('pointerout', () => this.hideItemPreview());
    } else {
      // Sold out
      const soldText = new Phaser.GameObjects.Text(
        this.scene,
        0,
        cardHeight / 2 - 30,
        '已售出',
        {
          fontFamily: 'Courier New, monospace',
          fontSize: '12px',
          color: '#666666'
        }
      );
      soldText.setOrigin(0.5);
      container.add(soldText);
    }

    return container;
  }

  private updateOwnedGodTiles(): void {
    this._ownedGodTilesContainer.removeAll(true);

    if (this._activeGodTiles.length === 0) {
      const emptyText = new Phaser.GameObjects.Text(
        this.scene,
        0,
        0,
        '暂无神牌',
        {
          fontFamily: 'Courier New, monospace',
          fontSize: '12px',
          color: '#666666'
        }
      );
      this._ownedGodTilesContainer.add(emptyText);
      return;
    }

    const tileWidth = 80;
    const startX = 0;

    this._activeGodTiles.forEach((tile, index) => {
      const xPos = startX + index * tileWidth;
      const tileCard = this.createOwnedGodTileCard(tile, xPos, 0);
      this._ownedGodTilesContainer.add(tileCard);
    });
  }

  private createOwnedGodTileCard(tile: GodTile, x: number, y: number): Phaser.GameObjects.Container {
    const container = new Phaser.GameObjects.Container(this.scene, x, y);

    const cardWidth = 70;
    const cardHeight = 90;

    // Background
    const bg = new Phaser.GameObjects.Rectangle(
      this.scene,
      0,
      0,
      cardWidth,
      cardHeight,
      0x222222
    );
    bg.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(tile.getRarityColor()).color);
    container.add(bg);

    // Name
    const nameText = new Phaser.GameObjects.Text(
      this.scene,
      0,
      -cardHeight / 2 + 15,
      tile.displayName,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
        color: tile.getRarityColor(),
        align: 'center',
        wordWrap: { width: cardWidth - 5 }
      }
    );
    nameText.setOrigin(0.5);
    container.add(nameText);

    // Sell button
    const sellPrice = Math.floor(tile.cost / 2);
    const sellButton = new Phaser.GameObjects.Text(
      this.scene,
      0,
      cardHeight / 2 - 15,
      `卖 ${sellPrice}金`,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#aa5500',
        padding: { x: 8, y: 4 }
      }
    );
    sellButton.setOrigin(0.5);
    sellButton.setInteractive({ useHandCursor: true });

    sellButton.on('pointerdown', () => this.onSellGodTile(tile));
    sellButton.on('pointerover', () => {
      sellButton.setStyle({ backgroundColor: '#cc6600' });
    });
    sellButton.on('pointerout', () => {
      sellButton.setStyle({ backgroundColor: '#aa5500' });
    });

    container.add(sellButton);

    // Preview on hover
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => this.showGodTilePreview(tile, container));
    bg.on('pointerout', () => this.hideItemPreview());

    return container;
  }

  private updateOwnedFlowerCards(): void {
    this._ownedFlowerCardsContainer.removeAll(true);

    const flowerCards = this._flowerCardManager.getCards();

    if (flowerCards.length === 0) {
      const emptyText = new Phaser.GameObjects.Text(
        this.scene,
        0,
        0,
        '暂无花牌',
        {
          fontFamily: 'Courier New, monospace',
          fontSize: '12px',
          color: '#666666'
        }
      );
      this._ownedFlowerCardsContainer.add(emptyText);
      return;
    }

    const cardWidth = 70;
    const startX = 0;

    flowerCards.forEach((card, index) => {
      const xPos = startX + index * cardWidth;
      const cardDisplay = this.createOwnedFlowerCardDisplay(card, xPos, 0);
      this._ownedFlowerCardsContainer.add(cardDisplay);
    });
  }

  private createOwnedFlowerCardDisplay(card: FlowerCard, x: number, y: number): Phaser.GameObjects.Container {
    const container = new Phaser.GameObjects.Container(this.scene, x, y);

    const cardWidth = 60;
    const cardHeight = 80;

    // Background
    const bg = new Phaser.GameObjects.Rectangle(
      this.scene,
      0,
      0,
      cardWidth,
      cardHeight,
      0x222222
    );
    bg.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(this.getFlowerCardRarityColor(card.rarity)).color);
    container.add(bg);

    // Flower symbol
    const symbol = new Phaser.GameObjects.Text(
      this.scene,
      0,
      -cardHeight / 2 + 15,
      card.getFlowerSymbol(),
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '16px'
      }
    );
    symbol.setOrigin(0.5);
    container.add(symbol);

    // Name
    const nameText = new Phaser.GameObjects.Text(
      this.scene,
      0,
      cardHeight / 2 - 15,
      card.name,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '9px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: cardWidth - 5 }
      }
    );
    nameText.setOrigin(0.5);
    container.add(nameText);

    // Preview on hover
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => this.showFlowerCardPreview(card, container));
    bg.on('pointerout', () => this.hideItemPreview());

    return container;
  }

  private updateRerollButton(): void {
    this._rerollButton.setText(`刷新商品 (${this._shop.refreshCost}金)`);

    const canAfford = this._shop.playerGold >= this._shop.refreshCost;
    this._rerollButton.setStyle({
      backgroundColor: canAfford ? '#444444' : '#880000'
    });
  }

  public updateOwnedItems(activeGodTiles: GodTile[], flowerCardManager: FlowerCardManager): void {
    this._activeGodTiles = activeGodTiles;
    this._flowerCardManager = flowerCardManager;

    this.updateOwnedGodTiles();
    this.updateOwnedFlowerCards();
  }

  private onBuyItem(item: ShopItem): void {
    const purchasedItem = this._shop.buyItem(item.id);

    if (purchasedItem) {
      this.updateShopItems();
      this.updateRerollButton();
      this.emit('itemPurchased', item);
    }
  }

  private onSellGodTile(tile: GodTile): void {
    const goldEarned = this._shop.sellGodTile(tile);
    this.updateOwnedGodTiles();
    this.updateRerollButton();
    this.emit('godTileSold', tile, goldEarned);
  }

  private showItemPreview(item: ShopItem, sourceContainer: Phaser.GameObjects.Container): void {
    this.hideItemPreview();

    const isGodTile = item.type === 'god_tile';
    const godTile = isGodTile ? (item.item as GodTile) : null;
    const flowerCard = !isGodTile ? (item.item as FlowerCard) : null;

    if (godTile) {
      this.showGodTilePreview(godTile, sourceContainer);
    } else if (flowerCard) {
      this.showFlowerCardPreview(flowerCard, sourceContainer);
    }
  }

  private showGodTilePreview(tile: GodTile, sourceContainer: Phaser.GameObjects.Container): void {
    this.hideItemPreview();

    const width = 250;
    const height = 150;

    this._previewPopup = new Phaser.GameObjects.Container(this.scene, 0, -100);

    // Background
    const bg = new Phaser.GameObjects.Rectangle(this.scene, 0, 0, width, height, 0x000000);
    bg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(tile.getRarityColor()).color);
    bg.setAlpha(0.95);
    this._previewPopup.add(bg);

    // Title
    const title = new Phaser.GameObjects.Text(
      this.scene,
      0,
      -height / 2 + 20,
      tile.displayName,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '16px',
        color: tile.getRarityColor(),
        align: 'center'
      }
    );
    title.setOrigin(0.5);
    this._previewPopup.add(title);

    // Effects
    const effectsText = tile.getEffectsDescription();
    const effects = new Phaser.GameObjects.Text(
      this.scene,
      0,
      -10,
      effectsText,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: '#cccccc',
        align: 'left',
        wordWrap: { width: width - 20 }
      }
    );
    effects.setOrigin(0.5);
    this._previewPopup.add(effects);

    // Cost
    const cost = new Phaser.GameObjects.Text(
      this.scene,
      0,
      height / 2 - 15,
      `价格: ${tile.cost} 金币`,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        color: '#ffd700'
      }
    );
    cost.setOrigin(0.5);
    this._previewPopup.add(cost);

    this.add(this._previewPopup);
  }

  private showFlowerCardPreview(card: FlowerCard, sourceContainer: Phaser.GameObjects.Container): void {
    this.hideItemPreview();

    const width = 250;
    const height = 150;

    this._previewPopup = new Phaser.GameObjects.Container(this.scene, 0, -100);

    // Background
    const bg = new Phaser.GameObjects.Rectangle(this.scene, 0, 0, width, height, 0x000000);
    bg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(this.getFlowerCardRarityColor(card.rarity)).color);
    bg.setAlpha(0.95);
    this._previewPopup.add(bg);

    // Title
    const title = new Phaser.GameObjects.Text(
      this.scene,
      0,
      -height / 2 + 20,
      `${card.getFlowerSymbol()} ${card.name}`,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '16px',
        color: this.getFlowerCardRarityColor(card.rarity),
        align: 'center'
      }
    );
    title.setOrigin(0.5);
    this._previewPopup.add(title);

    // Description
    const desc = new Phaser.GameObjects.Text(
      this.scene,
      0,
      -10,
      card.description,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: '#cccccc',
        align: 'left',
        wordWrap: { width: width - 20 }
      }
    );
    desc.setOrigin(0.5);
    this._previewPopup.add(desc);

    // Cost
    const cost = new Phaser.GameObjects.Text(
      this.scene,
      0,
      height / 2 - 15,
      `价格: ${card.cost} 金币`,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        color: '#ffd700'
      }
    );
    cost.setOrigin(0.5);
    this._previewPopup.add(cost);

    this.add(this._previewPopup);
  }

  private hideItemPreview(): void {
    if (this._previewPopup) {
      this._previewPopup.destroy();
      this._previewPopup = undefined;
    }
  }

  private getFlowerCardRarityColor(rarity: string): string {
    switch (rarity) {
      case 'common': return '#ffffff';
      case 'rare': return '#00ff00';
      case 'epic': return '#8a2be2';
      case 'legendary': return '#ffd700';
      default: return '#ffffff';
    }
  }

  private showInsufficientGoldMessage(): void {
    const centerX = 0;
    const centerY = -50;

    const message = new Phaser.GameObjects.Text(
      this.scene,
      centerX,
      centerY,
      '金币不足!',
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '18px',
        color: '#ff4444',
        backgroundColor: '#000000',
        padding: { x: 15, y: 8 }
      }
    );
    message.setOrigin(0.5);
    message.setAlpha(0);
    this.add(message);

    this.scene.tweens.add({
      targets: message,
      alpha: 1,
      y: centerY - 20,
      duration: 200,
      ease: 'Back.Out',
      onComplete: () => {
        this.scene.time.delayedCall(1000, () => {
          this.scene.tweens.add({
            targets: message,
            alpha: 0,
            duration: 200,
            onComplete: () => message.destroy()
          });
        });
      }
    });
  }
}
