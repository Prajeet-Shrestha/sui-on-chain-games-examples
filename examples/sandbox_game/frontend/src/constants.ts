// ═══════════════════════════════════════════════
// Package & Object IDs (from testnet deployment)
// ═══════════════════════════════════════════════
export const PACKAGE_ID = '0x82dc228d2954b2962afc0aecb0d2a00be544ecd33d214e391db6b4a515537d80';
export const WORLD_ID = '0x4fe4c668db147b372af6d9abbce3c1e9a47efcd98afbfc589242b6d35504285a';
export const RANDOM_ID = '0x8';

// ═══════════════════════════════════════════════
// Grid Dimensions
// ═══════════════════════════════════════════════
export const GRID_SIZE = 16;
export const CELL_SIZE = 40;

// ═══════════════════════════════════════════════
// Block Types (match contract)
// ═══════════════════════════════════════════════
export const BLOCK_EMPTY = 0;
export const BLOCK_DIRT = 1;
export const BLOCK_WOOD = 2;
export const BLOCK_STONE = 3;
export const BLOCK_IRON_ORE = 4;
export const BLOCK_DIAMOND_ORE = 5;
export const BLOCK_PLACED_DIRT = 6;
export const BLOCK_PLACED_WOOD = 7;
export const BLOCK_PLACED_STONE = 8;

// ═══════════════════════════════════════════════
// Block Colors (CSS)
// ═══════════════════════════════════════════════
export const BLOCK_COLORS: Record<number, string> = {
    0: 'transparent',     // empty
    1: '#8B6914',         // dirt — brown
    2: '#228B22',         // wood — forest green
    3: '#808080',         // stone — gray
    4: '#CD853F',         // iron ore — sandy brown
    5: '#00CED1',         // diamond ore — cyan
    6: '#A0522D',         // placed dirt — sienna
    7: '#2E8B57',         // placed wood — sea green
    8: '#696969',         // placed stone — dim gray
};

export const BLOCK_NAMES: Record<number, string> = {
    0: 'Empty',
    1: 'Dirt',
    2: 'Wood',
    3: 'Stone',
    4: 'Iron Ore',
    5: 'Diamond Ore',
    6: 'Placed Dirt',
    7: 'Placed Wood',
    8: 'Placed Stone',
};

export const BLOCK_ICONS: Record<number, string> = {
    0: '',
    1: '🟫',
    2: '🌲',
    3: '🪨',
    4: '⛏️',
    5: '💎',
    6: '🟫',
    7: '🪵',
    8: '🧱',
};

// ═══════════════════════════════════════════════
// Material Names (inventory indices)
// ═══════════════════════════════════════════════
export const MATERIAL_NAMES = ['Dirt', 'Wood Planks', 'Cobblestone', 'Iron Ingot', 'Diamond'];
export const MATERIAL_ICONS = ['🟫', '🪵', '🧱', '⚙️', '💎'];

// ═══════════════════════════════════════════════
// Tool Names
// ═══════════════════════════════════════════════
export const TOOL_NAMES: Record<number, string> = {
    0: 'Bare Hands',
    1: 'Wood Pickaxe',
    2: 'Stone Pickaxe',
    3: 'Iron Pickaxe',
};

export const TOOL_ICONS: Record<number, string> = {
    0: '✋',
    1: '🪓',
    2: '⛏️',
    3: '🔨',
};

// ═══════════════════════════════════════════════
// Craft Recipes
// ═══════════════════════════════════════════════
export const RECIPES = [
    { id: 0, name: 'Wood Pickaxe', icon: '🪓', cost: '3× Wood', materials: [0, 3, 0, 0, 0] },
    { id: 1, name: 'Stone Pickaxe', icon: '⛏️', cost: '3× Cobble + 2× Wood', materials: [0, 2, 3, 0, 0] },
    { id: 2, name: 'Iron Pickaxe', icon: '🔨', cost: '3× Iron + 2× Wood', materials: [0, 2, 0, 3, 0] },
];

// ═══════════════════════════════════════════════
// Directions
// ═══════════════════════════════════════════════
export const DIR_UP = 0;
export const DIR_DOWN = 1;
export const DIR_LEFT = 2;
export const DIR_RIGHT = 3;

// ═══════════════════════════════════════════════
// Game States
// ═══════════════════════════════════════════════
export const STATE_ACTIVE = 1;
export const STATE_FINISHED = 2;

// ═══════════════════════════════════════════════
// Error Codes
// ═══════════════════════════════════════════════
export const ERROR_MAP: Record<number, string> = {
    100: 'Not the game owner',
    101: 'Game is not active',
    102: 'Position out of bounds',
    103: 'Target block is not adjacent',
    104: 'Nothing to mine here',
    105: 'Position already occupied',
    106: 'Not enough materials',
    107: 'Invalid direction',
    108: 'Invalid block type',
    109: 'Invalid recipe',
    110: 'Cannot mine your own position',
    111: 'Tool too weak for this block',
};
