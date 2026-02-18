import { useState } from 'react';
import type { Game } from '../types';

function Tag({ label }: { label: string }) {
  return <span className="tag-chip">{label}</span>;
}

function OnChainBadge() {
  return <span className="onchain-badge">⛓ ON-CHAIN</span>;
}

interface GameCardProps {
  game: Game;
  index: number;
}

export default function GameCard({ game, index }: GameCardProps) {
  const [hov, setHov] = useState(false);

  const coverSrc = game.cover ?? `https://picsum.photos/seed/${game.dirName}/300/420`;

  return (
    <a
      href={`/${game.slug}/`}
      className={`game-card${hov ? ' hov' : ''}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div className="card-img-wrap">
        <img
          src={coverSrc}
          alt={game.name}
          className={`card-img${hov ? ' hov' : ''}`}
        />
        <div className="card-img-top">
          <span className={`card-badge badge-${index % 5}`}>{game.tags[0]}</span>
          {game.hasFrontend && <OnChainBadge />}
        </div>
        <div className="card-img-fade" />
      </div>

      <div className="card-body">
        <p className={`card-title${hov ? ' hov' : ''}`}>{game.name}</p>
        <p className="card-desc">{game.description}</p>
        <div className="card-tags">
          {game.tags.map((t, j) => <Tag key={j} label={t} />)}
        </div>
      </div>
    </a>
  );
}

export { Tag, OnChainBadge };
