import { Tile, TileSuit } from '../core/Tile';
import { Hand } from '../core/Hand';
import { Fan } from '../core/FanEvaluator';

/**
 * Boss庄 — special modifiers that restrict player actions during boss rounds
 * Inspired by Balatro's Boss Blinds that make rounds more challenging
 */

export enum BossBlindType {
  CHARACTER_SEAL = 'character_seal',      // 万字封印: No Character tiles
  BLIND_TILES = 'blind_tiles',            // 盲牌之局: Tiles face-down
  PAIRS_ONLY = 'pairs_only',              // 对子挑战: Only pair-based wins
  CURSED_TILES = 'cursed_tiles',          // 诅咒之牌: Random tiles debuffed
  SUIT_BAN = 'suit_ban',                  // 花色禁令: One suit banned
  HONOR_PRISON = 'honor_prison',          // 字牌囚笼: Can't use honor tiles
  TIME_PRESSURE = 'time_pressure',        // 时间压力: Fewer hands/discards
  SCORE_TAX = 'score_tax'                 // 分数税收: Score heavily reduced
}

export interface BossBlindEffect {
  /** Check if a tile can be used in scoring hand */
  canUseTile?: (tile: Tile) => boolean;

  /** Check if a tile should be hidden from player */
  isTileHidden?: (tile: Tile) => boolean;

  /** Validate if a winning hand is allowed */
  canWinWithHand?: (tiles: Tile[], fans: Fan[]) => { allowed: boolean; reason?: string };

  /** Apply debuff to specific tiles */
  isDebuffed?: (tile: Tile) => boolean;

  /** Modify score calculation */
  modifyScore?: (baseScore: number, chips: number, mult: number) => number;

  /** Modify game state (hands, discards) */
  modifyGameState?: (state: { hands: number; discards: number }) => { hands: number; discards: number };
}

export class BossBlind {
  public readonly type: BossBlindType;
  public readonly name: string;
  public readonly description: string;
  public readonly effect: BossBlindEffect; // Properties within effect are mutable for binding

  // For CURSED_TILES and SUIT_BAN - track dynamic state
  private _cursedTileKeys: Set<string> = new Set();
  private _bannedSuit: TileSuit | null = null;

  constructor(type: BossBlindType, name: string, description: string, effect: BossBlindEffect) {
    this.type = type;
    this.name = name;
    this.description = description;
    this.effect = effect;
  }

  /** Initialize dynamic 庄 state (call when boss round starts) */
  public initialize(context: { hand?: Hand; drawPile?: Tile[] }): void {
    switch (this.type) {
      case BossBlindType.CURSED_TILES:
        this.initializeCursedTiles(context);
        break;
      case BossBlindType.SUIT_BAN:
        this.initializeSuitBan();
        break;
    }
  }

  /** Get cursed tile keys (for CURSED_TILES 庄) */
  public get cursedTileKeys(): ReadonlySet<string> {
    return this._cursedTileKeys;
  }

  /** Get banned suit (for SUIT_BAN 庄) */
  public get bannedSuit(): TileSuit | null {
    return this._bannedSuit;
  }

  /** Rotate banned suit to next one */
  public rotateBannedSuit(): void {
    if (this.type !== BossBlindType.SUIT_BAN) return;

    const numberSuits = [TileSuit.Wan, TileSuit.Tiao, TileSuit.Tong];
    const currentIndex = this._bannedSuit ? numberSuits.indexOf(this._bannedSuit) : -1;
    this._bannedSuit = numberSuits[(currentIndex + 1) % numberSuits.length];
  }

  private initializeCursedTiles(context: { hand?: Hand; drawPile?: Tile[] }): void {
    // Curse 5-7 random tile types from the available pool
    const allTiles: Tile[] = [];
    if (context.hand) allTiles.push(...context.hand.tiles);
    if (context.drawPile) allTiles.push(...context.drawPile);

    const uniqueKeys = new Set<string>();
    for (const tile of allTiles) {
      uniqueKeys.add(`${tile.suit}-${tile.value}`);
    }

    const keyArray = Array.from(uniqueKeys);
    const curseCount = Math.min(7, Math.max(5, Math.floor(keyArray.length * 0.25)));

    // Randomly select tiles to curse
    for (let i = 0; i < curseCount; i++) {
      const randomIndex = Math.floor(Math.random() * keyArray.length);
      this._cursedTileKeys.add(keyArray[randomIndex]);
      keyArray.splice(randomIndex, 1);
    }
  }

  private initializeSuitBan(): void {
    // Start with a random suit
    const numberSuits = [TileSuit.Wan, TileSuit.Tiao, TileSuit.Tong];
    this._bannedSuit = numberSuits[Math.floor(Math.random() * numberSuits.length)];
  }
}

// ─── Boss庄 Factory ────────────────────────────────────────────────────────

export function createBossBlind(type: BossBlindType): BossBlind {
  switch (type) {
    case BossBlindType.CHARACTER_SEAL:
      return new BossBlind(
        type,
        '万字封印',
        '所有万字牌无法用于胡牌',
        {
          canUseTile: (tile: Tile) => tile.suit !== TileSuit.Wan,
          canWinWithHand: (tiles: Tile[]) => {
            const hasWan = tiles.some(t => t.suit === TileSuit.Wan);
            return {
              allowed: !hasWan,
              reason: hasWan ? '手牌中不能包含万字牌！' : undefined
            };
          }
        }
      );

    case BossBlindType.BLIND_TILES:
      return new BossBlind(
        type,
        '盲牌之局',
        '所有手牌背面朝上，无法看清',
        {
          isTileHidden: () => true
        }
      );

    case BossBlindType.PAIRS_ONLY:
      return new BossBlind(
        type,
        '对子挑战',
        '只能用对对和或七对胡牌',
        {
          canWinWithHand: (tiles: Tile[], fans: Fan[]) => {
            const hasPairsPattern = fans.some(f =>
              f.name === '对对和' || f.name === '七对'
            );
            return {
              allowed: hasPairsPattern,
              reason: hasPairsPattern ? undefined : '必须用对对和或七对胡牌！'
            };
          }
        }
      );

    case BossBlindType.CURSED_TILES: {
      const cursedBlind = new BossBlind(
        type,
        '诅咒之牌',
        '随机牌型被诅咒，无法得分',
        {}
      );
      // Bind effect to the actual BossBlind instance
      cursedBlind.effect.isDebuffed = (tile: Tile): boolean => {
        const key = `${tile.suit}-${tile.value}`;
        return cursedBlind.cursedTileKeys.has(key);
      };
      return cursedBlind;
    }

    case BossBlindType.SUIT_BAN: {
      const suitBanBlind = new BossBlind(
        type,
        '花色禁令',
        '每次出牌后禁用一种花色（轮换）',
        {}
      );
      // Bind effects to the actual BossBlind instance
      suitBanBlind.effect.canUseTile = (tile: Tile): boolean => {
        return tile.suit !== suitBanBlind.bannedSuit;
      };
      suitBanBlind.effect.canWinWithHand = (tiles: Tile[]): { allowed: boolean; reason?: string } => {
        const hasBanned = tiles.some(t => t.suit === suitBanBlind.bannedSuit);
        const suitName = suitBanBlind.bannedSuit === TileSuit.Wan ? '万' :
                        suitBanBlind.bannedSuit === TileSuit.Tiao ? '条' : '筒';
        return {
          allowed: !hasBanned,
          reason: hasBanned ? `本次禁用${suitName}字牌！` : undefined
        };
      };
      return suitBanBlind;
    }

    case BossBlindType.HONOR_PRISON:
      return new BossBlind(
        type,
        '字牌囚笼',
        '不能使用字牌（风和龙）',
        {
          canUseTile: (tile: Tile) => tile.suit !== TileSuit.Wind && tile.suit !== TileSuit.Dragon,
          canWinWithHand: (tiles: Tile[]) => {
            const hasHonor = tiles.some(t => t.suit === TileSuit.Wind || t.suit === TileSuit.Dragon);
            return {
              allowed: !hasHonor,
              reason: hasHonor ? '手牌中不能包含字牌！' : undefined
            };
          }
        }
      );

    case BossBlindType.TIME_PRESSURE:
      return new BossBlind(
        type,
        '时间压力',
        '可用手数和弃牌次数减半',
        {
          modifyGameState: (state) => ({
            hands: Math.max(1, Math.floor(state.hands / 2)),
            discards: Math.max(1, Math.floor(state.discards / 2))
          })
        }
      );

    case BossBlindType.SCORE_TAX:
      return new BossBlind(
        type,
        '分数税收',
        'BOSS征收60%的分数作为税',
        {
          modifyScore: (baseScore: number) => Math.floor(baseScore * 0.4)
        }
      );

    default:
      throw new Error(`Unknown boss blind type: ${type}`);
  }
}

// ─── All Boss庄 Types ──────────────────────────────────────────────────────

export const ALL_BOSS_BLIND_TYPES = [
  BossBlindType.CHARACTER_SEAL,
  BossBlindType.BLIND_TILES,
  BossBlindType.PAIRS_ONLY,
  BossBlindType.CURSED_TILES,
  BossBlindType.SUIT_BAN,
  BossBlindType.HONOR_PRISON,
  BossBlindType.TIME_PRESSURE,
  BossBlindType.SCORE_TAX
];
