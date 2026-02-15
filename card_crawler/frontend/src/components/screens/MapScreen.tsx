import { useGameActions } from '../../hooks/useGameActions';
import { useGameStore } from '../../stores/gameStore';
import { MAP_LAYOUT } from '../../constants';
import type { GameSession, PlayerState } from '../../lib/types';

interface Props {
  session: GameSession;
  player: PlayerState | null;
}

export default function MapScreen({ session, player }: Props) {
  const { chooseNode, advanceFloor } = useGameActions();
  const isLoading = useGameStore((s) => s.isLoading);

  const floor = session.floor;
  const nodes = MAP_LAYOUT[floor] ?? [];
  const nodesCleared = session.nodesCleared;
  const nodesTotal = session.nodesTotal;
  const allCleared = nodesCleared >= nodesTotal;

  // Current node to choose = nodesCleared (0-indexed)
  const currentNode = nodes[nodesCleared];

  return (
    <>
      {/* Player stats */}
      {player && (
        <div className="panel">
          <div className="panel-title">Player Stats</div>
          <div className="stat-row">
            <span className="stat-label">❤️ Health</span>
            <span className="stat-value hp">{player.health.current} / {player.health.max}</span>
          </div>
          <div className="hp-bar" style={{ marginBottom: 8 }}>
            <div className="bar-container">
              <div className="bar-fill" style={{ width: `${(player.health.current / player.health.max) * 100}%` }} />
              <div className="bar-label">{player.health.current} / {player.health.max}</div>
            </div>
          </div>
          <div className="stat-row">
            <span className="stat-label">💰 Gold</span>
            <span className="stat-value gold">{player.gold}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">🃏 Deck Size</span>
            <span className="stat-value">{player.deck.drawPile.length + player.deck.hand.length + player.deck.discardPile.length}</span>
          </div>
          {player.relics.length > 0 && (
            <div className="stat-row">
              <span className="stat-label">🔮 Relics</span>
              <span className="stat-value">{player.relics.length}</span>
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div className="panel">
        <div className="panel-title">Floor {floor} — Node {nodesCleared + 1} / {nodesTotal}</div>

        {allCleared ? (
          <div>
            <p style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>
              ✅ All nodes cleared on Floor {floor}!
            </p>
            {floor < 3 ? (
              <button
                className="btn btn-primary btn-full"
                onClick={advanceFloor}
                disabled={isLoading}
              >
                {isLoading ? '⏳ ...' : `🏔️ Advance to Floor ${floor + 1}`}
              </button>
            ) : (
              <p style={{ color: 'var(--success)' }}>🎉 You've completed the dungeon!</p>
            )}
          </div>
        ) : currentNode ? (
          <div className="node-list">
            <p style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              Choose your path:
            </p>
            {currentNode.paths.map((pathOption) => (
              <button
                key={pathOption.path}
                className="node-btn"
                onClick={() => chooseNode(pathOption.path)}
                disabled={isLoading}
              >
                {pathOption.label}
              </button>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>Loading map...</p>
        )}
      </div>
    </>
  );
}
