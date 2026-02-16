# Tactics Ogre On-Chain — Game Design Document

## Overview

A **PvP tactical RPG** inspired by *Tactics Ogre*, fully on-chain. Each player builds a persistent squad by **recruiting units from a Tavern**, then creates or joins battle sessions. Before combat, both players **place units on their half** of a 2D grid. Turns alternate — each player spends **AP to move, attack, and use specials** with multiple units per turn. Win by **eliminating all enemy units** or forcing a **surrender**.

Units killed in battle suffer **permadeath** — they are permanently destroyed, giving every battle real stakes.

---

## Game Architecture — Two Layers

```
┌──────────────────────────────────────────────────────────────┐
│  METAGAME (Persistent, owned objects)                         │
│  • Player's Gold wallet (owned Entity with Gold component)   │
│  • Player's Squad roster (owned Entities — up to 6 units)    │
│  • Tavern (shared object — buy/recruit units)                │
└──────────────────────────────────────────────────────────────┘
                           ↓  player brings squad to battle
┌──────────────────────────────────────────────────────────────┐
│  BATTLE SESSION (Per-match shared objects)                    │
│  • World, Grid, TurnState, GameSession — all shared          │
│  • Battle Units — transferred from squad, shared for combat  │
│  • Alternating turns with AP budget                          │
└──────────────────────────────────────────────────────────────┘
```

Player squad entities are **owned** (persist across battles). When entering a battle, the player **transfers units to the session** (they become shared for PvP combat). Units that survive are **returned to the owner**. Units that die are **permanently destroyed**.

---

## MDA Analysis

### Mechanics → Dynamics → Aesthetics

| Mechanics | Dynamics That Emerge | Aesthetic Feeling |
|-----------|---------------------|-------------------|
| AP-gated multi-action turns | "Move+attack or use my special?" per unit | **Challenge** — scarcity forces hard choices |
| Tavern with unit costs + Gold | Squad composition metagame | **Discovery** — experimenting with team combos |
| Unit placement phase | Bluffing and counter-formations | **Competition** — reading your opponent |
| Elemental triangle | Targeting weaknesses, protecting yours | **Strategy** — matchup-based thinking |
| Surrender option | Cutting losses vs fighting to the end | **Tension** — psychological pressure |
| Elimination + permadeath | Focus fire vs spread damage, risk management | **Sensation** — high-stakes final kill |

---

## Metagame: Tavern & Squad

### Tavern (Global Shared Object)

Players start with **400 Gold** and recruit units from the Tavern.

| Unit Class | Cost | HP | ATK | DEF | Range | Speed | Element |
|------------|------|-----|-----|-----|-------|-------|---------|
| **Soldier** | 75 | 100 | 12 | 8 | 1 | 2 | Earth |
| **Knight** | 120 | 140 | 15 | 12 | 1 | 2 | Earth |
| **Archer** | 100 | 80 | 18 | 4 | 3 | 3 | Wind |
| **Wizard** | 110 | 70 | 22 | 3 | 2 | 2 | Fire |
| **Cleric** | 100 | 90 | 8 | 6 | 2 | 2 | Water |
| **Ninja** | 130 | 75 | 20 | 5 | 1 | 4 | Wind |

### Squad Rules

- **Roster** holds up to 6 units (owned entities, viewable by player)
- **Configurable units per battle** — session creator sets `max_units_per_player` (e.g., 2, 3, or 4)
- **Duplicate classes allowed** — you can recruit 3 Soldiers if you want
- **Permadeath** — units killed in battle are permanently destroyed
- Surviving units are returned to the player's roster after battle
- Must have at least 1 unit to enter a battle
- **No concurrent battles** — one battle at a time per player

### Unit Identity

- Players can **name their units** when recruiting (e.g., "Sir Lancelot")
- Names can be **edited** from the roster at any time
- Named units + permadeath = emotional attachment and real loss

### Selling Units

- Players can **sell units back at the Tavern** for **50% of the original cost** (rounded down)
- Sell prices: Soldier = 37, Knight = 60, Archer = 50, Wizard = 55, Cleric = 50, Ninja = 65
- This frees roster space and recovers some Gold

### Special Abilities (3 AP each)

| Class | Special | Effect |
|-------|---------|--------|
| Soldier | **Shield Wall** | +5 DEF for 2 turns (self) |
| Knight | **Heavy Strike** | 1.5× damage melee attack |
| Archer | **Piercing Shot** | Ignores target's DEF |
| Wizard | **Fireball** | Normal damage + Burn (3 dmg/turn for 2 turns) |
| Cleric | **Heal** | Restore 30 HP to ally within range |
| Ninja | **Backstab** | 1.5× damage, ignores range (teleport-strike) |

### Combat Rules

- **Movement:** 8-directional (including diagonals). Speed = max tiles per move action.
- **Attack range:** Manhattan distance (e.g., range 3 = any cell within 3 orthogonal steps).
- **Corpses:** Dead units stay on the grid as impassable corpses until end of battle. Their cell is blocked.
- **Placement minimum:** Players can place fewer than `max_units_per_player`. Both must `ready_up` to start.
- **Same-element damage:** 1.0× (neutral).

---

## Battle Flow — State Machine

```
create_session()          join_session()           both placed
    │                         │                        │
    ▼                         ▼                        ▼
  LOBBY ──────────────▶ LOBBY ──────────────▶ PLACEMENT ──────▶ COMBAT
  (P1 creates)         (P2 joins)            (each player       (alternating
                                              places 4 units     turns)
                                              on their half)
                                                                   │
                                              ┌────────────────────┤
                                              ▼                    ▼
                                          SURRENDER            ELIMINATION
                                              │                    │
                                              └──────▶ FINISHED ◀──┘
```

### Phase Details

**1. Lobby** — P1 calls `create_session(max_units_per_player)` (e.g., 4). P2 calls `join_session()`.

**2. Placement** — Grid is 8×8. P1 places units on rows 0–1 (bottom). P2 places on rows 6–7 (top). Placement is **public**. Each player places up to `max_units_per_player` units. Once both are done, either calls `ready_up()`. When both ready → COMBAT.

**3. Combat** — Simple turn mode (P1 → P2 → P1 → ...). Each turn:
1. Status effects tick on current player's units
2. Each unit gets **3 AP** (no carry-over from previous turns)
3. Player can act with any/all of their units in any order, spending each unit's AP independently
4. Player calls `end_turn()` when done (even if units have remaining AP) → advances turn to opponent

**4. End** — `surrender()` (only on your own turn) or last enemy unit eliminated → `FINISHED`.
- Surviving units from **both players** are returned to their owners
- Dead units are **permanently destroyed** (permadeath)
- Winner gets **+150 Gold**, Loser gets **+50 Gold**

---

## Balance Design

### Unit Cost vs Power

| Tier | Cost | Power Budget | Example |
|------|------|-------------|---------|
| Cheap | 50 | Low stats, basic ability | Soldier |
| Mid | 100–110 | Specialized role | Archer, Cleric, Wizard |
| Premium | 120–130 | High stats or unique ability | Knight, Ninja |

**400 starting Gold forces trade-offs:**
- 4 Soldiers (300) + 100 left = budget army, 4 units
- 1 Knight (120) + 1 Wizard (110) + 1 Soldier (75) + 95 left = 3-unit quality squad
- 1 Archer (100) + 1 Cleric (100) + 2 Soldiers (150) + 50 left = balanced 4-unit squad

More units = more actions per turn but weaker individually. Fewer units = stronger but less AP efficiency. Permadeath adds **risk tolerance** — do you field your best units or hold back your Ninja and fight with expendable Soldiers?

### Elemental Triangle

```
Fire ──1.5×──▶ Wind ──1.5×──▶ Earth ──1.5×──▶ Water ──1.5×──▶ Fire
     ◀──0.75×──     ◀──0.75×──      ◀──0.75×──      ◀──0.75×──
```

**Damage formula:** `actual_dmg = max(1, (atk - def)) × element_multiplier`

### AP Economy (3 AP per unit, no carry-over)

| Action | Cost | Rationale |
|--------|------|-----------|
| Move (per tile) | 1 | Cheap positioning |
| Attack | 2 | Core action |
| Special | 3 | Full AP budget — can't do anything else |

**Per-unit decision (3 AP):**
- Move 1 tile (1) + Attack (2) = 3 ✅ — standard play
- Special (3) = 3 ✅ — powerful but unit stays in place
- Move 2 tiles (2) + 1 left = reposition only, can't attack
- Move 3 tiles (3) = full retreat, no action

**Per-turn depth (4 units × 3 AP = 12 AP total):**
- **Aggressive:** All 4 units move+attack = 4 attacks landing
- **Defensive:** Cleric Heals (3) + Knight retreats 2 tiles (2) + Archer attacks (move 1 + attack = 3)
- **Burst:** Wizard Fireball (3) + Archer Piercing Shot (3) + others reposition
- **Skip:** Player can end turn early, leaving units with unspent AP (AP does NOT carry over)

---

## Reward System

| Reward | Type | Trigger |
|--------|------|---------|
| **Gold from battle** | Extrinsic / Fixed | Win = +150 Gold, Lose = +50 Gold |
| **Unit survival** | Intrinsic / High stakes | Keeping expensive units alive |
| **Squad rebuilding** | Intrinsic / Milestone | Recovering from losses, adapting composition |
| **Victory proof** | Extrinsic / On-chain | Verifiable win record on blockchain |
| **Tactical mastery** | Intrinsic | Outplaying opponent with positioning and matchups |

**Gold economy with permadeath:** Win reward (150) > cheapest unit cost (75), so winners can always rebuild. Lose reward (50) buys nothing alone but accumulates. Starting at 400 Gold gives a cushion for one bad loss.

---

## Player Psychology

### Bartle Fit

| Type | Served? | How |
|------|---------|-----|
| **Achiever** ✅ | Gold accumulation, squad collection, win streaks |
| **Killer** ✅ | Direct PvP combat, outplaying opponents |
| **Explorer** ✅ | Discovering squad combos, elemental matchups |
| **Socializer** ✅ | Session invites, battling friends |

### Self-Determination Theory

- **Autonomy** ✅ — Choose squad, choose placement, choose actions per turn
- **Competence** ✅ — Win/loss reflects tactical skill. Permadeath makes victories feel truly earned.
- **Relatedness** ✅ — PvP human opponent, session invitations. Memorable "I killed your Ninja" moments.

---

## Potential Problems & Mitigations

| Problem | Mitigation |
|---------|-----------|
| **Pay-to-win** | Gold earned from battles; premium units have weaknesses (Ninja 75 HP = glass cannon) |
| **Permadeath feels punishing** | Generous Gold rewards (Win 150, Lose 50). Surrender saves remaining units. |
| **Stalling** | Future: turn timer. AP budget naturally limits actions per turn. |
| **Placement counter-picking** | Public placement adds strategic counter-play — intentional |
| **First-turn advantage** | P2 gets +1 AP on first turn (7 AP) |
| **Surrender abuse** | Surrendering saves units but forfeits win Gold. This is intentionally strategic. |

---

## Core Game Loop

```
┌─────────────────────────────────────────────────────────────┐
│  METAGAME LOOP:                                              │
│  Earn Gold → Recruit from Tavern → Build Squad → Battle     │
│                                                              │
│  BATTLE LOOP (per turn):                                     │
│  1. ASSESS  → Survey grid: enemy positions, unit HP, elements│
│  2. PLAN    → Decide AP allocation across units              │
│  3. EXECUTE → Move + Attack + Special (multiple actions)     │
│  4. RESOLVE → Opponent's turn                                │
│  5. EVALUATE→ Adapt, consider surrender if losing badly      │
│  └──────────────→  REPEAT until elimination or surrender     │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Summary

### Engine Components Used
```
Position, Movement, Health, Attack, Defense, Energy (AP), Team, StatusEffect, Gold, Identity
Custom (dynamic fields): class_type, element
```

### Entry Functions

**Metagame:**
| Function | Description |
|----------|-------------|
| `create_roster()` | Creates player's roster entity with 400 Gold |
| `recruit_unit(roster, class, name)` | Spend Gold, spawn named unit owned by player |
| `sell_unit(roster, unit)` | Destroy unit, refund 50% Gold to roster |
| `rename_unit(unit, new_name)` | Update unit's name |
| `claim_rewards(session, roster)` | Post-battle: return survivors, destroy dead, pay Gold |

**Battle:**
| Function | Description |
|----------|-------------|
| `create_session(max_units)` | Creates World + Grid + Session (LOBBY) with unit limit |
| `join_session()` | P2 joins → PLACEMENT |
| `place_unit(unit, x, y)` | Transfer unit to session, place on grid |
| `ready_up()` | Player ready. Both ready → COMBAT |
| `move_unit(unit, x, y)` | Move unit (1 AP/tile) |
| `attack(attacker, defender)` | Attack (2 AP, elemental calc) |
| `use_special(unit, target)` | Class ability (3 AP) |
| `end_turn()` | Tick effects, advance turn |
| `surrender()` | Forfeit, opponent wins (own turn only) |
| `cancel_session()` | Host cancels lobby, returns units if placed |
