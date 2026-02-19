import { Transaction } from '@mysten/sui/transactions';
import { useDAppKit, useCurrentClient } from '@mysten/dapp-kit-react';
import { useQueryClient } from '@tanstack/react-query';
import { PACKAGE_ID, SANTA_MAILBOX_ID, CLOCK_ID, GAME_ERROR_MAP } from '../constants';
import { useUIStore } from '../stores/uiStore';

function parseTransactionError(failure: { error: string }): Error {
    const errorStr = typeof failure.error === 'string'
        ? failure.error
        : JSON.stringify(failure.error);
    const match = errorStr.match(/MoveAbort.*?(\d+)\)?$/);
    if (match) {
        const code = Number(match[1]);
        const message = GAME_ERROR_MAP[code] ?? `Transaction failed (code ${code})`;
        return new Error(message);
    }
    return new Error(errorStr || 'Transaction failed');
}

export function useGameActions() {
    const dAppKit = useDAppKit();
    const client = useCurrentClient();
    const queryClient = useQueryClient();
    const { setIsPending, setError } = useUIStore();

    async function execute(tx: Transaction) {
        setIsPending(true);
        setError(null);
        try {
            const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });

            if (result.$kind === 'FailedTransaction') {
                throw parseTransactionError(result.FailedTransaction as any);
            }

            await client.waitForTransaction({
                digest: result.Transaction.digest,
                include: { effects: true },
            });

            await queryClient.refetchQueries({ queryKey: ['santaMailbox'] });

            return result.Transaction;
        } catch (err: any) {
            const message = err instanceof Error ? err.message : 'Transaction failed';
            setError(message);
            throw err;
        } finally {
            setIsPending(false);
        }
    }

    return {
        sendLetter: async (messageText: string) => {
            const tx = new Transaction();
            const encoder = new TextEncoder();
            const messageBytes = Array.from(encoder.encode(messageText));

            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'send_letter',
                arguments: [
                    tx.object(SANTA_MAILBOX_ID),
                    tx.pure.vector('u8', messageBytes),
                    tx.object(CLOCK_ID),
                ],
            });

            return execute(tx);
        },
    };
}
