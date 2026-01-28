import { AnteManager } from '../AnteManager';
import { BlindType } from '../Blind';
import { BlindResult } from '../BlindManager';
import { Boss } from '../BossRound';

describe('AnteManager', () => {
  let anteManager: AnteManager;
  let mockBossProvider: (ante: number) => Boss;

  beforeEach(() => {
    mockBossProvider = (ante: number): Boss => ({
      name: `Boss ${ante}`,
      description: `Test boss for ante ${ante}`,
      health: 100 * ante,
      maxHealth: 100 * ante,
      abilities: [],
      difficulty: ante,
      rewards: [],
    });

    anteManager = new AnteManager(mockBossProvider, 10);
  });

  describe('initialization', () => {
    it('should start at ante 1 with first blind', () => {
      expect(anteManager.currentAnte).toBe(1);
      expect(anteManager.currentBlindIndex).toBe(0);
      expect(anteManager.currentBlind.type).toBe(BlindType.SMALL);
      expect(anteManager.totalMoney).toBe(10);
    });

    it('should initialize with correct starting money', () => {
      const manager = new AnteManager(mockBossProvider, 100);
      expect(manager.totalMoney).toBe(100);
    });
  });

  describe('completeBlind', () => {
    it('should award money and advance blind index', () => {
      const blindResult: BlindResult = {
        cleared: true,
        scoreAchieved: 400,
        targetScore: 300,
        excessScore: 100,
        baseReward: 4,
        bonusReward: 1,
        totalReward: 5,
        handsUsed: 2,
        handsRemaining: 2,
      };

      anteManager.completeBlind(blindResult);

      expect(anteManager.totalMoney).toBe(15); // 10 + 5
      expect(anteManager.currentBlindIndex).toBe(1);
      expect(anteManager.totalBlindsCleared).toBe(1);
      expect(anteManager.totalScore).toBe(400);
    });

    it('should advance through all three blinds', () => {
      const blindResult: BlindResult = {
        cleared: true,
        scoreAchieved: 300,
        targetScore: 300,
        excessScore: 0,
        baseReward: 4,
        bonusReward: 0,
        totalReward: 4,
        handsUsed: 3,
        handsRemaining: 1,
      };

      // Complete small blind
      expect(anteManager.currentBlind.type).toBe(BlindType.SMALL);
      anteManager.completeBlind(blindResult);
      expect(anteManager.currentBlindIndex).toBe(1);
      expect(anteManager.isAnteComplete).toBe(false);

      // Complete big blind
      expect(anteManager.currentBlind.type).toBe(BlindType.BIG);
      anteManager.completeBlind(blindResult);
      expect(anteManager.currentBlindIndex).toBe(2);
      expect(anteManager.isAnteComplete).toBe(false);

      // Complete boss blind
      expect(anteManager.currentBlind.type).toBe(BlindType.BOSS);
      const anteComplete = anteManager.completeBlind(blindResult);
      expect(anteComplete).toBe(true);
      expect(anteManager.currentBlindIndex).toBe(3);
      expect(anteManager.isAnteComplete).toBe(true);
    });

    it('should throw error if blind was not cleared', () => {
      const blindResult: BlindResult = {
        cleared: false,
        scoreAchieved: 200,
        targetScore: 300,
        excessScore: 0,
        baseReward: 0,
        bonusReward: 0,
        totalReward: 0,
        handsUsed: 4,
        handsRemaining: 0,
      };

      expect(() => anteManager.completeBlind(blindResult)).toThrow(
        'Cannot complete a blind that was not cleared'
      );
    });
  });

  describe('advanceToNextAnte', () => {
    it('should advance to next ante and reset blind index', () => {
      // Complete all three blinds
      const blindResult: BlindResult = {
        cleared: true,
        scoreAchieved: 300,
        targetScore: 300,
        excessScore: 0,
        baseReward: 4,
        bonusReward: 0,
        totalReward: 4,
        handsUsed: 3,
        handsRemaining: 1,
      };

      anteManager.completeBlind(blindResult);
      anteManager.completeBlind(blindResult);
      anteManager.completeBlind(blindResult);

      expect(anteManager.isAnteComplete).toBe(true);

      anteManager.advanceToNextAnte();

      expect(anteManager.currentAnte).toBe(2);
      expect(anteManager.currentBlindIndex).toBe(0);
      expect(anteManager.currentBlind.type).toBe(BlindType.SMALL);
      expect(anteManager.isAnteComplete).toBe(false);
    });

    it('should generate blinds with scaled difficulty', () => {
      // Create a fresh manager for this test
      const freshManager = new AnteManager(mockBossProvider, 10);

      // Get ante 1 target
      const ante1SmallTarget = freshManager.currentBlind.targetScore;

      // Complete ante 1
      const blindResult: BlindResult = {
        cleared: true,
        scoreAchieved: 600,
        targetScore: 600,
        excessScore: 0,
        baseReward: 10,
        bonusReward: 0,
        totalReward: 10,
        handsUsed: 3,
        handsRemaining: 1,
      };
      freshManager.completeBlind(blindResult);
      freshManager.completeBlind(blindResult);
      freshManager.completeBlind(blindResult);

      expect(freshManager.isAnteComplete).toBe(true);
      freshManager.advanceToNextAnte();

      const ante2SmallTarget = freshManager.currentBlind.targetScore;

      expect(ante2SmallTarget).toBeGreaterThan(ante1SmallTarget);
    });

    it('should throw error if ante is not complete', () => {
      const newManager = new AnteManager(mockBossProvider);

      expect(() => newManager.advanceToNextAnte()).toThrow(
        'Cannot advance to next ante: current ante is not complete'
      );
    });
  });

  describe('money management', () => {
    it('should add money correctly', () => {
      anteManager.addMoney(50);
      expect(anteManager.totalMoney).toBe(60); // 10 + 50
    });

    it('should spend money successfully', () => {
      const success = anteManager.spendMoney(5);
      expect(success).toBe(true);
      expect(anteManager.totalMoney).toBe(5); // 10 - 5
    });

    it('should fail to spend money if insufficient funds', () => {
      const success = anteManager.spendMoney(20);
      expect(success).toBe(false);
      expect(anteManager.totalMoney).toBe(10); // Unchanged
    });
  });

  describe('state management', () => {
    it('should save and restore state', () => {
      // Play through some game
      const blindResult: BlindResult = {
        cleared: true,
        scoreAchieved: 400,
        targetScore: 300,
        excessScore: 100,
        baseReward: 4,
        bonusReward: 1,
        totalReward: 5,
        handsUsed: 2,
        handsRemaining: 2,
      };

      anteManager.completeBlind(blindResult);
      anteManager.addMoney(20);

      const state = anteManager.getState();

      expect(state.anteNumber).toBe(1);
      expect(state.blindIndex).toBe(1);
      expect(state.totalMoney).toBe(35); // 10 + 5 + 20
      expect(state.blindsCleared).toBe(1);
      expect(state.totalScore).toBe(400);

      // Create new manager and restore state
      const newManager = new AnteManager(mockBossProvider);
      newManager.setState(state);

      expect(newManager.currentAnte).toBe(1);
      expect(newManager.currentBlindIndex).toBe(1);
      expect(newManager.totalMoney).toBe(35);
      expect(newManager.totalBlindsCleared).toBe(1);
      expect(newManager.totalScore).toBe(400);
    });
  });

  describe('reset', () => {
    it('should reset all progress', () => {
      // Play through some game
      const blindResult: BlindResult = {
        cleared: true,
        scoreAchieved: 400,
        targetScore: 300,
        excessScore: 100,
        baseReward: 4,
        bonusReward: 1,
        totalReward: 5,
        handsUsed: 2,
        handsRemaining: 2,
      };

      anteManager.completeBlind(blindResult);
      anteManager.addMoney(50);

      anteManager.reset(20);

      expect(anteManager.currentAnte).toBe(1);
      expect(anteManager.currentBlindIndex).toBe(0);
      expect(anteManager.totalMoney).toBe(20);
      expect(anteManager.totalBlindsCleared).toBe(0);
      expect(anteManager.totalScore).toBe(0);
    });
  });

  describe('getSummary', () => {
    it('should return current game summary', () => {
      const summary = anteManager.getSummary();

      expect(summary.ante).toBe(1);
      expect(summary.blindType).toBe(BlindType.SMALL);
      expect(summary.blindName).toContain('小盲注');
      expect(summary.money).toBe(10);
      expect(summary.blindsCleared).toBe(0);
      expect(summary.totalScore).toBe(0);
    });

    it('should update summary as game progresses', () => {
      const blindResult: BlindResult = {
        cleared: true,
        scoreAchieved: 400,
        targetScore: 300,
        excessScore: 100,
        baseReward: 4,
        bonusReward: 1,
        totalReward: 5,
        handsUsed: 2,
        handsRemaining: 2,
      };

      anteManager.completeBlind(blindResult);

      const summary = anteManager.getSummary();

      expect(summary.ante).toBe(1);
      expect(summary.blindType).toBe(BlindType.BIG);
      expect(summary.money).toBe(15);
      expect(summary.blindsCleared).toBe(1);
      expect(summary.totalScore).toBe(400);
    });
  });
});
