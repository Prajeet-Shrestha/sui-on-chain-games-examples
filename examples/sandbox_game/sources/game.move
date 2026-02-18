/// SuiCraft — Fully on-chain Sandbox Game on Sui.
/// Turn-based: player moves, mines blocks, places blocks, crafts tools.
/// World stored as vector<u8> (256 bytes = 16×16 grid).
module suicraft::game;

// === Imports ===
use std::ascii;
use sui::event;
use sui::random::{Self, Random};
use world::world::{Self, World};

// === Errors ===
const ENotPlayer: u64 = 100;
const EGameNotActive: u64 = 101;
const EOutOfBounds: u64 = 102;
const ENotAdjacent: u64 = 103;
const ECellEmpty: u64 = 104;
const ECellOccupied: u64 = 105;
const EInsufficientMaterials: u64 = 106;
const EInvalidDirection: u64 = 107;
const EInvalidBlockType: u64 = 108;
const EInvalidRecipe: u64 = 109;
const ECannotMineSelf: u64 = 110;
const EToolTooWeak: u64 = 111;

// === Constants ===
const GRID_SIZE: u64 = 16;
const TOTAL_CELLS: u64 = 256; // 16 * 16

// Block types
const BLOCK_EMPTY: u8 = 0;
const BLOCK_DIRT: u8 = 1;
const BLOCK_WOOD: u8 = 2;
const BLOCK_STONE: u8 = 3;
const BLOCK_IRON_ORE: u8 = 4;
const BLOCK_DIAMOND_ORE: u8 = 5;
const BLOCK_PLACED_DIRT: u8 = 6;
const BLOCK_PLACED_WOOD: u8 = 7;
const BLOCK_PLACED_STONE: u8 = 8;

// Material indices in inventory
const MAT_DIRT: u64 = 0;
const MAT_WOOD: u64 = 1;
const MAT_COBBLESTONE: u64 = 2;
const MAT_IRON: u64 = 3;
const MAT_DIAMOND: u64 = 4;
const INVENTORY_SIZE: u64 = 5;

// Tool tiers
const TOOL_HAND: u8 = 0;
const TOOL_WOOD_PICKAXE: u8 = 1;
const TOOL_STONE_PICKAXE: u8 = 2;
const TOOL_IRON_PICKAXE: u8 = 3;

// Tool durability
const DURABILITY_WOOD: u64 = 30;
const DURABILITY_STONE: u64 = 60;
const DURABILITY_IRON: u64 = 120;

// Game states
const STATE_ACTIVE: u8 = 1;
const STATE_FINISHED: u8 = 2;

// Directions
const DIR_UP: u8 = 0;
const DIR_DOWN: u8 = 1;
const DIR_LEFT: u8 = 2;
const DIR_RIGHT: u8 = 3;

// Craft recipe IDs
const RECIPE_WOOD_PICKAXE: u8 = 0;
const RECIPE_STONE_PICKAXE: u8 = 1;
const RECIPE_IRON_PICKAXE: u8 = 2;

// Player marker on grid (special value — not a real block)
const PLAYER_MARKER: u8 = 255;

// === GameSession ===
public struct GameSession has key {
    id: UID,
    state: u8,
    player: address,
    // 16×16 grid, row-major: grid[row * 16 + col]
    // Values: 0=empty, 1=dirt, 2=wood, 3=stone, 4=iron, 5=diamond, 6-8=placed blocks
    grid: vector<u8>,
    // Player position
    player_x: u64,
    player_y: u64,
    // Inventory: [dirt, wood_planks, cobblestone, iron_ingot, diamond]
    inventory: vector<u64>,
    // Equipped tool
    tool_tier: u8,
    tool_durability: u64,
    // Stats
    blocks_mined: u64,
    blocks_placed: u64,
    items_crafted: u64,
}

// === Events ===
public struct GameStarted has copy, drop {
    session_id: ID,
    player: address,
}

public struct PlayerMoved has copy, drop {
    session_id: ID,
    new_x: u64,
    new_y: u64,
}

public struct BlockMined has copy, drop {
    session_id: ID,
    x: u64,
    y: u64,
    block_type: u8,
    material_index: u64,
}

public struct BlockPlaced has copy, drop {
    session_id: ID,
    x: u64,
    y: u64,
    block_type: u8,
}

public struct ToolCrafted has copy, drop {
    session_id: ID,
    tool_tier: u8,
    durability: u64,
}

// === Init ===
fun init(ctx: &mut TxContext) {
    let w = world::create_world(
        ascii::string(b"SuiCraft"),
        10,
        ctx,
    );
    world::share(w);
}

// === Entry Functions ===

/// Start a new sandbox game. Creates a GameSession with procedurally generated terrain.
public entry fun start_game(
    _world: &World,
    r: &Random,
    ctx: &mut TxContext,
) {
    let mut rng = random::new_generator(r, ctx);

    // Generate terrain
    let mut grid = vector::empty<u8>();
    let mut i: u64 = 0;
    while (i < TOTAL_CELLS) {
        let roll = random::generate_u8_in_range(&mut rng, 0, 100);
        let block = if (roll < 55) {
            BLOCK_EMPTY
        } else if (roll < 70) {
            BLOCK_DIRT
        } else if (roll < 82) {
            BLOCK_WOOD
        } else if (roll < 92) {
            BLOCK_STONE
        } else if (roll < 97) {
            BLOCK_IRON_ORE
        } else {
            BLOCK_DIAMOND_ORE
        };
        vector::push_back(&mut grid, block);
        i = i + 1;
    };

    // Clear spawn area (center 3x3)
    let spawn_x: u64 = 8;
    let spawn_y: u64 = 8;
    let mut dy: u64 = 0;
    while (dy < 3) {
        let mut dx: u64 = 0;
        while (dx < 3) {
            let sx = spawn_x - 1 + dx;
            let sy = spawn_y - 1 + dy;
            let idx = sy * GRID_SIZE + sx;
            *vector::borrow_mut(&mut grid, idx) = BLOCK_EMPTY;
            dx = dx + 1;
        };
        dy = dy + 1;
    };

    // Initialize inventory (all zeros)
    let mut inventory = vector::empty<u64>();
    let mut j: u64 = 0;
    while (j < INVENTORY_SIZE) {
        vector::push_back(&mut inventory, 0);
        j = j + 1;
    };

    let session = GameSession {
        id: object::new(ctx),
        state: STATE_ACTIVE,
        player: ctx.sender(),
        grid,
        player_x: spawn_x,
        player_y: spawn_y,
        inventory,
        tool_tier: TOOL_HAND,
        tool_durability: 0,
        blocks_mined: 0,
        blocks_placed: 0,
        items_crafted: 0,
    };

    event::emit(GameStarted {
        session_id: object::id(&session),
        player: ctx.sender(),
    });

    transfer::share_object(session);
}

/// Move the player in a direction (0=up, 1=down, 2=left, 3=right).
public entry fun move_player(
    session: &mut GameSession,
    direction: u8,
    ctx: &TxContext,
) {
    assert!(session.player == ctx.sender(), ENotPlayer);
    assert!(session.state == STATE_ACTIVE, EGameNotActive);
    assert!(direction <= 3, EInvalidDirection);

    let mut new_x = session.player_x;
    let mut new_y = session.player_y;

    if (direction == DIR_UP) {
        assert!(new_y > 0, EOutOfBounds);
        new_y = new_y - 1;
    } else if (direction == DIR_DOWN) {
        assert!(new_y < GRID_SIZE - 1, EOutOfBounds);
        new_y = new_y + 1;
    } else if (direction == DIR_LEFT) {
        assert!(new_x > 0, EOutOfBounds);
        new_x = new_x - 1;
    } else {
        // DIR_RIGHT
        assert!(new_x < GRID_SIZE - 1, EOutOfBounds);
        new_x = new_x + 1;
    };

    // Check destination is empty
    let idx = new_y * GRID_SIZE + new_x;
    assert!(*vector::borrow(&session.grid, idx) == BLOCK_EMPTY, ECellOccupied);

    session.player_x = new_x;
    session.player_y = new_y;

    event::emit(PlayerMoved {
        session_id: object::id(session),
        new_x,
        new_y,
    });
}

/// Mine a block at coordinates (x, y). Must be adjacent to the player.
public entry fun mine_block(
    session: &mut GameSession,
    x: u64,
    y: u64,
    ctx: &TxContext,
) {
    assert!(session.player == ctx.sender(), ENotPlayer);
    assert!(session.state == STATE_ACTIVE, EGameNotActive);
    assert!(x < GRID_SIZE && y < GRID_SIZE, EOutOfBounds);

    // Must be adjacent (Manhattan distance == 1)
    let dx = if (x >= session.player_x) { x - session.player_x } else { session.player_x - x };
    let dy = if (y >= session.player_y) { y - session.player_y } else { session.player_y - y };
    assert!(dx + dy == 1, ENotAdjacent);

    let idx = y * GRID_SIZE + x;
    let block_type = *vector::borrow(&session.grid, idx);
    assert!(block_type != BLOCK_EMPTY, ECellEmpty);

    // Check tool requirement
    if (block_type == BLOCK_STONE || block_type == BLOCK_PLACED_STONE) {
        assert!(session.tool_tier >= TOOL_WOOD_PICKAXE, EToolTooWeak);
    };
    if (block_type == BLOCK_IRON_ORE) {
        assert!(session.tool_tier >= TOOL_STONE_PICKAXE, EToolTooWeak);
    };
    if (block_type == BLOCK_DIAMOND_ORE) {
        assert!(session.tool_tier >= TOOL_IRON_PICKAXE, EToolTooWeak);
    };

    // Determine material drop
    let material_index = if (block_type == BLOCK_DIRT || block_type == BLOCK_PLACED_DIRT) {
        MAT_DIRT
    } else if (block_type == BLOCK_WOOD || block_type == BLOCK_PLACED_WOOD) {
        MAT_WOOD
    } else if (block_type == BLOCK_STONE || block_type == BLOCK_PLACED_STONE) {
        MAT_COBBLESTONE
    } else if (block_type == BLOCK_IRON_ORE) {
        MAT_IRON
    } else {
        // BLOCK_DIAMOND_ORE
        MAT_DIAMOND
    };

    // Add material to inventory
    let current = *vector::borrow(&session.inventory, material_index);
    *vector::borrow_mut(&mut session.inventory, material_index) = current + 1;

    // Clear the block from grid
    *vector::borrow_mut(&mut session.grid, idx) = BLOCK_EMPTY;

    // Degrade tool durability (if using a tool)
    if (session.tool_tier > TOOL_HAND) {
        if (session.tool_durability > 0) {
            session.tool_durability = session.tool_durability - 1;
        };
        if (session.tool_durability == 0) {
            session.tool_tier = TOOL_HAND;
        };
    };

    session.blocks_mined = session.blocks_mined + 1;

    event::emit(BlockMined {
        session_id: object::id(session),
        x,
        y,
        block_type,
        material_index,
    });
}

/// Place a block at coordinates (x, y). Must be adjacent to the player.
/// block_type: 6=dirt, 7=wood, 8=stone (placed variants)
public entry fun place_block(
    session: &mut GameSession,
    x: u64,
    y: u64,
    block_type: u8,
    ctx: &TxContext,
) {
    assert!(session.player == ctx.sender(), ENotPlayer);
    assert!(session.state == STATE_ACTIVE, EGameNotActive);
    assert!(x < GRID_SIZE && y < GRID_SIZE, EOutOfBounds);
    assert!(
        block_type == BLOCK_PLACED_DIRT ||
        block_type == BLOCK_PLACED_WOOD ||
        block_type == BLOCK_PLACED_STONE,
        EInvalidBlockType
    );

    // Must be adjacent
    let dx = if (x >= session.player_x) { x - session.player_x } else { session.player_x - x };
    let dy = if (y >= session.player_y) { y - session.player_y } else { session.player_y - y };
    assert!(dx + dy == 1, ENotAdjacent);

    // Can't place where player stands
    assert!(!(x == session.player_x && y == session.player_y), ECannotMineSelf);

    let idx = y * GRID_SIZE + x;
    assert!(*vector::borrow(&session.grid, idx) == BLOCK_EMPTY, ECellOccupied);

    // Check inventory
    let material_index = if (block_type == BLOCK_PLACED_DIRT) {
        MAT_DIRT
    } else if (block_type == BLOCK_PLACED_WOOD) {
        MAT_WOOD
    } else {
        MAT_COBBLESTONE
    };

    let current = *vector::borrow(&session.inventory, material_index);
    assert!(current > 0, EInsufficientMaterials);

    // Deduct material
    *vector::borrow_mut(&mut session.inventory, material_index) = current - 1;

    // Place block
    *vector::borrow_mut(&mut session.grid, idx) = block_type;

    session.blocks_placed = session.blocks_placed + 1;

    event::emit(BlockPlaced {
        session_id: object::id(session),
        x,
        y,
        block_type,
    });
}

/// Craft a tool from materials.
/// recipe_id: 0=wood_pickaxe(3 wood), 1=stone_pickaxe(3 cobble+2 wood), 2=iron_pickaxe(3 iron+2 wood)
public entry fun craft_tool(
    session: &mut GameSession,
    recipe_id: u8,
    ctx: &TxContext,
) {
    assert!(session.player == ctx.sender(), ENotPlayer);
    assert!(session.state == STATE_ACTIVE, EGameNotActive);
    assert!(recipe_id <= 2, EInvalidRecipe);

    if (recipe_id == RECIPE_WOOD_PICKAXE) {
        // 3 wood
        let wood = *vector::borrow(&session.inventory, MAT_WOOD);
        assert!(wood >= 3, EInsufficientMaterials);
        *vector::borrow_mut(&mut session.inventory, MAT_WOOD) = wood - 3;
        session.tool_tier = TOOL_WOOD_PICKAXE;
        session.tool_durability = DURABILITY_WOOD;
    } else if (recipe_id == RECIPE_STONE_PICKAXE) {
        // 3 cobblestone + 2 wood
        let cobble = *vector::borrow(&session.inventory, MAT_COBBLESTONE);
        let wood = *vector::borrow(&session.inventory, MAT_WOOD);
        assert!(cobble >= 3 && wood >= 2, EInsufficientMaterials);
        *vector::borrow_mut(&mut session.inventory, MAT_COBBLESTONE) = cobble - 3;
        *vector::borrow_mut(&mut session.inventory, MAT_WOOD) = wood - 2;
        session.tool_tier = TOOL_STONE_PICKAXE;
        session.tool_durability = DURABILITY_STONE;
    } else {
        // RECIPE_IRON_PICKAXE: 3 iron + 2 wood
        let iron = *vector::borrow(&session.inventory, MAT_IRON);
        let wood = *vector::borrow(&session.inventory, MAT_WOOD);
        assert!(iron >= 3 && wood >= 2, EInsufficientMaterials);
        *vector::borrow_mut(&mut session.inventory, MAT_IRON) = iron - 3;
        *vector::borrow_mut(&mut session.inventory, MAT_WOOD) = wood - 2;
        session.tool_tier = TOOL_IRON_PICKAXE;
        session.tool_durability = DURABILITY_IRON;
    };

    session.items_crafted = session.items_crafted + 1;

    event::emit(ToolCrafted {
        session_id: object::id(session),
        tool_tier: session.tool_tier,
        durability: session.tool_durability,
    });
}

// === Test Helpers ===
#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
