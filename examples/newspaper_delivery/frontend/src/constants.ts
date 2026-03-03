// ═══════════════════════════════════════════════
// City Delivery — Constants
// ═══════════════════════════════════════════════

// On-chain IDs — will be updated after deployment
export const PACKAGE_ID = '0x52d28e1ff762596db7c778967673b106f2f5168928f563b331d1052d2e389ee3';
export const WORLD_ID = '0x9b0a48b007532c4f066648ad2f623bcd02017eb0b704aed768e01a4ec9f62679';

// PTB batching — pause for signing every N deliveries
export const SIGN_THRESHOLD = 5;

// Game state constants
export const STATE_FINISHED = 2;

// Score tiers
export const TIER_PERFECT = 0;
export const TIER_GOOD = 1;
export const TIER_OK = 2;
export const TIER_MISS = 3;

// Score values
export const SCORE_PERFECT = 100;
export const SCORE_GOOD = 50;
export const SCORE_OK = 10;
export const SCORE_MISS = 0;

// Error map for on-chain transactions
export const ERROR_MAP: Record<number, string> = {
    100: 'Only the player who started this game can perform this action',
    101: 'Game is not active',
    102: 'Game already finished',
    103: 'Invalid score tier',
};
