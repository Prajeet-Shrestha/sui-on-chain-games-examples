import type { TetrisState } from '../lib/tetrisEngine';

interface Props {
    state: TetrisState;
    onPlayAgain: () => void;
    onQuit: () => void;
    isLoading: boolean;
}

export default function GameOverScreen({ state, onPlayAgain, onQuit, isLoading }: Props) {
    return (
        <div className="gameover-screen">
            <h1 className="gameover-title">GAME OVER</h1>

            <div className="gameover-stats">
                <div className="stat-row">
                    <span className="stat-label">Final Score</span>
                    <span className="stat-value score-glow">{state.score.toLocaleString()}</span>
                </div>
                <div className="stat-row">
                    <span className="stat-label">Lines Cleared</span>
                    <span className="stat-value">{state.linesCleared}</span>
                </div>
                <div className="stat-row">
                    <span className="stat-label">Pieces Placed</span>
                    <span className="stat-value">{state.piecesPlaced}</span>
                </div>
                <div className="stat-row">
                    <span className="stat-label">Level Reached</span>
                    <span className="stat-value">{state.level}</span>
                </div>
                <div className="stat-row">
                    <span className="stat-label">Max Combo</span>
                    <span className="stat-value">{state.combo > 0 ? `×${state.combo}` : '—'}</span>
                </div>
            </div>

            <p className="save-hint">
                {isLoading
                    ? '⏳ Saving score to blockchain...'
                    : '💾 Your score will be saved to the Sui blockchain'
                }
            </p>

            <div className="gameover-actions">
                <button className="btn btn-primary btn-glow" onClick={onPlayAgain} disabled={isLoading}>
                    {isLoading ? '⏳ Saving...' : '🔄 PLAY AGAIN'}
                </button>
                <button className="btn btn-secondary" onClick={onQuit} disabled={isLoading}>
                    🚪 QUIT & SAVE
                </button>
            </div>
        </div>
    );
}
