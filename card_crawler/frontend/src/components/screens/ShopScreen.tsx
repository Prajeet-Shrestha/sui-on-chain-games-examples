import { useGameActions } from '../../hooks/useGameActions';
import { useGameStore } from '../../stores/gameStore';
import { SHOP_CARDS, CARD_TYPE_NAMES } from '../../constants';
import { lookupCard, lookupRelic } from '../../lib/cardLookup';
import ActionCard from '../cards/ActionCard';
import RelicCard from '../cards/RelicCard';
import type { GameSession, PlayerState } from '../../lib/types';

// Relic data for the shop
const RELIC_LIST = [
  { type: 0, name: 'Whetstone', effect: '+2 ATK', cost: 100 },
  { type: 1, name: 'Iron Ring', effect: '+2 DEF', cost: 100 },
  { type: 2, name: 'Energy Potion', effect: '+1 Energy', cost: 100 },
  { type: 3, name: 'Healing Crystal', effect: '+5 HP after combat', cost: 100 },
  { type: 4, name: 'Lucky Coin', effect: '+15 gold', cost: 100 },
  { type: 5, name: 'Thick Skin', effect: '+10 max HP', cost: 100 },
];

interface Props {
  session: GameSession;
  player: PlayerState | null;
}

export default function ShopScreen({ session, player }: Props) {
  const { shopAction, shopDone } = useGameActions();
  const isLoading = useGameStore((s) => s.isLoading);

  const gold = player?.gold ?? 0;

  return (
    <>
      {/* Gold display */}
      <div className="panel anim-slide-up">
        <div className="section-header">
          <span className="section-title">🛒 Shop</span>
          <span className="stat-value gold" style={{ fontSize: '1.1rem' }}>💰 {gold} Gold</span>
        </div>
      </div>

      {/* Buy Cards (60 gold each) */}
      <div className="panel anim-slide-up" style={{ animationDelay: '100ms' }}>
        <div className="panel-title">Cards — 60 Gold Each</div>
        <div className="card-row">
          {SHOP_CARDS.map((card) => {
            const cardInfo = lookupCard(card.name);
            const typeName = CARD_TYPE_NAMES[card.cardType] ?? 'ATK';
            const canBuy = gold >= 60 && !isLoading;
            return (
              <ActionCard
                key={card.index}
                name={card.name}
                cost={card.cost}
                cardType={card.cardType}
                cardTypeName={typeName}
                description={cardInfo?.description ?? card.description}
                value={card.value}
                imageUrl={cardInfo?.imageUrl}
                compact
                onClick={() => canBuy && shopAction(0, card.index)}
                className={!canBuy ? 'shop-disabled' : ''}
              />
            );
          })}
        </div>
      </div>

      {/* Remove Card (50 gold) */}
      {player && player.deck.drawPile.length > 0 && (
        <div className="panel anim-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="panel-title">Remove a Card — 50 Gold</div>
          <div className="card-row">
            {player.deck.drawPile.map((card, idx) => {
              const cardInfo = lookupCard(card.name);
              const typeName = CARD_TYPE_NAMES[card.cardType] ?? 'ATK';
              const canRemove = gold >= 50 && !isLoading;
              return (
                <ActionCard
                  key={idx}
                  name={card.name}
                  cost={card.cost}
                  cardType={card.cardType}
                  cardTypeName={typeName}
                  description={cardInfo?.description ?? `Remove from deck`}
                  value={Number(card.value)}
                  imageUrl={cardInfo?.imageUrl}
                  compact
                  onClick={() => canRemove && shopAction(1, idx)}
                  className={!canRemove ? 'shop-disabled' : ''}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Buy Relics (100 gold each) */}
      <div className="panel anim-slide-up" style={{ animationDelay: '300ms' }}>
        <div className="panel-title">Relics — 100 Gold Each</div>
        <div className="card-row">
          {RELIC_LIST.map((relic) => {
            const relicInfo = lookupRelic(relic.name);
            const canBuy = gold >= 100 && !isLoading;
            return (
              <RelicCard
                key={relic.type}
                name={relic.name}
                effect={relic.effect}
                cost={relic.cost}
                imageUrl={relicInfo?.imageUrl}
                onClick={() => canBuy && shopAction(2, relic.type)}
                disabled={!canBuy}
              />
            );
          })}
        </div>
      </div>

      {/* Leave Shop */}
      <button
        className="btn btn-ghost btn-full btn-lg"
        onClick={shopDone}
        disabled={isLoading}
      >
        {isLoading ? '⏳ ...' : '🚪 Leave Shop'}
      </button>
    </>
  );
}
