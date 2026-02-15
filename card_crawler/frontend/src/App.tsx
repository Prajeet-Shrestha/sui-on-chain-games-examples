import { ConnectButton } from '@mysten/dapp-kit-react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useGameStore } from './stores/gameStore';
import { useGameSession } from './hooks/useGameSession';
import { usePlayerEntity } from './hooks/usePlayerEntity';
import {
  STATE_MAP_SELECT,
  STATE_COMBAT,
  STATE_REWARD,
  STATE_SHOP,
  STATE_REST,
  STATE_FINISHED,
  STATE_NAMES,
} from './constants';
import StartScreen from './components/screens/StartScreen';
import MapScreen from './components/screens/MapScreen';
import CombatScreen from './components/screens/CombatScreen';
import RewardScreen from './components/screens/RewardScreen';
import ShopScreen from './components/screens/ShopScreen';
import RestScreen from './components/screens/RestScreen';
import GameOverScreen from './components/screens/GameOverScreen';

export default function App() {
  const account = useCurrentAccount();
  const { sessionId, isLoading, error } = useGameStore();
  const { data: session } = useGameSession();
  const { data: player } = usePlayerEntity();

  const gameState = session?.state ?? -1;

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="header-title">⚔️ CARD CRAWLER</div>
        <div className="header-stats">
          {session && (
            <>
              <span className="header-stat">🏔️ Floor {session.floor}</span>
              <span className="header-stat">📍 {STATE_NAMES[gameState] ?? 'Unknown'}</span>
              {player && (
                <>
                  <span className="header-stat" style={{ color: 'var(--danger)' }}>
                    ❤️ {player.health.current}/{player.health.max}
                  </span>
                  <span className="header-stat" style={{ color: 'var(--gold)' }}>
                    💰 {player.gold}
                  </span>
                </>
              )}
            </>
          )}
          <ConnectButton />
        </div>
      </header>

      {/* Main content */}
      <div className="main-content">
        {/* Loading overlay */}
        {isLoading && <div className="loading-overlay">⏳ Processing transaction...</div>}

        {/* Error banner */}
        {error && <div className="error-banner">⚠️ {error}</div>}

        {/* State-machine router */}
        {!account ? (
          <div className="start-screen">
            <h1>⚔️ CARD CRAWLER</h1>
            <p>Connect your wallet to begin</p>
          </div>
        ) : !sessionId ? (
          <StartScreen />
        ) : gameState === STATE_MAP_SELECT ? (
          <MapScreen session={session!} player={player ?? null} />
        ) : gameState === STATE_COMBAT ? (
          <CombatScreen session={session!} player={player ?? null} />
        ) : gameState === STATE_REWARD ? (
          <RewardScreen session={session!} />
        ) : gameState === STATE_SHOP ? (
          <ShopScreen session={session!} player={player ?? null} />
        ) : gameState === STATE_REST ? (
          <RestScreen session={session!} player={player ?? null} />
        ) : gameState === STATE_FINISHED ? (
          <GameOverScreen session={session!} player={player ?? null} />
        ) : (
          <div className="panel">
            <p>Loading game state...</p>
          </div>
        )}
      </div>
    </>
  );
}
