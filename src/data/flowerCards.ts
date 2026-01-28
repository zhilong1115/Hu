import { FlowerCardType, FlowerEffect, FlowerCardEffectContext } from '../roguelike/FlowerCard';
import { TileSuit, TileValue } from '../core/Tile';

export interface FlowerCardData {
  type: FlowerCardType;
  name: string;
  description: string;
  cost: number;
  rarity: string;
  effects: FlowerEffect[];
}

// Bamboo Flower Cards - 技能类 (Draw manipulation)
export const BAMBOO_FLOWER_CARDS: FlowerCardData[] = [
  {
    type: FlowerCardType.BAMBOO,
    name: '翠竹引路',
    description: '下次摸牌可以看到3张牌并选择1张',
    cost: 3,
    rarity: 'common',
    effects: [
      {
        name: '预见',
        description: '提前看到摸牌选项',
        triggerCondition: 'on_draw',
        effect: async (context: FlowerCardEffectContext) => {
          // Draw 3 tiles from draw pile
          if (context.drawPile.length >= 3 && context.drawFromOptions) {
            const options = [
              context.drawPile[0],
              context.drawPile[1],
              context.drawPile[2]
            ];
            const chosen = await context.drawFromOptions(options);
            // The chosen tile will be added to hand by the caller
          }
        }
      }
    ]
  },
  {
    type: FlowerCardType.BAMBOO,
    name: '竹林听风',
    description: '+1次弃牌机会',
    cost: 5,
    rarity: 'rare',
    effects: [
      {
        name: '风声',
        description: '增加弃牌次数',
        triggerCondition: 'on_use',
        effect: (context: FlowerCardEffectContext) => {
          // Grant extra discard
          context.discardsRemaining += 1;
        }
      }
    ]
  },
  {
    type: FlowerCardType.BAMBOO,
    name: '青竹直上',
    description: '将选中的1张牌变为该花色的最大值(9)',
    cost: 6,
    rarity: 'rare',
    effects: [
      {
        name: '节节高升',
        description: '升级牌的数值',
        triggerCondition: 'on_use',
        effect: (context: FlowerCardEffectContext) => {
          // Transform selected tiles to value 9
          if (context.selectedTiles.length > 0) {
            const tile = context.selectedTiles[0];
            if (tile.suit === TileSuit.Wan ||
                tile.suit === TileSuit.Tiao ||
                tile.suit === TileSuit.Tong) {
              (tile as any).value = 9;
              (tile as any).displayName = `9${tile.displayName.substring(1)}`;
            }
          }
        }
      }
    ]
  }
];

// Plum Flower Cards - 防御类 (Defense)
export const PLUM_FLOWER_CARDS: FlowerCardData[] = [
  {
    type: FlowerCardType.PLUM,
    name: '寒梅傲雪',
    description: 'Boss攻击伤害-1（本轮）',
    cost: 4,
    rarity: 'common',
    effects: [
      {
        name: '抗寒',
        description: '减少受到的伤害',
        triggerCondition: 'on_damage_received',
        effect: (context: FlowerCardEffectContext) => {
          context.damageReduction += 1;
        }
      }
    ]
  },
  {
    type: FlowerCardType.PLUM,
    name: '梅花三弄',
    description: '下次Boss攻击无效化',
    cost: 10,  // Increased from 7 - full attack immunity is very strong
    rarity: 'epic',
    effects: [
      {
        name: '完美格挡',
        description: '完全免疫下次攻击',
        triggerCondition: 'on_next_attack',
        effect: (context: FlowerCardEffectContext) => {
          context.nextAttackImmune = true;
        }
      }
    ]
  }
];

// Orchid Flower Cards - 加成类 (Buffs)
export const ORCHID_FLOWER_CARDS: FlowerCardData[] = [
  {
    type: FlowerCardType.ORCHID,
    name: '幽兰吐芳',
    description: '下次胡牌番数+2',
    cost: 4,
    rarity: 'common',
    effects: [
      {
        name: '芳香',
        description: '增加番数',
        triggerCondition: 'on_win',
        effect: (context: FlowerCardEffectContext) => {
          context.bonusFan += 2;
        }
      }
    ]
  },
  {
    type: FlowerCardType.ORCHID,
    name: '兰花拂月',
    description: '本局所有番型倍率×1.5',
    cost: 12,  // Increased from 8 - persistent multiplier is very powerful
    rarity: 'epic',  // Upgraded from rare to epic
    effects: [
      {
        name: '月之祝福',
        description: '持续增加番数倍率',
        triggerCondition: 'passive',
        effect: (context: FlowerCardEffectContext) => {
          context.fanMultiplier *= 1.5;
        }
      }
    ]
  },
  {
    type: FlowerCardType.ORCHID,
    name: '空谷幽兰',
    description: '使下一张神牌免费',
    cost: 20,  // Increased from 12 - free God Tile can save 30+ gold
    rarity: 'legendary',
    effects: [
      {
        name: '空灵',
        description: '减免商店购买费用',
        triggerCondition: 'on_shop_purchase',
        effect: (context: FlowerCardEffectContext) => {
          if (context.nextGodTileFree !== undefined) {
            context.nextGodTileFree = true;
          }
        }
      }
    ]
  },
  {
    type: FlowerCardType.ORCHID,
    name: '兰心蕙质',
    description: '+1次出牌机会',
    cost: 11,  // Increased from 10 - extra hand is very valuable
    rarity: 'epic',
    effects: [
      {
        name: '额外机会',
        description: '增加出牌次数',
        triggerCondition: 'on_use',
        effect: (context: FlowerCardEffectContext) => {
          context.handsRemaining += 1;
        }
      }
    ]
  }
];

// Chrysanthemum Flower Cards - 特殊类 (Special/Transform)
export const CHRYSANTHEMUM_FLOWER_CARDS: FlowerCardData[] = [
  {
    type: FlowerCardType.CHRYSANTHEMUM,
    name: '秋菊傲霜',
    description: '清除所有负面效果',
    cost: 5,
    rarity: 'common',
    effects: [
      {
        name: '净化',
        description: '移除debuff效果',
        triggerCondition: 'on_use',
        effect: (context: FlowerCardEffectContext) => {
          if (context.clearDebuffs) {
            context.clearDebuffs();
          }
          context.debuffs = [];
        }
      }
    ]
  },
  {
    type: FlowerCardType.CHRYSANTHEMUM,
    name: '菊花残月',
    description: '重新洗牌并摸取新手牌',
    cost: 12,  // Increased from 10 - hand redraw can save a failed hand
    rarity: 'epic',
    effects: [
      {
        name: '重生',
        description: '重新开始当前回合',
        triggerCondition: 'on_use',
        effect: (context: FlowerCardEffectContext) => {
          if (context.redrawHand) {
            context.redrawHand();
          }
        }
      }
    ]
  },
  {
    type: FlowerCardType.CHRYSANTHEMUM,
    name: '九九重阳',
    description: '将手中的所有9牌转换为同花色的1牌',
    cost: 13,  // Reduced from 15 - niche effect, legendary should be powerful but this is situational
    rarity: 'epic',  // Downgraded from legendary to epic - too situational for legendary
    effects: [
      {
        name: '九重天',
        description: '转化九牌',
        triggerCondition: 'on_use',
        effect: (context: FlowerCardEffectContext) => {
          // Transform all 9-value tiles to 1-value tiles of the same suit
          const hand = context.hand;
          const tiles = hand.tiles as any[];

          tiles.forEach((tile) => {
            if (tile.value === 9 &&
                (tile.suit === TileSuit.Wan ||
                 tile.suit === TileSuit.Tiao ||
                 tile.suit === TileSuit.Tong)) {
              tile.value = 1;
              tile.displayName = `1${tile.displayName.substring(1)}`;
            }
          });
        }
      }
    ]
  },
  {
    type: FlowerCardType.CHRYSANTHEMUM,
    name: '菊映秋霜',
    description: '将选中的牌转换为相邻数值',
    cost: 4,
    rarity: 'common',
    effects: [
      {
        name: '转换',
        description: '改变牌的数值',
        triggerCondition: 'on_use',
        effect: (context: FlowerCardEffectContext) => {
          // Transform selected tile to +1 or -1 value
          if (context.selectedTiles.length > 0) {
            const tile = context.selectedTiles[0];
            if (tile.suit === TileSuit.Wan ||
                tile.suit === TileSuit.Tiao ||
                tile.suit === TileSuit.Tong) {
              const newValue = tile.value < 9 ? tile.value + 1 : tile.value - 1;
              (tile as any).value = newValue;
              (tile as any).displayName = `${newValue}${tile.displayName.substring(1)}`;
            }
          }
        }
      }
    ]
  },
  {
    type: FlowerCardType.CHRYSANTHEMUM,
    name: '金菊流光',
    description: '将选中的牌转换为金牌(5)',
    cost: 7,
    rarity: 'rare',
    effects: [
      {
        name: '点石成金',
        description: '转换为中庸之道',
        triggerCondition: 'on_use',
        effect: (context: FlowerCardEffectContext) => {
          // Transform selected tiles to 5
          context.selectedTiles.forEach(tile => {
            if (tile.suit === TileSuit.Wan ||
                tile.suit === TileSuit.Tiao ||
                tile.suit === TileSuit.Tong) {
              (tile as any).value = 5;
              (tile as any).displayName = `5${tile.displayName.substring(1)}`;
            }
          });
        }
      }
    ]
  }
];

export const ALL_FLOWER_CARDS: FlowerCardData[] = [
  ...BAMBOO_FLOWER_CARDS,
  ...PLUM_FLOWER_CARDS,
  ...ORCHID_FLOWER_CARDS,
  ...CHRYSANTHEMUM_FLOWER_CARDS
];

export const getFlowerCardsByType = (type: FlowerCardType): FlowerCardData[] => {
  return ALL_FLOWER_CARDS.filter(card => card.type === type);
};

export const getFlowerCardsByRarity = (rarity: string): FlowerCardData[] => {
  return ALL_FLOWER_CARDS.filter(card => card.rarity === rarity);
};

export const getRandomFlowerCard = (type?: FlowerCardType, rarity?: string): FlowerCardData => {
  let cards = ALL_FLOWER_CARDS;

  if (type) {
    cards = cards.filter(card => card.type === type);
  }

  if (rarity) {
    cards = cards.filter(card => card.rarity === rarity);
  }

  return cards[Math.floor(Math.random() * cards.length)];
};

/**
 * Create a FlowerCard instance from FlowerCardData
 */
export const createFlowerCardFromData = (data: FlowerCardData): import('../roguelike/FlowerCard').FlowerCard => {
  const { FlowerCard } = require('../roguelike/FlowerCard');
  return new FlowerCard(
    data.type,
    data.name,
    data.description,
    data.effects,
    data.cost,
    data.rarity
  );
};