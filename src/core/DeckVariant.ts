import { Tile, TileSuit, WindValue, DragonValue, TileValue } from './Tile';

/**
 * Difficulty levels for deck variants
 */
export enum DeckDifficulty {
  Easy = 'easy',
  Normal = 'normal',
  Hard = 'hard',
  Expert = 'expert'
}

/**
 * Deck variant metadata
 */
export interface DeckVariant {
  id: string;
  name: string;           // Display name
  nameCN: string;         // Chinese name
  description: string;    // Description of what makes this deck unique
  descriptionCN: string;  // Chinese description
  tileCount: number;      // Total tiles in this variant
  difficulty: DeckDifficulty;

  // Factory function to generate the tile set
  createTileSet: () => Tile[];

  // Optional: Special scoring rules or modifications
  scoringModifier?: {
    chipBonus?: number;    // Flat chip bonus per hand
    multBonus?: number;    // Flat mult bonus per hand
    goldBonus?: number;    // Extra gold per win
  };
}

/**
 * Special metadata for Red Dora tiles
 */
export interface RedDoraMetadata {
  isRedDora: boolean;
  chipBonus: number;  // Bonus chips when used in winning hand
}

/**
 * Helper function to create 4 copies of a tile
 */
function addTiles(
  tiles: Tile[],
  suit: TileSuit,
  value: TileValue,
  displayName: string,
  copies: number = 4
): void {
  for (let copyIndex = 0; copyIndex < copies; copyIndex++) {
    tiles.push({
      id: `${suit}-${value}-${copyIndex}`,
      suit,
      value,
      displayName
    });
  }
}

/**
 * Helper function to create a Red Dora variant of a tile (with special marker)
 */
function addRedDoraTile(
  tiles: Tile[],
  suit: TileSuit,
  value: TileValue,
  displayName: string,
  copyIndex: number
): void {
  tiles.push({
    id: `${suit}-${value}-${copyIndex}-red`,  // Special ID to identify red dora
    suit,
    value,
    displayName: `赤${displayName}`  // Prefix with 赤 (red)
  });
}

/* ── Deck Variant Implementations ────────────────────────── */

/**
 * Standard deck — full 136 tiles (default)
 */
function createStandardDeck(): Tile[] {
  const tiles: Tile[] = [];

  // Add number tiles (1-9) for Wan, Tiao, and Tong
  for (let value = 1; value <= 9; value++) {
    addTiles(tiles, TileSuit.Wan, value as TileValue, `${value}万`);
  }

  for (let value = 1; value <= 9; value++) {
    addTiles(tiles, TileSuit.Tiao, value as TileValue, `${value}条`);
  }

  for (let value = 1; value <= 9; value++) {
    addTiles(tiles, TileSuit.Tong, value as TileValue, `${value}筒`);
  }

  // Add Wind tiles (4 types × 4 copies = 16 tiles)
  addTiles(tiles, TileSuit.Wind, WindValue.East, '东风');
  addTiles(tiles, TileSuit.Wind, WindValue.South, '南风');
  addTiles(tiles, TileSuit.Wind, WindValue.West, '西风');
  addTiles(tiles, TileSuit.Wind, WindValue.North, '北风');

  // Add Dragon tiles (3 types × 4 copies = 12 tiles)
  addTiles(tiles, TileSuit.Dragon, DragonValue.Red, '红中');
  addTiles(tiles, TileSuit.Dragon, DragonValue.Green, '发财');
  addTiles(tiles, TileSuit.Dragon, DragonValue.White, '白板');

  return tiles;
}

/**
 * Honors Only deck — only winds + dragons (28 tiles)
 * Fewer tiles = harder to form winning hands
 */
function createHonorsOnlyDeck(): Tile[] {
  const tiles: Tile[] = [];

  // Add Wind tiles (4 types × 4 copies = 16 tiles)
  addTiles(tiles, TileSuit.Wind, WindValue.East, '东风');
  addTiles(tiles, TileSuit.Wind, WindValue.South, '南风');
  addTiles(tiles, TileSuit.Wind, WindValue.West, '西风');
  addTiles(tiles, TileSuit.Wind, WindValue.North, '北风');

  // Add Dragon tiles (3 types × 4 copies = 12 tiles)
  addTiles(tiles, TileSuit.Dragon, DragonValue.Red, '红中');
  addTiles(tiles, TileSuit.Dragon, DragonValue.Green, '发财');
  addTiles(tiles, TileSuit.Dragon, DragonValue.White, '白板');

  return tiles;
}

/**
 * Bamboo Master deck — only bamboo/tiao suit + honors (64 tiles)
 */
function createBambooMasterDeck(): Tile[] {
  const tiles: Tile[] = [];

  // Add Tiao (Bamboo) tiles (9 types × 4 copies = 36 tiles)
  for (let value = 1; value <= 9; value++) {
    addTiles(tiles, TileSuit.Tiao, value as TileValue, `${value}条`);
  }

  // Add Wind tiles (4 types × 4 copies = 16 tiles)
  addTiles(tiles, TileSuit.Wind, WindValue.East, '东风');
  addTiles(tiles, TileSuit.Wind, WindValue.South, '南风');
  addTiles(tiles, TileSuit.Wind, WindValue.West, '西风');
  addTiles(tiles, TileSuit.Wind, WindValue.North, '北风');

  // Add Dragon tiles (3 types × 4 copies = 12 tiles)
  addTiles(tiles, TileSuit.Dragon, DragonValue.Red, '红中');
  addTiles(tiles, TileSuit.Dragon, DragonValue.Green, '发财');
  addTiles(tiles, TileSuit.Dragon, DragonValue.White, '白板');

  return tiles;
}

/**
 * Red Dora deck — standard deck but red 5s (one per suit) have bonus scoring
 * Red 5s are special variants with bonus chips when in winning hand
 */
function createRedDoraDeck(): Tile[] {
  const tiles: Tile[] = [];

  // Add number tiles, but make one copy of each 5 a "red dora"
  const addRedDoraSet = (suit: TileSuit, suitName: string) => {
    for (let value = 1; value <= 9; value++) {
      if (value === 5) {
        // First copy is red dora
        addRedDoraTile(tiles, suit, value as TileValue, `${value}${suitName}`, 0);
        // Other 3 copies are normal (with unique copyIndex 1, 2, 3)
        for (let copyIndex = 1; copyIndex < 4; copyIndex++) {
          tiles.push({
            id: `${suit}-${value}-${copyIndex}`,
            suit,
            value: value as TileValue,
            displayName: `${value}${suitName}`
          });
        }
      } else {
        addTiles(tiles, suit, value as TileValue, `${value}${suitName}`);
      }
    }
  };

  addRedDoraSet(TileSuit.Wan, '万');
  addRedDoraSet(TileSuit.Tiao, '条');
  addRedDoraSet(TileSuit.Tong, '筒');

  // Add Wind tiles (4 types × 4 copies = 16 tiles)
  addTiles(tiles, TileSuit.Wind, WindValue.East, '东风');
  addTiles(tiles, TileSuit.Wind, WindValue.South, '南风');
  addTiles(tiles, TileSuit.Wind, WindValue.West, '西风');
  addTiles(tiles, TileSuit.Wind, WindValue.North, '北风');

  // Add Dragon tiles (3 types × 4 copies = 12 tiles)
  addTiles(tiles, TileSuit.Dragon, DragonValue.Red, '红中');
  addTiles(tiles, TileSuit.Dragon, DragonValue.Green, '发财');
  addTiles(tiles, TileSuit.Dragon, DragonValue.White, '白板');

  return tiles;
}

/* ── Deck Variant Definitions ────────────────────────────── */

export const DECK_VARIANTS: Record<string, DeckVariant> = {
  standard: {
    id: 'standard',
    name: 'Standard',
    nameCN: '标准',
    description: 'Full 136-tile deck with all suits',
    descriptionCN: '完整的136张牌，包含所有花色',
    tileCount: 136,
    difficulty: DeckDifficulty.Normal,
    createTileSet: createStandardDeck
  },

  honorsOnly: {
    id: 'honorsOnly',
    name: 'Honors Only',
    nameCN: '字牌之局',
    description: 'Only winds and dragons. Fewer tiles = harder!',
    descriptionCN: '仅包含风牌和箭牌，更少的牌意味着更难胡牌',
    tileCount: 28,
    difficulty: DeckDifficulty.Expert,
    createTileSet: createHonorsOnlyDeck,
    scoringModifier: {
      multBonus: 2  // Bonus mult to compensate for difficulty
    }
  },

  bambooMaster: {
    id: 'bambooMaster',
    name: 'Bamboo Master',
    nameCN: '条子大师',
    description: 'Only bamboo suit + honors',
    descriptionCN: '仅包含条子花色和字牌',
    tileCount: 64,
    difficulty: DeckDifficulty.Hard,
    createTileSet: createBambooMasterDeck,
    scoringModifier: {
      multBonus: 1  // Small bonus mult
    }
  },

  redDora: {
    id: 'redDora',
    name: 'Red Dora',
    nameCN: '赤宝牌',
    description: 'Standard deck with red 5s (+10 chips each)',
    descriptionCN: '标准牌组，但红色的5有额外分数（每张+10筹码）',
    tileCount: 136,
    difficulty: DeckDifficulty.Easy,
    createTileSet: createRedDoraDeck,
    scoringModifier: {
      chipBonus: 0  // Chips are added per red dora tile, not flat
    }
  }
};

/**
 * Get all deck variants as an array
 */
export function getAllDeckVariants(): DeckVariant[] {
  return Object.values(DECK_VARIANTS);
}

/**
 * Get a specific deck variant by ID
 */
export function getDeckVariant(id: string): DeckVariant | undefined {
  return DECK_VARIANTS[id];
}

/**
 * Check if a tile is a Red Dora tile
 */
export function isRedDoraTile(tile: Tile): boolean {
  return tile.id.endsWith('-red');
}

/**
 * Get the chip bonus for Red Dora tiles
 */
export function getRedDoraChipBonus(tile: Tile): number {
  return isRedDoraTile(tile) ? 10 : 0;
}
