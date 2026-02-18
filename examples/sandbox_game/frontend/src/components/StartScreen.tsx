import { useGameActions } from '../hooks/useGameActions';
import { useGameStore } from '../stores/gameStore';

export default function StartScreen() {
    const { startGame } = useGameActions();
    const isLoading = useGameStore((s) => s.isLoading);

    async function handleStart() {
        try {
            await startGame();
        } catch (err) {
            console.error('Failed to start game:', err);
        }
    }

    return (
        <div className="start-screen">
            <div className="start-content">
                <h1 className="start-title">⛏️ New World</h1>
                <p className="start-desc">
                    Generate a procedural 16×16 world on-chain with random terrain.
                    Mine resources, craft tools, and build anything you imagine!
                </p>
                <div className="start-preview">
                    <div className="block-row">
                        <span className="preview-block dirt">🟫</span>
                        <span className="preview-block wood">🌲</span>
                        <span className="preview-block stone">🪨</span>
                        <span className="preview-block iron">⛏️</span>
                        <span className="preview-block diamond">💎</span>
                    </div>
                </div>
                <button
                    className="btn-start"
                    onClick={handleStart}
                    disabled={isLoading}
                >
                    {isLoading ? '⏳ Creating World...' : '🌍 Create New World'}
                </button>
            </div>
        </div>
    );
}
