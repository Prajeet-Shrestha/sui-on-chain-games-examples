// ═══════════════════════════════════════════════
// SuiTris — Real-Time Tetris Engine
// Runs entirely client-side. No blockchain per move.
// ═══════════════════════════════════════════════

export const BOARD_W = 10;
export const BOARD_H = 20;
export const EMPTY = 0;

// Piece types
export const PIECES = ['I', 'O', 'T', 'S', 'Z', 'L', 'J'] as const;

// Piece colors (1-7 map to piece types)
export const COLORS: Record<number, string> = {
    0: 'transparent',
    1: '#00f5ff', // I - cyan
    2: '#ffe600', // O - yellow
    3: '#b84dff', // T - purple
    4: '#00ff87', // S - green
    5: '#ff3d3d', // Z - red
    6: '#ff9500', // L - orange
    7: '#3d7aff', // J - blue
};

// ═══════════════════════════════════════════════
// Piece shapes — each has 4 rotations, each rotation is array of [row, col] offsets
// ═══════════════════════════════════════════════
const SHAPES: number[][][][] = [
    // I
    [
        [[0, 0], [0, 1], [0, 2], [0, 3]],
        [[0, 0], [1, 0], [2, 0], [3, 0]],
        [[0, 0], [0, 1], [0, 2], [0, 3]],
        [[0, 0], [1, 0], [2, 0], [3, 0]],
    ],
    // O
    [
        [[0, 0], [0, 1], [1, 0], [1, 1]],
        [[0, 0], [0, 1], [1, 0], [1, 1]],
        [[0, 0], [0, 1], [1, 0], [1, 1]],
        [[0, 0], [0, 1], [1, 0], [1, 1]],
    ],
    // T
    [
        [[0, 0], [0, 1], [0, 2], [1, 1]],
        [[0, 0], [1, 0], [1, 1], [2, 0]],
        [[0, 1], [1, 0], [1, 1], [1, 2]],
        [[0, 1], [1, 0], [1, 1], [2, 1]],
    ],
    // S
    [
        [[0, 1], [0, 2], [1, 0], [1, 1]],
        [[0, 0], [1, 0], [1, 1], [2, 1]],
        [[0, 1], [0, 2], [1, 0], [1, 1]],
        [[0, 0], [1, 0], [1, 1], [2, 1]],
    ],
    // Z
    [
        [[0, 0], [0, 1], [1, 1], [1, 2]],
        [[0, 1], [1, 0], [1, 1], [2, 0]],
        [[0, 0], [0, 1], [1, 1], [1, 2]],
        [[0, 1], [1, 0], [1, 1], [2, 0]],
    ],
    // L
    [
        [[0, 0], [1, 0], [2, 0], [2, 1]],
        [[0, 0], [0, 1], [0, 2], [1, 0]],
        [[0, 0], [0, 1], [1, 1], [2, 1]],
        [[0, 2], [1, 0], [1, 1], [1, 2]],
    ],
    // J
    [
        [[0, 1], [1, 1], [2, 0], [2, 1]],
        [[0, 0], [1, 0], [1, 1], [1, 2]],
        [[0, 0], [0, 1], [1, 0], [2, 0]],
        [[0, 0], [0, 1], [0, 2], [1, 2]],
    ],
];

// ═══════════════════════════════════════════════
// Game State
// ═══════════════════════════════════════════════
export interface TetrisState {
    board: number[][];         // 20 rows × 10 cols
    currentPiece: number;      // piece type index 0-6
    currentRotation: number;   // 0-3
    currentRow: number;        // top-left row of piece
    currentCol: number;        // top-left col of piece
    nextPiece: number;
    heldPiece: number | null;
    hasHeldThisTurn: boolean;
    score: number;
    linesCleared: number;
    level: number;
    combo: number;
    piecesPlaced: number;
    gameOver: boolean;
    bag: number[];
    dropSpeed: number;         // ms between gravity drops
    isPaused: boolean;
}

/** Returned from lock/tick/hardDrop so caller can trigger SFX */
export interface LockResult {
    locked: boolean;
    linesCleared: number;
    leveledUp: boolean;
    gameOver: boolean;
    combo: number;
}

// ═══════════════════════════════════════════════
// Core Engine
// ═══════════════════════════════════════════════

export function createInitialState(): TetrisState {
    const bag = createBag();
    const currentPiece = bag.pop()!;
    const nextPiece = bag.pop()!;

    return {
        board: createEmptyBoard(),
        currentPiece,
        currentRotation: 0,
        currentRow: 0,
        currentCol: Math.floor((BOARD_W - getWidth(currentPiece, 0)) / 2),
        nextPiece,
        heldPiece: null,
        hasHeldThisTurn: false,
        score: 0,
        linesCleared: 0,
        level: 0,
        combo: 0,
        piecesPlaced: 0,
        gameOver: false,
        bag,
        dropSpeed: 800,
        isPaused: false,
    };
}

function createEmptyBoard(): number[][] {
    return Array.from({ length: BOARD_H }, () => new Array(BOARD_W).fill(EMPTY));
}

function createBag(): number[] {
    const bag = [0, 1, 2, 3, 4, 5, 6];
    // Fisher-Yates shuffle
    for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
}

function drawFromBag(state: TetrisState): number {
    if (state.bag.length === 0) {
        state.bag = createBag();
    }
    return state.bag.pop()!;
}

export function getShape(piece: number, rotation: number): number[][] {
    return SHAPES[piece][rotation % 4];
}

function getWidth(piece: number, rotation: number): number {
    const shape = getShape(piece, rotation);
    return Math.max(...shape.map(c => c[1])) + 1;
}

// ═══════════════════════════════════════════════
// Collision Detection
// ═══════════════════════════════════════════════

function isValid(board: number[][], piece: number, rotation: number, row: number, col: number): boolean {
    const shape = getShape(piece, rotation);
    for (const [dr, dc] of shape) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= BOARD_H || c < 0 || c >= BOARD_W) return false;
        if (board[r][c] !== EMPTY) return false;
    }
    return true;
}

// ═══════════════════════════════════════════════
// Movement
// ═══════════════════════════════════════════════

export function moveLeft(state: TetrisState): boolean {
    if (state.gameOver || state.isPaused) return false;
    if (isValid(state.board, state.currentPiece, state.currentRotation, state.currentRow, state.currentCol - 1)) {
        state.currentCol--;
        return true;
    }
    return false;
}

export function moveRight(state: TetrisState): boolean {
    if (state.gameOver || state.isPaused) return false;
    if (isValid(state.board, state.currentPiece, state.currentRotation, state.currentRow, state.currentCol + 1)) {
        state.currentCol++;
        return true;
    }
    return false;
}

export function softDrop(state: TetrisState): boolean {
    if (state.gameOver || state.isPaused) return false;
    if (isValid(state.board, state.currentPiece, state.currentRotation, state.currentRow + 1, state.currentCol)) {
        state.currentRow++;
        state.score += 1; // soft drop bonus
        return true;
    }
    return false;
}

export function hardDrop(state: TetrisState): LockResult | null {
    if (state.gameOver || state.isPaused) return null;
    let rows = 0;
    while (isValid(state.board, state.currentPiece, state.currentRotation, state.currentRow + 1, state.currentCol)) {
        state.currentRow++;
        rows++;
    }
    state.score += rows * 2; // hard drop bonus
    return lockPiece(state);
}

export function rotate(state: TetrisState): boolean {
    if (state.gameOver || state.isPaused) return false;
    const newRot = (state.currentRotation + 1) % 4;
    // Try basic rotation
    if (isValid(state.board, state.currentPiece, newRot, state.currentRow, state.currentCol)) {
        state.currentRotation = newRot;
        return true;
    }
    // Wall kick: try offsets
    const kicks = [-1, 1, -2, 2];
    for (const offset of kicks) {
        if (isValid(state.board, state.currentPiece, newRot, state.currentRow, state.currentCol + offset)) {
            state.currentRotation = newRot;
            state.currentCol += offset;
            return true;
        }
    }
    return false;
}

// ═══════════════════════════════════════════════
// Gravity (called on timer)
// ═══════════════════════════════════════════════

export function tick(state: TetrisState): LockResult | null {
    if (state.gameOver || state.isPaused) return null;
    if (!softDropInternal(state)) {
        return lockPiece(state);
    }
    return null;
}

function softDropInternal(state: TetrisState): boolean {
    if (isValid(state.board, state.currentPiece, state.currentRotation, state.currentRow + 1, state.currentCol)) {
        state.currentRow++;
        return true;
    }
    return false;
}

// ═══════════════════════════════════════════════
// Lock + Clear
// ═══════════════════════════════════════════════

function lockPiece(state: TetrisState): LockResult {
    const shape = getShape(state.currentPiece, state.currentRotation);
    const color = state.currentPiece + 1;
    const prevLevel = state.level;

    // Write to board
    for (const [dr, dc] of shape) {
        const r = state.currentRow + dr;
        const c = state.currentCol + dc;
        if (r >= 0 && r < BOARD_H && c >= 0 && c < BOARD_W) {
            state.board[r][c] = color;
        }
    }

    state.piecesPlaced++;
    state.hasHeldThisTurn = false;

    // Clear lines
    const cleared = clearLines(state.board);
    if (cleared > 0) {
        const baseScore = [0, 100, 300, 500, 800][cleared] ?? 800;
        state.combo++;
        const multiplier = 1 + state.level * 0.1;
        state.score += Math.floor(baseScore * multiplier * state.combo);
        state.linesCleared += cleared;
        state.level = Math.floor(state.linesCleared / 10);
        state.dropSpeed = Math.max(100, 800 - state.level * 60);
    } else {
        state.combo = 0;
    }

    // Spawn next piece
    spawnNext(state);

    return {
        locked: true,
        linesCleared: cleared,
        leveledUp: state.level > prevLevel,
        gameOver: state.gameOver,
        combo: state.combo,
    };
}

function clearLines(board: number[][]): number {
    let cleared = 0;
    for (let row = BOARD_H - 1; row >= 0; row--) {
        if (board[row].every(cell => cell !== EMPTY)) {
            board.splice(row, 1);
            board.unshift(new Array(BOARD_W).fill(EMPTY));
            cleared++;
            row++; // re-check this row
        }
    }
    return cleared;
}

function spawnNext(state: TetrisState): void {
    state.currentPiece = state.nextPiece;
    state.currentRotation = 0;
    state.currentRow = 0;
    state.currentCol = Math.floor((BOARD_W - getWidth(state.currentPiece, 0)) / 2);
    state.nextPiece = drawFromBag(state);

    // Game over check
    if (!isValid(state.board, state.currentPiece, state.currentRotation, state.currentRow, state.currentCol)) {
        state.gameOver = true;
    }
}

// ═══════════════════════════════════════════════
// Hold
// ═══════════════════════════════════════════════

export function holdPiece(state: TetrisState): boolean {
    if (state.gameOver || state.isPaused || state.hasHeldThisTurn) return false;
    state.hasHeldThisTurn = true;

    if (state.heldPiece === null) {
        state.heldPiece = state.currentPiece;
        spawnNext(state);
    } else {
        const temp = state.currentPiece;
        state.currentPiece = state.heldPiece;
        state.heldPiece = temp;
        state.currentRotation = 0;
        state.currentRow = 0;
        state.currentCol = Math.floor((BOARD_W - getWidth(state.currentPiece, 0)) / 2);
    }
    return true;
}

// ═══════════════════════════════════════════════
// Ghost (preview landing position)
// ═══════════════════════════════════════════════

export function getGhostRow(state: TetrisState): number {
    let row = state.currentRow;
    while (isValid(state.board, state.currentPiece, state.currentRotation, row + 1, state.currentCol)) {
        row++;
    }
    return row;
}

// ═══════════════════════════════════════════════
// Toggle Pause
// ═══════════════════════════════════════════════

export function togglePause(state: TetrisState): void {
    if (!state.gameOver) {
        state.isPaused = !state.isPaused;
    }
}
