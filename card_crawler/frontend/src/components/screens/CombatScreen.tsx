import { useGameActions } from '../../hooks/useGameActions';
import { useGameStore } from '../../stores/gameStore';
import { CARD_TYPE_NAMES } from '../../constants';
import { lookupCard, lookupEnemyByStats, getPlayerImageUrl } from '../../lib/cardLookup';
import ActionCard from '../cards/ActionCard';
import EnemyCard from '../cards/EnemyCard';
import HeroCard from '../cards/HeroCard';
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

  // Enemy lookup by stats (each enemy has unique maxHp + atk combo)
  const enemyInfo = lookupEnemyByStats(session.enemyMaxHp, session.enemyBaseAtk);
  const enemyName = enemyInfo?.name ?? `Enemy (${session.enemyMaxHp} HP)`;
  const playerImgUrl = getPlayerImageUrl();

  const handleDraw = () => {
    drawPhase();
  };

  const handleEndTurn = () => {
    playCardsAndEndTurn(selectedCards);
  };

  return (
    <>
      {/* Battle Area: Enemy + Player cards side by side */}
      <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Enemy Card */}
        <div style={{ position: 'relative' }}>
          <EnemyCard
            name={enemyName}
            hp={session.enemyHp}
            maxHp={session.enemyMaxHp}
            atk={session.enemyAtk}
            nodeType={enemyInfo?.nodeType}
            floor={enemyInfo?.floor ?? session.floor}
            imageUrl={enemyInfo?.imageUrl}
            poisonStacks={session.poisonStacks}
            weakenStacks={session.weakenStacks}
            weakenTurns={session.weakenTurns}
          />
        </div>

        {/* Player Card */}
        {player && (
          <HeroCard
            name="Adventurer"
            hp={player.health.current}
            maxHp={player.health.max}
            energy={totalEnergy}
            maxEnergy={maxEnergy}
            gold={player.gold}
            block={session.block}
            atkBonus={session.atkBonus}
            defBonus={session.defBonus}
            imageUrl={playerImgUrl}
          />
        )}
      </div>

      {/* Turn info */}
      <div className="panel" style={{ textAlign: 'center' }}>
        <span className="panel-title" style={{ margin: 0 }}>
          ⚔️ Turn {session.turnCount}
          {player && (
            <span style={{ marginLeft: 12, color: 'var(--text-secondary)', fontFamily: "'Crimson Pro', serif", fontSize: '0.7rem', fontWeight: 400, letterSpacing: '0.02em' }}>
              Deck: {player.deck.drawPile.length} draw · {hand.length} hand · {player.deck.discardPile.length} discard
            </span>
          )}
        </span>
      </div>

      {/* Hand / Actions */}
      <div className="panel">
        {!hasDrawn ? (
          /* PHASE 1: Draw cards */
          <>
            <div className="panel-title">🃏 Start of Turn</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, fontFamily: "'Crimson Pro', serif" }}>
              Draw cards from your deck to begin your turn.
            </p>
            <button
              className="btn btn-primary btn-full btn-lg anim-pulse-glow"
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
                Hand ({hand.length}) · Cost: {selectedCost} / {totalEnergy} ⚡
              </span>
            </div>

            <div className="card-row">
              {hand.map((card, idx) => {
                const isSelected = selectedCards.includes(idx);
                const cardInfo = lookupCard(card.name);
                const typeName = CARD_TYPE_NAMES[card.cardType] ?? 'ATK';

                return (
                  <ActionCard
                    key={idx}
                    name={card.name}
                    cost={card.cost}
                    cardType={card.cardType}
                    cardTypeName={typeName}
                    description={cardInfo?.description ?? `${typeName} · Val: ${Number(card.value)}`}
                    value={Number(card.value)}
                    imageUrl={cardInfo?.imageUrl}
                    selected={isSelected}
                    onClick={() => toggleCard(idx)}
                    animationDelay={idx * 150}
                  />
                );
              })}
            </div>

            {!canAfford && (
              <p style={{ color: 'var(--danger-light)', fontSize: 12, marginTop: 12, textAlign: 'center', fontFamily: "'Crimson Pro', serif" }}>
                ⚠️ Not enough energy! Deselect some cards.
              </p>
            )}

            <div style={{ marginTop: 16 }}>
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
    </>
  );
}
