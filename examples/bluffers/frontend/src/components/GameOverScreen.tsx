import type { BlufferGame } from '../lib/types';
import { useUIStore } from '../stores/uiStore';
import { useGameEvents } from '../hooks/useGameEvents';
import { playVictory } from '../lib/audio';
import { useEffect, useState } from 'react';

import { useCurrentAccount } from '@mysten/dapp-kit-react';

interface Props {
    game: BlufferGame;
}

export function GameOverScreen({ game }: Props) {
    const account = useCurrentAccount();
    const { setGameId, gameId, getPlayerName } = useUIStore();
    const { logs } = useGameEvents(gameId, account?.address);
    const [copied, setCopied] = useState(false);

    useEffect(() => { playVictory(); }, []);

    // Derive winner: use explicit winner field, or fall back to last alive player
    const winner = game.winner
        || game.players.find((_, i) => game.alive[i])
        || '';

    const isMe = account?.address && winner === account.address;
    const winnerName = isMe ? 'You' : (winner ? getPlayerName(winner) : 'Unknown');

    // Events by type
    const elimLogs = logs.filter(l => l.type === 'elimination');
    const rouletteLogs = logs.filter(l => l.type === 'roulette');
    const lastRoulette = rouletteLogs[rouletteLogs.length - 1];

    // Determine how the game ended
    let winCause = 'no opponents survived';
    if (lastRoulette) {
        if (lastRoulette.text.includes('SAFE') || lastRoulette.text.includes('safe')) {
            winCause = 'opponent pulled the trigger — chamber was empty';
        } else {
            winCause = 'opponent pulled the trigger — bullet fired';
        }
    } else if (elimLogs.length > 0) {
        winCause = 'caught bluffing at the critical moment';
    }

    const copy = () => {
        if (!winner) return;
        navigator.clipboard.writeText(winner).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="gos-overlay">
            <div className="gos-card">

                {/* Animated trophy */}
                <div className="gos-trophy-wrap">
                    <div className="gos-trophy-ring gos-ring1" />
                    <div className="gos-trophy-ring gos-ring2" />
                    <div className="gos-trophy">🏆</div>
                </div>

                <div className="gos-title">Game Over</div>
                <div className="gos-subtitle">Last player standing</div>

                {/* Winner address block */}
                <div className="gos-winner-block">
                    <div className="gos-winner-label">Winner</div>
                    {winner ? (
                        <>
                            <div className="gos-winner-addr">
                                <span className="gos-addr-text">{winnerName}</span>
                                <button className="gos-copy-btn" onClick={copy} title="Copy full address">
                                    {copied ? '✓' : '⎘'}
                                </button>
                            </div>
                            <div className="gos-winner-full">{winner}</div>
                        </>
                    ) : (
                        <div className="gos-addr-text">Unknown</div>
                    )}
                </div>

                {/* Stats */}
                <div className="gos-stats">
                    <div className="gos-stat">
                        <span className="gos-stat-val">{game.round}</span>
                        <span className="gos-stat-lbl">Rounds</span>
                    </div>
                    <div className="gos-stat-divider" />
                    <div className="gos-stat">
                        <span className="gos-stat-val">{game.players.length}</span>
                        <span className="gos-stat-lbl">Players</span>
                    </div>
                    <div className="gos-stat-divider" />
                    <div className="gos-stat">
                        <span className="gos-stat-val">{game.rouletteTriggers.reduce((a, b) => a + b, 0)}</span>
                        <span className="gos-stat-lbl">Trigger pulls</span>
                    </div>
                </div>

                {/* Elimination timeline */}
                {elimLogs.length > 0 && (
                    <div className="gos-timeline">
                        <div className="gos-tl-title">Elimination Order</div>
                        {elimLogs.map((log, i) => (
                            <div key={i} className="gos-tl-row">
                                <span className="gos-tl-num">#{i + 1}</span>
                                <span className="gos-tl-text">{log.text}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Win cause */}
                <div className="gos-cause">
                    <span className="gos-cause-icon">🔫</span>
                    <span>{winCause}</span>
                </div>

                <button className="gos-play-btn" onClick={() => setGameId(null)}>
                    🃏 Play Again
                </button>
            </div>
        </div>
    );
}

