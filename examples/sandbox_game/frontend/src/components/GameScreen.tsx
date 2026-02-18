import { useCallback } from 'react';
import type { GameSession } from '../lib/types';
import {
    GRID_SIZE, CELL_SIZE,
    BLOCK_COLORS, BLOCK_ICONS, BLOCK_NAMES,
    BLOCK_EMPTY, BLOCK_PLACED_DIRT, BLOCK_PLACED_WOOD, BLOCK_PLACED_STONE,
    DIR_UP, DIR_DOWN, DIR_LEFT, DIR_RIGHT,
} from '../constants';
import { useGameActions } from '../hooks/useGameActions';
import { useGameStore, type ActionMode } from '../stores/gameStore';
import Inventory from './Inventory';

interface Props {
    session: GameSession;
}

export default function GameScreen({ session }: Props) {
    const { movePlayer, mineBlock, placeBlock } = useGameActions();
    const { actionMode, setActionMode, selectedBlockType, setSelectedBlockType, isLoading } = useGameStore();

    // Is the cell adjacent to the player? (Manhattan distance == 1)
    const isAdjacent = useCallback((x: number, y: number) => {
        const dx = Math.abs(x - session.playerX);
        const dy = Math.abs(y - session.playerY);
        return dx + dy === 1;
    }, [session.playerX, session.playerY]);

    // Handle cell click based on action mode
    async function handleCellClick(x: number, y: number) {
        if (isLoading) return;

        const idx = y * GRID_SIZE + x;
        const blockType = session.grid[idx];

        if (actionMode === 'move') {
            // Calculate direction from player to clicked cell
            if (!isAdjacent(x, y)) return;
            if (blockType !== BLOCK_EMPTY) return;

            let dir: number;
            if (y < session.playerY) dir = DIR_UP;
            else if (y > session.playerY) dir = DIR_DOWN;
            else if (x < session.playerX) dir = DIR_LEFT;
            else dir = DIR_RIGHT;

            try { await movePlayer(dir); } catch { }
        } else if (actionMode === 'mine') {
            if (!isAdjacent(x, y)) return;
            if (blockType === BLOCK_EMPTY) return;
            try { await mineBlock(x, y); } catch { }
        } else if (actionMode === 'place') {
            if (!isAdjacent(x, y)) return;
            if (blockType !== BLOCK_EMPTY) return;
            try { await placeBlock(x, y, selectedBlockType); } catch { }
        }
    }

    // Keyboard movement
    function handleKeyDown(e: React.KeyboardEvent) {
        if (isLoading || actionMode !== 'move') return;
        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W': movePlayer(DIR_UP).catch(() => { }); break;
            case 'ArrowDown': case 's': case 'S': movePlayer(DIR_DOWN).catch(() => { }); break;
            case 'ArrowLeft': case 'a': case 'A': movePlayer(DIR_LEFT).catch(() => { }); break;
            case 'ArrowRight': case 'd': case 'D': movePlayer(DIR_RIGHT).catch(() => { }); break;
        }
    }

    // Get cell class for highlighting
    function getCellClass(x: number, y: number) {
        const classes: string[] = ['grid-cell'];
        const idx = y * GRID_SIZE + x;
        const block = session.grid[idx];

        if (x === session.playerX && y === session.playerY) {
            classes.push('player-cell');
        } else if (isAdjacent(x, y)) {
            if (actionMode === 'mine' && block !== BLOCK_EMPTY) {
                classes.push('adjacent-mine');
            } else if (actionMode === 'place' && block === BLOCK_EMPTY) {
                classes.push('adjacent-place');
            } else if (actionMode === 'move' && block === BLOCK_EMPTY) {
                classes.push('adjacent-move');
            }
        }

        if (block !== BLOCK_EMPTY) {
            classes.push('has-block');
        }

        return classes.join(' ');
    }

    const placeable = [
        { type: BLOCK_PLACED_DIRT, name: 'Dirt', icon: '🟫', matIdx: 0 },
        { type: BLOCK_PLACED_WOOD, name: 'Wood', icon: '🪵', matIdx: 1 },
        { type: BLOCK_PLACED_STONE, name: 'Stone', icon: '🧱', matIdx: 2 },
    ];

    return (
        <div className="game-layout" onKeyDown={handleKeyDown} tabIndex={0}>
            {/* Left: Game Grid */}
            <div className="grid-container">
                {/* Action Mode Toolbar */}
                <div className="action-toolbar">
                    <button
                        className={`action-btn ${actionMode === 'move' ? 'active' : ''}`}
                        onClick={() => setActionMode('move')}
                    >
                        🚶 Move
                    </button>
                    <button
                        className={`action-btn ${actionMode === 'mine' ? 'active' : ''}`}
                        onClick={() => setActionMode('mine')}
                    >
                        ⛏️ Mine
                    </button>
                    <button
                        className={`action-btn ${actionMode === 'place' ? 'active' : ''}`}
                        onClick={() => setActionMode('place')}
                    >
                        🧱 Place
                    </button>

                    {actionMode === 'place' && (
                        <div className="block-selector">
                            {placeable.map((b) => (
                                <button
                                    key={b.type}
                                    className={`block-btn ${selectedBlockType === b.type ? 'selected' : ''} ${session.inventory[b.matIdx] === 0 ? 'empty' : ''}`}
                                    onClick={() => setSelectedBlockType(b.type)}
                                    title={`${b.name} (${session.inventory[b.matIdx]})`}
                                >
                                    {b.icon} {session.inventory[b.matIdx]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* D-Pad for mobile */}
                <div className="dpad">
                    <button className="dpad-btn up" onClick={() => movePlayer(DIR_UP).catch(() => { })} disabled={isLoading}>▲</button>
                    <div className="dpad-row">
                        <button className="dpad-btn left" onClick={() => movePlayer(DIR_LEFT).catch(() => { })} disabled={isLoading}>◄</button>
                        <button className="dpad-btn center" disabled>🧍</button>
                        <button className="dpad-btn right" onClick={() => movePlayer(DIR_RIGHT).catch(() => { })} disabled={isLoading}>►</button>
                    </div>
                    <button className="dpad-btn down" onClick={() => movePlayer(DIR_DOWN).catch(() => { })} disabled={isLoading}>▼</button>
                </div>

                {/* Grid */}
                <div
                    className="game-grid"
                    style={{
                        gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
                        gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
                    }}
                >
                    {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, idx) => {
                        const x = idx % GRID_SIZE;
                        const y = Math.floor(idx / GRID_SIZE);
                        const block = session.grid[idx];
                        const isPlayer = x === session.playerX && y === session.playerY;

                        return (
                            <div
                                key={idx}
                                className={getCellClass(x, y)}
                                style={{
                                    backgroundColor: block !== BLOCK_EMPTY ? BLOCK_COLORS[block] : undefined,
                                    width: CELL_SIZE,
                                    height: CELL_SIZE,
                                }}
                                onClick={() => handleCellClick(x, y)}
                                title={isPlayer ? 'You' : block !== BLOCK_EMPTY ? BLOCK_NAMES[block] : `(${x}, ${y})`}
                            >
                                {isPlayer ? (
                                    <span className="player-avatar">🧑‍🌾</span>
                                ) : block !== BLOCK_EMPTY ? (
                                    <span className="block-icon">{BLOCK_ICONS[block]}</span>
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                {/* Position indicator */}
                <div className="position-bar">
                    📍 Position: ({session.playerX}, {session.playerY}) | Mode: {actionMode.toUpperCase()}
                    {actionMode === 'move' && ' — Click adjacent empty cell or use WASD/arrows'}
                    {actionMode === 'mine' && ' — Click adjacent block to mine'}
                    {actionMode === 'place' && ' — Click adjacent empty cell to place'}
                </div>
            </div>

            {/* Right: Inventory Panel */}
            <Inventory session={session} />
        </div>
    );
}
