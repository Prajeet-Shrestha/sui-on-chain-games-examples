import { useState, useCallback } from 'react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit-react';
import { useGameActions } from './hooks/useGameActions';
import { useGameStore } from './stores/gameStore';
import { MAZES, LEVELS } from './lib/mazeData';
import LevelSelect from './components/LevelSelect';
import GameScreen from './components/GameScreen';
import { soundManager } from './lib/audio';

type Screen = 'select' | 'playing' | 'complete';

export default function App() {
  const account = useCurrentAccount();
  const store = useGameStore();
  const { startGame } = useGameActions();
  const [screen, setScreen] = useState<Screen>('select');
  const [muted, setMuted] = useState(soundManager.getMute());

  const toggleMute = () => {
    const newState = !muted;
    setMuted(newState);
    soundManager.setMute(newState);
  };

  const handleSelectLevel = async (level: number) => {
    store.setError(null);
    const sessionId = await startGame(level);
    if (sessionId) {
      const maze = MAZES[level];
      store.resetForLevel(level, maze.startX, maze.startY);
      setScreen('playing');
    }
  };

  const handleLevelComplete = useCallback(() => { }, []);

  const handleAllComplete = useCallback(() => {
    store.clearGame();
    setScreen('complete');
  }, [store]);

  const handleQuit = useCallback(() => {
    store.clearGame();
    setScreen('select');
  }, [store]);

  const handlePlayAgain = () => {
    store.clearGame();
    setScreen('select');
  };

  return (
    <div className={`app-root ${screen === 'playing' ? 'playing' : ''}`}>
      <header className="header">
        <div className="header-title">
          <span className="title-sui">SUI</span>
          <span className="title-maze">MAZE</span>
          <span className="title-badge">ON-CHAIN</span>
        </div>
        <div className="header-stats">
          <button className="btn-icon" onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
            {muted ? "🔇" : "🔊"}
          </button>
          {screen === 'playing' && (
            <span className="header-stat live-badge">
              <span className="live-dot" />
              RECORDING
            </span>
          )}
          <ConnectButton />
        </div>
      </header>

      <div className="main-content">
        {store.isLoading && screen === 'select' && (
          <div className="loading-overlay">
            <div className="loading-card">
              <div className="loading-spinner" />
              <p>Signing transaction...</p>
              <p className="loading-sub">Approve in your wallet</p>
            </div>
          </div>
        )}
        {store.error && <div className="error-banner">⚠️ {store.error}</div>}

        {!account ? (
          <div className="connect-screen">
            <div className="hero-glow" />
            <div className="connect-inner">
              <div className="logo-block">
                <div className="logo-icon">🔦</div>
                <h1 className="logo-title">
                  <span className="logo-sui">SUI</span>
                  <span className="logo-maze">MAZE</span>
                </h1>
                <p className="logo-tagline">Fully On-Chain Maze Explorer</p>
              </div>
              <div className="connect-features">
                <div className="feature-item">
                  <span className="feature-icon">⛓️</span>
                  <div>
                    <strong>Every Move On-Chain</strong>
                    <p>All moves cryptographically verified on Sui</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🔦</span>
                  <div>
                    <strong>Fog of War</strong>
                    <p>Navigate darkness with only your flashlight</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🏆</span>
                  <div>
                    <strong>5 Levels</strong>
                    <p>Progressive difficulty from 17×17 to 39×39</p>
                  </div>
                </div>
              </div>
              <div className="connect-action">
                <p className="connect-cta">Connect your wallet to begin</p>
              </div>
            </div>
          </div>
        ) : screen === 'select' ? (
          <LevelSelect
            onSelectLevel={handleSelectLevel}
            isLoading={store.isLoading}
          />
        ) : screen === 'playing' ? (
          <GameScreen
            onLevelComplete={handleLevelComplete}
            onAllComplete={handleAllComplete}
            onQuit={handleQuit}
          />
        ) : screen === 'complete' ? (
          <div className="exit-overlay">
            <div className="overlay-card">
              <div className="overlay-card-glow gold" />
              <div className="emoji-lg">🏆</div>
              <h2 className="overlay-title text-gold">All Mazes Conquered!</h2>
              <p className="overlay-desc">
                You navigated all {LEVELS.length} mazes through darkness.
                <br />Your entire journey is recorded forever on the Sui blockchain.
              </p>
              <div className="completion-stats">
                <div className="completion-stat">
                  <span className="completion-value">{LEVELS.length}</span>
                  <span className="completion-label">Levels</span>
                </div>
                <div className="completion-stat">
                  <span className="completion-value">✓</span>
                  <span className="completion-label">Verified</span>
                </div>
                <div className="completion-stat">
                  <span className="completion-value">⛓️</span>
                  <span className="completion-label">On-Chain</span>
                </div>
              </div>
              <button className="btn-primary btn-lg" onClick={handlePlayAgain}>
                Play Again
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
