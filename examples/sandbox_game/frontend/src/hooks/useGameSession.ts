import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '../stores/gameStore';
import { parseGameSession } from '../lib/parsers';
import type { GameSession } from '../lib/types';
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
            return parseGameSession(res.data.content.fields as Record<string, any>);
        },
        enabled: !!sessionId,
        refetchInterval: 3_000,
    });
}
