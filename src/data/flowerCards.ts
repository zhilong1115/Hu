/**
 * Flower Card System v5.1 — Based on GAME_DESIGN.md
 * 
 * 32 cards across 4 types:
 * - 🌸 梅 (Plum) — 弃牌增强, 8 cards, all ⚡Instant
 * - 🎋 竹 (Bamboo) — 金币获取, 8 cards, mostly ⚡Instant
 * - 🌺 兰 (Orchid) — 得分加成, 8 cards, all 🎯On-Win
 * - 🏵️ 菊 (Chrysanthemum) — 随机惊喜, 8 cards, mixed
 * 
 * Two types:
 * - ⚡ Instant (立即生效型): Manual use, costs gold, yellow border
 * - 🎯 On-Win (胡牌结算型): Auto-trigger on hu, settles left→right, blue border, reorderable
 * 
 * Unused cards give +5 gold on win then disappear.
 */

import { FlowerCardType } from '../roguelike/FlowerCard';

export type FlowerCardTrigger = 'instant' | 'on_win';

export interface FlowerCardDef {
  id: string;
  type: FlowerCardType;
  trigger: FlowerCardTrigger;
  name: string;
  description: string;
  cost: number;
}

// ─── 🌸 梅牌 — 弃牌增强 (8张, 全部⚡立即) ──────────────────────────────

export const PLUM_CARDS: FlowerCardDef[] = [
  {
    id: 'plum_1',
    type: FlowerCardType.PLUM,
    trigger: 'instant',
    name: '梅开一度',
    description: '+1 弃牌次数',
    cost: 3,
  },
  {
    id: 'plum_2',
    type: FlowerCardType.PLUM,
    trigger: 'instant',
    name: '梅开二度',
    description: '+2 弃牌次数',
    cost: 5,
  },
  {
    id: 'plum_3',
    type: FlowerCardType.PLUM,
    trigger: 'instant',
    name: '梅开三度',
    description: '+3 弃牌次数',
    cost: 8,
  },
  {
    id: 'plum_hanmei',
    type: FlowerCardType.PLUM,
    trigger: 'instant',
    name: '寒梅傲雪',
    description: '本次弃牌可弃任意数量（仍只算1次）',
    cost: 6,
  },
  {
    id: 'plum_sannong',
    type: FlowerCardType.PLUM,
    trigger: 'instant',
    name: '梅花三弄',
    description: '弃牌后，从牌堆顶亮出(弃牌数+3)张，选择弃牌数量的牌加入手牌',
    cost: 7,
  },
  {
    id: 'plum_anxiang',
    type: FlowerCardType.PLUM,
    trigger: 'instant',
    name: '暗香浮动',
    description: '下次弃牌时，弃掉的牌每张获得+5金币',
    cost: 4,
  },
  {
    id: 'plum_yijian',
    type: FlowerCardType.PLUM,
    trigger: 'instant',
    name: '一剪梅',
    description: '弃1张牌，从牌库精确换取指定的1张牌',
    cost: 8,
  },
  {
    id: 'plum_taxue',
    type: FlowerCardType.PLUM,
    trigger: 'instant',
    name: '踏雪寻梅',
    description: '弃掉所有手牌，从牌库重新抽14张',
    cost: 10,
  },
];

// ─── 🎋 竹牌 — 金币获取 (8张, 多数⚡立即) ──────────────────────────────

export const BAMBOO_CARDS: FlowerCardDef[] = [
  {
    id: 'bamboo_ping',
    type: FlowerCardType.BAMBOO,
    trigger: 'instant',
    name: '竹报平安',
    description: '立即获得+5金币',
    cost: 2,
  },
  {
    id: 'bamboo_cui',
    type: FlowerCardType.BAMBOO,
    trigger: 'instant',
    name: '翠竹生财',
    description: '立即获得+10金币',
    cost: 4,
  },
  {
    id: 'bamboo_lin',
    type: FlowerCardType.BAMBOO,
    trigger: 'instant',
    name: '竹林聚宝',
    description: '立即获得+15金币',
    cost: 6,
  },
  {
    id: 'bamboo_jiejie',
    type: FlowerCardType.BAMBOO,
    trigger: 'instant',
    name: '节节高升',
    description: '获得金币 = 当前回合数 × 5',
    cost: 3,
  },
  {
    id: 'bamboo_bian',
    type: FlowerCardType.BAMBOO,
    trigger: 'instant',
    name: '竹编生金',
    description: '手牌中每张材质牌+3金币',
    cost: 4,
  },
  {
    id: 'bamboo_zhishang',
    type: FlowerCardType.BAMBOO,
    trigger: 'instant',
    name: '青竹直上',
    description: '获得金币 = 手牌中最大点数 × 3',
    cost: 3,
  },
  {
    id: 'bamboo_zhuma',
    type: FlowerCardType.BAMBOO,
    trigger: 'on_win',
    name: '竹马之交',
    description: '本局每次吃/碰/杠额外+5金币',
    cost: 5,
  },
  {
    id: 'bamboo_shiru',
    type: FlowerCardType.BAMBOO,
    trigger: 'instant',
    name: '势如破竹',
    description: '立即获得+30金币，但-1弃牌次数',
    cost: 8,
  },
];

// ─── 🌺 兰牌 — 得分加成 (8张, 全部🎯胡牌) ──────────────────────────────

export const ORCHID_CARDS: FlowerCardDef[] = [
  {
    id: 'orchid_jinlan',
    type: FlowerCardType.ORCHID,
    trigger: 'on_win',
    name: '金兰之交',
    description: '本局胡牌倍率+3',
    cost: 5,
  },
  {
    id: 'orchid_lanxin',
    type: FlowerCardType.ORCHID,
    trigger: 'on_win',
    name: '兰心蕙质',
    description: '本局胡牌倍率+5',
    cost: 8,
  },
  {
    id: 'orchid_langui',
    type: FlowerCardType.ORCHID,
    trigger: 'on_win',
    name: '兰桂齐芳',
    description: '本局胡牌倍率×1.5',
    cost: 7,
  },
  {
    id: 'orchid_konggu',
    type: FlowerCardType.ORCHID,
    trigger: 'on_win',
    name: '空谷幽兰',
    description: '本局胡牌倍率×2',
    cost: 10,
  },
  {
    id: 'orchid_huizhi',
    type: FlowerCardType.ORCHID,
    trigger: 'on_win',
    name: '蕙质兰心',
    description: '胡牌时每剩余1次弃牌，倍率+2',
    cost: 6,
  },
  {
    id: 'orchid_lanting',
    type: FlowerCardType.ORCHID,
    trigger: 'on_win',
    name: '兰亭集序',
    description: '每个顺子额外+2倍率',
    cost: 6,
  },
  {
    id: 'orchid_youlan',
    type: FlowerCardType.ORCHID,
    trigger: 'on_win',
    name: '幽兰出谷',
    description: '每个刻子额外+2倍率',
    cost: 6,
  },
  {
    id: 'orchid_yulan',
    type: FlowerCardType.ORCHID,
    trigger: 'on_win',
    name: '玉兰花开',
    description: '本局胡牌的胡法基础倍率永久+5',
    cost: 12,
  },
];

// ─── 🏵️ 菊牌 — 随机惊喜 (8张, 混合) ──────────────────────────────────

export const CHRYSANTHEMUM_CARDS: FlowerCardDef[] = [
  {
    id: 'chrys_tai',
    type: FlowerCardType.CHRYSANTHEMUM,
    trigger: 'instant',
    name: '菊花台',
    description: '获得随机数量金币（5~30）',
    cost: 3,
  },
  {
    id: 'chrys_qiuju',
    type: FlowerCardType.CHRYSANTHEMUM,
    trigger: 'instant',
    name: '秋菊傲霜',
    description: '获得1张随机花牌',
    cost: 4,
  },
  {
    id: 'chrys_caiju',
    type: FlowerCardType.CHRYSANTHEMUM,
    trigger: 'instant',
    name: '采菊东篱',
    description: '获得1张随机神牌',
    cost: 8,
  },
  {
    id: 'chrys_huangju',
    type: FlowerCardType.CHRYSANTHEMUM,
    trigger: 'instant',
    name: '黄菊满地',
    description: '将1张随机手牌添加随机材质',
    cost: 5,
  },
  {
    id: 'chrys_jucan',
    type: FlowerCardType.CHRYSANTHEMUM,
    trigger: 'on_win',
    name: '菊残犹傲',
    description: '本局获得随机倍率（×1.5/×2/×3，概率50/35/15%）',
    cost: 6,
  },
  {
    id: 'chrys_chiju',
    type: FlowerCardType.CHRYSANTHEMUM,
    trigger: 'instant',
    name: '持菊问道',
    description: '随机触发：获得2张花牌 或 获得20金币 或 +2弃牌次数',
    cost: 5,
  },
  {
    id: 'chrys_jinju',
    type: FlowerCardType.CHRYSANTHEMUM,
    trigger: 'instant',
    name: '金菊绽放',
    description: '将最多3张随机手牌各添加随机材质',
    cost: 7,
  },
  {
    id: 'chrys_huangjin',
    type: FlowerCardType.CHRYSANTHEMUM,
    trigger: 'instant',
    name: '满城尽带黄金甲',
    description: '超级轮盘：50%所有手牌加金牌材质，30%获得50金币，20%什么都不发生',
    cost: 10,
  },
];

// ─── All Flower Cards ──────────────────────────────────────────────────────

export const ALL_FLOWER_CARDS: FlowerCardDef[] = [
  ...PLUM_CARDS,
  ...BAMBOO_CARDS,
  ...ORCHID_CARDS,
  ...CHRYSANTHEMUM_CARDS,
];

// ─── Helper Functions ──────────────────────────────────────────────────────

export function getFlowerCardById(id: string): FlowerCardDef | undefined {
  return ALL_FLOWER_CARDS.find(c => c.id === id);
}

export function getFlowerCardsByType(type: FlowerCardType): FlowerCardDef[] {
  return ALL_FLOWER_CARDS.filter(c => c.type === type);
}

export function getFlowerCardsByTrigger(trigger: FlowerCardTrigger): FlowerCardDef[] {
  return ALL_FLOWER_CARDS.filter(c => c.trigger === trigger);
}

export function getRandomFlowerCards(count: number): FlowerCardDef[] {
  const shuffled = [...ALL_FLOWER_CARDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** Unused flower cards give +5 gold on win */
export const UNUSED_FLOWER_CARD_GOLD = 5;
