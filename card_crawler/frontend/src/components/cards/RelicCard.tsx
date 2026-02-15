import './cards.css';

interface Props {
  name: string;
  effect: string;
  cost: number;
  imageUrl?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export default function RelicCard({
  name,
  effect,
  cost,
  imageUrl,
  onClick,
  disabled = false,
  className = '',
}: Props) {
  return (
    <div
      className={`card-wrap rpg-card ${className}`}
      onClick={!disabled ? onClick : undefined}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
    >
      <div className="rpg-inner">
        <div className="rpg-ribbon"><span>★ Relic ★</span></div>

        <div className="rpg-art">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1e1a16, #141210)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
              🔮
            </div>
          )}
        </div>

        <div className="rpg-header">
          <div className="rpg-item-name">{name}</div>
          <div className="rpg-item-slot">Relic</div>
        </div>

        <div className="rpg-stats">
          <div className="rpg-stat">
            <span className="rpg-stat-icon">✨</span>
            <span className="rpg-stat-text"><span className="val">{effect}</span></span>
          </div>
          <div className="rpg-stat">
            <span className="rpg-stat-icon">🪙</span>
            <span className="rpg-stat-text">Cost: <span className="val">{cost}</span> gold</span>
          </div>
        </div>

        <div className="rpg-sep" />

        <div className="rpg-abilities">
          <div className="rpg-ability">Passive: <span className="highlight">{effect}</span> while equipped.</div>
        </div>

        <div className="rpg-flavor">"A relic of immense power, sought by all adventurers."</div>
      </div>
    </div>
  );
}
