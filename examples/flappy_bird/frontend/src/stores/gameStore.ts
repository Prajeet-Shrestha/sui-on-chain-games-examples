import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameStore {
    sessionId: string | null;
    worldId: string | null;
    isLoading: boolean;
    error: string | null;

    setGameObjects: (sessionId: string, worldId: string) => void;
    clearGame: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useGameStore = create<GameStore>()(
    persist(
        (set) => ({
            sessionId: null,
            worldId: null,
            isLoading: false,
            error: null,

            setGameObjects: (sessionId, worldId) =>
                set({ sessionId, worldId, error: null }),

            clearGame: () =>
                set({ sessionId: null, worldId: null, error: null }),

            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),
        }),
        {
            name: 'suiflap-game',
            partialize: (state) => ({
                sessionId: state.sessionId,
                worldId: state.worldId,
            }),
        }
    )
);
