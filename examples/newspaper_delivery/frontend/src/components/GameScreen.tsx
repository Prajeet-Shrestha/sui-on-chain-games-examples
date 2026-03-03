import { useRef, useEffect } from 'react';
import {
    createInitialState,
    resetForLevel,
    throwNewspaper,
    update,
    render,
    LEVELS,
} from '../lib/deliveryEngine';
import type { DeliveryState, DeliveryRecord } from '../lib/deliveryEngine';
import { useGameStore } from '../stores/gameStore';

interface GameScreenProps {
    initialLevel: number;
    onGameOver: (state: DeliveryState) => void;
    onDeliveryMade: (record: DeliveryRecord) => void;
    onLevelComplete: (level: number) => Promise<void>;
}

export default function GameScreen({ initialLevel, onGameOver, onDeliveryMade, onLevelComplete }: GameScreenProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef<DeliveryState | null>(null);
    const rafRef = useRef<number>(0);
    const gameOverRef = useRef(false);
    const countdownRef = useRef(true);
    const deliveryIdxRef = useRef(0);
    const flushingRef = useRef(false);

    // ── Store callbacks as refs so the effect never re-runs ──
    const cbGameOver = useRef(onGameOver);
    const cbDelivery = useRef(onDeliveryMade);
    const cbLevel = useRef(onLevelComplete);
    cbGameOver.current = onGameOver;
    cbDelivery.current = onDeliveryMade;
    cbLevel.current = onLevelComplete;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        if (!ctx) return;

        const timers: ReturnType<typeof setTimeout>[] = [];

        // ── Sizing ──
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            if (stateRef.current) {
                stateRef.current.canvasWidth = canvas.width;
                stateRef.current.canvasHeight = canvas.height;
            }
        };
        resize();
        window.addEventListener('resize', resize);

        // ── Init state ──
        // Use custom initial level
        stateRef.current = createInitialState(canvas.width, canvas.height, initialLevel);
        gameOverRef.current = false;
        countdownRef.current = true;
        deliveryIdxRef.current = 0;
        flushingRef.current = false;

        // ── Input ──
        function handleInput() {
            const s = stateRef.current;
            if (!s) return;

            if (s.levelPhase === 'levelComplete' && !flushingRef.current) {
                advanceLevel();
                return;
            }

            if (s.levelPhase === 'playing' && !countdownRef.current) {
                throwNewspaper(s);
            }
        }

        const onKey = (e: KeyboardEvent) => {
            if (e.code !== 'Space') return;
            e.preventDefault();
            e.stopPropagation();
            handleInput();
        };
        const onClick = () => handleInput();
        const onTouch = (e: TouchEvent) => { e.preventDefault(); handleInput(); };

        window.addEventListener('keydown', onKey);
        canvas.addEventListener('click', onClick);
        canvas.addEventListener('touchstart', onTouch, { passive: false });

        // ── Countdown ──
        function showCountdown(text: string, sub?: string) {
            const s = stateRef.current;
            if (!s) return;
            render(ctx, s);
            const cw = s.canvasWidth;
            const ch = s.canvasHeight;

            ctx.fillStyle = 'rgba(10, 14, 39, 0.65)';
            ctx.fillRect(0, 0, cw, ch);
            ctx.save();
            ctx.font = `${Math.min(cw * 0.1, 80)}px "Press Start 2P", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#ff6b35';
            ctx.shadowBlur = 50;
            ctx.fillStyle = '#ff6b35';
            ctx.fillText(text, cw / 2, ch / 2 - 20);
            ctx.shadowBlur = 0;
            if (sub) {
                ctx.font = `${Math.min(cw * 0.015, 14)}px "Press Start 2P", monospace`;
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.fillText(sub, cw / 2, ch / 2 + 50);
            }
            ctx.restore();
        }

        function startCountdown(label: string, onDone: () => void) {
            countdownRef.current = true;
            showCountdown('3', label);
            timers.push(setTimeout(() => showCountdown('2'), 1000));
            timers.push(setTimeout(() => showCountdown('1'), 2000));
            timers.push(setTimeout(() => showCountdown('GO!', 'SPACE TO THROW'), 3000));
            timers.push(setTimeout(() => { countdownRef.current = false; onDone(); }, 3500));
        }

        // ── Level advance ──
        async function advanceLevel() {
            const s = stateRef.current;
            if (!s || flushingRef.current) return;
            flushingRef.current = true;

            // Stop any running loop
            cancelAnimationFrame(rafRef.current);

            // Persist level score
            useGameStore.getState().setLevelScore(s.currentLevel, s.levelScore);

            try {
                await cbLevel.current(s.currentLevel);
            } catch (e) {
                console.error('[level] Flush error, continuing:', e);
            }

            const next = s.currentLevel + 1;
            resetForLevel(s, next);
            deliveryIdxRef.current = s.deliveryLog.length;
            flushingRef.current = false;

            startCountdown(`LV.${next + 1} — ${LEVELS[next].name}`, () => {
                rafRef.current = requestAnimationFrame(mainLoop);
            });
        }

        // ── Main game loop ──
        function mainLoop() {
            const s = stateRef.current;
            if (!s) return;

            update(s);
            render(ctx, s);

            // Report new deliveries to buffer
            while (deliveryIdxRef.current < s.deliveryLog.length) {
                cbDelivery.current(s.deliveryLog[deliveryIdxRef.current]);
                deliveryIdxRef.current++;
            }

            // Level complete — switch to idle rendering
            if (s.levelPhase === 'levelComplete') {
                rafRef.current = requestAnimationFrame(levelIdleLoop);
                return;
            }

            // All levels done
            if (s.isGameOver && !gameOverRef.current) {
                gameOverRef.current = true;
                // Persist final level score
                useGameStore.getState().setLevelScore(s.currentLevel, s.levelScore);
                timers.push(setTimeout(() => cbGameOver.current({ ...s }), 800));
                return;
            }

            if (!s.isGameOver && s.levelPhase === 'playing') {
                rafRef.current = requestAnimationFrame(mainLoop);
            }
        }

        // Separate idle loop for level-complete overlay
        function levelIdleLoop() {
            const s = stateRef.current;
            if (!s || s.levelPhase !== 'levelComplete') return;

            // Decrement timer so the overlay fades in
            if (s.levelCompleteTimer > 0) s.levelCompleteTimer--;

            render(ctx, s);
            rafRef.current = requestAnimationFrame(levelIdleLoop);
        }

        // ── Start level 1 ──
        startCountdown(`LV.1 — ${LEVELS[0].name}`, () => {
            rafRef.current = requestAnimationFrame(mainLoop);
        });

        // ── Cleanup ──
        return () => {
            for (const t of timers) clearTimeout(t);
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('click', onClick);
            canvas.removeEventListener('touchstart', onTouch);
        };
    }, []); // ← Empty deps! Callbacks via refs.

    return (
        <div className="game-screen-fullscreen">
            <canvas ref={canvasRef} className="game-canvas-fullscreen" />
        </div>
    );
}
