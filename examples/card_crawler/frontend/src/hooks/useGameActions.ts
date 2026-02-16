import { Transaction } from '@mysten/sui/transactions';
import { useDAppKit } from '@mysten/dapp-kit-react';
import { useQueryClient } from '@tanstack/react-query';
import { useGameStore } from '../stores/gameStore';
import { PACKAGE_ID, CLOCK_ID, RANDOM_ID, ERROR_MAP } from '../constants';
import { suiClient } from '../lib/suiClient';

// Parse Move abort codes into friendly messages
function parseTransactionError(error: unknown): string {
    const errorStr = typeof error === 'string' ? error : (error instanceof Error ? error.message : JSON.stringify(error));
    const match = errorStr.match(/MoveAbort.*?(\d+)\)?$/);
    if (match) {
        const code = Number(match[1]);
        return ERROR_MAP[code] ?? `Transaction failed (code ${code})`;
    }
    return errorStr || 'Transaction failed';
}

export function useGameActions() {
    const dAppKit = useDAppKit();
    const queryClient = useQueryClient();
    const store = useGameStore();

    // Shared post-transaction handler
    async function executeAndRefresh(tx: Transaction) {
        store.setLoading(true);
        store.setError(null);
        try {
            const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });

            // signAndExecuteTransaction already returns effects
            if (result.$kind === 'FailedTransaction') {
                const msg = result.FailedTransaction?.status?.error ?? 'Transaction failed';
                throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
            }

            // Wait for testnet indexer to catch up, then force-refetch
            await new Promise(r => setTimeout(r, 2000));
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ['gameSession'] }),
                queryClient.refetchQueries({ queryKey: ['playerEntity'] }),
            ]);

            return result;
        } catch (err) {
            const errorMsg = parseTransactionError(err);
            store.setError(errorMsg);
            throw err;
        } finally {
            store.setLoading(false);
        }
    }

    return {
        // ═══════════════════════════════════════════
        // CREATE AND START — creates new game objects
        // ═══════════════════════════════════════════
        createAndStart: async () => {
            store.setLoading(true);
            store.setError(null);
            try {
                const tx = new Transaction();
                tx.moveCall({
                    package: PACKAGE_ID,
                    module: 'game',
                    function: 'create_and_start',
                    arguments: [
                        tx.object(CLOCK_ID),
                    ],
                });

                const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });

                if (result.$kind === 'FailedTransaction') {
                    throw new Error('Transaction failed');
                }

                // Log the full result for debugging
                console.log('[createAndStart] Transaction result:', JSON.stringify(result.Transaction, null, 2));

                // Extract created object IDs from effects
                const changedObjects = result.Transaction.effects?.changedObjects ?? [];
                const createdIds = changedObjects
                    .filter((obj: any) => obj.idOperation === 'Created')
                    .map((obj: any) => obj.objectId);

                console.log('[createAndStart] Created IDs:', createdIds);

                let foundSessionId = '';
                let foundWorldId = '';
                let foundEntityId = '';

                // Method 1: Use objectTypes map (instant, no extra network calls)
                const objectTypes = (result.Transaction.objectTypes ?? {}) as Record<string, string>;
                console.log('[createAndStart] objectTypes:', objectTypes);

                for (const objId of createdIds) {
                    const t = objectTypes[objId] ?? '';
                    if (t.includes('GameSession')) foundSessionId = objId;
                    else if (t.includes('World')) foundWorldId = objId;
                    else if (t.includes('Entity')) foundEntityId = objId;
                }

                // Method 2: If objectTypes didn't work, use JSON-RPC to fetch each object
                if (!foundSessionId || !foundWorldId || !foundEntityId) {
                    console.log('[createAndStart] objectTypes incomplete, fetching via JSON-RPC...');
                    // Small delay to allow full node indexing
                    await new Promise(r => setTimeout(r, 2000));

                    for (const objId of createdIds) {
                        try {
                            const resp = await suiClient.getObject({
                                id: objId,
                                options: { showType: true },
                            });
                            const typeName = resp.data?.type ?? '';
                            console.log(`[createAndStart] Object ${objId} type: ${typeName}`);

                            if (typeName.includes('GameSession')) foundSessionId = foundSessionId || objId;
                            else if (typeName.includes('World')) foundWorldId = foundWorldId || objId;
                            else if (typeName.includes('Entity')) foundEntityId = foundEntityId || objId;
                        } catch (e) {
                            console.warn(`[createAndStart] Failed to read ${objId}:`, e);
                        }
                    }
                }

                console.log('[createAndStart] Found:', { foundSessionId, foundWorldId, foundEntityId });

                if (!foundSessionId || !foundWorldId || !foundEntityId) {
                    throw new Error(
                        `Could not find all game objects. Session: ${foundSessionId}, World: ${foundWorldId}, Entity: ${foundEntityId}. Created: [${createdIds.join(', ')}]`
                    );
                }

                store.setGameObjects(foundSessionId, foundWorldId, foundEntityId);

                // Trigger initial data fetch
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['gameSession'] }),
                    queryClient.invalidateQueries({ queryKey: ['playerEntity'] }),
                ]);

                return { sessionId: foundSessionId, worldId: foundWorldId, entityId: foundEntityId };
            } catch (err) {
                const errorMsg = parseTransactionError(err);
                store.setError(errorMsg);
                throw err;
            } finally {
                store.setLoading(false);
            }
        },

        // ═══════════════════════════════════════════
        // CHOOSE NODE — map navigation
        // ═══════════════════════════════════════════
        chooseNode: async (path: number) => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'choose_node',
                arguments: [
                    tx.object(store.sessionId!),
                    tx.pure.u8(path),
                ],
            });
            return executeAndRefresh(tx);
        },

        // ═══════════════════════════════════════════
        // DRAW PHASE — draw cards into hand (separate tx so player can see them)
        // ═══════════════════════════════════════════
        drawPhase: async () => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'draw_phase',
                arguments: [
                    tx.object(store.worldId!),
                    tx.object(store.sessionId!),
                    tx.object(store.entityId!),
                    tx.object(RANDOM_ID),
                ],
            });
            return executeAndRefresh(tx);
        },

        // ═══════════════════════════════════════════
        // PLAY CARDS + END TURN — play selected cards then end turn
        // ═══════════════════════════════════════════
        playCardsAndEndTurn: async (cardIndices: number[]) => {
            const tx = new Transaction();

            // 1. Play selected cards (indices sorted descending since removal shifts hand)
            const sortedDesc = [...cardIndices].sort((a, b) => b - a);
            for (const idx of sortedDesc) {
                tx.moveCall({
                    package: PACKAGE_ID,
                    module: 'game',
                    function: 'play_card',
                    arguments: [
                        tx.object(store.worldId!),
                        tx.object(store.sessionId!),
                        tx.object(store.entityId!),
                        tx.pure.u64(idx),
                    ],
                });
            }

            // 2. End player turn
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'end_player_turn',
                arguments: [
                    tx.object(store.worldId!),
                    tx.object(store.sessionId!),
                    tx.object(store.entityId!),
                    tx.object(RANDOM_ID),
                ],
            });

            store.clearSelectedCards();
            return executeAndRefresh(tx);
        },

        // ═══════════════════════════════════════════
        // COLLECT REWARD — pick a card after combat
        // ═══════════════════════════════════════════
        collectReward: async (cardChoice: number) => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'collect_reward',
                arguments: [
                    tx.object(store.sessionId!),
                    tx.object(store.entityId!),
                    tx.pure.u8(cardChoice),
                ],
            });
            return executeAndRefresh(tx);
        },

        // ═══════════════════════════════════════════
        // SHOP ACTION — buy card, remove card, buy relic
        // ═══════════════════════════════════════════
        shopAction: async (itemType: number, itemId: number) => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'shop_action',
                arguments: [
                    tx.object(store.sessionId!),
                    tx.object(store.entityId!),
                    tx.pure.u8(itemType),
                    tx.pure.u64(itemId),
                ],
            });
            return executeAndRefresh(tx);
        },

        // ═══════════════════════════════════════════
        // SHOP DONE — leave shop
        // ═══════════════════════════════════════════
        shopDone: async () => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'shop_done',
                arguments: [
                    tx.object(store.sessionId!),
                ],
            });
            return executeAndRefresh(tx);
        },

        // ═══════════════════════════════════════════
        // REST — heal 30% max HP
        // ═══════════════════════════════════════════
        rest: async () => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'rest',
                arguments: [
                    tx.object(store.sessionId!),
                    tx.object(store.entityId!),
                ],
            });
            return executeAndRefresh(tx);
        },

        // ═══════════════════════════════════════════
        // ADVANCE FLOOR — move to next floor
        // ═══════════════════════════════════════════
        advanceFloor: async () => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'advance_floor',
                arguments: [
                    tx.object(store.sessionId!),
                ],
            });
            return executeAndRefresh(tx);
        },
    };
}
