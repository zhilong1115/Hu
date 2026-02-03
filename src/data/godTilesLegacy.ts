/**
 * Legacy God Tiles Data
 * 
 * This file maintains backward compatibility with the existing game code
 * (Shop.ts, GameScene.ts) while the new bond-based god tile system
 * is being integrated.
 * 
 * NOTE: This is the OLD system. For the new design-doc compliant system
 * with bonds (羁绊), see godTiles.ts
 */

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
    cost: 3,
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
        description: '有红中的番型额外+2番',
        activate: (context: GodTileEffectContext) => {
          if (hasTileInHand(context, TileSuit.Dragon, DragonValue.Red)) {
            context.multModifiers.push({
              source: '红中神牌',
              amount: 2,
              description: '红中加持'
            });
          }
        }
      }
    ]
  },
  {
    baseTile: { suit: TileSuit.Tiao, value: 3 },
    rarity: GodTileRarity.COMMON,
    displayName: '三条幸运',
    cost: 3,
    effects: [
      {
        name: '幸运三倍',
        description: '有3条时，筹码+35',
        activate: (context: GodTileEffectContext) => {
          if (hasTileInHand(context, TileSuit.Tiao, 3)) {
            context.chipModifiers.push({
              source: '三条幸运',
              amount: 35,
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
        description: '每张8筒获得7筹码',
        activate: (context: GodTileEffectContext) => {
          const count = countTilesInHand(context, TileSuit.Tong, 8);
          if (count > 0) {
            context.chipModifiers.push({
              source: '八筒发财',
              amount: count * 7,
              description: `发发发 (${count}张)`
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
    cost: 6,
    effects: [
      {
        name: '东风之力',
        description: '风牌组成的番型翻倍',
        activate: (context: GodTileEffectContext) => {
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
    cost: 7,
    effects: [
      {
        name: '老头称王',
        description: '1、9牌的番型+3番',
        activate: (context: GodTileEffectContext) => {
          const hasTerminalFan = hasFanWithName(context, '老头', '混老头', '清老头');
          if (hasTerminalFan) {
            context.multModifiers.push({
              source: '九万霸主',
              amount: 3,
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
    cost: 8,
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
  },
  {
    baseTile: { suit: TileSuit.Tiao, value: 9 },
    rarity: GodTileRarity.RARE,
    displayName: '九条天尊',
    cost: 7,
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
    cost: 8,
    effects: [
      {
        name: '清心寡欲',
        description: '七对番型+4番',
        activate: (context: GodTileEffectContext) => {
          if (hasFanWithName(context, '七对')) {
            context.multModifiers.push({
              source: '白板清心',
              amount: 4,
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
    cost: 6,
    effects: [
      {
        name: '炽热之风',
        description: '每有一张字牌，筹码+10',
        activate: (context: GodTileEffectContext) => {
          const honorCount = context.hand.filter(t =>
            t.suit === TileSuit.Wind || t.suit === TileSuit.Dragon
          ).length;
          if (honorCount > 0) {
            context.chipModifiers.push({
              source: '南风炽热',
              amount: honorCount * 10,
              description: `炽热之风 (${honorCount}张)`
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
    cost: 14,
    effects: [
      {
        name: '发财致富',
        description: '胡牌金币奖励翻倍',
        activate: (context: GodTileEffectContext) => {
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
          if (hasTileInHand(context, TileSuit.Dragon, DragonValue.Green)) {
            context.chipModifiers.push({
              source: '发财神牌',
              amount: 60,
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
    cost: 15,
    effects: [
      {
        name: '龙之力',
        description: '一气通贯番型+5番',
        activate: (context: GodTileEffectContext) => {
          const hasStraight = hasFanWithName(context, '一气通贯', '平和');
          if (hasStraight) {
            context.multModifiers.push({
              source: '一条龙神',
              amount: 5,
              description: '龙之力'
            });
          }
        }
      }
    ]
  },
  {
    baseTile: { suit: TileSuit.Wan, value: 7 },
    rarity: GodTileRarity.EPIC,
    displayName: '七万星辰',
    cost: 14,
    effects: [
      {
        name: '星辰之力',
        description: '混一色番型+6番',
        activate: (context: GodTileEffectContext) => {
          if (hasFanWithName(context, '混一色')) {
            context.multModifiers.push({
              source: '七万星辰',
              amount: 6,
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
    cost: 13,
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

// Legendary God Tiles (20-30金)
export const LEGENDARY_GOD_TILES: GodTileDataEntry[] = [
  {
    baseTile: { suit: TileSuit.Dragon, value: DragonValue.White },
    rarity: GodTileRarity.LEGENDARY,
    displayName: '白板创世',
    cost: 28,
    effects: [
      {
        name: '创世之力',
        description: '可以替代任意一张牌',
        activate: (context: GodTileEffectContext) => {
          context.chipModifiers.push({
            source: '白板创世',
            amount: 120,
            description: '创世之力'
          });
        }
      },
      {
        name: '纯净之心',
        description: '清一色番型额外+10番',
        activate: (context: GodTileEffectContext) => {
          if (hasFanWithName(context, '清一色')) {
            context.multModifiers.push({
              source: '白板创世',
              amount: 10,
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
    cost: 32,
    effects: [
      {
        name: '万能转换',
        description: '可以变成任意万字牌',
        activate: (context: GodTileEffectContext) => {
          const wanCount = countTilesInHand(context, TileSuit.Wan);
          if (wanCount > 0) {
            context.chipModifiers.push({
              source: '万中之王',
              amount: wanCount * 12,
              description: '万能转换'
            });
          }
        }
      },
      {
        name: '王者之威',
        description: '所有番型+4番',
        activate: (context: GodTileEffectContext) => {
          context.multModifiers.push({
            source: '万中之王',
            amount: 4,
            description: '王者之威'
          });
        }
      }
    ]
  },
  {
    baseTile: { suit: TileSuit.Dragon, value: DragonValue.Red },
    rarity: GodTileRarity.LEGENDARY,
    displayName: '红中至尊',
    cost: 30,
    effects: [
      {
        name: '至尊之力',
        description: '所有三元牌（红中发财白板）×2筹码',
        activate: (context: GodTileEffectContext) => {
          const dragonCount = countTilesInHand(context, TileSuit.Dragon);
          if (dragonCount > 0) {
            context.chipModifiers.push({
              source: '红中至尊',
              amount: dragonCount * 25,
              description: `至尊之力 (${dragonCount}张)`
            });
          }
        }
      },
      {
        name: '红色传说',
        description: '字一色番型额外+12番',
        activate: (context: GodTileEffectContext) => {
          if (hasFanWithName(context, '字一色')) {
            context.multModifiers.push({
              source: '红中至尊',
              amount: 12,
              description: '红色传说'
            });
          }
        }
      }
    ]
  }
];

// All legacy god tiles combined
export const ALL_LEGACY_GOD_TILES: GodTileDataEntry[] = [
  ...COMMON_GOD_TILES,
  ...RARE_GOD_TILES,
  ...EPIC_GOD_TILES,
  ...LEGENDARY_GOD_TILES
];

// Helper to get random god tile by rarity (legacy)
export const getLegacyGodTilesByRarity = (rarity: GodTileRarity): GodTileDataEntry[] => {
  return ALL_LEGACY_GOD_TILES.filter(tile => tile.rarity === rarity);
};

export const getRandomLegacyGodTile = (rarity?: GodTileRarity): GodTileDataEntry => {
  const tiles = rarity ? getLegacyGodTilesByRarity(rarity) : ALL_LEGACY_GOD_TILES;
  return tiles[Math.floor(Math.random() * tiles.length)];
};
