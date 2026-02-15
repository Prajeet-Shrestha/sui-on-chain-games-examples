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

  return (
    <div className="panel" style={{ textAlign: 'center' }}>
      <div className="panel-title">⛺ Rest Site</div>

      <p style={{ fontSize: 48, margin: '20px 0' }}>🔥</p>

      <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
        Rest by the campfire to recover your strength.
      </p>

      {player && (
        <div style={{ marginBottom: 16 }}>
          <div className="stat-row" style={{ justifyContent: 'center', gap: 16 }}>
            <span className="stat-value hp">❤️ {currentHp}</span>
            <span style={{ color: 'var(--success)' }}>→ +{healAmount}</span>
            <span className="stat-value hp">→ ❤️ {hpAfter}</span>
          </div>
        </div>
      )}

      <button
        className="btn btn-success btn-full btn-lg"
        onClick={rest}
        disabled={isLoading}
      >
        {isLoading ? '⏳ Resting...' : `⛺ Rest (Heal ${healAmount} HP)`}
      </button>
    </div>
  );
}
