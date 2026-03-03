import { useQuery } from '@tanstack/react-query';
import { suiClient } from '../lib/suiClient';
import { parseBlufferGame } from '../lib/parsers';
import type { BlufferGame } from '../lib/types';

export function useBlufferGame(gameId: string | null) {
    return useQuery<BlufferGame>({
        queryKey: ['blufferGame', gameId],
        queryFn: async () => {
            const res = await suiClient.getObject({
                id: gameId!,
                options: { showContent: true },
            });
            if (res.data?.content?.dataType !== 'moveObject') {
                throw new Error('BlufferGame not found');
            }
            return parseBlufferGame(
                res.data.objectId,
                res.data.content.fields as Record<string, unknown>,
            );
        },
        enabled: !!gameId,
        refetchInterval: 2_000, // poll every 2s for real-time feel
    });
}
