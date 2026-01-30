import { Tile, TileSuit, TileValue, isSameTile, groupTilesByType } from './Tile';
import { STANDARD_FANS, getFanByName } from '../data/fans';

// ─── Public types ───────────────────────────────────────────────────────────

export interface Fan {
  name: string;
  points: number;
  description: string;
}

/** A set of 3 tiles: either a sequence (chow) or triplet (pong). */
export interface MeldCombo {
  type: 'chow' | 'pong';
  tiles: Tile[];
}

/** One valid decomposition of a winning hand. */
export interface HandDecomposition {
  melds: MeldCombo[];  // 4 melds for standard win, 0 for seven-pairs / thirteen-orphans
  pair: Tile[];        // The pair (2 tiles)
  form: 'standard' | 'seven_pairs' | 'thirteen_orphans';
}

/** Full evaluation result returned by the evaluator. */
export interface EvaluationResult {
  isWinning: boolean;
  fans: Fan[];
  totalPoints: number;
  decomposition: HandDecomposition | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Tile key ignoring copy index (e.g. "wan-1"). */
function tileKey(t: Tile): string {
  return `${t.suit}-${t.value}`;
}

/** Whether a suit is a numbered suit (wan/tiao/tong). */
function isNumberSuit(suit: TileSuit): boolean {
  return suit === TileSuit.Wan || suit === TileSuit.Tiao || suit === TileSuit.Tong;
}

/** Whether a tile is an honor tile (wind or dragon). */
function isHonor(t: Tile): boolean {
  return t.suit === TileSuit.Wind || t.suit === TileSuit.Dragon;
}

/** Whether a tile is a terminal (1 or 9 of a number suit). */
function isTerminal(t: Tile): boolean {
  return isNumberSuit(t.suit) && (t.value === 1 || t.value === 9);
}

/** Whether a tile is a terminal or honor. */
function isTerminalOrHonor(t: Tile): boolean {
  return isTerminal(t) || isHonor(t);
}

/**
 * Build a frequency map: tileKey → count.
 * Optionally returns the original tiles grouped by key.
 */
function buildFrequencyMap(tiles: Tile[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tiles) {
    const k = tileKey(t);
    freq.set(k, (freq.get(k) ?? 0) + 1);
  }
  return freq;
}

/**
 * Build a lookup from tileKey → Tile[] so we can reconstruct actual Tile
 * objects from frequency maps.
 */
function buildTileLookup(tiles: Tile[]): Map<string, Tile[]> {
  const lookup = new Map<string, Tile[]>();
  for (const t of tiles) {
    const k = tileKey(t);
    if (!lookup.has(k)) lookup.set(k, []);
    lookup.get(k)!.push(t);
  }
  return lookup;
}

// ─── 13-Orphans check ──────────────────────────────────────────────────────

const THIRTEEN_ORPHAN_KEYS: string[] = [
  'wan-1', 'wan-9',
  'tiao-1', 'tiao-9',
  'tong-1', 'tong-9',
  'wind-1', 'wind-2', 'wind-3', 'wind-4',  // E S W N
  'dragon-1', 'dragon-2', 'dragon-3',        // Red Green White
];

function checkThirteenOrphans(tiles: Tile[]): HandDecomposition | null {
  if (tiles.length !== 14) return null;

  const freq = buildFrequencyMap(tiles);

  // Must contain all 13 terminal/honor types
  let pairKey: string | null = null;
  for (const key of THIRTEEN_ORPHAN_KEYS) {
    const count = freq.get(key) ?? 0;
    if (count === 0) return null;
    if (count === 2) {
      if (pairKey !== null) return null; // only one pair allowed
      pairKey = key;
    } else if (count !== 1) {
      return null; // more than 2 copies not allowed
    }
  }

  if (pairKey === null) return null;

  // Make sure there are no other tile types
  if (freq.size !== 13) return null;

  const lookup = buildTileLookup(tiles);
  const pair = lookup.get(pairKey)!.slice(0, 2);

  return {
    melds: [],
    pair,
    form: 'thirteen_orphans',
  };
}

// ─── Seven Pairs check ─────────────────────────────────────────────────────

function checkSevenPairs(tiles: Tile[]): HandDecomposition | null {
  if (tiles.length !== 14) return null;

  const freq = buildFrequencyMap(tiles);
  if (freq.size !== 7) return null;

  for (const count of freq.values()) {
    if (count !== 2) return null;
  }

  // Use the first pair as "pair" and rest as empty melds (special form)
  const lookup = buildTileLookup(tiles);
  const keys = [...freq.keys()];
  const pair = lookup.get(keys[0])!.slice(0, 2);

  return {
    melds: [],
    pair,
    form: 'seven_pairs',
  };
}

// ─── Luxury Seven Pairs check (豪华七对) ────────────────────────────────────
// 3 quads (4 of a kind, NOT declared as kong) + 1 pair = 14 tiles
// Appears as 7 "pairs" but 3 of them are actually 4-of-a-kinds

function checkLuxurySevenPairs(tiles: Tile[]): { isLuxury: boolean; quadCount: number } {
  if (tiles.length !== 14) return { isLuxury: false, quadCount: 0 };

  const freq = buildFrequencyMap(tiles);
  
  // Count quads (4 of a kind) and pairs
  let quadCount = 0;
  let pairCount = 0;
  
  for (const count of freq.values()) {
    if (count === 4) {
      quadCount++;
    } else if (count === 2) {
      pairCount++;
    } else {
      return { isLuxury: false, quadCount: 0 };
    }
  }
  
  // Luxury seven pairs: 3 quads + 1 pair = 3*4 + 2 = 14
  if (quadCount === 3 && pairCount === 1) {
    return { isLuxury: true, quadCount: 3 };
  }
  
  // Also check for 2 quads + 3 pairs (lesser luxury)
  if (quadCount >= 1 && quadCount * 4 + pairCount * 2 === 14) {
    return { isLuxury: quadCount >= 2, quadCount };
  }
  
  return { isLuxury: false, quadCount: 0 };
}

// ─── Consecutive Seven Pairs check (连七对) ─────────────────────────────────
// Same suit, 7 consecutive pairs: 11223344556677

function checkConsecutiveSevenPairs(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false;

  const freq = buildFrequencyMap(tiles);
  if (freq.size !== 7) return false;

  // All must be pairs
  for (const count of freq.values()) {
    if (count !== 2) return false;
  }

  // Check if all same suit and consecutive
  const keys = [...freq.keys()];
  const suits = new Set(keys.map(k => k.split('-')[0]));
  
  // Must be single numbered suit
  if (suits.size !== 1) return false;
  const suit = [...suits][0];
  if (!isNumberSuit(suit as TileSuit)) return false;

  // Get values and check consecutive
  const values = keys.map(k => Number(k.split('-')[1])).sort((a, b) => a - b);
  
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] + 1) return false;
  }

  return true;
}

// ─── Standard 4-melds + 1-pair decomposition ───────────────────────────────

/**
 * Try to decompose `freq` into exactly 4 melds (chow or pong).
 * This is the core recursive backtracking algorithm.
 *
 * Works on a mutable frequency map for efficiency; caller must clone if needed.
 */
function decomposeIntoMelds(
  freq: Map<string, number>,
  melds: MeldCombo[],
  allTiles: Map<string, Tile[]>,
  usedCounts: Map<string, number>,
): MeldCombo[][] {
  if (melds.length === 4) {
    // Check all remaining counts are zero
    for (const v of freq.values()) {
      if (v !== 0) return [];
    }
    return [melds.slice()];
  }

  // Find first key with count > 0
  let firstKey: string | null = null;
  for (const [k, v] of freq) {
    if (v > 0) { firstKey = k; break; }
  }
  if (firstKey === null) return [];

  const results: MeldCombo[][] = [];
  const [suit, valStr] = firstKey.split('-');
  const value = Number(valStr);

  // Try pong (triplet)
  if ((freq.get(firstKey) ?? 0) >= 3) {
    freq.set(firstKey, freq.get(firstKey)! - 3);
    const used = usedCounts.get(firstKey) ?? 0;
    const tiles = allTiles.get(firstKey)!.slice(used, used + 3);
    usedCounts.set(firstKey, used + 3);

    melds.push({ type: 'pong', tiles });
    results.push(...decomposeIntoMelds(freq, melds, allTiles, usedCounts));
    melds.pop();

    usedCounts.set(firstKey, used);
    freq.set(firstKey, freq.get(firstKey)! + 3);
  }

  // Try chow (sequence) — only for number suits
  if (isNumberSuit(suit as TileSuit) && value <= 7) {
    const key2 = `${suit}-${value + 1}`;
    const key3 = `${suit}-${value + 2}`;
    if ((freq.get(firstKey) ?? 0) >= 1 &&
        (freq.get(key2) ?? 0) >= 1 &&
        (freq.get(key3) ?? 0) >= 1) {
      freq.set(firstKey, freq.get(firstKey)! - 1);
      freq.set(key2, freq.get(key2)! - 1);
      freq.set(key3, freq.get(key3)! - 1);

      const u1 = usedCounts.get(firstKey) ?? 0;
      const u2 = usedCounts.get(key2) ?? 0;
      const u3 = usedCounts.get(key3) ?? 0;
      const t1 = allTiles.get(firstKey)![u1];
      const t2 = allTiles.get(key2)![u2];
      const t3 = allTiles.get(key3)![u3];
      usedCounts.set(firstKey, u1 + 1);
      usedCounts.set(key2, u2 + 1);
      usedCounts.set(key3, u3 + 1);

      melds.push({ type: 'chow', tiles: [t1, t2, t3] });
      results.push(...decomposeIntoMelds(freq, melds, allTiles, usedCounts));
      melds.pop();

      usedCounts.set(firstKey, u1);
      usedCounts.set(key2, u2);
      usedCounts.set(key3, u3);
      freq.set(firstKey, freq.get(firstKey)! + 1);
      freq.set(key2, freq.get(key2)! + 1);
      freq.set(key3, freq.get(key3)! + 1);
    }
  }

  return results;
}

/**
 * Find all valid standard decompositions (4 melds + 1 pair) for 14 tiles.
 */
function findStandardDecompositions(tiles: Tile[]): HandDecomposition[] {
  if (tiles.length !== 14) return [];

  const freq = buildFrequencyMap(tiles);
  const lookup = buildTileLookup(tiles);
  const results: HandDecomposition[] = [];

  // Try each possible pair
  for (const [key, count] of freq) {
    if (count < 2) continue;

    // Remove pair
    const freqCopy = new Map(freq);
    freqCopy.set(key, count - 2);

    const used = lookup.get(key)!;
    const pair: Tile[] = [used[0], used[1]];

    const usedCounts = new Map<string, number>();
    // Mark the 2 pair tiles as used
    usedCounts.set(key, 2);

    const meldResults = decomposeIntoMelds(freqCopy, [], lookup, usedCounts);

    for (const melds of meldResults) {
      results.push({ melds, pair, form: 'standard' });
    }
  }

  return results;
}

// ─── Fan pattern detectors ─────────────────────────────────────────────────

function lookupFan(name: string): Fan {
  const f = getFanByName(name);
  if (f) return f;
  // Fallback: find in STANDARD_FANS by name
  const sf = STANDARD_FANS.find(sf => sf.name === name);
  if (sf) return sf;
  throw new Error(`Unknown fan: ${name}`);
}

/**
 * Detect Chicken Hand (鸡胡) — a valid win with no other pattern.
 * This is added as the base 1-point fan if no other pattern-specific fans apply.
 */
function isChickenHand(fans: Fan[]): boolean {
  // Chicken hand if the only fan would be the base 胡牌
  return fans.length === 0;
}

/** All Sequences (平胡): all 4 melds are chows. Standard form only. */
function checkAllSequences(decomp: HandDecomposition): boolean {
  if (decomp.form !== 'standard') return false;
  return decomp.melds.every(m => m.type === 'chow');
}

/** All Triplets (对对胡): all 4 melds are pongs. Standard form only. */
function checkAllTriplets(decomp: HandDecomposition): boolean {
  if (decomp.form !== 'standard') return false;
  return decomp.melds.every(m => m.type === 'pong');
}

/** Collect all tiles from a decomposition. */
function allTilesFromDecomp(decomp: HandDecomposition): Tile[] {
  const tiles: Tile[] = [...decomp.pair];
  for (const m of decomp.melds) {
    tiles.push(...m.tiles);
  }
  return tiles;
}

/** Half Flush (混一色): one numbered suit + honors only. */
function checkHalfFlush(tiles: Tile[]): boolean {
  const suits = new Set(tiles.map(t => t.suit));
  const numberSuits = [...suits].filter(s => isNumberSuit(s));
  const hasHonors = [...suits].some(s => !isNumberSuit(s));
  return numberSuits.length === 1 && hasHonors;
}

/** Full Flush (清一色): one numbered suit only, no honors. */
function checkFullFlush(tiles: Tile[]): boolean {
  const suits = new Set(tiles.map(t => t.suit));
  if (suits.size !== 1) return false;
  const onlySuit = [...suits][0];
  return isNumberSuit(onlySuit);
}

/** All Honors (字一色): all tiles are honor tiles. */
function checkAllHonors(tiles: Tile[]): boolean {
  return tiles.every(t => isHonor(t));
}

// ─── Public API ─────────────────────────────────────────────────────────────

export class FanEvaluator {
  /**
   * Evaluate a 14-tile hand (including the winning tile).
   *
   * @param tiles - All 14 tiles in the hand (13 hand tiles + winning tile).
   * @returns Evaluation result with detected fans, total points, and decomposition.
   */
  public static evaluateHand(tiles: Tile[]): EvaluationResult {
    if (tiles.length !== 14) {
      return { isWinning: false, fans: [], totalPoints: 0, decomposition: null };
    }

    // Collect candidate decompositions from all three win forms
    const candidates: HandDecomposition[] = [];

    // 1. Thirteen Orphans
    const thirteenOrphans = checkThirteenOrphans(tiles);
    if (thirteenOrphans) candidates.push(thirteenOrphans);

    // 2. Seven Pairs
    const sevenPairs = checkSevenPairs(tiles);
    if (sevenPairs) candidates.push(sevenPairs);

    // 3. Standard 4-melds + pair
    const standards = findStandardDecompositions(tiles);
    candidates.push(...standards);

    if (candidates.length === 0) {
      return { isWinning: false, fans: [], totalPoints: 0, decomposition: null };
    }

    // Score each candidate and pick the best
    let bestResult: EvaluationResult | null = null;

    for (const decomp of candidates) {
      const fans = FanEvaluator.detectFans(decomp, tiles);
      const totalPoints = fans.reduce((sum, f) => sum + f.points, 0);

      if (bestResult === null || totalPoints > bestResult.totalPoints) {
        bestResult = { isWinning: true, fans, totalPoints, decomposition: decomp };
      }
    }

    return bestResult!;
  }

  /**
   * Check whether a set of 14 tiles forms any valid winning hand.
   */
  public static isWinningHand(tiles: Tile[]): boolean {
    if (tiles.length !== 14) return false;

    if (checkThirteenOrphans(tiles)) return true;
    if (checkSevenPairs(tiles)) return true;
    if (findStandardDecompositions(tiles).length > 0) return true;

    return false;
  }

  /**
   * Detect all applicable fan patterns for a given decomposition.
   * Fans can stack — multiple patterns may be detected simultaneously.
   */
  private static detectFans(decomp: HandDecomposition, tiles: Tile[]): Fan[] {
    const fans: Fan[] = [];

    // ── Special forms ──
    if (decomp.form === 'thirteen_orphans') {
      fans.push(lookupFan('国士无双'));
      // Thirteen orphans is standalone — return early
      return fans;
    }

    if (decomp.form === 'seven_pairs') {
      // Check for special seven pairs variants first
      const luxuryCheck = checkLuxurySevenPairs(tiles);
      const isConsecutive = checkConsecutiveSevenPairs(tiles);
      
      if (luxuryCheck.isLuxury && luxuryCheck.quadCount >= 3) {
        // 豪华七对: 3 quads + 1 pair
        fans.push(lookupFan('豪华七对'));
      } else if (isConsecutive) {
        // 连七对: consecutive pairs same suit
        fans.push(lookupFan('连七对'));
      } else {
        // Regular seven pairs
        fans.push(lookupFan('七对'));
      }
      
      // Seven pairs can stack with flush patterns
      if (checkFullFlush(tiles)) {
        fans.push(lookupFan('清一色'));
      } else if (checkHalfFlush(tiles)) {
        fans.push(lookupFan('混一色'));
      }
      if (checkAllHonors(tiles)) {
        fans.push(lookupFan('字一色'));
      }
      return fans;
    }

    // ── Standard form patterns ──

    // Structure-based patterns
    if (checkAllSequences(decomp)) {
      fans.push(lookupFan('平和'));
    }
    if (checkAllTriplets(decomp)) {
      fans.push(lookupFan('对对和'));
    }

    // Suit-based patterns (these are mutually exclusive in escalation,
    // but all-honors overrides flush checks)
    if (checkAllHonors(tiles)) {
      fans.push(lookupFan('字一色'));
    } else if (checkFullFlush(tiles)) {
      fans.push(lookupFan('清一色'));
    } else if (checkHalfFlush(tiles)) {
      fans.push(lookupFan('混一色'));
    }

    // If no pattern-specific fans were detected, it's a Chicken Hand
    if (fans.length === 0) {
      fans.push(lookupFan('胡牌'));
    }

    return fans;
  }
}
