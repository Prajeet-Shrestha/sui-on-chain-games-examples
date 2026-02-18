/// SuiTris — Fully on-chain Tetris.
/// Every piece placement is recorded on-chain via PTB-batched transactions.
/// Game replay can be reconstructed from PiecePlaced events.
module suitris::game;

// === Imports ===
use std::ascii;
use sui::event;
use world::world::{Self, World};

// === Errors ===
const ENotPlayer: u64 = 100;
const EGameNotActive: u64 = 101;
const EGameAlreadyFinished: u64 = 102;
const EInvalidPiece: u64 = 103;
const EInvalidColumn: u64 = 104;
const EInvalidRotation: u64 = 105;

// Game states
const STATE_ACTIVE: u8 = 1;
const STATE_FINISHED: u8 = 2;

// Board dimensions
const BOARD_W: u64 = 10;

// === GameSession ===
public struct GameSession has key {
    id: UID,
    state: u8,
    player: address,
    score: u64,
    lines_cleared: u64,
    level: u64,
    pieces_placed: u64,
    game_over: bool,
}

// === Events ===
public struct GameStarted has copy, drop {
    session_id: ID,
    player: address,
}

public struct PiecePlaced has copy, drop {
    session_id: ID,
    piece_type: u64,
    col: u64,
    rotation: u64,
    lines_cleared_by_this: u64,
    cumulative_score: u64,
    cumulative_lines: u64,
    piece_number: u64,
}

public struct GameSaved has copy, drop {
    session_id: ID,
    player: address,
    final_score: u64,
    total_lines: u64,
    pieces_placed: u64,
    level: u64,
}

// === Init ===
fun init(ctx: &mut TxContext) {
    let w = world::create_world(
        ascii::string(b"SuiTris"),
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
        lines_cleared: 0,
        level: 0,
        pieces_placed: 0,
        game_over: false,
    };

    event::emit(GameStarted {
        session_id: object::id(&session),
        player: ctx.sender(),
    });

    transfer::share_object(session);
}

/// Record a single piece placement on-chain.
/// Called multiple times in a single PTB (batched).
/// piece_type: 0-6 (I,O,T,S,Z,L,J)
/// col: 0-9 column where piece was placed
/// rotation: 0-3
public entry fun place_piece(
    session: &mut GameSession,
    piece_type: u64,
    col: u64,
    rotation: u64,
    lines_cleared_by_this: u64,
    cumulative_score: u64,
    cumulative_lines: u64,
    ctx: &TxContext,
) {
    assert!(session.player == ctx.sender(), ENotPlayer);
    assert!(session.state == STATE_ACTIVE, EGameNotActive);
    assert!(!session.game_over, EGameAlreadyFinished);
    assert!(piece_type <= 6, EInvalidPiece);
    assert!(col < BOARD_W, EInvalidColumn);
    assert!(rotation <= 3, EInvalidRotation);

    session.pieces_placed = session.pieces_placed + 1;
    session.score = cumulative_score;
    session.lines_cleared = cumulative_lines;
    session.level = cumulative_lines / 10;

    event::emit(PiecePlaced {
        session_id: object::id(session),
        piece_type,
        col,
        rotation,
        lines_cleared_by_this,
        cumulative_score,
        cumulative_lines,
        piece_number: session.pieces_placed,
    });
}

/// Save the final game results to the blockchain.
/// Called when the game is over on the client side.
/// Can be batched in the same PTB as remaining place_piece calls.
public entry fun save_game(
    session: &mut GameSession,
    final_score: u64,
    total_lines: u64,
    level: u64,
    pieces_placed: u64,
    ctx: &TxContext,
) {
    assert!(session.player == ctx.sender(), ENotPlayer);
    assert!(session.state == STATE_ACTIVE, EGameNotActive);
    assert!(!session.game_over, EGameAlreadyFinished);

    session.score = final_score;
    session.lines_cleared = total_lines;
    session.level = level;
    session.pieces_placed = pieces_placed;
    session.game_over = true;
    session.state = STATE_FINISHED;

    event::emit(GameSaved {
        session_id: object::id(session),
        player: ctx.sender(),
        final_score,
        total_lines,
        pieces_placed,
        level,
    });
}

// === Test Helpers ===
#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
