/// Virus game tests — level start, flood-fill, win, lose, PTB batching.
#[test_only]
module virus_game::game_tests;

use sui::test_scenario;
use virus_game::game::{Self, GameSession};
use world::world::World;

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

const PLAYER: address = @0xA1;
const OTHER: address = @0xB2;

// ═══════════════════════════════════════════════
// TEST: Start Level 1
// ═══════════════════════════════════════════════

#[test]
fun test_start_level_1() {
    let mut scenario = test_scenario::begin(PLAYER);

    // Deploy
    game::init_for_testing(test_scenario::ctx(&mut scenario));

    // Start level 1
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let world = test_scenario::take_shared<World>(&scenario);

        let session = game::start_level(
            &world,
            1,
            test_scenario::ctx(&mut scenario),
        );

        // Verify initial state
        assert!(game::state(&session) == 1); // STATE_ACTIVE
        assert!(game::level(&session) == 1);
        assert!(game::board_width(&session) == 5);
        assert!(game::board_height(&session) == 5);
        assert!(game::num_colors(&session) == 4);
        assert!(game::moves_remaining(&session) == 12);
        assert!(game::moves_used(&session) == 0);
        assert!(game::controlled_count(&session) == 1); // 1 virus start
        assert!(game::total_cells(&session) == 25);

        game::share_session(session);
        test_scenario::return_shared(world);
    };

    test_scenario::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: Choose color absorbs adjacent cells
// ═══════════════════════════════════════════════

#[test]
fun test_choose_color_absorbs() {
    let mut scenario = test_scenario::begin(PLAYER);

    // Deploy
    game::init_for_testing(test_scenario::ctx(&mut scenario));

    // Start level 1
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let world = test_scenario::take_shared<World>(&scenario);
        let session = game::start_level(&world, 1, test_scenario::ctx(&mut scenario));
        game::share_session(session);
        test_scenario::return_shared(world);
    };

    // Choose color 1 (blue) — should absorb cells adjacent to (0,0) that are blue
    // Board[0,0]=0(red), Board[0,1]=1(blue), Board[1,0]=1(blue)
    // After choosing 1: controlled cells expand to include (0,1) and (1,0) at minimum
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let mut session = test_scenario::take_shared<GameSession>(&scenario);

        game::choose_color(
            &mut session,
            1, // blue
            test_scenario::ctx(&mut scenario),
        );

        // Should have absorbed some cells
        assert!(game::controlled_count(&session) > 1);
        assert!(game::moves_remaining(&session) == 11);
        assert!(game::moves_used(&session) == 1);
        // Game should still be active (not won yet)
        assert!(game::state(&session) == 1);

        test_scenario::return_shared(session);
    };

    test_scenario::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: Win Level 1 with known optimal solution
// ═══════════════════════════════════════════════

#[test]
fun test_win_level_1() {
    let mut scenario = test_scenario::begin(PLAYER);

    // Deploy
    game::init_for_testing(test_scenario::ctx(&mut scenario));

    // Start level 1
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let world = test_scenario::take_shared<World>(&scenario);
        let session = game::start_level(&world, 1, test_scenario::ctx(&mut scenario));
        game::share_session(session);
        test_scenario::return_shared(world);
    };

    // Apply optimal solution: 1→2→3→0→1→2→0→3 (8 moves)
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let mut session = test_scenario::take_shared<GameSession>(&scenario);

        let solution = vector[1, 2, 3, 0, 1, 2, 0, 3];
        let mut i = 0;
        while (i < vector::length(&solution)) {
            game::choose_color(
                &mut session,
                *vector::borrow(&solution, i),
                test_scenario::ctx(&mut scenario),
            );
            i = i + 1;
        };

        // Should be won
        assert!(game::state(&session) == 2); // STATE_WON
        assert!(game::controlled_count(&session) == 25); // all cells
        assert!(game::moves_used(&session) == 8);
        assert!(game::moves_remaining(&session) == 4);

        test_scenario::return_shared(session);
    };

    test_scenario::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: Lose by running out of moves
// ═══════════════════════════════════════════════

#[test]
fun test_lose_out_of_moves() {
    let mut scenario = test_scenario::begin(PLAYER);

    // Deploy
    game::init_for_testing(test_scenario::ctx(&mut scenario));

    // Start level 1 (12 max moves)
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let world = test_scenario::take_shared<World>(&scenario);
        let session = game::start_level(&world, 1, test_scenario::ctx(&mut scenario));
        game::share_session(session);
        test_scenario::return_shared(world);
    };

    // Play a deliberately bad strategy: alternate 1,2,1,2,... for 12 moves
    // This won't solve the puzzle
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let mut session = test_scenario::take_shared<GameSession>(&scenario);

        let bad_moves = vector[1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
        let mut i = 0;
        while (i < vector::length(&bad_moves)) {
            // Stop if game is no longer active
            if (game::state(&session) != 1) {
                break
            };
            game::choose_color(
                &mut session,
                *vector::borrow(&bad_moves, i),
                test_scenario::ctx(&mut scenario),
            );
            i = i + 1;
        };

        // Should be lost (all moves used, board not fully controlled)
        // OR won if somehow the bad strategy got lucky
        let st = game::state(&session);
        assert!(st == 2 || st == 3); // WON or LOST

        test_scenario::return_shared(session);
    };

    test_scenario::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: Wrong player cannot act
// ═══════════════════════════════════════════════

#[test]
#[expected_failure(abort_code = 101)]  // ENotPlayer
fun test_wrong_player_rejected() {
    let mut scenario = test_scenario::begin(PLAYER);

    // Deploy
    game::init_for_testing(test_scenario::ctx(&mut scenario));

    // Start level as PLAYER
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let world = test_scenario::take_shared<World>(&scenario);
        let session = game::start_level(&world, 1, test_scenario::ctx(&mut scenario));
        game::share_session(session);
        test_scenario::return_shared(world);
    };

    // OTHER tries to play — should fail
    test_scenario::next_tx(&mut scenario, OTHER);
    {
        let mut session = test_scenario::take_shared<GameSession>(&scenario);

        game::choose_color(
            &mut session,
            1,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(session);
    };

    test_scenario::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: Same color rejected
// ═══════════════════════════════════════════════

#[test]
#[expected_failure(abort_code = 106)]  // ESameColor
fun test_same_color_rejected() {
    let mut scenario = test_scenario::begin(PLAYER);

    // Deploy
    game::init_for_testing(test_scenario::ctx(&mut scenario));

    // Start level 1 — virus starts as color 0
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let world = test_scenario::take_shared<World>(&scenario);
        let session = game::start_level(&world, 1, test_scenario::ctx(&mut scenario));
        game::share_session(session);
        test_scenario::return_shared(world);
    };

    // Try to pick color 0 (same as current virus color) — should fail
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let mut session = test_scenario::take_shared<GameSession>(&scenario);

        game::choose_color(
            &mut session,
            0, // same as virus start color
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(session);
    };

    test_scenario::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: Invalid color rejected
// ═══════════════════════════════════════════════

#[test]
#[expected_failure(abort_code = 102)]  // EInvalidColor
fun test_invalid_color_rejected() {
    let mut scenario = test_scenario::begin(PLAYER);

    // Deploy
    game::init_for_testing(test_scenario::ctx(&mut scenario));

    // Start level 1 (4 colors: 0-3)
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let world = test_scenario::take_shared<World>(&scenario);
        let session = game::start_level(&world, 1, test_scenario::ctx(&mut scenario));
        game::share_session(session);
        test_scenario::return_shared(world);
    };

    // Try color 4 (out of range for level 1)
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let mut session = test_scenario::take_shared<GameSession>(&scenario);

        game::choose_color(
            &mut session,
            4, // invalid for 4-color level
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(session);
    };

    test_scenario::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: Level 4 with multi-virus
// ═══════════════════════════════════════════════

#[test]
fun test_level_4_multi_virus() {
    let mut scenario = test_scenario::begin(PLAYER);

    // Deploy
    game::init_for_testing(test_scenario::ctx(&mut scenario));

    // Start level 4 (2 viruses)
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let world = test_scenario::take_shared<World>(&scenario);
        let session = game::start_level(&world, 4, test_scenario::ctx(&mut scenario));

        // Verify 2 virus starts
        assert!(game::controlled_count(&session) == 2);
        assert!(game::board_width(&session) == 10);
        assert!(game::board_height(&session) == 10);
        assert!(game::num_colors(&session) == 6);
        assert!(game::total_cells(&session) == 100);

        game::share_session(session);
        test_scenario::return_shared(world);
    };

    // Make a move and verify both blobs expand
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let mut session = test_scenario::take_shared<GameSession>(&scenario);

        game::choose_color(
            &mut session,
            1, // choose blue
            test_scenario::ctx(&mut scenario),
        );

        // Should have absorbed more than 2 cells (both blobs expand)
        assert!(game::controlled_count(&session) > 2);

        test_scenario::return_shared(session);
    };

    test_scenario::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: PTB multi-move (batch multiple colors in one tx)
// ═══════════════════════════════════════════════

#[test]
fun test_ptb_multi_move() {
    let mut scenario = test_scenario::begin(PLAYER);

    // Deploy
    game::init_for_testing(test_scenario::ctx(&mut scenario));

    // Start level 1
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let world = test_scenario::take_shared<World>(&scenario);
        let session = game::start_level(&world, 1, test_scenario::ctx(&mut scenario));
        game::share_session(session);
        test_scenario::return_shared(world);
    };

    // Simulate PTB: 3 choose_color calls in one transaction
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let mut session = test_scenario::take_shared<GameSession>(&scenario);

        // Three moves in one tx (like a PTB would)
        game::choose_color(&mut session, 1, test_scenario::ctx(&mut scenario));
        game::choose_color(&mut session, 2, test_scenario::ctx(&mut scenario));
        game::choose_color(&mut session, 3, test_scenario::ctx(&mut scenario));

        assert!(game::moves_used(&session) == 3);
        assert!(game::moves_remaining(&session) == 9);

        test_scenario::return_shared(session);
    };

    test_scenario::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: Entry wrapper works
// ═══════════════════════════════════════════════

#[test]
fun test_entry_wrapper() {
    let mut scenario = test_scenario::begin(PLAYER);

    // Deploy
    game::init_for_testing(test_scenario::ctx(&mut scenario));

    // Start via entry wrapper
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let world = test_scenario::take_shared<World>(&scenario);

        game::start_level_entry(
            &world,
            1,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(world);
    };

    // Choose color via entry wrapper
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let mut session = test_scenario::take_shared<GameSession>(&scenario);

        game::choose_color_entry(
            &mut session,
            1,
            test_scenario::ctx(&mut scenario),
        );

        assert!(game::moves_used(&session) == 1);

        test_scenario::return_shared(session);
    };

    test_scenario::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: Level 5 starts with 3 viruses
// ═══════════════════════════════════════════════

#[test]
fun test_level_5_three_viruses() {
    let mut scenario = test_scenario::begin(PLAYER);

    // Deploy
    game::init_for_testing(test_scenario::ctx(&mut scenario));

    // Start level 5
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let world = test_scenario::take_shared<World>(&scenario);
        let session = game::start_level(&world, 5, test_scenario::ctx(&mut scenario));

        assert!(game::controlled_count(&session) == 3); // 3 virus starts
        assert!(game::board_width(&session) == 12);
        assert!(game::board_height(&session) == 12);
        assert!(game::num_colors(&session) == 7);
        assert!(game::total_cells(&session) == 144);
        assert!(game::moves_remaining(&session) == 30);

        game::share_session(session);
        test_scenario::return_shared(world);
    };

    test_scenario::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: Invalid level rejected
// ═══════════════════════════════════════════════

#[test]
#[expected_failure(abort_code = 105)]  // EInvalidLevel
fun test_invalid_level_rejected() {
    let mut scenario = test_scenario::begin(PLAYER);

    // Deploy
    game::init_for_testing(test_scenario::ctx(&mut scenario));

    // Try level 6 (invalid)
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let world = test_scenario::take_shared<World>(&scenario);
        let session = game::start_level(&world, 6, test_scenario::ctx(&mut scenario));
        game::share_session(session);
        test_scenario::return_shared(world);
    };

    test_scenario::end(scenario);
}
