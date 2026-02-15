import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '../stores/gameStore';
import { parseGameSession } from '../lib/parsers';
import type { GameSession } from '../lib/types';
import { STATE_FINISHED } from '../constants';
import { suiClient } from '../lib/suiClient';

export function useGameSession() {
    const sessionId = useGameStore((s) => s.sessionId);

    return useQuery<GameSession>({
        queryKey: ['gameSession', sessionId],
        queryFn: async () => {
            const res = await suiClient.getObject({
                id: sessionId!,
                options: { showContent: true },
            });
            if (res.data?.content?.dataType !== 'moveObject') {
                throw new Error('GameSession not found');
            }
            console.log('[useGameSession] raw fields:', res.data.content.fields);
            return parseGameSession(res.data.content.fields as Record<string, any>);
        },
        enabled: !!sessionId,
        refetchInterval: (query) => {
            if (query.state.data?.state === STATE_FINISHED) return false;
            return 2_000;
        },
    });
}
