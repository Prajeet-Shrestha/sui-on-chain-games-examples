/// SuiFlap — On-chain Flappy Bird (score recording).
/// The game runs client-side. Blockchain records start + final score.
module flappy_bird::game;

// === Imports ===
use std::ascii;
use sui::event;
use world::world::{Self, World};

// === Errors ===
const ENotPlayer: u64 = 100;
const EGameNotActive: u64 = 101;
const EGameAlreadyFinished: u64 = 102;

// Game states
const STATE_ACTIVE: u8 = 1;
const STATE_FINISHED: u8 = 2;

// === GameSession ===
public struct GameSession has key {
    id: UID,
    state: u8,
    player: address,
    score: u64,
    pipes_passed: u64,
    game_over: bool,
}

// === Events ===
public struct GameStarted has copy, drop {
    session_id: ID,
    player: address,
}

public struct GameSaved has copy, drop {
    session_id: ID,
    player: address,
    final_score: u64,
    pipes_passed: u64,
}

// === Init ===
fun init(ctx: &mut TxContext) {
    let w = world::create_world(
        ascii::string(b"SuiFlap"),
        100,
        ctx,
    );
    world::share(w);
}

// === Entry Functions ===

/// Start a new game. Creates a shared GameSession.
public entry fun start_game(
    _world: &World,
    ctx: &mut TxContext,
) {
    let session = GameSession {
        id: object::new(ctx),
        state: STATE_ACTIVE,
        player: ctx.sender(),
        score: 0,
        pipes_passed: 0,
        game_over: false,
    };

    event::emit(GameStarted {
        session_id: object::id(&session),
        player: ctx.sender(),
    });

    transfer::share_object(session);
}

/// Save the final game results to the blockchain.
/// Called when the game is over on the client side.
public entry fun save_game(
    session: &mut GameSession,
    final_score: u64,
    pipes_passed: u64,
    ctx: &TxContext,
) {
    assert!(session.player == ctx.sender(), ENotPlayer);
    assert!(session.state == STATE_ACTIVE, EGameNotActive);
    assert!(!session.game_over, EGameAlreadyFinished);

    session.score = final_score;
    session.pipes_passed = pipes_passed;
    session.game_over = true;
    session.state = STATE_FINISHED;

    event::emit(GameSaved {
        session_id: object::id(session),
        player: ctx.sender(),
        final_score,
        pipes_passed,
    });
}

// === Test Helpers ===
#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
