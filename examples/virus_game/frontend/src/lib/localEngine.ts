/**
 * Local game engine — mirrors the Move contract's flood-fill logic.
 * Used for client-side simulation so the player can preview moves
 * before submitting them all as a single PTB.
 */

import { LEVELS } from '../constants';

export interface LocalGameState {
    board: number[];
    controlled: boolean[];
    controlledCount: number;
    movesUsed: number;
    maxMoves: number;
    numColors: number;
    boardWidth: number;
    boardHeight: number;
    virusStarts: number[];
    state: 'active' | 'won' | 'lost';
}

// ── Level Board Data (must match Move contract exactly) ──────────

const LEVEL_BOARDS: Record<number, { board: number[]; virusStarts: number[] }> = {
    1: {
        board: [
            0, 1, 1, 2, 3,
            1, 0, 3, 1, 2,
            2, 3, 0, 0, 1,
            3, 2, 1, 3, 0,
            0, 1, 2, 0, 3,
        ],
        virusStarts: [0],
    },
    2: {
        board: [
            0, 3, 1, 4, 4, 2,
            2, 4, 2, 3, 1, 0,
            1, 1, 2, 0, 3, 4,
            3, 2, 4, 3, 1, 2,
            0, 1, 0, 4, 0, 1,
            0, 2, 2, 1, 3, 0,
        ],
        virusStarts: [0],
    },
    3: {
        board: [
            0, 4, 0, 3, 2, 4, 2, 0,
            1, 3, 1, 1, 1, 2, 0, 2,
            0, 1, 0, 4, 4, 3, 2, 0,
            2, 4, 1, 4, 0, 4, 0, 5,
            3, 1, 2, 4, 1, 0, 1, 2,
            1, 0, 5, 1, 4, 1, 0, 1,
            2, 2, 2, 3, 0, 5, 4, 0,
            1, 5, 4, 2, 3, 1, 5, 3,
        ],
        virusStarts: [0],
    },
    4: {
        board: [
            0, 5, 0, 4, 0, 3, 1, 5, 2, 3,
            1, 3, 2, 5, 5, 4, 4, 0, 1, 4,
            0, 2, 2, 3, 0, 5, 5, 1, 2, 2,
            1, 3, 1, 4, 4, 4, 3, 4, 0, 5,
            0, 2, 2, 3, 1, 4, 1, 5, 2, 3,
            0, 1, 0, 2, 5, 5, 0, 2, 0, 0,
            0, 1, 2, 3, 1, 4, 2, 3, 5, 5,
            5, 5, 5, 3, 4, 1, 1, 1, 4, 2,
            0, 1, 5, 4, 2, 1, 3, 2, 5, 2,
            2, 3, 2, 0, 5, 2, 1, 5, 1, 0,
        ],
        virusStarts: [0, 99],
    },
    5: {
        board: [
            0, 5, 2, 2, 0, 0, 6, 0, 1, 5, 6, 0,
            2, 0, 6, 5, 4, 5, 0, 6, 6, 6, 2, 1,
            0, 3, 1, 3, 2, 6, 6, 5, 0, 4, 6, 6,
            0, 6, 1, 1, 3, 1, 5, 2, 4, 0, 4, 6,
            5, 2, 1, 0, 5, 4, 3, 0, 2, 5, 5, 1,
            2, 3, 1, 5, 5, 4, 5, 6, 2, 2, 3, 5,
            1, 1, 6, 0, 2, 3, 3, 6, 0, 4, 3, 1,
            5, 3, 3, 6, 1, 3, 6, 0, 1, 1, 2, 5,
            0, 2, 5, 2, 4, 6, 2, 3, 4, 4, 3, 2,
            6, 3, 6, 5, 1, 4, 2, 0, 3, 0, 2, 4,
            5, 4, 5, 3, 6, 3, 5, 3, 1, 0, 0, 6,
            6, 5, 0, 1, 0, 3, 0, 1, 2, 1, 5, 6,
        ],
        virusStarts: [0, 11, 138],
    },
};

/**
 * Create initial state for a level (mirrors Move start_level).
 */
export function createLocalGame(level: number): LocalGameState {
    const meta = LEVELS.find((l) => l.id === level)!;
    const data = LEVEL_BOARDS[level];

    const board = [...data.board];
    const total = meta.width * meta.height;
    const controlled = new Array(total).fill(false);
    let controlledCount = 0;

    for (const vs of data.virusStarts) {
        controlled[vs] = true;
        controlledCount++;
    }

    return {
        board,
        controlled,
        controlledCount,
        movesUsed: 0,
        maxMoves: meta.maxMoves,
        numColors: meta.colors,
        boardWidth: meta.width,
        boardHeight: meta.height,
        virusStarts: [...data.virusStarts],
        state: 'active',
    };
}

/**
 * Apply a color choice to the local game state (mirrors Move choose_color).
 * Returns a new state (immutable).
 */
export function applyColor(prev: LocalGameState, color: number): LocalGameState {
    if (prev.state !== 'active') return prev;

    const board = [...prev.board];
    const controlled = [...prev.controlled];
    const total = prev.boardWidth * prev.boardHeight;

    // Current virus color
    const currentColor = board[prev.virusStarts[0]];
    if (color === currentColor) return prev; // no-op

    // 1. Recolor all controlled cells
    for (let i = 0; i < total; i++) {
        if (controlled[i]) {
            board[i] = color;
        }
    }

    // 2. BFS flood-fill from all controlled cells
    const queue: number[] = [];
    for (let i = 0; i < total; i++) {
        if (controlled[i]) queue.push(i);
    }

    let controlledCount = prev.controlledCount;

    while (queue.length > 0) {
        const idx = queue.shift()!;
        const x = idx % prev.boardWidth;
        const y = Math.floor(idx / prev.boardWidth);

        // UP
        if (y > 0) {
            const n = idx - prev.boardWidth;
            if (!controlled[n] && board[n] === color) {
                controlled[n] = true;
                controlledCount++;
                queue.push(n);
            }
        }
        // DOWN
        if (y + 1 < prev.boardHeight) {
            const n = idx + prev.boardWidth;
            if (!controlled[n] && board[n] === color) {
                controlled[n] = true;
                controlledCount++;
                queue.push(n);
            }
        }
        // LEFT
        if (x > 0) {
            const n = idx - 1;
            if (!controlled[n] && board[n] === color) {
                controlled[n] = true;
                controlledCount++;
                queue.push(n);
            }
        }
        // RIGHT
        if (x + 1 < prev.boardWidth) {
            const n = idx + 1;
            if (!controlled[n] && board[n] === color) {
                controlled[n] = true;
                controlledCount++;
                queue.push(n);
            }
        }
    }

    const movesUsed = prev.movesUsed + 1;
    const movesRemaining = prev.maxMoves - movesUsed;

    let state: 'active' | 'won' | 'lost' = 'active';
    if (controlledCount === total) {
        state = 'won';
    } else if (movesRemaining === 0) {
        state = 'lost';
    }

    return {
        ...prev,
        board,
        controlled,
        controlledCount,
        movesUsed,
        state,
    };
}

/**
 * Get current virus color from the local state.
 */
export function getVirusColor(game: LocalGameState): number {
    return game.board[game.virusStarts[0]];
}
