/// Virus / Flood-It — On-Chain Puzzle Game
/// Player picks colors to flood-fill the board. All controlled cells adopt the
/// chosen color and absorb adjacent cells of that color via BFS.
/// Five fixed levels with progressive difficulty and multi-virus support.
///
/// Architecture: Pure data board (vector<u8>) inside GameSession.
/// No per-cell entities — gas-efficient and simple.
/// All action functions are `public fun` for PTB composability.
#[allow(unused_const, unused_field, lint(public_entry))]
module virus_game::game;

use std::ascii;
use sui::event;

use world::world::{Self, World};

// ═══════════════════════════════════════════════
// ERROR CONSTANTS
// ═══════════════════════════════════════════════

const EInvalidState: u64 = 100;
const ENotPlayer: u64 = 101;
const EInvalidColor: u64 = 102;
const ENoMovesLeft: u64 = 103;
const EGameNotActive: u64 = 104;
const EInvalidLevel: u64 = 105;
const ESameColor: u64 = 106;
const EAlreadyStarted: u64 = 107;
const EGameOver: u64 = 108;

// ═══════════════════════════════════════════════
// GAME CONSTANTS
// ═══════════════════════════════════════════════

const STATE_LOBBY: u8 = 0;
const STATE_ACTIVE: u8 = 1;
const STATE_WON: u8 = 2;
const STATE_LOST: u8 = 3;

const MAX_LEVEL: u8 = 5;

// ═══════════════════════════════════════════════
// GAME SESSION
// ═══════════════════════════════════════════════

public struct GameSession has key {
    id: UID,
    state: u8,
    player: address,
    level: u8,
    board: vector<u8>,
    controlled: vector<bool>,
    controlled_count: u64,
    moves_remaining: u64,
    moves_used: u64,
    num_colors: u8,
    board_width: u64,
    board_height: u64,
    virus_starts: vector<u64>,
}

// ═══════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════

public struct WorldCreated has copy, drop {
    world_id: ID,
}

public struct GameStarted has copy, drop {
    session_id: ID,
    level: u8,
    player: address,
    board_width: u64,
    board_height: u64,
    num_colors: u8,
    moves_remaining: u64,
}

public struct ColorChosen has copy, drop {
    session_id: ID,
    color: u8,
    cells_absorbed: u64,
    controlled_count: u64,
    moves_remaining: u64,
}

public struct GameWon has copy, drop {
    session_id: ID,
    level: u8,
    moves_used: u64,
}

public struct GameLost has copy, drop {
    session_id: ID,
    level: u8,
    moves_used: u64,
    controlled_count: u64,
    total_cells: u64,
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════

fun init(ctx: &mut TxContext) {
    let world = world::create_world(
        ascii::string(b"VirusFlood"),
        1000,
        ctx,
    );

    event::emit(WorldCreated {
        world_id: object::id(&world),
    });

    world::share(world);
}

// ═══════════════════════════════════════════════
// PUBLIC FUNCTIONS (PTB-composable)
// ═══════════════════════════════════════════════

/// Start a level — creates a new GameSession with the fixed board layout.
public fun start_level(
    _world: &World,
    level: u8,
    ctx: &mut TxContext,
): GameSession {
    assert!(level >= 1 && level <= MAX_LEVEL, EInvalidLevel);

    let player_addr = ctx.sender();

    // Load level data
    let (board, virus_starts, board_width, board_height, num_colors, max_moves) =
        get_level_data(level);

    // Build controlled vector
    let total = board_width * board_height;
    let mut controlled = vector[];
    let mut controlled_count = 0u64;
    let mut i = 0;
    while (i < total) {
        if (vector_contains(&virus_starts, i)) {
            vector::push_back(&mut controlled, true);
            controlled_count = controlled_count + 1;
        } else {
            vector::push_back(&mut controlled, false);
        };
        i = i + 1;
    };

    let session = GameSession {
        id: object::new(ctx),
        state: STATE_ACTIVE,
        player: player_addr,
        level,
        board,
        controlled,
        controlled_count,
        moves_remaining: max_moves,
        moves_used: 0,
        num_colors,
        board_width,
        board_height,
        virus_starts,
    };

    event::emit(GameStarted {
        session_id: object::id(&session),
        level,
        player: player_addr,
        board_width,
        board_height,
        num_colors,
        moves_remaining: max_moves,
    });

    session
}

/// Choose a color — flood-fill from all controlled cells.
/// This is the core game action, called once per turn.
public fun choose_color(
    session: &mut GameSession,
    color: u8,
    ctx: &TxContext,
) {
    assert!(session.state == STATE_ACTIVE, EGameNotActive);
    assert!(session.player == ctx.sender(), ENotPlayer);
    assert!(color < session.num_colors, EInvalidColor);
    assert!(session.moves_remaining > 0, ENoMovesLeft);

    // Get current virus color (from first controlled cell)
    let first_start = *vector::borrow(&session.virus_starts, 0);
    let current_color = *vector::borrow(&session.board, first_start);
    assert!(color != current_color, ESameColor);

    // Step 1: Change all controlled cells to new color
    let total = session.board_width * session.board_height;
    let mut i = 0;
    while (i < total) {
        if (*vector::borrow(&session.controlled, i)) {
            *vector::borrow_mut(&mut session.board, i) = color;
        };
        i = i + 1;
    };

    // Step 2: BFS flood-fill from all controlled cells
    let mut queue: vector<u64> = vector[];

    // Seed queue with all controlled cells
    i = 0;
    while (i < total) {
        if (*vector::borrow(&session.controlled, i)) {
            vector::push_back(&mut queue, i);
        };
        i = i + 1;
    };

    // BFS
    while (!vector::is_empty(&queue)) {
        let idx = vector::remove(&mut queue, 0);
        let x = idx % session.board_width;
        let y = idx / session.board_width;

        // Check 4 neighbors
        // UP
        if (y > 0) {
            let n = idx - session.board_width;
            if (!*vector::borrow(&session.controlled, n) &&
                *vector::borrow(&session.board, n) == color) {
                *vector::borrow_mut(&mut session.controlled, n) = true;
                session.controlled_count = session.controlled_count + 1;
                vector::push_back(&mut queue, n);
            };
        };
        // DOWN
        if (y + 1 < session.board_height) {
            let n = idx + session.board_width;
            if (!*vector::borrow(&session.controlled, n) &&
                *vector::borrow(&session.board, n) == color) {
                *vector::borrow_mut(&mut session.controlled, n) = true;
                session.controlled_count = session.controlled_count + 1;
                vector::push_back(&mut queue, n);
            };
        };
        // LEFT
        if (x > 0) {
            let n = idx - 1;
            if (!*vector::borrow(&session.controlled, n) &&
                *vector::borrow(&session.board, n) == color) {
                *vector::borrow_mut(&mut session.controlled, n) = true;
                session.controlled_count = session.controlled_count + 1;
                vector::push_back(&mut queue, n);
            };
        };
        // RIGHT
        if (x + 1 < session.board_width) {
            let n = idx + 1;
            if (!*vector::borrow(&session.controlled, n) &&
                *vector::borrow(&session.board, n) == color) {
                *vector::borrow_mut(&mut session.controlled, n) = true;
                session.controlled_count = session.controlled_count + 1;
                vector::push_back(&mut queue, n);
            };
        };
    };

    // Update move counters
    session.moves_remaining = session.moves_remaining - 1;
    session.moves_used = session.moves_used + 1;

    let cells_absorbed = session.controlled_count;

    event::emit(ColorChosen {
        session_id: object::id(session),
        color,
        cells_absorbed,
        controlled_count: session.controlled_count,
        moves_remaining: session.moves_remaining,
    });

    // Check win condition
    if (session.controlled_count == total) {
        session.state = STATE_WON;
        event::emit(GameWon {
            session_id: object::id(session),
            level: session.level,
            moves_used: session.moves_used,
        });
    } else if (session.moves_remaining == 0) {
        // Out of moves, not fully controlled — LOSE
        session.state = STATE_LOST;
        event::emit(GameLost {
            session_id: object::id(session),
            level: session.level,
            moves_used: session.moves_used,
            controlled_count: session.controlled_count,
            total_cells: total,
        });
    };
}

// ═══════════════════════════════════════════════
// ENTRY WRAPPERS (convenience for single calls)
// ═══════════════════════════════════════════════

/// Start a level and share the session.
public entry fun start_level_entry(
    world: &World,
    level: u8,
    ctx: &mut TxContext,
) {
    let session = start_level(world, level, ctx);
    transfer::share_object(session);
}

/// Choose a color (single-action entry point).
public entry fun choose_color_entry(
    session: &mut GameSession,
    color: u8,
    ctx: &TxContext,
) {
    choose_color(session, color, ctx);
}

// ═══════════════════════════════════════════════
// VIEW FUNCTIONS
// ═══════════════════════════════════════════════

public fun board(session: &GameSession): &vector<u8> { &session.board }
public fun controlled(session: &GameSession): &vector<bool> { &session.controlled }
public fun controlled_count(session: &GameSession): u64 { session.controlled_count }
public fun moves_remaining(session: &GameSession): u64 { session.moves_remaining }
public fun moves_used(session: &GameSession): u64 { session.moves_used }
public fun state(session: &GameSession): u8 { session.state }
public fun level(session: &GameSession): u8 { session.level }
public fun board_width(session: &GameSession): u64 { session.board_width }
public fun board_height(session: &GameSession): u64 { session.board_height }
public fun num_colors(session: &GameSession): u8 { session.num_colors }
public fun total_cells(session: &GameSession): u64 {
    session.board_width * session.board_height
}

// ═══════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════

fun vector_contains(v: &vector<u64>, val: u64): bool {
    let len = vector::length(v);
    let mut i = 0;
    while (i < len) {
        if (*vector::borrow(v, i) == val) {
            return true
        };
        i = i + 1;
    };
    false
}

// ═══════════════════════════════════════════════
// LEVEL DATA
// ═══════════════════════════════════════════════
// Returns (board, virus_starts, width, height, num_colors, max_moves)

fun get_level_data(level: u8): (vector<u8>, vector<u64>, u64, u64, u8, u64) {
    if (level == 1) {
        // Level 1: "Patient Zero" — 5×5, 4 colors, 1 virus
        // Optimal: 8 moves, Max: 12
        (
            vector[
                0,1,1,2,3,
                1,0,3,1,2,
                2,3,0,0,1,
                3,2,1,3,0,
                0,1,2,0,3
            ],
            vector[0],      // virus starts
            5, 5,            // width, height
            4,               // num_colors
            12,              // max_moves
        )
    } else if (level == 2) {
        // Level 2: "Outbreak" — 6×6, 5 colors, 1 virus
        // Greedy best: 16 moves, Max: 18
        (
            vector[
                0,3,1,4,4,2,
                2,4,2,3,1,0,
                1,1,2,0,3,4,
                3,2,4,3,1,2,
                0,1,0,4,0,1,
                0,2,2,1,3,0
            ],
            vector[0],
            6, 6,
            5,
            18,
        )
    } else if (level == 3) {
        // Level 3: "Pandemic" — 8×8, 6 colors, 1 virus
        // Greedy best: 24 moves, Max: 25 (razor thin!)
        (
            vector[
                0,4,0,3,2,4,2,0,
                1,3,1,1,1,2,0,2,
                0,1,0,4,4,3,2,0,
                2,4,1,4,0,4,0,5,
                3,1,2,4,1,0,1,2,
                1,0,5,1,4,1,0,1,
                2,2,2,3,0,5,4,0,
                1,5,4,2,3,1,5,3
            ],
            vector[0],
            8, 8,
            6,
            25,
        )
    } else if (level == 4) {
        // Level 4: "Contagion" — 10×10, 6 colors, 2 viruses (pincer)
        // Greedy best: 24 moves, Max: 27
        (
            vector[
                0,5,0,4,0,3,1,5,2,3,
                1,3,2,5,5,4,4,0,1,4,
                0,2,2,3,0,5,5,1,2,2,
                1,3,1,4,4,4,3,4,0,5,
                0,2,2,3,1,4,1,5,2,3,
                0,1,0,2,5,5,0,2,0,0,
                0,1,2,3,1,4,2,3,5,5,
                5,5,5,3,4,1,1,1,4,2,
                0,1,5,4,2,1,3,2,5,2,
                2,3,2,0,5,2,1,5,1,0
            ],
            vector[0, 99],     // top-left + bottom-right
            10, 10,
            6,
            27,
        )
    } else {
        // Level 5: "Total Extinction" — 12×12, 7 colors, 3 viruses (triangle)
        // Greedy best: 26 moves, Max: 30
        (
            vector[
                0,5,2,2,0,0,6,0,1,5,6,0,
                2,0,6,5,4,5,0,6,6,6,2,1,
                0,3,1,3,2,6,6,5,0,4,6,6,
                0,6,1,1,3,1,5,2,4,0,4,6,
                5,2,1,0,5,4,3,0,2,5,5,1,
                2,3,1,5,5,4,5,6,2,2,3,5,
                1,1,6,0,2,3,3,6,0,4,3,1,
                5,3,3,6,1,3,6,0,1,1,2,5,
                0,2,5,2,4,6,2,3,4,4,3,2,
                6,3,6,5,1,4,2,0,3,0,2,4,
                5,4,5,3,6,3,5,3,1,0,0,6,
                6,5,0,1,0,3,0,1,2,1,5,6
            ],
            vector[0, 11, 138],  // top-left + top-right + bottom-center
            12, 12,
            7,
            30,
        )
    }
}

// ═══════════════════════════════════════════════
// PTB HELPERS
// ═══════════════════════════════════════════════

/// Share a GameSession object. Used in PTBs after start_level + choose_color batching.
public fun share_session(session: GameSession) {
    transfer::share_object(session);
}

// ═══════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
