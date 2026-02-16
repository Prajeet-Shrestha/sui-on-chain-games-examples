import { useEffect, useState } from 'react';

interface Props {
  value: number;
  type: 'damage' | 'heal' | 'block';
  onComplete?: () => void;
}

/**
 * Floating damage/heal number that animates up and fades out.
 * Auto-removes after animation completes (~800ms).
 */
export default function DamageNumber({ value, type, onComplete }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  const color = type === 'damage' ? '#ff4500' : type === 'heal' ? '#66bb6a' : '#74b9ff';
  const prefix = type === 'damage' ? '-' : '+';
  const suffix = type === 'block' ? ' BLK' : type === 'heal' ? ' HP' : '';

  return (
    <span
      style={{
        position: 'absolute',
        top: '30%',
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: "'Cinzel', serif",
        fontWeight: 900,
        fontSize: '1.5rem',
        color,
        textShadow: `0 0 10px ${color}, 0 2px 4px rgba(0,0,0,0.7)`,
        pointerEvents: 'none',
        zIndex: 100,
        animation: 'floatUp 0.8s ease forwards',
      }}
    >
      {prefix}{value}{suffix}
    </span>
  );
}
