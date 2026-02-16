import { Transaction } from '@mysten/sui/transactions';
import { useDAppKit, useCurrentClient } from '@mysten/dapp-kit-react';
import { useQueryClient } from '@tanstack/react-query';
import { PACKAGE_ID, WORLD_ID, TAVERN_ID, CLOCK_ID } from '../constants';
import { suiClient } from '../lib/suiClient';
import { useUIStore } from '../stores/uiStore';
import { parseTransactionError } from '../lib/errors';

export type TurnAction =
    | { type: 'move'; unitId: string; toX: number; toY: number }
    | { type: 'attack'; unitId: string; targetId: string }
    | { type: 'special'; unitId: string; targetId: string };

export function useGameActions() {
    const dAppKit = useDAppKit();
    const client = useCurrentClient();
    const queryClient = useQueryClient();
    const { sessionId, gridId } = useUIStore();

    async function executeAndRefresh(tx: Transaction, extraKeys: string[] = []) {
        const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });

        if (!result) {
            throw new Error('Transaction was cancelled or returned no result');
        }

        if (result.$kind === 'FailedTransaction') {
            throw parseTransactionError(result.FailedTransaction);
        }

        if (!result.Transaction) {
            throw new Error('Unexpected transaction result format');
        }

        await client.waitForTransaction({
            digest: result.Transaction.digest,
            include: { effects: true },
        });

        const keys = ['roster', 'gameSession', 'grid', 'entity', 'entities', ...extraKeys];
        await Promise.all(
            keys.map((k) => queryClient.refetchQueries({ queryKey: [k] })),
        );

        return result.Transaction;
    }

    return {
        // ═══ Metagame ═══

        createRoster: () => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'create_roster',
            });
            return executeAndRefresh(tx);
        },

        recruitUnit: (rosterId: string, classId: number, name: string) => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'recruit_unit',
                arguments: [
                    tx.object(WORLD_ID),
                    tx.object(TAVERN_ID),
                    tx.object(rosterId),
                    tx.pure.u8(classId),
                    tx.pure.vector('u8', Array.from(new TextEncoder().encode(name))),
                    tx.object(CLOCK_ID),
                ],
            });
            return executeAndRefresh(tx);
        },

        sellUnit: (rosterId: string, entityId: string) => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'sell_unit',
                arguments: [
                    tx.object(rosterId),
                    tx.object(entityId),
                ],
            });
            return executeAndRefresh(tx);
        },

        renameUnit: (entityId: string, newName: string) => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'rename_unit',
                arguments: [
                    tx.object(entityId),
                    tx.pure.vector('u8', Array.from(new TextEncoder().encode(newName))),
                ],
            });
            return executeAndRefresh(tx);
        },

        // ═══ Battle Session ═══

        createSession: async (rosterId: string, maxUnits: number) => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'create_session',
                arguments: [
                    tx.object(WORLD_ID),
                    tx.object(rosterId),
                    tx.pure.u64(maxUnits),
                ],
            });

            const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
            if (result.$kind === 'FailedTransaction') {
                throw parseTransactionError(result.FailedTransaction);
            }

            const txResult = await client.waitForTransaction({
                digest: result.Transaction.digest,
                include: { effects: true },
            });

            // Extract created object IDs and identify Session vs Grid by type
            if (txResult.$kind === 'Transaction') {
                const created = txResult.Transaction.effects?.changedObjects?.filter(
                    (obj: any) => obj.idOperation === 'Created',
                ) ?? [];

                console.log('[createSession] txResult effects created:', JSON.stringify(created));

                const ids = created.map((c: any) => c.objectId);
                console.log('[createSession] created object IDs:', ids);

                // Fetch each created object to determine its type
                let detectedSessionId = '';
                let detectedGridId = '';
                for (const id of ids) {
                    try {
                        const obj = await suiClient.getObject({ id, options: { showType: true } });
                        const typeName = obj.data?.type ?? '';
                        console.log(`[createSession] object ${id} type: "${typeName}"`);
                        if (typeName.includes('GameSession')) {
                            detectedSessionId = id;
                        } else if (typeName.includes('Grid')) {
                            detectedGridId = id;
                        }
                    } catch (e) {
                        console.error(`[createSession] error fetching object ${id}:`, e);
                    }
                }

                console.log('[createSession] detected sessionId:', detectedSessionId, 'gridId:', detectedGridId);
                await queryClient.refetchQueries({ queryKey: ['roster'] });
                return { sessionId: detectedSessionId, gridId: detectedGridId };
            }
            console.warn('[createSession] txResult.$kind was not Transaction:', txResult.$kind);
            return { sessionId: '', gridId: '' };
        },

        joinSession: async (sId: string, rosterId: string) => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'join_session',
                arguments: [
                    tx.object(sId),
                    tx.object(rosterId),
                ],
            });
            return executeAndRefresh(tx);
        },

        placeUnit: (entityId: string, x: number, y: number) => {
            if (!sessionId || !gridId) throw new Error('No active session');
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'place_unit',
                arguments: [
                    tx.object(sessionId),
                    tx.object(WORLD_ID),
                    tx.object(gridId),
                    tx.object(entityId),
                    tx.pure.u64(x),
                    tx.pure.u64(y),
                ],
            });
            return executeAndRefresh(tx);
        },

        readyUp: () => {
            if (!sessionId) throw new Error('No active session');
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'ready_up',
                arguments: [tx.object(sessionId)],
            });
            return executeAndRefresh(tx);
        },

        placeAllUnits: (sId: string, gId: string, placements: { entityId: string; x: number; y: number }[]) => {
            if (!sId || !gId) throw new Error('No active session');
            if (placements.length === 0) throw new Error('No units to place');
            const tx = new Transaction();

            // Batch all place_unit calls
            for (const { entityId, x, y } of placements) {
                tx.moveCall({
                    package: PACKAGE_ID,
                    module: 'game',
                    function: 'place_unit',
                    arguments: [
                        tx.object(sId),
                        tx.object(WORLD_ID),
                        tx.object(gId),
                        tx.object(entityId),
                        tx.pure.u64(x),
                        tx.pure.u64(y),
                    ],
                });
            }

            // Auto ready-up after placing
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'ready_up',
                arguments: [tx.object(sId)],
            });

            return executeAndRefresh(tx);
        },

        executeTurn: (aliveUnitIds: string[], actions: TurnAction[]) => {
            if (!sessionId || !gridId) throw new Error('No active session');
            const tx = new Transaction();

            // 1. Refresh all alive units (resets AP, ticks status effects)
            for (const unitId of aliveUnitIds) {
                tx.moveCall({
                    package: PACKAGE_ID,
                    module: 'game',
                    function: 'refresh_unit',
                    arguments: [
                        tx.object(sessionId),
                        tx.object(WORLD_ID),
                        tx.object(unitId),
                    ],
                });
            }

            // 2. Execute all queued actions in order
            for (const action of actions) {
                switch (action.type) {
                    case 'move':
                        tx.moveCall({
                            package: PACKAGE_ID,
                            module: 'game',
                            function: 'move_unit',
                            arguments: [
                                tx.object(sessionId),
                                tx.object(WORLD_ID),
                                tx.object(gridId),
                                tx.object(action.unitId),
                                tx.pure.u64(action.toX),
                                tx.pure.u64(action.toY),
                            ],
                        });
                        break;
                    case 'attack':
                        tx.moveCall({
                            package: PACKAGE_ID,
                            module: 'game',
                            function: 'attack_unit',
                            arguments: [
                                tx.object(sessionId),
                                tx.object(WORLD_ID),
                                tx.object(gridId),
                                tx.object(action.unitId),
                                tx.object(action.targetId),
                            ],
                        });
                        break;
                    case 'special':
                        tx.moveCall({
                            package: PACKAGE_ID,
                            module: 'game',
                            function: 'use_special',
                            arguments: [
                                tx.object(sessionId),
                                tx.object(WORLD_ID),
                                tx.object(gridId),
                                tx.object(action.unitId),
                                tx.object(action.targetId),
                            ],
                        });
                        break;
                }
            }

            // 3. End turn
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'end_turn',
                arguments: [tx.object(sessionId)],
            });

            return executeAndRefresh(tx);
        },

        refreshUnit: (entityId: string) => {
            if (!sessionId) throw new Error('No active session');
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'refresh_unit',
                arguments: [
                    tx.object(sessionId),
                    tx.object(WORLD_ID),
                    tx.object(entityId),
                ],
            });
            return executeAndRefresh(tx);
        },

        moveUnit: (entityId: string, toX: number, toY: number) => {
            if (!sessionId || !gridId) throw new Error('No active session');
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'move_unit',
                arguments: [
                    tx.object(sessionId),
                    tx.object(WORLD_ID),
                    tx.object(gridId),
                    tx.object(entityId),
                    tx.pure.u64(toX),
                    tx.pure.u64(toY),
                ],
            });
            return executeAndRefresh(tx);
        },

        attackUnit: (attackerId: string, defenderId: string) => {
            if (!sessionId || !gridId) throw new Error('No active session');
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'attack_unit',
                arguments: [
                    tx.object(sessionId),
                    tx.object(WORLD_ID),
                    tx.object(gridId),
                    tx.object(attackerId),
                    tx.object(defenderId),
                ],
            });
            return executeAndRefresh(tx);
        },

        useSpecial: (unitId: string, targetId: string) => {
            if (!sessionId || !gridId) throw new Error('No active session');
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'use_special',
                arguments: [
                    tx.object(sessionId),
                    tx.object(WORLD_ID),
                    tx.object(gridId),
                    tx.object(unitId),
                    tx.object(targetId),
                ],
            });
            return executeAndRefresh(tx);
        },

        endTurn: () => {
            if (!sessionId) throw new Error('No active session');
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'end_turn',
                arguments: [tx.object(sessionId)],
            });
            return executeAndRefresh(tx);
        },

        surrender: () => {
            if (!sessionId) throw new Error('No active session');
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'surrender',
                arguments: [tx.object(sessionId)],
            });
            return executeAndRefresh(tx);
        },

        claimRewards: (rosterId: string) => {
            if (!sessionId) throw new Error('No active session');
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'claim_rewards',
                arguments: [
                    tx.object(sessionId),
                    tx.object(rosterId),
                ],
            });
            return executeAndRefresh(tx);
        },

        cancelSession: (sId: string, rosterId: string) => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'cancel_session',
                arguments: [
                    tx.object(sId),
                    tx.object(rosterId),
                ],
            });
            return executeAndRefresh(tx);
        },

        destroyDeadUnit: (rosterId: string, entityId: string) => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'destroy_dead_unit',
                arguments: [
                    tx.object(rosterId),
                    tx.object(entityId),
                ],
            });
            return executeAndRefresh(tx);
        },
    };
}
