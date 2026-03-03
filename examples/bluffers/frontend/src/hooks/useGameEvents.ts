import { useEffect, useRef, useState, useCallback } from 'react';
import { suiClient } from '../lib/suiClient';
import { PACKAGE_ID, CARD_NAMES } from '../constants';
import { useUIStore } from '../stores/uiStore';

export interface GameLogEntry {
    id: string;
    time: number;
    type: 'card_play' | 'accept' | 'liar' | 'roulette' | 'elimination' | 'round' | 'start' | 'win' | 'join' | 'info';
    text: string;
    player?: string;
    emoji: string;
    cards?: number[];  // raw card values for reveal animation
    tableCard?: number; // table card at the time of this event (for round/start/liar)
    challenger?: string; // address of challenger (liar events)
    accused?: string;    // address of accused (liar events)
    wasLying?: boolean;  // whether accused was lying (liar events)
}

function getDisplayName(addr: string, _myAddress?: string): string {
    return useUIStore.getState().getPlayerName(addr);
}

function parseEvent(ev: {
    type: string;
    parsedJson: Record<string, unknown>;
    timestampMs?: string;
}, myAddress?: string): GameLogEntry | null {
    const t = ev.type ?? '';
    const j = ev.parsedJson ?? {};
    const time = Number(ev.timestampMs ?? Date.now());
    const id = `${time}-${Math.random()}`;

    if (t.includes('GameStarted')) {
        const card = CARD_NAMES[Number(j.table_card)] ?? '?';
        return { id, time, type: 'start', emoji: '🎮', text: `Game started! Table card: ${card}` };
    }
    if (t.includes('PlayerJoined')) {
        const name = getDisplayName(String(j.player), myAddress);
        return { id, time, type: 'join', emoji: '🙋', text: `${name} joined (seat ${Number(j.player_index) + 1})` };
    }
    if (t.includes('CardsPlayed')) {
        const count = Number(j.count);
        const name = getDisplayName(String(j.player), myAddress);
        return {
            id, time, type: 'card_play', emoji: '🃏',
            text: `${name} played ${count} card${count > 1 ? 's' : ''} (claimed as table card)`,
            player: String(j.player),
        };
    }
    if (t.includes('PlayAccepted')) {
        const rawCards = (j.revealed_cards as number[] ?? []);
        const cards = rawCards.map(c => CARD_NAMES[c]).join(', ');
        const name = getDisplayName(String(j.passer), myAddress);
        return {
            id, time, type: 'accept', emoji: '✅',
            text: `${name} accepted. Cards revealed: ${cards || '—'}`,
            cards: rawCards,
        };
    }
    if (t.includes('LiarCalled')) {
        const wasLying = Boolean(j.was_lying);
        const rawCards = (j.actual_cards as number[] ?? []);
        const cards = rawCards.map(c => CARD_NAMES[c]).join(', ');
        const challengerName = getDisplayName(String(j.challenger), myAddress);
        const accusedName = getDisplayName(String(j.accused), myAddress);
        return {
            id, time, type: 'liar', emoji: wasLying ? '🤥' : '😇',
            text: `${challengerName} called LIAR on ${accusedName}! Cards: ${cards}. ${wasLying ? 'Was lying!' : 'Was telling the truth!'}`,
            cards: rawCards,
            challenger: String(j.challenger),
            accused: String(j.accused),
            wasLying,
        };
    }
    if (t.includes('RouletteResult')) {
        const elim = Boolean(j.eliminated);
        const trigger = Number(j.trigger_position) + 1;
        const name = getDisplayName(String(j.player), myAddress);
        return {
            id, time, type: 'roulette', emoji: elim ? '💀' : '😮‍💨',
            text: `${name} pulls trigger (pull #${trigger}/6). Chamber ${Number(j.bullet_chamber) + 1}. ${elim ? '💥 ELIMINATED!' : 'Safe — empty chamber.'}`,
        };
    }
    if (t.includes('PlayerEliminated')) {
        const name = getDisplayName(String(j.player), myAddress);
        const verb = 'was';
        return {
            id, time, type: 'elimination', emoji: '💀',
            text: `${name} ${verb} eliminated! ${Number(j.players_remaining)} player${Number(j.players_remaining) !== 1 ? 's' : ''} remain.`,
            player: String(j.player),
        };
    }
    if (t.includes('NewRound')) {
        const card = CARD_NAMES[Number(j.table_card)] ?? '?';
        return { id, time, type: 'round', emoji: '🔄', text: `Round ${j.round}: New table card is ${card}` };
    }
    if (t.includes('GameOver')) {
        const name = getDisplayName(String(j.winner), myAddress);
        return { id, time, type: 'win', emoji: '🏆', text: `🏆 Game over! Winner: ${name}` };
    }
    return null;
}

export function useGameEvents(gameId: string | null, myAddress?: string) {
    const [logs, setLogs] = useState<GameLogEntry[]>([]);
    const cursorRef = useRef<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchEvents = useCallback(async () => {
        if (!gameId) return;
        try {
            const result = await suiClient.queryEvents({
                query: {
                    MoveModule: {
                        package: PACKAGE_ID,
                        module: 'bluffers',
                    },
                },
                cursor: cursorRef.current as unknown as never,
                limit: 50,
                order: 'ascending',
            });

            const newEntries: GameLogEntry[] = [];
            for (const ev of result.data) {
                // Filter to this game
                const j = ev.parsedJson as Record<string, unknown>;
                if (j.game_id !== gameId) continue;
                const entry = parseEvent({
                    type: ev.type,
                    parsedJson: j,
                    timestampMs: ev.timestampMs ?? undefined,
                }, myAddress);
                if (entry) newEntries.push(entry);
            }

            if (result.nextCursor) cursorRef.current = result.nextCursor as unknown as string;
            if (newEntries.length > 0) {
                setLogs(prev => [...prev, ...newEntries].slice(-200)); // keep last 200
            }
        } catch {
            // silently ignore network errors
        }
    }, [gameId, myAddress]);

    useEffect(() => {
        if (!gameId) { setLogs([]); cursorRef.current = null; return; }
        // Reset on new game
        setLogs([]);
        cursorRef.current = null;
        fetchEvents();
        intervalRef.current = setInterval(fetchEvents, 3000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [gameId, fetchEvents]);

    return { logs };
}
