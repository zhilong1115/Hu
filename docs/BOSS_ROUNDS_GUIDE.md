# Boss Rounds Developer Guide

## Quick Start

### Adding a New Boss

1. **Create Boss Definition** in `src/data/bosses.ts`:
```typescript
export const BOSS_NEW_BOSS: Boss = {
  name: '新BOSS名',
  description: 'BOSS描述',
  health: 400,
  maxHealth: 400,
  difficulty: 2,
  abilities: [
    createDamageAbility('能力名', '能力描述', 20, 3),
    // ... more abilities
  ],
  rewards: [
    { type: 'gold', amount: 80 },
    { type: 'god_tile', amount: 1, rarity: 'rare' }
  ]
};
```

2. **Add to Boss Pool**:
```typescript
export const BOSS_POOL: Record<number, Boss[]> = {
  1: [BOSS_WAN_EMPEROR],
  2: [BOSS_BLIND_MASTER, BOSS_PAIR_TYRANT, BOSS_NEW_BOSS], // Add here
  // ...
};
```

3. **Map to Blind Type** in `getBossBlindType()`:
```typescript
case '新BOSS名':
  return BossBlindType.YOUR_BLIND;
```

### Creating a Custom Boss Blind

1. **Add Blind Type** to `BossBlindType` enum:
```typescript
export enum BossBlindType {
  // ... existing types
  NEW_BLIND = 'new_blind'
}
```

2. **Implement in Factory** (`createBossBlind()`):
```typescript
case BossBlindType.NEW_BLIND:
  return new BossBlind(
    type,
    '盲牌名称',
    '盲牌描述',
    {
      // Implement effect methods
      canUseTile: (tile: Tile) => {
        // Return true if tile can be used
      },
      canWinWithHand: (tiles: Tile[], fans: Fan[]) => {
        // Validate winning hand
        return { allowed: true };
      }
    }
  );
```

### Creating Custom Boss Abilities

Use ability factory functions or create custom:

```typescript
// Custom ability
const customAbility: BossAbility = {
  name: '自定义能力',
  description: '能力描述',
  cooldown: 4,
  currentCooldown: 0,
  activate: (context: BossRoundContext) => {
    // Access game state
    const hand = context.playerRound.hand;
    const boss = context.boss;
    const blind = context.bossBlind;

    // Implement effect
    context.playerRound.damagePlayer(10);
    // or
    hand.removeTile(hand.tiles[0]);
    // or
    context.boss.health += 20;
  }
};
```

## Boss Blind Effect Reference

### Effect Methods

#### `canUseTile(tile: Tile) => boolean`
Check if a tile can be used in scoring hand.

**Example**: Ban all wind tiles
```typescript
canUseTile: (tile: Tile) => tile.suit !== TileSuit.Wind
```

#### `isTileHidden(tile: Tile) => boolean`
Check if tile should be hidden from player.

**Example**: Hide all honor tiles
```typescript
isTileHidden: (tile: Tile) =>
  tile.suit === TileSuit.Wind || tile.suit === TileSuit.Dragon
```

#### `canWinWithHand(tiles: Tile[], fans: Fan[]) => ValidationResult`
Validate if hand can win under blind restrictions.

**Example**: Require specific fan
```typescript
canWinWithHand: (tiles: Tile[], fans: Fan[]) => {
  const hasRequiredFan = fans.some(f => f.name === '清一色');
  return {
    allowed: hasRequiredFan,
    reason: hasRequiredFan ? undefined : '必须是清一色！'
  };
}
```

#### `isDebuffed(tile: Tile) => boolean`
Mark tile as debuffed (visual indicator + scoring effect).

**Example**: Debuff terminals
```typescript
isDebuffed: (tile: Tile) =>
  tile.value === 1 || tile.value === 9
```

#### `modifyScore(baseScore, chips, mult) => number`
Modify final score calculation.

**Example**: 50% score reduction
```typescript
modifyScore: (baseScore: number) => Math.floor(baseScore * 0.5)
```

#### `modifyGameState(state) => ModifiedState`
Modify initial hands/discards.

**Example**: Reduce both by 1
```typescript
modifyGameState: (state) => ({
  hands: state.hands - 1,
  discards: state.discards - 1
})
```

## Boss Difficulty Scaling

### Difficulty Calculation
```typescript
difficulty = Math.ceil(roundNumber / 3)
```

### Recommended Stats by Difficulty

| Difficulty | Health | Damage/Turn | Abilities | Reward Gold |
|------------|--------|-------------|-----------|-------------|
| 1          | 300    | 15-20       | 2         | 50-60       |
| 2          | 350-400| 20-25       | 2-3       | 70-80       |
| 3          | 400-450| 25-30       | 3         | 90-110      |
| 4+         | 450-500| 30-35       | 3-4       | 120-150     |

## Debugging Tips

### Enable Boss Logging
```typescript
// In BossRound.ts processBossAbilities()
for (const ability of this._boss.abilities) {
  if (ability.currentCooldown === 0) {
    console.log(`[BOSS] Activating: ${ability.name}`);
    ability.activate(context);
    ability.currentCooldown = ability.cooldown;
  }
}
```

### Test Specific Boss
Modify `BossGameScene.create()`:
```typescript
// Force specific boss for testing
import { BOSS_CURSE_WITCH } from '../data/bosses';
this._boss = { ...BOSS_CURSE_WITCH };
```

### Adjust Boss Health for Testing
```typescript
// In bosses.ts, temporarily reduce health
health: 50,  // Instead of 400
maxHealth: 50
```

### Skip to Boss Round
Modify `GameScene.onWin()`:
```typescript
// Always go to boss round
this.scene.start('BossGameScene', {
  roundNumber: 3,  // Force round 3
  difficulty: 1,
  // ... other data
});
```

## Common Patterns

### Multi-Stage Boss Ability
```typescript
{
  name: '进化能力',
  cooldown: 5,
  activate: (context) => {
    const phase = context.playerRound.bossPhase;

    if (phase === 1) {
      // Weak phase
      context.playerRound.damagePlayer(10);
    } else if (phase === 2) {
      // Medium phase
      context.playerRound.damagePlayer(20);
    } else {
      // Strong phase
      context.playerRound.damagePlayer(30);
      context.boss.health += 10; // Also heal
    }
  }
}
```

### Conditional Ability
```typescript
{
  name: '反击',
  cooldown: 2,
  activate: (context) => {
    // Only activate if boss is below 50% health
    const healthPercent = context.boss.health / context.boss.maxHealth;
    if (healthPercent < 0.5) {
      context.playerRound.damagePlayer(25);
    }
  }
}
```

### Dynamic Blind Effect
```typescript
// In BossBlind class
private _currentMultiplier: number = 1;

// In effect
modifyScore: (baseScore: number) => {
  const blind = this as unknown as BossBlind;
  // Increase tax over time
  blind._currentMultiplier += 0.1;
  return Math.floor(baseScore * blind._currentMultiplier);
}
```

## UI Customization

### Custom Boss Colors
Modify `BossHealthBar.ts`:
```typescript
private createVisuals(): void {
  // Custom background color
  this._background.setFillStyle(0x001100); // Dark green
  this._background.setStrokeStyle(2, 0x00ff00); // Green border

  // Custom name color
  this._nameText.setColor('#00ff00');
}
```

### Custom Blind Banner
Modify `BossBlindBanner.ts`:
```typescript
private createVisuals(): void {
  // Different background per blind type
  const colors = {
    character_seal: 0x330000,
    blind_tiles: 0x000033,
    // ... more types
  };

  this._background.setFillStyle(colors[this._bossBlind.type]);
}
```

## Performance Notes

1. **Blind Initialization**: Only called once at boss round start
2. **Effect Checks**: Called frequently - keep logic simple
3. **Ability Activation**: Called every turn - avoid heavy operations
4. **UI Updates**: Use Phaser tweens for smooth animations

## Troubleshooting

### Boss Round Not Triggering
- Check `GameScene.ts` line 626: `if (nextRound % 3 === 0)`
- Verify `BossGameScene` is registered in `main.ts`

### Blind Effect Not Working
- Check `BossRound.canWinWithBlind()` is called before scoring
- Verify blind initialization in `BossGameScene.initializeGameState()`
- Add console.log in effect methods

### Boss Health Not Decreasing
- Check `BossGameScene.onPlayHandClicked()` calls `takeDamage()`
- Verify damage calculation: `damage = score / 10`
- Check `_boss.health` is synced with `_bossHealthBar.currentHealth`

### Abilities Not Triggering
- Check cooldown values (shouldn't be 0 initially)
- Verify `processTurn()` is called after each play
- Add logging to `processBossAbilities()`

## API Reference

### BossRound Methods
- `startBossRound()` - Initialize boss round
- `processTurn()` - Process abilities and cooldowns
- `damagePlayer(amount)` - Deal damage to player
- `damageBoss(amount)` - Deal damage to boss
- `canWinWithBlind(tiles, fans)` - Validate win
- `isTileDebuffed(tile)` - Check debuff status
- `getBossRewards()` - Get rewards on victory

### BossHealthBar Methods
- `setHealth(current, animate)` - Update health
- `takeDamage(amount)` - Deal damage with animation
- `heal(amount)` - Heal boss with effect
- `setPhase(phase)` - Update phase indicator
- `showEntrance()` - Play entrance animation
- `showDefeat()` - Play defeat animation

### BossBlindBanner Methods
- `showBlind(blind)` - Show banner with blind
- `hide()` - Hide banner
- `flash()` - Flash effect for emphasis
- `updateDescription(text)` - Update dynamic text
