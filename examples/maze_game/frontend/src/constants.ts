// ═══════════════════════════════════════════════
// SuiMaze — Constants
// ═══════════════════════════════════════════════

// On-chain IDs — deployed to Sui testnet
export const PACKAGE_ID = '0x9c232c222bb213de82bad321459efefdbd5d0a63c7cf2d139acceda13d589014';
export const WORLD_ID = '0x9deda02d37591a3ef25796a0961141e378cee2c44b61686c5737891706d3eb38';

// Direction constants (must match Move contract)
export const DIR_UP = 0;
export const DIR_RIGHT = 1;
export const DIR_DOWN = 2;
export const DIR_LEFT = 3;

// Game state
export const STATE_ACTIVE = 1;
export const STATE_FINISHED = 2;

// Error map for on-chain transactions
export const ERROR_MAP: Record<number, string> = {
    100: 'Only the player who started this game can perform this action',
    101: 'Game is not active',
    105: 'Invalid level — must be 1-5',
    106: 'Invalid direction — must be 0-3',
    107: 'Wall collision — cannot move there',
    108: 'Out of moves — move limit exceeded',
    109: 'Not at exit — player has not reached the exit',
};
