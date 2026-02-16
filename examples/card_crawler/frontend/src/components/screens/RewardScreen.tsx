import { useGameActions } from '../../hooks/useGameActions';
import { useGameStore } from '../../stores/gameStore';
import { REWARD_CARDS, CARD_TYPE_NAMES } from '../../constants';
import { lookupCard } from '../../lib/cardLookup';
import ActionCard from '../cards/ActionCard';
import type { GameSession } from '../../lib/types';

interface Props {
  session: GameSession;
}

export default function RewardScreen({ session }: Props) {
  const { collectReward } = useGameActions();
  const isLoading = useGameStore((s) => s.isLoading);

  const rewards = REWARD_CARDS[session.floor] ?? REWARD_CARDS[1];

  return (
    <>
      {/* Victory banner */}
      <div className="anim-bounce-in" style={{ textAlign: 'center' }}>
        <div className="result-banner win">⚔️ VICTORY!</div>
        <div className="divider" />
        <p style={{ color: 'var(--text-secondary)', fontFamily: "'Crimson Pro', serif", fontStyle: 'italic', marginBottom: 8 }}>
          Choose a card to add to your deck
        </p>
      </div>

      {/* Reward cards */}
      <div className="card-row">
        {rewards.map((card, idx) => {
          const cardInfo = lookupCard(card.name);
          const typeName = CARD_TYPE_NAMES[card.cardType] ?? 'ATK';
          return (
            <ActionCard
              key={idx}
              name={card.name}
              cost={card.cost}
              cardType={card.cardType}
              cardTypeName={typeName}
              description={cardInfo?.description ?? card.description}
              value={card.value}
              imageUrl={cardInfo?.imageUrl}
              onClick={() => !isLoading && collectReward(idx)}
              animationDelay={idx * 200}
            />
          );
        })}
      </div>

      <button
        className="btn btn-ghost btn-full"
        onClick={() => collectReward(3)}
        disabled={isLoading}
        style={{ marginTop: 12 }}
      >
        {isLoading ? '⏳ ...' : '⏭️ Skip Reward'}
      </button>
    </>
  );
}
