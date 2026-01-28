import { Boss } from './BossRound';

// ─── Blind Types ────────────────────────────────────────────────────────────

export enum BlindType {
  SMALL = 'small',
  BIG = 'big',
  BOSS = 'boss'
}

// ─── Blind Interface ────────────────────────────────────────────────────────

export interface Blind {
  type: BlindType;
  name: string;
  description: string;
  targetScore: number;
  rewardMoney: number;
  bonusMoneyPerExcessPoint: number; // Money earned per point above target
  handsAllowed: number;
  discardsAllowed: number;
  boss?: Boss; // Only for boss blinds
}

// ─── Blind Creation Helpers ─────────────────────────────────────────────────

export function createSmallBlind(
  ante: number,
  handsAllowed: number = 4,
  discardsAllowed: number = 3
): Blind {
  // Small blind target scales with ante
  // Tuned to match new scoring: basic fans should clear early antes
  const targetScore = 250 + (ante - 1) * 180;
  const rewardMoney = 4 + ante;  // Increased base reward

  return {
    type: BlindType.SMALL,
    name: `小盲注 ${ante}`,
    description: '小盲注 - 入门难度',
    targetScore,
    rewardMoney,
    bonusMoneyPerExcessPoint: 0.01,
    handsAllowed,
    discardsAllowed,
  };
}

export function createBigBlind(
  ante: number,
  handsAllowed: number = 4,
  discardsAllowed: number = 3
): Blind {
  // Big blind target is higher than small blind
  // Requires mid-tier fans or multiple basic fans
  const targetScore = 400 + (ante - 1) * 280;
  const rewardMoney = 5 + ante * 2;  // Better rewards for harder challenge

  return {
    type: BlindType.BIG,
    name: `大盲注 ${ante}`,
    description: '大盲注 - 中等难度',
    targetScore,
    rewardMoney,
    bonusMoneyPerExcessPoint: 0.02,
    handsAllowed,
    discardsAllowed,
  };
}

export function createBossBlind(
  ante: number,
  boss: Boss,
  handsAllowed: number = 5,
  discardsAllowed: number = 4
): Blind {
  // Boss blind target is the highest
  // Requires high-tier fans and/or God Tile synergies
  const targetScore = 550 + (ante - 1) * 350;
  const rewardMoney = 12 + ante * 3;  // Major rewards for boss victories

  return {
    type: BlindType.BOSS,
    name: `Boss: ${boss.name}`,
    description: boss.description,
    targetScore,
    rewardMoney,
    bonusMoneyPerExcessPoint: 0.05,
    handsAllowed,
    discardsAllowed,
    boss,
  };
}
