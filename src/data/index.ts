/**
 * Data module exports
 * 
 * Central export point for all game data definitions
 */

// God Tiles (new design-doc compliant system with bonds)
export {
  GodTileRarity,
  GodTileBond,
  BOND_LEVELS,
  ALL_GOD_TILES,
  BOND_INFO,
  RARITY_INFO,
  getGodTilesByRarity,
  getGodTilesByBond,
  getGodTileById,
  getPurchasableGodTiles,
  getRarityDropRate,
  getRarityPriceRange,
  generateShopGodTiles
} from './godTiles';

export type {
  GodTile,
  GodTileEffect,
  GodTileEffectTrigger,
  BondLevel
} from './godTiles';

// Legacy God Tiles (for backward compatibility with existing game code)
export * from './godTilesLegacy';

// Fans (番型)
export * from './fans';

// Flower Cards (v5.1)
export * from './flowerCards';

// Season Cards
export * from './seasonCards';

// Materials
export * from './materials';

// Bosses
export * from './bosses';
