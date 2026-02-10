import { describe, test, expect } from 'vitest';
import { Scoring } from '../Scoring';
import { Tile, TileSuit } from '../Tile';
import { Fan } from '../FanEvaluator';
import { GodTile as GodTileClass, GodTileRarity } from '../../roguelike/GodTile';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createTile(suit: TileSuit, value: number, index: number = 0): Tile {
  return {
    id: `${suit}-${value}-${index}`,
    suit,
    value,
    displayName: `${value}${suit}`,
  };
}

function createFan(name: string, points: number, description: string = ''): Fan {
  return { name, points, description };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Scoring Engine', () => {
  describe('Basic calculation', () => {
    test('should calculate score with single fan', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const fans = [createFan('胡牌', 1)];
      const result = Scoring.calculateScore(hand, fans);

      expect(result.baseScore).toBe(100);
      expect(result.fanMultiplier).toBe(1); // 胡牌 ×1
      expect(result.finalScore).toBe(100); // 100 × 1
    });

    test('should multiply fan multipliers', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const fans = [
        createFan('清一色', 8),
        createFan('对对和', 5),
      ];
      const result = Scoring.calculateScore(hand, fans);

      expect(result.fanMultiplier).toBe(13); // 8 + 5
      expect(result.finalScore).toBe(1300); // 100 × 13
    });

    test('should handle custom base score', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const fans = [createFan('平和', 2)];
      const result = Scoring.calculateScore(hand, fans, [], { baseScore: 200 });

      expect(result.baseScore).toBe(200);
      expect(result.finalScore).toBe(400); // 200 × 2
    });
  });

  describe('Fan contributions', () => {
    test('should track individual fan contributions', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const fans = [
        createFan('平和', 2),
        createFan('混一色', 4),
      ];
      const result = Scoring.calculateScore(hand, fans);

      expect(result.fanContributions).toHaveLength(2);
      expect(result.fanContributions[0].multiplier).toBe(2);
      expect(result.fanContributions[1].multiplier).toBe(4);
      expect(result.fanMultiplier).toBe(6); // 2 + 4
    });

    test('should handle empty fans (minimum ×1)', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const result = Scoring.calculateScore(hand, []);

      expect(result.fanMultiplier).toBe(1);
      expect(result.finalScore).toBe(100);
    });
  });

  describe('Score breakdown structure', () => {
    test('should return complete breakdown', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const fans = [createFan('胡牌', 1)];
      const result = Scoring.calculateScore(hand, fans);

      expect(result).toHaveProperty('hand');
      expect(result).toHaveProperty('detectedFans');
      expect(result).toHaveProperty('fanContributions');
      expect(result).toHaveProperty('fanMultiplier');
      expect(result).toHaveProperty('baseScore');
      expect(result).toHaveProperty('chipModifiers');
      expect(result).toHaveProperty('multModifiers');
      expect(result).toHaveProperty('goldModifiers');
      expect(result).toHaveProperty('totalChips');
      expect(result).toHaveProperty('totalMult');
      expect(result).toHaveProperty('finalScore');
    });
  });

  describe('Format score breakdown', () => {
    test('should format breakdown as readable string', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const fans = [createFan('胡牌', 1)];
      const result = Scoring.calculateScore(hand, fans);
      const formatted = Scoring.formatScoreBreakdown(result);

      expect(formatted).toContain('=== Score Breakdown ===');
      expect(formatted).toContain('[ Fans ]');
      expect(formatted).toContain('胡牌');
      expect(formatted).toContain('[ Final Score ]');
    });
  });

  describe('Edge cases', () => {
    test('should floor final score to integer', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const fans = [createFan('平和', 2)];
      const result = Scoring.calculateScore(hand, fans);
      expect(Number.isInteger(result.finalScore)).toBe(true);
    });

    test('should handle yakuman fan', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const fans = [createFan('九莲宝灯', 88)];
      const result = Scoring.calculateScore(hand, fans);
      expect(result.fanMultiplier).toBe(88);
      expect(result.finalScore).toBe(8800);
    });
  });

  describe('calculateScoreWithBonds', () => {
    test('should return bond effects array', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const fans = [createFan('胡牌', 1)];
      const result = Scoring.calculateScoreWithBonds(hand, fans);

      expect(result).toHaveProperty('bondEffects');
      expect(result.bondEffects).toEqual([]);
    });

    test('should apply meld multiplier', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const fans = [createFan('平和', 2)]; // ×2 multiplier
      const result = Scoring.calculateScoreWithBonds(hand, fans, [], null, {
        meldMultiplier: 3,
      });

      // fanMultiplier=2, meldMultiplier=3, totalMult = 2 × 3 = 6
      expect(result.totalMult).toBe(6);
      expect(result.bondEffects).toContain('出牌倍率: ×3');
    });
  });
});
