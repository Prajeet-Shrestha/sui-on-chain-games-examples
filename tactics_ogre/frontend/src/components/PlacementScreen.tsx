import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useRoster } from '../hooks/useRoster';
import { useEntities } from '../hooks/useEntity';
import { useGameSession } from '../hooks/useGameSession';
import { useGameActions } from '../hooks/useGameActions';
import { useUIStore } from '../stores/uiStore';
import { CLASSES, CLASS_PORTRAITS, CLASS_SPRITES } from '../constants';

type Placement = { entityId: string; x: number; y: number };

export function PlacementScreen() {
  const account = useCurrentAccount();
  const { data: roster } = useRoster();
  const { data: session } = useGameSession();
  const { placeAllUnits } = useGameActions();
  const { gridId } = useUIStore();
  const { data: units } = useEntities(roster?.units ?? []);

  const [placements, setPlacements] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session || !roster || !account) return null;

  const playerIndex = session.players.indexOf(account.address);
  const myUnits = playerIndex === 0 ? session.p1Units : session.p2Units;
  const amReady = playerIndex === 0 ? session.p1Ready : session.p2Ready;
  const opponentReady = playerIndex === 0 ? session.p2Ready : session.p1Ready;
  const maxUnits = session.maxUnitsPerPlayer;

  const myZoneRows = playerIndex === 0 ? [0, 1] : [6, 7];
  const opponentZoneRows = playerIndex === 0 ? [6, 7] : [0, 1];

  const cellToUnit = new Map<string, string>();
  placements.forEach(({ x, y }, unitId) => {
    cellToUnit.set(`${x},${y}`, unitId);
  });

  function handleCellClick(x: number, y: number) {
    if (amReady || myUnits.length > 0) return;

    const cellKey = `${x},${y}`;
    const existingUnit = cellToUnit.get(cellKey);

    if (existingUnit) {
      setPlacements((prev) => {
        const next = new Map(prev);
        next.delete(existingUnit);
        return next;
      });
      return;
    }

    if (!selectedUnit) {
      setError('Select a unit first');
      return;
    }
    if (!myZoneRows.includes(y)) {
      setError('Place in your zone only');
      return;
    }
    if (placements.size >= maxUnits) {
      setError(`Max ${maxUnits} units`);
      return;
    }

    setError(null);
    setPlacements((prev) => {
      const next = new Map(prev);
      next.set(selectedUnit, { x, y });
      return next;
    });
    setSelectedUnit(null);
  }

  async function handlePlace() {
    if (placements.size === 0) return;
    if (!session?.id || !gridId) {
      setError('Discovering battle grid... try again in a moment.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const batch: Placement[] = [];
      placements.forEach(({ x, y }, entityId) => {
        batch.push({ entityId, x, y });
      });
      await placeAllUnits(session.id, gridId, batch);
      setPlacements(new Map());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Placement failed');
    } finally {
      setPending(false);
    }
  }

  const assignedIds = new Set(placements.keys());
  const unplacedUnits = units?.filter((u) => !assignedIds.has(u.id)) ?? [];
  const unitById = new Map(units?.map((u) => [u.id, u]) ?? []);

  return (
    <div className="screen">
      <div className="screen-header">
        <h2>PLACE UNITS</h2>
        <span style={{ fontSize: '12px', color: 'var(--text-gold)' }}>
          {placements.size}/{maxUnits} placed
        </span>
      </div>

      {error && <p className="error">{error}</p>}

      {amReady && (
        <p className="status-text">
          READY. {opponentReady ? 'Starting combat...' : 'Waiting for opponent...'}
        </p>
      )}

      <div className="grid-container">
        {Array.from({ length: 8 }, (_, y) => (
          <div key={y} className="grid-row">
            {Array.from({ length: 8 }, (_, x) => {
              const isMyZone = myZoneRows.includes(y);
              const isOpponentZone = opponentZoneRows.includes(y);
              const unitOnCell = cellToUnit.get(`${x},${y}`);
              const unit = unitOnCell ? unitById.get(unitOnCell) : null;

              return (
                <div
                  key={`${x}-${y}`}
                  className={`grid-cell ${isMyZone ? 'my-zone' : ''} ${isOpponentZone ? 'opponent-zone' : ''} ${unitOnCell ? 'occupied' : ''}`}
                  onClick={() => handleCellClick(x, y)}
                  title={unit ? `${unit.name || CLASSES[unit.class]?.name}` : `${x},${y}`}
                  style={{ cursor: isMyZone && !amReady ? 'pointer' : 'default' }}
                >
                  {unit ? (
                    <div className="cell-unit">
                      <img
                        src={CLASS_PORTRAITS[unit.class]}
                        alt={CLASSES[unit.class]?.name}
                        className="portrait-img-sm"
                        style={{
                          border: 'none',
                          filter: 'drop-shadow(0 0 4px rgba(88,136,224,0.4))',
                        }}
                      />
                      <span className="cell-unit-name">
                        {(unit.name || CLASSES[unit.class]?.name).slice(0, 4)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <span className="cell-coord">{x},{y}</span>
                      {isMyZone && !amReady && selectedUnit && (
                        <span style={{ fontSize: '14px', color: 'var(--green)', opacity: 0.5 }}>+</span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {!amReady && myUnits.length === 0 && unplacedUnits.length > 0 && (
        <div className="unplaced-units">
          <h3>Select unit:</h3>
          <div className="unit-selector">
            {unplacedUnits.map((u) => (
              <button
                key={u.id}
                className={`unit-select-btn ${selectedUnit === u.id ? 'selected' : ''}`}
                onClick={() => setSelectedUnit(u.id)}
              >
                <img
                  src={CLASS_SPRITES[u.class] || CLASS_PORTRAITS[u.class]}
                  alt={CLASSES[u.class]?.name}
                  style={{
                    width: '48px',
                    height: '48px',
                    imageRendering: 'pixelated',
                    objectFit: 'contain',
                    border: '2px solid var(--panel-border-dark)',
                    background: '#0e0a14',
                  }}
                />
                <span style={{ color: 'var(--text-gold)', fontSize: '10px' }}>
                  {u.name || CLASSES[u.class]?.name}
                </span>
                <small>HP:{u.hp.max} ATK:{u.atk}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="screen-actions">
        {!amReady && myUnits.length === 0 && placements.size > 0 && (
          <button
            className="btn-primary"
            onClick={handlePlace}
            disabled={pending}
          >
            {pending ? 'PLACING...' : `PLACE ${placements.size} UNIT${placements.size > 1 ? 'S' : ''} & READY`}
          </button>
        )}
      </div>
    </div>
  );
}
