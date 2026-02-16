import { useQuery } from '@tanstack/react-query';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { suiClient } from '../lib/suiClient';
import { parseRoster } from '../lib/parsers';
import { PACKAGE_ID } from '../constants';
import type { Roster } from '../lib/types';

export function useRoster() {
    const account = useCurrentAccount();

    return useQuery<Roster | null>({
        queryKey: ['roster', account?.address],
        queryFn: async () => {
            if (!account) return null;

            const res = await suiClient.getOwnedObjects({
                owner: account.address,
                filter: { StructType: `${PACKAGE_ID}::game::Roster` },
                options: { showContent: true },
            });

            if (!res.data?.length) return null;

            const obj = res.data[0];
            if (obj.data?.content?.dataType !== 'moveObject') return null;

            const fields = obj.data.content.fields as Record<string, any>;
            return parseRoster(fields, obj.data.objectId);
        },
        enabled: !!account,
        refetchInterval: 5_000,
    });
}
