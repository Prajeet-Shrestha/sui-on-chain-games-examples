import { useRef, useEffect, useCallback } from 'react';
import {
    createInitialState,
    flap,
    update,
    render,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
} from '../lib/flappyEngine';
import type { FlappyState } from '../lib/flappyEngine';

interface GameScreenProps {
    onGameOver: (state: FlappyState) => void;
}

export default function GameScreen({ onGameOver }: GameScreenProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef<FlappyState>(createInitialState());
    const animFrameRef = useRef<number>(0);
    const gameOverFiredRef = useRef(false);
    const countdownActiveRef = useRef(true);

    const handleFlap = useCallback(() => {
        if (countdownActiveRef.current) return; // ignore input during countdown
        flap(stateRef.current);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Reset state
        stateRef.current = createInitialState();
        gameOverFiredRef.current = false;
        countdownActiveRef.current = true;

        // Input handlers
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                handleFlap();
            }
        };

        const handleClick = () => handleFlap();
        const handleTouch = (e: TouchEvent) => {
            e.preventDefault();
            handleFlap();
        };

        window.addEventListener('keydown', handleKeyDown);
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('touchstart', handleTouch, { passive: false });

        // ─── Countdown renderer ───
        function drawCountdown(text: string, subtext?: string) {
            if (!ctx) return;
            const state = stateRef.current;
            render(ctx, state); // draw the scene behind

            // Darken overlay
            ctx.fillStyle = 'rgba(10, 14, 39, 0.6)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Big number
            ctx.save();
            ctx.font = '80px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 40;
            ctx.fillStyle = '#00e5ff';
            ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
            ctx.shadowBlur = 0;

            // Subtext
            if (subtext) {
                ctx.font = '14px "Press Start 2P", monospace';
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.fillText(subtext, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
            }
            ctx.restore();
        }

        // Run countdown: 3 → 2 → 1 → GO!
        drawCountdown('3', 'GET READY');

        const t1 = setTimeout(() => drawCountdown('2'), 1000);
        const t2 = setTimeout(() => drawCountdown('1'), 2000);
        const t3 = setTimeout(() => drawCountdown('GO!'), 3000);
        const t4 = setTimeout(() => {
            countdownActiveRef.current = false;
            animFrameRef.current = requestAnimationFrame(gameLoop);
        }, 3500);

        // ─── Game loop ───
        const gameLoop = () => {
            const state = stateRef.current;

            update(state);
            render(ctx, state);

            if (state.isGameOver && !gameOverFiredRef.current) {
                gameOverFiredRef.current = true;
                // Small delay so player sees the crash
                setTimeout(() => {
                    onGameOver({ ...state });
                }, 600);
                return;
            }

            if (!state.isGameOver) {
                animFrameRef.current = requestAnimationFrame(gameLoop);
            }
        };

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
            cancelAnimationFrame(animFrameRef.current);
            window.removeEventListener('keydown', handleKeyDown);
            canvas.removeEventListener('click', handleClick);
            canvas.removeEventListener('touchstart', handleTouch);
        };
    }, [handleFlap, onGameOver]);

    return (
        <div className="game-screen">
            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="game-canvas"
            />
        </div>
    );
}
