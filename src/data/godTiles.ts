/**
 * God Tiles (神牌) System
 * 
 * Based on GAME_DESIGN.md v4.0
 * - 28 unique god tiles organized into 4 bonds (羁绊)
 * - Each bond has 7 tiles: 3 green, 2 blue, 1-2 purple, 1 gold
 * - Bond levels unlock at 2/4/6 tiles
 */

// ─── Enums ─────────────────────────────────────────────────────────────────

export enum GodTileRarity {
  GREEN = 'green',    // 🟢 50% drop, 5-10 gold
  BLUE = 'blue',      // 🔵 30% drop, 15-22 gold
  PURPLE = 'purple',  // 🟣 15% drop, 30-40 gold
  GOLD = 'gold'       // 🟡 5% drop, 55-60 gold (special unlock)
}

export enum GodTileBond {
  GAMBLE = 'gamble',      // 🎲 赌博羁绊 — 概率与风险
  VISION = 'vision',      // 👁️ 洞察羁绊 — 看牌与预知
  WEALTH = 'wealth',      // 💰 财运羁绊 — 金币转倍率
  TRANSFORM = 'transform' // 🔄 转化羁绊 — 材质强化
}

// ─── Effect Types ──────────────────────────────────────────────────────────

export type GodTileEffectTrigger = 
  | 'onPlay'           // 出牌时 (吃/碰/杠)
  | 'onDiscard'        // 弃牌时
  | 'onDraw'           // 摸牌时
  | 'onRoundStart'     // 每局开始
  | 'onRoundEnd'       // 每回合结束
  | 'onScore'          // 胡牌结算时
  | 'onFlowerPick'     // 抽花牌时
  | 'onFlowerUse'      // 使用花牌时
  | 'passive'          // 被动效果

export interface GodTileEffect {
  trigger: GodTileEffectTrigger;
  description: string;
  
  // Effect parameters (varies by effect type)
  probability?: number;        // For probability-based effects (0-1)
  value?: number;              // Generic value (gold amount, multiplier, etc.)
  condition?: string;          // Human-readable condition
  
  // For transform effects
  targetMaterial?: string;
  tileCount?: number;
}

// ─── God Tile Interface ────────────────────────────────────────────────────

export interface GodTile {
  id: string;
  name: string;
  description: string;
  rarity: GodTileRarity;
  bond: GodTileBond;
  price: number;
  effect: GodTileEffect;
  
  // Special flags
  isAutoUnlock?: boolean;  // For gold tiles that auto-unlock
}

// ─── Bond Level Definitions ────────────────────────────────────────────────

export interface BondLevel {
  level: number;
  name: string;
  required: number;
  effect: string;
}

export const BOND_LEVELS: Record<GodTileBond, BondLevel[]> = {
  [GodTileBond.GAMBLE]: [
    { level: 1, name: '赌侠', required: 2, effect: '所有概率效果 +10%' },
    { level: 2, name: '赌王', required: 4, effect: '概率失败时 无负面效果' },
    { level: 3, name: '赌神', required: 6, effect: '每次结算 转轮盘: (+/-/×) × (1/3/5/9)' }
  ],
  [GodTileBond.VISION]: [
    { level: 1, name: '读心者', required: 2, effect: '每次出牌后，牌堆顶 2张 变明牌' },
    { level: 2, name: '操纵师', required: 4, effect: '每局1次，弃牌时可从 明牌中选摸（限3张）' },
    { level: 3, name: '空想家', required: 6, effect: '牌堆 全部变明牌' }
  ],
  [GodTileBond.WEALTH]: [
    { level: 1, name: '财源广进', required: 2, effect: '胡牌时，每 50金币 → +1倍率' },
    { level: 2, name: '点石成金', required: 4, effect: '胡牌时，每 30金币 → +1倍率' },
    { level: 3, name: '富可敌国', required: 6, effect: '胡牌时，每 20金币 → ×1.5倍率' }
  ],
  [GodTileBond.TRANSFORM]: [
    { level: 1, name: '偷天换日', required: 2, effect: '胡牌时，每张材质牌 → +1倍率' },
    { level: 2, name: '造物主', required: 4, effect: '材质碎裂概率 减半，每张材质牌 → +2倍率' },
    { level: 3, name: '万象归一', required: 6, effect: '材质 不会碎裂，每张材质牌 → ×1.5倍率' }
  ]
};

// ─── 赌博羁绊 God Tiles (7张) ──────────────────────────────────────────────

const GAMBLE_GOD_TILES: GodTile[] = [
  // 🟢 Green (3张)
  {
    id: 'gamble_beginner_luck',
    name: '赌运初开',
    description: '出牌时 20% 概率额外选一张花牌',
    rarity: GodTileRarity.GREEN,
    bond: GodTileBond.GAMBLE,
    price: 8,
    effect: {
      trigger: 'onPlay',
      description: '出牌时 20% 概率额外选一张花牌',
      probability: 0.2
    }
  },
  {
    id: 'gamble_muddy_waters',
    name: '浑水摸鱼',
    description: '弃牌摸牌时 20% 概率多摸2张再选',
    rarity: GodTileRarity.GREEN,
    bond: GodTileBond.GAMBLE,
    price: 9,
    effect: {
      trigger: 'onDiscard',
      description: '弃牌摸牌时 20% 概率多摸2张再选',
      probability: 0.2,
      value: 2
    }
  },
  {
    id: 'gamble_steady_flow',
    name: '细水长流',
    description: '使用花牌时 20% 概率不消耗',
    rarity: GodTileRarity.GREEN,
    bond: GodTileBond.GAMBLE,
    price: 10,
    effect: {
      trigger: 'onFlowerUse',
      description: '使用花牌时 20% 概率不消耗',
      probability: 0.2
    }
  },
  
  // 🔵 Blue (2张)
  {
    id: 'gamble_big_bet',
    name: '豪赌一番',
    description: '结算时 50% 得分+30%，失败-10%',
    rarity: GodTileRarity.BLUE,
    bond: GodTileBond.GAMBLE,
    price: 18,
    effect: {
      trigger: 'onScore',
      description: '结算时 50% 得分+30%，失败-10%',
      probability: 0.5,
      value: 0.3  // +30% on success
    }
  },
  {
    id: 'gamble_fortune_flow',
    name: '财运亨通',
    description: '回合结束 50% +15金币，失败-5金币',
    rarity: GodTileRarity.BLUE,
    bond: GodTileBond.GAMBLE,
    price: 20,
    effect: {
      trigger: 'onRoundEnd',
      description: '回合结束 50% +15金币，失败-5金币',
      probability: 0.5,
      value: 15
    }
  },
  
  // 🟣 Purple (1张)
  {
    id: 'gamble_all_in',
    name: '孤注一掷',
    description: '胡牌时 75% 得分×神牌数，失败-50%金币',
    rarity: GodTileRarity.PURPLE,
    bond: GodTileBond.GAMBLE,
    price: 35,
    effect: {
      trigger: 'onScore',
      description: '胡牌时 75% 得分×神牌数，失败-50%金币',
      probability: 0.75,
      condition: '得分乘以持有的神牌数量'
    }
  },
  
  // 🟡 Gold (1张) - Special unlock
  {
    id: 'gamble_probability_dice',
    name: '概率之骰',
    description: '所有概率变 100%（集齐其他6张赌博神牌自动获得）',
    rarity: GodTileRarity.GOLD,
    bond: GodTileBond.GAMBLE,
    price: 0, // Cannot be bought
    effect: {
      trigger: 'passive',
      description: '所有概率变 100%'
    },
    isAutoUnlock: true
  }
];

// ─── 洞察羁绊 God Tiles (7张) ──────────────────────────────────────────────

const VISION_GOD_TILES: GodTile[] = [
  // 🟢 Green (3张)
  {
    id: 'vision_far_sight',
    name: '千里眼',
    description: '游戏开始时，牌堆顶 5张 变明牌',
    rarity: GodTileRarity.GREEN,
    bond: GodTileBond.VISION,
    price: 8,
    effect: {
      trigger: 'onRoundStart',
      description: '游戏开始时，牌堆顶 5张 变明牌',
      value: 5
    }
  },
  {
    id: 'vision_keen_ear',
    name: '顺风耳',
    description: '每次摸牌后，下一张自动变明牌',
    rarity: GodTileRarity.GREEN,
    bond: GodTileBond.VISION,
    price: 9,
    effect: {
      trigger: 'onDraw',
      description: '每次摸牌后，下一张自动变明牌',
      value: 1
    }
  },
  {
    id: 'vision_inspiration',
    name: '灵光一闪',
    description: '抽花牌时，额外多看 1张 再选',
    rarity: GodTileRarity.GREEN,
    bond: GodTileBond.VISION,
    price: 7,
    effect: {
      trigger: 'onFlowerPick',
      description: '抽花牌时，额外多看 1张 再选',
      value: 1
    }
  },
  
  // 🔵 Blue (2张)
  {
    id: 'vision_heaven_hand',
    name: '乾坤手',
    description: '每回合可将 1张明牌 移到牌堆顶',
    rarity: GodTileRarity.BLUE,
    bond: GodTileBond.VISION,
    price: 18,
    effect: {
      trigger: 'passive',
      description: '每回合可将 1张明牌 移到牌堆顶',
      value: 1,
      condition: '主动技能，每回合1次'
    }
  },
  {
    id: 'vision_shuffle_master',
    name: '洗牌圣手',
    description: '每回合1次，明牌洗入牌堆并重抽同等数量',
    rarity: GodTileRarity.BLUE,
    bond: GodTileBond.VISION,
    price: 16,
    effect: {
      trigger: 'passive',
      description: '每回合1次，明牌洗入牌堆并重抽同等数量',
      condition: '主动技能，每回合1次'
    }
  },
  
  // 🟣 Purple (1张)
  {
    id: 'vision_scavenger',
    name: '拾遗者',
    description: '每局1次，弃牌时可从 已弃牌堆 中换牌',
    rarity: GodTileRarity.PURPLE,
    bond: GodTileBond.VISION,
    price: 32,
    effect: {
      trigger: 'onDiscard',
      description: '每局1次，弃牌时可从 已弃牌堆 中换牌',
      condition: '每局限用1次'
    }
  },
  
  // 🟡 Gold (1张)
  {
    id: 'vision_fate_weaver',
    name: '命运编织',
    description: '开局可将 2张手牌 替换成牌堆任意牌',
    rarity: GodTileRarity.GOLD,
    bond: GodTileBond.VISION,
    price: 55,
    effect: {
      trigger: 'onRoundStart',
      description: '开局可将 2张手牌 替换成牌堆任意牌',
      value: 2,
      condition: '主动技能，每局开始时'
    }
  }
];

// ─── 财运羁绊 God Tiles (7张) ──────────────────────────────────────────────

const WEALTH_GOD_TILES: GodTile[] = [
  // 🟢 Green (3张)
  {
    id: 'wealth_lucky_cat',
    name: '招财猫',
    description: '每次吃/碰/杠获得 +8金币',
    rarity: GodTileRarity.GREEN,
    bond: GodTileBond.WEALTH,
    price: 7,
    effect: {
      trigger: 'onPlay',
      description: '每次吃/碰/杠获得 +8金币',
      value: 8
    }
  },
  {
    id: 'wealth_treasure_bowl',
    name: '聚宝盆',
    description: '回合结束时，获得 当前金币10% 的额外金币',
    rarity: GodTileRarity.GREEN,
    bond: GodTileBond.WEALTH,
    price: 9,
    effect: {
      trigger: 'onRoundEnd',
      description: '回合结束时，获得 当前金币10% 的额外金币',
      value: 0.1
    }
  },
  {
    id: 'wealth_golden_toad',
    name: '金蟾',
    description: '弃牌时，每弃1张 +3金币',
    rarity: GodTileRarity.GREEN,
    bond: GodTileBond.WEALTH,
    price: 8,
    effect: {
      trigger: 'onDiscard',
      description: '弃牌时，每弃1张 +3金币',
      value: 3
    }
  },
  
  // 🔵 Blue (2张)
  {
    id: 'wealth_money_tree',
    name: '摇钱树',
    description: '每持有1张花牌，回合结束 +5金币',
    rarity: GodTileRarity.BLUE,
    bond: GodTileBond.WEALTH,
    price: 18,
    effect: {
      trigger: 'onRoundEnd',
      description: '每持有1张花牌，回合结束 +5金币',
      value: 5,
      condition: '基于持有的花牌数量'
    }
  },
  {
    id: 'wealth_pixiu',
    name: '貔貅',
    description: '所有金币获取 +50%，但无法在商店卖牌',
    rarity: GodTileRarity.BLUE,
    bond: GodTileBond.WEALTH,
    price: 22,
    effect: {
      trigger: 'passive',
      description: '所有金币获取 +50%，但无法在商店卖牌',
      value: 0.5,
      condition: '无法出售任何物品'
    }
  },
  
  // 🟣 Purple (1张)
  {
    id: 'wealth_god_of_wealth',
    name: '财神',
    description: '每回合开始 +15金币，胡牌时金币奖励 ×1.5',
    rarity: GodTileRarity.PURPLE,
    bond: GodTileBond.WEALTH,
    price: 38,
    effect: {
      trigger: 'onRoundStart',
      description: '每回合开始 +15金币，胡牌时金币奖励 ×1.5',
      value: 15
    }
  },
  
  // 🟡 Gold (1张)
  {
    id: 'wealth_three_stars',
    name: '福禄寿',
    description: '金币上限提升至 999，超过200金币时所有倍率 ×2',
    rarity: GodTileRarity.GOLD,
    bond: GodTileBond.WEALTH,
    price: 60,
    effect: {
      trigger: 'passive',
      description: '金币上限提升至 999，超过200金币时所有倍率 ×2',
      value: 999,
      condition: '金币 > 200 时所有倍率 ×2'
    }
  }
];

// ─── 转化羁绊 God Tiles (7张) ──────────────────────────────────────────────

const TRANSFORM_GOD_TILES: GodTile[] = [
  // 🟢 Green (3张)
  {
    id: 'transform_copper_smith',
    name: '镀铜匠',
    description: '每局开始时，随机 3张牌 变成铜牌',
    rarity: GodTileRarity.GREEN,
    bond: GodTileBond.TRANSFORM,
    price: 6,
    effect: {
      trigger: 'onRoundStart',
      description: '每局开始时，随机 3张牌 变成铜牌',
      targetMaterial: 'copper',
      tileCount: 3
    }
  },
  {
    id: 'transform_ice_master',
    name: '冰封师',
    description: '每局开始时，随机 2张牌 变成冰牌',
    rarity: GodTileRarity.GREEN,
    bond: GodTileBond.TRANSFORM,
    price: 8,
    effect: {
      trigger: 'onRoundStart',
      description: '每局开始时，随机 2张牌 变成冰牌',
      targetMaterial: 'ice',
      tileCount: 2
    }
  },
  {
    id: 'transform_bamboo_weaver',
    name: '竹编匠',
    description: '每局开始时，随机 3张牌 变成竹牌',
    rarity: GodTileRarity.GREEN,
    bond: GodTileBond.TRANSFORM,
    price: 5,
    effect: {
      trigger: 'onRoundStart',
      description: '每局开始时，随机 3张牌 变成竹牌',
      targetMaterial: 'bamboo',
      tileCount: 3
    }
  },
  
  // 🔵 Blue (2张)
  {
    id: 'transform_silver_smith',
    name: '银匠',
    description: '每局开始时，随机 2张牌 变成银牌',
    rarity: GodTileRarity.BLUE,
    bond: GodTileBond.TRANSFORM,
    price: 15,
    effect: {
      trigger: 'onRoundStart',
      description: '每局开始时，随机 2张牌 变成银牌',
      targetMaterial: 'silver',
      tileCount: 2
    }
  },
  {
    id: 'transform_glass_worker',
    name: '玻璃工',
    description: '每局开始时，随机 1张牌 变成玻璃牌',
    rarity: GodTileRarity.BLUE,
    bond: GodTileBond.TRANSFORM,
    price: 18,
    effect: {
      trigger: 'onRoundStart',
      description: '每局开始时，随机 1张牌 变成玻璃牌',
      targetMaterial: 'glass',
      tileCount: 1
    }
  },
  
  // 🟣 Purple (2张)
  {
    id: 'transform_gold_touch',
    name: '点石成金',
    description: '每局开始时，所有铜/银牌 变成金牌',
    rarity: GodTileRarity.PURPLE,
    bond: GodTileBond.TRANSFORM,
    price: 32,
    effect: {
      trigger: 'onRoundStart',
      description: '每局开始时，所有铜/银牌 变成金牌',
      targetMaterial: 'gold',
      condition: '升级所有铜牌和银牌'
    }
  },
  {
    id: 'transform_glass_master',
    name: '琉璃匠',
    description: '每局开始时，随机 1张牌 变成琉璃牌',
    rarity: GodTileRarity.PURPLE,
    bond: GodTileBond.TRANSFORM,
    price: 38,
    effect: {
      trigger: 'onRoundStart',
      description: '每局开始时，随机 1张牌 变成琉璃牌',
      targetMaterial: 'glazed',
      tileCount: 1
    }
  },
  
  // 🟡 Gold (1张)
  {
    id: 'transform_jade_touch',
    name: '点石成玉',
    description: '每局开始时，所有铜/银牌 升级为玉牌',
    rarity: GodTileRarity.GOLD,
    bond: GodTileBond.TRANSFORM,
    price: 55,
    effect: {
      trigger: 'onRoundStart',
      description: '每局开始时，所有铜/银牌 升级为玉牌',
      targetMaterial: 'jade',
      condition: '升级所有铜牌和银牌为玉牌'
    }
  }
];

// ─── All God Tiles ─────────────────────────────────────────────────────────

export const ALL_GOD_TILES: GodTile[] = [
  ...GAMBLE_GOD_TILES,
  ...VISION_GOD_TILES,
  ...WEALTH_GOD_TILES,
  ...TRANSFORM_GOD_TILES
];

// ─── Helper Functions ──────────────────────────────────────────────────────

/** Get all god tiles of a specific rarity */
export function getGodTilesByRarity(rarity: GodTileRarity): GodTile[] {
  return ALL_GOD_TILES.filter(tile => tile.rarity === rarity);
}

/** Get all god tiles of a specific bond */
export function getGodTilesByBond(bond: GodTileBond): GodTile[] {
  return ALL_GOD_TILES.filter(tile => tile.bond === bond);
}

/** Get a god tile by its ID */
export function getGodTileById(id: string): GodTile | undefined {
  return ALL_GOD_TILES.find(tile => tile.id === id);
}

/** Get purchasable god tiles (excludes auto-unlock gold tiles) */
export function getPurchasableGodTiles(): GodTile[] {
  return ALL_GOD_TILES.filter(tile => !tile.isAutoUnlock);
}

/** Get drop probability for a rarity */
export function getRarityDropRate(rarity: GodTileRarity): number {
  switch (rarity) {
    case GodTileRarity.GREEN: return 0.5;
    case GodTileRarity.BLUE: return 0.3;
    case GodTileRarity.PURPLE: return 0.15;
    case GodTileRarity.GOLD: return 0.05;
  }
}

/** Get price range for a rarity */
export function getRarityPriceRange(rarity: GodTileRarity): { min: number; max: number } {
  switch (rarity) {
    case GodTileRarity.GREEN: return { min: 5, max: 10 };
    case GodTileRarity.BLUE: return { min: 15, max: 22 };
    case GodTileRarity.PURPLE: return { min: 30, max: 40 };
    case GodTileRarity.GOLD: return { min: 55, max: 60 };
  }
}

/** Generate shop offerings based on rarity weights */
export function generateShopGodTiles(count: number = 4): GodTile[] {
  const purchasable = getPurchasableGodTiles();
  const result: GodTile[] = [];
  
  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    let targetRarity: GodTileRarity;
    
    if (roll < 0.5) {
      targetRarity = GodTileRarity.GREEN;
    } else if (roll < 0.8) {
      targetRarity = GodTileRarity.BLUE;
    } else if (roll < 0.95) {
      targetRarity = GodTileRarity.PURPLE;
    } else {
      targetRarity = GodTileRarity.GOLD;
    }
    
    const candidates = purchasable.filter(t => 
      t.rarity === targetRarity && !result.includes(t)
    );
    
    if (candidates.length > 0) {
      const selected = candidates[Math.floor(Math.random() * candidates.length)];
      result.push(selected);
    }
  }
  
  return result;
}

// ─── Bond Info ─────────────────────────────────────────────────────────────

export const BOND_INFO: Record<GodTileBond, { name: string; icon: string; description: string }> = {
  [GodTileBond.GAMBLE]: {
    name: '赌博',
    icon: '🎲',
    description: '概率与风险'
  },
  [GodTileBond.VISION]: {
    name: '洞察',
    icon: '👁️',
    description: '看牌与预知'
  },
  [GodTileBond.WEALTH]: {
    name: '财运',
    icon: '💰',
    description: '金币转倍率'
  },
  [GodTileBond.TRANSFORM]: {
    name: '转化',
    icon: '🔄',
    description: '材质强化'
  }
};

export const RARITY_INFO: Record<GodTileRarity, { name: string; color: string; icon: string }> = {
  [GodTileRarity.GREEN]: {
    name: '绿神',
    color: '#4CAF50',
    icon: '🟢'
  },
  [GodTileRarity.BLUE]: {
    name: '蓝神',
    color: '#2196F3',
    icon: '🔵'
  },
  [GodTileRarity.PURPLE]: {
    name: '紫神',
    color: '#9C27B0',
    icon: '🟣'
  },
  [GodTileRarity.GOLD]: {
    name: '金神',
    color: '#FFD700',
    icon: '🟡'
  }
};
