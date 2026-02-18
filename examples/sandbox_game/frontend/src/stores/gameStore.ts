import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ActionMode = 'move' | 'mine' | 'place';

interface GameStore {
    // Object IDs
    sessionId: string | null;
    worldId: string | null;

    // UI state
    actionMode: ActionMode;
    selectedBlockType: number; // for placing (6=dirt, 7=wood, 8=stone)

    // Loading / error
    isLoading: boolean;
    error: string | null;

    // Actions
    setGameObjects: (sessionId: string, worldId: string) => void;
    clearGame: () => void;
    setActionMode: (mode: ActionMode) => void;
    setSelectedBlockType: (bt: number) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useGameStore = create<GameStore>()(
    persist(
        (set) => ({
            sessionId: null,
            worldId: null,
            actionMode: 'move',
            selectedBlockType: 6,
            isLoading: false,
            error: null,

            setGameObjects: (sessionId, worldId) =>
                set({ sessionId, worldId, error: null }),

            clearGame: () =>
                set({ sessionId: null, worldId: null, actionMode: 'move', error: null }),

            setActionMode: (actionMode) => set({ actionMode }),
            setSelectedBlockType: (selectedBlockType) => set({ selectedBlockType }),
            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),
        }),
        {
            name: 'suicraft-game',
            partialize: (state) => ({
                sessionId: state.sessionId,
                worldId: state.worldId,
            }),
        }
    )
);
