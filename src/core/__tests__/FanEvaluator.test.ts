import { TileSuit, WindValue, DragonValue, type Tile, type TileValue } from '../Tile';
import { FanEvaluator, type EvaluationResult } from '../FanEvaluator';

// ─── Test infrastructure ────────────────────────────────────────────────────

class TestRunner {
  private passedTests = 0;
  private failedTests = 0;
  private currentGroup = '';

  group(name: string) {
    this.currentGroup = name;
    console.log(`\n── ${name} ──`);
  }

  test(name: string, testFn: () => void) {
    try {
      testFn();
      console.log(`  ✅ ${name}`);
      this.passedTests++;
    } catch (error) {
      console.error(`  ❌ ${name}: ${error instanceof Error ? error.message : error}`);
      this.failedTests++;
    }
  }

  assert(condition: boolean, message: string) {
    if (!condition) throw new Error(message);
  }

  assertEqual<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  assertIncludes(arr: string[], value: string, message?: string) {
    if (!arr.includes(value)) {
      throw new Error(message || `Expected array to include "${value}", got [${arr.join(', ')}]`);
    }
  }

  assertNotIncludes(arr: string[], value: string, message?: string) {
    if (arr.includes(value)) {
      throw new Error(message || `Expected array NOT to include "${value}", got [${arr.join(', ')}]`);
    }
  }

  summary() {
    const total = this.passedTests + this.failedTests;
    console.log(`\n📊 FanEvaluator Test Summary: ${this.passedTests}/${total} passed`);
    if (this.failedTests > 0) {
      console.log(`🚨 ${this.failedTests} tests failed!`);
    } else {
      console.log('🎉 All tests passed!');
    }
    return this.failedTests === 0;
  }
}

// ─── Tile builder helpers ───────────────────────────────────────────────────

let _copyIdx = 0;

/** Create a tile with auto-incrementing copy index. */
function t(suit: TileSuit, value: TileValue, displayName?: string): Tile {
  const idx = _copyIdx++;
  const name = displayName ?? `${value}`;
  return {
    id: `${suit}-${value}-${idx}`,
    suit,
    value,
    displayName: name,
  };
}

/** Shorthand: create a wan tile. */
function wan(v: 1|2|3|4|5|6|7|8|9): Tile { return t(TileSuit.Wan, v, `${v}万`); }

/** Shorthand: create a tiao tile. */
function tiao(v: 1|2|3|4|5|6|7|8|9): Tile { return t(TileSuit.Tiao, v, `${v}条`); }

/** Shorthand: create a tong tile. */
function tong(v: 1|2|3|4|5|6|7|8|9): Tile { return t(TileSuit.Tong, v, `${v}筒`); }

/** Shorthand: create a wind tile. */
function wind(v: WindValue): Tile {
  const names = { [WindValue.East]: '东风', [WindValue.South]: '南风', [WindValue.West]: '西风', [WindValue.North]: '北风' };
  return t(TileSuit.Wind, v, names[v]);
}

/** Shorthand: create a dragon tile. */
function dragon(v: DragonValue): Tile {
  const names = { [DragonValue.Red]: '红中', [DragonValue.Green]: '发财', [DragonValue.White]: '白板' };
  return t(TileSuit.Dragon, v, names[v]);
}

/** Create N copies of the same tile type. */
function copies(n: number, factory: () => Tile): Tile[] {
  return Array.from({ length: n }, () => factory());
}

/** Get fan names from evaluation result. */
function fanNames(result: EvaluationResult): string[] {
  return result.fans.map(f => f.name);
}

// ─── Test suites ────────────────────────────────────────────────────────────

function runTests() {
  _copyIdx = 0;
  const test = new TestRunner();

  // ════════════════════════════════════════════════════════════════════════
  test.group('Edge cases & validation');
  // ════════════════════════════════════════════════════════════════════════

  test.test('Empty hand is not winning', () => {
    const result = FanEvaluator.evaluateHand([]);
    test.assertEqual(result.isWinning, false);
    test.assertEqual(result.fans.length, 0);
    test.assertEqual(result.totalPoints, 0);
    test.assertEqual(result.decomposition, null);
  });

  test.test('13 tiles (one short) is not winning', () => {
    const tiles = [
      wan(1), wan(2), wan(3),
      wan(4), wan(5), wan(6),
      wan(7), wan(8), wan(9),
      tiao(1), tiao(1), tiao(1),
      tiao(2),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, false);
  });

  test.test('15 tiles (too many) is not winning', () => {
    const tiles = [
      wan(1), wan(2), wan(3),
      wan(4), wan(5), wan(6),
      wan(7), wan(8), wan(9),
      tiao(1), tiao(1), tiao(1),
      tiao(2), tiao(2), tiao(3),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, false);
  });

  test.test('14 random non-winning tiles', () => {
    const tiles = [
      wan(1), wan(3), wan(5),
      tiao(2), tiao(4), tiao(6),
      tong(1), tong(3), tong(7),
      wind(WindValue.East), wind(WindValue.South),
      dragon(DragonValue.Red), dragon(DragonValue.Green), dragon(DragonValue.White),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, false);
  });

  test.test('isWinningHand returns false for non-14 tiles', () => {
    test.assertEqual(FanEvaluator.isWinningHand([]), false);
    test.assertEqual(FanEvaluator.isWinningHand([wan(1)]), false);
  });

  // ════════════════════════════════════════════════════════════════════════
  test.group('Chicken Hand (鸡胡)');
  // ════════════════════════════════════════════════════════════════════════

  test.test('Basic winning hand with mixed suits and no special pattern → Chicken Hand', () => {
    // 123万 456条 789筒 东东东 南南
    const tiles = [
      wan(1), wan(2), wan(3),
      tiao(4), tiao(5), tiao(6),
      tong(7), tong(8), tong(9),
      wind(WindValue.East), wind(WindValue.East), wind(WindValue.East),
      wind(WindValue.South), wind(WindValue.South),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '胡牌');
    // Should NOT have any other pattern fan
    test.assertEqual(result.fans.length, 1);
    test.assertEqual(result.totalPoints, 1);
  });

  test.test('Chicken Hand: chows from different suits + honor pong + number pair', () => {
    // 123万 456筒 789条 红中红中红中 5万5万
    const tiles = [
      wan(1), wan(2), wan(3),
      tong(4), tong(5), tong(6),
      tiao(7), tiao(8), tiao(9),
      dragon(DragonValue.Red), dragon(DragonValue.Red), dragon(DragonValue.Red),
      wan(5), wan(5),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '胡牌');
    test.assertEqual(result.fans.length, 1);
  });

  // ════════════════════════════════════════════════════════════════════════
  test.group('All Sequences (平和)');
  // ════════════════════════════════════════════════════════════════════════

  test.test('Four chows + pair in one suit → 平和 + 清一色', () => {
    // 123 234 345 678 + 99 all wan
    const tiles = [
      wan(1), wan(2), wan(3),
      wan(2), wan(3), wan(4),
      wan(3), wan(4), wan(5),
      wan(6), wan(7), wan(8),
      wan(9), wan(9),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '平和');
    test.assertIncludes(fanNames(result), '清一色');
  });

  test.test('Four chows in different suits → 平和 only (if no flush)', () => {
    // 123万 456万 123条 456条 + 1筒1筒
    const tiles = [
      wan(1), wan(2), wan(3),
      wan(4), wan(5), wan(6),
      tiao(1), tiao(2), tiao(3),
      tiao(4), tiao(5), tiao(6),
      tong(1), tong(1),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    // Should have 平和 but NOT flush patterns
    test.assertIncludes(fanNames(result), '平和');
    test.assertNotIncludes(fanNames(result), '清一色');
    test.assertNotIncludes(fanNames(result), '混一色');
  });

  // ════════════════════════════════════════════════════════════════════════
  test.group('All Triplets (对对胡)');
  // ════════════════════════════════════════════════════════════════════════

  test.test('Four pongs + pair → 对对胡', () => {
    // 111万 222条 333筒 东东东 南南
    const tiles = [
      wan(1), wan(1), wan(1),
      tiao(2), tiao(2), tiao(2),
      tong(3), tong(3), tong(3),
      wind(WindValue.East), wind(WindValue.East), wind(WindValue.East),
      wind(WindValue.South), wind(WindValue.South),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '对对和');
  });

  test.test('All triplets in one suit → 对对胡 + 清一色', () => {
    // 111 222 333 999 + 55 all wan
    const tiles = [
      wan(1), wan(1), wan(1),
      wan(2), wan(2), wan(2),
      wan(3), wan(3), wan(3),
      wan(9), wan(9), wan(9),
      wan(5), wan(5),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '对对和');
    test.assertIncludes(fanNames(result), '清一色');
  });

  test.test('All triplets with honors → 对对胡 + 混一色', () => {
    // 111万 999万 东东东 红中红中红中 + 5万5万
    const tiles = [
      wan(1), wan(1), wan(1),
      wan(9), wan(9), wan(9),
      wind(WindValue.East), wind(WindValue.East), wind(WindValue.East),
      dragon(DragonValue.Red), dragon(DragonValue.Red), dragon(DragonValue.Red),
      wan(5), wan(5),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '对对和');
    test.assertIncludes(fanNames(result), '混一色');
  });

  // ════════════════════════════════════════════════════════════════════════
  test.group('Half Flush (混一色)');
  // ════════════════════════════════════════════════════════════════════════

  test.test('One suit + honors → 混一色', () => {
    // 123万 456万 789万 东东东 南南
    const tiles = [
      wan(1), wan(2), wan(3),
      wan(4), wan(5), wan(6),
      wan(7), wan(8), wan(9),
      wind(WindValue.East), wind(WindValue.East), wind(WindValue.East),
      wind(WindValue.South), wind(WindValue.South),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '混一色');
    test.assertNotIncludes(fanNames(result), '清一色');
  });

  test.test('Mixed one suit with dragon pair → 混一色', () => {
    // 123条 456条 789条 红中红中红中 白板白板
    const tiles = [
      tiao(1), tiao(2), tiao(3),
      tiao(4), tiao(5), tiao(6),
      tiao(7), tiao(8), tiao(9),
      dragon(DragonValue.Red), dragon(DragonValue.Red), dragon(DragonValue.Red),
      dragon(DragonValue.White), dragon(DragonValue.White),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '混一色');
  });

  // ════════════════════════════════════════════════════════════════════════
  test.group('Full Flush (清一色)');
  // ════════════════════════════════════════════════════════════════════════

  test.test('All wan tiles → 清一色', () => {
    // 123 456 789 111 + 55 all wan
    const tiles = [
      wan(1), wan(2), wan(3),
      wan(4), wan(5), wan(6),
      wan(7), wan(8), wan(9),
      wan(1), wan(1), wan(1),
      wan(5), wan(5),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '清一色');
    test.assertNotIncludes(fanNames(result), '混一色');
  });

  test.test('All tong tiles → 清一色', () => {
    // 123 456 789 999 + 55 all tong
    const tiles = [
      tong(1), tong(2), tong(3),
      tong(4), tong(5), tong(6),
      tong(7), tong(8), tong(9),
      tong(9), tong(9), tong(9),
      tong(5), tong(5),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '清一色');
  });

  test.test('Full flush should NOT match half flush', () => {
    const tiles = [
      tiao(1), tiao(2), tiao(3),
      tiao(4), tiao(5), tiao(6),
      tiao(7), tiao(8), tiao(9),
      tiao(1), tiao(1), tiao(1),
      tiao(5), tiao(5),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertNotIncludes(fanNames(result), '混一色');
    test.assertIncludes(fanNames(result), '清一色');
  });

  // ════════════════════════════════════════════════════════════════════════
  test.group('Seven Pairs (七对)');
  // ════════════════════════════════════════════════════════════════════════

  test.test('Seven distinct pairs → 七对', () => {
    const tiles = [
      wan(1), wan(1),
      wan(3), wan(3),
      tiao(5), tiao(5),
      tong(7), tong(7),
      tong(9), tong(9),
      wind(WindValue.East), wind(WindValue.East),
      dragon(DragonValue.Red), dragon(DragonValue.Red),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '七对');
  });

  test.test('Seven pairs all in one suit → 七对 + 清一色', () => {
    const tiles = [
      wan(1), wan(1),
      wan(2), wan(2),
      wan(3), wan(3),
      wan(5), wan(5),
      wan(6), wan(6),
      wan(8), wan(8),
      wan(9), wan(9),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '七对');
    test.assertIncludes(fanNames(result), '清一色');
  });

  test.test('Seven pairs with one suit + honors → 七对 + 混一色', () => {
    const tiles = [
      wan(1), wan(1),
      wan(3), wan(3),
      wan(5), wan(5),
      wan(7), wan(7),
      wan(9), wan(9),
      wind(WindValue.East), wind(WindValue.East),
      dragon(DragonValue.Red), dragon(DragonValue.Red),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '七对');
    test.assertIncludes(fanNames(result), '混一色');
  });

  test.test('Seven pairs all honors → 七对 + 字一色', () => {
    const tiles = [
      wind(WindValue.East), wind(WindValue.East),
      wind(WindValue.South), wind(WindValue.South),
      wind(WindValue.West), wind(WindValue.West),
      wind(WindValue.North), wind(WindValue.North),
      dragon(DragonValue.Red), dragon(DragonValue.Red),
      dragon(DragonValue.Green), dragon(DragonValue.Green),
      dragon(DragonValue.White), dragon(DragonValue.White),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '七对');
    test.assertIncludes(fanNames(result), '字一色');
  });

  test.test('Not seven pairs if 4 of a kind (only 6 distinct types)', () => {
    // 4x wan1 + 6 other pairs = only 6 distinct types with freq [4,2,2,2,2,2]
    const tiles = [
      wan(1), wan(1), wan(1), wan(1),
      wan(3), wan(3),
      wan(5), wan(5),
      wan(7), wan(7),
      wan(8), wan(8),
      wan(9), wan(9),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    // This is NOT seven pairs (only 6 distinct types), but may be a valid standard hand
    // Check that 七对 is NOT detected
    if (result.isWinning) {
      test.assertNotIncludes(fanNames(result), '七对');
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  test.group('Thirteen Orphans (国士无双)');
  // ════════════════════════════════════════════════════════════════════════

  test.test('Valid thirteen orphans with pair on 1万', () => {
    const tiles = [
      wan(1), wan(1),  // pair
      wan(9),
      tiao(1), tiao(9),
      tong(1), tong(9),
      wind(WindValue.East), wind(WindValue.South), wind(WindValue.West), wind(WindValue.North),
      dragon(DragonValue.Red), dragon(DragonValue.Green), dragon(DragonValue.White),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '国士无双');
    test.assertEqual(result.decomposition?.form, 'thirteen_orphans');
  });

  test.test('Valid thirteen orphans with pair on dragon', () => {
    const tiles = [
      wan(1), wan(9),
      tiao(1), tiao(9),
      tong(1), tong(9),
      wind(WindValue.East), wind(WindValue.South), wind(WindValue.West), wind(WindValue.North),
      dragon(DragonValue.Red), dragon(DragonValue.Green),
      dragon(DragonValue.White), dragon(DragonValue.White),  // pair
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '国士无双');
  });

  test.test('Missing one terminal → NOT thirteen orphans', () => {
    // Missing tong(9), doubled tong(1) instead
    const tiles = [
      wan(1), wan(9),
      tiao(1), tiao(9),
      tong(1), tong(1),  // doubled 1筒 instead of 9筒
      wind(WindValue.East), wind(WindValue.South), wind(WindValue.West), wind(WindValue.North),
      dragon(DragonValue.Red), dragon(DragonValue.Green), dragon(DragonValue.White),
      wan(1),  // extra
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    // Should NOT be thirteen orphans (missing tong-9)
    if (result.isWinning) {
      test.assertNotIncludes(fanNames(result), '国士无双');
    }
  });

  test.test('Thirteen orphans points = 88', () => {
    const tiles = [
      wan(1), wan(9),
      tiao(1), tiao(9),
      tong(1), tong(9),
      wind(WindValue.East), wind(WindValue.South), wind(WindValue.West), wind(WindValue.North),
      dragon(DragonValue.Red), dragon(DragonValue.Red),  // pair
      dragon(DragonValue.Green), dragon(DragonValue.White),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.totalPoints, 88);
  });

  // ════════════════════════════════════════════════════════════════════════
  test.group('All Honors (字一色)');
  // ════════════════════════════════════════════════════════════════════════

  test.test('All honors with pongs → 字一色 + 对对和', () => {
    // 东东东 南南南 西西西 红中红中红中 白板白板
    const tiles = [
      wind(WindValue.East), wind(WindValue.East), wind(WindValue.East),
      wind(WindValue.South), wind(WindValue.South), wind(WindValue.South),
      wind(WindValue.West), wind(WindValue.West), wind(WindValue.West),
      dragon(DragonValue.Red), dragon(DragonValue.Red), dragon(DragonValue.Red),
      dragon(DragonValue.White), dragon(DragonValue.White),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '字一色');
    test.assertIncludes(fanNames(result), '对对和');
    // Should NOT also list 混一色
    test.assertNotIncludes(fanNames(result), '混一色');
  });

  // ════════════════════════════════════════════════════════════════════════
  test.group('Pattern stacking');
  // ════════════════════════════════════════════════════════════════════════

  test.test('对对胡 + 混一色 stack', () => {
    // 111万 999万 东东东 南南南 红中红中
    const tiles = [
      wan(1), wan(1), wan(1),
      wan(9), wan(9), wan(9),
      wind(WindValue.East), wind(WindValue.East), wind(WindValue.East),
      wind(WindValue.South), wind(WindValue.South), wind(WindValue.South),
      dragon(DragonValue.Red), dragon(DragonValue.Red),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '对对和');
    test.assertIncludes(fanNames(result), '混一色');
    test.assertEqual(result.totalPoints, 6 + 6); // 对对和(6) + 混一色(6) = 12
  });

  test.test('对对胡 + 清一色 stack', () => {
    // 111万 222万 333万 999万 55万
    const tiles = [
      wan(1), wan(1), wan(1),
      wan(2), wan(2), wan(2),
      wan(3), wan(3), wan(3),
      wan(9), wan(9), wan(9),
      wan(5), wan(5),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '对对和');
    test.assertIncludes(fanNames(result), '清一色');
    test.assertEqual(result.totalPoints, 6 + 24); // 对对和(6) + 清一色(24) = 30
  });

  test.test('平和 + 清一色 stack', () => {
    // 123 234 345 678 + 99 all wan
    const tiles = [
      wan(1), wan(2), wan(3),
      wan(2), wan(3), wan(4),
      wan(3), wan(4), wan(5),
      wan(6), wan(7), wan(8),
      wan(9), wan(9),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '平和');
    test.assertIncludes(fanNames(result), '清一色');
    test.assertEqual(result.totalPoints, 2 + 24); // 平和(2) + 清一色(24) = 26
  });

  test.test('平和 + 混一色 stack', () => {
    // This is tricky: 平和 requires all chows, but 混一色 requires honors.
    // Honor tiles can't form chows, so the only way is if the pair is honors.
    // 123万 456万 789万 123万 + 东东
    const tiles = [
      wan(1), wan(2), wan(3),
      wan(4), wan(5), wan(6),
      wan(7), wan(8), wan(9),
      wan(1), wan(2), wan(3),
      wind(WindValue.East), wind(WindValue.East),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '平和');
    test.assertIncludes(fanNames(result), '混一色');
  });

  test.test('字一色 + 对对胡 stack', () => {
    const tiles = [
      wind(WindValue.East), wind(WindValue.East), wind(WindValue.East),
      wind(WindValue.South), wind(WindValue.South), wind(WindValue.South),
      wind(WindValue.West), wind(WindValue.West), wind(WindValue.West),
      dragon(DragonValue.Red), dragon(DragonValue.Red), dragon(DragonValue.Red),
      dragon(DragonValue.Green), dragon(DragonValue.Green),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '字一色');
    test.assertIncludes(fanNames(result), '对对和');
    test.assertEqual(result.totalPoints, 64 + 6); // 字一色(64) + 对对和(6) = 70
  });

  // ════════════════════════════════════════════════════════════════════════
  test.group('Mutual exclusivity');
  // ════════════════════════════════════════════════════════════════════════

  test.test('清一色 excludes 混一色', () => {
    const tiles = [
      wan(1), wan(2), wan(3),
      wan(4), wan(5), wan(6),
      wan(7), wan(8), wan(9),
      wan(1), wan(1), wan(1),
      wan(5), wan(5),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertIncludes(fanNames(result), '清一色');
    test.assertNotIncludes(fanNames(result), '混一色');
  });

  test.test('字一色 excludes 混一色 and 清一色', () => {
    const tiles = [
      wind(WindValue.East), wind(WindValue.East), wind(WindValue.East),
      wind(WindValue.South), wind(WindValue.South), wind(WindValue.South),
      wind(WindValue.West), wind(WindValue.West), wind(WindValue.West),
      dragon(DragonValue.Red), dragon(DragonValue.Red), dragon(DragonValue.Red),
      dragon(DragonValue.White), dragon(DragonValue.White),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertNotIncludes(fanNames(result), '混一色');
    test.assertNotIncludes(fanNames(result), '清一色');
    test.assertIncludes(fanNames(result), '字一色');
  });

  test.test('Chicken hand has no other pattern fans', () => {
    // Mixed suits, chows + pong, no flush → 胡牌 only
    const tiles = [
      wan(1), wan(2), wan(3),
      tiao(4), tiao(5), tiao(6),
      tong(7), tong(8), tong(9),
      wan(7), wan(7), wan(7),
      tiao(1), tiao(1),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertEqual(result.fans.length, 1);
    test.assertIncludes(fanNames(result), '胡牌');
  });

  // ════════════════════════════════════════════════════════════════════════
  test.group('isWinningHand utility');
  // ════════════════════════════════════════════════════════════════════════

  test.test('isWinningHand returns true for valid standard hand', () => {
    const tiles = [
      wan(1), wan(2), wan(3),
      wan(4), wan(5), wan(6),
      tiao(1), tiao(2), tiao(3),
      tiao(4), tiao(5), tiao(6),
      tong(1), tong(1),
    ];
    test.assertEqual(FanEvaluator.isWinningHand(tiles), true);
  });

  test.test('isWinningHand returns true for seven pairs', () => {
    const tiles = [
      wan(1), wan(1),
      wan(2), wan(2),
      wan(3), wan(3),
      tiao(4), tiao(4),
      tong(5), tong(5),
      wind(WindValue.East), wind(WindValue.East),
      dragon(DragonValue.Red), dragon(DragonValue.Red),
    ];
    test.assertEqual(FanEvaluator.isWinningHand(tiles), true);
  });

  test.test('isWinningHand returns true for thirteen orphans', () => {
    const tiles = [
      wan(1), wan(9),
      tiao(1), tiao(9),
      tong(1), tong(9),
      wind(WindValue.East), wind(WindValue.South), wind(WindValue.West), wind(WindValue.North),
      dragon(DragonValue.Red), dragon(DragonValue.Green), dragon(DragonValue.White),
      wan(1), // pair
    ];
    test.assertEqual(FanEvaluator.isWinningHand(tiles), true);
  });

  test.test('isWinningHand returns false for invalid hand', () => {
    const tiles = [
      wan(1), wan(3), wan(5), wan(7),
      tiao(2), tiao(4), tiao(6), tiao(8),
      tong(1), tong(3), tong(5), tong(7),
      wind(WindValue.East), wind(WindValue.South),
    ];
    test.assertEqual(FanEvaluator.isWinningHand(tiles), false);
  });

  // ════════════════════════════════════════════════════════════════════════
  test.group('Decomposition correctness');
  // ════════════════════════════════════════════════════════════════════════

  test.test('Standard decomposition has 4 melds + 1 pair', () => {
    const tiles = [
      wan(1), wan(2), wan(3),
      wan(4), wan(5), wan(6),
      tiao(1), tiao(2), tiao(3),
      tiao(4), tiao(5), tiao(6),
      tong(1), tong(1),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertEqual(result.decomposition?.form, 'standard');
    test.assertEqual(result.decomposition?.melds.length, 4);
    test.assertEqual(result.decomposition?.pair.length, 2);
  });

  test.test('Seven pairs decomposition has form=seven_pairs', () => {
    const tiles = [
      wan(1), wan(1),
      wan(2), wan(2),
      wan(3), wan(3),
      wan(4), wan(4),
      wan(5), wan(5),
      wan(6), wan(6),
      wan(7), wan(7),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertEqual(result.decomposition?.form, 'seven_pairs');
  });

  test.test('Thirteen orphans decomposition has form=thirteen_orphans', () => {
    const tiles = [
      wan(1), wan(9),
      tiao(1), tiao(9),
      tong(1), tong(9),
      wind(WindValue.East), wind(WindValue.South), wind(WindValue.West), wind(WindValue.North),
      dragon(DragonValue.Red), dragon(DragonValue.Green), dragon(DragonValue.White),
      tong(9), // pair
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertEqual(result.decomposition?.form, 'thirteen_orphans');
  });

  // ════════════════════════════════════════════════════════════════════════
  test.group('Best decomposition selection');
  // ════════════════════════════════════════════════════════════════════════

  test.test('Evaluator picks highest-scoring decomposition', () => {
    // Hand: 111 222 333 万 + 123万 + 55万
    // Can be decomposed as:
    //   a) 3 pongs + 1 chow + pair → 胡牌 + 清一色 = 25 points (no 对对和 because one chow)
    //   b) 4 chows + pair (123,123,123,123 with 55) — wait, let's think...
    //   Actually 111,222,333,123 + 55 = 3 pongs + 1 chow: not 对对和, not 平和
    //   Or 123,123,123 + 1 leftover... no that doesn't work with the pair
    // Let's use a hand where decomposition choice matters:
    // 111222333 万 can be read as 3 pongs (111,222,333) or 3 chows (123,123,123)
    // Add 789万 + 55万 = standard winning hand
    const tiles = [
      wan(1), wan(1), wan(1),
      wan(2), wan(2), wan(2),
      wan(3), wan(3), wan(3),
      wan(7), wan(8), wan(9),
      wan(5), wan(5),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    // The evaluator should pick the decomposition with higher points.
    // Pong reading: 对对和(6) is impossible (only 3 pongs + 1 chow)
    // So: if 3 pongs + 1 chow → 清一色(24) + 胡牌? No, 清一色 replaces chicken.
    // Either way the total will include 清一色(24).
    test.assertIncludes(fanNames(result), '清一色');
    test.assert(result.totalPoints >= 24, 'Should have at least 24 points from 清一色');
  });

  // ════════════════════════════════════════════════════════════════════════
  test.group('Complex / realistic hands');
  // ════════════════════════════════════════════════════════════════════════

  test.test('Tiao flush with chows → 平和 + 清一色', () => {
    // 123 345 567 789 + 11 all tiao
    const tiles = [
      tiao(1), tiao(2), tiao(3),
      tiao(3), tiao(4), tiao(5),
      tiao(5), tiao(6), tiao(7),
      tiao(7), tiao(8), tiao(9),
      tiao(1), tiao(1),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '清一色');
    // Check if 平和 also detected (all chows)
    test.assertIncludes(fanNames(result), '平和');
  });

  test.test('Mix of chows and pongs with two suits → Chicken Hand', () => {
    // 123万 456条 777万 888条 + 5筒5筒
    const tiles = [
      wan(1), wan(2), wan(3),
      tiao(4), tiao(5), tiao(6),
      wan(7), wan(7), wan(7),
      tiao(8), tiao(8), tiao(8),
      tong(5), tong(5),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '胡牌');
    test.assertEqual(result.fans.length, 1);
  });

  test.test('All pongs with all honor tiles → 字一色 + 对对胡', () => {
    const tiles = [
      wind(WindValue.East), wind(WindValue.East), wind(WindValue.East),
      wind(WindValue.South), wind(WindValue.South), wind(WindValue.South),
      wind(WindValue.North), wind(WindValue.North), wind(WindValue.North),
      dragon(DragonValue.Green), dragon(DragonValue.Green), dragon(DragonValue.Green),
      dragon(DragonValue.White), dragon(DragonValue.White),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    test.assertIncludes(fanNames(result), '字一色');
    test.assertIncludes(fanNames(result), '对对和');
  });

  // ════════════════════════════════════════════════════════════════════════
  test.group('Fan point values from data');
  // ════════════════════════════════════════════════════════════════════════

  test.test('胡牌 = 1 point', () => {
    const tiles = [
      wan(1), wan(2), wan(3),
      tiao(4), tiao(5), tiao(6),
      tong(7), tong(8), tong(9),
      wan(7), wan(7), wan(7),
      tiao(1), tiao(1),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    const hu = result.fans.find(f => f.name === '胡牌');
    test.assert(hu !== undefined, '胡牌 should be present');
    test.assertEqual(hu!.points, 1);
  });

  test.test('平和 = 2 points', () => {
    const tiles = [
      wan(1), wan(2), wan(3),
      wan(4), wan(5), wan(6),
      tiao(1), tiao(2), tiao(3),
      tiao(4), tiao(5), tiao(6),
      tong(1), tong(1),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    const pinghu = result.fans.find(f => f.name === '平和');
    test.assert(pinghu !== undefined, '平和 should be present');
    test.assertEqual(pinghu!.points, 2);
  });

  test.test('七对 = 4 points', () => {
    const tiles = [
      wan(1), wan(1),
      wan(3), wan(3),
      tiao(5), tiao(5),
      tong(7), tong(7),
      tong(9), tong(9),
      wind(WindValue.East), wind(WindValue.East),
      dragon(DragonValue.Red), dragon(DragonValue.Red),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    const qidui = result.fans.find(f => f.name === '七对');
    test.assert(qidui !== undefined, '七对 should be present');
    test.assertEqual(qidui!.points, 4);
  });

  test.test('对对和 = 6 points', () => {
    const tiles = [
      wan(1), wan(1), wan(1),
      tiao(2), tiao(2), tiao(2),
      tong(3), tong(3), tong(3),
      wind(WindValue.East), wind(WindValue.East), wind(WindValue.East),
      wind(WindValue.South), wind(WindValue.South),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    const duidui = result.fans.find(f => f.name === '对对和');
    test.assert(duidui !== undefined, '对对和 should be present');
    test.assertEqual(duidui!.points, 6);
  });

  test.test('混一色 = 6 points', () => {
    const tiles = [
      wan(1), wan(2), wan(3),
      wan(4), wan(5), wan(6),
      wan(7), wan(8), wan(9),
      wind(WindValue.East), wind(WindValue.East), wind(WindValue.East),
      wind(WindValue.South), wind(WindValue.South),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    const hunyi = result.fans.find(f => f.name === '混一色');
    test.assert(hunyi !== undefined, '混一色 should be present');
    test.assertEqual(hunyi!.points, 6);
  });

  test.test('清一色 = 24 points', () => {
    const tiles = [
      wan(1), wan(2), wan(3),
      wan(4), wan(5), wan(6),
      wan(7), wan(8), wan(9),
      wan(1), wan(1), wan(1),
      wan(5), wan(5),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    const qingyi = result.fans.find(f => f.name === '清一色');
    test.assert(qingyi !== undefined, '清一色 should be present');
    test.assertEqual(qingyi!.points, 24);
  });

  test.test('国士无双 = 88 points', () => {
    const tiles = [
      wan(1), wan(9),
      tiao(1), tiao(9),
      tong(1), tong(9),
      wind(WindValue.East), wind(WindValue.South), wind(WindValue.West), wind(WindValue.North),
      dragon(DragonValue.Red), dragon(DragonValue.Green), dragon(DragonValue.White),
      wan(1),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    const kokushi = result.fans.find(f => f.name === '国士无双');
    test.assert(kokushi !== undefined, '国士无双 should be present');
    test.assertEqual(kokushi!.points, 88);
  });

  test.test('字一色 = 64 points', () => {
    const tiles = [
      wind(WindValue.East), wind(WindValue.East), wind(WindValue.East),
      wind(WindValue.South), wind(WindValue.South), wind(WindValue.South),
      wind(WindValue.West), wind(WindValue.West), wind(WindValue.West),
      dragon(DragonValue.Red), dragon(DragonValue.Red), dragon(DragonValue.Red),
      dragon(DragonValue.White), dragon(DragonValue.White),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    const ziyi = result.fans.find(f => f.name === '字一色');
    test.assert(ziyi !== undefined, '字一色 should be present');
    test.assertEqual(ziyi!.points, 64);
  });

  // ════════════════════════════════════════════════════════════════════════
  test.group('Ambiguous decompositions');
  // ════════════════════════════════════════════════════════════════════════

  test.test('111222333 can be read as 3 pongs or 3 chows — best decomposition wins', () => {
    // 111222333万 + 456条 + 99筒
    // Pong reading: 111,222,333万 + 456条 → 3 pongs + 1 chow → 混一色? No, multi-suit → 胡牌(1)
    // Chow reading: 123,123,123万 + 456条 → 4 chows → 平和(2)
    // The evaluator should pick 平和(2) as higher scoring
    const tiles = [
      wan(1), wan(1), wan(1),
      wan(2), wan(2), wan(2),
      wan(3), wan(3), wan(3),
      tiao(4), tiao(5), tiao(6),
      tong(9), tong(9),
    ];
    const result = FanEvaluator.evaluateHand(tiles);
    test.assertEqual(result.isWinning, true);
    // Best decomposition should be 平和
    test.assertIncludes(fanNames(result), '平和');
    test.assertEqual(result.totalPoints, 2);
  });

  // Print summary
  const allPassed = test.summary();
  return allPassed;
}

// Auto-run when executed directly via tsx / node
// @ts-ignore — Node globals not typed in this project's tsconfig
if (typeof process !== 'undefined' && process.argv?.[1]?.includes('FanEvaluator')) {
  console.log('🧪 Running FanEvaluator Tests...\n');
  const passed = runTests();
  // @ts-ignore
  process.exit(passed ? 0 : 1);
}

export { runTests };
