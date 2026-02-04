import { Tile, TileSuit, TileValue, isSameTile, groupTilesByType } from './Tile';
import { STANDARD_FANS, getFanByName } from '../data/fans';
import { Material, getMaterialData } from '../data/materials';

// ─── Wildcard Support ───────────────────────────────────────────────────────

/** Check if a tile is a wildcard (瓷牌 or 翡翠牌) */
function isWildcardTile(t: Tile): boolean {
  if (!t.material) return false;
  const data = getMaterialData(t.material);
  return data?.wildcardHonor || data?.wildcardNumber || false;
}

/** Get all possible values a wildcard tile can become */
function getWildcardPossibilities(t: Tile): { suit: TileSuit; value: TileValue }[] {
  if (!t.material) return [{ suit: t.suit, value: t.value }];
  
  const data = getMaterialData(t.material);
  
  // 瓷牌: Can be any honor tile
  if (data?.wildcardHonor) {
    return [
      { suit: TileSuit.Wind, value: 1 },  // 东
      { suit: TileSuit.Wind, value: 2 },  // 南
      { suit: TileSuit.Wind, value: 3 },  // 西
      { suit: TileSuit.Wind, value: 4 },  // 北
      { suit: TileSuit.Dragon, value: 1 }, // 中
      { suit: TileSuit.Dragon, value: 2 }, // 发
      { suit: TileSuit.Dragon, value: 3 }, // 白
    ];
  }
  
  // 翡翠牌: Can be any number 1-9 (same suit)
  if (data?.wildcardNumber) {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].map(v => ({ suit: t.suit, value: v as TileValue }));
  }
  
  return [{ suit: t.suit, value: t.value }];
}

/** 
 * Generate all possible concrete tile combinations for wildcards.
 * Uses iterative approach to avoid stack overflow with many wildcards.
 * Returns array of tile arrays, each representing one possible interpretation.
 */
function expandWildcards(tiles: Tile[]): Tile[][] {
  const wildcardIndices: number[] = [];
  const wildcardOptions: { suit: TileSuit; value: TileValue }[][] = [];
  
  // Find all wildcard tiles and their possibilities
  for (let i = 0; i < tiles.length; i++) {
    if (isWildcardTile(tiles[i])) {
      wildcardIndices.push(i);
      wildcardOptions.push(getWildcardPossibilities(tiles[i]));
    }
  }
  
  // No wildcards - return original
  if (wildcardIndices.length === 0) {
    return [tiles];
  }
  
  // Limit combinations to prevent explosion (max ~1000 combinations)
  const totalCombinations = wildcardOptions.reduce((acc, opts) => acc * opts.length, 1);
  if (totalCombinations > 1000) {
    // Too many combinations - use heuristic: try each wildcard independently
    // and pick values that appear most in hand
    console.warn(`Too many wildcard combinations (${totalCombinations}), using heuristic`);
    return [applyWildcardHeuristic(tiles, wildcardIndices, wildcardOptions)];
  }
  
  // Generate all combinations
  const results: Tile[][] = [];
  const indices = new Array(wildcardIndices.length).fill(0);
  
  while (true) {
    // Create a new tile array with current wildcard assignments
    const newTiles = tiles.map((t, i) => {
      const wcIdx = wildcardIndices.indexOf(i);
      if (wcIdx === -1) return t;
      
      const option = wildcardOptions[wcIdx][indices[wcIdx]];
      return { ...t, suit: option.suit, value: option.value };
    });
    results.push(newTiles);
    
    // Increment indices (like counting in mixed-radix)
    let carry = true;
    for (let i = indices.length - 1; i >= 0 && carry; i--) {
      indices[i]++;
      if (indices[i] >= wildcardOptions[i].length) {
        indices[i] = 0;
      } else {
        carry = false;
      }
    }
    if (carry) break;
  }
  
  return results;
}

/** Heuristic for when there are too many wildcard combinations */
function applyWildcardHeuristic(
  tiles: Tile[], 
  wildcardIndices: number[], 
  wildcardOptions: { suit: TileSuit; value: TileValue }[][]
): Tile[] {
  // Count frequency of each tile type in non-wildcard tiles
  const freq = new Map<string, number>();
  for (let i = 0; i < tiles.length; i++) {
    if (!wildcardIndices.includes(i)) {
      const key = `${tiles[i].suit}-${tiles[i].value}`;
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }
  
  // For each wildcard, pick the option that would complete a set
  return tiles.map((t, i) => {
    const wcIdx = wildcardIndices.indexOf(i);
    if (wcIdx === -1) return t;
    
    const options = wildcardOptions[wcIdx];
    
    // Find option that would make a triplet (count = 2) or pair (count = 1)
    let bestOption = options[0];
    let bestScore = 0;
    
    for (const opt of options) {
      const key = `${opt.suit}-${opt.value}`;
      const count = freq.get(key) ?? 0;
      // Prefer completing triplets (2 existing) > pairs (1 existing) > new
      const score = count === 2 ? 100 : count === 1 ? 10 : 0;
      if (score > bestScore) {
        bestScore = score;
        bestOption = opt;
      }
    }
    
    return { ...t, suit: bestOption.suit, value: bestOption.value };
  });
}

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

    // Expand wildcards (瓷牌/翡翠牌) into all possible interpretations
    const tileVariants = expandWildcards(tiles);
    
    let bestOverallResult: EvaluationResult | null = null;
    
    // Evaluate each wildcard interpretation and find the best
    for (const variantTiles of tileVariants) {
      const result = FanEvaluator.evaluateHandInternal(variantTiles);
      
      if (result.isWinning) {
        if (bestOverallResult === null || result.totalPoints > bestOverallResult.totalPoints) {
          bestOverallResult = result;
        }
      }
    }
    
    return bestOverallResult ?? { isWinning: false, fans: [], totalPoints: 0, decomposition: null };
  }

  /** Internal evaluation without wildcard expansion */
  private static evaluateHandInternal(tiles: Tile[]): EvaluationResult {
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

    // Expand wildcards and check if any interpretation wins
    const tileVariants = expandWildcards(tiles);
    
    for (const variantTiles of tileVariants) {
      if (checkThirteenOrphans(variantTiles)) return true;
      if (checkSevenPairs(variantTiles)) return true;
      if (findStandardDecompositions(variantTiles).length > 0) return true;
    }

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
      fans.push(lookupFan('七对'));
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
