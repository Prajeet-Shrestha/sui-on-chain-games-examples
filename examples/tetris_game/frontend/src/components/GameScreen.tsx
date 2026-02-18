import { useRef, useEffect, useCallback, useState } from 'react';
import {
    createInitialState,
    moveLeft,
    moveRight,
    softDrop,
    hardDrop,
    rotate,
    holdPiece as holdPieceFn,
    tick,
    getGhostRow,
    getShape,
    togglePause,
    BOARD_W,
    BOARD_H,
    COLORS,
    PIECES,
    type TetrisState,
    type LockResult,
} from '../lib/tetrisEngine';
import { CELL_SIZE, SIGN_THRESHOLD } from '../constants';
import { useGameStore } from '../stores/gameStore';
import type { PieceRecord } from '../hooks/useGameActions';
import {
    sfxMove,
    sfxRotate,
    sfxSoftDrop,
    sfxHardDrop,
    sfxLock,
    sfxHold,
    sfxLineClear,
    sfxCombo,
    sfxLevelUp,
    sfxGameOver,
    sfxPause,
    sfxUnpause,
    toggleMute,
    isMuted,
} from '../lib/sfx';

interface Props {
    onGameOver: (state: TetrisState) => void;
    onRecordPiece: (record: PieceRecord) => boolean; // returns true if game should pause for signing
    onFlushPieces: () => Promise<boolean>; // flush buffer → sign PTB → returns success
}

/** Process lock result and trigger appropriate SFX */
function handleLockSfx(result: LockResult | null) {
    if (!result || !result.locked) return;
    if (result.gameOver) {
        sfxGameOver();
        return;
    }
    if (result.linesCleared > 0) {
        sfxLineClear(result.linesCleared);
        if (result.combo > 1) {
            setTimeout(() => sfxCombo(result.combo), 150);
        }
    } else {
        sfxLock();
    }
    if (result.leveledUp) {
        setTimeout(() => sfxLevelUp(), 250);
    }
}

export default function GameScreen({ onGameOver, onRecordPiece, onFlushPieces }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const nextCanvasRef = useRef<HTMLCanvasElement>(null);
    const holdCanvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef<TetrisState>(createInitialState());
    const dropTimerRef = useRef<number>(0);
    const lastDropRef = useRef<number>(0);
    const [, forceRender] = useState(0);
    const [muted, setMuted] = useState(isMuted());
    const [signing, setSigning] = useState(false);

    // On-chain sync status from store
    const { piecesSynced, bufferedPieces, syncPending, needsSign, error: storeError } = useGameStore();

    const rerender = useCallback(() => forceRender(n => n + 1), []);

    // Record a piece and check if we need to pause for signing
    const recordAndMaybePause = useCallback((
        prePieceType: number,
        preCol: number,
        preRotation: number,
        result: LockResult,
        s: TetrisState,
    ) => {
        const shouldPause = onRecordPiece({
            pieceType: prePieceType,
            col: preCol,
            rotation: preRotation,
            linesClearedByThis: result.linesCleared,
            cumulativeScore: s.score,
            cumulativeLines: s.linesCleared,
        });

        if (shouldPause && !s.isPaused && !s.gameOver) {
            s.isPaused = true;
            rerender();
        }
    }, [onRecordPiece, rerender]);

    // Handle signing the batch
    const handleSign = useCallback(async () => {
        setSigning(true);
        const success = await onFlushPieces();
        setSigning(false);
        if (success) {
            const s = stateRef.current;
            s.isPaused = false;
            rerender();
        }
    }, [onFlushPieces, rerender]);

    // ─── Game Loop ───
    useEffect(() => {
        const s = stateRef.current;

        const gameLoop = (time: number) => {
            if (s.gameOver) {
                onGameOver(s);
                return;
            }

            if (!s.isPaused) {
                if (time - lastDropRef.current >= s.dropSpeed) {
                    const prePieceType = s.currentPiece;
                    const preCol = s.currentCol;
                    const preRotation = s.currentRotation;

                    const result = tick(s);
                    lastDropRef.current = time;

                    if (result && result.locked) {
                        handleLockSfx(result);
                        recordAndMaybePause(prePieceType, preCol, preRotation, result, s);
                    }

                    if (s.gameOver) {
                        sfxGameOver();
                        onGameOver(s);
                        rerender();
                        return;
                    }
                    rerender();
                }
            }

            drawBoard(canvasRef.current, s);
            drawPreview(nextCanvasRef.current, s.nextPiece);
            drawHold(holdCanvasRef.current, s.heldPiece);

            dropTimerRef.current = requestAnimationFrame(gameLoop);
        };

        dropTimerRef.current = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(dropTimerRef.current);
    }, [onGameOver, rerender, recordAndMaybePause]);

    // ─── Keyboard Input ───
    useEffect(() => {
        const s = stateRef.current;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (s.gameOver) return;
            // Block gameplay input during signing pause (but allow mute/unpause)
            if (needsSign && e.key.toLowerCase() !== 'm') return;

            switch (e.key.toLowerCase()) {
                case 'arrowleft':
                case 'a':
                    e.preventDefault();
                    if (moveLeft(s)) sfxMove();
                    rerender();
                    break;
                case 'arrowright':
                case 'd':
                    e.preventDefault();
                    if (moveRight(s)) sfxMove();
                    rerender();
                    break;
                case 'arrowdown':
                case 's':
                    e.preventDefault();
                    if (softDrop(s)) sfxSoftDrop();
                    lastDropRef.current = performance.now();
                    rerender();
                    break;
                case 'arrowup':
                case 'w':
                    e.preventDefault();
                    {
                        const prePieceType = s.currentPiece;
                        const preCol = s.currentCol;
                        const preRotation = s.currentRotation;

                        sfxHardDrop();
                        const result = hardDrop(s);

                        if (result && result.locked) {
                            handleLockSfx(result);
                            recordAndMaybePause(prePieceType, preCol, preRotation, result, s);
                        }
                    }
                    lastDropRef.current = performance.now();
                    if (s.gameOver) onGameOver(s);
                    rerender();
                    break;
                case ' ':
                case 'e':
                    e.preventDefault();
                    if (rotate(s)) sfxRotate();
                    rerender();
                    break;
                case 'c':
                    e.preventDefault();
                    if (holdPieceFn(s)) sfxHold();
                    rerender();
                    break;
                case 'p':
                case 'escape':
                    e.preventDefault();
                    if (!needsSign) {
                        const wasPaused = s.isPaused;
                        togglePause(s);
                        if (wasPaused) sfxUnpause();
                        else sfxPause();
                    }
                    rerender();
                    break;
                case 'm':
                    e.preventDefault();
                    setMuted(toggleMute());
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onGameOver, rerender, recordAndMaybePause, needsSign]);

    const s = stateRef.current;
    const bufferPercent = Math.round((bufferedPieces / SIGN_THRESHOLD) * 100);

    return (
        <div className="game-layout">
            {/* Left panel: Hold + Stats */}
            <div className="side-panel left-panel">
                <div className="panel-section">
                    <h3 className="panel-label">HOLD <span className="key-hint">[C]</span></h3>
                    <canvas ref={holdCanvasRef} className="preview-canvas" />
                </div>
                <div className="panel-section">
                    <h3 className="panel-label">STATS</h3>
                    <div className="stat-mini"><span>Score</span><span className="score-glow">{s.score.toLocaleString()}</span></div>
                    <div className="stat-mini"><span>Lines</span><span>{s.linesCleared}</span></div>
                    <div className="stat-mini"><span>Level</span><span>{s.level}</span></div>
                    <div className="stat-mini"><span>Combo</span><span>{s.combo > 0 ? `×${s.combo}` : '—'}</span></div>
                    <div className="stat-mini"><span>Pieces</span><span>{s.piecesPlaced}</span></div>
                </div>
                {/* On-chain sync status */}
                <div className="panel-section chain-status">
                    <h3 className="panel-label">⛓️ ON-CHAIN</h3>
                    <div className="stat-mini">
                        <span>Synced</span>
                        <span className={piecesSynced > 0 ? 'chain-confirmed' : ''}>
                            {piecesSynced > 0 ? `✅ ${piecesSynced}` : '—'}
                        </span>
                    </div>
                    <div className="stat-mini">
                        <span>Buffered</span>
                        <span>{bufferedPieces}</span>
                    </div>
                    {/* Buffer progress bar */}
                    <div className="buffer-bar-container">
                        <div
                            className={`buffer-bar-fill ${bufferPercent >= 90 ? 'buffer-bar-warn' : ''}`}
                            style={{ width: `${Math.min(bufferPercent, 100)}%` }}
                        />
                    </div>
                    <div className="stat-mini" style={{ fontSize: '10px', opacity: 0.6 }}>
                        <span>{bufferPercent}%</span>
                        <span>until sign</span>
                    </div>
                    {syncPending && (
                        <div className="chain-syncing">
                            <span className="chain-spinner" /> Confirming...
                        </div>
                    )}
                </div>
            </div>

            {/* Center: Board */}
            <div className="board-container">
                {/* Signing overlay — pauses game when buffer is full */}
                {needsSign && (
                    <div className="sign-overlay">
                        <div className="sign-card">
                            <div className="sign-icon">⛓️</div>
                            <div className="sign-title">SYNC TO CHAIN</div>
                            <div className="sign-count">{bufferedPieces} pieces</div>
                            <div className="sign-msg">
                                Your moves are ready to be recorded on Sui.
                                Sign the transaction to continue playing.
                            </div>
                            {storeError && (
                                <div className="sign-error">⚠️ {storeError}</div>
                            )}
                            <button
                                className="sign-btn"
                                onClick={handleSign}
                                disabled={signing}
                            >
                                {signing ? (
                                    <><span className="chain-spinner" /> Signing...</>
                                ) : (
                                    <>✍️ Sign & Continue</>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {s.isPaused && !needsSign && (
                    <div className="pause-overlay">
                        <span className="pause-text">PAUSED</span>
                        <span className="pause-hint">Press P or Esc to resume</span>
                    </div>
                )}
                <canvas
                    ref={canvasRef}
                    className="board-canvas"
                    width={BOARD_W * CELL_SIZE}
                    height={BOARD_H * CELL_SIZE}
                />
            </div>

            {/* Right panel: Next + Controls */}
            <div className="side-panel right-panel">
                <div className="panel-section">
                    <h3 className="panel-label">NEXT</h3>
                    <canvas ref={nextCanvasRef} className="preview-canvas" />
                </div>
                <div className="panel-section">
                    <h3 className="panel-label">CURRENT</h3>
                    <div className="current-piece-info">
                        <span className="piece-badge" style={{ background: COLORS[s.currentPiece + 1] }}>
                            {PIECES[s.currentPiece]}
                        </span>
                    </div>
                </div>
                <div className="panel-section">
                    <h3 className="panel-label">CONTROLS</h3>
                    <div className="controls-list">
                        <span>A / ← Move left</span>
                        <span>D / → Move right</span>
                        <span>S / ↓ Soft drop</span>
                        <span>W / ↑ Hard drop</span>
                        <span>E / Space Rotate</span>
                        <span>C Hold piece</span>
                        <span>P / Esc Pause</span>
                        <span>M Toggle sound</span>
                    </div>
                </div>
                <div className="panel-section">
                    <button
                        className="mute-btn"
                        onClick={() => setMuted(toggleMute())}
                        title={muted ? 'Unmute' : 'Mute'}
                    >
                        {muted ? '🔇' : '🔊'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════
// Canvas Drawing
// ═══════════════════════════════════════════════

function drawBoard(canvas: HTMLCanvasElement | null, state: TetrisState) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = BOARD_W * CELL_SIZE;
    const h = BOARD_H * CELL_SIZE;
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, w, h);

    for (let r = 0; r < BOARD_H; r++) {
        for (let c = 0; c < BOARD_W; c++) {
            if (state.board[r][c] !== 0) {
                drawCell(ctx, c, r, COLORS[state.board[r][c]], 1.0);
            }
        }
    }

    const ghostRow = getGhostRow(state);
    const shape = getShape(state.currentPiece, state.currentRotation);
    const color = COLORS[state.currentPiece + 1];
    for (const [dr, dc] of shape) {
        const r = ghostRow + dr;
        const c = state.currentCol + dc;
        if (r >= 0 && r < BOARD_H) drawCell(ctx, c, r, color, 0.2);
    }
    for (const [dr, dc] of shape) {
        const r = state.currentRow + dr;
        const c = state.currentCol + dc;
        if (r >= 0 && r < BOARD_H) drawCell(ctx, c, r, color, 1.0);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= BOARD_H; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * CELL_SIZE); ctx.lineTo(w, r * CELL_SIZE); ctx.stroke();
    }
    for (let c = 0; c <= BOARD_W; c++) {
        ctx.beginPath(); ctx.moveTo(c * CELL_SIZE, 0); ctx.lineTo(c * CELL_SIZE, h); ctx.stroke();
    }
}

function drawPreview(canvas: HTMLCanvasElement | null, piece: number) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = 4 * CELL_SIZE;
    canvas.width = s; canvas.height = s;
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, s, s);
    const shape = getShape(piece, 0);
    for (const [r, c] of shape) drawCell(ctx, c, r, COLORS[piece + 1], 1.0);
}

function drawHold(canvas: HTMLCanvasElement | null, piece: number | null) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = 4 * CELL_SIZE;
    canvas.width = s; canvas.height = s;
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, s, s);
    if (piece === null) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = '14px "Space Mono"';
        ctx.textAlign = 'center';
        ctx.fillText('Empty', s / 2, s / 2 + 5);
        return;
    }
    const shape = getShape(piece, 0);
    for (const [r, c] of shape) drawCell(ctx, c, r, COLORS[piece + 1], 1.0);
}

function drawCell(ctx: CanvasRenderingContext2D, col: number, row: number, color: string, alpha: number) {
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, 2);
    ctx.fillRect(x + 1, y + 1, 2, CELL_SIZE - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 1, y + CELL_SIZE - 3, CELL_SIZE - 2, 2);
    ctx.fillRect(x + CELL_SIZE - 3, y + 1, 2, CELL_SIZE - 2);
    ctx.globalAlpha = 1.0;
}
