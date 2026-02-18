interface Props {
    onStart: () => void;
    isLoading: boolean;
}

export default function StartScreen({ onStart, isLoading }: Props) {
    return (
        <div className="start-screen">
            <div className="logo-block">
                <span className="logo-sui">SUI</span>
                <span className="logo-tris">TRIS</span>
            </div>
            <p className="start-subtitle">Fully On-Chain Tetris on Sui</p>

            <div className="start-info">
                <div className="info-card">
                    <span className="info-icon">🎮</span>
                    <span>Real-time Tetris — blocks fall automatically</span>
                </div>
                <div className="info-card">
                    <span className="info-icon">⛓️</span>
                    <span>Sign once to start, your final score is saved on-chain</span>
                </div>
                <div className="info-card">
                    <span className="info-icon">🏆</span>
                    <span>Your high score lives forever on the blockchain</span>
                </div>
            </div>

            <button
                className="btn btn-primary btn-glow"
                onClick={onStart}
                disabled={isLoading}
            >
                {isLoading ? '⏳ Starting...' : '🚀 NEW GAME'}
            </button>
        </div>
    );
}
