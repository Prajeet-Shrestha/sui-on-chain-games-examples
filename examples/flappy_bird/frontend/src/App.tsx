import { useState, useCallback } from 'react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit-react';
import { useGameActions } from './hooks/useGameActions';
import { useGameStore } from './stores/gameStore';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';
import GameOverScreen from './components/GameOverScreen';
import type { FlappyState } from './lib/flappyEngine';

type Screen = 'start' | 'playing' | 'gameover';

export default function App() {
    const account = useCurrentAccount();
    const store = useGameStore();
    const { startGame, saveGame } = useGameActions();
    const [screen, setScreen] = useState<Screen>('start');
    const [finalState, setFinalState] = useState<FlappyState | null>(null);

    // ── Start Game: sign on-chain tx, THEN play ──
    const handleStartGame = async () => {
        store.setError(null);
        const sessionId = await startGame();
        if (sessionId) {
            setScreen('playing');
        }
        // If startGame fails, it sets the error in the store automatically
    };

    const handleGameOver = useCallback((state: FlappyState) => {
        setFinalState(state);
        setScreen('gameover');
    }, []);

    // ── Save score on-chain, then start a new session & play again ──
    const handleSaveAndPlayAgain = async () => {
        if (finalState) {
            await saveGame(finalState.score, finalState.pipesPassed);
        }
        setFinalState(null);
        const sessionId = await startGame();
        if (sessionId) {
            setScreen('playing');
        }
    };

    // ── Save score on-chain, then return to start screen ──
    const handleQuit = async () => {
        if (finalState) {
            await saveGame(finalState.score, finalState.pipesPassed);
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
                    <span className="title-flap">FLAP</span>
                </div>
                <div className="header-stats">
                    {screen === 'playing' && (
                        <span className="header-stat live-badge">🎮 LIVE</span>
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
                            <span className="logo-flap">FLAP</span>
                        </div>
                        <div className="connect-bird">🐦</div>
                        <p className="connect-subtitle">On-Chain Flappy Bird</p>
                        <p className="connect-hint">Connect your wallet to play</p>
                    </div>
                ) : screen === 'start' ? (
                    <StartScreen onStart={handleStartGame} isLoading={store.isLoading} />
                ) : screen === 'playing' ? (
                    <GameScreen onGameOver={handleGameOver} />
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
