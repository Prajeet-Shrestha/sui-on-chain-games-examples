import { useQuery } from '@tanstack/react-query';
import { suiClient } from '../lib/suiClient';
import { parseGameSession } from '../lib/parsers';
import { useUIStore } from '../stores/uiStore';
import { STATE_COMBAT, STATE_FINISHED, STATE_LOBBY } from '../constants';
import type { GameSession } from '../lib/types';

export function useGameSession() {
    const sessionId = useUIStore((s) => s.sessionId);

    const query = useQuery<GameSession | null>({
        queryKey: ['gameSession', sessionId],
        queryFn: async () => {
            if (!sessionId) return null;

            const res = await suiClient.getObject({
                id: sessionId,
                options: { showContent: true },
            });

            if (res.data?.content?.dataType !== 'moveObject') return null;

            const fields = res.data.content.fields as Record<string, any>;
            return parseGameSession(fields, sessionId);
        },
        enabled: !!sessionId,
        refetchInterval: (query) => {
            const session = query.state.data;
            if (!session) return 5_000;
            if (session.state === STATE_FINISHED) return false;
            if (session.state === STATE_COMBAT) return 2_000;
            if (session.state === STATE_LOBBY) return 5_000;
            return 3_000; // placement
        },
    });

    return query;
}
