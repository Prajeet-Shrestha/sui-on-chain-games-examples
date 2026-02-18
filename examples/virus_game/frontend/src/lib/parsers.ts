import type { GameSession } from './types';
import { STATE_ACTIVE, STATE_WON, STATE_LOST } from '../constants';

function parseState(value: number): 'active' | 'won' | 'lost' {
    if (value === STATE_ACTIVE) return 'active';
    if (value === STATE_WON) return 'won';
    if (value === STATE_LOST) return 'lost';
    return 'active';
}

export function parseGameSession(
    objectId: string,
    fields: Record<string, any>,
): GameSession {
    return {
        id: objectId,
        state: parseState(Number(fields.state)),
        player: fields.player,
        level: Number(fields.level),
        board: (fields.board as any[]).map(Number),
        controlled: (fields.controlled as any[]).map(Boolean),
        controlledCount: Number(fields.controlled_count),
        movesRemaining: Number(fields.moves_remaining),
        movesUsed: Number(fields.moves_used),
        numColors: Number(fields.num_colors),
        boardWidth: Number(fields.board_width),
        boardHeight: Number(fields.board_height),
        virusStarts: (fields.virus_starts as any[]).map(Number),
    };
}
