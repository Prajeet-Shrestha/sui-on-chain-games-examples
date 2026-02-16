import { useState, useMemo } from 'react';
import { useRoster } from '../hooks/useRoster';
import { useGameActions } from '../hooks/useGameActions';
import { useUIStore } from '../stores/uiStore';
import { CLASSES, CLASS_SPRITES, CLASS_PORTRAITS, ELEMENT_NAMES, ELEMENT_EMOJI, type ClassInfo } from '../constants';

/* ─── element accent colors ─── */
const ELEM_COLORS: Record<number, { accent: string; border: string; glow: string }> = {
  0: { accent: '#ff5722', border: 'rgba(255,87,34,0.4)', glow: 'rgba(255,87,34,0.15)' },
  1: { accent: '#42a5f5', border: 'rgba(66,165,245,0.4)', glow: 'rgba(66,165,245,0.15)' },
  2: { accent: '#8d6e63', border: 'rgba(141,110,99,0.4)', glow: 'rgba(141,110,99,0.15)' },
  3: { accent: '#66bb6a', border: 'rgba(102,187,106,0.4)', glow: 'rgba(102,187,106,0.15)' },
};

/* ─── unit dialogue lines (picked at random) ─── */
const UNIT_DIALOGUE: Record<number, string[]> = {
  0: [ // Soldier
    "I've held the line at Coritanae. I'll hold it for you too.",
    "My shield arm never tires. Point me at the enemy.",
    "They called me the Wall of Brigantia. You'll see why.",
    "Give me a frontline and I'll give you a victory.",
    "I don't retreat. I've forgotten how.",
  ],
  1: [ // Archer
    "I can pin a fly to a barn door at two hundred paces.",
    "The wind whispers where the arrow should fly. I listen.",
    "My quiver never empties before the enemy does.",
    "Eyes in the sky, death from afar. That's my creed.",
    "I once split my own arrow. Twice. On purpose.",
  ],
  2: [ // Mage
    "The flames answer to me. As will your enemies.",
    "I've read the Codex of Ruin cover to cover. Thrice.",
    "Reality is... negotiable, when you know the right words.",
    "They burned my tower. So I burned their kingdom.",
    "I don't cast spells. I conduct symphonies of destruction.",
  ],
  3: [ // Knight
    "My oath is iron. My resolve, unbreakable.",
    "I carry the light into darkness. Always.",
    "Honor is not a weakness. It is the only true strength.",
    "I've slain beasts that would make grown men weep.",
    "My blade sings a hymn of justice with every swing.",
  ],
  4: [ // Healer
    "I mend what war breaks. That is my purpose.",
    "The waters of life flow through my hands.",
    "I've pulled soldiers back from death's very door.",
    "Heal first, fight later. That's always been my way.",
    "Where there is still breath, there is still hope.",
  ],
  5: [ // Ninja
    "You won't see me coming. Neither will they.",
    "Every shadow is a doorway. I walk through them all.",
    "I strike twice before you blink once.",
    "Silence is my weapon. Speed, my armor.",
    "They say I'm a ghost. Ghosts don't collect gold, though.",
  ],
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ─── Recruit Modal ─── */
function RecruitModal({
  cls,
  gold,
  rosterFull,
  onRecruit,
  onClose,
  pending,
  error,
}: {
  cls: ClassInfo;
  gold: number;
  rosterFull: boolean;
  onRecruit: (name: string) => void;
  onClose: () => void;
  pending: boolean;
  error: string | null;
}) {
  const [unitName, setUnitName] = useState('');
  const canAfford = gold >= cls.cost;
  const ec = ELEM_COLORS[cls.element] || ELEM_COLORS[0];

  // Pick a random dialogue on mount
  const dialogue = useMemo(
    () => pickRandom(UNIT_DIALOGUE[cls.id] || UNIT_DIALOGUE[0]),
    [cls.id]
  );

  return (
    <div className="tavern-modal-overlay" onClick={onClose}>
      <div className="tavern-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div className="tavern-modal-header">
          <button className="tavern-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tavern-modal-body">
          {/* Left: portrait + dialogue */}
          <div className="tavern-modal-left">
            <div className="tavern-modal-portrait" style={{ borderColor: ec.border }}>
              <img
                src={CLASS_SPRITES[cls.id] || CLASS_PORTRAITS[cls.id]}
                alt={cls.name}
              />
            </div>

            {/* Dialogue bubble */}
            <div className="tavern-modal-dialogue">
              <div className="tavern-dialogue-tail" />
              <p>"{dialogue}"</p>
            </div>
          </div>

          {/* Right: details */}
          <div className="tavern-modal-right">
            <div className="tavern-modal-name">{cls.name}</div>
            <div className="tavern-modal-element" style={{ color: ec.accent }}>
              {ELEMENT_EMOJI[cls.element]} {ELEMENT_NAMES[cls.element]}
            </div>

            {/* Cost */}
            <div className="tavern-modal-cost">
              <span className="tavern-modal-cost-label">COST</span>
              <span className="tavern-modal-cost-value">{cls.cost}G</span>
            </div>

            {/* Stats */}
            <div className="tavern-modal-stats">
              <div className="tavern-modal-stat">
                <span className="tms-label" style={{ color: 'var(--red)' }}>HP</span>
                <div className="tms-track"><div className="tms-fill hp" style={{ width: `${(cls.hp / 120) * 100}%` }} /></div>
                <span className="tms-val">{cls.hp}</span>
              </div>
              <div className="tavern-modal-stat">
                <span className="tms-label" style={{ color: 'var(--elem-fire)' }}>ATK</span>
                <div className="tms-track"><div className="tms-fill atk" style={{ width: `${(cls.atk / 22) * 100}%` }} /></div>
                <span className="tms-val">{cls.atk}</span>
              </div>
              <div className="tavern-modal-stat">
                <span className="tms-label" style={{ color: 'var(--elem-water)' }}>DEF</span>
                <div className="tms-track"><div className="tms-fill def" style={{ width: `${(cls.def / 15) * 100}%` }} /></div>
                <span className="tms-val">{cls.def}</span>
              </div>
            </div>

            {/* Secondary stats */}
            <div className="tavern-modal-secondary">
              <div><span className="tms-sec-label">RNG</span> <span className="tms-sec-val">{cls.range}</span></div>
              <div><span className="tms-sec-label">SPD</span> <span className="tms-sec-val">{cls.speed}</span></div>
            </div>

            {/* Special */}
            <div className="tavern-modal-ability">
              <div className="tavern-modal-ability-header">
                <span>⚡</span>
                <span className="tavern-modal-ability-title">SPECIAL ABILITY</span>
              </div>
              <p className="tavern-modal-ability-text">{cls.special}</p>
            </div>

            {/* Recruit form */}
            {error && <p className="error" style={{ marginTop: '8px' }}>{error}</p>}
            <div className="tavern-modal-recruit">
              <input
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="Name your unit..."
                maxLength={32}
                autoFocus
              />
              <button
                className="tavern-modal-buy-btn"
                onClick={() => onRecruit(unitName)}
                disabled={pending || !canAfford || rosterFull || !unitName.trim()}
              >
                {pending
                  ? 'RECRUITING...'
                  : rosterFull
                  ? 'ROSTER FULL'
                  : canAfford
                  ? `RECRUIT — ${cls.cost}G`
                  : 'NOT ENOUGH GOLD'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Tavern Screen ─── */
export function TavernScreen() {
  const { data: roster } = useRoster();
  const { recruitUnit } = useGameActions();
  const setScreen = useUIStore((s) => s.setScreen);

  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!roster) return null;

  const rosterFull = roster.units.length >= 6;
  const selectedInfo = selectedClass !== null ? CLASSES[selectedClass] : null;

  async function handleRecruit(name: string) {
    if (selectedClass === null || !name.trim() || !roster) return;
    setPending(true);
    setError(null);
    try {
      await recruitUnit(roster.id, selectedClass, name.trim());
      setSelectedClass(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recruitment failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h2>TAVERN — RECRUIT</h2>
        <span className="gold-badge">{roster.gold}G</span>
        <span className="unit-count">{roster.units.length}/6</span>
      </div>

      {rosterFull && <p className="warning">ROSTER FULL (6/6)</p>}

      <div className="tavern-card-row">
        {CLASSES.map((cls, i) => {
          const ec = ELEM_COLORS[cls.element] || ELEM_COLORS[0];
          const tooExpensive = roster.gold < cls.cost;

          return (
            <div
              key={cls.id}
              className={`tavern-card-wrap ${tooExpensive ? 'too-expensive' : ''}`}
              onClick={() => !rosterFull && setSelectedClass(cls.id)}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div
                className="tavern-card"
                style={{
                  borderColor: ec.border,
                  boxShadow: `0 0 30px ${ec.glow}, 0 8px 32px rgba(0,0,0,0.7)`,
                }}
              >
                {/* Corner accents */}
                <div className="tavern-corner tl" /><div className="tavern-corner tr" />
                <div className="tavern-corner bl" /><div className="tavern-corner br" />

                {/* Portrait art */}
                <div className="tavern-art">
                  <img
                    src={CLASS_SPRITES[cls.id] || CLASS_PORTRAITS[cls.id]}
                    alt={cls.name}
                  />
                  <div className="tavern-art-overlay" />
                </div>

                {/* Name banner */}
                <div className="tavern-banner">
                  <span className="tavern-banner-diamond">◆</span>
                  <span className="tavern-name">{cls.name}</span>
                  <span className="tavern-banner-diamond">◆</span>
                </div>

                {/* Explicit cost tag */}
                <div className="tavern-price-tag">
                  <span className="tavern-price-label">COST:</span>
                  <span className="tavern-price-value">{cls.cost}G</span>
                </div>

                {/* Particles */}
                <div className="tavern-particles">
                  {[...Array(6)].map((_, pi) => (
                    <div
                      key={pi}
                      className="tavern-particle"
                      style={{ left: `${15 + pi * 14}%`, animationDelay: `${pi * 0.4}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recruit modal */}
      {selectedInfo && (
        <RecruitModal
          cls={selectedInfo}
          gold={roster.gold}
          rosterFull={rosterFull}
          onRecruit={handleRecruit}
          onClose={() => { setSelectedClass(null); setError(null); }}
          pending={pending}
          error={error}
        />
      )}

      <div className="screen-actions">
        <button onClick={() => setScreen('roster')}>BACK TO ROSTER</button>
      </div>
    </div>
  );
}
