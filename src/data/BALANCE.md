# HU! Balance Documentation

**Game:** Balatro-style Mahjong Roguelike
**Engine:** Phaser 3 + TypeScript
**Last Updated:** 2026-01-28

---

## Table of Contents

1. [Core Scoring System](#core-scoring-system)
2. [Fan Patterns](#fan-patterns)
3. [Blind Progression](#blind-progression)
4. [Gold Economy](#gold-economy)
5. [God Tiles](#god-tiles)
6. [Flower Cards](#flower-cards)
7. [Boss Encounters](#boss-encounters)
8. [Balance Philosophy](#balance-philosophy)

---

## Core Scoring System

### Formula
```
Final Score = Total Chips × Total Mult
Where:
  Total Chips = Base Chips (from fans) + Bonus Chips (from tiles) + God Tile modifiers
  Total Mult = (Base Mult × multipliers) + additions
```

### Tile Chip Values
| Tile Type | Chips | Examples |
|-----------|-------|----------|
| Number tiles (2-8) | **5** | 2万, 5条, 7筒 |
| Terminal tiles (1,9) | **8** | 1万, 9条 |
| Honor tiles (winds/dragons) | **10** | 东, 南, 红中, 发财 |

**Reasoning:** Honor and terminal tiles are harder to use in sequences, so they provide bonus chips to compensate.

---

## Fan Patterns

Fan patterns are the core scoring mechanism. Each fan contributes both chips and mult based on its point value.

### Fan → Chips/Mult Mapping

| Fan Points | Base Chips | Base Mult | Difficulty |
|------------|------------|-----------|------------|
| 1番 | **10** | **1** | Trivial |
| 2番 | **20** | **2** | Easy |
| 4番 | **30** | **2** | Medium |
| 6番 | **40** | **3** | Medium-Hard |
| 8番 | **50** | **4** | Hard |
| 12番 | **60** | **5** | Hard |
| 16番 | **80** | **6** | Very Hard |
| 24番 | **100** | **8** | Expert |
| 32番 | **150** | **10** | Expert |
| 48番 | **200** | **12** | Master |
| 64番 | **300** | **15** | Yakuman |
| 88番 | **500** | **20** | Double Yakuman |

### Standard Fans (Current Values)

#### Basic Fans (1-2番) - Early Game
| Fan Name | Points | Chips | Mult | Description |
|----------|--------|-------|------|-------------|
| 胡牌 (Basic Win) | **1** | 10 | 1 | Base win |
| 平和 (All Chow) | **2** | 20 | 2 | 4 chows + 1 pair, closed |
| 一气通贯 (Pure Straight) | **2** | 20 | 2 | 123-456-789 same suit |
| 三色同顺 (Mixed Straight) | **2** | 20 | 2 | Same sequence in 3 suits |

**Target:** With basic hand (13 tiles × 5-10 chips avg) + simple fan, should score ~150-250 points.

#### Mid-Level Fans (4-8番) - Mid Game
| Fan Name | Points | Chips | Mult | Description |
|----------|--------|-------|------|-------------|
| 七对 (Seven Pairs) | **4** | 30 | 2 | 7 pairs |
| 三暗刻 (3 Concealed Triplets) | **4** | 30 | 2 | 3 concealed pongs |
| 对对和 (All Triplets) | **6** | 40 | 3 | All pongs/kongs |
| 混一色 (Half Flush) | **6** | 40 | 3 | 1 suit + honors |
| 小三元 (Little Dragons) | **6** | 40 | 3 | 2 dragon pongs + 1 pair |
| 混老头 (All Terminals/Honors) | **8** | 50 | 4 | Only 1/9/honors |

**Target:** Should score ~300-600 points with decent tile chips.

#### High-Level Fans (12-32番) - Late Game
| Fan Name | Points | Chips | Mult | Description |
|----------|--------|-------|------|-------------|
| 清一色 (Full Flush) | **24** | 100 | 8 | Single suit only |
| 大三元 (Big Dragons) | **24** | 100 | 8 | All 3 dragons as pongs |
| 小四喜 (Little Winds) | **24** | 100 | 8 | 3 wind pongs + 1 pair |
| 四暗刻 (4 Concealed Triplets) | **32** | 150 | 10 | 4 concealed pongs |

**Target:** Should score ~800-1500 points.

#### Yakuman Fans (64-88番) - Extreme
| Fan Name | Points | Chips | Mult | Description |
|----------|--------|-------|------|-------------|
| 字一色 (All Honors) | **64** | 300 | 15 | Only wind/dragon tiles |
| 清老头 (All Terminals) | **64** | 300 | 15 | Only 1s and 9s |
| 大四喜 (Big Winds) | **64** | 300 | 15 | All 4 winds as pongs |
| 绿一色 (All Green) | **64** | 300 | 15 | Only green tiles |
| 九莲宝灯 (Nine Gates) | **88** | 500 | 20 | 1112345678999 + any |
| 四暗刻单骑 (4 Concealed + Pair Wait) | **88** | 500 | 20 | 4 concealed pongs, pair wait |
| 国士无双 (Thirteen Orphans) | **88** | 500 | 20 | All 13 terminals/honors |

**Target:** Should score ~2000-5000+ points.

### Bonus Fans (Additive)
| Bonus | Points | Chips | Mult |
|-------|--------|-------|------|
| 自摸 (Self-Draw) | **1** | 10 | 1 |
| 门清 (Closed Hand) | **1** | 10 | 1 |
| 断幺九 (All Simples) | **1** | 10 | 1 |
| 一发 (First Turn) | **1** | 10 | 1 |
| 岭上开花 (Kong Draw) | **1** | 10 | 1 |
| 抢杠 (Robbing Kong) | **1** | 10 | 1 |
| 海底摸月 (Last Tile Self-Draw) | **1** | 10 | 1 |
| 河底捞鱼 (Last Tile Discard) | **1** | 10 | 1 |

---

## Blind Progression

Blinds are the score targets players must beat. Each ante has 3 blinds: Small, Big, Boss.

### Current Scaling

#### Small Blind
```
Target Score = 300 + (Ante - 1) × 150
Gold Reward = 3 + Ante
Bonus Gold = 0.01 per point over target
Hands: 4 | Discards: 3
```

| Ante | Target Score | Gold Reward | Required Strategy |
|------|-------------|-------------|-------------------|
| 1 | **300** | 4 | Basic fans (平和, 一气通贯) |
| 2 | **450** | 5 | Multiple basic fans or 1 mid-tier |
| 3 | **600** | 6 | Mid-tier fans (七对, 对对和) |
| 4 | **750** | 7 | Half Flush level |
| 5 | **900** | 8 | Need God Tiles or high fans |
| 6 | **1050** | 9 | Late game patterns |
| 7 | **1200** | 10 | Expert play required |
| 8 | **1350** | 11 | Yakuman territory |

#### Big Blind
```
Target Score = 450 + (Ante - 1) × 225
Gold Reward = 4 + Ante × 1.5
Bonus Gold = 0.02 per point over target
Hands: 4 | Discards: 3
```

| Ante | Target Score | Gold Reward | Required Strategy |
|------|-------------|-------------|-------------------|
| 1 | **450** | 5.5 | Multiple fans or God Tiles |
| 2 | **675** | 7 | Half Flush or stacked bonuses |
| 3 | **900** | 8.5 | Full Flush territory |
| 4 | **1125** | 10 | High-level combos |
| 5 | **1350** | 11.5 | Expert synergies |
| 6 | **1575** | 13 | Near-Yakuman |
| 7 | **1800** | 14.5 | Yakuman level |
| 8 | **2025** | 16 | Perfect builds only |

#### Boss Blind
```
Target Score = 600 + (Ante - 1) × 300
Gold Reward = 10 + Ante × 2
Bonus Gold = 0.05 per point over target
Hands: 5 | Discards: 4
Boss Fight: Deal damage = Final Score ÷ 10
```

| Ante | Target Score | Gold Reward | Boss Health | Required Strategy |
|------|-------------|-------------|-------------|-------------------|
| 1 | **600** | 12 | 150 | Consistent mid-tier plays |
| 2 | **900** | 14 | 225 | Half Flush + God Tiles |
| 3 | **1200** | 16 | 300 | Full Flush level |
| 4 | **1500** | 18 | 400 | Multiple powerful combos |
| 5 | **1800** | 20 | 500 | Expert build synergy |
| 6 | **2100** | 22 | 650 | Yakuman-level plays |
| 7 | **2400** | 24 | 800 | Perfect execution |
| 8 | **2700** | 26 | 1000 | Absolute mastery |

**Reasoning:** Exponential scaling encourages building powerful synergies. Early antes teach patterns, mid-game requires strategy, late-game demands mastery.

---

## Gold Economy

### Starting Gold
- **Current: 0** (relies on blind rewards)
- **Proposed: 4** - allows buying 1-2 common items immediately

### Gold Sources
| Source | Amount | Notes |
|--------|--------|-------|
| Small Blind Win | 3 + Ante | Linear scaling |
| Big Blind Win | 4 + Ante × 1.5 | Better rewards |
| Boss Blind Win | 10 + Ante × 2 | Major rewards |
| Bonus (Overkill) | 0.01-0.05 × excess | Small, Big, Boss |
| God Tile: 财神一万 | +1 per win | Common effect |
| God Tile: 五筒聚宝 | +1 per pong | Rare effect |
| God Tile: 发财神牌 | ×2 gold | Epic multiplier |
| God Tile: 七万星辰 | +1 per chow | Epic effect |
| Selling God Tiles | 50% of cost | Shop mechanic |

### Gold Sinks
| Item Type | Cost Range | Notes |
|-----------|------------|-------|
| Common God Tiles | **2-3** | Early game accessible |
| Rare God Tiles | **5-7** | Mid-game power spike |
| Epic God Tiles | **11-14** | Late-game build enablers |
| Legendary God Tiles | **25-30** | Run-defining |
| Common Flower Cards | **3-5** | Utility cards |
| Rare Flower Cards | **5-8** | Tactical cards |
| Epic Flower Cards | **7-10** | Game-changers |
| Legendary Flower Cards | **12-15** | Ultimate power |
| Shop Reroll | **2, 4, 6, 8...** | Increasing cost |

### Gold Progression Target
| After Ante | Expected Gold | Can Afford |
|------------|--------------|------------|
| 1 | 20-25 | 3-4 common, 1 rare |
| 2 | 35-45 | Mix of rare/common or 1 epic |
| 3 | 55-70 | 1 epic + commons |
| 4 | 80-100 | Multiple epics |
| 5 | 110-140 | 1 legendary or 2 epics |
| 6 | 150-190 | Legendary + support |
| 7 | 200-250 | Powerful endgame build |
| 8 | 260+ | Max optimization |

**Reasoning:** Gold should feel scarce early (meaningful choices) but allow build expression in late game.

---

## God Tiles

God Tiles are permanent upgrades that modify scoring. Balanced by rarity and cost.

### Common (2-3 Gold)
| Name | Cost | Effect | Balance Notes |
|------|------|--------|---------------|
| 财神一万 | **2** | +1 gold per win | Economic boost, always useful |
| 红中神牌 | **3** | +1 mult if hand has red dragon | Conditional, requires red dragons |
| 三条幸运 | **2** | +30 chips if hand has 3条 | Simple chip boost |
| 八筒发财 | **3** | +5 chips per 8筒 in hand | Scales with copies |

**Philosophy:** Common tiles should be universally useful but not game-breaking. +1-2 mult or +20-50 chips is appropriate.

### Rare (5-7 Gold)
| Name | Cost | Effect | Balance Notes |
|------|------|--------|---------------|
| 东风神牌 | **5** | ×2 mult if hand has wind tiles | Strong multiplier, requires winds |
| 九万霸主 | **6** | +2 mult for terminal-based fans | Synergizes with specific builds |
| 五筒聚宝 | **7** | +1 gold per pong | Economic + build synergy |
| 九条天尊 | **6** | ×1.5 mult for All Triplets fan | Build-specific multiplier |
| 白板清心 | **7** | +3 mult for Seven Pairs | Rewards specific pattern |
| 南风炽热 | **5** | +8 chips per honor tile | Encourages honor-heavy builds |

**Philosophy:** Rare tiles should enable specific strategies. Multipliers of 1.5-2× or +2-4 mult are appropriate.

### Epic (11-14 Gold)
| Name | Cost | Effect | Balance Notes |
|------|------|--------|---------------|
| 发财神牌 | **12** | ×2 gold earned, +50 chips if green dragon | Major economic boost |
| 一条龙神 | **14** | +4 mult for straight patterns | Build enabler |
| 七万星辰 | **13** | +5 mult for Half Flush, +1 gold per chow | Dual benefit |
| 六筒顺利 | **11** | ×2 chips if any chows | Powerful multiplier |

**Philosophy:** Epic tiles should significantly boost a build archetype. Can double resources or add +4-6 mult.

### Legendary (25-30 Gold)
| Name | Cost | Effect | Balance Notes |
|------|------|--------|---------------|
| 白板创世 | **25** | +100 chips, +8 mult for Full Flush | Wildcard concept, massive boost |
| 万中之王 | **30** | +10 chips per 万 tile, +3 mult always | Universal powerhouse |
| 红中至尊 | **28** | +20 chips per dragon, +10 mult for All Honors | Dragon-focused |

**Philosophy:** Legendary tiles are run-defining. They should cost most of your economy but enable victory.

---

## Flower Cards

Flower Cards are consumable items used during play. Balanced by rarity, cost, and one-time usage.

### Bamboo - Draw Manipulation (Common-Rare)
| Name | Rarity | Cost | Effect | Balance Notes |
|------|--------|------|--------|---------------|
| 翠竹引路 | Common | **3** | Choose 1 of 3 drawn tiles | Improves consistency |
| 竹林听风 | Rare | **5** | +1 discard | Extra flexibility |
| 青竹直上 | Rare | **6** | Transform 1 tile → 9 | Setup combo pieces |

**Cost Assessment:** Fair for utility. Not overpowered but helpful.

### Plum - Defense (Common-Epic)
| Name | Rarity | Cost | Effect | Balance Notes |
|------|--------|------|--------|---------------|
| 寒梅傲雪 | Common | **4** | Boss damage -1 this round | Boss-specific |
| 梅花三弄 | Epic | **7** | Negate next boss attack | Powerful save |

**Cost Assessment:** Epic cost is low for full attack negation. **Should be 9-10 gold.**

### Orchid - Buffs (Common-Legendary)
| Name | Rarity | Cost | Effect | Balance Notes |
|------|--------|------|--------|---------------|
| 幽兰吐芳 | Common | **4** | +2 fan next win | Good value |
| 兰花拂月 | Rare | **8** | ×1.5 fan multiplier this game | **Too cheap. Should be 10-12.** |
| 空谷幽兰 | Legendary | **12** | Next God Tile free | **Too cheap. Should be 18-20.** |
| 兰心蕙质 | Epic | **10** | +1 hand | Strong but fair |

**Cost Assessment:** Powerful buffs are undercosted.

### Chrysanthemum - Special/Transform (Common-Legendary)
| Name | Rarity | Cost | Effect | Balance Notes |
|------|--------|------|--------|---------------|
| 秋菊傲霜 | Common | **5** | Clear all debuffs | Boss utility |
| 菊映秋霜 | Common | **4** | Transform tile ±1 value | Fine tuning |
| 金菊流光 | Rare | **7** | Transform tiles → 5 | Combo setup |
| 菊花残月 | Epic | **10** | Redraw entire hand | Powerful reset |
| 九九重阳 | Legendary | **15** | Transform all 9s → 1s | **Too cheap for legendary. Should be 12-14 (niche).** |

**Cost Assessment:** Transform effects could be adjusted.

---

## Boss Encounters

Bosses appear at the end of each ante with special mechanics.

### Boss Health Scaling
```
Boss Health = Base × Ante Scaling
Ante 1: 150 HP
Ante 2: 225 HP
Ante 3: 300 HP
Ante 4: 400 HP
Ante 5: 500 HP
Ante 6: 650 HP
Ante 7: 800 HP
Ante 8: 1000 HP
```

**Damage Dealt:** Final Score ÷ 10

**Target Damage Per Hand:** Boss HP ÷ 5 hands = 30-200 per hand average
**Required Score Per Hand:** 300-2000

### Boss Abilities
- **Cooldown System:** Abilities trigger every N turns
- **Damage to Player:** Boss attacks reduce player HP (starts at 100)
- **Phase Transitions:** Boss gets stronger at 50% and 25% HP

**Current Implementation:** Basic framework exists in BossRound.ts

**Balance Needs:**
- Specific boss catalog with unique abilities
- Blind effects that restrict player options
- Scaling difficulty with meaningful phase changes

### Boss Rewards
```
Gold: 10 + Ante × 2
Bonus Gold: 0.05 × excess score
Potential: God Tile or Flower Card drops
```

---

## Balance Philosophy

### Design Pillars

1. **Learnable Early Game**
   - Ante 1-2 should be clearable with basic mahjong knowledge
   - Simple fans like 平和 and 一气通贯 are sufficient
   - Common God Tiles provide small but noticeable boosts
   - Starting gold allows experimentation

2. **Strategic Mid Game**
   - Ante 3-5 requires build planning
   - Players should commit to archetypes (Triplets, Chows, Honors, Flush)
   - God Tiles become force multipliers for chosen strategies
   - Gold economy creates meaningful trade-offs

3. **Mastery Late Game**
   - Ante 6+ demands perfect synergy between fans and God Tiles
   - Yakuman-level plays become necessary
   - Legendary God Tiles enable "final form" builds
   - Requires both skill and smart economy management

### Progression Curve

```
Ante 1-2: Learn patterns, build economy (300-900 target)
Ante 3-4: Develop synergies, power spike (900-1500 target)
Ante 5-6: Optimize builds, refine strategy (1500-2400 target)
Ante 7-8: Execute perfect plays, master level (2400+ target)
```

### Anti-Patterns to Avoid

- **Runaway Scaling:** No single God Tile should trivialize the game
- **Dead Buys:** Every item should be useful in some build
- **Forced Strategies:** Multiple viable archetypes should exist
- **Impossible Spikes:** Difficulty should scale smoothly, not spike suddenly
- **Economic Lockout:** Players shouldn't be stuck unable to afford anything

### Balance Iteration

When adjusting values:
1. **Test Early Game First:** Can a new player clear Ante 1-2?
2. **Check Economic Flow:** Is gold income/spending balanced?
3. **Verify Build Diversity:** Are multiple strategies viable?
4. **Validate Scaling:** Does late game feel challenging but fair?

---

## Changelog

### 2026-01-28 - Initial Documentation
- Documented all current balance values
- Identified overcosted/undercosted items
- Established scaling curves and targets
- Defined balance philosophy

### Future Balance Passes
- [ ] Tune Flower Card costs (Orchid cards need increases)
- [ ] Add starting gold (proposed: 4)
- [ ] Implement boss ability catalog
- [ ] Test Ante 6-8 difficulty curve
- [ ] Validate economic progression
- [ ] Add more God Tile variety for underserved archetypes

---

*This document should be updated with every balance change.*
