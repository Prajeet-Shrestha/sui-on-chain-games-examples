import { LEVELS, COLOR_PALETTE, type LevelMeta } from '../constants';

interface Props {
  onStart: (level: number) => void;
  isPending: boolean;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Tutorial: '#39ff14',
  Easy: '#39ff14',
  Medium: '#eab308',
  Hard: '#f97316',
  Nightmare: '#ef4444',
};

export function LevelSelect({ onStart, isPending }: Props) {
  return (
    <div className="level-select">
      <div className="level-select__header">
        <span className="level-select__icon">🧬</span>
        <h2 className="level-select__title">Select Mission</h2>
        <p className="level-select__subtitle">
          Each mission is harder than the last. How far can you spread?
        </p>
      </div>
      <div className="level-grid">
        {LEVELS.map((level, i) => (
          <LevelCard
            key={level.id}
            level={level}
            index={i}
            onClick={() => onStart(level.id)}
            disabled={isPending}
          />
        ))}
      </div>
    </div>
  );
}

function LevelCard({
  level,
  index,
  onClick,
  disabled,
}: {
  level: LevelMeta;
  index: number;
  onClick: () => void;
  disabled: boolean;
}) {
  const difficulty = level.subtitle.split(' ·')[0];
  const diffColor = DIFFICULTY_COLORS[difficulty] ?? '#39ff14';
  const colorSwatches = COLOR_PALETTE.slice(0, level.colors);

  return (
    <button
      className="level-card"
      onClick={onClick}
      disabled={disabled}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Top accent bar */}
      <div className="level-card__accent" style={{ background: diffColor }} />

      <div className="level-card__body">
        {/* Header */}
        <div className="level-card__header">
          <span className="level-card__level" style={{ color: diffColor }}>
            LVL {level.id}
          </span>
          <span className="level-card__diff" style={{ color: diffColor }}>
            {difficulty}
          </span>
        </div>

        <h3 className="level-card__name">{level.name}</h3>

        {/* Grid size */}
        <div className="level-card__grid-label">
          {level.width}×{level.height} grid
          {level.viruses > 1 && ` · ${level.viruses} viruses`}
        </div>

        {/* Color swatches */}
        <div className="level-card__colors">
          {colorSwatches.map((color, i) => (
            <div
              key={i}
              className="level-card__swatch"
              style={{ background: color }}
            />
          ))}
          <span className="level-card__color-count">{level.colors} colors</span>
        </div>

        {/* Max moves — prominent */}
        <div className="level-card__moves">
          <span className="level-card__moves-num">{level.maxMoves}</span>
          <span className="level-card__moves-label">max moves</span>
        </div>
      </div>
    </button>
  );
}
