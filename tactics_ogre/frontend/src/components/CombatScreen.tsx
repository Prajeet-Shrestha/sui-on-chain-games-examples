import { useState, useMemo } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useGameSession } from '../hooks/useGameSession';
import { useEntities } from '../hooks/useEntity';
import { useGameActions } from '../hooks/useGameActions';
import type { TurnAction } from '../hooks/useGameActions';
import { useUIStore } from '../stores/uiStore';

import { CLASSES, CLASS_SPRITES, CLASS_PORTRAITS, ELEMENT_EMOJI, ELEMENT_NAMES, AP_MOVE, AP_ATTACK, AP_SPECIAL, AP_PER_TURN } from '../constants';
import type { UnitState } from '../lib/types';

interface SimUnit extends UnitState {
  simAp: number;
  simX: number;
  simY: number;
}

export function CombatScreen() {
  const account = useCurrentAccount();
  const { data: session } = useGameSession();
  const { executeTurn, surrender } = useGameActions();
  const gridId = useUIStore((s) => s.gridId);

  const allUnitIds = [
    ...(session?.p1Units ?? []),
    ...(session?.p2Units ?? []),
  ];
  const { data: allUnits } = useEntities(allUnitIds);

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<'move' | 'attack' | 'special' | null>(null);
  const [actionQueue, setActionQueue] = useState<TurnAction[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session || !account) return null;

  if (!gridId) {
    return (
      <div className="screen combat-screen">
        <div className="screen-header"><h2>COMBAT</h2></div>
        <p className="status-text">Discovering battle grid...</p>
      </div>
    );
  }

  const playerIndex = session.players.indexOf(account.address);
  const isMyTurn = session.currentTurn === playerIndex;
  const myUnitIds = new Set(playerIndex === 0 ? session.p1Units : session.p2Units);
  const enemyUnitIds = new Set(playerIndex === 0 ? session.p2Units : session.p1Units);

  const simUnits: SimUnit[] = useMemo(() => {
    if (!allUnits) return [];
    const sims: SimUnit[] = allUnits.map((u) => ({
      ...u,
      simAp: myUnitIds.has(u.id) && isMyTurn ? AP_PER_TURN : u.ap.current,
      simX: u.position.x,
      simY: u.position.y,
    }));

    for (const action of actionQueue) {
      const unit = sims.find((u) => u.id === action.unitId);
      if (!unit) continue;
      switch (action.type) {
        case 'move': {
          const dist = Math.abs(action.toX - unit.simX) + Math.abs(action.toY - unit.simY);
          unit.simAp -= dist * AP_MOVE;
          unit.simX = action.toX;
          unit.simY = action.toY;
          break;
        }
        case 'attack':
          unit.simAp -= AP_ATTACK;
          break;
        case 'special':
          unit.simAp -= AP_SPECIAL;
          break;
      }
    }
    return sims;
  }, [allUnits, actionQueue, isMyTurn]);

  const unitMap = new Map<string, SimUnit>();
  simUnits.forEach((u) => unitMap.set(`${u.simX},${u.simY}`, u));
  const unitById = new Map<string, SimUnit>();
  simUnits.forEach((u) => unitById.set(u.id, u));

  const selectedUnit = selectedUnitId ? unitById.get(selectedUnitId) ?? null : null;

  function handleCellClick(x: number, y: number) {
    if (!isMyTurn) return;
    const targetUnit = unitMap.get(`${x},${y}`);

    if (targetUnit && myUnitIds.has(targetUnit.id) && targetUnit.hp.current > 0) {
      setSelectedUnitId(targetUnit.id);
      setActionMode(null);
      setError(null);
      return;
    }

    if (!selectedUnit || !actionMode) return;

    if (actionMode === 'move') {
      if (targetUnit) { setError('Cell occupied'); return; }
      const dist = Math.abs(x - selectedUnit.simX) + Math.abs(y - selectedUnit.simY);
      if (dist > selectedUnit.speed) { setError(`Too far (max ${selectedUnit.speed})`); return; }
      const apCost = dist * AP_MOVE;
      if (selectedUnit.simAp < apCost) { setError(`Need ${apCost} AP`); return; }
      setError(null);
      setActionQueue((q) => [...q, { type: 'move', unitId: selectedUnit.id, toX: x, toY: y }]);
      setActionMode(null);
    } else if (actionMode === 'attack' && targetUnit) {
      if (!enemyUnitIds.has(targetUnit.id)) { setError('Target enemies only'); return; }
      const dist = Math.abs(targetUnit.simX - selectedUnit.simX) + Math.abs(targetUnit.simY - selectedUnit.simY);
      if (dist > selectedUnit.range) { setError(`Out of range (${selectedUnit.range})`); return; }
      if (selectedUnit.simAp < AP_ATTACK) { setError(`Need ${AP_ATTACK} AP`); return; }
      setError(null);
      setActionQueue((q) => [...q, { type: 'attack', unitId: selectedUnit.id, targetId: targetUnit.id }]);
      setActionMode(null);
    } else if (actionMode === 'special' && targetUnit) {
      const dist = Math.abs(targetUnit.simX - selectedUnit.simX) + Math.abs(targetUnit.simY - selectedUnit.simY);
      if (dist > selectedUnit.range) { setError(`Out of range (${selectedUnit.range})`); return; }
      if (selectedUnit.simAp < AP_SPECIAL) { setError(`Need ${AP_SPECIAL} AP`); return; }
      setError(null);
      setActionQueue((q) => [...q, { type: 'special', unitId: selectedUnit.id, targetId: targetUnit.id }]);
      setActionMode(null);
    }
  }

  function handleUndo() { setActionQueue((q) => q.slice(0, -1)); setError(null); }
  function handleClearAll() { setActionQueue([]); setError(null); setSelectedUnitId(null); setActionMode(null); }

  async function handleEndTurn() {
    setPending(true); setError(null);
    try {
      const myAliveIds = simUnits.filter((u) => myUnitIds.has(u.id) && u.hp.current > 0).map((u) => u.id);
      await executeTurn(myAliveIds, actionQueue);
      setActionQueue([]); setSelectedUnitId(null); setActionMode(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Turn failed'); }
    finally { setPending(false); }
  }

  async function handleSurrender() {
    if (!confirm('Surrender?')) return;
    setPending(true);
    try { await surrender(); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setPending(false); }
  }

  function formatAction(action: TurnAction, i: number): string {
    const unit = unitById.get(action.unitId);
    const name = unit ? (unit.name || CLASSES[unit.class]?.name) : '?';
    switch (action.type) {
      case 'move': return `${i + 1}. ${name} → (${action.toX},${action.toY})`;
      case 'attack': { const t = unitById.get(action.targetId); return `${i + 1}. ${name} ATK ${t ? (t.name || CLASSES[t.class]?.name) : '?'}`; }
      case 'special': { const t = unitById.get(action.targetId); return `${i + 1}. ${name} SPL ${t ? (t.name || CLASSES[t.class]?.name) : '?'}`; }
    }
  }

  function getHpClass(current: number, max: number): string {
    const pct = current / max;
    if (pct > 0.5) return 'high';
    if (pct > 0.25) return 'medium';
    return 'low';
  }

  return (
    <div className="screen combat-screen">
      <div className="screen-header">
        <h2>COMBAT — TURN {session.turnNumber + 1}</h2>
        <span className={`turn-indicator ${isMyTurn ? 'my-turn' : 'opponent-turn'}`}>
          {isMyTurn ? '▶ YOUR TURN' : '⏳ OPPONENT'}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          P1:{session.p1AliveCount} P2:{session.p2AliveCount}
        </span>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="combat-layout">
        {/* Grid */}
        <div className="grid-container">
          {Array.from({ length: 8 }, (_, y) => (
            <div key={y} className="grid-row">
              {Array.from({ length: 8 }, (_, x) => {
                const unit = unitMap.get(`${x},${y}`);
                const isMine = unit && myUnitIds.has(unit.id);
                const isEnemy = unit && enemyUnitIds.has(unit.id);
                const isSelected = unit?.id === selectedUnitId;
                const isDead = unit && unit.hp.current <= 0;

                let isValidTarget = false;
                let targetType = '';
                if (selectedUnit && actionMode === 'move' && !unit) {
                  const dist = Math.abs(x - selectedUnit.simX) + Math.abs(y - selectedUnit.simY);
                  isValidTarget = dist <= selectedUnit.speed && dist * AP_MOVE <= selectedUnit.simAp;
                  targetType = 'valid-target';
                }
                if (selectedUnit && (actionMode === 'attack' || actionMode === 'special') && unit && isEnemy && !isDead) {
                  const dist = Math.abs(unit.simX - selectedUnit.simX) + Math.abs(unit.simY - selectedUnit.simY);
                  isValidTarget = dist <= selectedUnit.range;
                  targetType = 'valid-target-atk';
                }

                return (
                  <div
                    key={`${x}-${y}`}
                    className={`grid-cell combat-cell 
                      ${unit ? 'occupied' : ''} 
                      ${isMine ? 'friendly' : ''} 
                      ${isEnemy ? 'enemy' : ''} 
                      ${isSelected ? 'selected' : ''}
                      ${isDead ? 'dead' : ''}
                      ${isValidTarget ? targetType : ''}`}
                    onClick={() => handleCellClick(x, y)}
                  >
                    {unit && !isDead && (
                      <div className="cell-unit">
                        <img
                          src={CLASS_PORTRAITS[unit.class]}
                          alt={CLASSES[unit.class]?.name}
                          className="portrait-img-sm"
                          style={{
                            border: 'none',
                            filter: isEnemy
                              ? 'drop-shadow(0 0 4px rgba(224,72,72,0.4))'
                              : 'drop-shadow(0 0 4px rgba(88,136,224,0.4))',
                          }}
                        />
                        <div className="unit-hp-bar">
                          <div
                            className={`hp-fill ${getHpClass(unit.hp.current, unit.hp.max)}`}
                            style={{ width: `${(unit.hp.current / unit.hp.max) * 100}%` }}
                          />
                        </div>
                        <span className="cell-unit-name">
                          {(unit.name || CLASSES[unit.class]?.name).slice(0, 6)}
                        </span>
                        {isMine && <span className="ap-badge">{unit.simAp}</span>}
                      </div>
                    )}
                    {unit && isDead && <span className="skull">💀</span>}
                    {!unit && <span className="cell-coord">{x},{y}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="combat-sidebar">
          {selectedUnit && (
            <div className="unit-detail">
              {/* Unit header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '2px solid var(--panel-border-dark)' }}>
                <img
                  src={CLASS_SPRITES[selectedUnit.class] || CLASS_PORTRAITS[selectedUnit.class]}
                  alt={CLASSES[selectedUnit.class]?.name}
                  style={{ width: '40px', height: '40px', imageRendering: 'pixelated', objectFit: 'contain' }}
                />
                <div>
                  <h3 style={{ margin: 0 }}>{selectedUnit.name || CLASSES[selectedUnit.class]?.name}</h3>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                    {CLASSES[selectedUnit.class]?.name} • {myUnitIds.has(selectedUnit.id) ? 'ALLY' : 'ENEMY'}
                  </div>
                </div>
              </div>

              {/* HP/AP bars */}
              <div className="detail-stats">
                <div className="stat-row">
                  <span className="stat-label" style={{ color: 'var(--red)' }}>HP</span>
                  <div className="stat-bar">
                    <div className="stat-bar-fill hp" style={{ width: `${(selectedUnit.hp.current / selectedUnit.hp.max) * 100}%` }} />
                  </div>
                  <span className="stat-value">{selectedUnit.hp.current}/{selectedUnit.hp.max}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label" style={{ color: 'var(--mp-blue)' }}>AP</span>
                  <div className="stat-bar">
                    <div className="stat-bar-fill mp" style={{ width: `${(selectedUnit.simAp / AP_PER_TURN) * 100}%` }} />
                  </div>
                  <span className="stat-value">{selectedUnit.simAp}/{AP_PER_TURN}</span>
                </div>

                {/* Core stats */}
                <div style={{ display: 'flex', gap: '12px', fontSize: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--elem-fire)' }}>STR:{selectedUnit.atk}</span>
                  <span style={{ color: 'var(--elem-water)' }}>DEF:{selectedUnit.def}</span>
                  <span style={{ color: 'var(--elem-wind)' }}>SPD:{selectedUnit.speed}</span>
                  <span style={{ color: 'var(--elem-earth)' }}>RNG:{selectedUnit.range}</span>
                </div>
                <p style={{ marginTop: '4px' }}>{ELEMENT_EMOJI[selectedUnit.element]} {ELEMENT_NAMES[selectedUnit.element]}</p>
              </div>

              {/* Actions */}
              {isMyTurn && myUnitIds.has(selectedUnit.id) && selectedUnit.hp.current > 0 && (
                <div className="action-buttons" style={{ flexDirection: 'column' }}>
                  <button
                    className={`action-move ${actionMode === 'move' ? 'active' : ''}`}
                    onClick={() => setActionMode(actionMode === 'move' ? null : 'move')}
                    disabled={pending || selectedUnit.simAp < AP_MOVE}
                  >
                    <span>▶ MOVE</span>
                    <span style={{ fontSize: '10px', opacity: 0.6 }}>({AP_MOVE}AP, {selectedUnit.speed} tiles)</span>
                  </button>
                  <button
                    className={`action-atk ${actionMode === 'attack' ? 'active' : ''}`}
                    onClick={() => setActionMode(actionMode === 'attack' ? null : 'attack')}
                    disabled={pending || selectedUnit.simAp < AP_ATTACK}
                  >
                    <span>▶ ATTACK</span>
                    <span style={{ fontSize: '10px', opacity: 0.6 }}>({AP_ATTACK}AP, ATK {selectedUnit.atk})</span>
                  </button>
                  <button
                    className={`action-special ${actionMode === 'special' ? 'active' : ''}`}
                    onClick={() => setActionMode(actionMode === 'special' ? null : 'special')}
                    disabled={pending || selectedUnit.simAp < AP_SPECIAL}
                  >
                    <span>◈ SPECIAL</span>
                    <span style={{ fontSize: '10px', opacity: 0.6 }}>({AP_SPECIAL}AP)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {!selectedUnit && isMyTurn && (
            <p className="hint">Click a unit to select</p>
          )}

          {/* Action Queue */}
          {isMyTurn && actionQueue.length > 0 && (
            <div className="action-queue">
              <h4>PLANNED ({actionQueue.length})</h4>
              <div style={{ fontSize: '10px', lineHeight: '1.8', fontFamily: 'var(--font-ui)' }}>
                {actionQueue.map((action, i) => (
                  <div key={i} style={{ color: 'var(--text-dark)', borderBottom: '1px solid rgba(42,34,54,0.5)', padding: '2px 0' }}>
                    {formatAction(action, i)}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                <button onClick={handleUndo} disabled={pending}>UNDO</button>
                <button onClick={handleClearAll} disabled={pending}>CLEAR</button>
              </div>
            </div>
          )}

          {/* Turn Actions */}
          {isMyTurn && (
            <div className="turn-actions">
              <button
                className="btn-primary"
                onClick={handleEndTurn}
                disabled={pending}
                style={{ width: '100%' }}
              >
                {pending
                  ? 'SUBMITTING...'
                  : actionQueue.length > 0
                    ? `SUBMIT ${actionQueue.length} ACTION${actionQueue.length > 1 ? 'S' : ''}`
                    : 'END TURN'}
              </button>
              <button
                className="btn-danger"
                onClick={handleSurrender}
                disabled={pending}
                style={{ width: '100%' }}
              >
                SURRENDER
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="legend-panel">
            <p>
              🟢 Move target &nbsp; 🔴 Attack target &nbsp; 🔷 AP remaining
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
