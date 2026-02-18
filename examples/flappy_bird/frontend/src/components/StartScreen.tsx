interface StartScreenProps {
    onStart: () => void;
    isLoading: boolean;
}

export default function StartScreen({ onStart, isLoading }: StartScreenProps) {
    return (
        <div className="start-screen">
            <div className="start-bird">🐦</div>
            <h2 className="start-title">TAP TO FLY</h2>
            <p className="start-desc">
                Navigate through neon pipes.<br />
                Score is saved on the <span className="highlight">Sui blockchain</span>.
            </p>

            <button
                className="btn-primary"
                onClick={onStart}
                disabled={isLoading}
            >
                {isLoading ? '⏳ Signing...' : '🎮 START GAME'}
            </button>

            <div className="start-controls">
                <p><kbd>SPACE</kbd> or <kbd>CLICK</kbd> to flap</p>
            </div>
        </div>
    );
}
