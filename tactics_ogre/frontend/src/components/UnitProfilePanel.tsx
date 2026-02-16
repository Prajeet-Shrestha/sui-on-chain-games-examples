import { useState, useMemo } from 'react';
import { CLASSES, CLASS_PORTRAITS, CLASS_SPRITES, ELEMENT_EMOJI, ELEMENT_NAMES } from '../constants';
import type { UnitState } from '../lib/types';

/* ─── Personality lines grouped by class — immersive idle chatter ─── */
const UNIT_CHATTER: Record<number, string[]> = {
  0: [ // Soldier
    "Standing guard, commander. Nothing gets past me.",
    "I sharpened my blade twice this morning. Old habits.",
    "The front line is where I belong. Don't worry about me.",
    "I had a dream about peace last night. Woke up swinging.",
    "Tell me where to stand. I'll do the rest.",
    "My shield's dented, but it still holds. Like me.",
  ],
  1: [ // Archer
    "I count arrows before bed. A strange comfort.",
    "The wind shifted east today. Good for long shots.",
    "I see farther than most. It's a gift... and a burden.",
    "One arrow, one kill. That's the promise I keep.",
    "Sometimes I shoot stars for practice. Missed once.",
    "My hands are steady. My aim, steadier.",
  ],
  2: [ // Mage
    "The arcane flows thick today. Can you feel it?",
    "I've been reading a tome older than this kingdom.",
    "Fire answers when I call. It always has.",
    "Knowledge isn't power. Knowing when to use it is.",
    "My tower fell, but my mind stands taller than ever.",
    "They fear what they don't understand. Good.",
  ],
  3: [ // Knight
    "My oath binds me. My honor drives me.",
    "I polish my armor not for vanity, but for discipline.",
    "Justice doesn't rest. Neither do I.",
    "I carry the banner of those who cannot fight.",
    "A true knight defends, even when the odds are grim.",
    "They call me foolish for my code. I call it strength.",
  ],
  4: [ // Healer
    "Rest well tonight. I'll watch over everyone.",
    "My herbs are fresh. The tea should help your nerves.",
    "Every wound tells a story. I memorize them all.",
    "Life is fragile, commander. That's why I'm here.",
    "I once revived a soldier three breaths past death.",
    "The light within me shines for those who need it most.",
  ],
  5: [ // Ninja
    "You almost didn't see me there. Good.",
    "I've mapped every shadow in this camp. Just in case.",
    "Silence is underrated. Most don't even try.",
    "I move twice before they blink. It's not bragging if it's true.",
    "The night is my domain. The day? Also mine.",
    "I left a gift on the enemy captain's pillow. A warning.",
  ],
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface Props {
  unit: UnitState;
  onClose: () => void;
  onSell?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  canSell?: boolean;
  pending?: boolean;
}

export function UnitProfilePanel({ unit, onClose, onSell, onRename, canSell = true, pending = false }: Props) {
  const classInfo = CLASSES[unit.class];
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(unit.name || '');

  const dialogue = useMemo(
    () => pickRandom(UNIT_CHATTER[unit.class] || UNIT_CHATTER[0]),
    [unit.class, unit.id]
  );

  function handleRename() {
    if (onRename && newName.trim()) {
      onRename(unit.id, newName.trim());
      setRenaming(false);
    }
  }

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-panel" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="profile-close-btn" onClick={onClose}>✕</button>

        {/* Hero section: large portrait + identity */}
        <div className="profile-hero">
          <div className="profile-portrait-container">
            <div className="profile-portrait">
              <img
                src={CLASS_SPRITES[unit.class] || CLASS_PORTRAITS[unit.class]}
                alt={classInfo?.name}
              />
            </div>
          </div>

          <div className="profile-identity">
            <span className="profile-serial">No. {unit.id.slice(2, 6).toUpperCase()}</span>
            <h2 className="profile-unit-name">{unit.name || classInfo?.name}</h2>
            <div className="profile-class-badge">
              <span className="profile-class-label">{classInfo?.name}</span>
              <span className="profile-class-sep">·</span>
              <span className="profile-element-label">
                {ELEMENT_EMOJI[unit.element]} {ELEMENT_NAMES[unit.element]}
              </span>
            </div>

            {/* HP + AP bars */}
            <div className="profile-bars" style={{marginTop:'26px'}}>
              <div className="profile-bar-row">
                <span className="profile-bar-label" style={{ color: 'var(--red)' }}>HP</span>
                <div className="profile-bar-track">
                  <div className="profile-bar-fill hp" style={{ width: `${(unit.hp.current / unit.hp.max) * 100}%` }} />
                </div>
                <span className="profile-bar-val">{unit.hp.current}/{unit.hp.max}</span>
              </div>
              <div className="profile-bar-row">
                <span className="profile-bar-label" style={{ color: 'var(--mp-blue)' }}>AP</span>
                <div className="profile-bar-track">
                  <div className="profile-bar-fill mp" style={{ width: `${(unit.ap.current / unit.ap.max) * 100}%` }} />
                </div>
                <span className="profile-bar-val">{unit.ap.current}/{unit.ap.max}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dialogue bubble */}
        <div className="profile-dialogue">
          <span className="profile-dialogue-quote">"</span>
          <p>{dialogue}</p>
          <span className="profile-dialogue-quote end">"</span>
        </div>

        {/* Stats grid */}
        <div className="profile-stats-section">
          {/* Stat badges */}
          <div className="profile-stat-badges">
            <div className="profile-stat-badge">
              <span className="psb-label" style={{ color: 'var(--elem-fire)' }}>STR</span>
              <span className="psb-value">{unit.atk}</span>
            </div>
            <div className="profile-stat-badge">
              <span className="psb-label" style={{ color: 'var(--elem-water)' }}>DEF</span>
              <span className="psb-value">{unit.def}</span>
            </div>
            <div className="profile-stat-badge">
              <span className="psb-label" style={{ color: 'var(--elem-wind)' }}>SPD</span>
              <span className="psb-value">{unit.speed}</span>
            </div>
            <div className="profile-stat-badge">
              <span className="psb-label" style={{ color: 'var(--elem-earth)' }}>RNG</span>
              <span className="psb-value">{unit.range}</span>
            </div>
            <div className="profile-stat-badge">
              <span className="psb-label" style={{ color: 'var(--text-gold)' }}>MOV</span>
              <span className="psb-value">{unit.speed}</span>
            </div>
          </div>
        </div>

        {/* Talent */}
        <div className="profile-talent-section">
          <div className="profile-talent-header">
            <span className="profile-talent-icon">⚡</span>
            <span className="profile-talent-title">TALENT</span>
          </div>
          <div className="profile-talent-info">
            <span className="profile-talent-name">{classInfo?.special?.split('(')[0]?.trim()}</span>
            <span className="profile-talent-cost">{unit.ap.max} AP</span>
          </div>
          <p className="profile-talent-desc">{classInfo?.special}</p>
        </div>

        {/* Actions */}
        {(onSell || onRename) && (
          <div className="profile-actions">
            {renaming ? (
              <div className="profile-rename-form">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New name..."
                  maxLength={32}
                  autoFocus
                />
                <button className="profile-action-btn" onClick={handleRename} disabled={pending}>OK</button>
                <button className="profile-action-btn" onClick={() => setRenaming(false)}>✕</button>
              </div>
            ) : (
              <div className="profile-action-row">
                {onRename && (
                  <button
                    className="profile-action-btn"
                    onClick={() => { setRenaming(true); setNewName(unit.name || ''); }}
                  >
                    RENAME
                  </button>
                )}
                {onSell && (
                  <button
                    className="profile-action-btn danger"
                    onClick={() => onSell(unit.id)}
                    disabled={pending || !canSell}
                  >
                    SELL ({Math.floor((classInfo?.cost ?? 0) / 2)}G)
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
