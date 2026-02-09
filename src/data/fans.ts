import { Fan } from '../core/FanEvaluator';

/**
 * Fan patterns based on GAME_DESIGN.md v5.1
 * 
 * The `points` field is used by FanEvaluator for pattern detection.
 * The `multiplier` field is the actual game multiplier used in scoring.
 */

export interface FanWithMultiplier extends Fan {
  multiplier: number;  // The ×N multiplier from GAME_DESIGN.md
}

export const STANDARD_FANS: FanWithMultiplier[] = [
  // Basic
  {
    name: '胡牌',
    points: 1,
    description: '基础胡牌分',
    multiplier: 1,  // 屁胡 ×1
  },
  {
    name: '平和',
    points: 2,
    description: '4个顺子 + 1对将（无刻子）',
    multiplier: 2,
  },
  {
    name: '一气通贯',
    points: 2,
    description: '同一花色的123、456、789',
    multiplier: 2,
  },
  {
    name: '三色同顺',
    points: 2,
    description: '三种花色相同数字的顺子',
    multiplier: 2,
  },
  
  // Mid-tier
  {
    name: '断幺九',
    points: 3,
    description: '没有1、9和字牌',
    multiplier: 3,
  },
  {
    name: '混一色',
    points: 4,
    description: '一种花色 + 字牌',
    multiplier: 4,
  },
  {
    name: '对对和',
    points: 5,
    description: '4个刻子 + 1对将（碰碰胡）',
    multiplier: 5,
  },
  {
    name: '七对',
    points: 6,
    description: '7个对子',
    multiplier: 6,
  },
  {
    name: '三暗刻',
    points: 4,
    description: '三个暗刻子',
    multiplier: 4,
  },
  {
    name: '小三元',
    points: 6,
    description: '中发白三种牌，其中两种做刻子，一种做雀头',
    multiplier: 6,
  },
  {
    name: '混老头',
    points: 8,
    description: '全部由老头牌（1、9）和字牌组成',
    multiplier: 8,
  },
  
  // High-tier
  {
    name: '清一色',
    points: 8,
    description: '只有一种花色（万/条/筒）',
    multiplier: 8,
  },
  {
    name: '大三元',
    points: 24,
    description: '中发白都做刻子',
    multiplier: 24,
  },
  {
    name: '小四喜',
    points: 24,
    description: '东南西北四种风牌，三种做刻子，一种做雀头',
    multiplier: 24,
  },
  {
    name: '四暗刻',
    points: 32,
    description: '四个暗刻子',
    multiplier: 32,
  },
  {
    name: '连七对',
    points: 15,
    description: '同花色连续7个对子',
    multiplier: 15,
  },
  
  // Yakuman
  {
    name: '字一色',
    points: 20,
    description: '全部是字牌',
    multiplier: 20,
  },
  {
    name: '清老头',
    points: 64,
    description: '全部由老头牌（1、9）组成',
    multiplier: 64,
  },
  {
    name: '大四喜',
    points: 64,
    description: '东南西北都做刻子',
    multiplier: 64,
  },
  {
    name: '绿一色',
    points: 64,
    description: '全部由绿色牌组成（2、3、4、6、8条和发）',
    multiplier: 64,
  },
  {
    name: '九莲宝灯',
    points: 88,
    description: '清一色1112345678999，自摸任意一张同花色牌',
    multiplier: 88,
  },
  {
    name: '四暗刻单骑',
    points: 88,
    description: '四暗刻且雀头单骑听牌',
    multiplier: 88,
  },
  {
    name: '国士无双',
    points: 30,
    description: '十三幺',
    multiplier: 30,
  }
];

// 特殊条件加番
export const BONUS_FANS: FanWithMultiplier[] = [
  {
    name: '自摸',
    points: 1,
    description: '自己摸到胡牌',
    multiplier: 1,
  },
  {
    name: '门清',
    points: 1,
    description: '没有吃、碰、明杠',
    multiplier: 1,
  },
  {
    name: '一发',
    points: 1,
    description: '立直后第一巡内胡牌',
    multiplier: 1,
  },
  {
    name: '岭上开花',
    points: 1,
    description: '杠后补牌胡牌',
    multiplier: 1,
  },
  {
    name: '抢杠',
    points: 1,
    description: '别人加杠时胡牌',
    multiplier: 1,
  },
  {
    name: '海底摸月',
    points: 1,
    description: '最后一张牌自摸胡牌',
    multiplier: 1,
  },
  {
    name: '河底捞鱼',
    points: 1,
    description: '最后一张牌点炮胡牌',
    multiplier: 1,
  }
];

/**
 * Get the multiplier for a fan pattern (from GAME_DESIGN.md)
 * Used in the scoring formula: 基础分 × 出牌倍率 × 番型倍率 × ...
 */
export function getFanMultiplier(fanName: string): number {
  const fan = [...STANDARD_FANS, ...BONUS_FANS].find(f => f.name === fanName);
  return (fan as FanWithMultiplier)?.multiplier ?? 1;
}

export const getFanByName = (name: string): Fan | undefined => {
  return [...STANDARD_FANS, ...BONUS_FANS].find(fan => fan.name === name);
};

export const getFansByPoints = (points: number): Fan[] => {
  return [...STANDARD_FANS, ...BONUS_FANS].filter(fan => fan.points === points);
};
