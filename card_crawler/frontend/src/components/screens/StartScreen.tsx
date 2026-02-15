import { useGameActions } from '../../hooks/useGameActions';
import { useGameStore } from '../../stores/gameStore';

export default function StartScreen() {
  const { createAndStart } = useGameActions();
  const isLoading = useGameStore((s) => s.isLoading);

  return (
    <div className="start-screen">
      <h1>⚔️ CARD CRAWLER</h1>
      <p>A solo roguelike deck-builder on Sui. Fight through 3 floors and defeat the Dragon!</p>
      <div style={{ marginBottom: 16 }}>
        <div className="panel" style={{ textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
          <div className="panel-title">Rules</div>
          <ul style={{ listStyle: 'none', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <li>❤️ 80 HP · ⚡ 3 Energy · 💰 50 Gold</li>
            <li>🃏 10-card starter deck (Strike, Defend, Bash)</li>
            <li>⚔️ Draw 5 cards, play cards, enemy attacks</li>
            <li>🏔️ 3 floors: Combat → Shop → Rest → Boss</li>
            <li>🐉 Defeat the Dragon on Floor 3 to win!</li>
          </ul>
        </div>
      </div>
      <button
        className="btn btn-primary btn-lg"
        onClick={createAndStart}
        disabled={isLoading}
      >
        {isLoading ? '⏳ Creating run...' : '🎮 New Run'}
      </button>
    </div>
  );
}
