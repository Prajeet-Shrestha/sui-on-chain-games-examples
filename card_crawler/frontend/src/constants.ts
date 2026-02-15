// ═══════════════════════════════════════════════
// Package ID (from Published.toml)
// ═══════════════════════════════════════════════
export const PACKAGE_ID = '0x7d28bc41d36a181dfa0d42d456df79d118862fc1e424dbe854e42600000cf107';

// ═══════════════════════════════════════════════
// System Objects
// ═══════════════════════════════════════════════
export const CLOCK_ID = '0x6';
export const RANDOM_ID = '0x8';

// ═══════════════════════════════════════════════
// Game States
// ═══════════════════════════════════════════════
export const STATE_LOBBY = 0;
export const STATE_MAP_SELECT = 1;
export const STATE_COMBAT = 2;
export const STATE_REWARD = 3;
export const STATE_SHOP = 4;
export const STATE_REST = 5;
export const STATE_FINISHED = 6;

export const STATE_NAMES: Record<number, string> = {
    [STATE_LOBBY]: 'Lobby',
    [STATE_MAP_SELECT]: 'Map',
    [STATE_COMBAT]: 'Combat',
    [STATE_REWARD]: 'Reward',
    [STATE_SHOP]: 'Shop',
    [STATE_REST]: 'Rest',
    [STATE_FINISHED]: 'Finished',
};

// ═══════════════════════════════════════════════
// Card Types
// ═══════════════════════════════════════════════
export const CARD_TYPE_ATTACK = 0;
export const CARD_TYPE_SKILL = 1;
export const CARD_TYPE_POWER = 2;

export const CARD_TYPE_NAMES: Record<number, string> = {
    [CARD_TYPE_ATTACK]: 'ATK',
    [CARD_TYPE_SKILL]: 'SKILL',
    [CARD_TYPE_POWER]: 'POWER',
};

// ═══════════════════════════════════════════════
// Node Types
// ═══════════════════════════════════════════════
export const NODE_COMBAT = 0;
export const NODE_ELITE = 1;
export const NODE_SHOP = 2;
export const NODE_REST = 3;
export const NODE_BOSS = 4;

export const NODE_TYPE_NAMES: Record<number, string> = {
    [NODE_COMBAT]: '⚔️ Combat',
    [NODE_ELITE]: '🛡️ Elite',
    [NODE_SHOP]: '🛒 Shop',
    [NODE_REST]: '⛺ Rest',
    [NODE_BOSS]: '🐉 Boss',
};

// ═══════════════════════════════════════════════
// Relic Types
// ═══════════════════════════════════════════════
export const RELIC_NAMES: Record<number, string> = {
    0: 'Whetstone (+2 ATK)',
    1: 'Iron Ring (+2 DEF)',
    2: 'Energy Potion (+1 Energy)',
    3: 'Healing Crystal (+5 HP after combat)',
    4: 'Lucky Coin (+15 gold)',
    5: 'Thick Skin (+10 max HP)',
};

// ═══════════════════════════════════════════════
// Enemy Data
// ═══════════════════════════════════════════════
export const ENEMY_NAMES: Record<string, string> = {
    '1-0-0': 'Goblin',
    '1-1-0': 'Slime',
    '2-0-0': 'Skeleton',
    '2-1-0': 'Dark Knight',
    '2-1-1': 'Orc',
    '3-0-0': 'Dragon',
};

// ═══════════════════════════════════════════════
// Map Layout (hardcoded from contract)
// ═══════════════════════════════════════════════
export interface MapNode {
    nodeIndex: number;
    paths: { path: number; nodeType: number; label: string }[];
}

export const MAP_LAYOUT: Record<number, MapNode[]> = {
    1: [
        { nodeIndex: 0, paths: [{ path: 0, nodeType: NODE_COMBAT, label: '⚔️ Goblin (20 HP, 5 ATK)' }] },
        {
            nodeIndex: 1, paths: [
                { path: 0, nodeType: NODE_COMBAT, label: '⚔️ Slime (30 HP, 4 ATK)' },
                { path: 1, nodeType: NODE_REST, label: '⛺ Rest (heal 30%)' },
            ]
        },
        { nodeIndex: 2, paths: [{ path: 0, nodeType: NODE_SHOP, label: '🛒 Shop' }] },
    ],
    2: [
        { nodeIndex: 0, paths: [{ path: 0, nodeType: NODE_COMBAT, label: '⚔️ Skeleton (40 HP, 8 ATK)' }] },
        {
            nodeIndex: 1, paths: [
                { path: 0, nodeType: NODE_ELITE, label: '🛡️ Dark Knight (60 HP, 12 ATK)' },
                { path: 1, nodeType: NODE_COMBAT, label: '⚔️ Orc (50 HP, 7 ATK)' },
            ]
        },
        { nodeIndex: 2, paths: [{ path: 0, nodeType: NODE_SHOP, label: '🛒 Shop' }] },
    ],
    3: [
        { nodeIndex: 0, paths: [{ path: 0, nodeType: NODE_BOSS, label: '🐉 Dragon (100 HP, 15 ATK)' }] },
    ],
};

// ═══════════════════════════════════════════════
// Card Pool (for shop/reward display)
// ═══════════════════════════════════════════════
export interface CardInfo {
    index: number;
    name: string;
    cost: number;
    cardType: number;
    effectType: number;
    value: number;
    description: string;
}

export const SHOP_CARDS: CardInfo[] = [
    { index: 0, name: 'Heavy Blow', cost: 2, cardType: 0, effectType: 2, value: 14, description: 'Deal 14 damage' },
    { index: 1, name: 'Poison Stab', cost: 1, cardType: 0, effectType: 3, value: 3, description: 'Deal 4 dmg + 3 poison' },
    { index: 2, name: 'Whirlwind', cost: 1, cardType: 0, effectType: 4, value: 5, description: 'Deal 5 damage' },
    { index: 3, name: 'Rampage', cost: 1, cardType: 0, effectType: 5, value: 8, description: 'Deal 8 + 4×count' },
    { index: 4, name: 'Execute', cost: 2, cardType: 0, effectType: 6, value: 10, description: 'Deal 10 (25 if <30%)' },
    { index: 5, name: 'Shield Wall', cost: 2, cardType: 1, effectType: 1, value: 12, description: 'Gain 12 block' },
    { index: 6, name: 'Heal', cost: 1, cardType: 1, effectType: 2, value: 8, description: 'Restore 8 HP' },
    { index: 7, name: 'Dodge', cost: 0, cardType: 1, effectType: 3, value: 3, description: 'Gain 3 block (free)' },
    { index: 8, name: 'Weaken', cost: 1, cardType: 1, effectType: 4, value: 3, description: 'Enemy ATK -3, 2 turns' },
    { index: 9, name: 'Adrenaline', cost: 0, cardType: 1, effectType: 5, value: 0, description: 'Draw 2 + 1 energy' },
    { index: 10, name: 'Berserk', cost: 2, cardType: 2, effectType: 0, value: 3, description: '+3 ATK permanent' },
    { index: 11, name: 'Iron Skin', cost: 2, cardType: 2, effectType: 1, value: 3, description: '+3 DEF permanent' },
    { index: 12, name: 'Regeneration', cost: 2, cardType: 2, effectType: 2, value: 2, description: '+2 HP/turn' },
    { index: 13, name: 'Thorns', cost: 1, cardType: 2, effectType: 3, value: 3, description: '3 dmg to attacker' },
    { index: 14, name: 'Fury', cost: 2, cardType: 2, effectType: 4, value: 1, description: '+1 card drawn/turn' },
];

export const REWARD_CARDS: Record<number, CardInfo[]> = {
    1: [
        { index: 0, name: 'Heavy Blow', cost: 2, cardType: 0, effectType: 2, value: 14, description: 'Deal 14 damage' },
        { index: 1, name: 'Poison Stab', cost: 1, cardType: 0, effectType: 3, value: 3, description: 'Deal 4 dmg + 3 poison' },
        { index: 2, name: 'Heal', cost: 1, cardType: 1, effectType: 2, value: 8, description: 'Restore 8 HP' },
    ],
    2: [
        { index: 0, name: 'Execute', cost: 2, cardType: 0, effectType: 6, value: 10, description: 'Deal 10 (25 if <30%)' },
        { index: 1, name: 'Shield Wall', cost: 2, cardType: 1, effectType: 1, value: 12, description: 'Gain 12 block' },
        { index: 2, name: 'Berserk', cost: 2, cardType: 2, effectType: 0, value: 3, description: '+3 ATK permanent' },
    ],
    // Floor 3 uses floor 2 rewards (boss doesn't give rewards anyway)
    3: [
        { index: 0, name: 'Execute', cost: 2, cardType: 0, effectType: 6, value: 10, description: 'Deal 10 (25 if <30%)' },
        { index: 1, name: 'Shield Wall', cost: 2, cardType: 1, effectType: 1, value: 12, description: 'Gain 12 block' },
        { index: 2, name: 'Berserk', cost: 2, cardType: 2, effectType: 0, value: 3, description: '+3 ATK permanent' },
    ],
};

// ═══════════════════════════════════════════════
// Error Codes
// ═══════════════════════════════════════════════
export const ERROR_MAP: Record<number, string> = {
    100: 'Wrong game state for this action',
    101: 'Not the session owner',
    102: 'Invalid node selection',
    103: 'Invalid card choice',
    104: 'Invalid item type',
    105: 'Combat is not over',
    106: 'Game already started',
    107: 'Floor not cleared yet',
    108: 'Relic inventory full (max 3)',
};
