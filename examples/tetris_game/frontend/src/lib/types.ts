export interface GameSession {
    id: string;
    state: number;
    player: string;
    board: number[];         // 200 cells (10×20)
    currentPiece: number;    // 0-6
    nextPiece: number;       // 0-6
    score: number;
    linesCleared: number;
    level: number;
    combo: number;
    piecesPlaced: number;
    heldPiece: number;       // 0-6 or 255 (none)
    hasHeldThisTurn: boolean;
    gameOver: boolean;
}
