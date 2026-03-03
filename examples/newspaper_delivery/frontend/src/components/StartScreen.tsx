import { LEVELS } from '../lib/deliveryEngine';
import { useGameStore } from '../stores/gameStore';

interface StartScreenProps {
    onStart: (levelIndex: number) => void;
    isLoading: boolean;
}

export default function StartScreen({ onStart, isLoading }: StartScreenProps) {
    const levelScores = useGameStore(s => s.levelScores);

    return (
        <div className="start-screen">
            <div className="start-hero">
                <div className="hero-icon">🏙️</div>
                <h1 className="hero-title">
                    <span className="title-sui">CITY</span>
                    <span className="title-deliver">DELIVERY</span>
                </h1>
                <p className="hero-tagline">Select a neighborhood to begin your route</p>
            </div>

            <div className="level-select-container">
                <div className="level-grid-large">
                    {LEVELS.map((lv, i) => {
                        const mailboxes = Math.round(lv.houseCount * lv.mailboxRatio);
                        const best = levelScores[i];
                        const maxScore = mailboxes * 100;
                        const isUnlocked = i === 0 || (levelScores[i - 1] !== undefined); // Simple unlock logic or unlocked all?
                        // User said "start ANY level as they want", so unlock all.

                        return (
                            <button
                                key={i}
                                className="level-card"
                                onClick={() => onStart(i)}
                                disabled={isLoading}
                            >
                                <div className="level-card-header">
                                    <span className="level-card-num">{i + 1}</span>
                                    <div className="level-card-best">
                                        {best !== undefined ? (
                                            <span className="best-score">{best} <span className="max-score">/ {maxScore}</span></span>
                                        ) : (
                                            <span className="no-score">NO RECORD</span>
                                        )}
                                    </div>
                                </div>
                                <div className="level-card-body">
                                    <h3 className="level-card-name">{lv.name}</h3>
                                    <p className="level-card-info">{mailboxes} Mailboxes • Speed: {lv.baseSpeed}x</p>
                                </div>
                                <div className="level-card-play">
                                    {isLoading ? '⏳' : 'PLAY'}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="instructions-mini">
                <div className="mini-item">
                    <span className="mini-icon">🎯</span>
                    <span><strong>SPACE</strong> to Throw</span>
                </div>
                <div className="mini-item">
                    <span className="mini-icon">📬</span>
                    <span>Hit <strong>Mailboxes</strong> (Green Ring)</span>
                </div>
                <div className="mini-item">
                    <span className="mini-icon">🗞️</span>
                    <span>Limited Ammo</span>
                </div>
            </div>

            <p className="on-chain-note">
                Recorded on Sui Testnet via PTB
            </p>
        </div>
    );
}
