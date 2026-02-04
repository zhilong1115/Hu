/**
 * Material System for HU! Mahjong Roguelike
 * 
 * Materials are tile enhancements that provide bonuses when participating in a winning hand.
 * Each tile can have at most one material, and materials can break/degrade after hu.
 */

export enum Material {
  NONE = 'none',
  BRONZE = 'bronze',           // 🥉 铜牌
  SILVER = 'silver',           // 🥈 银牌
  GOLD = 'gold',               // 🥇 金牌
  BAMBOO = 'bamboo',           // 🎋 竹牌
  ICE = 'ice',                 // 🧊 冰牌
  GLASS = 'glass',             // 🫧 玻璃牌
  COLORED_GLASS = 'colored_glass', // 🔮 琉璃牌
  JADE = 'jade',               // 🍀 玉牌
  PORCELAIN = 'porcelain',     // 🏺 瓷牌
  EMERALD = 'emerald'          // 💎 翡翠牌
}

export type MaterialRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface MaterialData {
  id: Material;
  name: string;           // Chinese name
  emoji: string;          // Display emoji
  rarity: MaterialRarity;
  chips: number;          // Chip bonus (additive)
  mult: number;           // Multiplier bonus (additive to mult)
  multX: number;          // Multiplier bonus (multiplicative, default 1)
  breakChance: number;    // 0-1, chance to break after hu
  degradesTo: Material | null;  // What it becomes when broken (null = disappears)
  special?: string;       // Special effect description
  meltsAfter?: number;    // For ice: number of rounds before melting
  // Legendary material constraints
  onlyHonors?: boolean;   // Can only be applied to honor tiles (字牌)
  onlyNumbered?: boolean; // Can only be applied to numbered tiles (数牌 1-9)
  wildcardHonor?: boolean;  // Acts as any honor tile
  wildcardNumber?: boolean; // Acts as any number (suit unchanged)
}

/**
 * Complete material definitions based on GAME_DESIGN.md
 */
export const MATERIALS: Record<Material, MaterialData> = {
  [Material.NONE]: {
    id: Material.NONE,
    name: '无',
    emoji: '',
    rarity: 'common',
    chips: 0,
    mult: 0,
    multX: 1,
    breakChance: 0,
    degradesTo: null,
  },

  [Material.BRONZE]: {
    id: Material.BRONZE,
    name: '铜牌',
    emoji: '🥉',
    rarity: 'common',
    chips: 5,
    mult: 0,
    multX: 1,
    breakChance: 0,
    degradesTo: null,
  },

  [Material.SILVER]: {
    id: Material.SILVER,
    name: '银牌',
    emoji: '🥈',
    rarity: 'rare',
    chips: 15,
    mult: 0,
    multX: 1,
    breakChance: 0,
    degradesTo: null,
  },

  [Material.GOLD]: {
    id: Material.GOLD,
    name: '金牌',
    emoji: '🥇',
    rarity: 'epic',
    chips: 20,
    mult: 2,
    multX: 1,
    breakChance: 0,
    degradesTo: null,
  },

  [Material.BAMBOO]: {
    id: Material.BAMBOO,
    name: '竹牌',
    emoji: '🎋',
    rarity: 'common',
    chips: 0,
    mult: 0,
    multX: 1,
    breakChance: 0,
    degradesTo: null,
    special: '被弃时 +5 金币',
  },

  [Material.ICE]: {
    id: Material.ICE,
    name: '冰牌',
    emoji: '🧊',
    rarity: 'rare',
    chips: 50,
    mult: 0,
    multX: 1,
    breakChance: 0,  // Ice doesn't break randomly - it melts after rounds
    degradesTo: null,
    special: '3回合后融化',
    meltsAfter: 3,
  },

  [Material.GLASS]: {
    id: Material.GLASS,
    name: '玻璃牌',
    emoji: '🫧',
    rarity: 'rare',
    chips: 0,
    mult: 0,
    multX: 2,
    breakChance: 0.25,
    degradesTo: null,  // Disappears completely when broken
    special: '胡牌后 25% 碎裂消失',
  },

  [Material.COLORED_GLASS]: {
    id: Material.COLORED_GLASS,
    name: '琉璃牌',
    emoji: '🔮',
    rarity: 'epic',
    chips: 0,
    mult: 0,
    multX: 3,
    breakChance: 0.25,
    degradesTo: Material.GLASS,  // Degrades to glass when broken
    special: '胡牌后 25% 碎裂 → 玻璃牌',
  },

  [Material.JADE]: {
    id: Material.JADE,
    name: '玉牌',
    emoji: '🍀',
    rarity: 'epic',
    chips: 10,
    mult: 0,
    multX: 1,
    breakChance: 0,
    degradesTo: null,
    special: '20% 触发额外 +1 倍率',
  },

  [Material.PORCELAIN]: {
    id: Material.PORCELAIN,
    name: '瓷牌',
    emoji: '🏺',
    rarity: 'legendary',
    chips: 0,
    mult: 0,
    multX: 1,
    breakChance: 0,
    degradesTo: null,
    special: '只能作用于字牌，可作为任意字牌（万能字牌）',
    onlyHonors: true,  // Can only be applied to honor tiles
    wildcardHonor: true,  // Acts as wildcard for any honor tile
  },

  [Material.EMERALD]: {
    id: Material.EMERALD,
    name: '翡翠牌',
    emoji: '💎',
    rarity: 'legendary',
    chips: 0,
    mult: 0,
    multX: 1,
    breakChance: 0,
    degradesTo: null,
    special: '只能作用于数牌，可作为任意数字（花色不变）',
    onlyNumbered: true,  // Can only be applied to numbered tiles (1-9)
    wildcardNumber: true,  // Acts as wildcard for any number (suit stays same)
  },
};

/**
 * Get material data by ID
 */
export function getMaterialData(material: Material): MaterialData {
  return MATERIALS[material];
}

/**
 * Get all materials of a specific rarity
 */
export function getMaterialsByRarity(rarity: MaterialRarity): MaterialData[] {
  return Object.values(MATERIALS).filter(m => m.rarity === rarity && m.id !== Material.NONE);
}

/**
 * Get a random material of specified rarity
 */
export function getRandomMaterial(rarity?: MaterialRarity): MaterialData {
  const materials = rarity 
    ? getMaterialsByRarity(rarity) 
    : Object.values(MATERIALS).filter(m => m.id !== Material.NONE);
  return materials[Math.floor(Math.random() * materials.length)];
}

/**
 * Check if a material has any special effect (beyond basic chips/mult)
 */
export function hasSpecialEffect(material: Material): boolean {
  const data = MATERIALS[material];
  return !!data.special;
}

/**
 * Get the emoji display for a material
 */
export function getMaterialEmoji(material: Material): string {
  return MATERIALS[material].emoji;
}

/**
 * Calculate the visual tier of a material (for UI purposes)
 * Returns 0-3 based on rarity
 */
export function getMaterialTier(material: Material): number {
  const rarityTiers: Record<MaterialRarity, number> = {
    common: 0,
    rare: 1,
    epic: 2,
    legendary: 3,
  };
  return rarityTiers[MATERIALS[material].rarity];
}
