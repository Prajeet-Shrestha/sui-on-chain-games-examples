import { Transaction } from '@mysten/sui/transactions';
import { useDAppKit, useCurrentClient } from '@mysten/dapp-kit-react';
import { PACKAGE_ID, WORLD_ID, ERROR_MAP } from '../constants';
import { useGameStore } from '../stores/gameStore';

function parseTransactionError(failure: { error?: string }): Error {
    const errStr = failure.error ?? '';
    const match = errStr.match(/MoveAbort.*?(\d+)\)?$/);
    if (match) {
        const code = Number(match[1]);
        const message = ERROR_MAP[code] ?? `Transaction failed (code ${code})`;
        return new Error(message);
    }
    return new Error(errStr || 'Transaction failed');
}

export function useGameActions() {
    const dAppKit = useDAppKit();
    const client = useCurrentClient();
    const store = useGameStore();

    /** Sign ONE transaction to start the game — creates the on-chain session */
    async function startGame(level: number): Promise<string | null> {
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
                    tx.pure.u8(level),
                ],
            });

            const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
            if (result.$kind === 'FailedTransaction') {
                throw parseTransactionError(result.FailedTransaction as any);
            }

            const txResult = await client.waitForTransaction({
                digest: result.Transaction.digest,
                include: { effects: true },
            });

            if (txResult.$kind === 'FailedTransaction') {
                throw new Error('Transaction failed after waiting');
            }

            // Find GameStarted event
            const startEvent = (txResult as any).events?.find((e: any) =>
                e.type.includes('::game::GameStarted')
            );

            let sessionId: string | null = null;
            if (startEvent && startEvent.parsedJson) {
                sessionId = startEvent.parsedJson.session_id;
            } else {
                // Fallback (should not be needed if contract emits event)
                const allCreated = (txResult as any).Transaction?.effects?.changedObjects?.filter(
                    (obj: any) => obj.idOperation === 'Created',
                ) ?? [];
                if (allCreated.length > 0) {
                    sessionId = allCreated[allCreated.length - 1].objectId;
                }
            }

            store.setSessionId(sessionId ?? 'pending');
            store.setLoading(false);
            return sessionId;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to start game';
            store.setError(msg);
            store.setLoading(false);
            return null;
        }
    }

    /**
     * Submit ALL moves as a single PTB — fully on-chain verification.
     * Builds one transaction with N × move_player() + 1 × complete_level().
     * One wallet signature, one transaction, full on-chain replay.
     */
    async function submitMoves(moves: number[]): Promise<boolean> {
        if (!store.sessionId) return false;

        store.setLoading(true);
        store.setError(null);

        try {
            const tx = new Transaction();
            const sessionObj = tx.object(store.sessionId);

            // Batch all moves into the PTB
            for (const direction of moves) {
                tx.moveCall({
                    package: PACKAGE_ID,
                    module: 'game',
                    function: 'move_player',
                    arguments: [
                        sessionObj,
                        tx.pure.u8(direction),
                    ],
                });
            }

            // Final call: verify player is at exit
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'complete_level',
                arguments: [sessionObj],
            });

            // Set higher gas budget for large move batches
            const gasBudget = Math.max(50_000_000, moves.length * 500_000);
            tx.setGasBudget(gasBudget);

            const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
            if (result.$kind === 'FailedTransaction') {
                throw parseTransactionError(result.FailedTransaction as any);
            }

            await client.waitForTransaction({
                digest: result.Transaction.digest,
                include: { effects: true },
            });

            store.setLoading(false);
            return true;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to verify moves on-chain';
            store.setError(msg);
            store.setLoading(false);
            return false;
        }
    }

    return { startGame, submitMoves };
}
