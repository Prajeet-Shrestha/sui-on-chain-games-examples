import { useQuery } from '@tanstack/react-query';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { suiClient } from '../lib/suiClient';
import { PACKAGE_ID, STATE_LOBBY, STATE_PLACEMENT, STATE_COMBAT } from '../constants';

export interface ActiveSessionInfo {
    sessionId: string;
    gridId: string | null;
    state: number;
}

/**
 * Auto-discovers the player's active (non-finished) GameSession by:
 * 1. Querying SessionCreated events where the sender is the current player
 * 2. Fetching each session object to check if it's still active
 * 3. Returns session ID, state, and attempts to discover grid ID
 */
export function useActiveSession() {
    const account = useCurrentAccount();

    return useQuery<ActiveSessionInfo | null>({
        queryKey: ['activeSession', account?.address],
        queryFn: async () => {
            if (!account) return null;

            // Query SessionCreated events emitted by this player
            const events = await suiClient.queryEvents({
                query: {
                    MoveEventType: `${PACKAGE_ID}::game::SessionCreated`,
                },
                order: 'descending',
                limit: 10,
            });

            if (!events.data?.length) return null;

            // Filter events where creator matches current player
            const playerEvents = events.data.filter((e: any) => {
                const parsed = e.parsedJson as any;
                return parsed?.creator === account.address;
            });

            // Check each session (most recent first) to find one still active
            for (const evt of playerEvents) {
                const parsed = evt.parsedJson as any;
                const sessionId = parsed?.session_id;
                if (!sessionId) continue;

                const result = await checkSession(sessionId);
                if (result) return result;
            }

            // Also check PlayerJoined events (in case we joined someone else's session)
            const joinEvents = await suiClient.queryEvents({
                query: {
                    MoveEventType: `${PACKAGE_ID}::game::PlayerJoined`,
                },
                order: 'descending',
                limit: 10,
            });

            if (joinEvents.data?.length) {
                const joinedByPlayer = joinEvents.data.filter((e: any) => {
                    const parsed = e.parsedJson as any;
                    return parsed?.player === account.address;
                });

                for (const evt of joinedByPlayer) {
                    const parsed = evt.parsedJson as any;
                    const sessionId = parsed?.session_id;
                    if (!sessionId) continue;

                    const result = await checkSession(sessionId);
                    if (result) return result;
                }
            }

            return null;
        },
        enabled: !!account,
        refetchInterval: 10_000,
    });
}

async function checkSession(sessionId: string): Promise<ActiveSessionInfo | null> {
    try {
        const res = await suiClient.getObject({
            id: sessionId,
            options: { showContent: true },
        });

        if (res.data?.content?.dataType !== 'moveObject') return null;

        const fields = res.data.content.fields as Record<string, any>;
        const state = Number(fields.state);

        // Active = LOBBY, PLACEMENT, or COMBAT
        if (state === STATE_LOBBY || state === STATE_PLACEMENT || state === STATE_COMBAT) {
            // Try to discover grid ID from the session's transaction
            let gridId: string | null = null;
            try {
                // Look for grid created in same tx by querying events around this session
                const sessionEvents = await suiClient.queryEvents({
                    query: {
                        MoveEventType: `${PACKAGE_ID}::game::SessionCreated`,
                    },
                    order: 'descending',
                    limit: 20,
                });
                const matchingEvent = sessionEvents.data?.find((e: any) => {
                    return (e.parsedJson as any)?.session_id === sessionId;
                });
                if (matchingEvent) {
                    // Get the transaction that created this session
                    const txDigest = matchingEvent.id?.txDigest;
                    if (txDigest) {
                        const txResult = await suiClient.getTransactionBlock({
                            digest: txDigest,
                            options: { showEffects: true },
                        });
                        // Find created objects
                        const created = (txResult as any)?.effects?.created ?? [];
                        for (const obj of created) {
                            const objId = obj?.reference?.objectId;
                            if (objId && objId !== sessionId) {
                                // The other created object should be the Grid
                                gridId = objId;
                                break;
                            }
                        }
                    }
                }
            } catch {
                // Grid discovery is best-effort
            }

            return { sessionId, gridId, state };
        }
    } catch {
        // Session might be deleted
    }
    return null;
}
