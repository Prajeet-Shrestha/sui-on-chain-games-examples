// Deployed contract IDs (testnet) — v4 per-player sessions
export const PACKAGE_ID = '0xc77ba0bedb78364d08fe6f310bc500236df7ec8bc9a0d83f260ef835f5405c6e';
// GAME_SESSION_ID and GRID_ID are now dynamic — created per start_level call
export const WORLD_ID = '0xd58bee2ebe4ccd5216f8adb8e7ac437e25c017a3fa42e71ceb9b83a75f0f0ea2';
export const CLOCK_ID = '0x6';
export const ENTITY_PACKAGE_ID = '0x5027c19c807223b4b91e8f70b694c5b37118d5ea727d982820b837b54697d7f4';

// Direction constants (match Move contract)
export const DIR_UP = 0;
export const DIR_RIGHT = 1;
export const DIR_DOWN = 2;
export const DIR_LEFT = 3;

// Marker types
export const MARKER_PLAYER = 0;
export const MARKER_WALL = 1;
export const MARKER_BOX = 2;

// Game states
export const STATE_LOBBY = 0;
export const STATE_ACTIVE = 1;
export const STATE_FINISHED = 2;

// Grid size
export const GRID_W = 6;
export const GRID_H = 6;

// Level metadata
export const LEVELS = [
    { id: 1, name: 'First Steps', boxes: 2, difficulty: 'Easy', maxMoves: 12 },
    { id: 2, name: 'Open Field', boxes: 2, difficulty: 'Easy', maxMoves: 16 },
    { id: 3, name: 'Storage Room', boxes: 3, difficulty: 'Medium', maxMoves: 14 },
    { id: 4, name: 'Crossroads', boxes: 2, difficulty: 'Medium', maxMoves: 14 },
    { id: 5, name: 'The Gauntlet', boxes: 3, difficulty: 'Hard', maxMoves: 20 },
];

// Level data for client-side simulation (mirrors Move contract)
export interface LevelData {
    wallXs: number[]; wallYs: number[];
    boxXs: number[]; boxYs: number[];
    goalXs: number[]; goalYs: number[];
    playerX: number; playerY: number;
    maxMoves: number;
}

export function getLevelData(levelId: number): LevelData {
    switch (levelId) {
        case 1: return {
            wallXs: [1, 2, 3, 4], wallYs: [1, 1, 1, 1],
            boxXs: [2, 3], boxYs: [3, 3],
            goalXs: [4, 4], goalYs: [2, 3],
            playerX: 3, playerY: 4, maxMoves: 12,
        };
        case 2: return {
            wallXs: [2], wallYs: [3],
            boxXs: [3, 3], boxYs: [2, 4],
            goalXs: [1, 1], goalYs: [2, 4],
            playerX: 3, playerY: 5, maxMoves: 16,
        };
        case 3: return {
            wallXs: [2, 3, 4], wallYs: [1, 1, 1],
            boxXs: [2, 2, 2], boxYs: [3, 4, 5],
            goalXs: [1, 1, 1], goalYs: [3, 4, 5],
            playerX: 3, playerY: 5, maxMoves: 14,
        };
        case 4: return {
            wallXs: [3, 3], wallYs: [1, 5],
            boxXs: [3, 2], boxYs: [2, 4],
            goalXs: [1, 4], goalYs: [2, 4],
            playerX: 2, playerY: 5, maxMoves: 14,
        };
        case 5: return {
            wallXs: [1, 3, 1, 3], wallYs: [1, 1, 5, 5],
            boxXs: [2, 2, 2], boxYs: [2, 3, 4],
            goalXs: [4, 0, 4], goalYs: [2, 3, 4],
            playerX: 2, playerY: 5, maxMoves: 20,
        };
        default: throw new Error(`Invalid level: ${levelId}`);
    }
}

// Error code mapping
export const ERROR_MAP: Record<number, string> = {
    100: 'Invalid game state',
    101: 'Not the player',
    102: 'Invalid direction',
    103: 'Too many moves',
    104: 'Blocked by wall',
    105: 'Out of bounds',
    106: 'Blocked by another box',
    107: 'Puzzle not solved',
    108: 'Invalid level',
    109: 'Already started',
    110: 'Level not active',
};
