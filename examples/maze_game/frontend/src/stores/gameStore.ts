import { create } from 'zustand';

interface GameStore {
    sessionId: string | null;
    isLoading: boolean;
    error: string | null;
    currentLevel: number;
    playerX: number;
    playerY: number;
    direction: number;
    movesCount: number;
    atExit: boolean;
    gameFinished: boolean;
    /** Every direction the player moved — submitted as PTB on level complete */
    moveHistory: number[];

    setSessionId: (id: string | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setLevel: (level: number) => void;
    setPosition: (x: number, y: number, direction: number) => void;
    incrementMoves: () => void;
    addMove: (direction: number) => void;
    setAtExit: (atExit: boolean) => void;
    setGameFinished: (finished: boolean) => void;
    resetForLevel: (level: number, startX: number, startY: number) => void;
    clearGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
    sessionId: null,
    isLoading: false,
    error: null,
    currentLevel: 1,
    playerX: 1,
    playerY: 1,
    direction: 1,
    movesCount: 0,
    atExit: false,
    gameFinished: false,
    moveHistory: [],

    setSessionId: (id) => set({ sessionId: id }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    setLevel: (level) => set({ currentLevel: level }),
    setPosition: (x, y, direction) => set({ playerX: x, playerY: y, direction }),
    incrementMoves: () => set((s) => ({ movesCount: s.movesCount + 1 })),
    addMove: (direction) => set((s) => ({ moveHistory: [...s.moveHistory, direction] })),
    setAtExit: (atExit) => set({ atExit }),
    setGameFinished: (finished) => set({ gameFinished: finished }),
    resetForLevel: (level, startX, startY) => set({
        currentLevel: level,
        playerX: startX,
        playerY: startY,
        direction: 1,
        movesCount: 0,
        atExit: false,
        gameFinished: false,
        moveHistory: [],
    }),
    clearGame: () => set({
        sessionId: null,
        isLoading: false,
        error: null,
        currentLevel: 1,
        movesCount: 0,
        playerX: 1,
        playerY: 1,
        direction: 1,
        atExit: false,
        gameFinished: false,
        moveHistory: [],
    }),
}));
