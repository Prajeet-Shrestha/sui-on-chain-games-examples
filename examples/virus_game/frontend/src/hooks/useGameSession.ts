import { useQuery } from '@tanstack/react-query';
import { suiClient } from '../lib/suiClient';
import { parseGameSession } from '../lib/parsers';
import type { GameSession } from '../lib/types';

export function useGameSession(sessionId: string | null) {
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
            return parseGameSession(
                res.data.objectId,
                res.data.content.fields as Record<string, any>,
            );
        },
        enabled: !!sessionId,
        refetchInterval: 2_000,
    });
}
