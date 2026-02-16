/// Sokoban tests — per-player sessions, full game loop.
#[test_only]
module sokoban::game_tests;

use sui::test_scenario;
use sui::clock;
use sokoban::game::{Self, GameSession};
use world::world::World;
use systems::grid_sys::Grid;
use entity::entity::Entity;

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

const PLAYER_A: address = @0xA1;
const PLAYER_B: address = @0xB2;

// ═══════════════════════════════════════════════
// TEST: Start level creates Grid + Session
// ═══════════════════════════════════════════════

#[test]
fun test_start_level() {
    let mut scenario = test_scenario::begin(PLAYER_A);

    // Deploy — creates World only
    game::init_for_testing(test_scenario::ctx(&mut scenario));

    // Start level 1 — creates Grid + GameSession
    test_scenario::next_tx(&mut scenario, PLAYER_A);
    {
        let mut world = test_scenario::take_shared<World>(&scenario);
        let c = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        game::start_level(
            &mut world,
            1,  // level_id
            &c,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(world);
        clock::destroy_for_testing(c);
    };

    // Verify Grid and Session were created
    test_scenario::next_tx(&mut scenario, PLAYER_A);
    {
        let session = test_scenario::take_shared<GameSession>(&scenario);
        let grid = test_scenario::take_shared<Grid>(&scenario);

        test_scenario::return_shared(session);
        test_scenario::return_shared(grid);
    };

    test_scenario::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: Solve Level 1 with valid solution
// ═══════════════════════════════════════════════

#[test]
fun test_solve_level_1() {
    let mut scenario = test_scenario::begin(PLAYER_A);

    // Deploy
    game::init_for_testing(test_scenario::ctx(&mut scenario));

    // Start level 1
    test_scenario::next_tx(&mut scenario, PLAYER_A);
    {
        let mut world = test_scenario::take_shared<World>(&scenario);
        let c = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        game::start_level(
            &mut world, 1, &c,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(world);
        clock::destroy_for_testing(c);
    };

    // Submit solution: [LEFT, UP, RIGHT, LEFT, LEFT, UP, RIGHT, RIGHT] = [3,0,1,3,3,0,1,1]
    test_scenario::next_tx(&mut scenario, PLAYER_A);
    {
        let mut session = test_scenario::take_shared<GameSession>(&scenario);
        let world = test_scenario::take_shared<World>(&scenario);
        let mut grid = test_scenario::take_shared<Grid>(&scenario);

        // Get player entity and box entities
        let mut player = test_scenario::take_shared<Entity>(&scenario);
        let box1 = test_scenario::take_shared<Entity>(&scenario);
        let box2 = test_scenario::take_shared<Entity>(&scenario);

        let directions = vector[3, 0, 1, 3, 3, 0, 1, 1];
        let box_entities = vector[box1, box2];

        game::submit_solution(
            &mut session,
            &world,
            &mut grid,
            &mut player,
            box_entities,
            directions,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(session);
        test_scenario::return_shared(world);
        test_scenario::return_shared(grid);
        test_scenario::return_shared(player);
    };

    test_scenario::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: Two players can start the same level independently
// ═══════════════════════════════════════════════

#[test]
fun test_two_players_independent() {
    let mut scenario = test_scenario::begin(PLAYER_A);

    // Deploy
    game::init_for_testing(test_scenario::ctx(&mut scenario));

    // Player A starts level 1
    test_scenario::next_tx(&mut scenario, PLAYER_A);
    {
        let mut world = test_scenario::take_shared<World>(&scenario);
        let c = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        game::start_level(
            &mut world, 1, &c,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(world);
        clock::destroy_for_testing(c);
    };

    // Player B starts level 1 — gets their own Grid + Session
    test_scenario::next_tx(&mut scenario, PLAYER_B);
    {
        let mut world = test_scenario::take_shared<World>(&scenario);
        let c = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        game::start_level(
            &mut world, 1, &c,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(world);
        clock::destroy_for_testing(c);
    };

    // Verify BOTH sessions and grids exist (2 of each)
    test_scenario::next_tx(&mut scenario, PLAYER_A);
    {
        let session_a = test_scenario::take_shared<GameSession>(&scenario);
        let session_b = test_scenario::take_shared<GameSession>(&scenario);
        let grid_a = test_scenario::take_shared<Grid>(&scenario);
        let grid_b = test_scenario::take_shared<Grid>(&scenario);

        test_scenario::return_shared(session_a);
        test_scenario::return_shared(session_b);
        test_scenario::return_shared(grid_a);
        test_scenario::return_shared(grid_b);
    };

    test_scenario::end(scenario);
}
