# Card Crawler — Game Mechanics

Solo roguelike deck-builder. Fight through 3 floors, build your deck, defeat the boss.

---

## Core Loop

```
Start Run → Choose Map Node → Process Node → Advance → Repeat → Boss → Win/Lose
```

```
┌──────────────────────────────────────────────────────────┐
│  1. CHOOSE  → Pick map node (Combat / Shop / Rest)       │
│  2. RESOLVE → Fight enemy OR buy cards OR heal            │
│  3. REWARD  → Gold + new card choice                      │
│  4. BUILD   → Deck evolves, new synergies emerge          │
│  5. REPEAT  → Next node, higher stakes                    │
└──────────────────────────────────────────────────────────┘
```

---

## State Machine

```
LOBBY ──start_run──→ RUN_ACTIVE ──choose_node──→ MAP_SELECT
                                                    │
                          ┌─────────────────────────┤
                          ↓                         ↓
                       COMBAT ←──────────┐       SHOP / REST
                          │              │          │
                    ┌─────┴─────┐        │          │
                    ↓           ↓        │          │
               DRAW_PHASE  ENEMY_PHASE   │          │
                    │           │        │          │
                    ↓           │        │          │
               PLAY_PHASE ─────┘        │          │
                    │                    │          │
                 (enemy dead)            │          │
                    ↓                    │          │
                 REWARD ─────────→ MAP_SELECT ←─────┘
                                        │
                                   (all nodes done)
                                        ↓
                                   FLOOR_ADVANCE
                                        │
                                   (floor 3 boss dead?)
                                   ↓            ↓
                                 WIN         next floor
```

**States:**
```
STATE_LOBBY       = 0
STATE_RUN_ACTIVE  = 1
STATE_MAP_SELECT  = 2
STATE_COMBAT      = 3
STATE_SHOP        = 4
STATE_REST        = 5
STATE_REWARD      = 6
STATE_FINISHED    = 7
```

---

## Player Starting Stats

| Stat | Value | Engine Component |
|------|-------|-----------------|
| HP | 80 | Health |
| Max HP | 80 | Health |
| ATK bonus | 0 | Attack |
| DEF bonus | 0 | Defense |
| Energy / turn | 3 | Energy |
| Block | 0 (resets) | Dynamic field |
| Gold | 50 | Dynamic field |
| Floor | 1 | MapProgress |

---

## Map System

### Branching Paths (2 choices per floor)

```
FLOOR 1:  [Combat: Goblin]  → [Combat: Slime | Rest]  → [Shop]
FLOOR 2:  [Combat: Skeleton] → [Elite: Dark Knight | Combat: Orc] → [Shop]
FLOOR 3:  [BOSS: Dragon]
```

### Node Types

| Node | Effect | Reward |
|------|--------|--------|
| Combat | Fight enemy | Gold + choose 1 card from 3 |
| Elite | Fight hard enemy | Gold + card + **relic** |
| Shop | Buy/remove cards | — |
| Rest | Heal 30% max HP | — |
| Boss | Final fight | 🏆 Win the game |

---

## Card System

### Deck Flow

```
Draw Pile ──draw──→ Hand (5 cards) ──play──→ Discard Pile
     ↑                                           │
     └────────── shuffle when empty ──────────────┘
```

### Starter Deck (10 cards)

| Card | Type | Cost | Effect | ×Count |
|------|------|:----:|--------|:------:|
| Strike | ATK | 1 | Deal 6 damage | 5 |
| Defend | SKILL | 1 | Gain 5 block | 4 |
| Bash | ATK | 2 | Deal 10 damage | 1 |

### Reward Card Pool (15 cards)

#### Attack Cards

| Card | Cost | Effect |
|------|:----:|--------|
| Heavy Blow | 2 | Deal 14 damage |
| Poison Stab | 1 | Deal 4 dmg + 3 poison |
| Whirlwind | 1 | Deal 5 dmg to ALL enemies |
| Rampage | 1 | Deal 8 dmg, +4 each play this combat |
| Execute | 2 | Deal 10 dmg (25 if enemy <30% HP) |

#### Skill Cards

| Card | Cost | Effect |
|------|:----:|--------|
| Shield Wall | 2 | Gain 12 block |
| Heal | 1 | Restore 8 HP |
| Dodge | 0 | Gain 3 block |
| Weaken | 1 | Enemy ATK -3 for 2 turns |
| Adrenaline | 0 | Draw 2 cards + 1 energy |

#### Power Cards (permanent, play once per combat)

| Card | Cost | Effect |
|------|:----:|--------|
| Berserk | 2 | +3 ATK permanently |
| Iron Skin | 2 | +3 DEF permanently |
| Regeneration | 2 | Heal 2 HP per turn |
| Thorns | 1 | Deal 3 dmg to attacker when hit |
| Fury | 2 | Draw 1 extra card per turn |

### Card Reward Selection
After combat: player sees **3 random cards**, picks **1** (or skip).

---

## Combat System

### Turn Flow

```
PLAYER TURN (batched via PTB):
  1. Draw Phase     → Draw 5 cards, restore 3 energy, reset block
  2. Play Phase     → Play cards (cost energy), apply effects
  3. End Turn       → Discard hand, tick status effects

ENEMY TURN (automatic, same TX):
  4. Enemy attacks  → ATK damage, reduced by player block + DEF
  5. HP checks      → Player dead? → Game Over
                    → Enemy dead? → Rewards
```

### Damage Formula

```
damage = max(0, ATK + bonuses - target_block - target_DEF)
```

- **Block** resets to 0 each turn
- **DEF** is permanent (Iron Skin, relics)
- **Bonuses**: Berserk (+3 ATK), Whetstone relic (+2 ATK)

### Status Effects

| Effect | Duration | Action Per Turn |
|--------|----------|-----------------|
| Poison | Stacking | Deal N dmg to enemy, reduce by 1 |
| Weaken | N turns | Enemy ATK -3 |
| Regen | Permanent | Heal 2 HP |
| Thorns | Permanent | 3 dmg to attacker |

---

## Enemy Design

### Regular Enemies

| Enemy | Floor | HP | ATK | Gold |
|-------|:-----:|:--:|:---:|:----:|
| Goblin | 1 | 20 | 5 | 20 |
| Slime | 1 | 30 | 4 | 25 |
| Skeleton | 2 | 40 | 8 | 30 |
| Orc | 2 | 50 | 7 | 35 |

### Elite

| Enemy | Floor | HP | ATK | Gold | Special |
|-------|:-----:|:--:|:---:|:----:|---------|
| Dark Knight | 2 | 60 | 12 | 50 | +2 ATK every 3 turns |

### Boss

| Enemy | Floor | HP | ATK | Special |
|-------|:-----:|:--:|:---:|---------|
| Dragon | 3 | 100 | 15 | +3 ATK each turn |

---

## Relic System

Passive bonuses for the entire run. Max **3 relics**.

| Relic | Effect | Shop Price |
|-------|--------|:----------:|
| Whetstone | +2 ATK to all attacks | 100g |
| Iron Ring | +2 DEF permanently | 100g |
| Energy Potion | +1 energy/turn | 150g |
| Healing Crystal | +5 HP after combat | 80g |
| Lucky Coin | +15 gold from combat | 60g |
| Thick Skin | +10 max HP (heal 10) | 80g |

---

## Shop System

Each shop offers:
- **2 random cards** — 50-75 gold
- **1 random relic** — 60-150 gold
- **Card removal** — 50 gold

---

## Economy

### Gold Sources
| Source | Amount |
|--------|--------|
| Starting | 50 |
| Regular combat | 20-35 |
| Elite combat | 50 |
| Lucky Coin bonus | +15/combat |

### Gold Sinks
| Sink | Cost |
|------|------|
| Buy card | 50-75 |
| Buy relic | 60-150 |
| Remove card | 50 |

Expected total gold per run: **~200-250** → enough for 3-4 purchases.

---

## PTB Transaction Patterns

### Combat Turn
```
PTB = [draw_phase(), play_card(0), play_card(2), play_card(4), end_player_turn()]
```

### Shop Visit
```
PTB = [shop_buy(card, id, 60), shop_buy(remove, idx, 50)]
```

### Rest
```
PTB = [rest()]
```

### Map Navigation
```
PTB = [choose_path(node)]
```

---

## Win / Lose

| Condition | Trigger |
|-----------|---------|
| **WIN** | Dragon HP ≤ 0 |
| **LOSE** | Player HP ≤ 0 |

---

## Build Archetypes (emergent)

| Build | Key Cards | Key Relics | Strategy |
|-------|-----------|------------|----------|
| Berserker | Berserk, Heavy Blow, Rampage | Whetstone | Stack ATK, kill fast |
| Turtle | Shield Wall, Iron Skin, Defend | Iron Ring | Block everything |
| Poison | Poison Stab, Thorns, Weaken | Healing Crystal | Chip + survive |
| Speedrun | Adrenaline, Fury, Execute | Energy Potion | Draw tons, play tons |
