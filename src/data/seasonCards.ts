/**
 * Season Card System (季节牌系统)
 * 
 * Based on GAME_DESIGN.md:
 * - 40 cards: 春(10), 夏(10), 秋(10), 冬(10)
 * - Shop-only purchase, immediate use, cannot save
 * - Season cycle: 春(R1-2) → 夏(R3-4) → 秋(R5-6) → 冬(R7-8)
 * - 四季轮回 ultimate combo
 */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonCardDef {
  id: string;
  season: Season;
  name: string;
  description: string;
  price: number;
  // Effect parameters
  effectType: string;
  effectParams: Record<string, any>;
}

// ─── Season Helpers ──────────────────────────────────────────────────────

/** Get current season based on round number */
export function getSeasonForRound(round: number): Season {
  if (round <= 2) return 'spring';
  if (round <= 4) return 'summer';
  if (round <= 6) return 'autumn';
  return 'winter';
}

export function getSeasonEmoji(season: Season): string {
  switch (season) {
    case 'spring': return '🌱';
    case 'summer': return '☀️';
    case 'autumn': return '🍂';
    case 'winter': return '❄️';
  }
}

export function getSeasonName(season: Season): string {
  switch (season) {
    case 'spring': return '春';
    case 'summer': return '夏';
    case 'autumn': return '秋';
    case 'winter': return '冬';
  }
}

// ─── 🌱 春牌 — 番型增强 (10张) ──────────────────────────────────────────

export const SPRING_CARDS: SeasonCardDef[] = [
  { id: 'spring_pihu', season: 'spring', name: '屁胡春', description: '屁胡永久+3倍率', price: 5, effectType: 'fan_boost', effectParams: { fan: '屁胡', boost: 3 } },
  { id: 'spring_pinghe', season: 'spring', name: '平和春', description: '平和永久+3倍率', price: 6, effectType: 'fan_boost', effectParams: { fan: '平和', boost: 3 } },
  { id: 'spring_duanyao', season: 'spring', name: '断幺春', description: '断幺九永久+3倍率', price: 7, effectType: 'fan_boost', effectParams: { fan: '断幺九', boost: 3 } },
  { id: 'spring_hunyi', season: 'spring', name: '混一春', description: '混一色永久+3倍率', price: 8, effectType: 'fan_boost', effectParams: { fan: '混一色', boost: 3 } },
  { id: 'spring_pengpeng', season: 'spring', name: '碰碰春', description: '对对和永久+3倍率', price: 8, effectType: 'fan_boost', effectParams: { fan: '对对和', boost: 3 } },
  { id: 'spring_qidui', season: 'spring', name: '七对春', description: '七对永久+3倍率', price: 9, effectType: 'fan_boost', effectParams: { fan: '七对', boost: 3 } },
  { id: 'spring_qingyi', season: 'spring', name: '清一春', description: '清一色永久+3倍率', price: 10, effectType: 'fan_boost', effectParams: { fan: '清一色', boost: 3 } },
  { id: 'spring_lianqi', season: 'spring', name: '连七春', description: '连七对永久+3倍率', price: 12, effectType: 'fan_boost', effectParams: { fan: '连七对', boost: 3 } },
  { id: 'spring_ziyi', season: 'spring', name: '字一春', description: '字一色永久+3倍率', price: 15, effectType: 'fan_boost', effectParams: { fan: '字一色', boost: 3 } },
  { id: 'spring_guoshi', season: 'spring', name: '国士春', description: '国士无双永久+3倍率', price: 18, effectType: 'fan_boost', effectParams: { fan: '国士无双', boost: 3 } },
];

// ─── ☀️ 夏牌 — 材质改造 (10张) ──────────────────────────────────────────

export const SUMMER_CARDS: SeasonCardDef[] = [
  { id: 'summer_copper', season: 'summer', name: '镀铜术', description: '选择最多5张牌变成铜牌', price: 5, effectType: 'material_apply', effectParams: { material: 'bronze', maxCount: 5 } },
  { id: 'summer_silver', season: 'summer', name: '镀银术', description: '选择最多3张牌变成银牌', price: 8, effectType: 'material_apply', effectParams: { material: 'silver', maxCount: 3 } },
  { id: 'summer_gold', season: 'summer', name: '点石成金', description: '选择最多2张牌变成金牌', price: 12, effectType: 'material_apply', effectParams: { material: 'gold', maxCount: 2 } },
  { id: 'summer_bamboo', season: 'summer', name: '竹编术', description: '选择最多5张牌变成竹牌', price: 4, effectType: 'material_apply', effectParams: { material: 'bamboo', maxCount: 5 } },
  { id: 'summer_ice', season: 'summer', name: '冰封术', description: '选择最多3张牌变成冰牌', price: 8, effectType: 'material_apply', effectParams: { material: 'ice', maxCount: 3 } },
  { id: 'summer_glass', season: 'summer', name: '玻璃工艺', description: '选择最多2张牌变成玻璃牌', price: 10, effectType: 'material_apply', effectParams: { material: 'glass', maxCount: 2 } },
  { id: 'summer_glazed', season: 'summer', name: '琉璃秘法', description: '选择1张牌变成琉璃牌', price: 15, effectType: 'material_apply', effectParams: { material: 'colored_glass', maxCount: 1 } },
  { id: 'summer_jade', season: 'summer', name: '玉化之术', description: '选择最多2张牌变成玉牌', price: 12, effectType: 'material_apply', effectParams: { material: 'jade', maxCount: 2 } },
  { id: 'summer_porcelain', season: 'summer', name: '瓷器烧制', description: '选择1张字牌变成瓷牌（万能字牌）', price: 18, effectType: 'material_apply', effectParams: { material: 'porcelain', maxCount: 1, onlyHonors: true } },
  { id: 'summer_emerald', season: 'summer', name: '翡翠雕琢', description: '选择1张数牌变成翡翠牌（万能数字）', price: 18, effectType: 'material_apply', effectParams: { material: 'emerald', maxCount: 1, onlyNumbered: true } },
];

// ─── 🍂 秋牌 — 变牌改造 (10张) ──────────────────────────────────────────

export const AUTUMN_CARDS: SeasonCardDef[] = [
  { id: 'autumn_plus1', season: 'autumn', name: '秋风化雨', description: '选择牌库中最多3张牌，点数+1', price: 5, effectType: 'tile_change', effectParams: { action: 'value_plus', maxCount: 3, delta: 1 } },
  { id: 'autumn_minus1', season: 'autumn', name: '秋收万象', description: '选择牌库中最多3张牌，点数-1', price: 5, effectType: 'tile_change', effectParams: { action: 'value_minus', maxCount: 3, delta: 1 } },
  { id: 'autumn_luoye', season: 'autumn', name: '落叶归根', description: '选择牌库中1张牌，变成同花色任意点数', price: 7, effectType: 'tile_change', effectParams: { action: 'value_any', maxCount: 1 } },
  { id: 'autumn_qiugao', season: 'autumn', name: '秋高气爽', description: '选择牌库中1张牌，变成任意花色同点数', price: 7, effectType: 'tile_change', effectParams: { action: 'suit_any', maxCount: 1 } },
  { id: 'autumn_jinsong', season: 'autumn', name: '金秋送爽', description: '选择牌库中1张牌，变成完全任意牌', price: 10, effectType: 'tile_change', effectParams: { action: 'any', maxCount: 1 } },
  { id: 'autumn_shuangjiang', season: 'autumn', name: '霜降', description: '牌库中所有指定点数的牌，花色变为你选的花色', price: 12, effectType: 'tile_change', effectParams: { action: 'batch_suit' } },
  { id: 'autumn_hanlu', season: 'autumn', name: '寒露', description: '牌库中所有指定花色的牌，点数+1', price: 10, effectType: 'tile_change', effectParams: { action: 'batch_value_plus' } },
  { id: 'autumn_qiufen', season: 'autumn', name: '秋分', description: '选择2张牌库中的牌，交换它们的花色', price: 6, effectType: 'tile_change', effectParams: { action: 'swap_suit', maxCount: 2 } },
  { id: 'autumn_bailu', season: 'autumn', name: '白露', description: '选择2张牌库中的牌，交换它们的点数', price: 6, effectType: 'tile_change', effectParams: { action: 'swap_value', maxCount: 2 } },
  { id: 'autumn_shuangye', season: 'autumn', name: '霜叶红于二月花', description: '选择1种花色，牌库中该花色所有牌点数随机重排', price: 8, effectType: 'tile_change', effectParams: { action: 'shuffle_values' } },
];

// ─── ❄️ 冬牌 — 牌量操控 (10张) ──────────────────────────────────────────

export const WINTER_CARDS: SeasonCardDef[] = [
  { id: 'winter_copy', season: 'winter', name: '复制', description: '选择1张牌，在牌库中复制3张', price: 8, effectType: 'deck_modify', effectParams: { action: 'copy', copies: 3 } },
  { id: 'winter_delete', season: 'winter', name: '删除', description: '从牌库中删除所有指定数字的牌', price: 6, effectType: 'deck_modify', effectParams: { action: 'delete_value' } },
  { id: 'winter_filter', season: 'winter', name: '过滤', description: '从牌库中删除所有指定花色的牌', price: 8, effectType: 'deck_modify', effectParams: { action: 'delete_suit' } },
  { id: 'winter_slim', season: 'winter', name: '精简', description: '牌库只保留3种花色（你选择删除哪种）', price: 10, effectType: 'deck_modify', effectParams: { action: 'keep_3_suits' } },
  { id: 'winter_purify', season: 'winter', name: '净化', description: '从牌库中删除所有字牌', price: 7, effectType: 'deck_modify', effectParams: { action: 'delete_honors' } },
  { id: 'winter_multiply', season: 'winter', name: '增殖', description: '牌库中所有1和9的牌数量翻倍', price: 8, effectType: 'deck_modify', effectParams: { action: 'double_terminals' } },
  { id: 'winter_unify', season: 'winter', name: '统一', description: '选择1种花色，牌库中该花色牌数量翻倍', price: 10, effectType: 'deck_modify', effectParams: { action: 'double_suit' } },
  { id: 'winter_freeze', season: 'winter', name: '冻结', description: '锁定牌库顺序，本局不再洗牌', price: 5, effectType: 'deck_modify', effectParams: { action: 'freeze' } },
  { id: 'winter_foresee', season: 'winter', name: '预知', description: '查看并重排牌库顶10张的顺序', price: 6, effectType: 'deck_modify', effectParams: { action: 'reorder_top' } },
  { id: 'winter_cycle', season: 'winter', name: '轮回', description: '将弃牌堆全部洗入牌库', price: 4, effectType: 'deck_modify', effectParams: { action: 'recycle_discards' } },
];

// ─── All Season Cards ──────────────────────────────────────────────────────

export const ALL_SEASON_CARDS: SeasonCardDef[] = [
  ...SPRING_CARDS,
  ...SUMMER_CARDS,
  ...AUTUMN_CARDS,
  ...WINTER_CARDS,
];

export function getSeasonCards(season: Season): SeasonCardDef[] {
  return ALL_SEASON_CARDS.filter(c => c.season === season);
}

export function getSeasonCardById(id: string): SeasonCardDef | undefined {
  return ALL_SEASON_CARDS.find(c => c.id === id);
}

/** Generate season card offerings for shop based on current round */
export function generateSeasonShopCards(round: number, count: number = 2): SeasonCardDef[] {
  const season = getSeasonForRound(round);
  const available = getSeasonCards(season);
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
