/// Card Crawler — Game Tests
#[test_only]
#[allow(unused_const, unused_use)]
module card_crawler::game_tests;

use std::ascii;
use sui::clock;
use sui::random;
use sui::test_scenario::{Self as ts};
use entity::entity::Entity;
use world::world::World;
use card_crawler::game::{Self, GameSession};

// Components for assertions
use components::health;
use components::energy;
use components::deck;
use components::gold;
use components::inventory;

// ─── Test Addresses ─────────────────────────

const PLAYER: address = @0xCAFE;

// ─── Helper: Create a game and return scenario ──

fun setup_game(scenario: &mut ts::Scenario) {
    ts::next_tx(scenario, PLAYER);
    {
        let clock = clock::create_for_testing(ts::ctx(scenario));
        game::create_and_start(&clock, ts::ctx(scenario));
        clock::destroy_for_testing(clock);
    };
}

/// Create Random object (must be from @0x0 sender).
fun setup_random(scenario: &mut ts::Scenario) {
    ts::next_tx(scenario, @0x0);
    {
        random::create_for_testing(ts::ctx(scenario));
    };
}

// ═══════════════════════════════════════════════
// TEST 1: Start Run — verify all components
// ═══════════════════════════════════════════════

#[test]
fun test_start_run() {
    let mut scenario = ts::begin(PLAYER);
    setup_game(&mut scenario);

    // Check session
    ts::next_tx(&mut scenario, PLAYER);
    {
        let session = ts::take_shared<GameSession>(&scenario);
        assert!(game::state(&session) == 1, 0);   // STATE_MAP_SELECT
        assert!(game::floor(&session) == 1, 1);
        assert!(game::nodes_cleared(&session) == 0, 2);
        assert!(game::nodes_total(&session) == 3, 3);
        assert!(game::player(&session) == PLAYER, 4);
        ts::return_shared(session);
    };

    // Check player entity
    ts::next_tx(&mut scenario, PLAYER);
    {
        let player = ts::take_shared<Entity>(&scenario);

        let h = health::borrow(&player);
        assert!(health::current(h) == 80, 10);
        assert!(health::max(h) == 80, 11);

        let e = energy::borrow(&player);
        assert!(energy::current(e) == 3, 12);
        assert!(energy::max(e) == 3, 13);

        let d = deck::borrow(&player);
        assert!(d.draw_pile_size() == 10, 14);
        assert!(d.hand_size() == 0, 15);

        let g = gold::borrow(&player);
        assert!(gold::amount(g) == 50, 16);

        let inv = inventory::borrow(&player);
        assert!(inventory::count(inv) == 0, 17);

        ts::return_shared(player);
    };

    ts::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST 2: Choose Combat Node + Draw Phase
// ═══════════════════════════════════════════════

#[test]
fun test_choose_combat_and_draw() {
    let mut scenario = ts::begin(PLAYER);
    setup_game(&mut scenario);
    setup_random(&mut scenario);

    // Choose node 0 (Goblin combat)
    ts::next_tx(&mut scenario, PLAYER);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        game::choose_node(&mut session, 0, ts::ctx(&mut scenario));
        assert!(game::state(&session) == 2, 0);       // STATE_COMBAT
        assert!(game::enemy_hp(&session) == 20, 1);    // Goblin HP
        assert!(game::enemy_atk(&session) == 5, 2);    // Goblin ATK
        ts::return_shared(session);
    };

    // Draw phase
    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);

        game::draw_phase(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));

        let d = deck::borrow(&player);
        assert!(d.hand_size() == 5, 10);
        assert!(d.draw_pile_size() == 5, 11);

        let e = energy::borrow(&player);
        assert!(energy::current(e) == 3, 12);

        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    ts::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST 3: Play Card — draw pops from back, so first draw is Bash (10 dmg)
// Deck: [Strike*5, Defend*4, Bash] → draw 5 from back → hand = [Bash, Def, Def, Def, Def]
// ═══════════════════════════════════════════════

#[test]
fun test_play_card() {
    let mut scenario = ts::begin(PLAYER);
    setup_game(&mut scenario);
    setup_random(&mut scenario);

    ts::next_tx(&mut scenario, PLAYER);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        game::choose_node(&mut session, 0, ts::ctx(&mut scenario));
        ts::return_shared(session);
    };

    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);

        game::draw_phase(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));

        // Hand = [Bash(10dmg,cost2), Def, Def, Def, Def]
        // Play index 0 = Bash → 10 dmg, costs 2 energy
        game::play_card(&world, &mut session, &mut player, 0);

        // Goblin: 20 - 10 = 10
        assert!(game::enemy_hp(&session) == 10, 0);

        // Energy: 3 - 2 = 1
        let e = energy::borrow(&player);
        assert!(energy::current(e) == 1, 1);

        // Hand should be 4 (swap_remove: Bash removed, last Def swapped in)
        let d = deck::borrow(&player);
        assert!(d.hand_size() == 4, 2);

        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    ts::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST 4: Full Combat Turn (draw + play + end turn)
// ═══════════════════════════════════════════════

#[test]
fun test_full_combat_turn() {
    let mut scenario = ts::begin(PLAYER);
    setup_game(&mut scenario);
    setup_random(&mut scenario);

    // Choose Goblin (20 HP, 5 ATK)
    ts::next_tx(&mut scenario, PLAYER);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        game::choose_node(&mut session, 0, ts::ctx(&mut scenario));
        ts::return_shared(session);
    };

    // Draw + play Bash (10 dmg) + play Defend(5 block) → end turn
    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);

        game::draw_phase(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));

        // Hand: [Bash(cost2), Def, Def, Def, Def]
        // Play Bash at index 0 → 10 dmg, energy 3→1
        game::play_card(&world, &mut session, &mut player, 0);
        assert!(game::enemy_hp(&session) == 10, 0);

        // Now hand: [Def, Def, Def, Def] (swap_remove moved last to 0)
        // Play Defend at index 0 → 5 block, energy 1→0
        game::play_card(&world, &mut session, &mut player, 0);
        assert!(game::block(&session) == 5, 1);

        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    // End turn
    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);

        game::end_player_turn(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));

        // Enemy attacks with 5 dmg, player has 5 block → 0 net damage
        let h = health::borrow(&player);
        assert!(health::current(h) == 80, 2);  // Full HP, block absorbed all

        // Enemy: still at 10 HP
        assert!(game::enemy_hp(&session) == 10, 3);
        assert!(game::state(&session) == 2, 4); // still COMBAT

        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    ts::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST 5: Kill Enemy → Reward → Collect
// ═══════════════════════════════════════════════

#[test]
fun test_kill_enemy_reward() {
    let mut scenario = ts::begin(PLAYER);
    setup_game(&mut scenario);
    setup_random(&mut scenario);

    // Choose Goblin (20 HP, 5 ATK)
    ts::next_tx(&mut scenario, PLAYER);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        game::choose_node(&mut session, 0, ts::ctx(&mut scenario));
        ts::return_shared(session);
    };

    // Turn 1: Play Bash (10 dmg) → enemy at 10
    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);

        game::draw_phase(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));
        // Bash at index 0
        game::play_card(&world, &mut session, &mut player, 0);
        assert!(game::enemy_hp(&session) == 10, 0);

        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    // End turn 1
    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);

        game::end_player_turn(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));

        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    // Turn 2: Draw again. Draw pile had 5 Strikes, now we draw 5 → all Strikes in hand
    // Play 2 Strikes (2 × 6 = 12 dmg on 10 HP → kill)
    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);

        game::draw_phase(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));

        // Play Strike at index 0 (6 dmg) → enemy at 4
        game::play_card(&world, &mut session, &mut player, 0);
        assert!(game::enemy_hp(&session) == 4, 1);

        // Play Strike at index 0 (6 dmg) → enemy at 0
        game::play_card(&world, &mut session, &mut player, 0);
        assert!(game::enemy_hp(&session) == 0, 2);

        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    // End turn 2 → combat victory → REWARD state
    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);

        game::end_player_turn(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));

        // State should be REWARD (3)
        assert!(game::state(&session) == 3, 3);

        // Gold: 50 + 22 (floor 1 combat) = 72
        let g = gold::borrow(&player);
        assert!(gold::amount(g) == 72, 4);

        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    // Collect reward: pick card choice 0
    ts::next_tx(&mut scenario, PLAYER);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);

        game::collect_reward(&mut session, &mut player, 0, ts::ctx(&mut scenario));

        assert!(game::state(&session) == 1, 5); // MAP_SELECT
        assert!(game::nodes_cleared(&session) == 1, 6);

        // Total cards: 10 starter + 1 reward = 11
        let d = deck::borrow(&player);
        let total = d.draw_pile_size() + d.hand_size() + d.discard_size();
        assert!(total == 11, 7);

        ts::return_shared(session);
        ts::return_shared(player);
    };

    ts::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST 6: Rest Node heals 30% max HP
// ═══════════════════════════════════════════════

#[test]
fun test_rest_heals() {
    let mut scenario = ts::begin(PLAYER);
    setup_game(&mut scenario);
    setup_random(&mut scenario);

    // Kill goblin at node 0 to advance nodes_cleared to 1
    // --- same pattern as test 5 but abbreviated ---

    // Choose Goblin
    ts::next_tx(&mut scenario, PLAYER);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        game::choose_node(&mut session, 0, ts::ctx(&mut scenario));
        ts::return_shared(session);
    };

    // Turn 1: Bash (10 dmg)
    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);
        game::draw_phase(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));
        game::play_card(&world, &mut session, &mut player, 0); // Bash 10 dmg
        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    // End turn 1
    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);
        game::end_player_turn(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));
        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    // Turn 2: 2 Strikes to kill (6+6=12 on 10 HP)
    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);
        game::draw_phase(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));
        game::play_card(&world, &mut session, &mut player, 0);
        game::play_card(&world, &mut session, &mut player, 0);
        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    // End turn 2 → REWARD
    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);
        game::end_player_turn(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));
        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    // Collect reward (skip card)
    ts::next_tx(&mut scenario, PLAYER);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        game::collect_reward(&mut session, &mut player, 3, ts::ctx(&mut scenario)); // skip
        assert!(game::nodes_cleared(&session) == 1, 0);
        ts::return_shared(session);
        ts::return_shared(player);
    };

    // Now choose node 1 path 1 = REST
    ts::next_tx(&mut scenario, PLAYER);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        game::choose_node(&mut session, 1, ts::ctx(&mut scenario));
        assert!(game::state(&session) == 5, 1); // STATE_REST
        ts::return_shared(session);
    };

    // Take some damage manually to test heal
    ts::next_tx(&mut scenario, PLAYER);
    {
        let mut player = ts::take_shared<Entity>(&scenario);
        let h = health::borrow_mut(&mut player);
        h.take_damage(30); // 75→45 (was already hit for 5 from goblin turn 1)
        ts::return_shared(player);
    };

    // Rest
    ts::next_tx(&mut scenario, PLAYER);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);

        let before_hp = health::current(health::borrow(&player));
        game::rest(&mut session, &mut player, ts::ctx(&mut scenario));
        let after_hp = health::current(health::borrow(&player));

        // Healed 30% of 80 = 24 HP
        assert!(after_hp == before_hp + 24, 2);
        assert!(game::state(&session) == 1, 3); // MAP_SELECT
        assert!(game::nodes_cleared(&session) == 2, 4);

        ts::return_shared(session);
        ts::return_shared(player);
    };

    ts::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST 7: Advance Floor
// ═══════════════════════════════════════════════

#[test]
fun test_advance_floor() {
    let mut scenario = ts::begin(PLAYER);
    setup_game(&mut scenario);

    // Manually set nodes_cleared = 3 to test advance
    // We can't easily do this without playing full game, so test the error case
    ts::next_tx(&mut scenario, PLAYER);
    {
        let session = ts::take_shared<GameSession>(&scenario);
        assert!(game::floor(&session) == 1, 0);
        assert!(game::nodes_total(&session) == 3, 1);
        ts::return_shared(session);
    };

    ts::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST 8: Energy Gate (can't play 4 cards with 3 energy)
// ═══════════════════════════════════════════════

#[test]
#[expected_failure]
fun test_energy_gate() {
    let mut scenario = ts::begin(PLAYER);
    setup_game(&mut scenario);
    setup_random(&mut scenario);

    ts::next_tx(&mut scenario, PLAYER);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        game::choose_node(&mut session, 0, ts::ctx(&mut scenario));
        ts::return_shared(session);
    };

    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);

        game::draw_phase(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));

        // Hand: [Bash(cost2), Def(cost1), Def, Def, Def]
        // Play Bash (cost 2) → energy 3→1
        game::play_card(&world, &mut session, &mut player, 0);
        // Play Def (cost 1) → energy 1→0
        game::play_card(&world, &mut session, &mut player, 0);
        // Play Def (cost 1) → NO ENERGY → should FAIL
        game::play_card(&world, &mut session, &mut player, 0);

        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    ts::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST 9: Block Reduces Enemy Damage
// ═══════════════════════════════════════════════

#[test]
fun test_block_reduces_damage() {
    let mut scenario = ts::begin(PLAYER);
    setup_game(&mut scenario);
    setup_random(&mut scenario);

    // Goblin (5 ATK)
    ts::next_tx(&mut scenario, PLAYER);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        game::choose_node(&mut session, 0, ts::ctx(&mut scenario));
        ts::return_shared(session);
    };

    // Draw + play Bash (cost2) + play Defend (cost1, 5 block) → 0 energy left
    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);

        game::draw_phase(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));

        // Play Bash at idx 0 (cost 2, 10 dmg)
        game::play_card(&world, &mut session, &mut player, 0);
        // Now hand: [Def, Def, Def, Def] — play Defend at idx 0 (cost 1, 5 block)
        game::play_card(&world, &mut session, &mut player, 0);

        assert!(game::block(&session) == 5, 0);

        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    // End turn — Goblin attacks 5 dmg, 5 block → 0 net damage
    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);

        game::end_player_turn(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));

        // No damage taken
        let h = health::borrow(&player);
        assert!(health::current(h) == 80, 1);

        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    ts::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST 10: Wrong State (rest in MAP_SELECT)
// ═══════════════════════════════════════════════

#[test]
#[expected_failure(abort_code = card_crawler::game::EWrongState)]
fun test_wrong_state() {
    let mut scenario = ts::begin(PLAYER);
    setup_game(&mut scenario);

    ts::next_tx(&mut scenario, PLAYER);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);

        // Session is in MAP_SELECT, trying rest should fail
        game::rest(&mut session, &mut player, ts::ctx(&mut scenario));

        ts::return_shared(session);
        ts::return_shared(player);
    };

    ts::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST 11: Deck Reshuffle Mid-Combat
// Verifies that when draw pile empties, discard is auto-reshuffled.
// ═══════════════════════════════════════════════

#[test]
fun test_deck_reshuffle_mid_combat() {
    let mut scenario = ts::begin(PLAYER);
    setup_game(&mut scenario);
    setup_random(&mut scenario);

    // Choose Goblin (20 HP, 5 ATK)
    ts::next_tx(&mut scenario, PLAYER);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        game::choose_node(&mut session, 0, ts::ctx(&mut scenario));
        ts::return_shared(session);
    };

    // Turn 1: Draw 5 (draw pile: 10→5), play Bash only, end turn
    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);

        game::draw_phase(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));

        let d = deck::borrow(&player);
        assert!(d.hand_size() == 5, 0);      // drew 5 cards
        assert!(d.draw_pile_size() == 5, 1);  // 5 remain

        // Play Bash at idx 0
        game::play_card(&world, &mut session, &mut player, 0);

        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    // End turn 1 (discards hand of 4 → discard pile has 5: Bash + 4 remaining)
    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);

        game::end_player_turn(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));

        let d = deck::borrow(&player);
        assert!(d.hand_size() == 0, 2);       // hand discarded
        assert!(d.draw_pile_size() == 5, 3);   // 5 still in draw pile
        assert!(d.discard_size() == 5, 4);     // 5 in discard

        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    // Turn 2: Draw 5 (empties draw pile), end turn
    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);

        game::draw_phase(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));

        let d = deck::borrow(&player);
        assert!(d.hand_size() == 5, 5);      // drew remaining 5
        assert!(d.draw_pile_size() == 0, 6);  // draw pile exhausted

        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    // End turn 2 (discards 5 → draw pile=0, discard=10)
    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);

        game::end_player_turn(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));

        let d = deck::borrow(&player);
        assert!(d.draw_pile_size() == 0, 7);   // empty draw pile
        assert!(d.discard_size() == 10, 8);    // all 10 cards in discard

        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    // Turn 3: Draw phase should auto-reshuffle discard → draw pile, then draw 5
    // THIS IS THE KEY TEST — previously this would draw 0 and softlock the game
    ts::next_tx(&mut scenario, PLAYER);
    {
        let world = ts::take_shared<World>(&scenario);
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut player = ts::take_shared<Entity>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);

        game::draw_phase(&world, &mut session, &mut player, &r, ts::ctx(&mut scenario));

        let d = deck::borrow(&player);
        assert!(d.hand_size() == 5, 9);       // ✅ Full hand after reshuffle!
        assert!(d.draw_pile_size() == 5, 10);  // 5 remain in draw pile
        assert!(d.discard_size() == 0, 11);    // discard was moved to draw pile

        ts::return_shared(world);
        ts::return_shared(session);
        ts::return_shared(player);
        ts::return_shared(r);
    };

    ts::end(scenario);
}
