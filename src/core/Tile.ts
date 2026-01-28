export enum TileSuit {
  Wan = 'wan',       // 万/Characters
  Tiao = 'tiao',     // 条/Bamboo  
  Tong = 'tong',     // 筒/Dots
  Wind = 'wind',     // 风
  Dragon = 'dragon'  // 龙
}

// Wind values
export enum WindValue {
  East = 1,   // 东
  South = 2,  // 南
  West = 3,   // 西
  North = 4   // 北
}

// Dragon values
export enum DragonValue {
  Red = 1,    // 红中
  Green = 2,  // 发财
  White = 3   // 白板
}

// Union type for all possible tile values
export type TileValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | WindValue | DragonValue;

export interface Tile {
  id: string;           // Unique identifier like "wan-1-0"
  suit: TileSuit;       // The suit of the tile
  value: TileValue;     // The value (1-9 for number suits, enum values for honors)
  displayName: string;  // Human-readable name like "1万", "东风", "红中"
}

/**
 * Creates the full set of 136 mahjong tiles (4 copies of each of the 34 unique tiles)
 */
export function createFullTileSet(): Tile[] {
  const tiles: Tile[] = [];

  // Helper function to create 4 copies of each unique tile
  const addTiles = (suit: TileSuit, value: TileValue, displayName: string) => {
    for (let copyIndex = 0; copyIndex < 4; copyIndex++) {
      tiles.push({
        id: `${suit}-${value}-${copyIndex}`,
        suit,
        value,
        displayName
      });
    }
  };

  // Add number tiles (1-9) for Wan, Tiao, and Tong
  // 9 Wan × 4 = 36 tiles
  for (let value = 1; value <= 9; value++) {
    addTiles(TileSuit.Wan, value as TileValue, `${value}万`);
  }

  // 9 Tiao × 4 = 36 tiles
  for (let value = 1; value <= 9; value++) {
    addTiles(TileSuit.Tiao, value as TileValue, `${value}条`);
  }

  // 9 Tong × 4 = 36 tiles
  for (let value = 1; value <= 9; value++) {
    addTiles(TileSuit.Tong, value as TileValue, `${value}筒`);
  }

  // Add Wind tiles (4 types × 4 copies = 16 tiles)
  addTiles(TileSuit.Wind, WindValue.East, '东风');
  addTiles(TileSuit.Wind, WindValue.South, '南风');
  addTiles(TileSuit.Wind, WindValue.West, '西风');
  addTiles(TileSuit.Wind, WindValue.North, '北风');

  // Add Dragon tiles (3 types × 4 copies = 12 tiles)
  addTiles(TileSuit.Dragon, DragonValue.Red, '红中');
  addTiles(TileSuit.Dragon, DragonValue.Green, '发财');
  addTiles(TileSuit.Dragon, DragonValue.White, '白板');

  return tiles;
}

/**
 * Shuffles an array of tiles using Fisher-Yates algorithm
 */
export function shuffleTiles(tiles: Tile[]): Tile[] {
  const shuffled = [...tiles]; // Create a copy to avoid modifying original
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Draws a specified number of tiles from the wall
 */
export function drawTiles(wall: Tile[], count: number): { drawn: Tile[], remaining: Tile[] } {
  if (count > wall.length) {
    throw new Error(`Cannot draw ${count} tiles from wall with only ${wall.length} tiles`);
  }

  const drawn = wall.slice(0, count);
  const remaining = wall.slice(count);
  
  return { drawn, remaining };
}

/**
 * Sorts tiles by suit then by value
 */
export function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    // Define sort order for suits
    const suitOrder: Record<TileSuit, number> = {
      [TileSuit.Wan]: 1,
      [TileSuit.Tiao]: 2,
      [TileSuit.Tong]: 3,
      [TileSuit.Wind]: 4,
      [TileSuit.Dragon]: 5
    };

    // First sort by suit
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }

    // Then sort by value within the same suit
    return a.value - b.value;
  });
}

/**
 * Gets the human-readable display name for a tile
 */
export function getTileDisplayName(tile: Tile): string {
  return tile.displayName;
}

/**
 * Checks if two tiles are the same type (same suit and value, ignoring copy ID)
 */
export function isSameTile(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.value === b.value;
}

/**
 * Groups tiles by their type (same suit and value)
 */
export function groupTilesByType(tiles: Tile[]): Map<string, Tile[]> {
  const groups = new Map<string, Tile[]>();
  
  for (const tile of tiles) {
    const key = `${tile.suit}-${tile.value}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(tile);
  }
  
  return groups;
}

/**
 * Validates that a tile set contains exactly the expected number of each tile type
 */
export function validateTileSet(tiles: Tile[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (tiles.length !== 136) {
    errors.push(`Expected 136 tiles, got ${tiles.length}`);
  }
  
  const groups = groupTilesByType(tiles);
  
  // Check that we have exactly 34 unique types
  if (groups.size !== 34) {
    errors.push(`Expected 34 unique tile types, got ${groups.size}`);
  }
  
  // Check that each unique type has exactly 4 copies
  for (const [type, tileGroup] of groups) {
    if (tileGroup.length !== 4) {
      errors.push(`Tile type ${type} has ${tileGroup.length} copies instead of 4`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}