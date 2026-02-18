import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameStore {
    // Object IDs from start_game
    sessionId: string | null;
    worldId: string | null;

    // On-chain sync tracking
    piecesSynced: number;      // pieces confirmed on-chain across all batches
    bufferedPieces: number;    // pieces waiting in the current buffer
    syncPending: boolean;      // true while a PTB is being signed/processed
    needsSign: boolean;        // true when buffer is full → game pauses for signing

    // Loading / error
    isLoading: boolean;
    error: string | null;

    // Actions
    setGameObjects: (sessionId: string, worldId: string) => void;
    clearGame: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setPiecesSynced: (count: number) => void;
    setBufferedPieces: (count: number) => void;
    setSyncPending: (pending: boolean) => void;
    setNeedsSign: (needs: boolean) => void;
}

export const useGameStore = create<GameStore>()(
    persist(
        (set) => ({
            sessionId: null,
            worldId: null,
            piecesSynced: 0,
            bufferedPieces: 0,
            syncPending: false,
            needsSign: false,
            isLoading: false,
            error: null,

            setGameObjects: (sessionId, worldId) =>
                set({ sessionId, worldId, piecesSynced: 0, bufferedPieces: 0, syncPending: false, needsSign: false, error: null }),

            clearGame: () =>
                set({
                    sessionId: null, worldId: null,
                    piecesSynced: 0, bufferedPieces: 0,
                    syncPending: false, needsSign: false, error: null,
                }),

            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),
            setPiecesSynced: (piecesSynced) => set({ piecesSynced, syncPending: false }),
            setBufferedPieces: (bufferedPieces) => set({ bufferedPieces }),
            setSyncPending: (syncPending) => set({ syncPending }),
            setNeedsSign: (needsSign) => set({ needsSign }),
        }),
        {
            name: 'suitris-game',
            partialize: (state) => ({
                sessionId: state.sessionId,
                worldId: state.worldId,
            }),
        }
    )
);
