import { Fan } from '../core/FanEvaluator';

export const STANDARD_FANS: Fan[] = [
  // 基础番型 (1-2番)
  {
    name: '胡牌',
    points: 1,
    description: '基础胡牌分'
  },
  {
    name: '平和',
    points: 2,
    description: '四副顺子一对将牌，门清自摸'
  },
  {
    name: '一气通贯',
    points: 2,
    description: '同一花色的123、456、789'
  },
  {
    name: '三色同顺',
    points: 2,
    description: '三种花色相同数字的顺子'
  },
  
  // 中级番型 (4-8番)
  {
    name: '七对',
    points: 4,
    description: '七个对子'
  },
  {
    name: '三暗刻',
    points: 4,
    description: '三个暗刻子'
  },
  {
    name: '对对和',
    points: 6,
    description: '全部都是刻子（或杠）'
  },
  {
    name: '混一色',
    points: 6,
    description: '只有一种花色牌和字牌'
  },
  {
    name: '小三元',
    points: 6,
    description: '中发白三种牌，其中两种做刻子，一种做雀头'
  },
  {
    name: '混老头',
    points: 8,
    description: '全部由老头牌（1、9）和字牌组成'
  },
  
  // 高级番型 (12-24番)
  {
    name: '清一色',
    points: 24,
    description: '全部由一种花色组成'
  },
  {
    name: '大三元',
    points: 24,
    description: '中发白都做刻子'
  },
  {
    name: '小四喜',
    points: 24,
    description: '东南西北四种风牌，三种做刻子，一种做雀头'
  },
  {
    name: '四暗刻',
    points: 32,
    description: '四个暗刻子'
  },
  
  // 役满番型 (64-88番)
  {
    name: '字一色',
    points: 64,
    description: '全部由字牌（风牌、箭牌）组成'
  },
  {
    name: '清老头',
    points: 64,
    description: '全部由老头牌（1、9）组成'
  },
  {
    name: '大四喜',
    points: 64,
    description: '东南西北都做刻子'
  },
  {
    name: '绿一色',
    points: 64,
    description: '全部由绿色牌组成（2、3、4、6、8条和发）'
  },
  {
    name: '连七对',
    points: 48,
    description: '同花色连续7个对子'
  },
  {
    name: '九莲宝灯',
    points: 88,
    description: '清一色1112345678999，自摸任意一张同花色牌'
  },
  {
    name: '四暗刻单骑',
    points: 88,
    description: '四暗刻且雀头单骑听牌'
  },
  {
    name: '国士无双',
    points: 88,
    description: '13种幺九牌各一张，其中一种两张'
  }
];

// 特殊条件加番
export const BONUS_FANS: Fan[] = [
  {
    name: '自摸',
    points: 1,
    description: '自己摸到胡牌'
  },
  {
    name: '门清',
    points: 1,
    description: '没有吃、碰、明杠'
  },
  {
    name: '断幺九',
    points: 1,
    description: '没有1、9和字牌'
  },
  {
    name: '一发',
    points: 1,
    description: '立直后第一巡内胡牌'
  },
  {
    name: '岭上开花',
    points: 1,
    description: '杠后补牌胡牌'
  },
  {
    name: '抢杠',
    points: 1,
    description: '别人加杠时胡牌'
  },
  {
    name: '海底摸月',
    points: 1,
    description: '最后一张牌自摸胡牌'
  },
  {
    name: '河底捞鱼',
    points: 1,
    description: '最后一张牌点炮胡牌'
  }
];

export const getFanByName = (name: string): Fan | undefined => {
  return [...STANDARD_FANS, ...BONUS_FANS].find(fan => fan.name === name);
};

export const getFansByPoints = (points: number): Fan[] => {
  return [...STANDARD_FANS, ...BONUS_FANS].filter(fan => fan.points === points);
};