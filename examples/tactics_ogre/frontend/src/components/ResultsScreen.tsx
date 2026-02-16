import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useRoster } from '../hooks/useRoster';
import { useGameSession } from '../hooks/useGameSession';
import { useGameActions } from '../hooks/useGameActions';
import { useUIStore } from '../stores/uiStore';

export function ResultsScreen() {
  const account = useCurrentAccount();
  const { data: roster } = useRoster();
  const { data: session } = useGameSession();
  const { claimRewards } = useGameActions();
  const { clearSessionContext, setScreen } = useUIStore();

  const [pending, setPending] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session || !account) return null;

  const isWinner = session.winner === account.address;

  async function handleClaim() {
    if (!roster) return;
    setPending(true);
    setError(null);
    try {
      await claimRewards(roster.id);
      setClaimed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to claim');
    } finally {
      setPending(false);
    }
  }

  function handleReturn() {
    clearSessionContext();
    setScreen('roster');
  }

  return (
    <div className="screen screen-center">
      <div className="results-banner">
        {isWinner ? (
          <>
            <h1>VICTORY</h1>
            <p style={{ color: 'var(--text-dark)', marginBottom: '8px' }}>You emerged triumphant.</p>
            <p className="reward-text">+150G REWARD</p>
          </>
        ) : (
          <>
            <h1 className="defeat">DEFEAT</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Your forces have fallen.</p>
            <p className="reward-text" style={{ color: 'var(--text-muted)' }}>+50G CONSOLATION</p>
          </>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="screen-actions">
        {!claimed ? (
          <button className="btn-primary" onClick={handleClaim} disabled={pending}>
            {pending ? 'CLAIMING...' : 'CLAIM REWARDS'}
          </button>
        ) : (
          <button className="btn-primary" onClick={handleReturn}>
            RETURN TO ROSTER
          </button>
        )}
      </div>
    </div>
  );
}
