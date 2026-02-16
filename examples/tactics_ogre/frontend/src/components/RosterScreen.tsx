import { useState } from 'react';
import { useRoster } from '../hooks/useRoster';
import { useEntities } from '../hooks/useEntity';
import { useGameActions } from '../hooks/useGameActions';
import { useActiveSession } from '../hooks/useActiveSession';
import { useUIStore } from '../stores/uiStore';
import { CLASSES, CLASS_SPRITES, CLASS_PORTRAITS, ELEMENT_NAMES, ELEMENT_EMOJI, STATE_COMBAT } from '../constants';
import { UnitProfilePanel } from './UnitProfilePanel';

export function RosterScreen() {
  const { data: roster } = useRoster();
  const { data: units } = useEntities(roster?.units ?? []);
  const { sellUnit, renameUnit, cancelSession } = useGameActions();
  const { data: activeSession, isLoading: sessionLoading } = useActiveSession();
  const { setScreen, setSessionContext } = useUIStore();

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  if (!roster) return <div className="screen-center">No roster found</div>;

  const profileUnit = units?.find((u) => u.id === profileId) ?? null;

  async function handleCancelSession() {
    if (!roster || !activeSession) return;
    setPending(true);
    setError(null);
    try {
      await cancelSession(activeSession.sessionId, roster.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel session');
    } finally {
      setPending(false);
    }
  }

  function handleResumeBattle() {
    if (!activeSession) return;
    setSessionContext(activeSession.sessionId, activeSession.gridId ?? '');
    if (activeSession.state === STATE_COMBAT) {
      setScreen('combat');
    } else {
      setScreen('placement');
    }
  }

  async function handleSell(entityId: string) {
    if (!roster || !confirm('Sell this unit? You\'ll get 50% refund.')) return;
    setPending(true);
    setError(null);
    try {
      await sellUnit(roster.id, entityId);
      setProfileId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPending(false);
    }
  }

  async function handleRename(entityId: string, name: string) {
    if (!name.trim()) return;
    setPending(true);
    setError(null);
    try {
      await renameUnit(entityId, name.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h2>YOUR ROSTER</h2>
        <span className="gold-badge">{roster.gold}G</span>
        <span className="unit-count">{roster.units.length}/6</span>
      </div>

      {error && <p className="error">{error}</p>}

      {/* In-battle warning */}
      {roster.inBattle && (
        <div className="warning-panel">
          <p className="warning" style={{ border: 'none', background: 'none', padding: 0 }}>
            ROSTER IN BATTLE
          </p>
          {sessionLoading ? (
            <p style={{ color: '#aaa', marginTop: '6px', fontSize: '10px' }}>
              Looking for session...
            </p>
          ) : activeSession ? (
            <div style={{ marginTop: '6px' }}>
              <p style={{ color: '#aaa', fontSize: '10px', marginBottom: '4px' }}>
                Session: <code>{activeSession.sessionId.slice(0, 16)}...</code>
              </p>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="btn-primary" onClick={handleResumeBattle}>
                  RESUME BATTLE
                </button>
                <button className="btn-danger" onClick={handleCancelSession} disabled={pending}>
                  {pending ? 'CANCELLING...' : 'CANCEL'}
                </button>
              </div>
            </div>
          ) : (
            <p style={{ color: '#aaa', marginTop: '6px', fontSize: '10px' }}>
              Could not find active session.
            </p>
          )}
        </div>
      )}

      <div className="roster-layout">
        {/* Left sidebar */}
        <div className="roster-sidebar">
          <button className="sidebar-btn" disabled>
            EQUIP
          </button>
          <button className="sidebar-btn" disabled>
            TALENT
          </button>
          <button className="sidebar-btn" disabled>
            MOVE
          </button>
          <div style={{ marginTop: 'auto', fontSize: '10px', color: 'var(--text-muted)', padding: '6px' }}>
            {roster.units.length}/6
          </div>
        </div>

        {/* Main portrait grid — pixel card style */}
        <div className="roster-main">
          <div className="portrait-grid">
            {units?.map((unit) => {
              const classInfo = CLASSES[unit.class];
              return (
                <div
                  key={unit.id}
                  className="portrait-cell"
                  onClick={() => setProfileId(unit.id)}
                >
                  {/* Top bar: class + element */}
                  <div className="portrait-top-bar">
                    <span className="class-label">{classInfo?.name}</span>
                    <span style={{ fontSize: '12px' }}>
                      {ELEMENT_EMOJI[unit.element]}
                    </span>
                  </div>

                  {/* Portrait area */}
                  <div className="portrait-sprite-area">
                    <img
                      src={CLASS_SPRITES[unit.class] || CLASS_PORTRAITS[unit.class]}
                      alt={classInfo?.name}
                      className="portrait-sprite"
                    />
                    <div className="portrait-element-badge">
                      {ELEMENT_EMOJI[unit.element]}
                    </div>
                    <div className="portrait-level-badge">
                      <span className="portrait-lv-label">Lv.</span>
                      <span className="portrait-lv-value">{Math.floor(unit.hp.max / 10)}</span>
                    </div>
                  </div>

                  {/* Name plate */}
                  <div className="portrait-name-plate">
                    <div className="portrait-name">
                      {unit.name || classInfo?.name}
                    </div>
                    <div className="portrait-class-label">
                      {classInfo?.name}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="portrait-stats">
                    {[
                      { key: 'str', label: 'STR', val: unit.atk, max: 25 },
                      { key: 'def', label: 'DEF', val: unit.def, max: 20 },
                      { key: 'spd', label: 'SPD', val: unit.speed, max: 6 },
                      { key: 'rng', label: 'RNG', val: unit.range, max: 5 },
                    ].map(({ key, label, val, max }) => (
                      <div key={key} className="portrait-stat-row">
                        <span className={`portrait-stat-label ${key}`}>{label}</span>
                        <div className="portrait-stat-bar">
                          <div
                            className={`portrait-stat-fill ${key}`}
                            style={{ width: `${(val / max) * 100}%` }}
                          />
                        </div>
                        <span className="portrait-stat-val">{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Bottom bar: ATK / HP */}
                  <div className="portrait-bottom-bar">
                    <div className="portrait-bottom-stat">
                      <div className="label atk">ATK</div>
                      <div className="value atk">{unit.atk}</div>
                    </div>
                    <div className="portrait-bottom-stat">
                      <div className="label hp">HP</div>
                      <div className="value hp">{unit.hp.max}</div>
                    </div>
                  </div>
                </div>
              );
            })}

            {roster.units.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                No units. Visit the Tavern!
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="screen-actions">
        <button className="btn-primary" onClick={() => setScreen('tavern')}>
          TAVERN
        </button>
        {roster.units.length > 0 && !roster.inBattle && (
          <button className="btn-primary" onClick={() => setScreen('lobby')}>
            FIND BATTLE
          </button>
        )}
      </div>

      {/* Profile detail modal */}
      {profileUnit && (
        <UnitProfilePanel
          unit={profileUnit}
          onClose={() => setProfileId(null)}
          onSell={(id) => handleSell(id)}
          onRename={(id, name) => handleRename(id, name)}
          canSell={!roster.inBattle}
          pending={pending}
        />
      )}
    </div>
  );
}
