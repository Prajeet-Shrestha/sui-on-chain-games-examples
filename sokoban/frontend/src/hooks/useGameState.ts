import { useGameStore } from '../stores/gameStore';

/**
 * useGameState is no longer needed for fetching on-chain GameSession data
 * since sessions are now per-player (created dynamically per start_level call).
 *
 * The game store already tracks all state locally.
 * This hook is kept for convenience to re-export store data.
 */
export function useGameState() {
    const sessionId = useGameStore((s) => s.sessionId);
    const levelId = useGameStore((s) => s.levelId);
    const levelData = useGameStore((s) => s.levelData);

    return {
        sessionId,
        levelId,
        levelData,
        isActive: levelId !== null && sessionId !== null,
    };
}
