import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameStore {
    sessionId: string | null;
    worldId: string | null;
    isLoading: boolean;
    error: string | null;
    bufferedDeliveries: number;
    deliveriesSynced: number;
    needsSign: boolean;
    syncPending: boolean;
    levelScores: Record<number, number>;  // best score per level

    setGameObjects: (sessionId: string, worldId: string) => void;
    clearGame: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setBufferedDeliveries: (count: number) => void;
    setDeliveriesSynced: (count: number) => void;
    setNeedsSign: (needs: boolean) => void;
    setSyncPending: (pending: boolean) => void;
    setLevelScore: (level: number, score: number) => void;
}

export const useGameStore = create<GameStore>()(
    persist(
        (set, get) => ({
            sessionId: null,
            worldId: null,
            isLoading: false,
            error: null,
            bufferedDeliveries: 0,
            deliveriesSynced: 0,
            needsSign: false,
            syncPending: false,
            levelScores: {},

            setGameObjects: (sessionId, worldId) =>
                set({ sessionId, worldId, error: null }),

            clearGame: () =>
                set({
                    sessionId: null,
                    worldId: null,
                    error: null,
                    bufferedDeliveries: 0,
                    deliveriesSynced: 0,
                    needsSign: false,
                    syncPending: false,
                }),

            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),
            setBufferedDeliveries: (bufferedDeliveries) => set({ bufferedDeliveries }),
            setDeliveriesSynced: (deliveriesSynced) => set({ deliveriesSynced }),
            setNeedsSign: (needsSign) => set({ needsSign }),
            setSyncPending: (syncPending) => set({ syncPending }),
            setLevelScore: (level: number, score: number) => {
                const existing = get().levelScores[level] ?? 0;
                if (score > existing) {
                    set({ levelScores: { ...get().levelScores, [level]: score } });
                }
            },
        }),
        {
            name: 'suideliver-game',
            partialize: (state) => ({
                sessionId: state.sessionId,
                worldId: state.worldId,
                levelScores: state.levelScores,
            }),
        }
    )
);
