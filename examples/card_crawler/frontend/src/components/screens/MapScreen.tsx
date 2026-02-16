import { useGameActions } from '../../hooks/useGameActions';
import { useGameStore } from '../../stores/gameStore';
import { MAP_LAYOUT } from '../../constants';
import { getPlayerImageUrl } from '../../lib/cardLookup';
import HeroCard from '../cards/HeroCard';
import type { GameSession, PlayerState } from '../../lib/types';

interface Props {
  session: GameSession;
  player: PlayerState | null;
}

const NODE_ICONS: Record<number, string> = {
  0: '⚔️',   // Combat
  1: '🛡️',   // Elite
  2: '🛒',   // Shop
  3: '🔥',   // Rest
  4: '🐉',   // Boss
};

const NODE_STYLES: Record<number, { borderColor: string; glowColor: string }> = {
  0: { borderColor: 'rgba(212,168,69,0.3)', glowColor: 'rgba(212,168,69,0.1)' },
  1: { borderColor: 'rgba(163,53,238,0.35)', glowColor: 'rgba(163,53,238,0.12)' },
  2: { borderColor: 'rgba(240,208,96,0.3)', glowColor: 'rgba(240,208,96,0.1)' },
  3: { borderColor: 'rgba(255,140,0,0.3)', glowColor: 'rgba(255,140,0,0.08)' },
  4: { borderColor: 'rgba(204,34,0,0.4)', glowColor: 'rgba(204,34,0,0.15)' },
};

export default function MapScreen({ session, player }: Props) {
  const { chooseNode, advanceFloor } = useGameActions();
  const isLoading = useGameStore((s) => s.isLoading);

  const floor = session.floor;
  const nodes = MAP_LAYOUT[floor] ?? [];
  const nodesCleared = session.nodesCleared;
  const nodesTotal = session.nodesTotal;
  const allCleared = nodesCleared >= nodesTotal;
  const currentNode = nodes[nodesCleared];
  const playerImgUrl = getPlayerImageUrl();

  return (
    <>
      {/* Player card (compact) */}
      {player && (
        <HeroCard
          name="Adventurer"
          hp={player.health.current}
          maxHp={player.health.max}
          energy={player.energy.current}
          maxEnergy={player.energy.max}
          gold={player.gold}
          compact
          imageUrl={playerImgUrl}
        />
      )}

      {/* Map */}
      <div className="panel anim-slide-up">
        <div className="panel-title">🏔️ Floor {floor} — Node {nodesCleared + 1} / {nodesTotal}</div>

        {allCleared ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: 16, color: 'var(--success)', fontSize: 15, fontFamily: "'Crimson Pro', serif" }}>
              ✅ All nodes cleared on Floor {floor}!
            </p>
            {floor < 3 ? (
              <button
                className="btn btn-primary btn-full btn-lg anim-pulse-glow"
                onClick={advanceFloor}
                disabled={isLoading}
              >
                {isLoading ? '⏳ ...' : `🏔️ Advance to Floor ${floor + 1}`}
              </button>
            ) : (
              <p style={{ color: 'var(--gold-bright)', fontFamily: "'Cinzel Decorative', serif", fontSize: 20 }}>
                🎉 You've conquered the dungeon!
              </p>
            )}
          </div>
        ) : currentNode ? (
          <div className="node-list">
            <p style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)', fontFamily: "'Cinzel', serif", letterSpacing: '0.06em' }}>
              Choose your path:
            </p>
            {currentNode.paths.map((pathOption, idx) => {
              const ns = NODE_STYLES[pathOption.nodeType] ?? NODE_STYLES[0];
              return (
                <button
                  key={pathOption.path}
                  className="node-btn anim-slide-up"
                  style={{
                    borderColor: ns.borderColor,
                    animationDelay: `${idx * 150}ms`,
                    boxShadow: `0 0 15px ${ns.glowColor}`,
                  }}
                  onClick={() => chooseNode(pathOption.path)}
                  disabled={isLoading}
                >
                  <span style={{ marginRight: 8, fontSize: 18 }}>{NODE_ICONS[pathOption.nodeType] ?? '❓'}</span>
                  {pathOption.label}
                </button>
              );
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>Loading map...</p>
        )}
      </div>
    </>
  );
}
