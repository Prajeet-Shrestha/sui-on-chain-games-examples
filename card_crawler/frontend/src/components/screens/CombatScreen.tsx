import { useGameActions } from '../../hooks/useGameActions';
import { useGameStore } from '../../stores/gameStore';
import { CARD_TYPE_NAMES } from '../../constants';
import type { GameSession, PlayerState } from '../../lib/types';

interface Props {
  session: GameSession;
  player: PlayerState | null;
}

export default function CombatScreen({ session, player }: Props) {
  const { drawPhase, playCardsAndEndTurn } = useGameActions();
  const { selectedCards, toggleCard, isLoading } = useGameStore();

  const hand = player?.deck.hand ?? [];
  const totalEnergy = player?.energy.current ?? 0;
  const maxEnergy = player?.energy.max ?? 0;

  // Whether we've drawn cards this turn (hand has cards)
  const hasDrawn = hand.length > 0;

  // Calculate energy cost of selected cards
  const selectedCost = selectedCards.reduce((sum, idx) => {
    const card = hand[idx];
    return sum + (card?.cost ?? 0);
  }, 0);

  const canAfford = selectedCost <= totalEnergy;

  const handleDraw = () => {
    drawPhase();
  };

  const handleEndTurn = () => {
    playCardsAndEndTurn(selectedCards);
  };

  return (
    <>
      {/* Enemy Panel */}
      <div className="panel">
        <div className="panel-title">Enemy</div>
        <div className="stat-row">
          <span className="stat-label">👾 Type</span>
          <span className="stat-value">{session.enemyType}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">❤️ HP</span>
          <span className="stat-value hp">{session.enemyHp} / {session.enemyMaxHp}</span>
        </div>
        <div className="hp-bar" style={{ marginBottom: 8 }}>
          <div className="bar-container">
            <div className="bar-fill" style={{ width: `${session.enemyMaxHp > 0 ? (session.enemyHp / session.enemyMaxHp) * 100 : 0}%` }} />
            <div className="bar-label">{session.enemyHp} / {session.enemyMaxHp}</div>
          </div>
        </div>
        <div className="stat-row">
          <span className="stat-label">⚔️ ATK</span>
          <span className="stat-value" style={{ color: 'var(--danger)' }}>{session.enemyAtk}</span>
        </div>
        {session.poisonStacks > 0 && (
          <div className="stat-row">
            <span className="stat-label">☠️ Poison</span>
            <span className="stat-value" style={{ color: 'var(--success)' }}>{session.poisonStacks}</span>
          </div>
        )}
        {session.weakenStacks > 0 && (
          <div className="stat-row">
            <span className="stat-label">🔻 Weakened</span>
            <span className="stat-value" style={{ color: 'var(--warning)' }}>-{session.weakenStacks} ATK ({session.weakenTurns}t)</span>
          </div>
        )}
      </div>

      {/* Player Stats */}
      {player && (
        <div className="panel">
          <div className="panel-title">Player — Turn {session.turnCount}</div>
          <div className="stat-row">
            <span className="stat-label">❤️ HP</span>
            <span className="stat-value hp">{player.health.current} / {player.health.max}</span>
          </div>
          <div className="hp-bar" style={{ marginBottom: 8 }}>
            <div className="bar-container">
              <div className="bar-fill" style={{ width: `${(player.health.current / player.health.max) * 100}%` }} />
              <div className="bar-label">{player.health.current} / {player.health.max}</div>
            </div>
          </div>
          <div className="stat-row">
            <span className="stat-label">⚡ Energy</span>
            <span className="stat-value energy">{totalEnergy} / {maxEnergy}</span>
          </div>
          {session.block > 0 && (
            <div className="stat-row">
              <span className="stat-label">🛡️ Block</span>
              <span className="stat-value block">{session.block}</span>
            </div>
          )}
          {session.atkBonus > 0 && (
            <div className="stat-row">
              <span className="stat-label">⚔️ ATK Bonus</span>
              <span className="stat-value">+{session.atkBonus}</span>
            </div>
          )}
          {session.defBonus > 0 && (
            <div className="stat-row">
              <span className="stat-label">🛡️ DEF Bonus</span>
              <span className="stat-value">+{session.defBonus}</span>
            </div>
          )}
        </div>
      )}

      {/* Hand / Actions */}
      <div className="panel">
        {!hasDrawn ? (
          /* PHASE 1: Draw cards */
          <>
            <div className="panel-title">🃏 Start of Turn</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Draw cards from your deck to begin your turn.
            </p>
            <button
              className="btn btn-accent btn-full btn-lg"
              onClick={handleDraw}
              disabled={isLoading}
            >
              {isLoading ? '⏳ Drawing...' : '🃏 Draw Cards'}
            </button>
          </>
        ) : (
          /* PHASE 2: Select cards and end turn */
          <>
            <div className="section-header">
              <span className="panel-title" style={{ margin: 0 }}>
                Hand ({hand.length} cards) · Cost: {selectedCost} / {totalEnergy} ⚡
              </span>
            </div>

            <div className="card-hand">
              {hand.map((card, idx) => {
                const isSelected = selectedCards.includes(idx);
                const typeClass = card.cardType === 0 ? 'type-atk' : card.cardType === 1 ? 'type-skill' : 'type-power';
                return (
                  <div
                    key={idx}
                    className={`game-card ${typeClass} ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleCard(idx)}
                  >
                    <div className="card-name">{card.name}</div>
                    <div className="card-cost">⚡ {card.cost}</div>
                    <div className="card-effect">
                      {CARD_TYPE_NAMES[card.cardType]} · Val: {Number(card.value)}
                    </div>
                  </div>
                );
              })}
            </div>

            {!canAfford && (
              <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>
                ⚠️ Not enough energy! Deselect some cards.
              </p>
            )}

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button
                className="btn btn-danger btn-full btn-lg"
                onClick={handleEndTurn}
                disabled={isLoading || !canAfford}
              >
                {isLoading
                  ? '⏳ Processing...'
                  : selectedCards.length === 0
                    ? '⚔️ End Turn (skip cards)'
                    : `⚔️ Play ${selectedCards.length} Card${selectedCards.length > 1 ? 's' : ''} & End Turn`
                }
              </button>
            </div>
          </>
        )}
      </div>

      {/* Deck info */}
      {player && (
        <div className="panel" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Draw pile: {player.deck.drawPile.length} · Hand: {hand.length} · Discard: {player.deck.discardPile.length}
        </div>
      )}
    </>
  );
}
