import './cards.css';

interface Props {
  name: string;
  cost: number;
  cardType: number; // 0=ATK, 1=SKILL, 2=POWER
  cardTypeName: string;
  description: string;
  value: number;
  imageUrl?: string;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
  animationDelay?: number;
  className?: string;
}

const TYPE_STYLES: Record<string, { accent: string; border: string; bg: string }> = {
  ATK: { accent: '#ff5722', border: 'rgba(255,87,34,0.35)', bg: 'linear-gradient(170deg, #1a0808, #120404, #0a0101)' },
  SKILL: { accent: '#42a5f5', border: 'rgba(66,165,245,0.35)', bg: 'linear-gradient(170deg, #081a1a, #040f12, #01080a)' },
  POWER: { accent: '#ab47bc', border: 'rgba(171,71,188,0.35)', bg: 'linear-gradient(170deg, #150820, #0c0414, #06010a)' },
};

export default function ActionCard({
  name,
  cost,
  cardType,
  cardTypeName,
  description,
  value,
  imageUrl,
  selected = false,
  compact = false,
  onClick,
  animationDelay,
  className = '',
}: Props) {
  const tc = TYPE_STYLES[cardTypeName] ?? TYPE_STYLES.ATK;
  const costClass = cardType === 1 ? 'cost-skill' : cardType === 2 ? 'cost-power' : '';

  return (
    <div
      className={`card-wrap action-card ${compact ? 'compact' : ''} ${selected ? 'selected' : ''} ${className}`}
      onClick={onClick}
      style={animationDelay !== undefined ? { animationDelay: `${animationDelay}ms` } : undefined}
    >
      <div
        className="action-inner"
        style={{
          borderColor: selected ? '#66bb6a' : tc.border,
          background: tc.bg,
          boxShadow: selected
            ? `0 0 25px rgba(102,187,106,0.3), 0 6px 24px rgba(0,0,0,0.6)`
            : `0 0 30px ${tc.border.replace('0.35', '0.1')}, 0 6px 24px rgba(0,0,0,0.6)`,
        }}
      >
        <div className="action-top">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={name}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className={`action-cost ${costClass}`}>{cost}</div>
          <div className="action-element" style={{ color: tc.accent, borderColor: tc.border }}>
            {cardTypeName}
          </div>
        </div>
        <div className="action-name" style={{ color: tc.accent }}>{name}</div>
        <div className="action-desc">{description}</div>
        <div className="action-footer">
          <span className="action-dmg-badge" style={{ color: tc.accent }}>⚡ {value}</span>
          <span className="action-type-badge">{cardTypeName}</span>
        </div>
      </div>
    </div>
  );
}
