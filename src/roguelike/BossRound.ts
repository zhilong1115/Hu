import { Round } from '../core/Round';
import { ScoreResult } from '../core/Scoring';
import { BossBlind } from './BossBlind';
import { Tile } from '../core/Tile';
import { Fan } from '../core/FanEvaluator';

export interface Boss {
  name: string;
  description: string;
  health: number;
  maxHealth: number;
  abilities: BossAbility[];
  difficulty: number;
  rewards: BossReward[];
}

export interface BossAbility {
  name: string;
  description: string;
  cooldown: number;
  currentCooldown: number;
  activate: (context: BossRoundContext) => void;
}

export interface BossReward {
  type: 'gold' | 'god_tile' | 'flower_card';
  amount: number;
  rarity?: string;
}

export interface BossRoundContext {
  boss: Boss;
  playerRound: BossRound;
  turnCount: number;
  playerHealth: number;
  bossBlind: BossBlind | null;
}

export class BossRound extends Round {
  private _boss: Boss;
  private _bossBlind: BossBlind | null = null;
  private _turnCount: number = 0;
  private _playerHealth: number = 100;
  private _bossPhase: number = 1;

  constructor(boss: Boss, bossBlind?: BossBlind) {
    super();
    this._boss = boss;
    if (bossBlind) {
      this._bossBlind = bossBlind;
    }
  }

  public get boss(): Boss {
    return this._boss;
  }

  public get turnCount(): number {
    return this._turnCount;
  }

  public get playerHealth(): number {
    return this._playerHealth;
  }

  public get bossPhase(): number {
    return this._bossPhase;
  }

  public get bossBlind(): BossBlind | null {
    return this._bossBlind;
  }

  public setBossBlind(blind: BossBlind): void {
    this._bossBlind = blind;
  }

  public startBossRound(): void {
    this.dealInitialHand();
    this.resetBossAbilityCooldowns();

    // Initialize boss blind with game context
    if (this._bossBlind) {
      this._bossBlind.initialize({
        hand: this.hand,
        drawPile: [] // Will be populated by GameScene
      });
    }
  }

  public processTurn(): void {
    this._turnCount++;
    
    // Process boss abilities
    this.processBossAbilities();
    
    // Update boss phase based on health
    this.updateBossPhase();
    
    // Decrease ability cooldowns
    this.updateAbilityCooldowns();
  }

  public damagePlayer(amount: number): void {
    this._playerHealth = Math.max(0, this._playerHealth - amount);
  }

  public damageBoss(amount: number): void {
    this._boss.health = Math.max(0, this._boss.health - amount);
  }

  public healPlayer(amount: number): void {
    this._playerHealth = Math.min(100, this._playerHealth + amount);
  }

  public isPlayerDefeated(): boolean {
    return this._playerHealth <= 0;
  }

  public isBossDefeated(): boolean {
    return this._boss.health <= 0;
  }

  public getBossRewards(): BossReward[] {
    if (this.isBossDefeated()) {
      return this._boss.rewards;
    }
    return [];
  }

  /**
   * Validate if a hand can win considering boss blind restrictions
   */
  public canWinWithBlind(tiles: Tile[], fans: Fan[]): { allowed: boolean; reason?: string } {
    if (!this._bossBlind || !this._bossBlind.effect.canWinWithHand) {
      return { allowed: true };
    }

    return this._bossBlind.effect.canWinWithHand(tiles, fans);
  }

  /**
   * Check if a tile is debuffed by boss blind
   */
  public isTileDebuffed(tile: Tile): boolean {
    if (!this._bossBlind || !this._bossBlind.effect.isDebuffed) {
      return false;
    }

    return this._bossBlind.effect.isDebuffed(tile);
  }

  /**
   * Check if a tile should be hidden
   */
  public isTileHidden(tile: Tile): boolean {
    if (!this._bossBlind || !this._bossBlind.effect.isTileHidden) {
      return false;
    }

    return this._bossBlind.effect.isTileHidden(tile);
  }

  public declareWin(): ScoreResult | null {
    const result = super.declareWin();

    if (result) {
      // Apply boss blind score modifier
      let finalScore = result.finalScore;
      if (this._bossBlind && this._bossBlind.effect.modifyScore) {
        finalScore = this._bossBlind.effect.modifyScore(
          result.finalScore,
          result.totalChips,
          result.totalMult
        );
      }

      // Deal damage to boss based on modified score
      const damage = Math.floor(finalScore / 10);
      this.damageBoss(damage);

      // Return modified result
      return {
        ...result,
        finalScore
      };
    }

    return result;
  }

  private processBossAbilities(): void {
    const context: BossRoundContext = {
      boss: this._boss,
      playerRound: this,
      turnCount: this._turnCount,
      playerHealth: this._playerHealth,
      bossBlind: this._bossBlind
    };

    for (const ability of this._boss.abilities) {
      if (ability.currentCooldown === 0) {
        ability.activate(context);
        ability.currentCooldown = ability.cooldown;
      }
    }
  }

  /**
   * Get last phase change (for triggering UI updates)
   */
  private _lastPhase: number = 1;

  public hasPhaseChanged(): boolean {
    return this._bossPhase !== this._lastPhase;
  }

  public acknowledgePhaseChange(): void {
    this._lastPhase = this._bossPhase;
  }

  private updateBossPhase(): void {
    const healthPercent = this._boss.health / this._boss.maxHealth;
    
    if (healthPercent <= 0.25 && this._bossPhase < 3) {
      this._bossPhase = 3;
    } else if (healthPercent <= 0.5 && this._bossPhase < 2) {
      this._bossPhase = 2;
    }
  }

  private updateAbilityCooldowns(): void {
    for (const ability of this._boss.abilities) {
      if (ability.currentCooldown > 0) {
        ability.currentCooldown--;
      }
    }
  }

  private resetBossAbilityCooldowns(): void {
    for (const ability of this._boss.abilities) {
      ability.currentCooldown = 0;
    }
  }
}