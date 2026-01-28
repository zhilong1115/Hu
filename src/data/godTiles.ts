import { TileSuit, DragonValue, WindValue } from '../core/Tile';
import { GodTileRarity, GodTileEffect, GodTileEffectContext } from '../roguelike/GodTile';

export interface GodTileDataEntry {
  baseTile: { suit: TileSuit; value: number };
  rarity: GodTileRarity;
  displayName: string;
  cost: number;
  effects: GodTileEffect[];
}

// ─── Effect Helper Functions ────────────────────────────────────────────────

function hasFanWithName(context: GodTileEffectContext, ...names: string[]): boolean {
  return context.detectedFans.some(f => names.some(n => f.name.includes(n)));
}

function hasTileInHand(context: GodTileEffectContext, suit: TileSuit, value?: number): boolean {
  return context.hand.some(t => t.suit === suit && (value === undefined || t.value === value));
}

function countTilesInHand(context: GodTileEffectContext, suit: TileSuit, value?: number): number {
  return context.hand.filter(t => t.suit === suit && (value === undefined || t.value === value)).length;
}

function countPongsInDecomp(context: GodTileEffectContext): number {
  if (!context.decomposition || context.decomposition.form !== 'standard') return 0;
  return context.decomposition.melds.filter(m => m.type === 'pong').length;
}

function countChowsInDecomp(context: GodTileEffectContext): number {
  if (!context.decomposition || context.decomposition.form !== 'standard') return 0;
  return context.decomposition.melds.filter(m => m.type === 'chow').length;
}

// ─── Common God Tiles (1-3金) ───────────────────────────────────────────────

export const COMMON_GOD_TILES: GodTileDataEntry[] = [
  {
    baseTile: { suit: TileSuit.Wan, value: 1 },
    rarity: GodTileRarity.COMMON,
    displayName: '财神一万',
    cost: 3,  // Increased from 2 - economic boost is always valuable
    effects: [
      {
        name: '招财',
        description: '每次胡牌额外获得1金币',
        activate: (context: GodTileEffectContext) => {
          context.goldModifiers.push({
            source: '财神一万',
            amount: 1,
            description: '招财'
          });
        }
      }
    ]
  },
  {
    baseTile: { suit: TileSuit.Dragon, value: DragonValue.Red },
    rarity: GodTileRarity.COMMON,
    displayName: '红中神牌',
    cost: 3,
    effects: [
      {
        name: '红中加持',
        description: '有红中的番型额外+2番',  // Buffed from +1 to +2 mult
        activate: (context: GodTileEffectContext) => {
          // Check if hand contains red dragon
          if (hasTileInHand(context, TileSuit.Dragon, DragonValue.Red)) {
            context.multModifiers.push({
              source: '红中神牌',
              amount: 2,  // Buffed from 1
              description: '红中加持'
            });
          }
        }
      }
    ]
  }
];

// Rare God Tiles (4-8金)
export const RARE_GOD_TILES: GodTileDataEntry[] = [
  {
    baseTile: { suit: TileSuit.Wind, value: WindValue.East },
    rarity: GodTileRarity.RARE,
    displayName: '东风神牌',
    cost: 6,  // Increased from 5 - multiplier is very strong
    effects: [
      {
        name: '东风之力',
        description: '风牌组成的番型翻倍',
        activate: (context: GodTileEffectContext) => {
          // Check if hand contains wind tiles
          const hasWind = hasTileInHand(context, TileSuit.Wind);
          if (hasWind) {
            context.multModifiers.push({
              source: '东风神牌',
              multiplier: 2,
              description: '东风之力'
            });
          }
        }
      }
    ]
  },
  {
    baseTile: { suit: TileSuit.Wan, value: 9 },
    rarity: GodTileRarity.RARE,
    displayName: '九万霸主',
    cost: 7,  // Increased from 6
    effects: [
      {
        name: '老头称王',
        description: '1、9牌的番型+3番',  // Buffed from +2
        activate: (context: GodTileEffectContext) => {
          // Check if any fan involves terminals (1 or 9)
          const hasTerminalFan = hasFanWithName(context, '老头', '混老头', '清老头');
          if (hasTerminalFan) {
            context.multModifiers.push({
              source: '九万霸主',
              amount: 3,  // Buffed from 2
              description: '老头称王'
            });
          }
        }
      }
    ]
  },
  {
    baseTile: { suit: TileSuit.Tong, value: 5 },
    rarity: GodTileRarity.RARE,
    displayName: '五筒聚宝',
    cost: 8,  // Increased from 7 - economic boost is valuable
    effects: [
      {
        name: '聚宝盆',
        description: '每个刻子额外获得1金币',
        activate: (context: GodTileEffectContext) => {
          const pongCount = countPongsInDecomp(context);
          if (pongCount > 0) {
            context.goldModifiers.push({
              source: '五筒聚宝',
              amount: pongCount,
              description: `聚宝盆 (${pongCount}刻)`
            });
          }
        }
      }
    ]
  }
];

// Epic God Tiles (10-15金)
export const EPIC_GOD_TILES: GodTileDataEntry[] = [
  {
    baseTile: { suit: TileSuit.Dragon, value: DragonValue.Green },
    rarity: GodTileRarity.EPIC,
    displayName: '发财神牌',
    cost: 14,  // Increased from 12 - gold doubling is extremely valuable
    effects: [
      {
        name: '发财致富',
        description: '胡牌金币奖励翻倍',
        activate: (context: GodTileEffectContext) => {
          // Note: This should double gold modifiers, not mult
          // Applying as a bonus gold modifier instead
          const baseGold = context.goldModifiers.reduce((sum, m) => sum + m.amount, 0);
          context.goldModifiers.push({
            source: '发财神牌',
            amount: baseGold,
            description: '发财致富'
          });
        }
      },
      {
        name: '绿色传说',
        description: '绿一色番型可以更容易达成',
        activate: (context: GodTileEffectContext) => {
          // If hand has green dragon, boost chips
          if (hasTileInHand(context, TileSuit.Dragon, DragonValue.Green)) {
            context.chipModifiers.push({
              source: '发财神牌',
              amount: 60,  // Buffed from 50
              description: '绿色传说'
            });
          }
        }
      }
    ]
  },
  {
    baseTile: { suit: TileSuit.Tiao, value: 1 },
    rarity: GodTileRarity.EPIC,
    displayName: '一条龙神',
    cost: 15,  // Increased from 14
    effects: [
      {
        name: '龙之力',
        description: '一气通贯番型+5番',  // Buffed from +4
        activate: (context: GodTileEffectContext) => {
          // Check for straight patterns (一气通贯 or any chows)
          const hasStraight = hasFanWithName(context, '一气通贯', '平和');
          if (hasStraight) {
            context.multModifiers.push({
              source: '一条龙神',
              amount: 5,  // Buffed from 4
              description: '龙之力'
            });
          }
        }
      }
    ]
  }
];

// Legendary God Tiles (20-30金)
export const LEGENDARY_GOD_TILES: GodTileDataEntry[] = [
  {
    baseTile: { suit: TileSuit.Dragon, value: DragonValue.White },
    rarity: GodTileRarity.LEGENDARY,
    displayName: '白板创世',
    cost: 28,  // Increased from 25 - very powerful
    effects: [
      {
        name: '创世之力',
        description: '可以替代任意一张牌',
        activate: (context: GodTileEffectContext) => {
          // This is a wildcard effect - implementation would need deeper integration
          // For now, add massive chip bonus as wildcard benefit
          context.chipModifiers.push({
            source: '白板创世',
            amount: 120,  // Buffed from 100
            description: '创世之力'
          });
        }
      },
      {
        name: '纯净之心',
        description: '清一色番型额外+10番',  // Buffed from +8
        activate: (context: GodTileEffectContext) => {
          if (hasFanWithName(context, '清一色')) {
            context.multModifiers.push({
              source: '白板创世',
              amount: 10,  // Buffed from 8
              description: '纯净之心'
            });
          }
        }
      }
    ]
  },
  {
    baseTile: { suit: TileSuit.Wan, value: 5 },
    rarity: GodTileRarity.LEGENDARY,
    displayName: '万中之王',
    cost: 32,  // Increased from 30 - ultimate power
    effects: [
      {
        name: '万能转换',
        description: '可以变成任意万字牌',
        activate: (context: GodTileEffectContext) => {
          // Wildcard for wan suit - add bonus for having wan tiles
          const wanCount = countTilesInHand(context, TileSuit.Wan);
          if (wanCount > 0) {
            context.chipModifiers.push({
              source: '万中之王',
              amount: wanCount * 12,  // Buffed from 10
              description: '万能转换'
            });
          }
        }
      },
      {
        name: '王者之威',
        description: '所有番型+4番',  // Buffed from +3
        activate: (context: GodTileEffectContext) => {
          context.multModifiers.push({
            source: '万中之王',
            amount: 4,  // Buffed from 3
            description: '王者之威'
          });
        }
      }
    ]
  }
];

// ─── New Creative God Tiles ─────────────────────────────────────────────────

// Additional Common God Tiles
export const COMMON_GOD_TILES_EXTRA: GodTileDataEntry[] = [
  {
    baseTile: { suit: TileSuit.Tiao, value: 3 },
    rarity: GodTileRarity.COMMON,
    displayName: '三条幸运',
    cost: 3,  // Increased from 2
    effects: [
      {
        name: '幸运三倍',
        description: '有3条时，筹码+35',  // Buffed from 30
        activate: (context: GodTileEffectContext) => {
          if (hasTileInHand(context, TileSuit.Tiao, 3)) {
            context.chipModifiers.push({
              source: '三条幸运',
              amount: 35,  // Buffed from 30
              description: '幸运三倍'
            });
          }
        }
      }
    ]
  },
  {
    baseTile: { suit: TileSuit.Tong, value: 8 },
    rarity: GodTileRarity.COMMON,
    displayName: '八筒发财',
    cost: 3,
    effects: [
      {
        name: '发发发',
        description: '每张8筒获得7筹码',  // Buffed from 5
        activate: (context: GodTileEffectContext) => {
          const count = countTilesInHand(context, TileSuit.Tong, 8);
          if (count > 0) {
            context.chipModifiers.push({
              source: '八筒发财',
              amount: count * 7,  // Buffed from 5
              description: `发发发 (${count}张)`
            });
          }
        }
      }
    ]
  }
];

// Additional Rare God Tiles
export const RARE_GOD_TILES_EXTRA: GodTileDataEntry[] = [
  {
    baseTile: { suit: TileSuit.Tiao, value: 9 },
    rarity: GodTileRarity.RARE,
    displayName: '九条天尊',
    cost: 7,  // Increased from 6
    effects: [
      {
        name: '天数九九',
        description: '对对和番型额外×1.5倍',
        activate: (context: GodTileEffectContext) => {
          if (hasFanWithName(context, '对对和')) {
            context.multModifiers.push({
              source: '九条天尊',
              multiplier: 1.5,
              description: '天数九九'
            });
          }
        }
      }
    ]
  },
  {
    baseTile: { suit: TileSuit.Dragon, value: DragonValue.White },
    rarity: GodTileRarity.RARE,
    displayName: '白板清心',
    cost: 8,  // Increased from 7
    effects: [
      {
        name: '清心寡欲',
        description: '七对番型+4番',  // Buffed from +3
        activate: (context: GodTileEffectContext) => {
          if (hasFanWithName(context, '七对')) {
            context.multModifiers.push({
              source: '白板清心',
              amount: 4,  // Buffed from 3
              description: '清心寡欲'
            });
          }
        }
      }
    ]
  },
  {
    baseTile: { suit: TileSuit.Wind, value: WindValue.South },
    rarity: GodTileRarity.RARE,
    displayName: '南风炽热',
    cost: 6,  // Increased from 5
    effects: [
      {
        name: '炽热之风',
        description: '每有一张字牌，筹码+10',  // Buffed from 8
        activate: (context: GodTileEffectContext) => {
          const honorCount = context.hand.filter(t =>
            t.suit === TileSuit.Wind || t.suit === TileSuit.Dragon
          ).length;
          if (honorCount > 0) {
            context.chipModifiers.push({
              source: '南风炽热',
              amount: honorCount * 10,  // Buffed from 8
              description: `炽热之风 (${honorCount}张)`
            });
          }
        }
      }
    ]
  }
];

// Additional Epic God Tiles
export const EPIC_GOD_TILES_EXTRA: GodTileDataEntry[] = [
  {
    baseTile: { suit: TileSuit.Wan, value: 7 },
    rarity: GodTileRarity.EPIC,
    displayName: '七万星辰',
    cost: 14,  // Increased from 13
    effects: [
      {
        name: '星辰之力',
        description: '混一色番型+6番',  // Buffed from +5
        activate: (context: GodTileEffectContext) => {
          if (hasFanWithName(context, '混一色')) {
            context.multModifiers.push({
              source: '七万星辰',
              amount: 6,  // Buffed from 5
              description: '星辰之力'
            });
          }
        }
      },
      {
        name: '七星连珠',
        description: '每有一个顺子，获得1金币',
        activate: (context: GodTileEffectContext) => {
          const chowCount = countChowsInDecomp(context);
          if (chowCount > 0) {
            context.goldModifiers.push({
              source: '七万星辰',
              amount: chowCount,
              description: `七星连珠 (${chowCount}顺)`
            });
          }
        }
      }
    ]
  },
  {
    baseTile: { suit: TileSuit.Tong, value: 6 },
    rarity: GodTileRarity.EPIC,
    displayName: '六筒顺利',
    cost: 13,  // Increased from 11
    effects: [
      {
        name: '六六大顺',
        description: '有顺子时筹码×2',
        activate: (context: GodTileEffectContext) => {
          const chowCount = countChowsInDecomp(context);
          if (chowCount > 0) {
            context.chipModifiers.push({
              source: '六筒顺利',
              amount: context.baseChips + context.bonusChips,
              description: '六六大顺'
            });
          }
        }
      }
    ]
  }
];

// Additional Legendary God Tile
export const LEGENDARY_GOD_TILES_EXTRA: GodTileDataEntry[] = [
  {
    baseTile: { suit: TileSuit.Dragon, value: DragonValue.Red },
    rarity: GodTileRarity.LEGENDARY,
    displayName: '红中至尊',
    cost: 30,  // Increased from 28
    effects: [
      {
        name: '至尊之力',
        description: '所有三元牌（红中发财白板）×2筹码',
        activate: (context: GodTileEffectContext) => {
          const dragonCount = countTilesInHand(context, TileSuit.Dragon);
          if (dragonCount > 0) {
            context.chipModifiers.push({
              source: '红中至尊',
              amount: dragonCount * 25,  // Buffed from 20
              description: `至尊之力 (${dragonCount}张)`
            });
          }
        }
      },
      {
        name: '红色传说',
        description: '字一色番型额外+12番',  // Buffed from +10
        activate: (context: GodTileEffectContext) => {
          if (hasFanWithName(context, '字一色')) {
            context.multModifiers.push({
              source: '红中至尊',
              amount: 12,  // Buffed from 10
              description: '红色传说'
            });
          }
        }
      }
    ]
  }
];

export const ALL_GOD_TILES: GodTileDataEntry[] = [
  ...COMMON_GOD_TILES,
  ...COMMON_GOD_TILES_EXTRA,
  ...RARE_GOD_TILES,
  ...RARE_GOD_TILES_EXTRA,
  ...EPIC_GOD_TILES,
  ...EPIC_GOD_TILES_EXTRA,
  ...LEGENDARY_GOD_TILES,
  ...LEGENDARY_GOD_TILES_EXTRA
];

export const getGodTilesByRarity = (rarity: GodTileRarity): GodTileDataEntry[] => {
  return ALL_GOD_TILES.filter(tile => tile.rarity === rarity);
};

export const getRandomGodTile = (rarity?: GodTileRarity): GodTileDataEntry => {
  const tiles = rarity ? getGodTilesByRarity(rarity) : ALL_GOD_TILES;
  return tiles[Math.floor(Math.random() * tiles.length)];
};
