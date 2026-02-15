import { useGameActions } from '../../hooks/useGameActions';
import { useGameStore } from '../../stores/gameStore';
import { SHOP_CARDS, RELIC_NAMES } from '../../constants';
import type { GameSession, PlayerState } from '../../lib/types';

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
      <div className="panel">
        <div className="panel-title">🛒 Shop</div>
        <div className="stat-row">
          <span className="stat-label">💰 Your Gold</span>
          <span className="stat-value gold">{gold}</span>
        </div>
      </div>

      {/* Buy Cards (60 gold each) */}
      <div className="panel">
        <div className="panel-title">Cards (60 Gold each)</div>
        <div className="item-grid">
          {SHOP_CARDS.map((card) => (
            <div
              key={card.index}
              className="item-card"
              onClick={() => !isLoading && gold >= 60 && shopAction(0, card.index)}
              style={{
                cursor: isLoading || gold < 60 ? 'not-allowed' : 'pointer',
                opacity: gold < 60 ? 0.5 : 1,
              }}
            >
              <div className="item-name">{card.name}</div>
              <div className="item-desc">⚡ {card.cost} · {card.description}</div>
              <div className="item-price">💰 60</div>
            </div>
          ))}
        </div>
      </div>

      {/* Remove Card (50 gold) */}
      {player && player.deck.drawPile.length > 0 && (
        <div className="panel">
          <div className="panel-title">Remove a Card (50 Gold)</div>
          <div className="item-grid">
            {player.deck.drawPile.map((card, idx) => (
              <div
                key={idx}
                className="item-card"
                onClick={() => !isLoading && gold >= 50 && shopAction(1, idx)}
                style={{
                  cursor: isLoading || gold < 50 ? 'not-allowed' : 'pointer',
                  opacity: gold < 50 ? 0.5 : 1,
                }}
              >
                <div className="item-name">{card.name}</div>
                <div className="item-desc">⚡ {card.cost}</div>
                <div className="item-price">💰 50</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buy Relics (100 gold each) */}
      <div className="panel">
        <div className="panel-title">Relics (100 Gold each)</div>
        <div className="item-grid">
          {Object.entries(RELIC_NAMES).map(([typeStr, name]) => {
            const relicType = Number(typeStr);
            return (
              <div
                key={relicType}
                className="item-card"
                onClick={() => !isLoading && gold >= 100 && shopAction(2, relicType)}
                style={{
                  cursor: isLoading || gold < 100 ? 'not-allowed' : 'pointer',
                  opacity: gold < 100 ? 0.5 : 1,
                }}
              >
                <div className="item-name">🔮 {name}</div>
                <div className="item-price">💰 100</div>
              </div>
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
