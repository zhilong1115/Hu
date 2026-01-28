import { Boss, BossAbility, BossReward, BossRoundContext } from '../roguelike/BossRound';
import { BossBlindType, createBossBlind } from '../roguelike/BossBlind';
import { TileSuit } from '../core/Tile';

/**
 * Boss definitions for HU! roguelike mode
 * Each boss has unique abilities, blind effects, and rewards
 */

// ─── Boss Abilities ─────────────────────────────────────────────────────────

const createDamageAbility = (
  name: string,
  description: string,
  damage: number,
  cooldown: number
): BossAbility => ({
  name,
  description,
  cooldown,
  currentCooldown: 0,
  activate: (context: BossRoundContext) => {
    context.playerRound.damagePlayer(damage);
    console.log(`${name}: Dealt ${damage} damage to player!`);
  }
});

const createTileStealAbility = (
  name: string,
  description: string,
  tileCount: number,
  cooldown: number
): BossAbility => ({
  name,
  description,
  cooldown,
  currentCooldown: 0,
  activate: (context: BossRoundContext) => {
    const hand = context.playerRound.hand;
    const tiles = [...hand.tiles];

    // Remove random tiles from hand
    for (let i = 0; i < Math.min(tileCount, tiles.length); i++) {
      const randomIndex = Math.floor(Math.random() * tiles.length);
      hand.removeTile(tiles[randomIndex]);
      tiles.splice(randomIndex, 1);
    }

    console.log(`${name}: Stole ${tileCount} tiles from player!`);
  }
});

const createReduceResourceAbility = (
  name: string,
  description: string,
  handsReduction: number,
  cooldown: number
): BossAbility => ({
  name,
  description,
  cooldown,
  currentCooldown: 0,
  activate: (context: BossRoundContext) => {
    // This will be handled by BossRound integration
    console.log(`${name}: Reduced player resources!`);
  }
});

const createHealAbility = (
  name: string,
  description: string,
  healPercent: number,
  cooldown: number
): BossAbility => ({
  name,
  description,
  cooldown,
  currentCooldown: 0,
  activate: (context: BossRoundContext) => {
    const healAmount = Math.floor(context.boss.maxHealth * healPercent);
    context.boss.health = Math.min(context.boss.maxHealth, context.boss.health + healAmount);
    console.log(`${name}: Boss healed ${healAmount} health!`);
  }
});

// ─── Boss Definitions ───────────────────────────────────────────────────────

export const BOSS_WAN_EMPEROR: Boss = {
  name: '万字帝王',
  description: '掌控万字牌的恐怖存在，禁锢所有万字之力',
  health: 200,  // Reduced from 300 - Ante 1 boss, easier entry
  maxHealth: 200,
  difficulty: 1,
  abilities: [
    createDamageAbility('万字诅咒', '对玩家造成12点伤害', 12, 3),  // Reduced from 15
    createTileStealAbility('窃取牌张', '从玩家手中偷走1张牌', 1, 5)  // Reduced from 2
  ],
  rewards: [
    { type: 'gold', amount: 20 },  // Reduced from 50 - base rewards come from blind
    { type: 'god_tile', amount: 1, rarity: 'common' }
  ]
};

export const BOSS_BLIND_MASTER: Boss = {
  name: '盲眼大师',
  description: '能让所有牌陷入黑暗的神秘存在',
  health: 280,  // Reduced from 350 - Ante 2 boss
  maxHealth: 280,
  difficulty: 2,
  abilities: [
    createDamageAbility('黑暗侵蚀', '对玩家造成15点伤害', 15, 3),  // Reduced from 20
    createReduceResourceAbility('耗尽体力', '减少玩家1次出牌机会', 1, 4),
    createHealAbility('暗影恢复', '恢复最大生命值的15%', 0.15, 6)
  ],
  rewards: [
    { type: 'gold', amount: 25 },  // Reduced from 75
    { type: 'god_tile', amount: 1, rarity: 'rare' },
    { type: 'flower_card', amount: 1 }
  ]
};

export const BOSS_PAIR_TYRANT: Boss = {
  name: '对子暴君',
  description: '只承认对子的力量，蔑视所有顺子',
  health: 300,  // Reduced from 400 - Ante 2 boss
  maxHealth: 300,
  difficulty: 2,
  abilities: [
    createDamageAbility('双重打击', '对玩家造成18点伤害', 18, 3),  // Reduced from 25
    createTileStealAbility('强制弃牌', '从玩家手中偷走2张牌', 2, 4)  // Reduced from 3
  ],
  rewards: [
    { type: 'gold', amount: 30 },  // Reduced from 80
    { type: 'god_tile', amount: 1, rarity: 'rare' },
    { type: 'flower_card', amount: 1 }
  ]
};

export const BOSS_CURSE_WITCH: Boss = {
  name: '诅咒巫女',
  description: '用邪恶魔法诅咒牌张，使其失去力量',
  health: 400,  // Increased from 380 - Ante 3-4 boss
  maxHealth: 400,
  difficulty: 3,
  abilities: [
    createDamageAbility('诅咒蔓延', '对玩家造成20点伤害', 20, 2),  // Increased from 18
    {
      name: '增强诅咒',
      description: '额外诅咒2种牌型',
      cooldown: 5,
      currentCooldown: 0,
      activate: (context: BossRoundContext) => {
        // This would need integration with BossBlind to add more cursed tiles
        console.log('增强诅咒: Added more cursed tiles!');
      }
    },
    createHealAbility('吸血', '恢复最大生命值的10%', 0.10, 5)
  ],
  rewards: [
    { type: 'gold', amount: 35 },  // Reduced from 90
    { type: 'god_tile', amount: 1, rarity: 'rare' },
    { type: 'flower_card', amount: 2 }
  ]
};

export const BOSS_SUIT_WARDEN: Boss = {
  name: '花色典狱长',
  description: '不断轮换禁用的花色，限制玩家的选择',
  health: 450,  // Increased from 420 - Ante 3-4 boss
  maxHealth: 450,
  difficulty: 3,
  abilities: [
    createDamageAbility('禁锢之力', '对玩家造成25点伤害', 25, 3),  // Increased from 22
    {
      name: '花色轮换',
      description: '立即轮换禁用的花色',
      cooldown: 2,
      currentCooldown: 0,
      activate: (context: BossRoundContext) => {
        // This would trigger blind suit rotation
        console.log('花色轮换: Rotated banned suit!');
      }
    },
    createReduceResourceAbility('资源封印', '减少玩家1次弃牌机会', 1, 4)
  ],
  rewards: [
    { type: 'gold', amount: 40 },  // Reduced from 100
    { type: 'god_tile', amount: 1, rarity: 'epic' },
    { type: 'flower_card', amount: 2 }
  ]
};

export const BOSS_HONOR_DEMON: Boss = {
  name: '字牌魔王',
  description: '囚禁所有字牌，使其无法使用',
  health: 500,  // Increased from 450 - Ante 3-4 boss
  maxHealth: 500,
  difficulty: 3,
  abilities: [
    createDamageAbility('魔王之怒', '对玩家造成28点伤害', 28, 3),  // Reduced from 30
    createTileStealAbility('吞噬字牌', '从玩家手中偷走3张牌', 3, 4),  // Reduced from 4
    createHealAbility('魔力吸收', '恢复最大生命值的20%', 0.20, 6)
  ],
  rewards: [
    { type: 'gold', amount: 45 },  // Reduced from 110
    { type: 'god_tile', amount: 1, rarity: 'epic' },
    { type: 'flower_card', amount: 2 }
  ]
};

export const BOSS_TIME_KEEPER: Boss = {
  name: '时间守护者',
  description: '压缩时间流速，让玩家措手不及',
  health: 600,  // Increased from 500 - Ante 5-6 boss, serious challenge
  maxHealth: 600,
  difficulty: 4,
  abilities: [
    createDamageAbility('时间冲击', '对玩家造成30点伤害', 30, 2),  // Increased from 28
    createReduceResourceAbility('时间加速', '减少玩家1次出牌机会', 1, 3),
    {
      name: '时间倒流',
      description: '清空玩家手牌并重新发牌',
      cooldown: 7,
      currentCooldown: 0,
      activate: (context: BossRoundContext) => {
        // This would trigger hand redraw
        console.log('时间倒流: Forced hand redraw!');
      }
    }
  ],
  rewards: [
    { type: 'gold', amount: 55 },  // Reduced from 120
    { type: 'god_tile', amount: 1, rarity: 'epic' },
    { type: 'flower_card', amount: 3 }
  ]
};

export const BOSS_TAX_COLLECTOR: Boss = {
  name: '分数收税官',
  description: '贪婪的收税官，夺走玩家大部分得分',
  health: 650,  // Increased from 480 - Ante 5-6 boss, tough fight
  maxHealth: 650,
  difficulty: 4,
  abilities: [
    createDamageAbility('税务审查', '对玩家造成32点伤害', 32, 3),  // Increased from 25
    {
      name: '额外征税',
      description: '下一次得分额外减少20%',
      cooldown: 4,
      currentCooldown: 0,
      activate: (context: BossRoundContext) => {
        // This would increase tax rate temporarily
        console.log('额外征税: Increased tax rate!');
      }
    },
    createHealAbility('贪婪回复', '恢复最大生命值的25%', 0.25, 5)
  ],
  rewards: [
    { type: 'gold', amount: 60 },  // Reduced from 150
    { type: 'god_tile', amount: 1, rarity: 'legendary' },
    { type: 'flower_card', amount: 3 }
  ]
};

// ─── Boss Pool by Difficulty ───────────────────────────────────────────────

export const BOSS_POOL: Record<number, Boss[]> = {
  1: [BOSS_WAN_EMPEROR],
  2: [BOSS_BLIND_MASTER, BOSS_PAIR_TYRANT],
  3: [BOSS_CURSE_WITCH, BOSS_SUIT_WARDEN, BOSS_HONOR_DEMON],
  4: [BOSS_TIME_KEEPER, BOSS_TAX_COLLECTOR]
};

// ─── Boss Selection ─────────────────────────────────────────────────────────

/**
 * Get a random boss for the given difficulty level
 */
export function getRandomBoss(difficulty: number): Boss {
  const pool = BOSS_POOL[difficulty] || BOSS_POOL[1];
  const boss = pool[Math.floor(Math.random() * pool.length)];

  // Clone the boss to avoid mutating the original
  return {
    ...boss,
    health: boss.maxHealth,
    abilities: boss.abilities.map(a => ({ ...a, currentCooldown: 0 })),
    rewards: [...boss.rewards]
  };
}

/**
 * Map boss to appropriate blind type
 */
export function getBossBlindType(boss: Boss): BossBlindType {
  switch (boss.name) {
    case '万字帝王':
      return BossBlindType.CHARACTER_SEAL;
    case '盲眼大师':
      return BossBlindType.BLIND_TILES;
    case '对子暴君':
      return BossBlindType.PAIRS_ONLY;
    case '诅咒巫女':
      return BossBlindType.CURSED_TILES;
    case '花色典狱长':
      return BossBlindType.SUIT_BAN;
    case '字牌魔王':
      return BossBlindType.HONOR_PRISON;
    case '时间守护者':
      return BossBlindType.TIME_PRESSURE;
    case '分数收税官':
      return BossBlindType.SCORE_TAX;
    default:
      return BossBlindType.CHARACTER_SEAL;
  }
}
