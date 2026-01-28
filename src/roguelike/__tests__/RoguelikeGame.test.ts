import { RoguelikeGame, GamePhase } from '../RoguelikeGame';
import { Boss } from '../BossRound';
import { BlindType } from '../Blind';
import { GodTile } from '../GodTile';
import { TileSuit } from '../../core/Tile';

describe('RoguelikeGame', () => {
  let game: RoguelikeGame;
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

    game = new RoguelikeGame(mockBossProvider, 50);
  });

  describe('initialization', () => {
    it('should initialize in BLIND_START phase', () => {
      expect(game.phase).toBe(GamePhase.BLIND_START);
    });

    it('should have access to managers', () => {
      expect(game.round).toBeDefined();
      expect(game.blindManager).toBeDefined();
      expect(game.anteManager).toBeDefined();
    });

    it('should start with empty god tiles', () => {
      expect(game.activeGodTiles).toHaveLength(0);
    });
  });

  describe('startGame', () => {
    it('should reset all state and start first blind', () => {
      game.startGame();

      expect(game.phase).toBe(GamePhase.PLAYING_HAND);
      expect(game.anteManager.currentAnte).toBe(1);
      expect(game.anteManager.currentBlindIndex).toBe(0);
    });
  });

  describe('getState', () => {
    it('should return current game state', () => {
      game.startGame();
      const state = game.getState();

      expect(state.phase).toBe(GamePhase.PLAYING_HAND);
      expect(state.ante).toBe(1);
      expect(state.blindIndex).toBe(0);
      expect(state.money).toBe(0); // startGame() resets money to 0
      expect(state.handsRemaining).toBeGreaterThan(0);
      expect(state.targetScore).toBeGreaterThan(0);
    });
  });

  describe('blind progression', () => {
    beforeEach(() => {
      game.startGame();
    });

    it('should start with small blind', () => {
      const currentBlind = game.anteManager.currentBlind;
      expect(currentBlind.type).toBe(BlindType.SMALL);
    });

    it('should deal initial hand when starting blind', () => {
      expect(game.round.hand.tiles.length).toBe(13);
    });
  });

  describe('playHand', () => {
    beforeEach(() => {
      game.startGame();
    });

    it('should return null for non-winning hand', () => {
      // The randomly dealt hand is unlikely to be winning
      const result = game.playHand();
      expect(result).toBeNull();
    });

    it('should throw error if not in PLAYING_HAND phase', () => {
      // Force to different phase
      (game as any)._phase = GamePhase.SHOP;

      expect(() => game.playHand()).toThrow('Cannot play hand in current phase');
    });
  });

  describe('skipHand', () => {
    beforeEach(() => {
      game.startGame();
    });

    it('should skip hand and record 0 score', () => {
      const initialHands = game.blindManager.handsRemaining;

      game.skipHand();

      expect(game.blindManager.handsRemaining).toBe(initialHands - 1);
      expect(game.blindManager.currentScore).toBe(0);
    });

    it('should move to GAME_OVER if all hands are used without clearing', () => {
      const handsAllowed = game.anteManager.currentBlind.handsAllowed;

      for (let i = 0; i < handsAllowed; i++) {
        if (game.phase !== GamePhase.GAME_OVER) {
          if (game.phase === GamePhase.HAND_COMPLETE) {
            game.continueToNextHand();
          }
          if (game.phase === GamePhase.PLAYING_HAND) {
            game.skipHand();
          }
        }
      }

      expect(game.phase).toBe(GamePhase.GAME_OVER);
      expect(game.isGameOver()).toBe(true);
    });
  });

  describe('continueToNextHand', () => {
    beforeEach(() => {
      game.startGame();
      game.skipHand(); // Move to HAND_COMPLETE
    });

    it('should start new hand if hands remaining', () => {
      expect(game.phase).toBe(GamePhase.HAND_COMPLETE);

      game.continueToNextHand();

      expect(game.phase).toBe(GamePhase.PLAYING_HAND);
    });

    it('should throw error if not in HAND_COMPLETE phase', () => {
      game.continueToNextHand(); // Already moved to PLAYING_HAND

      expect(() => game.continueToNextHand()).toThrow(
        'Cannot continue to next hand in current phase'
      );
    });
  });

  describe('blind completion', () => {
    beforeEach(() => {
      game.startGame();
    });

    it('should move to BLIND_COMPLETE when blind is cleared', () => {
      // Simulate clearing the blind by directly manipulating score
      const targetScore = game.anteManager.currentBlind.targetScore;
      (game.blindManager as any)._currentScore = targetScore;
      (game.blindManager as any)._handsUsed = 1;

      // Force phase to HAND_COMPLETE
      (game as any)._phase = GamePhase.HAND_COMPLETE;

      game.continueToNextHand();

      // Since blind is cleared, should complete blind
      expect(game.phase).toBe(GamePhase.BLIND_COMPLETE);
    });
  });

  describe('advanceToNextBlind', () => {
    it('should advance to next blind', () => {
      game.startGame();

      // Simulate clearing first blind
      const targetScore = game.anteManager.currentBlind.targetScore;
      (game.blindManager as any)._currentScore = targetScore;
      (game.blindManager as any)._handsUsed = 1;
      (game as any)._phase = GamePhase.HAND_COMPLETE;
      game.continueToNextHand();

      expect(game.phase).toBe(GamePhase.BLIND_COMPLETE);

      game.advanceToNextBlind();

      expect(game.phase).toBe(GamePhase.PLAYING_HAND);
      expect(game.anteManager.currentBlindIndex).toBe(1);
    });
  });

  describe('advanceToNextAnte', () => {
    it('should throw error if ante is not complete', () => {
      game.startGame();

      expect(() => game.advanceToNextAnte()).toThrow(
        'Cannot advance to next ante in current phase'
      );
    });

    it('should advance to next ante when all blinds cleared', () => {
      game.startGame();

      // Simulate completing all three blinds
      for (let i = 0; i < 3; i++) {
        // Start the blind
        game.blindManager.startBlind(game.anteManager.currentBlind);

        const targetScore = game.anteManager.currentBlind.targetScore;
        (game.blindManager as any)._currentScore = targetScore;
        (game.blindManager as any)._handsUsed = 1;

        const blindResult = game.blindManager.getBlindResult();
        game.anteManager.completeBlind(blindResult);
      }

      expect(game.anteManager.isAnteComplete).toBe(true);
      (game as any)._phase = GamePhase.ANTE_COMPLETE;

      game.advanceToNextAnte();

      expect(game.anteManager.currentAnte).toBe(2);
      expect(game.anteManager.currentBlindIndex).toBe(0);
      expect(game.phase).toBe(GamePhase.PLAYING_HAND);
    });
  });

  describe('shop phase', () => {
    beforeEach(() => {
      game.startGame();
      // Simulate completing a blind
      const targetScore = game.anteManager.currentBlind.targetScore;
      (game.blindManager as any)._currentScore = targetScore;
      (game.blindManager as any)._handsUsed = 1;
      (game as any)._phase = GamePhase.BLIND_COMPLETE;
    });

    it('should enter shop phase', () => {
      game.enterShop();
      expect(game.phase).toBe(GamePhase.SHOP);
    });

    it('should exit shop phase and return to blind complete', () => {
      game.enterShop();
      game.exitShop();
      expect(game.phase).toBe(GamePhase.BLIND_COMPLETE);
    });

    it('should throw error if entering shop in wrong phase', () => {
      (game as any)._phase = GamePhase.PLAYING_HAND;
      expect(() => game.enterShop()).toThrow('Cannot enter shop in current phase');
    });
  });

  describe('god tiles', () => {
    let godTile: GodTile;

    beforeEach(() => {
      godTile = {
        id: 'god-1',
        displayName: 'Test God',
        description: 'A test god tile',
        suit: TileSuit.Dragon,
        value: 1,
        tier: 1,
        effects: [],
        cost: 10,
      };
    });

    it('should add god tile to active collection', () => {
      game.addGodTile(godTile);
      expect(game.activeGodTiles).toHaveLength(1);
      expect(game.activeGodTiles[0]).toBe(godTile);
    });

    it('should remove god tile from active collection', () => {
      game.addGodTile(godTile);
      const removed = game.removeGodTile(godTile);

      expect(removed).toBe(true);
      expect(game.activeGodTiles).toHaveLength(0);
    });

    it('should return false when removing non-existent god tile', () => {
      const removed = game.removeGodTile(godTile);
      expect(removed).toBe(false);
    });

    it('should allow multiple god tiles', () => {
      const godTile2: GodTile = {
        ...godTile,
        id: 'god-2',
        displayName: 'Test God 2',
      };

      game.addGodTile(godTile);
      game.addGodTile(godTile2);

      expect(game.activeGodTiles).toHaveLength(2);
    });
  });

  describe('getBlindResult', () => {
    beforeEach(() => {
      game.startGame();
    });

    it('should return current blind result', () => {
      // Play a hand (skip for 0 score)
      game.skipHand();

      const result = game.getBlindResult();

      expect(result).toBeDefined();
      expect(result.scoreAchieved).toBe(0);
      expect(result.cleared).toBe(false);
    });
  });

  describe('game over', () => {
    beforeEach(() => {
      game.startGame();
    });

    it('should detect game over state', () => {
      expect(game.isGameOver()).toBe(false);

      // Use all hands without clearing blind
      const handsAllowed = game.anteManager.currentBlind.handsAllowed;
      for (let i = 0; i < handsAllowed; i++) {
        if (!game.isGameOver()) {
          if (game.phase === GamePhase.HAND_COMPLETE) {
            game.continueToNextHand();
          }
          if (game.phase === GamePhase.PLAYING_HAND) {
            game.skipHand();
          }
        }
      }

      expect(game.isGameOver()).toBe(true);
      expect(game.phase).toBe(GamePhase.GAME_OVER);
    });
  });

  describe('integration: complete ante flow', () => {
    it('should progress through small -> big -> boss blinds', () => {
      game.startGame();

      // Should start with small blind
      expect(game.anteManager.currentBlind.type).toBe(BlindType.SMALL);
      expect(game.anteManager.currentBlindIndex).toBe(0);

      // Simulate clearing small blind
      const targetScore1 = game.anteManager.currentBlind.targetScore;
      (game.blindManager as any)._currentScore = targetScore1;
      (game.blindManager as any)._handsUsed = 1;
      const result1 = game.blindManager.getBlindResult();
      game.anteManager.completeBlind(result1);
      (game as any)._phase = GamePhase.BLIND_COMPLETE;

      // Advance to big blind
      game.advanceToNextBlind();
      expect(game.anteManager.currentBlind.type).toBe(BlindType.BIG);
      expect(game.anteManager.currentBlindIndex).toBe(1);

      // Simulate clearing big blind
      const targetScore2 = game.anteManager.currentBlind.targetScore;
      (game.blindManager as any)._currentScore = targetScore2;
      (game.blindManager as any)._handsUsed = 1;
      const result2 = game.blindManager.getBlindResult();
      game.anteManager.completeBlind(result2);
      game.blindManager.reset();
      (game as any)._phase = GamePhase.BLIND_COMPLETE;

      // Advance to boss blind
      game.advanceToNextBlind();
      expect(game.anteManager.currentBlind.type).toBe(BlindType.BOSS);
      expect(game.anteManager.currentBlindIndex).toBe(2);

      // Simulate clearing boss blind
      const targetScore3 = game.anteManager.currentBlind.targetScore;
      (game.blindManager as any)._currentScore = targetScore3;
      (game.blindManager as any)._handsUsed = 1;

      // Set phase to HAND_COMPLETE and call continueToNextHand to trigger completeBlind
      (game as any)._phase = GamePhase.HAND_COMPLETE;
      game.continueToNextHand();

      // Should now be in ANTE_COMPLETE phase
      expect(game.phase).toBe(GamePhase.ANTE_COMPLETE);
      expect(game.anteManager.isAnteComplete).toBe(true);

      // Can advance to next ante
      (game as any)._phase = GamePhase.ANTE_COMPLETE;
      game.advanceToNextAnte();
      expect(game.anteManager.currentAnte).toBe(2);
      expect(game.anteManager.currentBlindIndex).toBe(0);
      expect(game.anteManager.currentBlind.type).toBe(BlindType.SMALL);
    });
  });
});
