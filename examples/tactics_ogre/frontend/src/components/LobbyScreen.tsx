import { useState } from 'react';
import { useRoster } from '../hooks/useRoster';
import { useGameActions } from '../hooks/useGameActions';
import { useGameSession } from '../hooks/useGameSession';
import { useUIStore } from '../stores/uiStore';
import { suiClient } from '../lib/suiClient';
import { PACKAGE_ID } from '../constants';

export function LobbyScreen() {
  const { data: roster } = useRoster();
  const { createSession, joinSession, cancelSession } = useGameActions();
  const { data: session } = useGameSession();
  const { setSessionContext, setScreen } = useUIStore();

  const [maxUnits, setMaxUnits] = useState(2);
  const [joinId, setJoinId] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!roster) return null;

  async function handleCreate() {
    if (!roster) return;
    setPending(true);
    setError(null);
    try {
      const { sessionId, gridId } = await createSession(roster.id, maxUnits);
      if (sessionId) {
        setSessionContext(sessionId, gridId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPending(false);
    }
  }

  /** Discover gridId from the SessionCreated event's transaction */
  async function discoverGridId(sId: string): Promise<string> {
    try {
      const events = await suiClient.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::game::SessionCreated` },
        order: 'descending',
        limit: 20,
      });
      const matchingEvent = events.data?.find((e: any) =>
        (e.parsedJson as any)?.session_id === sId,
      );
      if (matchingEvent) {
        const txDigest = matchingEvent.id?.txDigest;
        if (txDigest) {
          const txResult = await suiClient.getTransactionBlock({
            digest: txDigest,
            options: { showEffects: true },
          });
          const created = (txResult as any)?.effects?.created ?? [];
          for (const obj of created) {
            const objId = obj?.reference?.objectId;
            if (objId && objId !== sId) {
              return objId; // The other created object is the Grid
            }
          }
        }
      }
    } catch {
      // Grid discovery is best-effort
    }
    return '';
  }

  async function handleJoin() {
    if (!roster || !joinId.trim()) return;
    setPending(true);
    setError(null);
    try {
      await joinSession(joinId.trim(), roster.id);
      // Discover gridId from the session creation transaction
      const gridId = await discoverGridId(joinId.trim());
      setSessionContext(joinId.trim(), gridId);
      setScreen('placement');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPending(false);
    }
  }

  async function handleCancel() {
    if (!session || !roster) return;
    setPending(true);
    setError(null);
    try {
      await cancelSession(session.id, roster.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPending(false);
    }
  }

  if (session) {
    return (
      <div className="screen">
        <div className="screen-header">
          <h2>LOBBY — WAITING</h2>
        </div>
        <div className="lobby-info">
          <p>Session: <code>{session.id.slice(0, 16)}...</code></p>
          <p>Players: {session.players.length}/2</p>
          <p>Units per player: {session.maxUnitsPerPlayer}</p>
          <p style={{ marginTop: '8px', fontSize: '10px' }}>
            Share this ID:
            <code className="session-id">{session.id}</code>
          </p>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="screen-actions">
          <button className="btn-danger" onClick={handleCancel} disabled={pending}>
            {pending ? 'CANCELLING...' : 'CANCEL SESSION'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h2>BATTLE LOBBY</h2>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="lobby-sections">
        <div className="lobby-section">
          <h3 style={{ fontSize: '13px' }}>CREATE SESSION</h3>
          <label>
            Units per player:
            <select value={maxUnits} onChange={(e) => setMaxUnits(Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={pending || roster.inBattle || roster.units.length === 0}
          >
            {pending ? 'CREATING...' : 'CREATE'}
          </button>
        </div>

        <div className="lobby-divider">OR</div>

        <div className="lobby-section">
          <h3 style={{ fontSize: '13px' }}>JOIN SESSION</h3>
          <input
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="Paste session ID (0x...)"
          />
          <button
            className="btn-primary"
            onClick={handleJoin}
            disabled={pending || !joinId.trim() || roster.inBattle}
          >
            {pending ? 'JOINING...' : 'JOIN'}
          </button>
        </div>
      </div>

      <div className="screen-actions">
        <button onClick={() => setScreen('roster')}>BACK TO ROSTER</button>
      </div>
    </div>
  );
}
