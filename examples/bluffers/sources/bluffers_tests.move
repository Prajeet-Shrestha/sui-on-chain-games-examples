#[test_only]
#[allow(unused_const)]
module bluffers::bluffers_tests;

use sui::test_scenario::{Self as ts};
use sui::random;
use bluffers::bluffers::{
    Self,
    GameRegistry,
    BlufferGame,
};

const CREATOR: address = @0xC0;
const PLAYER1: address = @0xB1;
const PLAYER2: address = @0xB2;

/// Create the Sui Random shared object in the test context.
fun setup_random(scenario: &mut ts::Scenario) {
    ts::next_tx(scenario, @0x0);
    {
        random::create_for_testing(ts::ctx(scenario));
    };
}

// ============================================================
// Test: Create lobby and join
// ============================================================
#[test]
fun test_create_and_join() {
    let mut scenario = ts::begin(CREATOR);

    {
        bluffers::init_for_testing(ts::ctx(&mut scenario));
    };

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut registry = ts::take_shared<GameRegistry>(&scenario);
        bluffers::create_lobby(&mut registry, 3, ts::ctx(&mut scenario));
        ts::return_shared(registry);
    };

    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut game = ts::take_shared<BlufferGame>(&scenario);
        bluffers::join_lobby(&mut game, ts::ctx(&mut scenario));
        assert!(bluffers::player_count(&game) == 2, 0);
        ts::return_shared(game);
    };

    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut game = ts::take_shared<BlufferGame>(&scenario);
        bluffers::join_lobby(&mut game, ts::ctx(&mut scenario));
        assert!(bluffers::player_count(&game) == 3, 1);
        assert!(bluffers::game_state(&game) == 0, 2);
        ts::return_shared(game);
    };

    ts::end(scenario);
}

// ============================================================
// Test: Start game deals cards and sets table card
// ============================================================
#[test]
fun test_start_game() {
    let mut scenario = ts::begin(CREATOR);

    {
        bluffers::init_for_testing(ts::ctx(&mut scenario));
    };

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut registry = ts::take_shared<GameRegistry>(&scenario);
        bluffers::create_lobby(&mut registry, 2, ts::ctx(&mut scenario));
        ts::return_shared(registry);
    };

    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut game = ts::take_shared<BlufferGame>(&scenario);
        bluffers::join_lobby(&mut game, ts::ctx(&mut scenario));
        ts::return_shared(game);
    };

    setup_random(&mut scenario);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut game = ts::take_shared<BlufferGame>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);

        bluffers::start_game(&mut game, &r, ts::ctx(&mut scenario));

        assert!(bluffers::game_state(&game) == 1, 0); // STATE_ACTIVE = 1
        assert!(bluffers::round(&game) == 1, 1);
        // Table card must be 0 (King), 1 (Queen), or 2 (Jack)
        assert!(bluffers::table_card(&game) <= 2, 2);
        // Both players should have 5 cards
        assert!(vector::length(bluffers::player_hand(&game, 0)) == 5, 3);
        assert!(vector::length(bluffers::player_hand(&game, 1)) == 5, 4);

        ts::return_shared(game);
        ts::return_shared(r);
    };

    ts::end(scenario);
}

// ============================================================
// Test: Play cards and pass (no claim param)
// ============================================================
#[test]
fun test_play_and_pass() {
    let mut scenario = ts::begin(CREATOR);

    {
        bluffers::init_for_testing(ts::ctx(&mut scenario));
    };

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut registry = ts::take_shared<GameRegistry>(&scenario);
        bluffers::create_lobby(&mut registry, 2, ts::ctx(&mut scenario));
        ts::return_shared(registry);
    };

    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut game = ts::take_shared<BlufferGame>(&scenario);
        bluffers::join_lobby(&mut game, ts::ctx(&mut scenario));
        ts::return_shared(game);
    };

    setup_random(&mut scenario);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut game = ts::take_shared<BlufferGame>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);
        bluffers::start_game(&mut game, &r, ts::ctx(&mut scenario));
        ts::return_shared(game);
        ts::return_shared(r);
    };

    // Creator (idx 0) plays 1 card — no claim param, always table card
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut game = ts::take_shared<BlufferGame>(&scenario);
        bluffers::play_cards(&mut game, vector[0u64], ts::ctx(&mut scenario));
        assert!(bluffers::pending_count(&game) == 1, 0);
        // pending_claim() now returns table_card
        assert!(bluffers::pending_claim(&game) == bluffers::table_card(&game), 1);
        ts::return_shared(game);
    };

    // Player1 (next player) passes
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut game = ts::take_shared<BlufferGame>(&scenario);
        bluffers::pass(&mut game, ts::ctx(&mut scenario));
        // Pending cleared, turn advances to player1 (idx 1)
        assert!(bluffers::pending_state(&game) == 0, 2);
        assert!(bluffers::current_player_idx(&game) == 1, 3);
        ts::return_shared(game);
    };

    ts::end(scenario);
}

// ============================================================
// Test: Call liar (roulette resolves — game continues or ends)
// ============================================================
#[test]
fun test_call_liar() {
    let mut scenario = ts::begin(CREATOR);

    {
        bluffers::init_for_testing(ts::ctx(&mut scenario));
    };

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut registry = ts::take_shared<GameRegistry>(&scenario);
        bluffers::create_lobby(&mut registry, 2, ts::ctx(&mut scenario));
        ts::return_shared(registry);
    };

    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut game = ts::take_shared<BlufferGame>(&scenario);
        bluffers::join_lobby(&mut game, ts::ctx(&mut scenario));
        ts::return_shared(game);
    };

    setup_random(&mut scenario);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut game = ts::take_shared<BlufferGame>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);
        bluffers::start_game(&mut game, &r, ts::ctx(&mut scenario));
        ts::return_shared(game);
        ts::return_shared(r);
    };

    // Creator plays card 0
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut game = ts::take_shared<BlufferGame>(&scenario);
        bluffers::play_cards(&mut game, vector[0u64], ts::ctx(&mut scenario));
        ts::return_shared(game);
    };

    // Player1 calls liar — roulette fires
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut game = ts::take_shared<BlufferGame>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);
        bluffers::call_liar(&mut game, &r, ts::ctx(&mut scenario));
        // State is ACTIVE (1) or FINISHED (2)
        let state = bluffers::game_state(&game);
        assert!(state == 1 || state == 2, 0);
        ts::return_shared(game);
        ts::return_shared(r);
    };

    ts::end(scenario);
}

// ============================================================
// Test: Cannot join full lobby (EGameFull = 102)
// ============================================================
#[test]
#[expected_failure(abort_code = 102)] // EGameFull
fun test_join_full_lobby() {
    let mut scenario = ts::begin(CREATOR);

    {
        bluffers::init_for_testing(ts::ctx(&mut scenario));
    };

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut registry = ts::take_shared<GameRegistry>(&scenario);
        bluffers::create_lobby(&mut registry, 2, ts::ctx(&mut scenario));
        ts::return_shared(registry);
    };

    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut game = ts::take_shared<BlufferGame>(&scenario);
        bluffers::join_lobby(&mut game, ts::ctx(&mut scenario));
        ts::return_shared(game);
    };

    // Player2 tries to join a full 2-player lobby → EGameFull (102)
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut game = ts::take_shared<BlufferGame>(&scenario);
        bluffers::join_lobby(&mut game, ts::ctx(&mut scenario));
        ts::return_shared(game);
    };

    ts::end(scenario);
}

// ============================================================
// Test: Cannot play out of turn (ENotYourTurn = 106)
// ============================================================
#[test]
#[expected_failure(abort_code = 106)] // ENotYourTurn
fun test_not_your_turn() {
    let mut scenario = ts::begin(CREATOR);

    {
        bluffers::init_for_testing(ts::ctx(&mut scenario));
    };

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut registry = ts::take_shared<GameRegistry>(&scenario);
        bluffers::create_lobby(&mut registry, 2, ts::ctx(&mut scenario));
        ts::return_shared(registry);
    };

    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut game = ts::take_shared<BlufferGame>(&scenario);
        bluffers::join_lobby(&mut game, ts::ctx(&mut scenario));
        ts::return_shared(game);
    };

    setup_random(&mut scenario);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut game = ts::take_shared<BlufferGame>(&scenario);
        let r = ts::take_shared<random::Random>(&scenario);
        bluffers::start_game(&mut game, &r, ts::ctx(&mut scenario));
        ts::return_shared(game);
        ts::return_shared(r);
    };

    // Player1 plays when it's Creator's turn → ENotYourTurn (106)
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut game = ts::take_shared<BlufferGame>(&scenario);
        bluffers::play_cards(&mut game, vector[0u64], ts::ctx(&mut scenario));
        ts::return_shared(game);
    };

    ts::end(scenario);
}
