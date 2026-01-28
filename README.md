# HU! 🀄

A roguelike mahjong deck-builder inspired by Balatro. Build your hand, score big combos, collect powerful God Tiles, and chase the ultimate HU!

## Concept

Take the addictive roguelike deck-building loop of Balatro and reimagine it with Mahjong mechanics. Instead of poker hands, you form mahjong winning patterns (番型). Instead of Jokers, you collect God Tiles (神牌) that modify your scoring in wild ways.

## Gameplay

### Core Loop
1. **Play**: You have 14 mahjong tiles. Form valid combinations (melds + pair) to score points
2. **Score**: Points are calculated based on the fan (番) pattern you form — harder patterns score more
3. **Survive**: Hit the target score to advance to the next round
4. **Shop**: Between rounds, buy God Tiles, Flower Cards, and upgrades
5. **Repeat**: Rounds get harder. How far can you go?

### Key Systems

- **Fan Patterns (番型)** — Mahjong hand patterns as scoring tiers (like poker hands in Balatro)
  - Chicken Hand → All Sequences → All Triplets → Half Flush → Full Flush → Seven Pairs → Thirteen Orphans...
  - Each has base chips × multiplier

- **God Tiles (神牌)** — Passive effect cards (like Jokers)
  - 🀀 East Wind Master: ×2 mult when hand contains wind tiles
  - 💎 Flush Expert: +30 chips for same-suit tiles
  - 🌙 Moonlight Beauty: ×3 mult for Seven Pairs
  - 🔥 Kong Bloom: Bonus score when you have a kong

- **Flower Cards (花牌)** — Consumables (like Tarot/Planet cards)
  - Transform tiles in your hand
  - Upgrade fan pattern base scores
  - Reroll your draw

- **Boss Rounds** — Special restrictions
  - "No Character tiles allowed"
  - "All tiles face down"
  - "Must score with pairs only"

## Tech Stack

- **Engine**: Phaser 3
- **Language**: TypeScript
- **Build**: Vite
- **Target**: YouTube Playables (HTML5, mobile-first)

## Getting Started

```bash
cd /Users/zhilongzheng/Projects/hu
npm install
npm run dev
```

## Project Structure

```
hu/
├── src/
│   ├── main.ts              # Entry point
│   ├── scenes/
│   │   ├── BootScene.ts     # Asset loading
│   │   ├── MenuScene.ts     # Main menu
│   │   ├── GameScene.ts     # Core gameplay
│   │   ├── ShopScene.ts     # Between-round shop
│   │   └── GameOverScene.ts # Run end screen
│   ├── core/
│   │   ├── Tile.ts          # Mahjong tile definition
│   │   ├── Hand.ts          # Hand management
│   │   ├── FanEvaluator.ts  # Winning pattern detection
│   │   ├── Scoring.ts       # Score calculation
│   │   └── Round.ts         # Round/blind management
│   ├── roguelike/
│   │   ├── GodTile.ts       # Passive effect cards
│   │   ├── FlowerCard.ts    # Consumable cards
│   │   ├── Shop.ts          # Shop logic
│   │   └── BossRound.ts     # Boss round modifiers
│   ├── ui/
│   │   ├── TileSprite.ts    # Tile rendering
│   │   ├── HandDisplay.ts   # Hand layout
│   │   ├── ScorePopup.ts    # Score animations
│   │   └── ShopUI.ts        # Shop interface
│   └── data/
│       ├── fans.ts          # Fan pattern definitions
│       ├── godTiles.ts      # God Tile catalog
│       └── flowerCards.ts   # Flower Card catalog
├── public/
│   └── assets/              # Sprites, sounds, fonts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
└── README.zh-CN.md
```

## License

TBD
