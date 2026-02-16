import './cards.css';

interface Props {
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  nodeType?: string; // combat | elite | boss
  floor?: number;
  imageUrl?: string;
  poisonStacks?: number;
  weakenStacks?: number;
  weakenTurns?: number;
  className?: string;
}

const NODE_COLORS: Record<string, { border: string; glow: string; mana: string }> = {
  combat: { border: 'rgba(212,168,69,0.25)', glow: 'rgba(212,168,69,0.08)', mana: '' },
  elite: { border: 'rgba(163,53,238,0.4)', glow: 'rgba(163,53,238,0.12)', mana: 'radial-gradient(circle at 35% 30%, #ce93d8, #7b1fa2, #4a148c)' },
  boss: { border: 'rgba(255,69,0,0.5)', glow: 'rgba(255,69,0,0.15)', mana: 'radial-gradient(circle at 35% 30%, #ff8a65, #e64a19, #bf360c)' },
};

function Particles({ color = '#f0d060' }: { color?: string }) {
  return (
    <div className="particles">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="particle" style={{ background: color }} />
      ))}
    </div>
  );
}

export default function EnemyCard({
  name,
  hp,
  maxHp,
  atk,
  nodeType = 'combat',
  floor = 1,
  imageUrl,
  poisonStacks = 0,
  weakenStacks = 0,
  weakenTurns = 0,
  className = '',
}: Props) {
  const nc = NODE_COLORS[nodeType] ?? NODE_COLORS.combat;
  const typeLabel = nodeType.charAt(0).toUpperCase() + nodeType.slice(1);

  // HP percentage for visual indicator
  const hpPct = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0;

  return (
    <div className={`card-wrap hs-card ${className}`}>
      <div
        className="hs-inner"
        style={{
          borderColor: nc.border,
          boxShadow: `0 0 40px ${nc.glow}, 0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,200,100,0.08)`,
        }}
      >
        <div className="hs-frame">
          <div className="hs-corner tl" /><div className="hs-corner tr" />
          <div className="hs-corner bl" /><div className="hs-corner br" />
        </div>

        <div className="hs-mana">
          <div className="hs-mana-gem" style={nc.mana ? { background: nc.mana } : undefined}>
            <span className="hs-mana-num">{floor}</span>
          </div>
        </div>

        {/* Status effect badges */}
        {(poisonStacks > 0 || weakenStacks > 0) && (
          <div className="hs-status-row">
            {poisonStacks > 0 && (
              <span className="hs-status-badge poison">☠️ {poisonStacks}</span>
            )}
            {weakenStacks > 0 && (
              <span className="hs-status-badge weaken">🔻 -{weakenStacks} ({weakenTurns}t)</span>
            )}
          </div>
        )}

        <div className="hs-art">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #2e2418, #1c1610)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
              👾
            </div>
          )}
        </div>

        <div className="hs-banner">
          <div className="hs-card-name">{name}</div>
        </div>

        <div className="hs-type-line">{typeLabel} — Floor {floor}</div>

        {/* HP bar below type line */}
        <div style={{ margin: '4px 16px 0', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{
            width: `${hpPct}%`,
            height: '100%',
            borderRadius: '2px',
            background: hpPct > 50 ? 'linear-gradient(90deg, #8b0000, #cc2200)' : hpPct > 25 ? '#ff6b00' : '#ff0000',
            transition: 'width 0.5s ease',
            boxShadow: `0 0 6px ${hpPct > 50 ? 'rgba(204,34,0,0.3)' : 'rgba(255,0,0,0.4)'}`,
          }} />
        </div>

        {/* ATK badge */}
        <div className="hs-atk">
          <div className="hs-atk-bg" />
          <span className="hs-atk-icon">⚔️</span>
          <span className="hs-atk-num">{atk}</span>
        </div>

        {/* HP badge */}
        <div className="hs-hp">
          <div className="hs-hp-bg" />
          <span className="hs-hp-num">{hp}</span>
        </div>

        <Particles />
      </div>
    </div>
  );
}
