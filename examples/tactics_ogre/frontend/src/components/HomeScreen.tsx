import { useState } from 'react';
import { useRoster } from '../hooks/useRoster';
import { useGameActions } from '../hooks/useGameActions';
import { useUIStore } from '../stores/uiStore';

export function HomeScreen() {
  const { data: roster, isLoading } = useRoster();
  const { createRoster } = useGameActions();
  const setScreen = useUIStore((s) => s.setScreen);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <div className="screen-center">Loading...</div>;

  if (roster) {
    setScreen('roster');
    return null;
  }

  async function handleCreate() {
    setPending(true);
    setError(null);
    try {
      await createRoster();
      setScreen('roster');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create roster');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="title-screen">
      <div className="title-logo">
        TACTICS<br />OGRE
      </div>
      <div className="title-subtitle">— ON-CHAIN —</div>
      <div style={{ height: '32px' }} />
      {error && <p className="error">{error}</p>}
      <button className="btn-primary" onClick={handleCreate} disabled={pending}
        style={{ fontSize: '13px', padding: '12px 28px' }}>
        {pending ? 'Creating...' : 'CREATE ROSTER'}
      </button>
      <div className="title-prompt">Build your squad. Fight to the death.</div>
    </div>
  );
}
