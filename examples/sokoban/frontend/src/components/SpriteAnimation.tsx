import { useRef, useEffect } from 'react';

interface Props {
  src: string;
  frameCount: number;
  frameWidth?: number;
  frameHeight?: number;
  fps?: number;
  scale?: number;
  className?: string;
}

/**
 * Renders an animated sprite from a horizontal sprite sheet on a canvas.
 */
export function SpriteAnimation({
  src,
  frameCount,
  frameWidth = 32,
  frameHeight = 32,
  fps = 8,
  scale = 4,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = src;

    let frame = 0;
    let animId = 0;
    let lastTime = 0;
    const interval = 1000 / fps;

    function tick(time: number) {
      if (time - lastTime >= interval) {
        frame = (frame + 1) % frameCount;
        lastTime = time;

        ctx!.imageSmoothingEnabled = false;
        ctx!.clearRect(0, 0, frameWidth * scale, frameHeight * scale);
        ctx!.drawImage(
          img,
          frame * frameWidth, 0, frameWidth, frameHeight,
          0, 0, frameWidth * scale, frameHeight * scale,
        );
      }
      animId = requestAnimationFrame(tick);
    }

    img.onload = () => {
      animId = requestAnimationFrame(tick);
    };

    return () => cancelAnimationFrame(animId);
  }, [src, frameCount, frameWidth, frameHeight, fps, scale]);

  return (
    <canvas
      ref={canvasRef}
      width={frameWidth * scale}
      height={frameHeight * scale}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
