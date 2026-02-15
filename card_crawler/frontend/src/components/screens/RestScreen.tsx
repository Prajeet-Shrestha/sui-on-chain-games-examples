import { useGameActions } from '../../hooks/useGameActions';
import { useGameStore } from '../../stores/gameStore';
import type { GameSession, PlayerState } from '../../lib/types';

interface Props {
  session: GameSession;
  player: PlayerState | null;
}

export default function RestScreen({ session, player }: Props) {
  const { rest } = useGameActions();
  const isLoading = useGameStore((s) => s.isLoading);

  const currentHp = player?.health.current ?? 0;
  const maxHp = player?.health.max ?? 0;
  const healAmount = Math.floor(maxHp * 0.3);
  const hpAfter = Math.min(currentHp + healAmount, maxHp);
  const hpPct = maxHp > 0 ? Math.round((currentHp / maxHp) * 100) : 0;
  const hpAfterPct = maxHp > 0 ? Math.round((hpAfter / maxHp) * 100) : 0;

  return (
    <div className="panel anim-slide-up" style={{ textAlign: 'center' }}>
      <div className="panel-title">⛺ Rest Site</div>

      {/* Campfire */}
      <div style={{ fontSize: 64, margin: '16px 0' }} className="anim-fire">
        🔥
      </div>

      <p style={{
        color: 'var(--text-secondary)',
        marginBottom: 20,
        fontFamily: "'Crimson Pro', serif",
        fontStyle: 'italic',
        fontSize: 15,
      }}>
        Rest by the campfire to recover your strength.
      </p>

      {player && (
        <div style={{ marginBottom: 20 }}>
          {/* HP preview */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 12,
            fontFamily: "'Cinzel', serif",
          }}>
            <span style={{ color: 'var(--blood-red)', fontWeight: 700, fontSize: '1.2rem' }}>
              ❤️ {currentHp}
            </span>
            <span style={{ color: 'var(--success)', fontSize: '1.1rem' }}>→ +{healAmount}</span>
            <span style={{ color: 'var(--gold-bright)', fontWeight: 700, fontSize: '1.2rem' }}>
              → ❤️ {hpAfter}
            </span>
          </div>

          {/* HP bar */}
          <div className="hp-bar">
            <div className="bar-container" style={{ height: 12 }}>
              {/* After-heal preview (lighter) */}
              <div className="bar-fill" style={{
                width: `${hpAfterPct}%`,
                background: 'linear-gradient(90deg, #2e7d32, #66bb6a)',
                opacity: 0.3,
                position: 'absolute',
                top: 0,
                left: 0,
              }} />
              {/* Current HP */}
              <div className="bar-fill" style={{
                width: `${hpPct}%`,
                position: 'relative',
                zIndex: 2,
              }} />
              <div className="bar-label">{currentHp} / {maxHp}</div>
            </div>
          </div>
        </div>
      )}

      <button
        className="btn btn-success btn-full btn-lg anim-pulse-glow"
        onClick={rest}
        disabled={isLoading}
      >
        {isLoading ? '⏳ Resting...' : `⛺ Rest (Heal ${healAmount} HP)`}
      </button>
    </div>
  );
}
