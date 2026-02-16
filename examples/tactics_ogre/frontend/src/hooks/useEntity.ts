import { useQuery } from '@tanstack/react-query';
import { suiClient } from '../lib/suiClient';
import { parseUnitFromDynamicFields } from '../lib/parsers';
import type { UnitState } from '../lib/types';

export function useEntity(entityId: string | null) {
    return useQuery<UnitState | null>({
        queryKey: ['entity', entityId],
        queryFn: async () => {
            if (!entityId) return null;

            // Step 1: Discover all dynamic fields (components) on the entity
            const dynFields = await suiClient.getDynamicFields({ parentId: entityId });
            if (!dynFields.data?.length) return null;

            // Step 2: Batch-fetch all component objects
            const objects = await suiClient.multiGetObjects({
                ids: dynFields.data.map((df: any) => df.objectId),
                options: { showContent: true, showType: true },
            });

            // Step 3: Parse components by type-name matching
            return parseUnitFromDynamicFields(entityId, objects);
        },
        enabled: !!entityId,
        refetchInterval: 2_000,
    });
}

// Hook to fetch multiple entities at once
export function useEntities(entityIds: string[]) {
    return useQuery<UnitState[]>({
        queryKey: ['entities', ...entityIds],
        queryFn: async () => {
            const results: UnitState[] = [];

            for (const id of entityIds) {
                const dynFields = await suiClient.getDynamicFields({ parentId: id });
                if (!dynFields.data?.length) continue;

                const objects = await suiClient.multiGetObjects({
                    ids: dynFields.data.map((df: any) => df.objectId),
                    options: { showContent: true, showType: true },
                });

                results.push(parseUnitFromDynamicFields(id, objects));
            }

            return results;
        },
        enabled: entityIds.length > 0,
        refetchInterval: 2_000,
    });
}
