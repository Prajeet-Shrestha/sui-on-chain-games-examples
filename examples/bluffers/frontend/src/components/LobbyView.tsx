import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useGameActions } from '../hooks/useGameActions';
import { useUIStore } from '../stores/uiStore';

export function LobbyView() {
    const account = useCurrentAccount();
    const { createLobby, joinLobby } = useGameActions();
    const { maxPlayers, setMaxPlayers } = useUIStore();
    const [joinId, setJoinId] = useState('');
    const [tab, setTab] = useState<'create' | 'join'>('create');

    const address = account?.address ?? '';

    async function handleCreate() {
        if (!address) return;
        await createLobby(maxPlayers, address);
    }

    async function handleJoin() {
        if (!address || !joinId.trim()) return;
        await joinLobby(joinId.trim(), address);
        useUIStore.getState().setGameId(joinId.trim());
    }

    return (
        <div className="lobby-screen">
            <div className="lobby-card">
                <h2 className="lobby-title">Game Lobby</h2>
                <p className="lobby-desc">
                    Create a new room or paste a Lobby Code to join a friend's game.
                </p>

                <div className="tab-bar">
                    <button
                        className={`tab-btn ${tab === 'create' ? 'active' : ''}`}
                        onClick={() => setTab('create')}
                    >
                        ✨ Create Lobby
                    </button>
                    <button
                        className={`tab-btn ${tab === 'join' ? 'active' : ''}`}
                        onClick={() => setTab('join')}
                    >
                        🔗 Join Lobby
                    </button>
                </div>

                {tab === 'create' && (
                    <div className="tab-content">
                        <label className="field-label">
                            Max Players
                            <div className="player-count-row">
                                {[2, 3, 4, 5, 6].map((n) => (
                                    <button
                                        key={n}
                                        className={`count-btn ${maxPlayers === n ? 'active' : ''}`}
                                        onClick={() => setMaxPlayers(n)}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </label>
                        <button className="action-btn" onClick={handleCreate}>
                            Create Lobby
                        </button>
                        <p className="hint">
                            Share the Lobby Code (object ID) with friends so they can join.
                        </p>
                    </div>
                )}

                {tab === 'join' && (
                    <div className="tab-content">
                        <label className="field-label">
                            Lobby Code
                            <input
                                className="lobby-input"
                                placeholder="0x..."
                                value={joinId}
                                onChange={(e) => setJoinId(e.target.value)}
                            />
                        </label>
                        <button
                            className="action-btn"
                            onClick={handleJoin}
                            disabled={!joinId.trim()}
                        >
                            Join Lobby
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
