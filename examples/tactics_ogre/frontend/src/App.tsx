import { useEffect } from 'react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit-react';
import { useUIStore } from './stores/uiStore';
import { useRoster } from './hooks/useRoster';
import { useGameSession } from './hooks/useGameSession';
import { useActiveSession } from './hooks/useActiveSession';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { RosterScreen } from './components/RosterScreen';
import { TavernScreen } from './components/TavernScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { PlacementScreen } from './components/PlacementScreen';
import { CombatScreen } from './components/CombatScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { STATE_PLACEMENT, STATE_COMBAT, STATE_FINISHED } from './constants';

function App() {
  const account = useCurrentAccount();
  useRoster(); // ensure roster is prefetched
  const screen = useUIStore((s) => s.screen);
  const setScreen = useUIStore((s) => s.setScreen);
  const sessionId = useUIStore((s) => s.sessionId);
  const gridId = useUIStore((s) => s.gridId);
  const setSessionContext = useUIStore((s) => s.setSessionContext);
  const { data: session } = useGameSession();
  const { data: activeSession } = useActiveSession();

  // Auto-set session context from discovered active session
  useEffect(() => {
    if (activeSession && (!sessionId || !gridId)) {
      setSessionContext(activeSession.sessionId, activeSession.gridId ?? '');
    }
  }, [activeSession, sessionId, gridId, setSessionContext]);

  // Auto-route based on session state changes
  if (session) {
    if (session.state === STATE_PLACEMENT && screen !== 'placement') {
      setScreen('placement');
    } else if (session.state === STATE_COMBAT && screen !== 'combat') {
      setScreen('combat');
    } else if (session.state === STATE_FINISHED && screen !== 'results') {
      setScreen('results');
    }
  }

  if (!account) {
    return (
      <div className="app">
        <div className="scanlines" />
        <Header />
        <div className="title-screen">
          <div className="title-logo">
            TACTICS<br />OGRE
          </div>
          <div className="title-subtitle">— ON-CHAIN —</div>
          <div style={{ height: '24px' }} />
          <div className="title-prompt">Connect wallet to begin</div>
          <div style={{ marginTop: '8px' }}><ConnectButton /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="scanlines" />
      <Header />
      <main className="main-content">
        {screen === 'home' && <HomeScreen />}
        {screen === 'roster' && <RosterScreen />}
        {screen === 'tavern' && <TavernScreen />}
        {screen === 'lobby' && <LobbyScreen />}
        {screen === 'placement' && <PlacementScreen />}
        {screen === 'combat' && <CombatScreen />}
        {screen === 'results' && <ResultsScreen />}
      </main>
    </div>
  );
}

export default App;
