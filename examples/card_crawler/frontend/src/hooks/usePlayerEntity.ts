import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '../stores/gameStore';
import {
    parseHealthComponent,
    parseEnergyComponent,
    parseGoldComponent,
    parseDeckComponent,
    parseInventoryComponent,
} from '../lib/parsers';
import type { PlayerState } from '../lib/types';
import { STATE_FINISHED } from '../constants';
import { useGameSession } from './useGameSession';
import { suiClient } from '../lib/suiClient';

export function usePlayerEntity() {
    const entityId = useGameStore((s) => s.entityId);
    const { data: session } = useGameSession();

    return useQuery<PlayerState>({
        queryKey: ['playerEntity', entityId],
        queryFn: async () => {
            // Step 1: List all dynamic fields on the entity
            const dynFields = await suiClient.getDynamicFields({
                parentId: entityId!,
            });

            console.log('[usePlayerEntity] Dynamic fields count:', dynFields.data?.length);

            let health = { current: 0, max: 0 };
            let energy = { current: 0, max: 0, regen: 0 };
            let gold = 0;
            let deck = { drawPile: [] as any[], hand: [] as any[], discardPile: [] as any[] };
            let relics: { itemType: number; itemValue: number }[] = [];

            if (!dynFields.data?.length) {
                console.warn('[usePlayerEntity] No dynamic fields found on entity');
                return { id: entityId!, health, energy, gold, deck, relics };
            }

            // Step 2: Batch-fetch all field objects with content
            const fieldObjectIds = dynFields.data.map(df => df.objectId);
            console.log('[usePlayerEntity] Fetching field object IDs:', fieldObjectIds);

            const objects = await suiClient.multiGetObjects({
                ids: fieldObjectIds,
                options: { showContent: true, showType: true },
            });

            // Step 3: Parse each object
            for (const obj of objects) {
                if (!obj.data?.content || obj.data.content.dataType !== 'moveObject') {
                    console.log('[usePlayerEntity] Skipping non-moveObject:', obj.data?.objectId);
                    continue;
                }

                const content = obj.data.content;
                const typeName = content.type ?? '';
                const allFields = content.fields as Record<string, any>;

                // Dynamic fields are Field<String, ComponentType>
                // allFields has: { id, name, value }
                // The actual component data is in allFields.value (or allFields.value.fields)
                const valueFields = allFields.value?.fields ?? allFields.value ?? allFields;

                console.log(`[usePlayerEntity] type=${typeName}`);
                console.log(`[usePlayerEntity] allFields keys:`, Object.keys(allFields));
                console.log(`[usePlayerEntity] valueFields:`, JSON.stringify(valueFields).slice(0, 300));

                if (typeName.includes('Health')) {
                    health = parseHealthComponent(valueFields);
                    console.log('[usePlayerEntity] ✅ health:', health);
                } else if (typeName.includes('Energy')) {
                    energy = parseEnergyComponent(valueFields);
                    console.log('[usePlayerEntity] ✅ energy:', energy);
                } else if (typeName.includes('Gold')) {
                    gold = parseGoldComponent(valueFields);
                    console.log('[usePlayerEntity] ✅ gold:', gold);
                } else if (typeName.includes('Deck')) {
                    deck = parseDeckComponent(valueFields);
                    console.log('[usePlayerEntity] ✅ deck:', {
                        drawPile: deck.drawPile.length,
                        hand: deck.hand.length,
                        discardPile: deck.discardPile.length,
                    });
                } else if (typeName.includes('Inventory')) {
                    relics = parseInventoryComponent(valueFields);
                    console.log('[usePlayerEntity] ✅ relics:', relics.length);
                } else {
                    console.log(`[usePlayerEntity] Unknown component, skipping`);
                }
            }

            return {
                id: entityId!,
                health,
                energy,
                gold,
                deck,
                relics,
            };
        },
        enabled: !!entityId,
        refetchInterval: () => {
            if (session?.state === STATE_FINISHED) return false;
            return 2_000;
        },
    });
}
