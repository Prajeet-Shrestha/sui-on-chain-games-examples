// ═══════════════════════════════════════════════
// SuiFlap — Constants
// ═══════════════════════════════════════════════

// On-chain IDs — deployed to Sui testnet
export const PACKAGE_ID = '0x5296b9a1a392372a8f8be2b9fd0760187fe370e978cfa51dda5474cc050e1c28';
export const WORLD_ID = '0x0348e5feaa07c7bfcbd3a90041d8b2597eba36f70e22f9c4cfdec4cbf578f293';

// Game state constants
export const STATE_FINISHED = 2;

// Error map for on-chain transactions
export const ERROR_MAP: Record<number, string> = {
    100: 'Only the player who started this game can perform this action',
    101: 'Game is not active',
    102: 'Game already finished',
};
