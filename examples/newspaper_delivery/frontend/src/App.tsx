import { useState, useCallback, useRef } from 'react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit-react';
import { useGameActions } from './hooks/useGameActions';
import { useGameStore } from './stores/gameStore';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';
import GameOverScreen from './components/GameOverScreen';
import type { DeliveryState, DeliveryRecord } from './lib/deliveryEngine';

type Screen = 'start' | 'playing' | 'gameover';

export default function App() {
    const account = useCurrentAccount();
    const isLoading = useGameStore(s => s.isLoading);
    const error = useGameStore(s => s.error);
    const { startGame, recordDelivery, flushDeliveries, saveGame } = useGameActions();
    const [screen, setScreen] = useState<Screen>('start');
    const [finalState, setFinalState] = useState<DeliveryState | null>(null);
    const [selectedLevel, setSelectedLevel] = useState(0);

    // Use refs for stable callbacks passed to GameScreen
    const flushRef = useRef(flushDeliveries);
    flushRef.current = flushDeliveries;
    const recordRef = useRef(recordDelivery);
    recordRef.current = recordDelivery;

    const handleStartGame = async (levelIndex: number) => {
        useGameStore.getState().setError(null);
        setSelectedLevel(levelIndex);
        const sessionId = await startGame();
        if (sessionId) setScreen('playing');
    };

    // Stable callback: buffer delivery
    const handleDeliveryMade = useCallback((record: DeliveryRecord): void => {
        recordRef.current(record);
    }, []);

    // Stable callback: level complete → flush PTB
    const handleLevelComplete = useCallback(async (_level: number): Promise<void> => {
        console.log(`[App] Level ${_level + 1} complete — flushing deliveries`);
        await flushRef.current();
    }, []);

    // All levels done or early death
    const handleGameOver = useCallback(async (state: DeliveryState) => {
        setFinalState(state);
        setScreen('gameover');
        // Auto-save the final results to chain in the background
        await saveGame(
            state.score, state.totalDeliveries,
            state.perfectCount, state.goodCount,
            state.okCount, state.missCount,
        );
    }, [saveGame]);

    const handleSaveAndPlayAgain = async () => {
        setFinalState(null);
        setSelectedLevel(0);
        const sessionId = await startGame();
        if (sessionId) setScreen('playing');
    };

    const handleQuit = () => {
        useGameStore.getState().clearGame();
        setFinalState(null);
        setScreen('start');
    };

    const isPlaying = screen === 'playing';

    return (
        <div className={isPlaying ? 'app-fullscreen' : 'app-normal'}>
            {!isPlaying && (
                <header className="header">
                    <div className="header-title">
                        <span className="title-sui">CITY</span>
                        <span className="title-deliver">DELIVERY</span>
                    </div>
                    <div className="header-stats">
                        <ConnectButton />
                    </div>
                </header>
            )}

            <div className={isPlaying ? 'content-fullscreen' : 'main-content'}>
                {isLoading && <div className="loading-overlay">⏳ Signing transaction...</div>}
                {error && <div className="error-banner">⚠️ {error}</div>}

                {!account ? (
                    <div className="connect-screen">
                        <div className="logo-block">
                            <span className="logo-sui">CITY</span>
                            <span className="logo-deliver">DELIVERY</span>
                        </div>
                        <div className="connect-icon">🚲</div>
                        <p className="connect-subtitle">On-Chain City Delivery</p>
                        <p className="connect-hint">Connect your wallet to play</p>
                    </div>
                ) : screen === 'start' ? (
                    <StartScreen onStart={handleStartGame} isLoading={isLoading} />
                ) : screen === 'playing' ? (
                    <GameScreen
                        initialLevel={selectedLevel}
                        onGameOver={handleGameOver}
                        onDeliveryMade={handleDeliveryMade}
                        onLevelComplete={handleLevelComplete}
                    />
                ) : screen === 'gameover' && finalState ? (
                    <GameOverScreen
                        state={finalState}
                        onPlayAgain={handleSaveAndPlayAgain}
                        onQuit={handleQuit}
                        isLoading={isLoading}
                    />
                ) : null}
            </div>
        </div>
    );
}
