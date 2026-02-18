import { useRef, useEffect, useCallback, useState } from 'react';
import type { MazeData } from '../lib/mazeData';

interface MazeCanvasProps {
    maze: MazeData;
    playerX: number;
    playerY: number;
    direction: number;
    isLoading: boolean;
}

// remove hardcoded FLASHLIGHT_RANGE

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

const playerImg = new Image();
playerImg.src = '/player.png';

const doorImg = new Image();
doorImg.src = '/door.png';

function getVisibleTiles(
    playerX: number, playerY: number, direction: number,
    maze: MazeData
): Set<string> {
    const visible = new Set<string>();
    const range = maze.viewRadius || 5;

    // Always visible around player (3x3)
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const vx = playerX + dx;
            const vy = playerY + dy;
            if (vx >= 0 && vx < maze.width && vy >= 0 && vy < maze.height) {
                visible.add(`${vx},${vy}`);
            }
        }
    }

    const fdx = DX[direction];
    const fdy = DY[direction];
    const perpDx = fdy;
    const perpDy = -fdx;

    // Cone of vision
    for (let depth = 1; depth <= range; depth++) {
        const baseX = playerX + fdx * depth;
        const baseY = playerY + fdy * depth;
        const spread = Math.min(depth, Math.ceil(range * 0.6));

        for (let s = -spread; s <= spread; s++) {
            const vx = baseX + perpDx * s;
            const vy = baseY + perpDy * s;
            if (vx >= 0 && vx < maze.width && vy >= 0 && vy < maze.height) {
                visible.add(`${vx},${vy}`);
            }
        }

        // Line of sight check (simple)
        if (baseX >= 0 && baseX < maze.width && baseY >= 0 && baseY < maze.height) {
            if (maze.walls[baseY][baseX] === 1) break;
        } else {
            break;
        }
    }

    return visible;
}

export default function MazeCanvas({ maze, playerX, playerY, direction, isLoading }: MazeCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

    // Track container size with ResizeObserver
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setContainerSize({ w: width, h: height });
            }
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const availW = containerSize.w;
        const availH = containerSize.h;
        if (availW < 10 || availH < 10) return;

        // Compute tile size to fill area
        const tileSize = Math.max(4, Math.floor(Math.min(
            availW / maze.width,
            availH / maze.height
        )));

        const w = maze.width * tileSize;
        const h = maze.height * tileSize;
        const range = maze.viewRadius || 5;

        canvas.width = w;
        canvas.height = h;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;

        // Clear - Darker Void
        ctx.fillStyle = '#020205';
        ctx.fillRect(0, 0, w, h);

        const visibleTiles = getVisibleTiles(playerX, playerY, direction, maze);

        // Draw tiles
        for (let y = 0; y < maze.height; y++) {
            for (let x = 0; x < maze.width; x++) {
                const px = x * tileSize;
                const py = y * tileSize;
                const isVisible = visibleTiles.has(`${x},${y}`);
                const isWall = maze.walls[y][x] === 1;
                const isStart = x === maze.startX && y === maze.startY;
                const isExit = x === maze.exitX && y === maze.exitY;

                if (!isVisible) {
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(px, py, tileSize, tileSize);
                    continue;
                }

                const dist = Math.sqrt((x - playerX) ** 2 + (y - playerY) ** 2);
                // Falloff based on viewRadius
                const brightness = Math.max(0.1, 1 - dist / (range + 1));

                if (isWall) {
                    // Neon Walls
                    const r = Math.floor(0 * brightness);
                    const g = Math.floor(200 * brightness);
                    const b = Math.floor(255 * brightness);

                    // Main block
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;
                    ctx.fillRect(px, py, tileSize, tileSize);

                    // Glowing border
                    ctx.strokeStyle = `rgba(0, 243, 255, ${brightness * 0.8})`;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);

                    // Inner detail
                    ctx.fillStyle = `rgba(0, 243, 255, ${brightness * 0.3})`;
                    ctx.fillRect(px + tileSize * 0.25, py + tileSize * 0.25, tileSize * 0.5, tileSize * 0.5);

                } else {
                    // Floor - dark blue grid
                    const r = Math.floor(10 * brightness);
                    const g = Math.floor(10 * brightness);
                    const b = Math.floor(30 * brightness);
                    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    ctx.fillRect(px, py, tileSize, tileSize);

                    // Grid dot
                    ctx.fillStyle = `rgba(40, 60, 100, ${brightness * 0.5})`;
                    ctx.fillRect(px + tileSize / 2 - 1, py + tileSize / 2 - 1, 2, 2);
                }

                if (isStart) {
                    ctx.fillStyle = `rgba(80, 255, 120, ${brightness * 0.5})`;
                    ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
                }

                if (isExit) {
                    ctx.save();
                    const gradient = ctx.createRadialGradient(
                        px + tileSize / 2, py + tileSize / 2, 2,
                        px + tileSize / 2, py + tileSize / 2, tileSize * 0.9
                    );
                    gradient.addColorStop(0, `rgba(255, 215, 0, ${brightness * 0.8})`);
                    gradient.addColorStop(0.6, `rgba(255, 100, 0, ${brightness * 0.4})`);
                    gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
                    ctx.fillStyle = gradient;
                    ctx.fillRect(px - 4, py - 4, tileSize + 8, tileSize + 8);

                    if (doorImg.complete && doorImg.naturalWidth > 0) {
                        ctx.globalAlpha = brightness;
                        const pad = 2;
                        ctx.drawImage(doorImg, px + pad, py + pad, tileSize - pad * 2, tileSize - pad * 2);
                        ctx.globalAlpha = 1;
                    } else {
                        ctx.fillStyle = `rgba(255, 215, 0, ${brightness})`;
                        ctx.font = `${tileSize * 0.6}px serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('🚪', px + tileSize / 2, py + tileSize / 2);
                    }
                    ctx.restore();
                }
            }
        }

        // Flashlight beam (Dynamic range)
        const ppx = playerX * tileSize + tileSize / 2;
        const ppy = playerY * tileSize + tileSize / 2;
        const beamDx = DX[direction];
        const beamDy = DY[direction];

        const beamGradient = ctx.createLinearGradient(
            ppx, ppy,
            ppx + beamDx * tileSize * range,
            ppy + beamDy * tileSize * range
        );
        beamGradient.addColorStop(0, 'rgba(0, 243, 255, 0.15)'); // Cyan beam
        beamGradient.addColorStop(0.5, 'rgba(0, 243, 255, 0.05)');
        beamGradient.addColorStop(1, 'rgba(0, 243, 255, 0)');

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = beamGradient;

        const beamAngle = Math.atan2(beamDy, beamDx);
        const spreadAngle = Math.PI / 4;
        const beamLength = tileSize * range;

        ctx.beginPath();
        ctx.moveTo(ppx, ppy);
        ctx.lineTo(ppx + Math.cos(beamAngle - spreadAngle) * beamLength, ppy + Math.sin(beamAngle - spreadAngle) * beamLength);
        ctx.lineTo(ppx + Math.cos(beamAngle + spreadAngle) * beamLength, ppy + Math.sin(beamAngle + spreadAngle) * beamLength);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Player glow
        const playerGlow = ctx.createRadialGradient(ppx, ppy, 2, ppx, ppy, tileSize * 0.9);
        playerGlow.addColorStop(0, 'rgba(0, 255, 255, 0.6)');
        playerGlow.addColorStop(0.4, 'rgba(0, 100, 255, 0.2)');
        playerGlow.addColorStop(1, 'rgba(0, 0, 255, 0)');
        ctx.fillStyle = playerGlow;
        ctx.fillRect(ppx - tileSize, ppy - tileSize, tileSize * 2, tileSize * 2);

        // Player sprite
        if (playerImg.complete && playerImg.naturalWidth > 0) {
            ctx.save();
            ctx.translate(ppx, ppy);
            const rotations = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
            ctx.rotate(rotations[direction]);
            const size = tileSize * 0.9;
            ctx.drawImage(playerImg, -size / 2, -size / 2, size, size);
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(ppx, ppy, tileSize * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = '#00f3ff';
            ctx.fill();
        }

        if (isLoading) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, w, h);
        }
    }, [maze, playerX, playerY, direction, isLoading, containerSize]);

    // Redraw on image load
    useEffect(() => {
        const onLoad = () => draw();
        playerImg.addEventListener('load', onLoad);
        doorImg.addEventListener('load', onLoad);
        return () => {
            playerImg.removeEventListener('load', onLoad);
            doorImg.removeEventListener('load', onLoad);
        };
    }, [draw]);

    // Redraw on state change
    useEffect(() => { draw(); }, [draw]);

    return (
        <div className="maze-canvas-container" ref={containerRef}>
            <canvas
                ref={canvasRef}
                className="maze-canvas"
            />
        </div>
    );
}
