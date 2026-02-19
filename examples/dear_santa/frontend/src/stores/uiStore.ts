import { create } from 'zustand';

export type AppView = 'home' | 'write' | 'read' | 'sent';

interface UIStore {
    currentView: AppView;
    setView: (view: AppView) => void;

    isPending: boolean;
    setIsPending: (pending: boolean) => void;

    error: string | null;
    setError: (error: string | null) => void;

    successMessage: string | null;
    setSuccessMessage: (msg: string | null) => void;

    lastSentLetterNumber: number | null;
    setLastSentLetterNumber: (n: number | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
    currentView: 'home',
    setView: (view) => set({ currentView: view, error: null, successMessage: null }),

    isPending: false,
    setIsPending: (pending) => set({ isPending: pending }),

    error: null,
    setError: (error) => set({ error }),

    successMessage: null,
    setSuccessMessage: (msg) => set({ successMessage: msg }),

    lastSentLetterNumber: null,
    setLastSentLetterNumber: (n) => set({ lastSentLetterNumber: n }),
}));
