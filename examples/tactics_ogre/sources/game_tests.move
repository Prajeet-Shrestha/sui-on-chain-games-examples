/// Tests for Tactics Ogre On-Chain
#[test_only]
#[allow(unused_variable, unused_use)]
module tactics_ogre::game_tests;

use sui::test_scenario::{Self as ts};
use sui::clock;
use sui::object;
use world::world::World;
use entity::entity::Entity;
use systems::grid_sys::Grid;
use components::health;
use components::energy;
use components::team;
use tactics_ogre::game::{Self, Tavern, Roster, GameSession};

const PLAYER1: address = @0xA;
const PLAYER2: address = @0xB;

// ═══════════════════════════════════════════════
// TEST: Roster creation
// ═══════════════════════════════════════════════

#[test]
fun test_create_roster() {
    let mut scenario = ts::begin(PLAYER1);
    {
        game::init_for_testing(scenario.ctx());
    };
    ts::next_tx(&mut scenario, PLAYER1);
    {
        game::create_roster(scenario.ctx());
    };
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let roster = ts::take_from_sender<Roster>(&scenario);
        ts::return_to_sender(&scenario, roster);
    };
    ts::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: Recruit a unit
// ═══════════════════════════════════════════════

#[test]
fun test_recruit_unit() {
    let mut scenario = ts::begin(PLAYER1);
    let c = clock::create_for_testing(scenario.ctx());
    {
        game::init_for_testing(scenario.ctx());
    };
    ts::next_tx(&mut scenario, PLAYER1);
    {
        game::create_roster(scenario.ctx());
    };
    // Recruit a Soldier (cost = 75)
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut world = ts::take_shared<World>(&scenario);
        let tavern = ts::take_shared<Tavern>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);

        game::recruit_unit(
            &mut world,
            &tavern,
            &mut roster,
            0, // CLASS_SOLDIER
            b"Grunt",
            &c,
            scenario.ctx(),
        );

        ts::return_shared(world);
        ts::return_shared(tavern);
        ts::return_to_sender(&scenario, roster);
    };
    // Verify unit was created (entities are shared objects)
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let unit = ts::take_shared<Entity>(&scenario);
        let hp = health::borrow(&unit);
        assert!(health::current(hp) == 100); // Soldier HP
        ts::return_shared(unit);
    };
    clock::destroy_for_testing(c);
    ts::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: Sell a unit
// ═══════════════════════════════════════════════

#[test]
fun test_sell_unit() {
    let mut scenario = ts::begin(PLAYER1);
    let c = clock::create_for_testing(scenario.ctx());
    {
        game::init_for_testing(scenario.ctx());
    };
    ts::next_tx(&mut scenario, PLAYER1);
    {
        game::create_roster(scenario.ctx());
    };
    // Recruit a Soldier (cost = 75)
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut world = ts::take_shared<World>(&scenario);
        let tavern = ts::take_shared<Tavern>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);

        game::recruit_unit(
            &mut world,
            &tavern,
            &mut roster,
            0,
            b"Expendable",
            &c,
            scenario.ctx(),
        );

        ts::return_shared(world);
        ts::return_shared(tavern);
        ts::return_to_sender(&scenario, roster);
    };
    // Sell the unit (refund = 37, which is 75/2)
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        let unit = ts::take_shared<Entity>(&scenario);

        game::sell_unit(&mut roster, unit, scenario.ctx());

        // Gold should be: 400 - 75 + 37 = 362
        ts::return_to_sender(&scenario, roster);
    };
    clock::destroy_for_testing(c);
    ts::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: Full battle loop (Ninja vs Soldier, Backstab, Surrender)
// ═══════════════════════════════════════════════

#[test]
fun test_full_battle_loop() {
    let mut scenario = ts::begin(PLAYER1);
    let c = clock::create_for_testing(scenario.ctx());
    {
        game::init_for_testing(scenario.ctx());
    };

    // Both players create rosters
    ts::next_tx(&mut scenario, PLAYER1);
    { game::create_roster(scenario.ctx()); };
    ts::next_tx(&mut scenario, PLAYER2);
    { game::create_roster(scenario.ctx()); };

    // P1 recruits a Ninja (cost 130) — Ninja has 75 HP
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut world = ts::take_shared<World>(&scenario);
        let tavern = ts::take_shared<Tavern>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::recruit_unit(&mut world, &tavern, &mut roster, 5, b"Shadow", &c, scenario.ctx());
        ts::return_shared(world);
        ts::return_shared(tavern);
        ts::return_to_sender(&scenario, roster);
    };

    // Capture ninja's ID immediately after creation
    ts::next_tx(&mut scenario, PLAYER1);
    let ninja_id: object::ID = {
        let unit = ts::take_shared<Entity>(&scenario);
        let id = object::id(&unit);
        ts::return_shared(unit);
        id
    };

    // P2 recruits a Soldier (cost 75) — Soldier has 100 HP
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut world = ts::take_shared<World>(&scenario);
        let tavern = ts::take_shared<Tavern>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::recruit_unit(&mut world, &tavern, &mut roster, 0, b"Guard", &c, scenario.ctx());
        ts::return_shared(world);
        ts::return_shared(tavern);
        ts::return_to_sender(&scenario, roster);
    };

    // Capture soldier's ID
    ts::next_tx(&mut scenario, PLAYER2);
    let soldier_id: object::ID = {
        // There are now 2 shared entities — find the one that isn't the ninja
        let unit1 = ts::take_shared<Entity>(&scenario);
        let id1 = object::id(&unit1);
        if (id1 == ninja_id) {
            ts::return_shared(unit1);
            let unit2 = ts::take_shared<Entity>(&scenario);
            let id2 = object::id(&unit2);
            ts::return_shared(unit2);
            id2
        } else {
            ts::return_shared(unit1);
            id1
        }
    };

    // P1 creates session (max 1 unit per player)
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut world = ts::take_shared<World>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::create_session(&mut world, &mut roster, 1, scenario.ctx());
        ts::return_shared(world);
        ts::return_to_sender(&scenario, roster);
    };

    // P2 joins session
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::join_session(&mut session, &mut roster, scenario.ctx());
        ts::return_shared(session);
        ts::return_to_sender(&scenario, roster);
    };

    // P1 places ninja at (2, 0) using known ID
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let world = ts::take_shared<World>(&scenario);
        let mut grid = ts::take_shared<Grid>(&scenario);
        let mut ninja = ts::take_shared_by_id<Entity>(&scenario, ninja_id);
        game::place_unit(&mut session, &world, &mut grid, &mut ninja, 2, 0, scenario.ctx());
        ts::return_shared(session);
        ts::return_shared(world);
        ts::return_shared(grid);
        ts::return_shared(ninja);
    };

    // P2 places soldier at (2, 7)
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let world = ts::take_shared<World>(&scenario);
        let mut grid = ts::take_shared<Grid>(&scenario);
        let mut soldier = ts::take_shared_by_id<Entity>(&scenario, soldier_id);
        game::place_unit(&mut session, &world, &mut grid, &mut soldier, 2, 7, scenario.ctx());
        ts::return_shared(session);
        ts::return_shared(world);
        ts::return_shared(grid);
        ts::return_shared(soldier);
    };

    // Both ready up
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        game::ready_up(&mut session, scenario.ctx());
        ts::return_shared(session);
    };
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        game::ready_up(&mut session, scenario.ctx());
        ts::return_shared(session);
    };

    // P1's turn: refresh ninja
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let session = ts::take_shared<GameSession>(&scenario);
        let world = ts::take_shared<World>(&scenario);
        let mut ninja = ts::take_shared_by_id<Entity>(&scenario, ninja_id);

        game::refresh_unit(&session, &world, &mut ninja, scenario.ctx());

        ts::return_shared(session);
        ts::return_shared(world);
        ts::return_shared(ninja);
    };

    // P1 uses Backstab on soldier (costs 3 AP)
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let world = ts::take_shared<World>(&scenario);
        let grid = ts::take_shared<Grid>(&scenario);

        let mut ninja = ts::take_shared_by_id<Entity>(&scenario, ninja_id);
        let mut soldier = ts::take_shared_by_id<Entity>(&scenario, soldier_id);

        game::use_special(&mut session, &world, &grid, &mut ninja, &mut soldier, scenario.ctx());

        // Soldier should have taken damage
        let soldier_hp = health::current(health::borrow(&soldier));
        assert!(soldier_hp < 100);

        ts::return_shared(session);
        ts::return_shared(world);
        ts::return_shared(grid);
        ts::return_shared(ninja);
        ts::return_shared(soldier);
    };

    // P1 ends turn
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        game::end_turn(&mut session, scenario.ctx());
        ts::return_shared(session);
    };

    // P2 surrenders (it's now P2's turn)
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        game::surrender(&mut session, scenario.ctx());
        ts::return_shared(session);
    };

    // Both players claim rewards
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::claim_rewards(&mut session, &mut roster, scenario.ctx());
        ts::return_shared(session);
        ts::return_to_sender(&scenario, roster);
    };
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::claim_rewards(&mut session, &mut roster, scenario.ctx());
        ts::return_shared(session);
        ts::return_to_sender(&scenario, roster);
    };

    clock::destroy_for_testing(c);
    ts::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: AP economy — move 1, move 1, verify AP decrements
// ═══════════════════════════════════════════════

#[test]
fun test_ap_economy() {
    let mut scenario = ts::begin(PLAYER1);
    let c = clock::create_for_testing(scenario.ctx());
    {
        game::init_for_testing(scenario.ctx());
    };

    ts::next_tx(&mut scenario, PLAYER1);
    { game::create_roster(scenario.ctx()); };
    ts::next_tx(&mut scenario, PLAYER2);
    { game::create_roster(scenario.ctx()); };

    // P1: Soldier
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut world = ts::take_shared<World>(&scenario);
        let tavern = ts::take_shared<Tavern>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::recruit_unit(&mut world, &tavern, &mut roster, 0, b"Footman", &c, scenario.ctx());
        ts::return_shared(world);
        ts::return_shared(tavern);
        ts::return_to_sender(&scenario, roster);
    };

    // Capture P1's unit ID
    ts::next_tx(&mut scenario, PLAYER1);
    let p1_unit_id: object::ID = {
        let unit = ts::take_shared<Entity>(&scenario);
        let id = object::id(&unit);
        ts::return_shared(unit);
        id
    };

    // P2: Soldier
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut world = ts::take_shared<World>(&scenario);
        let tavern = ts::take_shared<Tavern>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::recruit_unit(&mut world, &tavern, &mut roster, 0, b"Defender", &c, scenario.ctx());
        ts::return_shared(world);
        ts::return_shared(tavern);
        ts::return_to_sender(&scenario, roster);
    };

    // Capture P2's unit ID
    ts::next_tx(&mut scenario, PLAYER2);
    let p2_unit_id: object::ID = {
        let unit1 = ts::take_shared<Entity>(&scenario);
        let id1 = object::id(&unit1);
        if (id1 == p1_unit_id) {
            ts::return_shared(unit1);
            let unit2 = ts::take_shared<Entity>(&scenario);
            let id2 = object::id(&unit2);
            ts::return_shared(unit2);
            id2
        } else {
            ts::return_shared(unit1);
            id1
        }
    };

    // Create session
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut world = ts::take_shared<World>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::create_session(&mut world, &mut roster, 1, scenario.ctx());
        ts::return_shared(world);
        ts::return_to_sender(&scenario, roster);
    };

    // Join session
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::join_session(&mut session, &mut roster, scenario.ctx());
        ts::return_shared(session);
        ts::return_to_sender(&scenario, roster);
    };

    // Place P1's unit at (3, 0)
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let world = ts::take_shared<World>(&scenario);
        let mut grid = ts::take_shared<Grid>(&scenario);
        let mut unit = ts::take_shared_by_id<Entity>(&scenario, p1_unit_id);
        game::place_unit(&mut session, &world, &mut grid, &mut unit, 3, 0, scenario.ctx());
        ts::return_shared(session);
        ts::return_shared(world);
        ts::return_shared(grid);
        ts::return_shared(unit);
    };

    // Place P2's unit at (3, 7)
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let world = ts::take_shared<World>(&scenario);
        let mut grid = ts::take_shared<Grid>(&scenario);
        let mut unit = ts::take_shared_by_id<Entity>(&scenario, p2_unit_id);
        game::place_unit(&mut session, &world, &mut grid, &mut unit, 3, 7, scenario.ctx());
        ts::return_shared(session);
        ts::return_shared(world);
        ts::return_shared(grid);
        ts::return_shared(unit);
    };

    // Ready up
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        game::ready_up(&mut session, scenario.ctx());
        ts::return_shared(session);
    };
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        game::ready_up(&mut session, scenario.ctx());
        ts::return_shared(session);
    };

    // P1: refresh, move 1 tile, then move 1 more tile
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let world = ts::take_shared<World>(&scenario);
        let mut grid = ts::take_shared<Grid>(&scenario);
        let mut unit = ts::take_shared_by_id<Entity>(&scenario, p1_unit_id);

        game::refresh_unit(&session, &world, &mut unit, scenario.ctx());

        // Move from (3,0) -> (3,1) — costs 1 AP
        game::move_unit(&mut session, &world, &mut grid, &mut unit, 3, 1, scenario.ctx());
        let en = energy::borrow(&unit);
        assert!(energy::current(en) == 2); // 3 - 1 = 2

        // Move from (3,1) -> (3,2) — costs 1 more AP
        game::move_unit(&mut session, &world, &mut grid, &mut unit, 3, 2, scenario.ctx());
        let en2 = energy::borrow(&unit);
        assert!(energy::current(en2) == 1); // 3 - 2 = 1

        ts::return_shared(session);
        ts::return_shared(world);
        ts::return_shared(grid);
        ts::return_shared(unit);
    };

    clock::destroy_for_testing(c);
    ts::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: Placement validation — wrong zone rejected
// ═══════════════════════════════════════════════

#[test]
#[expected_failure(abort_code = game::EInvalidPlacement)]
fun test_invalid_placement() {
    let mut scenario = ts::begin(PLAYER1);
    let c = clock::create_for_testing(scenario.ctx());
    {
        game::init_for_testing(scenario.ctx());
    };

    ts::next_tx(&mut scenario, PLAYER1);
    { game::create_roster(scenario.ctx()); };
    ts::next_tx(&mut scenario, PLAYER2);
    { game::create_roster(scenario.ctx()); };

    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut world = ts::take_shared<World>(&scenario);
        let tavern = ts::take_shared<Tavern>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::recruit_unit(&mut world, &tavern, &mut roster, 0, b"Misplaced", &c, scenario.ctx());
        ts::return_shared(world);
        ts::return_shared(tavern);
        ts::return_to_sender(&scenario, roster);
    };
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut world = ts::take_shared<World>(&scenario);
        let tavern = ts::take_shared<Tavern>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::recruit_unit(&mut world, &tavern, &mut roster, 0, b"Foe", &c, scenario.ctx());
        ts::return_shared(world);
        ts::return_shared(tavern);
        ts::return_to_sender(&scenario, roster);
    };

    // Create + join session
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut world = ts::take_shared<World>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::create_session(&mut world, &mut roster, 1, scenario.ctx());
        ts::return_shared(world);
        ts::return_to_sender(&scenario, roster);
    };
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::join_session(&mut session, &mut roster, scenario.ctx());
        ts::return_shared(session);
        ts::return_to_sender(&scenario, roster);
    };

    // P1 tries to place on row 5 (invalid — must be 0-1)
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let world = ts::take_shared<World>(&scenario);
        let mut grid = ts::take_shared<Grid>(&scenario);
        let mut unit = ts::take_shared<Entity>(&scenario);
        game::place_unit(&mut session, &world, &mut grid, &mut unit, 3, 5, scenario.ctx());
        ts::return_shared(session);
        ts::return_shared(world);
        ts::return_shared(grid);
        ts::return_shared(unit);
    };

    clock::destroy_for_testing(c);
    ts::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: Surrender flow
// ═══════════════════════════════════════════════

#[test]
fun test_surrender() {
    let mut scenario = ts::begin(PLAYER1);
    let c = clock::create_for_testing(scenario.ctx());
    {
        game::init_for_testing(scenario.ctx());
    };

    ts::next_tx(&mut scenario, PLAYER1);
    { game::create_roster(scenario.ctx()); };
    ts::next_tx(&mut scenario, PLAYER2);
    { game::create_roster(scenario.ctx()); };

    // Recruit units
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut world = ts::take_shared<World>(&scenario);
        let tavern = ts::take_shared<Tavern>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::recruit_unit(&mut world, &tavern, &mut roster, 0, b"P1Unit", &c, scenario.ctx());
        ts::return_shared(world);
        ts::return_shared(tavern);
        ts::return_to_sender(&scenario, roster);
    };

    // Capture P1's unit ID
    ts::next_tx(&mut scenario, PLAYER1);
    let p1_unit_id: object::ID = {
        let unit = ts::take_shared<Entity>(&scenario);
        let id = object::id(&unit);
        ts::return_shared(unit);
        id
    };

    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut world = ts::take_shared<World>(&scenario);
        let tavern = ts::take_shared<Tavern>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::recruit_unit(&mut world, &tavern, &mut roster, 0, b"P2Unit", &c, scenario.ctx());
        ts::return_shared(world);
        ts::return_shared(tavern);
        ts::return_to_sender(&scenario, roster);
    };

    // Capture P2's unit ID
    ts::next_tx(&mut scenario, PLAYER2);
    let p2_unit_id: object::ID = {
        let unit1 = ts::take_shared<Entity>(&scenario);
        let id1 = object::id(&unit1);
        if (id1 == p1_unit_id) {
            ts::return_shared(unit1);
            let unit2 = ts::take_shared<Entity>(&scenario);
            let id2 = object::id(&unit2);
            ts::return_shared(unit2);
            id2
        } else {
            ts::return_shared(unit1);
            id1
        }
    };

    // Create + join + place + ready
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut world = ts::take_shared<World>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::create_session(&mut world, &mut roster, 1, scenario.ctx());
        ts::return_shared(world);
        ts::return_to_sender(&scenario, roster);
    };
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::join_session(&mut session, &mut roster, scenario.ctx());
        ts::return_shared(session);
        ts::return_to_sender(&scenario, roster);
    };
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let world = ts::take_shared<World>(&scenario);
        let mut grid = ts::take_shared<Grid>(&scenario);
        let mut unit = ts::take_shared_by_id<Entity>(&scenario, p1_unit_id);
        game::place_unit(&mut session, &world, &mut grid, &mut unit, 0, 0, scenario.ctx());
        ts::return_shared(session);
        ts::return_shared(world);
        ts::return_shared(grid);
        ts::return_shared(unit);
    };
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let world = ts::take_shared<World>(&scenario);
        let mut grid = ts::take_shared<Grid>(&scenario);
        let mut unit = ts::take_shared_by_id<Entity>(&scenario, p2_unit_id);
        game::place_unit(&mut session, &world, &mut grid, &mut unit, 0, 7, scenario.ctx());
        ts::return_shared(session);
        ts::return_shared(world);
        ts::return_shared(grid);
        ts::return_shared(unit);
    };
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        game::ready_up(&mut session, scenario.ctx());
        ts::return_shared(session);
    };
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        game::ready_up(&mut session, scenario.ctx());
        ts::return_shared(session);
    };

    // P1 surrenders (it's P1's turn)
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        game::surrender(&mut session, scenario.ctx());
        ts::return_shared(session);
    };

    // P2 claims rewards (winner)
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::claim_rewards(&mut session, &mut roster, scenario.ctx());
        ts::return_shared(session);
        ts::return_to_sender(&scenario, roster);
    };
    // P1 claims rewards (loser)
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut session = ts::take_shared<GameSession>(&scenario);
        let mut roster = ts::take_from_sender<Roster>(&scenario);
        game::claim_rewards(&mut session, &mut roster, scenario.ctx());
        ts::return_shared(session);
        ts::return_to_sender(&scenario, roster);
    };

    clock::destroy_for_testing(c);
    ts::end(scenario);
}
