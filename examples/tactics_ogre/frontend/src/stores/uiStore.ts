import { create } from 'zustand';

interface UIStore {
    // Current screen
    screen: 'home' | 'roster' | 'tavern' | 'lobby' | 'placement' | 'combat' | 'results';
    setScreen: (s: UIStore['screen']) => void;

    // Active session context
    sessionId: string | null;
    gridId: string | null;
    setSessionContext: (sessionId: string, gridId: string) => void;
    clearSessionContext: () => void;

    // Combat UI state
    selectedUnit: string | null;
    targetUnit: string | null;
    activeAction: 'move' | 'attack' | 'special' | null;
    hoveredCell: { x: number; y: number } | null;

    selectUnit: (id: string | null) => void;
    setTarget: (id: string | null) => void;
    setActiveAction: (a: UIStore['activeAction']) => void;
    setHoveredCell: (cell: UIStore['hoveredCell']) => void;
    clearCombatState: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
    screen: 'home',
    setScreen: (screen) => set({ screen }),

    sessionId: null,
    gridId: null,
    setSessionContext: (sessionId, gridId) => set({ sessionId, gridId }),
    clearSessionContext: () => set({ sessionId: null, gridId: null }),

    selectedUnit: null,
    targetUnit: null,
    activeAction: null,
    hoveredCell: null,

    selectUnit: (id) => set({ selectedUnit: id, targetUnit: null, activeAction: null }),
    setTarget: (id) => set({ targetUnit: id }),
    setActiveAction: (a) => set({ activeAction: a }),
    setHoveredCell: (cell) => set({ hoveredCell: cell }),
    clearCombatState: () => set({
        selectedUnit: null,
        targetUnit: null,
        activeAction: null,
        hoveredCell: null,
    }),
}));
