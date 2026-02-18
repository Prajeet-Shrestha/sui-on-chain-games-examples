import { useState, useCallback } from 'react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit-react';
import { useGameActions } from './hooks/useGameActions';
import { useGameStore } from './stores/gameStore';
import StartScreen from './components/StartScreen.tsx';
import GameScreen from './components/GameScreen.tsx';
import GameOverScreen from './components/GameOverScreen.tsx';
import type { TetrisState } from './lib/tetrisEngine';

type Screen = 'start' | 'playing' | 'gameover';

export default function App() {
    const account = useCurrentAccount();
    const store = useGameStore();
    const { startGame, recordPiece, flushPieces, saveGame } = useGameActions();
    const [screen, setScreen] = useState<Screen>('start');
    const [finalState, setFinalState] = useState<TetrisState | null>(null);

    const handleStartGame = async () => {
        store.setError(null);
        try {
            await startGame();
        } catch {
            console.warn('[SuiTris] On-chain start failed, playing in local mode');
        }
        store.setError(null);
        setScreen('playing');
    };

    const handleGameOver = useCallback((state: TetrisState) => {
        setFinalState(state);
        setScreen('gameover');
    }, []);

    const handleSaveAndPlayAgain = async () => {
        if (finalState) {
            await saveGame(
                finalState.score,
                finalState.linesCleared,
                finalState.level,
                finalState.piecesPlaced,
            );
        }
        const sessionId = await startGame();
        if (sessionId) {
            setFinalState(null);
            setScreen('playing');
        }
    };

    const handleQuit = async () => {
        if (finalState) {
            await saveGame(
                finalState.score,
                finalState.linesCleared,
                finalState.level,
                finalState.piecesPlaced,
            );
        }
        store.clearGame();
        setFinalState(null);
        setScreen('start');
    };

    return (
        <>
            <header className="header">
                <div className="header-title">
                    <span className="title-sui">SUI</span>
                    <span className="title-tris">TRIS</span>
                </div>
                <div className="header-stats">
                    {screen === 'playing' && (
                        <span className="header-stat live-badge">⛓️ ON-CHAIN</span>
                    )}
                    <ConnectButton />
                </div>
            </header>

            <div className="main-content">
                {store.isLoading && <div className="loading-overlay">⏳ Signing transaction...</div>}
                {store.error && <div className="error-banner">⚠️ {store.error}</div>}

                {!account ? (
                    <div className="connect-screen">
                        <div className="logo-block">
                            <span className="logo-sui">SUI</span>
                            <span className="logo-tris">TRIS</span>
                        </div>
                        <p className="connect-subtitle">Fully On-Chain Tetris</p>
                        <p className="connect-hint">Connect your wallet to play</p>
                    </div>
                ) : screen === 'start' ? (
                    <StartScreen onStart={handleStartGame} isLoading={store.isLoading} />
                ) : screen === 'playing' ? (
                    <GameScreen
                        onGameOver={handleGameOver}
                        onRecordPiece={recordPiece}
                        onFlushPieces={flushPieces}
                    />
                ) : screen === 'gameover' && finalState ? (
                    <GameOverScreen
                        state={finalState}
                        onPlayAgain={handleSaveAndPlayAgain}
                        onQuit={handleQuit}
                        isLoading={store.isLoading}
                    />
                ) : null}
            </div>
        </>
    );
}
