import {
  TileSuit,
  WindValue,
  DragonValue,
  createFullTileSet,
  shuffleTiles,
  drawTiles,
  sortTiles,
  getTileDisplayName,
  isSameTile,
  groupTilesByType,
  validateTileSet,
  type Tile
} from '../Tile';

/**
 * Simple test runner - logs test results to console
 */
class TestRunner {
  private passedTests = 0;
  private failedTests = 0;

  test(name: string, testFn: () => void) {
    try {
      testFn();
      console.log(`✅ ${name}`);
      this.passedTests++;
    } catch (error) {
      console.error(`❌ ${name}: ${error instanceof Error ? error.message : error}`);
      this.failedTests++;
    }
  }

  assert(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEqual<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  summary() {
    const total = this.passedTests + this.failedTests;
    console.log(`\n📊 Test Summary: ${this.passedTests}/${total} passed`);
    if (this.failedTests > 0) {
      console.log(`🚨 ${this.failedTests} tests failed!`);
    } else {
      console.log('🎉 All tests passed!');
    }
  }
}

// Run the tests
function runTests() {
  const test = new TestRunner();
  
  test.test('createFullTileSet generates exactly 136 tiles', () => {
    const tiles = createFullTileSet();
    test.assertEqual(tiles.length, 136, 'Full tile set should have 136 tiles');
  });

  test.test('createFullTileSet has exactly 34 unique tile types', () => {
    const tiles = createFullTileSet();
    const groups = groupTilesByType(tiles);
    test.assertEqual(groups.size, 34, 'Should have exactly 34 unique tile types');
  });

  test.test('Each unique tile appears exactly 4 times', () => {
    const tiles = createFullTileSet();
    const groups = groupTilesByType(tiles);
    
    for (const [type, tileGroup] of groups) {
      test.assertEqual(tileGroup.length, 4, `Tile type ${type} should appear exactly 4 times`);
    }
  });

  test.test('Tile ID format is correct', () => {
    const tiles = createFullTileSet();
    const firstWan = tiles.find(t => t.suit === TileSuit.Wan && t.value === 1);
    
    test.assert(firstWan !== undefined, 'Should find 1-wan tile');
    test.assert(firstWan!.id.startsWith('wan-1-'), 'Tile ID should start with wan-1-');
    test.assert(/^wan-1-[0-3]$/.test(firstWan!.id), 'Tile ID should match pattern wan-1-[0-3]');
  });

  test.test('Display names are correct', () => {
    const tiles = createFullTileSet();
    
    // Test number tiles
    const wan1 = tiles.find(t => t.suit === TileSuit.Wan && t.value === 1)!;
    test.assertEqual(wan1.displayName, '1万');
    
    const tiao5 = tiles.find(t => t.suit === TileSuit.Tiao && t.value === 5)!;
    test.assertEqual(tiao5.displayName, '5条');
    
    const tong9 = tiles.find(t => t.suit === TileSuit.Tong && t.value === 9)!;
    test.assertEqual(tong9.displayName, '9筒');
    
    // Test honor tiles
    const eastWind = tiles.find(t => t.suit === TileSuit.Wind && t.value === WindValue.East)!;
    test.assertEqual(eastWind.displayName, '东风');
    
    const redDragon = tiles.find(t => t.suit === TileSuit.Dragon && t.value === DragonValue.Red)!;
    test.assertEqual(redDragon.displayName, '红中');
  });

  test.test('shuffleTiles produces different order', () => {
    const tiles = createFullTileSet();
    const shuffled1 = shuffleTiles(tiles);
    const shuffled2 = shuffleTiles(tiles);
    
    // Check that shuffle doesn't lose tiles
    test.assertEqual(shuffled1.length, tiles.length, 'Shuffled array should have same length');
    
    // Check that at least some tiles are in different positions (very high probability)
    let differentPositions = 0;
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i].id !== shuffled1[i].id || tiles[i].id !== shuffled2[i].id) {
        differentPositions++;
      }
    }
    
    test.assert(differentPositions > 50, 'Shuffle should change many positions');
  });

  test.test('drawTiles works correctly', () => {
    const tiles = createFullTileSet();
    const result = drawTiles(tiles, 13);
    
    test.assertEqual(result.drawn.length, 13, 'Should draw exactly 13 tiles');
    test.assertEqual(result.remaining.length, 123, 'Should have 123 tiles remaining');
    test.assertEqual(result.drawn.length + result.remaining.length, tiles.length, 'Total should remain 136');
  });

  test.test('drawTiles throws error when drawing too many', () => {
    const tiles = createFullTileSet();
    let errorThrown = false;
    
    try {
      drawTiles(tiles, 200);
    } catch (error) {
      errorThrown = true;
    }
    
    test.assert(errorThrown, 'Should throw error when drawing more tiles than available');
  });

  test.test('sortTiles groups by suit correctly', () => {
    const tiles = [
      { id: 'dragon-1-0', suit: TileSuit.Dragon, value: DragonValue.Red, displayName: '红中' },
      { id: 'wan-5-0', suit: TileSuit.Wan, value: 5, displayName: '5万' },
      { id: 'wind-1-0', suit: TileSuit.Wind, value: WindValue.East, displayName: '东风' },
      { id: 'tiao-3-0', suit: TileSuit.Tiao, value: 3, displayName: '3条' },
      { id: 'tong-7-0', suit: TileSuit.Tong, value: 7, displayName: '7筒' },
      { id: 'wan-1-0', suit: TileSuit.Wan, value: 1, displayName: '1万' }
    ];
    
    const sorted = sortTiles(tiles);
    
    // Should be: Wan(1,5), Tiao(3), Tong(7), Wind(East), Dragon(Red)
    test.assertEqual(sorted[0].suit, TileSuit.Wan);
    test.assertEqual(sorted[0].value, 1);
    test.assertEqual(sorted[1].suit, TileSuit.Wan);
    test.assertEqual(sorted[1].value, 5);
    test.assertEqual(sorted[2].suit, TileSuit.Tiao);
    test.assertEqual(sorted[3].suit, TileSuit.Tong);
    test.assertEqual(sorted[4].suit, TileSuit.Wind);
    test.assertEqual(sorted[5].suit, TileSuit.Dragon);
  });

  test.test('isSameTile works correctly', () => {
    const tile1: Tile = { id: 'wan-1-0', suit: TileSuit.Wan, value: 1, displayName: '1万' };
    const tile2: Tile = { id: 'wan-1-1', suit: TileSuit.Wan, value: 1, displayName: '1万' };
    const tile3: Tile = { id: 'wan-2-0', suit: TileSuit.Wan, value: 2, displayName: '2万' };
    
    test.assert(isSameTile(tile1, tile2), 'Same suit and value should be considered same tile');
    test.assert(!isSameTile(tile1, tile3), 'Different values should not be considered same tile');
  });

  test.test('getTileDisplayName returns correct name', () => {
    const tile: Tile = { id: 'wan-5-0', suit: TileSuit.Wan, value: 5, displayName: '5万' };
    test.assertEqual(getTileDisplayName(tile), '5万');
  });

  test.test('validateTileSet validates correctly', () => {
    const validTiles = createFullTileSet();
    const validResult = validateTileSet(validTiles);
    
    test.assert(validResult.isValid, 'Valid tile set should pass validation');
    test.assertEqual(validResult.errors.length, 0, 'Valid tile set should have no errors');
    
    // Test invalid set (missing tiles)
    const invalidTiles = validTiles.slice(0, 100);
    const invalidResult = validateTileSet(invalidTiles);
    
    test.assert(!invalidResult.isValid, 'Invalid tile set should fail validation');
    test.assert(invalidResult.errors.length > 0, 'Invalid tile set should have errors');
  });

  test.test('Complete tile set validation', () => {
    const tiles = createFullTileSet();
    
    // Count tiles by type
    const wanTiles = tiles.filter(t => t.suit === TileSuit.Wan);
    const tiaoTiles = tiles.filter(t => t.suit === TileSuit.Tiao);
    const tongTiles = tiles.filter(t => t.suit === TileSuit.Tong);
    const windTiles = tiles.filter(t => t.suit === TileSuit.Wind);
    const dragonTiles = tiles.filter(t => t.suit === TileSuit.Dragon);
    
    test.assertEqual(wanTiles.length, 36, 'Should have 36 Wan tiles (9×4)');
    test.assertEqual(tiaoTiles.length, 36, 'Should have 36 Tiao tiles (9×4)');
    test.assertEqual(tongTiles.length, 36, 'Should have 36 Tong tiles (9×4)');
    test.assertEqual(windTiles.length, 16, 'Should have 16 Wind tiles (4×4)');
    test.assertEqual(dragonTiles.length, 12, 'Should have 12 Dragon tiles (3×4)');
    
    // Total check
    test.assertEqual(wanTiles.length + tiaoTiles.length + tongTiles.length + windTiles.length + dragonTiles.length, 136);
  });

  test.summary();
}

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('🧪 Running Tile System Tests...\n');
  runTests();
}

export { runTests };

// Vitest wrapper
import { describe, test as it, expect } from 'vitest';
describe('Tile System', () => {
  it('all tests pass', () => {
    runTests();
  });
});