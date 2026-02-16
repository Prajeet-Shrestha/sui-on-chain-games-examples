import './cards.css';

interface Props {
  name: string;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  gold: number;
  block?: number;
  atkBonus?: number;
  defBonus?: number;
  imageUrl?: string;
  compact?: boolean;
  className?: string;
}

function Particles({ color = '#ff4500' }: { color?: string }) {
  return (
    <div className="particles">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="particle" style={{ background: color }} />
      ))}
    </div>
  );
}

export default function HeroCard({
  name,
  hp,
  maxHp,
  energy,
  maxEnergy,
  gold,
  block = 0,
  atkBonus = 0,
  defBonus = 0,
  imageUrl,
  compact = false,
  className = '',
}: Props) {
  const hpPct = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0;
  const ePct = maxEnergy > 0 ? Math.round((energy / maxEnergy) * 100) : 0;

  return (
    <div className={`card-wrap hero-card ${compact ? 'compact' : ''} ${className}`}>
      <div className="hero-inner">
        <div className="hero-bg-art">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={name}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>

        <div className="hero-class-badge">Adventurer</div>
        <div className="hero-portrait-ring" />
        <div className="hero-portrait-wrap">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a0808, #100505)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
              🗡️
            </div>
          )}
        </div>

        <div className="hero-info">
          <div className="hero-name">{name}</div>
          <div className="hero-title">Card Crawler Hero</div>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <div className="val">{hp}</div>
            <div className="lbl">HP</div>
          </div>
          <div className="hero-stat">
            <div className="val">{energy}</div>
            <div className="lbl">NRG</div>
          </div>
          <div className="hero-stat">
            <div className="val">{gold}</div>
            <div className="lbl">GOLD</div>
          </div>
        </div>

        {/* Bonus badges */}
        {(block > 0 || atkBonus > 0 || defBonus > 0) && (
          <div className="hero-bonuses">
            {block > 0 && <span className="hero-bonus block">🛡️ {block} BLK</span>}
            {atkBonus > 0 && <span className="hero-bonus atk">⚔️ +{atkBonus} ATK</span>}
            {defBonus > 0 && <span className="hero-bonus def">🛡️ +{defBonus} DEF</span>}
          </div>
        )}

        <div className="hero-bars">
          <div className="hero-bar-row">
            <span className="hero-bar-label">HP</span>
            <div className="hero-bar-track">
              <div className="hero-bar-fill hp" style={{ width: `${hpPct}%` }} />
            </div>
            <span className="hero-bar-val">{hp} / {maxHp}</span>
          </div>
          <div className="hero-bar-row">
            <span className="hero-bar-label">NRG</span>
            <div className="hero-bar-track">
              <div className="hero-bar-fill energy" style={{ width: `${ePct}%` }} />
            </div>
            <span className="hero-bar-val">{energy} / {maxEnergy}</span>
          </div>
        </div>

        <Particles />
      </div>
    </div>
  );
}
