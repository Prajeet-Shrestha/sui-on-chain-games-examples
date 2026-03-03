import type { BlufferGame } from './types';

// Parse raw Move object fields from JSON-RPC into typed BlufferGame
export function parseBlufferGame(id: string, fields: Record<string, unknown>): BlufferGame {
    // Parse winner (Move Option<address> = vec of 0 or 1 element)
    const winnerRaw = fields.winner as { fields?: { vec?: string[] } } | null;
    let winner: string | null = null;
    if (winnerRaw?.fields?.vec && winnerRaw.fields.vec.length > 0) {
        winner = winnerRaw.fields.vec[0] ?? null;
    }

    // Parse hands: stored as vector<vector<u8>> in Move
    // JSON-RPC returns this as an array of arrays of number strings
    const rawHands = (fields.hands as unknown[][] | null) ?? [];
    const hands: number[][] = rawHands.map((h: unknown) => {
        if (Array.isArray(h)) {
            return h.map((c: unknown) => Number(c));
        }
        return [];
    });

    return {
        id,
        state: Number(fields.state ?? 0),
        creator: String(fields.creator ?? ''),
        players: (fields.players as string[]) ?? [],
        alive: (fields.alive as boolean[]) ?? [],
        maxPlayers: Number(fields.max_players ?? 4),
        hands,
        tableCard: Number(fields.table_card ?? 0),
        round: Number(fields.round ?? 0),
        pendingState: Number(fields.pending_state ?? 0),
        pendingPlayerIdx: Number(fields.pending_player_idx ?? 0),
        pendingCount: Number(fields.pending_count ?? 0),
        currentPlayerIdx: Number(fields.current_player_idx ?? 0),
        bulletChamber: Number(fields.bullet_chamber ?? 0),
        rouletteTriggers: ((fields.roulette_triggers as unknown[] | null) ?? []).map((v: unknown) => Number(v)),
        winner,
    };
}
