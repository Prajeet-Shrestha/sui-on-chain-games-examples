import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit-react';
import { useGameStore } from './stores/gameStore';
import { useGameSession } from './hooks/useGameSession';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';

export default function App() {
    const account = useCurrentAccount();
    const { sessionId, isLoading, error } = useGameStore();
    const { data: session } = useGameSession();

    return (
        <>
            <header className="header">
                <div className="header-title">
                    <span className="title-sui">SUI</span>
                    <span className="title-craft">CRAFT</span>
                </div>
                <div className="header-right">
                    {session && (
                        <div className="header-stats">
                            <span className="stat">⛏ {session.blocksMined}</span>
                            <span className="stat">🧱 {session.blocksPlaced}</span>
                            <span className="stat">🔧 {session.itemsCrafted}</span>
                        </div>
                    )}
                    <ConnectButton />
                </div>
            </header>

            <div className="main-content">
                {isLoading && <div className="loading-overlay">⏳ Processing transaction...</div>}
                {error && <div className="error-banner" onClick={() => useGameStore.getState().setError(null)}>⚠️ {error}</div>}

                {!account ? (
                    <div className="connect-screen">
                        <div className="logo-block">
                            <span className="logo-sui">SUI</span>
                            <span className="logo-craft">CRAFT</span>
                        </div>
                        <p className="connect-subtitle">Fully On-Chain Sandbox Game</p>
                        <p className="connect-hint">Connect your wallet to play</p>
                        <div className="connect-features">
                            <div className="feature">⛏️ Mine blocks</div>
                            <div className="feature">🔨 Craft tools</div>
                            <div className="feature">🧱 Build worlds</div>
                            <div className="feature">💎 Find diamonds</div>
                        </div>
                    </div>
                ) : !sessionId || !session ? (
                    <StartScreen />
                ) : (
                    <GameScreen session={session} />
                )}
            </div>
        </>
    );
}
