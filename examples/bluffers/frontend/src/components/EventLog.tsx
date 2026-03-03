import { useEffect, useRef } from 'react';
import type { GameLogEntry } from '../hooks/useGameEvents';

interface Props {
    logs: GameLogEntry[];
}

const TYPE_COLORS: Record<string, string> = {
    card_play: '#7dd3fc',
    accept: '#86efac',
    liar: '#fbbf24',
    roulette: '#f87171',
    elimination: '#ef4444',
    round: '#c084fc',
    start: '#34d399',
    win: '#fbbf24',
    join: '#a3e635',
    info: '#94a3b8',
};

function formatTime(ts: number): string {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export function EventLog({ logs }: Props) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="event-log">
            <div className="event-log-header">
                <span className="event-log-title">📋 Game Log</span>
                <span className="event-log-count">{logs.length} events</span>
            </div>
            <div className="event-log-body">
                {logs.length === 0 && (
                    <div className="event-log-empty">No events yet. Start the game!</div>
                )}
                {logs.map(entry => (
                    <div key={entry.id} className="event-log-entry" style={{ borderLeftColor: TYPE_COLORS[entry.type] ?? '#555' }}>
                        <span className="log-emoji">{entry.emoji}</span>
                        <span className="log-text">{entry.text}</span>
                        <span className="log-time">{formatTime(entry.time)}</span>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
