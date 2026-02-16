# Card Crawler — On-Chain Implementation Plan

Implementation plan following the [on-chain game builder 9-step workflow](/.agent/skills/sui-on-chain-game-builder-skills/references/workflow.md). Full game design in [GAME_MECHANICS.md](./GAME_MECHANICS.md).

---

## Step 1: Understand ✅

- **Game type:** Solo roguelike deck-builder (cards + combat + progression)
- **Players:** 1 (single player)
- **Turn-based:** Yes — draw cards, play cards, enemy attacks
- **Win condition:** Defeat Floor 3 boss (Dragon)
- **Lose condition:** Player HP reaches 0

---

## Step 2: Select ✅

```
Components: Health, Attack, Defense, Energy, Deck, MapProgress, StatusEffect
Systems:    combat_sys, card_sys, energy_sys, turn_sys, encounter_sys,
            reward_sys, shop_sys, map_sys, relic_sys, win_condition_sys
Patterns:   combat_patterns, progression_patterns, turn_and_win_patterns
```

---

## Step 3: Read ✅

| Reference | Relevant APIs |
|-----------|--------------|
| `progression_patterns.md` | `draw_cards`, `play_card`, `discard_card`, `shuffle_deck`, `generate_encounter`, `grant_gold`, `grant_card`, `buy_card`, `remove_card`, `choose_path`, `advance_floor`, `add_relic` |
| `combat_patterns.md` | `deal_damage`, `apply_block`, `apply_effect`, `spend_energy`, `restore_energy` |
| `turn_and_win_patterns.md` | Phase mode (`DRAW → PLAY → COMBAT → END`), `check_elimination` |
| `world_api.md` | All World wrapper functions |

---

## Step 4: Scaffold

### Project Structure
```
card_crawler/
  Move.toml
  GAME_MECHANICS.md       ← game design reference
  IMPLEMENTATION_PLAN.md   ← this file
  sources/
    game.move              ← game logic
    game_tests.move        ← tests
```

### Move.toml
```toml
[package]
name = "card_crawler"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/mainnet", override = true }
world = { git = "https://github.com/prajeet-shrestha/sui-game-engine.git", subdir = "world", rev = "main" }
```

---

## Step 5: Design

### GameSession Struct
```move
public struct GameSession has key {
    id: UID,
    state: u8,              // STATE_LOBBY..STATE_FINISHED
    player: address,
    player_entity_id: ID,

    // Map
    floor: u8,              // 1-3
    node: u8,               // current node on floor
    nodes_per_floor: u8,

    // Economy
    gold: u64,

    // Combat state
    block: u64,             // resets each turn
    atk_bonus: u64,         // from Berserk, Whetstone relic
    def_bonus: u64,         // from Iron Skin, Iron Ring relic
    enemy_hp: u64,
    enemy_atk: u64,
    enemy_atk_bonus: u64,   // Dragon escalation
    turn_count: u8,         // for Dark Knight +2 ATK every 3 turns

    // Powers & Relics
    relics: vector<u8>,     // relic IDs, max 3
    powers_active: vector<u8>, // active power cards this combat
    rampage_count: u64,     // Rampage dmg stacking
}
```

### State Machine
```
LOBBY ─start_run─→ MAP_SELECT ─choose_node─→ COMBAT / SHOP / REST
                        ↑                          │
                        └──── reward/done ──────────┘
                        │
                   (all nodes done)
                        ↓
                   FLOOR_ADVANCE ──→ MAP_SELECT (next floor)
                        │
                   (boss dead)
                        ↓
                    FINISHED (win)

    At any combat: player HP ≤ 0 → FINISHED (lose)
```

### Shared Objects
| Object | Shared? | Why |
|--------|:-------:|-----|
| World | ✅ | Engine requires it |
| GameSession | ✅ | Game state |
| Player Entity | ✅ | Deck, HP, stats |

No Grid or TurnState needed (single player, no spatial board).

### Events
```move
RunStarted { player }
NodeChosen { floor, node, node_type }
CombatStarted { enemy_name, enemy_hp, enemy_atk }
CardDrawn { hand_size }
CardPlayed { card_id, card_type, effect }
TurnEnded { player_hp, enemy_hp }
EnemyAttacked { damage, blocked }
EnemyDied { gold_reward }
PlayerDied { floor, node }
CardReward { card_choices }
ShopPurchase { item_type, item_id, cost }
RelicGained { relic_id }
FloorAdvanced { new_floor }
GameWon { final_gold, floors_cleared }
```

---

## Step 6: Implement

### Entry Functions

| # | Function | State Req | Transition | PTB? |
|---|----------|-----------|------------|:----:|
| 1 | `create_session()` | — | → LOBBY | — |
| 2 | `start_run()` | LOBBY | → MAP_SELECT | — |
| 3 | `choose_node(node)` | MAP_SELECT | → COMBAT/SHOP/REST | — |
| 4 | `draw_phase()` | COMBAT | draw 5 cards, reset energy | ✅ |
| 5 | `play_card(idx)` | COMBAT | spend energy, apply effect | ✅ |
| 6 | `end_player_turn()` | COMBAT | enemy attacks, tick effects | ✅ |
| 7 | `collect_reward(choice)` | REWARD | pick card → MAP_SELECT | — |
| 8 | `shop_buy(type, id)` | SHOP | spend gold, add card/relic | ✅ |
| 9 | `shop_done()` | SHOP | → MAP_SELECT | — |
| 10 | `rest()` | REST | heal 30% → MAP_SELECT | — |
| 11 | `advance_floor()` | MAP_SELECT | next floor → MAP_SELECT | — |

### PTB Batching Example (Combat Turn)
```
PTB = [
    draw_phase(),
    play_card(0),         // Strike — 1 energy
    play_card(2),         // Defend — 1 energy
    play_card(4),         // Bash — 2 energy (ERROR: only 1 energy left!)
    end_player_turn(),
]
```
Player must choose wisely — can't play all 5 cards with 3 energy.

### Internal Helpers

| Helper | Purpose |
|--------|---------|
| `spawn_enemy(floor, node)` | Create enemy from floor/node table |
| `apply_card_effect(session, card)` | Switch on all 18 card types |
| `tick_status_effects(session)` | Poison dmg, weaken countdown |
| `tick_power_effects(session)` | Regen heal, thorns dmg |
| `apply_relic_bonuses(session)` | Pre-combat relic setup |
| `generate_reward_cards()` | Pick 3 random from pool |
| `check_combat_end(session)` | Enemy/player dead? |

### Card Effect Implementation
```move
fun apply_card_effect(session: &mut GameSession, entity: &mut Entity, card_type: u8, card_id: u8) {
    if (card_type == CARD_ATTACK) {
        let dmg = get_card_damage(card_id) + session.atk_bonus;
        // Special: Execute bonus at low HP
        if (card_id == CARD_EXECUTE && session.enemy_hp * 100 / enemy_max_hp < 30) {
            dmg = 25 + session.atk_bonus;
        };
        // Special: Rampage stacking
        if (card_id == CARD_RAMPAGE) {
            dmg = dmg + session.rampage_count * 4;
            session.rampage_count = session.rampage_count + 1;
        };
        session.enemy_hp = if (dmg >= session.enemy_hp) { 0 } else { session.enemy_hp - dmg };
    } else if (card_type == CARD_SKILL) {
        // Defend, Shield Wall, Heal, Dodge, Weaken, Adrenaline
    } else if (card_type == CARD_POWER) {
        // Berserk, Iron Skin, Regen, Thorns, Fury — permanent effects
    };
}
```

---

## Step 7: Guard

Checklist from `dos_and_donts.md`:

- [ ] All state-changing calls through World wrappers
- [ ] GameSession is shared
- [ ] State validated before every action (e.g., can't play cards in SHOP)
- [ ] Energy checked before playing cards
- [ ] Caller == session.player for all entry functions
- [ ] Unique error constants for every assertion
- [ ] Events emitted for all state changes
- [ ] Card/relic IDs validated (no invalid card_id)
- [ ] Gold checked before purchases
- [ ] Relic cap (max 3) enforced

---

## Step 8: Test

### Test Cases

| # | Test | Verifies |
|---|------|----------|
| 1 | `test_start_run` | Player: 80 HP, 10 cards, 50 gold, floor 1 |
| 2 | `test_draw_and_play_strike` | Draw 5, play Strike: 1 energy spent, 6 dmg dealt |
| 3 | `test_defend_blocks` | Play Defend → 5 block → enemy dmg reduced |
| 4 | `test_energy_gate` | Can't play 2-cost card with 1 energy remaining |
| 5 | `test_enemy_kill_rewards` | Kill Goblin: +20 gold, 3 card choices |
| 6 | `test_shop_buy_card` | 60 gold spent, card in deck |
| 7 | `test_shop_remove_card` | 50 gold spent, card removed from deck |
| 8 | `test_rest_heals` | Rest: heal 24 HP (30% of 80) |
| 9 | `test_boss_win` | Kill Dragon → state FINISHED, event GameWon |
| 10 | `test_player_death` | HP → 0 → state FINISHED, event PlayerDied |

### Commands
```bash
cd /Users/ps/Documents/ibriz/git/engine_examples/card_crawler
sui move build
sui move test
```

---

## Step 9: Deploy

1. Create `.env` in `card_crawler/`:
```env
SUI_NETWORK=testnet
MNEMONIC="your twelve word mnemonic here"
```

2. Deploy:
```bash
set -a && source .env && set +a
sui keytool import "$MNEMONIC" ed25519 --json 2>/dev/null || true
sui client switch --env "$SUI_NETWORK" 2>/dev/null || {
  sui client new-env --alias "$SUI_NETWORK" --rpc "https://fullnode.${SUI_NETWORK}.sui.io:443"
  sui client switch --env "$SUI_NETWORK"
}
sui client publish --gas-budget 500000000 --skip-dependency-verification --json
```

3. Extract from output:
```
✅ Card Crawler deployed!
  Package ID:    0x...
  World:         0x...
  GameSession:   0x...
  Network: testnet
```
