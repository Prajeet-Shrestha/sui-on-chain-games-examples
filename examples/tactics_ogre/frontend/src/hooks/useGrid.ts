import { useQuery } from '@tanstack/react-query';
import { suiClient } from '../lib/suiClient';
import { useUIStore } from '../stores/uiStore';
import type { GridState } from '../lib/types';

export function useGrid() {
    const gridId = useUIStore((s) => s.gridId);

    return useQuery<GridState | null>({
        queryKey: ['grid', gridId],
        queryFn: async () => {
            if (!gridId) return null;

            const res = await suiClient.getObject({
                id: gridId,
                options: { showContent: true },
            });

            if (res.data?.content?.dataType !== 'moveObject') return null;

            const fields = res.data.content.fields as Record<string, any>;
            return {
                id: gridId,
                width: Number(fields.width),
                height: Number(fields.height),
            };
        },
        enabled: !!gridId,
        refetchInterval: 3_000,
    });
}
