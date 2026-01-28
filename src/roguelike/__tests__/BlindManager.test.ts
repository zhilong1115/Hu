import { BlindManager, generateBlindsForAnte } from '../BlindManager';
import { createSmallBlind, createBigBlind, BlindType } from '../Blind';
import { Boss } from '../BossRound';

describe('BlindManager', () => {
  let blindManager: BlindManager;

  beforeEach(() => {
    blindManager = new BlindManager();
  });

  describe('initialization', () => {
    it('should start with no active blind', () => {
      expect(blindManager.currentBlind).toBeNull();
      expect(blindManager.currentScore).toBe(0);
      expect(blindManager.handsUsed).toBe(0);
    });
  });

  describe('startBlind', () => {
    it('should set the current blind and reset state', () => {
      const blind = createSmallBlind(1);
      blindManager.startBlind(blind);

      expect(blindManager.currentBlind).toBe(blind);
      expect(blindManager.currentScore).toBe(0);
      expect(blindManager.handsUsed).toBe(0);
      expect(blindManager.handsRemaining).toBe(blind.handsAllowed);
    });
  });

  describe('playHand', () => {
    beforeEach(() => {
      const blind = createSmallBlind(1, 4, 3);
      blindManager.startBlind(blind);
    });

    it('should add score and increment hands used', () => {
      blindManager.playHand(100);

      expect(blindManager.currentScore).toBe(100);
      expect(blindManager.handsUsed).toBe(1);
      expect(blindManager.handsRemaining).toBe(3);
    });

    it('should accumulate score across multiple hands', () => {
      blindManager.playHand(100);
      blindManager.playHand(150);
      blindManager.playHand(50);

      expect(blindManager.currentScore).toBe(300);
      expect(blindManager.handsUsed).toBe(3);
      expect(blindManager.handsRemaining).toBe(1);
    });

    it('should throw error if no blind is active', () => {
      blindManager.reset();
      expect(() => blindManager.playHand(100)).toThrow('No blind is currently active');
    });

    it('should throw error if no hands remaining', () => {
      blindManager.playHand(100);
      blindManager.playHand(100);
      blindManager.playHand(100);
      blindManager.playHand(100);

      expect(() => blindManager.playHand(100)).toThrow('No hands remaining');
    });
  });

  describe('blind status', () => {
    it('should detect when blind is cleared', () => {
      const blind = createSmallBlind(1, 4, 3); // target: 300
      blindManager.startBlind(blind);

      expect(blindManager.isBlindCleared).toBe(false);

      blindManager.playHand(300);

      expect(blindManager.isBlindCleared).toBe(true);
    });

    it('should detect when blind is failed', () => {
      const blind = createSmallBlind(1, 4, 3); // target: 300
      blindManager.startBlind(blind);

      blindManager.playHand(50);
      blindManager.playHand(50);
      blindManager.playHand(50);
      blindManager.playHand(50); // Total: 200, but target is 300

      expect(blindManager.isBlindFailed).toBe(true);
      expect(blindManager.isBlindCleared).toBe(false);
    });
  });

  describe('getBlindResult', () => {
    it('should return correct result for cleared blind', () => {
      const blind = createSmallBlind(1, 4, 3); // target: 300, reward: 4
      blindManager.startBlind(blind);

      blindManager.playHand(200);
      blindManager.playHand(150); // Total: 350, excess: 50

      const result = blindManager.getBlindResult();

      expect(result.cleared).toBe(true);
      expect(result.scoreAchieved).toBe(350);
      expect(result.targetScore).toBe(300);
      expect(result.excessScore).toBe(50);
      expect(result.baseReward).toBe(4);
      expect(result.bonusReward).toBe(0); // floor(50 * 0.01) = 0
      expect(result.totalReward).toBe(4);
      expect(result.handsUsed).toBe(2);
      expect(result.handsRemaining).toBe(2);
    });

    it('should calculate bonus reward correctly', () => {
      const blind = createBigBlind(1, 4, 3); // target: 450, reward: 5.5, bonus: 0.02
      blindManager.startBlind(blind);

      blindManager.playHand(600); // Excess: 150

      const result = blindManager.getBlindResult();

      expect(result.cleared).toBe(true);
      expect(result.excessScore).toBe(150);
      expect(result.bonusReward).toBe(3); // floor(150 * 0.02) = 3
      expect(result.totalReward).toBe(8.5); // 5.5 base reward + 3 bonus
    });

    it('should return zero rewards for failed blind', () => {
      const blind = createSmallBlind(1, 4, 3);
      blindManager.startBlind(blind);

      blindManager.playHand(50);
      blindManager.playHand(50);
      blindManager.playHand(50);
      blindManager.playHand(50); // Total: 200

      const result = blindManager.getBlindResult();

      expect(result.cleared).toBe(false);
      expect(result.baseReward).toBe(0);
      expect(result.bonusReward).toBe(0);
      expect(result.totalReward).toBe(0);
    });

    it('should throw error if no blind is active', () => {
      expect(() => blindManager.getBlindResult()).toThrow('No blind is currently active');
    });
  });

  describe('getProgress', () => {
    it('should return progress information', () => {
      const blind = createSmallBlind(1, 4, 3); // target: 300
      blindManager.startBlind(blind);

      blindManager.playHand(150);

      const progress = blindManager.getProgress();

      expect(progress.score).toBe(150);
      expect(progress.target).toBe(300);
      expect(progress.percentage).toBe(50);
      expect(progress.handsUsed).toBe(1);
      expect(progress.handsRemaining).toBe(3);
    });

    it('should return zeros when no blind is active', () => {
      const progress = blindManager.getProgress();

      expect(progress.score).toBe(0);
      expect(progress.target).toBe(0);
      expect(progress.percentage).toBe(0);
      expect(progress.handsUsed).toBe(0);
      expect(progress.handsRemaining).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      const blind = createSmallBlind(1);
      blindManager.startBlind(blind);
      blindManager.playHand(100);

      blindManager.reset();

      expect(blindManager.currentBlind).toBeNull();
      expect(blindManager.currentScore).toBe(0);
      expect(blindManager.handsUsed).toBe(0);
    });
  });

  describe('generateBlindsForAnte', () => {
    it('should generate three blinds for an ante', () => {
      const mockBoss: Boss = {
        name: 'Test Boss',
        description: 'A test boss',
        health: 100,
        maxHealth: 100,
        abilities: [],
        difficulty: 1,
        rewards: [],
      };

      const blinds = generateBlindsForAnte(1, mockBoss);

      expect(blinds).toHaveLength(3);
      expect(blinds[0].type).toBe(BlindType.SMALL);
      expect(blinds[1].type).toBe(BlindType.BIG);
      expect(blinds[2].type).toBe(BlindType.BOSS);
      expect(blinds[2].boss).toBe(mockBoss);
    });

    it('should scale targets with ante number', () => {
      const mockBoss: Boss = {
        name: 'Test Boss',
        description: 'A test boss',
        health: 100,
        maxHealth: 100,
        abilities: [],
        difficulty: 1,
        rewards: [],
      };

      const ante1Blinds = generateBlindsForAnte(1, mockBoss);
      const ante2Blinds = generateBlindsForAnte(2, mockBoss);

      expect(ante2Blinds[0].targetScore).toBeGreaterThan(ante1Blinds[0].targetScore);
      expect(ante2Blinds[1].targetScore).toBeGreaterThan(ante1Blinds[1].targetScore);
      expect(ante2Blinds[2].targetScore).toBeGreaterThan(ante1Blinds[2].targetScore);
    });
  });
});
