import type { FlappyState } from '../lib/flappyEngine';

interface GameOverScreenProps {
    state: FlappyState;
    onPlayAgain: () => void;
    onQuit: () => void;
    isLoading: boolean;
}

export default function GameOverScreen({
    state,
    onPlayAgain,
    onQuit,
    isLoading,
}: GameOverScreenProps) {
    return (
        <div className="gameover-screen">
            <h2 className="gameover-title">GAME OVER</h2>

            <div className="score-card">
                <div className="score-row">
                    <span className="score-label">SCORE</span>
                    <span className="score-value">{state.score}</span>
                </div>
                <div className="score-row">
                    <span className="score-label">PIPES</span>
                    <span className="score-value">{state.pipesPassed}</span>
                </div>
            </div>

            <div className="gameover-actions">
                <button
                    className="btn-primary"
                    onClick={onPlayAgain}
                    disabled={isLoading}
                >
                    {isLoading ? '⏳ Saving...' : '🔄 PLAY AGAIN (SAVE)'}
                </button>
                <button
                    className="btn-secondary"
                    onClick={onQuit}
                    disabled={isLoading}
                >
                    {isLoading ? '⏳ Saving...' : '🏠 QUIT (SAVE)'}
                </button>
            </div>

            <p className="gameover-hint">
                Your score will be recorded on the Sui blockchain
            </p>
        </div>
    );
}
