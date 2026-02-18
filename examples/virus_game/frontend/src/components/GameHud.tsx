import type { GameSession } from '../lib/types';
import { LEVELS } from '../constants';

interface Props {
  game: GameSession;
}

export function GameHud({ game }: Props) {
  const level = LEVELS.find((l) => l.id === game.level);
  const totalCells = game.boardWidth * game.boardHeight;
  const progress = Math.round((game.controlledCount / totalCells) * 100);
  const maxMoves = game.movesUsed + game.movesRemaining;

  const moveRatio = game.movesRemaining / maxMoves;
  const barColor =
    moveRatio > 0.5 ? 'var(--color-success)' :
    moveRatio > 0.2 ? 'var(--color-warning)' :
    'var(--color-danger)';

  return (
    <div className="game-hud">
      {/* Left: Level info */}
      <div className="hud-left">
        <span className="hud-level-tag">LVL {game.level}</span>
        <span className="hud-level-name">{level?.name ?? '???'}</span>
      </div>

      {/* Right: Stats */}
      <div className="hud-right">
        <div className="hud-stat">
          <span className="hud-stat__value">{game.movesUsed}/{maxMoves}</span>
          <span className="hud-stat__label">Moves</span>
          <div className="hud-stat__bar">
            <div
              className="hud-stat__bar-fill"
              style={{ width: `${(1 - moveRatio) * 100}%`, backgroundColor: barColor }}
            />
          </div>
        </div>
        <div className="hud-stat">
          <span className="hud-stat__value">{game.controlledCount}/{totalCells}</span>
          <span className="hud-stat__label">Infected</span>
          <div className="hud-stat__bar">
            <div
              className="hud-stat__bar-fill"
              style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }}
            />
          </div>
        </div>
        <div className="hud-progress-pct">{progress}%</div>
      </div>
    </div>
  );
}
