import { Transaction } from '@mysten/sui/transactions';
import { useDAppKit } from '@mysten/dapp-kit-react';
import { useQueryClient } from '@tanstack/react-query';
import { useGameStore } from '../stores/gameStore';
import { PACKAGE_ID, WORLD_ID, RANDOM_ID, ERROR_MAP } from '../constants';
import { suiClient } from '../lib/suiClient';

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

    async function executeAndRefresh(tx: Transaction) {
        store.setLoading(true);
        store.setError(null);
        try {
            const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });

            if (result.$kind === 'FailedTransaction') {
                const msg = result.FailedTransaction?.status?.error ?? 'Transaction failed';
                throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
            }

            await new Promise(r => setTimeout(r, 2000));
            await queryClient.refetchQueries({ queryKey: ['gameSession'] });
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
        // START GAME — creates new GameSession
        // ═══════════════════════════════════════════
        startGame: async () => {
            store.setLoading(true);
            store.setError(null);
            try {
                const tx = new Transaction();
                tx.moveCall({
                    package: PACKAGE_ID,
                    module: 'game',
                    function: 'start_game',
                    arguments: [
                        tx.object(WORLD_ID),
                        tx.object(RANDOM_ID),
                    ],
                });

                const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });

                if (result.$kind === 'FailedTransaction') {
                    throw new Error('Transaction failed');
                }

                const changedObjects = result.Transaction.effects?.changedObjects ?? [];
                const createdIds = changedObjects
                    .filter((obj: any) => obj.idOperation === 'Created')
                    .map((obj: any) => obj.objectId);

                let foundSessionId = '';

                // Try objectTypes first
                const objectTypes = (result.Transaction.objectTypes ?? {}) as Record<string, string>;
                for (const objId of createdIds) {
                    const t = objectTypes[objId] ?? '';
                    if (t.includes('GameSession')) foundSessionId = objId;
                }

                // Fallback: fetch via JSON-RPC
                if (!foundSessionId) {
                    await new Promise(r => setTimeout(r, 2000));
                    for (const objId of createdIds) {
                        try {
                            const resp = await suiClient.getObject({
                                id: objId,
                                options: { showType: true },
                            });
                            const typeName = resp.data?.type ?? '';
                            if (typeName.includes('GameSession')) foundSessionId = objId;
                        } catch (e) {
                            console.warn(`Failed to read ${objId}:`, e);
                        }
                    }
                }

                if (!foundSessionId) {
                    throw new Error(`Could not find GameSession. Created: [${createdIds.join(', ')}]`);
                }

                store.setGameObjects(foundSessionId, WORLD_ID);
                await queryClient.invalidateQueries({ queryKey: ['gameSession'] });
                return { sessionId: foundSessionId };
            } catch (err) {
                const errorMsg = parseTransactionError(err);
                store.setError(errorMsg);
                throw err;
            } finally {
                store.setLoading(false);
            }
        },

        // ═══════════════════════════════════════════
        // MOVE PLAYER — direction: 0=up, 1=down, 2=left, 3=right
        // ═══════════════════════════════════════════
        movePlayer: async (direction: number) => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'move_player',
                arguments: [
                    tx.object(store.sessionId!),
                    tx.pure.u8(direction),
                ],
            });
            return executeAndRefresh(tx);
        },

        // ═══════════════════════════════════════════
        // MINE BLOCK — at (x, y)
        // ═══════════════════════════════════════════
        mineBlock: async (x: number, y: number) => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'mine_block',
                arguments: [
                    tx.object(store.sessionId!),
                    tx.pure.u64(x),
                    tx.pure.u64(y),
                ],
            });
            return executeAndRefresh(tx);
        },

        // ═══════════════════════════════════════════
        // PLACE BLOCK — at (x, y) with blockType
        // ═══════════════════════════════════════════
        placeBlock: async (x: number, y: number, blockType: number) => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'place_block',
                arguments: [
                    tx.object(store.sessionId!),
                    tx.pure.u64(x),
                    tx.pure.u64(y),
                    tx.pure.u8(blockType),
                ],
            });
            return executeAndRefresh(tx);
        },

        // ═══════════════════════════════════════════
        // CRAFT TOOL — recipe: 0=wood, 1=stone, 2=iron
        // ═══════════════════════════════════════════
        craftTool: async (recipeId: number) => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'craft_tool',
                arguments: [
                    tx.object(store.sessionId!),
                    tx.pure.u8(recipeId),
                ],
            });
            return executeAndRefresh(tx);
        },
    };
}
