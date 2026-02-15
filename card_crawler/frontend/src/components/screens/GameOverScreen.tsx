import { useGameActions } from '../../hooks/useGameActions';
import { useGameStore } from '../../stores/gameStore';
import type { GameSession, PlayerState } from '../../lib/types';

interface Props {
  session: GameSession;
  player: PlayerState | null;
}

export default function GameOverScreen({ session, player }: Props) {
  const { createAndStart } = useGameActions();
  const { isLoading, clearGame } = useGameStore();

  const won = session.won;

  return (
    <div className="panel" style={{ textAlign: 'center' }}>
      {/* Result banner with animation */}
      <div
        className={`result-banner ${won ? 'win' : 'lose'}`}
        style={{
          animation: won ? 'bounceIn 0.6s cubic-bezier(0.23,1,0.32,1) forwards' : 'shakeX 0.5s ease',
        }}
      >
        {won ? '🏆 VICTORY!' : '💀 DEFEATED'}
      </div>

      <p style={{
        color: 'var(--text-secondary)',
        marginBottom: 20,
        fontSize: 15,
        fontFamily: "'Crimson Pro', serif",
        fontStyle: 'italic',
      }}>
        {won
          ? 'You defeated the Dragon and conquered the dungeon!'
          : `You fell on Floor ${session.floor}. The dungeon claims another soul...`
        }
      </p>

      <div className="divider" />

      {/* Run stats */}
      <div style={{ marginBottom: 20, textAlign: 'left', maxWidth: 300, margin: '0 auto 20px' }}>
        <div className="stat-row">
          <span className="stat-label">🏔️ Floor Reached</span>
          <span className="stat-value">{session.floor}</span>
        </div>
        {player && (
          <>
            <div className="stat-row">
              <span className="stat-label">❤️ Final HP</span>
              <span className="stat-value hp">{player.health.current} / {player.health.max}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">💰 Gold</span>
              <span className="stat-value gold">{player.gold}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">🃏 Deck Size</span>
              <span className="stat-value">
                {player.deck.drawPile.length + player.deck.hand.length + player.deck.discardPile.length}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">🔮 Relics</span>
              <span className="stat-value">{player.relics.length}</span>
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button
          className={`btn ${won ? 'btn-gold' : 'btn-primary'} btn-lg`}
          onClick={() => {
            clearGame();
            createAndStart();
          }}
          disabled={isLoading}
        >
          {isLoading ? '⏳ ...' : '🗡️ New Run'}
        </button>
        <button
          className="btn btn-ghost btn-lg"
          onClick={clearGame}
        >
          🏠 Main Menu
        </button>
      </div>
    </div>
  );
}
