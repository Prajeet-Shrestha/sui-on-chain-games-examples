// ============================================================
// Deployed Contract Constants (v2 — corrected game flow)
// ============================================================
export const PACKAGE_ID = '0x760df738461959dd4156a888f1ec0a786718431b8b20a5eed0644e83001b72cf';
export const GAME_REGISTRY_ID = '0x66dfb39670df3f3cc90146a8134d2c9a38ed91a37cc9ed8ae79f4afda7d1706e';
// Sui's shared Random object (same on all Sui networks)
export const RANDOM_ID = '0x8';

// ============================================================
// Game State Constants (mirrors bluffers.move)
// ============================================================
export const STATE_LOBBY = 0;
export const STATE_ACTIVE = 1;
export const STATE_FINISHED = 2;

// Pending play sub-state
export const PENDING_NONE = 0;
export const PENDING_PLAYED = 1;
export const PENDING_ROULETTE = 2; // empty-hand mechanic — accepter must trigger_pull

// ============================================================
// Card Constants
// ============================================================
export const CARD_KING = 0;
export const CARD_QUEEN = 1;
export const CARD_JACK = 2;
export const CARD_JOKER = 3;

export const CARD_NAMES: Record<number, string> = {
    [CARD_KING]: 'King',
    [CARD_QUEEN]: 'Queen',
    [CARD_JACK]: 'Jack',
    [CARD_JOKER]: 'Joker',
};

export const CARD_EMOJIS: Record<number, string> = {
    [CARD_KING]: '♛',
    [CARD_QUEEN]: '♕',
    [CARD_JACK]: '♞',
    [CARD_JOKER]: '★',
};

export const CARD_SUITS: Record<number, string> = {
    [CARD_KING]: '♠',
    [CARD_QUEEN]: '♥',
    [CARD_JACK]: '♣',
    [CARD_JOKER]: '★',
};

export const CARD_COLORS: Record<number, string> = {
    [CARD_KING]: '#ffd700',
    [CARD_QUEEN]: '#ff69b4',
    [CARD_JACK]: '#00d4cc',
    [CARD_JOKER]: '#bd93f9',
};

export const CARD_BG: Record<number, string> = {
    [CARD_KING]: 'linear-gradient(135deg, #2a2010, #1a1408)',
    [CARD_QUEEN]: 'linear-gradient(135deg, #2a1020, #1a0814)',
    [CARD_JACK]: 'linear-gradient(135deg, #082020, #041010)',
    [CARD_JOKER]: 'linear-gradient(135deg, #1a1028, #0e0818)',
};

// ============================================================
// Error Code Map (mirrors bluffers.move error consts)
// ============================================================
export const GAME_ERROR_MAP: Record<number, string> = {
    100: 'Game is not in lobby state',
    101: 'Game is not active',
    102: 'Lobby is full',
    103: 'You already joined this lobby',
    104: 'Only the creator can start the game',
    105: 'Not enough players to start',
    106: "It's not your turn",
    107: 'No pending play to respond to',
    108: 'Resolve the pending play first',
    109: 'Invalid card index',
    111: 'Play 1 to 3 cards at a time',
    112: "You're not the next player",
    114: 'You have been eliminated',
};
