import { LEVELS, getMaze } from '../lib/mazeData';
import { soundManager } from '../lib/audio';

interface LevelSelectProps {
    onSelectLevel: (level: number) => void;
    isLoading: boolean;
}

const DIFFICULTY_LABELS = ['Easy', 'Medium', 'Hard', 'Expert', 'Insane'];
const DIFFICULTY_COLORS = ['#00ff9d', '#00f3ff', '#ffd700', '#ff6b00', '#ff2a2a'];

export default function LevelSelect({ onSelectLevel, isLoading }: LevelSelectProps) {
    return (
        <div className="level-select">
            <div className="level-select-header">
                <h2>Choose Your Dungeon</h2>
                <p className="level-select-subtitle">Navigate through darkness. Find the exit. Every move recorded on-chain.</p>
            </div>

            <div className="objective-banner">
                <div className="objective-icon">🎯</div>
                <div className="objective-text">
                    <strong>Objective</strong>
                    <p>Find the <span className="text-gold">golden exit door</span> before running out of moves.
                        Use WASD or Arrow Keys to navigate. Your vision is limited — watch the fog!</p>
                </div>
            </div>

            <div className="level-grid">
                {LEVELS.map((config, i) => {
                    const level = i + 1;
                    const maze = getMaze(level);
                    const difficulty = DIFFICULTY_LABELS[i] || 'Hard';
                    const diffColor = DIFFICULTY_COLORS[i] || '#fff';

                    return (
                        <button
                            key={level}
                            className="level-card"
                            onClick={() => {
                                soundManager.playClick();
                                onSelectLevel(level);
                            }}
                            disabled={isLoading}
                        >
                            <div className="level-card-header">
                                <span className="level-card-number">Level {level}</span>
                                <span className="difficulty-badge" style={{ color: diffColor, borderColor: diffColor }}>
                                    {difficulty}
                                </span>
                            </div>
                            <div className="level-card-emoji">{config.emoji}</div>
                            <div className="level-card-name">{config.name}</div>
                            <div className="level-card-desc">{config.description}</div>
                            <div className="level-card-stats">
                                <span className="stat-pill moves">⚡ {maze.maxMoves} moves</span>
                                <span className="stat-pill fog">👁 Radius {config.viewRadius}</span>
                            </div>
                            <div className="level-card-arrow">→</div>
                        </button>
                    );
                })}
            </div>

            <div className="how-it-works">
                <h3>How It Works</h3>
                <div className="how-steps">
                    <div className="how-step">
                        <div className="how-step-num">1</div>
                        <p><strong>Sign & Start</strong><br />Sign a transaction to generate your unique maze on-chain</p>
                    </div>
                    <div className="how-step-arrow">→</div>
                    <div className="how-step">
                        <div className="how-step-num">2</div>
                        <p><strong>Navigate</strong><br />Find the exit using WASD / Arrow Keys within move limit</p>
                    </div>
                    <div className="how-step-arrow">→</div>
                    <div className="how-step">
                        <div className="how-step-num">3</div>
                        <p><strong>Verify</strong><br />All moves replayed & verified on Sui in a single transaction</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
