import type { DeliveryState } from '../lib/deliveryEngine';
import { LEVELS } from '../lib/deliveryEngine';

interface GameOverScreenProps {
    state: DeliveryState;
    onPlayAgain: () => void;
    onQuit: () => void;
    isLoading: boolean;
}

export default function GameOverScreen({ state, onPlayAgain, onQuit, isLoading }: GameOverScreenProps) {
    // Total mailboxes across all levels
    const totalMailboxes = LEVELS.reduce((sum, lv) => sum + Math.round(lv.houseCount * lv.mailboxRatio), 0);
    const maxScore = totalMailboxes * 100;
    const percentage = maxScore > 0 ? Math.round((state.score / maxScore) * 100) : 0;

    let grade = 'D';
    let gradeColor = '#ff4757';
    if (percentage >= 90) { grade = 'S'; gradeColor = '#ff6b35'; }
    else if (percentage >= 75) { grade = 'A'; gradeColor = '#00ff88'; }
    else if (percentage >= 60) { grade = 'B'; gradeColor = '#00e5ff'; }
    else if (percentage >= 40) { grade = 'C'; gradeColor = '#ffdd57'; }

    return (
        <div className="gameover-screen">
            <div className="gameover-card">
                <h2 className="gameover-title">
                    {state.levelPhase === 'allComplete' ? '🏁 Route Complete!' : '❌ Out of Ammo!'}
                </h2>
                <p className="gameover-subtitle">
                    {state.levelPhase === 'allComplete'
                        ? 'All 6 neighborhoods delivered'
                        : `Shift ended at LV.${state.currentLevel + 1} - ${state.levelConfig.name}`}
                </p>

                <div className="grade-display" style={{ color: gradeColor }}>
                    <span className="grade-label">GRADE</span>
                    <span className="grade-value">{grade}</span>
                </div>

                <div className="final-score">
                    <span className="score-label">FINAL SCORE</span>
                    <span className="score-value">{state.score}</span>
                    <span className="score-max">/ {maxScore}</span>
                </div>

                {state.maxCombo >= 3 && (
                    <div className="combo-badge">
                        🔥 Best Combo: {state.maxCombo}x
                    </div>
                )}

                <div className="stats-grid">
                    <div className="stat-item perfect">
                        <span className="stat-count">{state.perfectCount}</span>
                        <span className="stat-label">Perfect</span>
                    </div>
                    <div className="stat-item good">
                        <span className="stat-count">{state.goodCount}</span>
                        <span className="stat-label">Good</span>
                    </div>
                    <div className="stat-item ok">
                        <span className="stat-count">{state.okCount}</span>
                        <span className="stat-label">OK</span>
                    </div>
                    <div className="stat-item miss">
                        <span className="stat-count">{state.missCount}</span>
                        <span className="stat-label">Miss</span>
                    </div>
                </div>

                {/* Per-level breakdown */}
                <div className="level-breakdown">
                    <h4 className="breakdown-title">Per-Level Scores</h4>
                    <div className="breakdown-grid">
                        {LEVELS.map((lv, i) => {
                            const mailboxes = Math.round(lv.houseCount * lv.mailboxRatio);
                            const lvMax = mailboxes * 100;
                            const lvScore = state.perLevelScores[i] ?? 0;
                            return (
                                <div key={i} className="breakdown-row">
                                    <span className="breakdown-level">LV.{i + 1}</span>
                                    <span className="breakdown-name">{lv.name}</span>
                                    <span className="breakdown-score">{lvScore}<span className="breakdown-max">/{lvMax}</span></span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="gameover-actions">
                    <button className="btn-primary" onClick={onPlayAgain} disabled={isLoading}>
                        {isLoading ? '⏳ Saving...' : '🚲 Deliver Again'}
                    </button>
                    <button className="btn-secondary" onClick={onQuit} disabled={isLoading}>
                        {isLoading ? '⏳ Saving...' : '🏠 Quit'}
                    </button>
                </div>

                <p className="chain-badge">📦 All {state.totalDeliveries} deliveries recorded on Sui</p>
            </div>
        </div>
    );
}
