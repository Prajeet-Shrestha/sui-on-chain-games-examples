import type { GameSession } from './types';

export function parseGameSession(fields: Record<string, any>): GameSession {
    // board comes as a vector<u8> — either raw array or encoded
    let board: number[] = [];
    const rawBoard = fields.board;
    if (Array.isArray(rawBoard)) {
        board = rawBoard.map(Number);
    } else if (typeof rawBoard === 'string') {
        // base64-encoded bytes
        const bytes = Uint8Array.from(atob(rawBoard), c => c.charCodeAt(0));
        board = Array.from(bytes);
    }

    // bag comes similarly
    let bag: number[] = [];
    const rawBag = fields.bag;
    if (Array.isArray(rawBag)) {
        bag = rawBag.map(Number);
    }

    return {
        id: fields.id?.id ?? '',
        state: Number(fields.state),
        player: String(fields.player),
        board,
        currentPiece: Number(fields.current_piece),
        nextPiece: Number(fields.next_piece),
        score: Number(fields.score),
        linesCleared: Number(fields.lines_cleared),
        level: Number(fields.level),
        combo: Number(fields.combo),
        piecesPlaced: Number(fields.pieces_placed),
        heldPiece: Number(fields.held_piece),
        hasHeldThisTurn: Boolean(fields.has_held_this_turn),
        gameOver: Boolean(fields.game_over),
    };
}
