# Flower Cards System — Implementation Complete

## Overview
Flower Cards are consumable items in HU! (Balatro-style mahjong roguelike) that provide various strategic effects. Players can hold up to 3 flower cards at a time and use them during gameplay.

## Core Components

### 1. FlowerCard Base Class (`src/roguelike/FlowerCard.ts`)
- **FlowerCardType enum**: BAMBOO, PLUM, ORCHID, CHRYSANTHEMUM
- **FlowerCardEffectContext interface**: Provides game state to effects
  - Hand, selected tiles, draw/discard piles
  - Round state (hands/discards remaining)
  - Buffs/debuffs tracking
  - Callbacks for complex actions (redraw, clear debuffs, draw from options)
- **FlowerEffect interface**: Effect definition with name, description, and async effect function
- **FlowerCard class**:
  - Flower symbol emoji display
  - Can play validation
  - Async effect execution
  - Cost and rarity tracking

### 2. Flower Card Catalog (`src/data/flowerCards.ts`)

#### Bamboo Cards (Draw Manipulation)
1. **翠竹引路** (Common, 3金) - Choose from 3 tiles when drawing
2. **竹林听风** (Rare, 5金) - +1 discard chance
3. **青竹直上** (Rare, 6金) - Transform selected tile to value 9

#### Plum Cards (Defense)
1. **寒梅傲雪** (Common, 4金) - Boss attack damage -1
2. **梅花三弄** (Epic, 7金) - Next boss attack immune

#### Orchid Cards (Buffs)
1. **幽兰吐芳** (Common, 4金) - +2 fan points on next win
2. **兰花拂月** (Rare, 8金) - All fan patterns ×1.5 multiplier
3. **空谷幽兰** (Legendary, 12金) - Next God Tile free
4. **兰心蕙质** (Epic, 10金) - +1 hand play chance

#### Chrysanthemum Cards (Transform/Special)
1. **秋菊傲霜** (Common, 5金) - Clear all debuffs
2. **菊花残月** (Epic, 10金) - Redraw entire hand
3. **九九重阳** (Legendary, 15金) - Transform all 9-tiles to 1-tiles
4. **菊映秋霜** (Common, 4金) - Transform selected tile to adjacent value
5. **金菊流光** (Rare, 7金) - Transform selected tiles to 5

### 3. FlowerCardDisplay UI (`src/ui/FlowerCardDisplay.ts`)
- Horizontal card display below hand
- Max 3 card slots with empty slot indicators
- Click to select/deselect cards
- Hover tooltips with full card information
- Rarity-colored borders (white/green/purple/gold)
- Flower emoji indicators
- Usage animations:
  - Glow and scale up effect
  - Fade out and float upward
  - Particle burst on use
- Card addition/removal with smooth transitions

### 4. FlowerCardManager (`src/roguelike/FlowerCardManager.ts`)
- Inventory management (max 3 cards)
- Buff/debuff tracking:
  - Damage reduction (defense)
  - Next attack immunity (defense)
  - Bonus fan points (scoring)
  - Fan multiplier (scoring)
  - Debuff list
  - Next God Tile free (shop)
- Card usage with context building
- Buff application to scoring
- Damage reduction calculation
- Serialization for save/load

### 5. GameScene Integration (`src/scenes/GameScene.ts`)
- FlowerCardDisplay positioned below hand
- "用花牌" (Use Flower Card) button
- Flower card selection and usage flow
- Context building for effects:
  - Hand redraw callback
  - Debuff clearing callback
  - Tile selection support
- State updates after card use:
  - Hands/discards remaining
  - Hand display refresh
  - Card removal animation
- FlowerCardManager passed between scenes

## Gameplay Flow

1. **Acquisition**: Players receive flower cards from shops or rewards
2. **Selection**: Click on a flower card in the display to select it
3. **Usage**:
   - For transform cards: Select tiles in hand first
   - Click "用花牌" button
   - Card effect applies immediately
   - Card is consumed and removed with animation
4. **Effects**:
   - Transform effects modify tiles directly
   - Buff effects apply to next scoring/shop
   - Defense effects track for boss encounters
   - Special effects trigger callbacks

## Visual Design

### Card Display
- **Width**: 100px
- **Height**: 140px
- **Spacing**: 15px between cards
- **Elements**:
  - Flower emoji (top, 32px)
  - Card name (center, wrapped)
  - Cost in gold (bottom)
  - Rarity indicator (top-left corner)
  - Rarity-colored border

### Animations
- **Selection**: Thicker border, highlighted background
- **Usage**: Scale up → glow → fade out with upward movement
- **Particles**: 12 particles bursting outward on use

### Color Scheme
- **Common**: White (#ffffff)
- **Rare**: Green (#00ff00)
- **Epic**: Purple (#8a2be2)
- **Legendary**: Gold (#ffd700)

## Balance Considerations

### Cost Tiers
- **Common**: 3-5 gold
- **Rare**: 5-8 gold
- **Epic**: 7-10 gold
- **Legendary**: 12-15 gold

### Effect Power Levels
- **Common**: Small bonuses (+1 discard, +2 fan)
- **Rare**: Moderate effects (+1.5x multiplier, +1 hand)
- **Epic**: Strong effects (immunity, redraw)
- **Legendary**: Game-changing effects (free God Tile, mass transformation)

## Future Enhancements

Potential additions:
1. **Flower card drops** from completing rounds
2. **Flower card upgrades** (enhance existing cards)
3. **Combo effects** (using multiple flower cards together)
4. **Conditional effects** (triggers based on hand composition)
5. **Persistent flower cards** (multi-use with cooldowns)
6. **Flower card synergies** with God Tiles

## Technical Notes

- All effects use async functions to support complex interactions
- FlowerCardEffectContext provides mutable state for effects
- Manager tracks persistent buffs across rounds
- UI animations use Phaser tweens and particle emitters
- Card selection state managed by FlowerCardDisplay
- Helper function `createFlowerCardFromData` for instantiation

## Testing

To test the system:
1. Start a new game
2. Check flower card display below hand (should show 1 starter card)
3. Select a flower card by clicking it
4. Click "用花牌" to use the selected card
5. Observe effect application and card removal animation
6. Advance to shop to see flower card manager persistence

## Files Modified/Created

### Created
- `src/ui/FlowerCardDisplay.ts` - UI component
- `src/roguelike/FlowerCardManager.ts` - Manager class
- `FLOWER_CARDS_SYSTEM.md` - This documentation

### Modified
- `src/roguelike/FlowerCard.ts` - Enhanced with context and async support
- `src/data/flowerCards.ts` - Implemented all effects + 5 new cards
- `src/scenes/GameScene.ts` - Integrated flower card system

## Completion Status

✅ All tasks completed:
1. Enhanced FlowerCard base class with proper typing
2. Implemented effect logic for all existing cards
3. Added 5 new creative flower cards
4. Created FlowerCardDisplay UI component
5. Created FlowerCardManager for inventory
6. Integrated into GameScene
7. Added usage animations and effects

The Flower Cards system is now fully functional and ready for gameplay!
