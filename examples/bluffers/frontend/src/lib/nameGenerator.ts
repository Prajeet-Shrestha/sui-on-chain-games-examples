// ─── Random Name Generator ───────────────────────
// Generates fun, poker/deception-themed names from wallet addresses.
// Names are deterministic — same address always gets the same name.

const ADJECTIVES = [
    'Sly', 'Bold', 'Shady', 'Slick', 'Wild', 'Lucky', 'Crafty', 'Sneaky',
    'Swift', 'Keen', 'Quiet', 'Daring', 'Cunning', 'Wicked', 'Fearless',
    'Smooth', 'Tricky', 'Brash', 'Chill', 'Savage', 'Royal', 'Shadow',
    'Frosty', 'Blaze', 'Mystic', 'Razor', 'Stealth', 'Neon', 'Venom',
    'Ghost', 'Iron', 'Storm', 'Crimson', 'Rogue', 'Phantom', 'Ace',
    'Silver', 'Golden', 'Scarlet', 'Midnight', 'Thunder', 'Velvet', 'Jade',
    'Onyx', 'Ivory', 'Amber', 'Cobalt', 'Ruby', 'Titan',
];

const NOUNS = [
    'Fox', 'Dealer', 'Joker', 'Ace', 'Bluffer', 'Shark', 'Viper', 'Wolf',
    'Hawk', 'Raven', 'Cobra', 'Lynx', 'Panther', 'Tiger', 'Falcon',
    'Dagger', 'Knight', 'Baron', 'Duke', 'Queen', 'King', 'Jester',
    'Bandit', 'Outlaw', 'Rebel', 'Phantom', 'Ghost', 'Shadow', 'Rogue',
    'Spark', 'Blitz', 'Fury', 'Storm', 'Flash', 'Strike', 'Blade',
    'Fang', 'Claw', 'Spade', 'Diamond', 'Heart', 'Arrow', 'Bolt',
    'Wraith', 'Cipher', 'Maven', 'Hustler', 'Maverick', 'Gambit',
];

/**
 * Simple hash function for strings → number.
 * Produces a deterministic numeric hash from a string.
 */
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + ch;
        hash |= 0; // Convert to 32-bit int
    }
    return Math.abs(hash);
}

/**
 * Generate a deterministic random name from a wallet address.
 * E.g. "SlyFox", "BoldJoker", "CraftyShark"
 */
export function generatePlayerName(address: string): string {
    const hash = simpleHash(address);
    const adj = ADJECTIVES[hash % ADJECTIVES.length];
    // Use a different part of the hash for the noun
    const hash2 = simpleHash(address + '_noun');
    const noun = NOUNS[hash2 % NOUNS.length];
    return `${adj}${noun}`;
}
