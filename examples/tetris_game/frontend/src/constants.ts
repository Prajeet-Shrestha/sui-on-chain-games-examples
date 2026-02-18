// ═══════════════════════════════════════════════
// SuiTris — Game Constants
// ═══════════════════════════════════════════════

// On-chain IDs
export const PACKAGE_ID = '0x113881ab06acd9574a5d90045a8ec10ba0401ff25044f70fcc8227647218df29';
export const WORLD_ID = '0xbf373e0d9ae1ee9eb47b83fc088f88ec089a326038f25da764814592a1e6a4ce';

// Canvas rendering
export const CELL_SIZE = 32;

// PTB batching limits
// Each place_piece = 1 MoveCall command in a PTB.
// Sui PTB limit is 1024 commands. We stay well under for gas safety.
export const MAX_BATCH = 100;       // max pieces per PTB
export const SIGN_THRESHOLD = 95;   // pause game when buffer reaches this

// Error codes from Move contract
export const ERROR_MAP: Record<number, string> = {
    100: 'Only the player who started this game can perform this action',
    101: 'Game is not active',
    102: 'Game already finished',
    103: 'Invalid piece type',
    104: 'Invalid column',
    105: 'Invalid rotation',
};
