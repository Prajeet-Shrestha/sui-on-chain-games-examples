// ═══════════════════════════════════════════════
// DEPLOYED CONTRACT IDS — update after publish
// ═══════════════════════════════════════════════

export const PACKAGE_ID = '0xc8af84a373422184404ab778f5f82744634df14a3b46dbc52fa64aa19cbd23cd';
export const WORLD_ID = '0x8b748f0cb98b24e344de9fc50a444a5fd6109e33792be2febc3e15b2de32b368';

// ═══════════════════════════════════════════════
// GAME STATES (match Move contract)
// ═══════════════════════════════════════════════

export const STATE_ACTIVE = 1;
export const STATE_WON = 2;
export const STATE_LOST = 3;

// ═══════════════════════════════════════════════
// ERROR CODES (match Move contract)
// ═══════════════════════════════════════════════

export const GAME_ERROR_MAP: Record<number, string> = {
    100: 'Invalid game state',
    101: 'Not your game',
    102: 'Invalid color choice',
    103: 'No moves remaining',
    104: 'Game is not active',
    105: 'Invalid level',
    106: 'Cannot pick the same color',
    107: 'Game already started',
    108: 'Game is over',
};

// ═══════════════════════════════════════════════
// COLOR PALETTE
// ═══════════════════════════════════════════════

export const COLOR_PALETTE = [
    '#ef4444', // 0 — Red
    '#3b82f6', // 1 — Blue
    '#22c55e', // 2 — Green
    '#eab308', // 3 — Yellow
    '#a855f7', // 4 — Purple
    '#f97316', // 5 — Orange
    '#06b6d4', // 6 — Cyan
];

export const COLOR_NAMES = [
    'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Cyan',
];

// ═══════════════════════════════════════════════
// LEVEL METADATA (display-only)
// ═══════════════════════════════════════════════

export interface LevelMeta {
    id: number;
    name: string;
    subtitle: string;
    width: number;
    height: number;
    colors: number;
    viruses: number;
    maxMoves: number;
}

export const LEVELS: LevelMeta[] = [
    { id: 1, name: 'Patient Zero', subtitle: 'Tutorial', width: 5, height: 5, colors: 4, viruses: 1, maxMoves: 12 },
    { id: 2, name: 'Outbreak', subtitle: 'Easy', width: 6, height: 6, colors: 5, viruses: 1, maxMoves: 18 },
    { id: 3, name: 'Pandemic', subtitle: 'Medium', width: 8, height: 8, colors: 6, viruses: 1, maxMoves: 25 },
    { id: 4, name: 'Contagion', subtitle: 'Hard · 2 Viruses', width: 10, height: 10, colors: 6, viruses: 2, maxMoves: 27 },
    { id: 5, name: 'Total Extinction', subtitle: 'Nightmare · 3 Viruses', width: 12, height: 12, colors: 7, viruses: 3, maxMoves: 30 },
];
