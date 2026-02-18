/// SuiMaze — Fully on-chain maze game.
/// Maze is generated deterministically from a seed.
/// Player moves are submitted as a batch PTB and validated on-chain.
#[allow(unused_const)]
module maze_game::game;

// === Imports ===
use std::ascii;
use sui::event;
use world::world::{Self, World};

// === Errors ===
const ENotPlayer: u64 = 100;
const EGameNotActive: u64 = 101;
const EInvalidLevel: u64 = 105;
const EInvalidDirection: u64 = 106;
const EWallCollision: u64 = 107;
const EOutOfMoves: u64 = 108;
const ENotAtExit: u64 = 109;

// === Game States ===
const STATE_ACTIVE: u8 = 1;
const STATE_FINISHED: u8 = 2;

// === Directions ===
const DIR_UP: u8 = 0;
const DIR_RIGHT: u8 = 1;
const DIR_DOWN: u8 = 2;
const DIR_LEFT: u8 = 3;

// === GameSession (shared object) ===
public struct GameSession has key {
    id: UID,
    state: u8,
    player: address,
    level: u8,
    maze_size: u64,
    max_moves: u64,
    exit_x: u64,
    exit_y: u64,
    player_x: u64,
    player_y: u64,
    moves_count: u64,
    /// Flat maze grid: maze[y * size + x] = 1 means wall
    maze: vector<u8>,
}

// === Events ===
public struct GameStarted has copy, drop {
    session_id: ID,
    player: address,
    level: u8,
    maze_size: u64,
    max_moves: u64,
}

public struct PlayerMoved has copy, drop {
    session_id: ID,
    direction: u8,
    new_x: u64,
    new_y: u64,
    moves_count: u64,
}

public struct LevelCompleted has copy, drop {
    session_id: ID,
    player: address,
    level: u8,
    moves_used: u64,
}

// === Init ===
fun init(ctx: &mut TxContext) {
    let w = world::create_world(
        ascii::string(b"SuiMaze"),
        100,
        ctx,
    );
    world::share(w);
}

// === Maze Generation (deterministic, seeded) ===

/// Seeded LCG — identical to TypeScript: s = (s * 1664525 + 1013904223) & 0x7fffffff
fun next_random(s: u64): (u64, u64) {
    // Use u128 to avoid overflow during multiplication
    let big = (s as u128) * 1664525u128 + 1013904223u128;
    let next = ((big & 0x7fffffffu128) as u64);
    (next, next)
}

/// Get level size (must match TypeScript LEVELS array)
fun level_size(level: u8): u64 {
    if (level == 1) { 17 }
    else if (level == 2) { 21 }
    else if (level == 3) { 25 }
    else if (level == 4) { 31 }
    else { 39 } // level 5
}

/// Get moves multiplier ×10 (to avoid floating point) — matches TS
fun level_moves_multiplier_x10(level: u8): u64 {
    if (level == 1) { 25 }       // 2.5x
    else if (level == 2) { 22 }  // 2.2x
    else if (level == 3) { 20 }  // 2.0x
    else if (level == 4) { 19 }  // 1.9x
    else { 18 }                  // 1.8x
}

/// Generate the maze walls for a given level.
/// Returns (maze_flat_vector, maze_size, shortest_path_length).
/// Uses DFS backtracker with seeded random — must match TypeScript exactly.
fun generate_maze(level: u8): (vector<u8>, u64) {
    let size = level_size(level);
    let total = size * size;

    // Initialize all walls (1 = wall)
    let mut maze = vector::empty<u8>();
    let mut i = 0u64;
    while (i < total) {
        maze.push_back(1u8);
        i = i + 1;
    };

    // Seed: level * 31337 + 42 (matches TypeScript)
    let mut seed = (level as u64) * 31337 + 42;

    // Carve start cell
    let start_x = 1u64;
    let start_y = 1u64;
    *&mut maze[start_y * size + start_x] = 0u8;

    // DFS stack: store (x, y) packed as x * size + y for simplicity
    let mut stack = vector::empty<u64>();
    stack.push_back(start_x * 10000 + start_y); // pack x,y

    // Visited set using a flat boolean array
    let total_cells = size * size;
    let mut visited = vector::empty<bool>();
    i = 0;
    while (i < total_cells) {
        visited.push_back(false);
        i = i + 1;
    };
    *&mut visited[start_y * size + start_x] = true;

    // Direction offsets: up(0,-2), right(2,0), down(0,2), left(-2,0)
    // We'll encode as 4 constant pairs
    while (!stack.is_empty()) {
        let top = *stack.borrow(stack.length() - 1);
        let cx = top / 10000;
        let cy = top % 10000;

        // Collect unvisited neighbors
        let mut neighbor_count = 0u8;
        let mut n0_nx = 0u64;
        let mut n0_ny = 0u64;
        let mut n0_wx = 0u64;
        let mut n0_wy = 0u64;
        let mut n1_nx = 0u64;
        let mut n1_ny = 0u64;
        let mut n1_wx = 0u64;
        let mut n1_wy = 0u64;
        let mut n2_nx = 0u64;
        let mut n2_ny = 0u64;
        let mut n2_wx = 0u64;
        let mut n2_wy = 0u64;
        let mut n3_nx = 0u64;
        let mut n3_ny = 0u64;
        let mut n3_wx = 0u64;
        let mut n3_wy = 0u64;

        // Check UP: cy - 2
        if (cy >= 2) {
            let ny = cy - 2;
            let nx = cx;
            if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1) {
                if (!*visited.borrow(ny * size + nx)) {
                    if (neighbor_count == 0) { n0_nx = nx; n0_ny = ny; n0_wx = cx; n0_wy = cy - 1; }
                    else if (neighbor_count == 1) { n1_nx = nx; n1_ny = ny; n1_wx = cx; n1_wy = cy - 1; }
                    else if (neighbor_count == 2) { n2_nx = nx; n2_ny = ny; n2_wx = cx; n2_wy = cy - 1; }
                    else { n3_nx = nx; n3_ny = ny; n3_wx = cx; n3_wy = cy - 1; };
                    neighbor_count = neighbor_count + 1;
                };
            };
        };

        // Check RIGHT: cx + 2
        {
            let nx = cx + 2;
            let ny = cy;
            if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1) {
                if (!*visited.borrow(ny * size + nx)) {
                    if (neighbor_count == 0) { n0_nx = nx; n0_ny = ny; n0_wx = cx + 1; n0_wy = cy; }
                    else if (neighbor_count == 1) { n1_nx = nx; n1_ny = ny; n1_wx = cx + 1; n1_wy = cy; }
                    else if (neighbor_count == 2) { n2_nx = nx; n2_ny = ny; n2_wx = cx + 1; n2_wy = cy; }
                    else { n3_nx = nx; n3_ny = ny; n3_wx = cx + 1; n3_wy = cy; };
                    neighbor_count = neighbor_count + 1;
                };
            };
        };

        // Check DOWN: cy + 2
        {
            let nx = cx;
            let ny = cy + 2;
            if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1) {
                if (!*visited.borrow(ny * size + nx)) {
                    if (neighbor_count == 0) { n0_nx = nx; n0_ny = ny; n0_wx = cx; n0_wy = cy + 1; }
                    else if (neighbor_count == 1) { n1_nx = nx; n1_ny = ny; n1_wx = cx; n1_wy = cy + 1; }
                    else if (neighbor_count == 2) { n2_nx = nx; n2_ny = ny; n2_wx = cx; n2_wy = cy + 1; }
                    else { n3_nx = nx; n3_ny = ny; n3_wx = cx; n3_wy = cy + 1; };
                    neighbor_count = neighbor_count + 1;
                };
            };
        };

        // Check LEFT: cx - 2
        if (cx >= 2) {
            let nx = cx - 2;
            let ny = cy;
            if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1) {
                if (!*visited.borrow(ny * size + nx)) {
                    if (neighbor_count == 0) { n0_nx = nx; n0_ny = ny; n0_wx = cx - 1; n0_wy = cy; }
                    else if (neighbor_count == 1) { n1_nx = nx; n1_ny = ny; n1_wx = cx - 1; n1_wy = cy; }
                    else if (neighbor_count == 2) { n2_nx = nx; n2_ny = ny; n2_wx = cx - 1; n2_wy = cy; }
                    else { n3_nx = nx; n3_ny = ny; n3_wx = cx - 1; n3_wy = cy; };
                    neighbor_count = neighbor_count + 1;
                };
            };
        };

        if (neighbor_count == 0) {
            stack.pop_back();
        } else {
            // Pick random neighbor
            let (next_seed, rand_val) = next_random(seed);
            seed = next_seed;
            let idx = rand_val % (neighbor_count as u64);

            let (nx, ny, wx, wy) = if (idx == 0) {
                (n0_nx, n0_ny, n0_wx, n0_wy)
            } else if (idx == 1) {
                (n1_nx, n1_ny, n1_wx, n1_wy)
            } else if (idx == 2) {
                (n2_nx, n2_ny, n2_wx, n2_wy)
            } else {
                (n3_nx, n3_ny, n3_wx, n3_wy)
            };

            // Carve path
            *&mut maze[ny * size + nx] = 0u8;
            *&mut maze[wy * size + wx] = 0u8;

            *&mut visited[ny * size + nx] = true;
            stack.push_back(nx * 10000 + ny);
        };
    };

    // Ensure exit cell is open
    let exit_x = size - 2;
    let exit_y = size - 2;
    *&mut maze[exit_y * size + exit_x] = 0u8;

    (maze, size)
}

/// BFS to find shortest path length (for computing max_moves)
fun bfs_shortest_path(maze: &vector<u8>, size: u64, start_x: u64, start_y: u64, exit_x: u64, exit_y: u64): u64 {
    let total = size * size;
    let mut dist = vector::empty<u64>();
    let mut i = 0u64;
    while (i < total) {
        dist.push_back(0xFFFFFFFF); // infinity
        i = i + 1;
    };
    *&mut dist[start_y * size + start_x] = 0;

    // Simple BFS with a queue (vector used as queue with head pointer)
    let mut queue = vector::empty<u64>();
    queue.push_back(start_x * 10000 + start_y);
    let mut head = 0u64;

    while (head < queue.length()) {
        let packed = *queue.borrow(head);
        head = head + 1;
        let x = packed / 10000;
        let y = packed % 10000;
        let current_dist = *dist.borrow(y * size + x);

        if (x == exit_x && y == exit_y) {
            return current_dist
        };

        // Check 4 directions
        // UP
        if (y >= 1) {
            let ny = y - 1;
            let idx = ny * size + x;
            if (*maze.borrow(idx) == 0 && *dist.borrow(idx) == 0xFFFFFFFF) {
                *&mut dist[idx] = current_dist + 1;
                queue.push_back(x * 10000 + ny);
            };
        };
        // RIGHT
        if (x + 1 < size) {
            let nx = x + 1;
            let idx = y * size + nx;
            if (*maze.borrow(idx) == 0 && *dist.borrow(idx) == 0xFFFFFFFF) {
                *&mut dist[idx] = current_dist + 1;
                queue.push_back(nx * 10000 + y);
            };
        };
        // DOWN
        if (y + 1 < size) {
            let ny = y + 1;
            let idx = ny * size + x;
            if (*maze.borrow(idx) == 0 && *dist.borrow(idx) == 0xFFFFFFFF) {
                *&mut dist[idx] = current_dist + 1;
                queue.push_back(x * 10000 + ny);
            };
        };
        // LEFT
        if (x >= 1) {
            let nx = x - 1;
            let idx = y * size + nx;
            if (*maze.borrow(idx) == 0 && *dist.borrow(idx) == 0xFFFFFFFF) {
                *&mut dist[idx] = current_dist + 1;
                queue.push_back(nx * 10000 + y);
            };
        };
    };

    0xFFFFFFFF // no path found (should never happen)
}

// === Entry Functions ===

/// Start a new game — generates the maze on-chain and stores it.
entry fun start_game(
    _world: &World,
    level: u8,
    ctx: &mut TxContext,
) {
    assert!(level >= 1 && level <= 5, EInvalidLevel);

    let (maze, size) = generate_maze(level);
    let exit_x = size - 2;
    let exit_y = size - 2;

    // Compute max_moves from BFS shortest path × multiplier
    let shortest = bfs_shortest_path(&maze, size, 1, 1, exit_x, exit_y);
    let multiplier_x10 = level_moves_multiplier_x10(level);
    let max_moves = (shortest * multiplier_x10 + 9) / 10; // ceiling division

    let session = GameSession {
        id: object::new(ctx),
        state: STATE_ACTIVE,
        player: ctx.sender(),
        level,
        maze_size: size,
        max_moves,
        exit_x,
        exit_y,
        player_x: 1,
        player_y: 1,
        moves_count: 0,
        maze,
    };

    event::emit(GameStarted {
        session_id: object::id(&session),
        player: ctx.sender(),
        level,
        maze_size: size,
        max_moves,
    });

    transfer::share_object(session);
}

/// Move the player one tile in a direction. Validates the move on-chain.
/// `public fun` (not entry) so it can be composed in PTBs.
public fun move_player(
    session: &mut GameSession,
    direction: u8,
    ctx: &TxContext,
) {
    assert!(session.player == ctx.sender(), ENotPlayer);
    assert!(session.state == STATE_ACTIVE, EGameNotActive);
    assert!(direction <= 3, EInvalidDirection);
    assert!(session.moves_count < session.max_moves, EOutOfMoves);

    let size = session.maze_size;
    let mut new_x = session.player_x;
    let mut new_y = session.player_y;

    if (direction == DIR_UP) {
        assert!(new_y >= 1, EWallCollision); // bounds check
        new_y = new_y - 1;
    } else if (direction == DIR_RIGHT) {
        new_x = new_x + 1;
        assert!(new_x < size, EWallCollision); // bounds check
    } else if (direction == DIR_DOWN) {
        new_y = new_y + 1;
        assert!(new_y < size, EWallCollision); // bounds check
    } else {
        // DIR_LEFT
        assert!(new_x >= 1, EWallCollision); // bounds check
        new_x = new_x - 1;
    };

    // Check wall collision
    let tile = *session.maze.borrow(new_y * size + new_x);
    assert!(tile == 0, EWallCollision);

    // Update position
    session.player_x = new_x;
    session.player_y = new_y;
    session.moves_count = session.moves_count + 1;

    event::emit(PlayerMoved {
        session_id: object::id(session),
        direction,
        new_x,
        new_y,
        moves_count: session.moves_count,
    });
}

/// Verify the player reached the exit and complete the level.
public fun complete_level(
    session: &mut GameSession,
    ctx: &TxContext,
) {
    assert!(session.player == ctx.sender(), ENotPlayer);
    assert!(session.state == STATE_ACTIVE, EGameNotActive);
    assert!(session.player_x == session.exit_x && session.player_y == session.exit_y, ENotAtExit);

    session.state = STATE_FINISHED;

    event::emit(LevelCompleted {
        session_id: object::id(session),
        player: ctx.sender(),
        level: session.level,
        moves_used: session.moves_count,
    });
}

// === Test Helpers ===
#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
