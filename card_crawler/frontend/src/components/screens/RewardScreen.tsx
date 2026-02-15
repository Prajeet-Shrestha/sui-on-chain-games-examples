import { useGameActions } from '../../hooks/useGameActions';
import { useGameStore } from '../../stores/gameStore';
import { REWARD_CARDS } from '../../constants';
import type { GameSession } from '../../lib/types';

interface Props {
  session: GameSession;
}

export default function RewardScreen({ session }: Props) {
  const { collectReward } = useGameActions();
  const isLoading = useGameStore((s) => s.isLoading);

  const rewards = REWARD_CARDS[session.floor] ?? REWARD_CARDS[1];

  return (
    <div className="panel">
      <div className="panel-title">⚔️ Victory! Choose a Card Reward</div>

      <div className="item-grid">
        {rewards.map((card, idx) => (
          <div
            key={idx}
            className="item-card"
            onClick={() => !isLoading && collectReward(idx)}
            style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
          >
            <div className="item-name">{card.name}</div>
            <div className="item-desc">
              ⚡ {card.cost} · {card.description}
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn btn-ghost btn-full"
        onClick={() => collectReward(3)}
        disabled={isLoading}
        style={{ marginTop: 12 }}
      >
        {isLoading ? '⏳ ...' : '⏭️ Skip Reward'}
      </button>
    </div>
  );
}
