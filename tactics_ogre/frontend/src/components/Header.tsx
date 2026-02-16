import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit-react';
import { formatAddress } from '@mysten/sui/utils';
import { useRoster } from '../hooks/useRoster';
import { useUIStore } from '../stores/uiStore';

export function Header() {
  const account = useCurrentAccount();
  const { data: roster } = useRoster();
  const screen = useUIStore((s) => s.screen);
  const setScreen = useUIStore((s) => s.setScreen);

  return (
    <header className="header">
      <div className="header-left">
        <span className="logo" onClick={() => setScreen(roster ? 'roster' : 'home')}>
          TACTICS OGRE
        </span>
        {account && roster && (
          <nav className="nav">
            <button
              className={screen === 'roster' ? 'active' : ''}
              onClick={() => setScreen('roster')}
            >
              ROSTER
            </button>
            <button
              className={screen === 'tavern' ? 'active' : ''}
              onClick={() => setScreen('tavern')}
            >
              TAVERN
            </button>
            <button
              className={screen === 'lobby' ? 'active' : ''}
              onClick={() => setScreen('lobby')}
            >
              BATTLE
            </button>
          </nav>
        )}
      </div>
      <div className="header-right">
        {roster && (
          <span className="gold-display">{roster.gold}G</span>
        )}
        {account && (
          <span className="address">{formatAddress(account.address)}</span>
        )}
        <ConnectButton />
      </div>
    </header>
  );
}
