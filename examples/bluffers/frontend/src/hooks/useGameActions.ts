import { Transaction } from '@mysten/sui/transactions';
import { useDAppKit, useCurrentClient } from '@mysten/dapp-kit-react';
import { useQueryClient } from '@tanstack/react-query';
import { requestSuiFromFaucetV2, getFaucetHost } from '@mysten/sui/faucet';
import { suiClient } from '../lib/suiClient';
import { PACKAGE_ID, GAME_REGISTRY_ID, RANDOM_ID, GAME_ERROR_MAP } from '../constants';
import { useUIStore } from '../stores/uiStore';

// ─── Error Parser ─────────────────────────────────
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

// ─── Auto-fund from testnet faucet if needed ─────
async function ensureGas(address: string) {
    try {
        const balance = await suiClient.getBalance({ owner: address });
        if (BigInt(balance?.totalBalance ?? '0') < 50_000_000n) {
            await requestSuiFromFaucetV2({
                host: getFaucetHost('testnet'),
                recipient: address,
            });
            await new Promise((r) => setTimeout(r, 1500));
        }
    } catch {
        // Faucet may be rate-limited; continue anyway
    }
}

// ─── Main Hook ───────────────────────────────────
export function useGameActions() {
    const dAppKit = useDAppKit();
    const client = useCurrentClient();
    const queryClient = useQueryClient();
    const { setIsPending, setError, setGameId } = useUIStore();

    async function execute(tx: Transaction, signerAddress?: string) {
        setIsPending(true);
        setError(null);
        try {
            if (signerAddress) await ensureGas(signerAddress);

            const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });

            if (result.$kind === 'FailedTransaction') {
                throw parseTransactionError(result.FailedTransaction as unknown as { error: string });
            }

            await client.waitForTransaction({
                digest: result.Transaction.digest,
                include: { effects: true },
            });

            await queryClient.invalidateQueries({ queryKey: ['blufferGame'] });

            return result.Transaction;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Transaction failed';
            setError(message);
            throw err;
        } finally {
            setIsPending(false);
        }
    }

    // ─── create_lobby ──────────────────────────────
    async function createLobby(maxPlayers: number, signerAddress: string) {
        const tx = new Transaction();
        tx.moveCall({
            package: PACKAGE_ID,
            module: 'bluffers',
            function: 'create_lobby',
            arguments: [
                tx.object(GAME_REGISTRY_ID),
                tx.pure.u64(maxPlayers),
            ],
        });

        const result = await execute(tx, signerAddress);

        const txDetails = await suiClient.getTransactionBlock({
            digest: result.digest,
            options: { showEvents: true, showObjectChanges: true },
        });

        const event = txDetails.events?.find(e =>
            e.type?.includes('::bluffers::GameCreated')
        );
        if (event?.parsedJson) {
            const gameId = (event.parsedJson as { game_id: string }).game_id;
            setGameId(gameId);
            return gameId;
        }

        const created = txDetails.objectChanges?.find(c =>
            c.type === 'created' && (c as { objectType: string }).objectType?.includes('::bluffers::BlufferGame')
        );
        if (created && 'objectId' in created) {
            setGameId(created.objectId);
            return created.objectId;
        }

        return null;
    }

    // ─── join_lobby ────────────────────────────────
    async function joinLobby(gameId: string, signerAddress: string) {
        const tx = new Transaction();
        tx.moveCall({
            package: PACKAGE_ID,
            module: 'bluffers',
            function: 'join_lobby',
            arguments: [tx.object(gameId)],
        });
        await execute(tx, signerAddress);
    }

    // ─── start_game ────────────────────────────────
    async function startGame(gameId: string, signerAddress: string) {
        const tx = new Transaction();
        tx.moveCall({
            package: PACKAGE_ID,
            module: 'bluffers',
            function: 'start_game',
            arguments: [
                tx.object(gameId),
                tx.object(RANDOM_ID),
            ],
        });
        await execute(tx, signerAddress);
    }

    // ─── play_cards — NO claim param (always table card) ──────────────────────────────
    async function playCards(
        gameId: string,
        cardIndices: number[],
        signerAddress: string,
    ) {
        const tx = new Transaction();
        tx.moveCall({
            package: PACKAGE_ID,
            module: 'bluffers',
            function: 'play_cards',
            arguments: [
                tx.object(gameId),
                tx.pure.vector('u64', cardIndices),
            ],
        });
        await execute(tx, signerAddress);
    }

    // ─── pass ──────────────────────────────────────
    async function pass(gameId: string, signerAddress: string) {
        const tx = new Transaction();
        tx.moveCall({
            package: PACKAGE_ID,
            module: 'bluffers',
            function: 'pass',
            arguments: [tx.object(gameId)],
        });
        await execute(tx, signerAddress);
    }

    // ─── call_liar ─────────────────────────────────
    async function callLiar(gameId: string, signerAddress: string) {
        const tx = new Transaction();
        tx.moveCall({
            package: PACKAGE_ID,
            module: 'bluffers',
            function: 'call_liar',
            arguments: [
                tx.object(gameId),
                tx.object(RANDOM_ID),
            ],
        });
        await execute(tx, signerAddress);
    }

    // ─── trigger_pull (empty-hand mechanic) ───────
    async function triggerPull(gameId: string, signerAddress: string) {
        const tx = new Transaction();
        tx.moveCall({
            package: PACKAGE_ID,
            module: 'bluffers',
            function: 'trigger_pull',
            arguments: [
                tx.object(gameId),
                tx.object(RANDOM_ID),
            ],
        });
        await execute(tx, signerAddress);
    }

    return {
        createLobby,
        joinLobby,
        startGame,
        playCards,
        pass,
        callLiar,
        triggerPull,
    };
}
