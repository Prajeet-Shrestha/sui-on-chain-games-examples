import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameStore {
    // Object IDs discovered from create_and_start effects
    sessionId: string | null;
    worldId: string | null;
    entityId: string | null;

    // Combat: selected card indices to play
    selectedCards: number[];

    // Loading / error
    isLoading: boolean;
    error: string | null;

    // Actions
    setGameObjects: (sessionId: string, worldId: string, entityId: string) => void;
    clearGame: () => void;
    toggleCard: (index: number) => void;
    clearSelectedCards: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useGameStore = create<GameStore>()(
    persist(
        (set) => ({
            sessionId: null,
            worldId: null,
            entityId: null,
            selectedCards: [],
            isLoading: false,
            error: null,

            setGameObjects: (sessionId, worldId, entityId) =>
                set({ sessionId, worldId, entityId, error: null }),

            clearGame: () =>
                set({ sessionId: null, worldId: null, entityId: null, selectedCards: [], error: null }),

            toggleCard: (index) =>
                set((state) => ({
                    selectedCards: state.selectedCards.includes(index)
                        ? state.selectedCards.filter((i) => i !== index)
                        : [...state.selectedCards, index],
                })),

            clearSelectedCards: () => set({ selectedCards: [] }),

            setLoading: (isLoading) => set({ isLoading }),

            setError: (error) => set({ error }),
        }),
        {
            name: 'card-crawler-game',
            // Only persist the object IDs — transient UI state (loading, error, selectedCards) resets on refresh
            partialize: (state) => ({
                sessionId: state.sessionId,
                worldId: state.worldId,
                entityId: state.entityId,
            }),
        }
    )
);
