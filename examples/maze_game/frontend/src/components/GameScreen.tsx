import { useEffect, useCallback, useState } from 'react';
import MazeCanvas from './MazeCanvas';
import { useGameStore } from '../stores/gameStore';
import { useGameActions } from '../hooks/useGameActions';
import { MAZES, LEVEL_NAMES, LEVELS } from '../lib/mazeData';
import { DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT } from '../constants';
import { soundManager } from '../lib/audio';

interface GameScreenProps {
    onLevelComplete: () => void;
    onAllComplete: () => void;
    onQuit: () => void;
}

export default function GameScreen({ onLevelComplete, onAllComplete, onQuit }: GameScreenProps) {
    const store = useGameStore();
    const { submitMoves, startGame } = useGameActions();
    const maze = MAZES[store.currentLevel];
    const movesLeft = maze.maxMoves - store.movesCount;
    const outOfMoves = movesLeft <= 0 && !store.atExit;
    const totalLevels = LEVELS.length;
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);
    const levelConfig = LEVELS[store.currentLevel - 1];

    const movesPercent = Math.round((store.movesCount / maze.maxMoves) * 100);
    const barClass = movesPercent > 80 ? 'danger' : movesPercent > 60 ? 'warning' : '';

    // Client-side movement — records every move for on-chain replay
    const handleMove = useCallback((direction: number) => {
        const state = useGameStore.getState();
        if (state.atExit || state.isLoading) return;

        const maze = MAZES[state.currentLevel];
        if (maze.maxMoves - state.movesCount <= 0) return;

        let newX = state.playerX;
        let newY = state.playerY;

        if (direction === DIR_UP) newY -= 1;
        else if (direction === DIR_RIGHT) newX += 1;
        else if (direction === DIR_DOWN) newY += 1;
        else if (direction === DIR_LEFT) newX -= 1;

        if (newX < 0 || newX >= maze.width || newY < 0 || newY >= maze.height) {
            soundManager.playBump();
            return;
        }
        if (maze.walls[newY][newX] === 1) {
            soundManager.playBump();
            return;
        }

        soundManager.playMove();
        store.setPosition(newX, newY, direction);
        store.incrementMoves();
        store.addMove(direction);

        if (newX === maze.exitX && newY === maze.exitY) {
            soundManager.playWin();
            store.setAtExit(true);
            if (state.currentLevel >= totalLevels) {
                store.setGameFinished(true);
            }
        }
    }, [store, totalLevels]);

    const handleRetry = useCallback(() => {
        soundManager.playClick();
        const maze = MAZES[store.currentLevel];
        store.resetForLevel(store.currentLevel, maze.startX, maze.startY);
        setVerified(false);
        setVerifying(false);
    }, [store]);

    const handleNextLevel = useCallback(async () => {
        setVerifying(true);
        const moves = useGameStore.getState().moveHistory;
        const success = await submitMoves(moves);
        setVerifying(false);

        if (!success) {
            soundManager.playBump();
            return;
        }
        soundManager.playLevelStart();
        setVerified(true);

        await new Promise(r => setTimeout(r, 1200));

        const currentLevel = useGameStore.getState().currentLevel;
        if (currentLevel >= totalLevels) {
            onAllComplete();
            return;
        }

        const nextLvl = currentLevel + 1;
        const newSessionId = await startGame(nextLvl);
        if (!newSessionId) return;

        const nextMaze = MAZES[nextLvl];
        store.resetForLevel(nextLvl, nextMaze.startX, nextMaze.startY);
        setVerified(false);
        onLevelComplete();
    }, [submitMoves, startGame, store, onLevelComplete, onAllComplete, totalLevels]);

    const handleGameComplete = useCallback(async () => {
        setVerifying(true);
        const moves = useGameStore.getState().moveHistory;
        const success = await submitMoves(moves);
        setVerifying(false);

        if (!success) {
            soundManager.playBump();
            return;
        }

        soundManager.playWin();
        setVerified(true);

        await new Promise(r => setTimeout(r, 1200));
        onAllComplete();
    }, [submitMoves, onAllComplete]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const state = useGameStore.getState();
            if (state.atExit) return;

            switch (e.key) {
                case 'ArrowUp': case 'w': case 'W':
                    e.preventDefault(); handleMove(DIR_UP); break;
                case 'ArrowRight': case 'd': case 'D':
                    e.preventDefault(); handleMove(DIR_RIGHT); break;
                case 'ArrowDown': case 's': case 'S':
                    e.preventDefault(); handleMove(DIR_DOWN); break;
                case 'ArrowLeft': case 'a': case 'A':
                    e.preventDefault(); handleMove(DIR_LEFT); break;
                case 'r': case 'R':
                    if (state.movesCount >= MAZES[state.currentLevel].maxMoves) {
                        handleRetry();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleMove, handleRetry]);

    if (!maze) return null;

    return (
        <div className="game-screen">
            {/* HUD Bar */}
            <div className="game-hud">
                <div className="hud-left">
                    <div className="hud-level-info">
                        <span className="hud-level-label">Level {store.currentLevel}</span>
                        <span className="hud-level-value">{LEVEL_NAMES[store.currentLevel]}</span>
                    </div>
                    <div className="hud-divider" />
                    <div className="hud-objective">
                        <span className="hud-obj-label">🎯 Find the exit</span>
                    </div>
                </div>
                <div className="hud-center">
                    <div className="hud-moves-track">
                        <div
                            className={`hud-moves-fill ${barClass}`}
                            style={{ transform: `scaleX(${Math.min(1, store.movesCount / maze.maxMoves)})` }}
                        />
                    </div>
                    <div className="hud-moves-label">
                        <span className={`hud-moves-count ${barClass}`}>
                            {store.movesCount} / {maze.maxMoves}
                        </span>
                        <span className={`hud-moves-left ${movesLeft <= 10 && !store.atExit ? 'critical' : ''}`}>
                            {movesLeft} left
                        </span>
                    </div>
                </div>
                <div className="hud-right">
                    <span className="hud-fog-badge">👁 R{levelConfig?.viewRadius ?? 5}</span>
                    <span className="hud-size-badge">{maze.width - 1}×{maze.height - 1}</span>
                    <button className="btn-quit" onClick={onQuit}>✕</button>
                </div>
            </div>

            {/* Maze fills remaining viewport */}
            <div className="maze-wrapper">
                <MazeCanvas
                    maze={maze}
                    playerX={store.playerX}
                    playerY={store.playerY}
                    direction={store.direction}
                    isLoading={false}
                />
            </div>

            {/* Out of moves */}
            {outOfMoves && (
                <div className="exit-overlay">
                    <div className="overlay-card">
                        <div className="overlay-card-glow red" />
                        <div className="emoji-lg">💀</div>
                        <h2 className="overlay-title">Out of Moves</h2>
                        <p className="overlay-desc">
                            You used all <strong>{maze.maxMoves}</strong> moves without finding the exit.
                            <br />Try a different path next time.
                        </p>
                        <div className="overlay-actions">
                            <button className="btn-primary" onClick={handleRetry}>🔄 Try Again</button>
                            <button className="btn-secondary" onClick={onQuit}>← Back to Menu</button>
                        </div>
                        <p className="overlay-hint">Press R to retry</p>
                    </div>
                </div>
            )}

            {/* Level complete — on-chain verification */}
            {store.atExit && (
                <div className="exit-overlay">
                    <div className="overlay-card">
                        {verifying ? (
                            <>
                                <div className="overlay-card-glow blue" />
                                <div className="verify-chain-anim">
                                    <div className="chain-link" />
                                    <div className="chain-link delay-1" />
                                    <div className="chain-link delay-2" />
                                </div>
                                <h2 className="overlay-title">Verifying On-Chain</h2>
                                <p className="overlay-desc">
                                    Replaying <strong>{store.movesCount}</strong> moves on Sui blockchain
                                </p>
                                <div className="verify-tech">
                                    <code>{store.movesCount} × move_player() + 1 × complete_level()</code>
                                    <span>Single PTB → One signature</span>
                                </div>
                            </>
                        ) : verified ? (
                            <>
                                <div className="overlay-card-glow green" />
                                <div className="emoji-lg verified-pulse">✅</div>
                                <h2 className="overlay-title">Verified On-Chain!</h2>
                                <p className="overlay-desc">
                                    All <strong>{store.movesCount}</strong> moves validated on Sui
                                </p>
                            </>
                        ) : store.gameFinished ? (
                            <>
                                <div className="overlay-card-glow gold" />
                                <div className="emoji-lg">🏆</div>
                                <h2 className="overlay-title text-gold">All Mazes Conquered!</h2>
                                <p className="overlay-desc">You escaped all {totalLevels} mazes!</p>
                                <button className="btn-primary btn-lg" onClick={handleGameComplete} disabled={store.isLoading}>
                                    ⛓️ Verify & Save On-Chain
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="overlay-card-glow gold" />
                                <div className="emoji-lg">⭐</div>
                                <h2 className="overlay-title">Level {store.currentLevel} Complete!</h2>
                                <div className="level-result-stats">
                                    <div className="result-stat">
                                        <span className="result-value">{store.movesCount}</span>
                                        <span className="result-label">Moves Used</span>
                                    </div>
                                    <div className="result-stat">
                                        <span className="result-value">{maze.maxMoves}</span>
                                        <span className="result-label">Max Allowed</span>
                                    </div>
                                    <div className="result-stat">
                                        <span className="result-value">{Math.round((1 - store.movesCount / maze.maxMoves) * 100)}%</span>
                                        <span className="result-label">Efficiency</span>
                                    </div>
                                </div>
                                <button className="btn-primary btn-lg" onClick={handleNextLevel} disabled={store.isLoading}>
                                    ⛓️ Verify On-Chain & Continue →
                                </button>
                                <p className="overlay-hint">
                                    {store.movesCount} moves replayed on-chain in a single transaction
                                </p>
                            </>
                        )}
                        {store.error && (
                            <div className="verify-error">
                                <p>❌ {store.error}</p>
                                <button className="btn-secondary btn-sm" onClick={() => store.setError(null)}>Dismiss</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Controls hint */}
            {!store.atExit && !outOfMoves && (
                <div className="controls-hint">
                    <div className="controls-keys">
                        <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
                    </div>
                    <span className="controls-label">or Arrow Keys</span>
                </div>
            )}
        </div>
    );
}
