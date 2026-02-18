import type { GameSession } from '../lib/types';

interface Props {
  game: GameSession;
  onPlayAgain: () => void;
}

export function GameOver({ game, onPlayAgain }: Props) {
  const isWin = game.state === 'won';
  const totalCells = game.boardWidth * game.boardHeight;

  return (
    <div className={`game-over ${isWin ? 'game-over--win' : 'game-over--lose'}`}>
      <div className="game-over__icon">{isWin ? '🎉' : '💀'}</div>
      <h2 className="game-over__title">
        {isWin ? 'Total Infection!' : 'Containment Success...'}
      </h2>
      <p className="game-over__subtitle">
        {isWin
          ? `You conquered the entire grid in ${game.movesUsed} moves!`
          : `The virus was contained. ${game.controlledCount}/${totalCells} cells infected.`}
      </p>

      <div className="game-over__stats">
        <div className="stat">
          <span className="stat__value">{game.movesUsed}</span>
          <span className="stat__label">Moves Used</span>
        </div>
        <div className="stat">
          <span className="stat__value">{game.controlledCount}</span>
          <span className="stat__label">Cells Infected</span>
        </div>
        <div className="stat">
          <span className="stat__value">{Math.round((game.controlledCount / totalCells) * 100)}%</span>
          <span className="stat__label">Coverage</span>
        </div>
      </div>

      <button className="btn btn--primary" onClick={onPlayAgain}>
        Play Again
      </button>
    </div>
  );
}
