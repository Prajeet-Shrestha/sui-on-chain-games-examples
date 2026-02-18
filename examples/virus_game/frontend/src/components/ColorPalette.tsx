import { COLOR_PALETTE } from '../constants';

interface Props {
  numColors: number;
  currentVirusColor: number;
  onChoose: (color: number) => void;
  disabled: boolean;
}

export function ColorPalette({ numColors, currentVirusColor, onChoose, disabled }: Props) {
  return (
    <div className="color-sidebar">
      <div className="color-sidebar__label">COLORS</div>
      <div className="color-sidebar__list">
        {Array.from({ length: numColors }, (_, i) => (
          <button
            key={i}
            className={`color-btn ${i === currentVirusColor ? 'color-btn--current' : ''}`}
            style={{ backgroundColor: COLOR_PALETTE[i] }}
            onClick={() => onChoose(i)}
            disabled={disabled || i === currentVirusColor}
            title={i === currentVirusColor ? 'Current color' : `Choose color ${i}`}
          >
            {i === currentVirusColor && <span className="color-btn__check">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
