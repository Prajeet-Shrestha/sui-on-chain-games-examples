// ═══════════════════════════════════════════════
// DEPLOYED CONTRACT IDS
// ═══════════════════════════════════════════════

export const PACKAGE_ID = '0xd5ca20f134e162206f74b8ffc3f94ecfca461ab49e6d65d3df25f10b6ca8d69b';
export const SANTA_MAILBOX_ID = '0x384160de7ef268499f0c52da84b327e70ca8eba71f4e38d3132597ab53c784e7';
export const WORLD_ID = '0x7da30dbb73a3580174d9caa26b22e6e24af775b539a2f79d360dca598edb9fe1';
export const CLOCK_ID = '0x6';

// ═══════════════════════════════════════════════
// GAME CONSTANTS (from Move contract)
// ═══════════════════════════════════════════════

export const MAX_MESSAGE_LENGTH = 280;

// ═══════════════════════════════════════════════
// ERROR CODES (from Move contract abort codes)
// ═══════════════════════════════════════════════

export const GAME_ERROR_MAP: Record<number, string> = {
    100: 'The mailbox is closed for the season 🎄',
    101: 'Your message is too long! Keep it under 280 characters.',
    102: 'You forgot to write a message! Santa needs something to read.',
    103: 'Only Santa\'s helpers (admins) can do that!',
    104: 'That letter wasn\'t found in the mailbox.',
    105: 'Invalid limit — must be at least 1.',
};
