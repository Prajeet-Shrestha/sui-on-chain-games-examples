import React from 'react';
import type { GameSession } from '../lib/types';
import { COLOR_PALETTE } from '../constants';

interface Props {
  game: GameSession;
}

export function GameBoard({ game }: Props) {
  const { board, controlled, boardWidth, boardHeight, virusStarts } = game;

  return (
    <div
      className="game-board"
      style={{
        gridTemplateColumns: `repeat(${boardWidth}, 1fr)`,
        gridTemplateRows: `repeat(${boardHeight}, 1fr)`,
      }}
    >
      {board.map((_colorIdx, i) => (
        <Cell
          key={i}
          colorIdx={board[i]}
          isControlled={controlled[i]}
          isVirusStart={virusStarts.includes(i)}
        />
      ))}
    </div>
  );
}

const Cell = React.memo(function Cell({
  colorIdx,
  isControlled,
  isVirusStart,
}: {
  colorIdx: number;
  isControlled: boolean;
  isVirusStart: boolean;
}) {
  const bg = COLOR_PALETTE[colorIdx] ?? '#555';

  let className = 'board-cell';
  if (isControlled) className += ' board-cell--controlled';
  if (isVirusStart) className += ' board-cell--virus-start';

  return (
    <div
      className={className}
      style={{ backgroundColor: bg }}
    >
      {isVirusStart && isControlled && <span className="virus-icon">★</span>}
    </div>
  );
});
