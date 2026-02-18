import { useState, useCallback } from 'react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit-react';
import { useGameActions } from './hooks/useGameActions';
import { useUIStore } from './stores/uiStore';
import { createLocalGame, applyColor, getVirusColor, type LocalGameState } from './lib/localEngine';
import { HomeScreen } from './components/HomeScreen';
import { LevelSelect } from './components/LevelSelect';
import { PhaserBoardWrapper } from './components/PhaserBoardWrapper';
import { ColorPalette } from './components/ColorPalette';
import { GameHud } from './components/GameHud';
import { GameOver } from './components/GameOver';

type Phase = 'home' | 'select' | 'playing' | 'result';

function App() {
  const account = useCurrentAccount();
  const { isPending, error, setError } = useUIStore();
  const { submitGame } = useGameActions();

  const [phase, setPhase] = useState<Phase>('home');
  const [level, setLevel] = useState<number>(1);
  const [game, setGame] = useState<LocalGameState | null>(null);
  const [moveHistory, setMoveHistory] = useState<number[]>([]);
  const [txDigest, setTxDigest] = useState<string | null>(null);

  // Start a level — runs locally, no tx yet
  const handleStartLevel = useCallback((lv: number) => {
    setLevel(lv);
    setGame(createLocalGame(lv));
    setMoveHistory([]);
    setTxDigest(null);
    setError(null);
    setPhase('playing');
  }, [setError]);

  // Pick a color — local simulation only
  const handleChooseColor = useCallback((color: number) => {
    if (!game || game.state !== 'active') return;
    const next = applyColor(game, color);
    if (next === game) return; // same color, no-op
    setGame(next);
    setMoveHistory((prev) => [...prev, color]);
  }, [game]);

  // Undo last move
  const handleUndo = useCallback(() => {
    if (moveHistory.length === 0) return;
    // Replay all moves except the last one
    const newHistory = moveHistory.slice(0, -1);
    let state = createLocalGame(level);
    for (const c of newHistory) {
      state = applyColor(state, c);
    }
    setGame(state);
    setMoveHistory(newHistory);
  }, [moveHistory, level]);

  // Reset current level
  const handleReset = useCallback(() => {
    setGame(createLocalGame(level));
    setMoveHistory([]);
  }, [level]);

  // Submit all moves as one PTB
  const handleSubmit = useCallback(async () => {
    if (moveHistory.length === 0) return;
    setError(null);
    try {
      const digest = await submitGame(level, moveHistory);
      setTxDigest(digest);
      setPhase('result');
    } catch {
      // error shown via banner
    }
  }, [level, moveHistory, submitGame, setError]);

  // Back to home
  const handlePlayAgain = useCallback(() => {
    setGame(null);
    setMoveHistory([]);
    setTxDigest(null);
    setPhase('home');
  }, []);

  const currentVirusColor = game ? getVirusColor(game) : 0;


  // Build a GameSession-like shape for components
  const gameSession = game ? {
    id: 'local',
    state: game.state,
    player: account?.address ?? '',
    level,
    board: game.board,
    controlled: game.controlled,
    controlledCount: game.controlledCount,
    movesRemaining: game.maxMoves - game.movesUsed,
    movesUsed: game.movesUsed,
    numColors: game.numColors,
    boardWidth: game.boardWidth,
    boardHeight: game.boardHeight,
    virusStarts: game.virusStarts,
  } : null;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__icon">🦠</span>
          <h1 className="app-header__title">Virus</h1>
        </div>
        <ConnectButton />
      </header>

      <main className="app-main">
        {error && (
          <div className="error-banner" onClick={() => setError(null)}>
            ⚠️ {error}
          </div>
        )}

        {!account ? (
          <HomeScreen onPlay={() => {}} />
        ) : phase === 'home' ? (
          <HomeScreen onPlay={() => setPhase('select')} />
        ) : phase === 'select' ? (
          <LevelSelect onStart={handleStartLevel} isPending={isPending} />
        ) : phase === 'playing' && gameSession ? (
          <div className="game-container">
            <div className="game-topbar">
              <button className="btn btn--back" onClick={handlePlayAgain}>
                ← Back
              </button>
              <GameHud game={gameSession} />
            </div>

            <div className="game-play-area">
              <ColorPalette
                numColors={gameSession.numColors}
                currentVirusColor={currentVirusColor}
                onChoose={handleChooseColor}
                disabled={isPending || game!.state !== 'active'}
              />
              <PhaserBoardWrapper game={gameSession} />

              <div className="game-actions">
                <div className="game-actions__info">
                  {moveHistory.length} move{moveHistory.length !== 1 ? 's' : ''} queued
                  {moveHistory.length > 0 && (
                    <span className="game-actions__sequence">
                      {' '}— {moveHistory.map((c) => `${c}`).join(', ')}
                    </span>
                  )}
                </div>

                <div className="game-actions__buttons">
                  <button
                    className="btn"
                    onClick={handleUndo}
                    disabled={moveHistory.length === 0 || isPending}
                  >
                    ↩ Undo
                  </button>
                  <button
                    className="btn"
                    onClick={handleReset}
                    disabled={moveHistory.length === 0 || isPending}
                  >
                    ↻ Reset
                  </button>
                  <button
                    className="btn btn--primary"
                    onClick={handleSubmit}
                    disabled={moveHistory.length === 0 || isPending}
                  >
                    {isPending ? 'Submitting...' : `Submit ${moveHistory.length} On-Chain`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : phase === 'result' && gameSession ? (
          <div className="result-screen">
            <GameOver game={gameSession} onPlayAgain={handlePlayAgain} />
            {txDigest && (
              <div className="tx-link">
                <a
                  href={`https://suiscan.xyz/testnet/tx/${txDigest}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on SuiScan →
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <p>Something went wrong.</p>
            <button className="btn" onClick={handlePlayAgain}>Back</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
