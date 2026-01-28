import { Scoring, ScoreBreakdown } from '../Scoring';
import { Tile, TileSuit } from '../Tile';
import { Fan } from '../FanEvaluator';
import { GodTile, GodTileRarity } from '../../roguelike/GodTile';

// ─── Test Helpers ───────────────────────────────────────────────────────────

function createTile(suit: TileSuit, value: number, index: number = 0): Tile {
  return {
    id: `${suit}-${value}-${index}`,
    suit,
    value,
    displayName: `${value}${suit === TileSuit.Wan ? '万' : suit === TileSuit.Tiao ? '条' : suit === TileSuit.Tong ? '筒' : suit === TileSuit.Wind ? '风' : '龙'}`,
  };
}

function createFan(name: string, points: number, description: string = ''): Fan {
  return { name, points, description };
}

function createGodTile(
  displayName: string,
  effects: Array<{ name: string; description: string }>
): GodTile {
  return new GodTile({
    baseTile: { suit: TileSuit.Wan, value: 1 },
    rarity: GodTileRarity.COMMON,
    displayName,
    cost: 5,
    effects: effects.map(e => ({
      name: e.name,
      description: e.description,
      activate: () => {},
    })),
  });
}

// ─── Basic Scoring Tests ────────────────────────────────────────────────────

describe('Scoring Engine', () => {
  describe('Basic calculation', () => {
    test('should calculate score with single fan and tiles', () => {
      const hand = [
        createTile(TileSuit.Wan, 1, 0),
        createTile(TileSuit.Wan, 2, 0),
        createTile(TileSuit.Wan, 3, 0),
      ];

      const fans = [createFan('胡牌', 1)];

      const result = Scoring.calculateScore(hand, fans);

      expect(result.detectedFans).toEqual(fans);
      expect(result.baseChips).toBe(10); // 1番 = 10 chips
      expect(result.baseMult).toBe(2); // 1 (initial) + 1 (from fan)
      expect(result.bonusChips).toBe(18); // Wan 1 (8) + Wan 2 (5) + Wan 3 (5)
      expect(result.totalChips).toBe(28); // 10 + 18
      expect(result.totalMult).toBe(2);
      expect(result.finalScore).toBe(56); // 28 × 2
    });

    test('should calculate score with multiple fans', () => {
      const hand = Array(14).fill(null).map((_, i) => createTile(TileSuit.Wan, (i % 9) + 1, i));

      const fans = [
        createFan('平和', 2),
        createFan('清一色', 24),
      ];

      const result = Scoring.calculateScore(hand, fans);

      expect(result.baseChips).toBe(120); // 20 + 100
      expect(result.baseMult).toBe(11); // 1 + 2 + 8
      // 14 tiles: 2 tiles with value 1 (8 each) + 2 tiles with value 9 (8 each) + 10 regular (5 each) = 16 + 16 + 50 = 82
      // But our generation uses (i % 9) + 1, so tiles are 1,2,3,4,5,6,7,8,9,1,2,3,4,5
      // So: 1 (8), 2-8 (5 each = 35), 9 (8), 1 (8), 2-5 (5 each = 20) = 8 + 35 + 8 + 8 + 20 = 79
      expect(result.bonusChips).toBe(79);
      expect(result.totalChips).toBe(199);
      expect(result.finalScore).toBe(2189); // 199 × 11
    });

    test('should give bonus chips for honor tiles', () => {
      const hand = [
        createTile(TileSuit.Wind, 1, 0), // Honor tile
        createTile(TileSuit.Dragon, 1, 0), // Honor tile
        createTile(TileSuit.Wan, 2, 0), // Regular tile
      ];

      const fans = [createFan('胡牌', 1)];
      const result = Scoring.calculateScore(hand, fans);

      expect(result.bonusChips).toBe(25); // 10 + 10 + 5
      const honorContributions = result.tileChipContributions.filter(tc => tc.reason === 'honor tile');
      expect(honorContributions).toHaveLength(2);
      expect(honorContributions[0].chips).toBe(10);
    });

    test('should give bonus chips for terminal tiles', () => {
      const hand = [
        createTile(TileSuit.Wan, 1, 0), // Terminal
        createTile(TileSuit.Wan, 9, 0), // Terminal
        createTile(TileSuit.Wan, 5, 0), // Regular
      ];

      const fans = [createFan('胡牌', 1)];
      const result = Scoring.calculateScore(hand, fans);

      expect(result.bonusChips).toBe(21); // 8 + 8 + 5
      const terminalContributions = result.tileChipContributions.filter(tc => tc.reason === 'terminal tile');
      expect(terminalContributions).toHaveLength(2);
      expect(terminalContributions[0].chips).toBe(8);
    });
  });

  describe('Fan chip/mult mapping', () => {
    test('should scale chips and mult with fan points', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];

      const testCases = [
        { fan: createFan('胡牌', 1), expectedChips: 10, expectedMult: 1 },
        { fan: createFan('平和', 2), expectedChips: 20, expectedMult: 2 },
        { fan: createFan('七对', 4), expectedChips: 30, expectedMult: 2 },
        { fan: createFan('对对和', 6), expectedChips: 40, expectedMult: 3 },
        { fan: createFan('混老头', 8), expectedChips: 50, expectedMult: 4 },
        { fan: createFan('清一色', 24), expectedChips: 100, expectedMult: 8 },
        { fan: createFan('四暗刻', 32), expectedChips: 150, expectedMult: 10 },
        { fan: createFan('字一色', 64), expectedChips: 300, expectedMult: 15 },
        { fan: createFan('国士无双', 88), expectedChips: 500, expectedMult: 20 },
      ];

      for (const { fan, expectedChips, expectedMult } of testCases) {
        const result = Scoring.calculateScore(hand, [fan]);
        expect(result.baseChips).toBe(expectedChips);
        expect(result.baseMult).toBe(expectedMult + 1); // +1 from initial
      }
    });
  });

  describe('God Tile effects', () => {
    test('should apply chip modifier from god tile', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const fans = [createFan('胡牌', 1)];
      const godTiles = [
        createGodTile('财神一万', [
          { name: '招财', description: '每次胡牌额外获得1金币' },
        ]),
      ];

      const result = Scoring.calculateScore(hand, fans, godTiles);

      expect(result.chipModifiers).toHaveLength(1);
      expect(result.chipModifiers[0].chipsAdded).toBe(10);
      expect(result.totalChips).toBe(28); // 10 (base) + 8 (terminal tile 1) + 10 (god tile)
    });

    test('should apply mult addition from god tile', () => {
      const hand = Array(14).fill(null).map((_, i) => createTile(TileSuit.Wan, (i % 9) + 1, i));
      const fans = [createFan('清一色', 24)];
      const godTiles = [
        createGodTile('白板创世', [
          { name: '纯净之心', description: '清一色番型额外+8番' },
        ]),
      ];

      const result = Scoring.calculateScore(hand, fans, godTiles);

      expect(result.multModifiers).toHaveLength(1);
      expect(result.multModifiers[0].multAdded).toBe(8);
      expect(result.totalMult).toBe(17); // 1 + 8 (from fan) + 8 (from god tile)
    });

    test('should apply mult multiplier from god tile', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const fans = [createFan('平和', 2)];
      const godTiles = [
        createGodTile('发财神牌', [
          { name: '发财致富', description: '胡牌金币奖励翻倍' },
        ]),
      ];

      const result = Scoring.calculateScore(hand, fans, godTiles);

      expect(result.multModifiers).toHaveLength(1);
      expect(result.multModifiers[0].multMultiplier).toBe(2);
      expect(result.totalMult).toBe(6); // (1 + 2) × 2
    });

    test('should apply conditional mult bonus only when condition is met', () => {
      const hand = Array(14).fill(null).map((_, i) => createTile(TileSuit.Wan, (i % 9) + 1, i));
      const fans = [createFan('清一色', 24)];
      const godTiles = [
        createGodTile('白板创世', [
          { name: '纯净之心', description: '清一色番型额外+8番' },
        ]),
      ];

      const result = Scoring.calculateScore(hand, fans, godTiles);
      expect(result.multModifiers).toHaveLength(1);

      // Test when condition is not met
      const fansWithoutFlush = [createFan('胡牌', 1)];
      const resultWithoutFlush = Scoring.calculateScore(hand, fansWithoutFlush, godTiles);
      expect(resultWithoutFlush.multModifiers).toHaveLength(0);
    });

    test('should apply multiple god tile effects', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const fans = [createFan('胡牌', 1)];
      const godTiles = [
        createGodTile('财神一万', [
          { name: '招财', description: '每次胡牌额外获得1金币' },
        ]),
        createGodTile('万中之王', [
          { name: '王者之威', description: '所有番型+3番' },
        ]),
      ];

      const result = Scoring.calculateScore(hand, fans, godTiles);

      expect(result.chipModifiers).toHaveLength(1);
      expect(result.multModifiers).toHaveLength(1);
      expect(result.totalChips).toBe(28); // 10 + 8 (terminal) + 10
      expect(result.totalMult).toBe(5); // 1 + 1 + 3
      expect(result.finalScore).toBe(140);
    });

    test('should handle 老头称王 effect with terminal fans', () => {
      const hand = Array(14).fill(null).map((_, i) => createTile(TileSuit.Wan, i % 2 === 0 ? 1 : 9, i));
      const fans = [createFan('混老头', 8)];
      const godTiles = [
        createGodTile('九万霸主', [
          { name: '老头称王', description: '1、9牌的番型+2番' },
        ]),
      ];

      const result = Scoring.calculateScore(hand, fans, godTiles);

      expect(result.multModifiers).toHaveLength(1);
      expect(result.multModifiers[0].multAdded).toBe(2);
    });

    test('should handle 龙之力 effect with straight fan', () => {
      const hand = Array(9).fill(null).map((_, i) => createTile(TileSuit.Tiao, i + 1, 0));
      const fans = [createFan('一气通贯', 2)];
      const godTiles = [
        createGodTile('一条龙神', [
          { name: '龙之力', description: '一气通贯番型+4番' },
        ]),
      ];

      const result = Scoring.calculateScore(hand, fans, godTiles);

      expect(result.multModifiers).toHaveLength(1);
      expect(result.multModifiers[0].multAdded).toBe(4);
    });

    test('should handle 聚宝盆 effect with pongs', () => {
      const hand = Array(12).fill(null).map((_, i) => createTile(TileSuit.Wan, 1 + Math.floor(i / 3), i));
      const fans = [createFan('对对和', 6)];
      const godTiles = [
        createGodTile('五筒聚宝', [
          { name: '聚宝盆', description: '每个刻子额外获得1金币' },
        ]),
      ];

      const result = Scoring.calculateScore(hand, fans, godTiles);

      expect(result.chipModifiers).toHaveLength(1);
      expect(result.chipModifiers[0].chipsAdded).toBe(20);
    });
  });

  describe('Score breakdown structure', () => {
    test('should return complete breakdown structure', () => {
      const hand = [
        createTile(TileSuit.Wan, 1, 0),
        createTile(TileSuit.Wind, 1, 0),
      ];
      const fans = [createFan('胡牌', 1)];
      const godTiles = [
        createGodTile('财神一万', [
          { name: '招财', description: '每次胡牌额外获得1金币' },
        ]),
      ];

      const result = Scoring.calculateScore(hand, fans, godTiles);

      expect(result).toHaveProperty('hand');
      expect(result).toHaveProperty('detectedFans');
      expect(result).toHaveProperty('activeGodTiles');
      expect(result).toHaveProperty('fanContributions');
      expect(result).toHaveProperty('baseChips');
      expect(result).toHaveProperty('baseMult');
      expect(result).toHaveProperty('tileChipContributions');
      expect(result).toHaveProperty('bonusChips');
      expect(result).toHaveProperty('chipModifiers');
      expect(result).toHaveProperty('multModifiers');
      expect(result).toHaveProperty('totalChips');
      expect(result).toHaveProperty('totalMult');
      expect(result).toHaveProperty('finalScore');

      expect(result.hand).toEqual(hand);
      expect(result.detectedFans).toEqual(fans);
      expect(result.activeGodTiles).toEqual(godTiles);
    });

    test('should provide detailed tile chip contributions', () => {
      const hand = [
        createTile(TileSuit.Wan, 1, 0),
        createTile(TileSuit.Wan, 5, 0),
        createTile(TileSuit.Wind, 1, 0),
      ];
      const fans = [createFan('胡牌', 1)];

      const result = Scoring.calculateScore(hand, fans);

      expect(result.tileChipContributions).toHaveLength(3);
      expect(result.tileChipContributions[0].tile).toEqual(hand[0]);
      expect(result.tileChipContributions[0].chips).toBe(8);
      expect(result.tileChipContributions[0].reason).toBe('terminal tile');
      expect(result.tileChipContributions[1].chips).toBe(5);
      expect(result.tileChipContributions[1].reason).toBe('number tile');
      expect(result.tileChipContributions[2].chips).toBe(10);
      expect(result.tileChipContributions[2].reason).toBe('honor tile');
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
      expect(formatted).toContain('[ Tiles ]');
      expect(formatted).toContain('terminal tile');
      expect(formatted).toContain('[ Final Score ]');
    });

    test('should include god tile effects in formatted output', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const fans = [createFan('胡牌', 1)];
      const godTiles = [
        createGodTile('财神一万', [
          { name: '招财', description: '每次胡牌额外获得1金币' },
        ]),
      ];

      const result = Scoring.calculateScore(hand, fans, godTiles);
      const formatted = Scoring.formatScoreBreakdown(result);

      expect(formatted).toContain('[ God Tile Effects ]');
      expect(formatted).toContain('财神一万');
      expect(formatted).toContain('+10 chips');
    });
  });

  describe('Edge cases', () => {
    test('should handle empty fans array', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const fans: Fan[] = [];

      const result = Scoring.calculateScore(hand, fans);

      expect(result.baseChips).toBe(0);
      expect(result.baseMult).toBe(1);
      expect(result.bonusChips).toBe(8);
      expect(result.finalScore).toBe(8);
    });

    test('should handle empty god tiles array', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const fans = [createFan('胡牌', 1)];

      const result = Scoring.calculateScore(hand, fans, []);

      expect(result.chipModifiers).toHaveLength(0);
      expect(result.multModifiers).toHaveLength(0);
    });

    test('should handle custom chip values', () => {
      const hand = [
        createTile(TileSuit.Wan, 1, 0),
        createTile(TileSuit.Wind, 1, 0),
      ];
      const fans = [createFan('胡牌', 1)];

      const result = Scoring.calculateScore(hand, fans, [], {
        baseChipsPerTile: 10,
        baseChipsPerHonorTile: 20,
        baseChipsPerTerminalTile: 15,
      });

      expect(result.bonusChips).toBe(35); // 15 (terminal) + 20 (honor)
    });

    test('should ensure minimum mult of 1', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const fans: Fan[] = [];

      const result = Scoring.calculateScore(hand, fans);

      expect(result.baseMult).toBe(1);
      expect(result.totalMult).toBe(1);
    });

    test('should floor final score to integer', () => {
      const hand = [createTile(TileSuit.Wan, 1, 0)];
      const fans = [createFan('平和', 2)];

      const result = Scoring.calculateScore(hand, fans);

      expect(Number.isInteger(result.finalScore)).toBe(true);
    });
  });

  describe('Complex scenarios', () => {
    test('should handle multiple fans and god tiles together', () => {
      const hand = Array(14).fill(null).map((_, i) => createTile(TileSuit.Wan, (i % 9) + 1, i));
      const fans = [
        createFan('平和', 2),
        createFan('清一色', 24),
      ];
      const godTiles = [
        createGodTile('财神一万', [
          { name: '招财', description: '每次胡牌额外获得1金币' },
        ]),
        createGodTile('白板创世', [
          { name: '纯净之心', description: '清一色番型额外+8番' },
        ]),
        createGodTile('发财神牌', [
          { name: '发财致富', description: '胡牌金币奖励翻倍' },
        ]),
      ];

      const result = Scoring.calculateScore(hand, fans, godTiles);

      expect(result.baseChips).toBe(120); // 20 + 100
      expect(result.baseMult).toBe(11); // 1 + 2 + 8
      expect(result.bonusChips).toBe(79); // Same as before: tiles 1,2,3,4,5,6,7,8,9,1,2,3,4,5
      expect(result.chipModifiers).toHaveLength(1);
      expect(result.multModifiers).toHaveLength(2);

      // totalChips = 120 + 79 + 10 = 209
      expect(result.totalChips).toBe(209);

      // totalMult = (11 × 2) + 8 = 30
      expect(result.totalMult).toBe(30);

      // finalScore = 209 × 30 = 6270
      expect(result.finalScore).toBe(6270);
    });

    test('should handle yakuman (88 points)', () => {
      const hand = Array(14).fill(null).map((_, i) => createTile(TileSuit.Wan, (i % 9) + 1, i));
      const fans = [createFan('国士无双', 88)];

      const result = Scoring.calculateScore(hand, fans);

      expect(result.baseChips).toBe(500);
      expect(result.baseMult).toBe(21); // 1 + 20
      expect(result.finalScore).toBeGreaterThan(10000);
    });
  });
});
