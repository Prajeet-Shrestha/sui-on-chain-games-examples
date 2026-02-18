import { Transaction } from '@mysten/sui/transactions';
import { useDAppKit, useCurrentClient } from '@mysten/dapp-kit-react';
import { PACKAGE_ID, WORLD_ID, GAME_ERROR_MAP } from '../constants';
import { useUIStore } from '../stores/uiStore';

function parseTransactionError(failure: { error: string }): Error {
    const match = failure.error.match(/MoveAbort.*?(\d+)\)?$/);
    if (match) {
        const code = Number(match[1]);
        const message = GAME_ERROR_MAP[code] ?? `Transaction failed (code ${code})`;
        return new Error(message);
    }
    return new Error(failure.error || 'Transaction failed');
}

export function useGameActions() {
    const dAppKit = useDAppKit();
    const client = useCurrentClient();
    const { setIsPending, setError } = useUIStore();

    return {
        /**
         * Submit all moves as a single PTB:
         *   start_level() → choose_color() × N → share_session()
         * Returns the transaction digest.
         */
        submitGame: async (level: number, colors: number[]) => {
            setIsPending(true);
            setError(null);
            try {
                const tx = new Transaction();

                // 1. Start level — returns GameSession by value
                const [session] = tx.moveCall({
                    package: PACKAGE_ID,
                    module: 'game',
                    function: 'start_level',
                    arguments: [
                        tx.object(WORLD_ID),
                        tx.pure.u8(level),
                    ],
                });

                // 2. Apply each color choice
                for (const color of colors) {
                    tx.moveCall({
                        package: PACKAGE_ID,
                        module: 'game',
                        function: 'choose_color',
                        arguments: [
                            session,
                            tx.pure.u8(color),
                        ],
                    });
                }

                // 3. Share the session so it's visible on-chain
                tx.moveCall({
                    package: PACKAGE_ID,
                    module: 'game',
                    function: 'share_session',
                    arguments: [session],
                });

                const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });

                if (result.$kind === 'FailedTransaction') {
                    throw parseTransactionError(result.FailedTransaction as any);
                }

                await client.waitForTransaction({
                    digest: result.Transaction.digest,
                    include: { effects: true },
                });

                return result.Transaction.digest;
            } catch (err: any) {
                const message = err instanceof Error ? err.message : 'Transaction failed';
                setError(message);
                throw err;
            } finally {
                setIsPending(false);
            }
        },
    };
}
