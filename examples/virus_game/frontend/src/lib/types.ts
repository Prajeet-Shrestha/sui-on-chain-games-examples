export interface GameSession {
    id: string;
    state: 'active' | 'won' | 'lost';
    player: string;
    level: number;
    board: number[];
    controlled: boolean[];
    controlledCount: number;
    movesRemaining: number;
    movesUsed: number;
    numColors: number;
    boardWidth: number;
    boardHeight: number;
    virusStarts: number[];
}
