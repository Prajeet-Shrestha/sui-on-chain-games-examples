import { useRef, useEffect, useCallback, useState } from 'react';
import { GRID_W, GRID_H, DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT } from '../constants';
import { useGameStore } from '../stores/gameStore';
import { TILE_SIZE, TILES, getTileSrc } from '../utils/tileMap';

const SCALE = 4;           // 16px × 4 = 64px per cell
const CELL_PX = TILE_SIZE * SCALE;
const CANVAS_W = GRID_W * CELL_PX;
const CANVAS_H = GRID_H * CELL_PX;

// Sprite sheet config (all 32×32 per frame)
const SPRITE_SIZE = 32;
const SPRITE_SHEETS = {
  idle:      { src: '/Pink_Monster_Idle_4.png',      frames: 4 },
  pushRight: { src: '/Pink_Monster_PushRight_6.png', frames: 6 },
  pushUp:    { src: '/Pink_Monster_PushUp_4.png',    frames: 4 },
} as const;

const ANIM_FPS = 8; // frames per second

type AnimKey = keyof typeof SPRITE_SHEETS;

export function GameBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const spriteRefs = useRef<Record<AnimKey, HTMLImageElement | null>>({
    idle: null, pushRight: null, pushUp: null,
  });
  const frameRef = useRef(0);
  const animIdRef = useRef(0);

  const getCellType = useGameStore((s) => s.getCellType);
  const isGoal = useGameStore((s) => s.isGoal);
  const levelData = useGameStore((s) => s.levelData);
  const playerPos = useGameStore((s) => s.playerPos);
  const boxPositions = useGameStore((s) => s.boxPositions);
  const moveQueue = useGameStore((s) => s.moveQueue);

  // Determine current animation based on last move direction
  const lastDir = moveQueue.length > 0 ? moveQueue[moveQueue.length - 1] : null;

  let currentAnim: AnimKey = 'idle';
  let flipX = false;

  if (lastDir === DIR_RIGHT) {
    currentAnim = 'pushRight';
    flipX = false;
  } else if (lastDir === DIR_LEFT) {
    currentAnim = 'pushRight';
    flipX = true; // mirror horizontally
  } else if (lastDir === DIR_UP) {
    currentAnim = 'pushUp';
    flipX = false;
  } else if (lastDir === DIR_DOWN) {
    currentAnim = 'pushUp';
    flipX = true; // flip vertically via rotation trick — actually just mirror Y
  }

  // Load tileset + all sprite sheets once
  useEffect(() => {
    const tileImg = new Image();
    tileImg.src = '/tileset.png';
    tileImg.onload = () => { imgRef.current = tileImg; };

    (Object.keys(SPRITE_SHEETS) as AnimKey[]).forEach((key) => {
      const sImg = new Image();
      sImg.src = SPRITE_SHEETS[key].src;
      sImg.onload = () => { spriteRefs.current[key] = sImg; };
    });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !levelData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // === Layer 1: Ground (tile 5) ===
    const { sx: gsx, sy: gsy } = getTileSrc(TILES.GROUND);
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        ctx.drawImage(img, gsx, gsy, TILE_SIZE, TILE_SIZE,
          x * CELL_PX, y * CELL_PX, CELL_PX, CELL_PX);
      }
    }

    // === Layer 2: Goals ===
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (isGoal(x, y)) {
          const { sx, sy } = getTileSrc(TILES.GOAL);
          ctx.drawImage(img, sx, sy, TILE_SIZE, TILE_SIZE,
            x * CELL_PX, y * CELL_PX, CELL_PX, CELL_PX);
        }
      }
    }

    // === Layer 3: Walls (tile 0) ===
    const { sx: wsx, sy: wsy } = getTileSrc(TILES.WALL_TOP);
    for (let i = 0; i < levelData.wallXs.length; i++) {
      const wx = levelData.wallXs[i];
      const wy = levelData.wallYs[i];
      ctx.drawImage(img, wsx, wsy, TILE_SIZE, TILE_SIZE,
        wx * CELL_PX, wy * CELL_PX, CELL_PX, CELL_PX);
    }

    // === Layer 4: Boxes ===
    boxPositions.forEach((box) => {
      const { sx, sy } = getTileSrc(TILES.BOX);
      ctx.drawImage(img, sx, sy, TILE_SIZE, TILE_SIZE,
        box.x * CELL_PX, box.y * CELL_PX, CELL_PX, CELL_PX);

      if (isGoal(box.x, box.y)) {
        ctx.fillStyle = 'rgba(74, 222, 128, 0.35)';
        ctx.fillRect(box.x * CELL_PX, box.y * CELL_PX, CELL_PX, CELL_PX);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${CELL_PX * 0.4}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓',
          box.x * CELL_PX + CELL_PX / 2,
          box.y * CELL_PX + CELL_PX / 2);
      }
    });

    // === Layer 5: Player sprite ===
    if (playerPos) {
      const spriteImg = spriteRefs.current[currentAnim];
      if (spriteImg) {
        const sheet = SPRITE_SHEETS[currentAnim];
        const frame = frameRef.current % sheet.frames;
        const srcX = frame * SPRITE_SIZE;
        const srcY = 0;

        // Destination: center the 32×32 sprite in the 64×64 cell
        // Scale sprite to fill cell
        const dx = playerPos.x * CELL_PX;
        const dy = playerPos.y * CELL_PX;

        ctx.save();

        if (flipX) {
          // Mirror horizontally around the cell center
          ctx.translate(dx + CELL_PX, dy);
          ctx.scale(-1, 1);
          ctx.drawImage(spriteImg,
            srcX, srcY, SPRITE_SIZE, SPRITE_SIZE,
            0, 0, CELL_PX, CELL_PX);
        } else {
          ctx.drawImage(spriteImg,
            srcX, srcY, SPRITE_SIZE, SPRITE_SIZE,
            dx, dy, CELL_PX, CELL_PX);
        }

        ctx.restore();
      }
    }
  }, [levelData, playerPos, boxPositions, isGoal, currentAnim, flipX]);

  // Animation loop — tick frames at ANIM_FPS
  useEffect(() => {
    frameRef.current = 0;
    let lastTime = 0;
    const interval = 1000 / ANIM_FPS;

    function tick(time: number) {
      if (time - lastTime >= interval) {
        frameRef.current++;
        lastTime = time;
        draw();
      }
      animIdRef.current = requestAnimationFrame(tick);
    }

    animIdRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animIdRef.current);
  }, [draw]);

  return (
    <div className="board">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="game-canvas"
      />
    </div>
  );
}
