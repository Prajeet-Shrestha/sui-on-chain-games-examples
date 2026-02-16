import { useGameActions } from '../../hooks/useGameActions';
import { useGameStore } from '../../stores/gameStore';

export default function StartScreen() {
  const { createAndStart } = useGameActions();
  const isLoading = useGameStore((s) => s.isLoading);

  return (
    <div className="start-screen anim-fade-in">
      <h1>CARD CRAWLER</h1>
      <p>A dungeon-crawling card game on Sui blockchain</p>

      <div className="divider" />

      {/* Rules */}
      <div className="panel" style={{ textAlign: 'left', marginBottom: 24 }}>
        <div className="panel-title">📜 Rules</div>
        <ul style={{
          listStyle: 'none',
          padding: 0,
          color: 'var(--text-secondary)',
          fontFamily: "'Crimson Pro', serif",
          fontSize: 14,
          lineHeight: 1.8,
        }}>
          <li>🏔️ Navigate 3 floors of increasingly dangerous nodes</li>
          <li>⚔️ Combat: draw cards, then play & end turn</li>
          <li>🃏 Build your deck with cards from rewards & shops</li>
          <li>🔮 Collect relics for permanent bonuses</li>
          <li>🔥 Rest at campfires to heal 30% HP</li>
          <li>🐉 Defeat the Dragon on Floor 3 to win!</li>
        </ul>
      </div>

      <button
        className="btn btn-gold btn-full btn-lg anim-pulse-glow"
        onClick={createAndStart}
        disabled={isLoading}
      >
        {isLoading ? '⏳ Starting...' : '🗡️ Begin New Run'}
      </button>
    </div>
  );
}
