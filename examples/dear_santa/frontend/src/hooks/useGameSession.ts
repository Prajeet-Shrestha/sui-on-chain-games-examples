import { useQuery } from '@tanstack/react-query';
import { suiClient } from '../lib/suiClient';
import { parseSantaMailbox } from '../lib/parsers';
import type { SantaMailbox } from '../lib/types';
import { SANTA_MAILBOX_ID } from '../constants';

export function useGameSession() {
    return useQuery<SantaMailbox>({
        queryKey: ['santaMailbox', SANTA_MAILBOX_ID],
        queryFn: async () => {
            const res = await suiClient.getObject({
                id: SANTA_MAILBOX_ID,
                options: { showContent: true },
            });
            if (res.data?.content?.dataType !== 'moveObject') {
                throw new Error('SantaMailbox not found');
            }
            return parseSantaMailbox(
                res.data.objectId,
                res.data.content.fields as Record<string, any>,
            );
        },
        refetchInterval: 5_000,
    });
}
