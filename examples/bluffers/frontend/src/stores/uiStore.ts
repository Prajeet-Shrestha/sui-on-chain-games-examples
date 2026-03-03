import { create } from 'zustand';
import { generatePlayerName } from '../lib/nameGenerator';

interface UIStore {
    // Currently viewed game ID
    gameId: string | null;
    setGameId: (id: string | null) => void;

    // UI state
    isPending: boolean;
    setIsPending: (v: boolean) => void;

    error: string | null;
    setError: (msg: string | null) => void;

    // Lobby creation max players selection
    maxPlayers: number;
    setMaxPlayers: (n: number) => void;

    // Player names — maps wallet address → random name (not changeable)
    playerNames: Record<string, string>;
    assignName: (address: string) => string;
    getPlayerName: (address: string) => string;
    clearNames: () => void;
}

const GAME_ID_KEY = 'bluffers_active_game';

export const useUIStore = create<UIStore>((set, get) => ({
    gameId: localStorage.getItem(GAME_ID_KEY),
    setGameId: (id) => {
        if (id) {
            localStorage.setItem(GAME_ID_KEY, id);
        } else {
            localStorage.removeItem(GAME_ID_KEY);
        }
        set({ gameId: id });
    },

    isPending: false,
    setIsPending: (v) => set({ isPending: v }),

    error: null,
    setError: (msg) => set({ error: msg }),

    maxPlayers: 4,
    setMaxPlayers: (n) => set({ maxPlayers: n }),

    playerNames: {},
    assignName: (address: string) => {
        const existing = get().playerNames[address];
        if (existing) return existing;
        const name = generatePlayerName(address);
        set((state) => ({ playerNames: { ...state.playerNames, [address]: name } }));
        return name;
    },
    getPlayerName: (address: string) => {
        const existing = get().playerNames[address];
        if (existing) return existing;
        // Auto-assign if not yet assigned
        const name = generatePlayerName(address);
        set((state) => ({ playerNames: { ...state.playerNames, [address]: name } }));
        return name;
    },
    clearNames: () => set({ playerNames: {} }),
}));
