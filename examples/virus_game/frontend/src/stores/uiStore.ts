import { create } from 'zustand';

interface UIStore {
    sessionId: string | null;
    setSessionId: (id: string | null) => void;
    isPending: boolean;
    setIsPending: (pending: boolean) => void;
    error: string | null;
    setError: (error: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
    sessionId: null,
    setSessionId: (id) => set({ sessionId: id }),
    isPending: false,
    setIsPending: (pending) => set({ isPending: pending }),
    error: null,
    setError: (error) => set({ error }),
}));
