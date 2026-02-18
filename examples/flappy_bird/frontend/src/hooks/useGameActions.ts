// ═══════════════════════════════════════════════
// SuiFlap — On-Chain Game Actions
// Only 2 transactions: start_game + save_game
// ═══════════════════════════════════════════════

import { Transaction } from '@mysten/sui/transactions';
import { useDAppKit } from '@mysten/dapp-kit-react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useGameStore } from '../stores/gameStore';
import { PACKAGE_ID, WORLD_ID, ERROR_MAP } from '../constants';
import { suiClient } from '../lib/suiClient';
import { requestSuiFromFaucetV2, getFaucetHost, FaucetRateLimitError } from '@mysten/sui/faucet';

function parseTransactionError(error: unknown): string {
    const errorStr = typeof error === 'string'
        ? error
        : (error instanceof Error ? error.message : JSON.stringify(error));
    const match = errorStr.match(/MoveAbort.*?(\d+)/);
    if (match) {
        const code = Number(match[1]);
        return ERROR_MAP[code] ?? `Move abort code ${code}`;
    }
    if (errorStr.includes('Insufficient') || errorStr.includes('insufficient'))
        return 'Insufficient SUI for gas. The burner wallet needs testnet SUI.';
    if (errorStr.includes('rate') || errorStr.includes('429') || errorStr.includes('RateLimit'))
        return 'Faucet rate-limited. Please wait a few seconds and try again.';
    return errorStr.length > 200 ? errorStr.slice(0, 200) + '...' : errorStr;
}

async function requestFaucetFunding(address: string): Promise<boolean> {
    console.log(`[faucet] Requesting testnet SUI for: ${address}`);
    try {
        await requestSuiFromFaucetV2({
            host: getFaucetHost('testnet'),
            recipient: address,
        });
        console.log('[faucet] ✅ Success!');
        await new Promise(r => setTimeout(r, 1500));
        return true;
    } catch (e) {
        if (e instanceof FaucetRateLimitError) {
            console.warn('[faucet] Rate-limited');
        } else {
            console.error('[faucet] Error:', e);
        }
        return false;
    }
}

export function useGameActions() {
    const dAppKit = useDAppKit();
    const store = useGameStore();
    const account = useCurrentAccount();

    async function ensureGas(): Promise<boolean> {
        if (!account?.address) {
            console.warn('[ensureGas] No account connected');
            return false;
        }
        try {
            const balance = await suiClient.getBalance({ owner: account.address });
            const balanceMist = BigInt(balance?.totalBalance ?? '0');
            console.log('[ensureGas] Balance:', balanceMist.toString(), 'MIST');
            if (balanceMist < 10_000_000n) {
                console.log('[ensureGas] Low balance, requesting faucet...');
                return await requestFaucetFunding(account.address);
            }
            return true;
        } catch (e) {
            console.warn('[ensureGas] Balance check failed:', e);
            return await requestFaucetFunding(account.address);
        }
    }

    // ─── Start a new game session on-chain ───
    const startGame = async (): Promise<string | null> => {
        store.setLoading(true);
        store.setError(null);
        try {
            // Check if wallet has any coins at all first
            if (!account?.address) throw new Error('No wallet connected');

            const coins = await suiClient.getCoins({ owner: account.address, limit: 1 });
            if (!coins.data || coins.data.length === 0) {
                // No coins at all — try faucet
                const funded = await requestFaucetFunding(account.address);
                if (!funded) {
                    throw new Error('Wallet has no SUI. Please fund your wallet at https://faucet.sui.io');
                }
            } else {
                // Has coins, check balance
                await ensureGas();
            }

            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'start_game',
                arguments: [tx.object(WORLD_ID)],
            });

            console.log('[startGame] Submitting transaction...');
            let result: any;
            try {
                result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
            } catch (sdkError: any) {
                // Handle SDK internal errors (e.g. endsWith bug when resolving objects)
                const msg = sdkError?.message ?? String(sdkError);
                if (msg.includes('endsWith') || msg.includes('Cannot read properties')) {
                    throw new Error('Insufficient SUI for gas. Please fund your wallet at https://faucet.sui.io');
                }
                throw sdkError;
            }

            if (result.$kind === 'FailedTransaction') {
                const failedTx = result.FailedTransaction as any;
                const msg = failedTx?.status?.error ?? failedTx?.error ?? 'Transaction failed';
                throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
            }

            console.log('[startGame] Transaction succeeded!');

            const changedObjects = result.Transaction?.effects?.changedObjects ?? [];
            const createdIds = changedObjects
                .filter((obj: any) => obj.idOperation === 'Created')
                .map((obj: any) => obj.objectId);

            let sessionId = '';
            const objectTypes = (result.Transaction?.objectTypes ?? {}) as Record<string, string>;

            for (const id of createdIds) {
                const t = objectTypes[id] ?? '';
                if (t.includes('GameSession')) {
                    sessionId = id;
                    break;
                }
            }

            if (!sessionId && createdIds.length > 0) {
                console.log('[startGame] objectTypes incomplete, fetching via JSON-RPC...');
                await new Promise(r => setTimeout(r, 2000));

                for (const objId of createdIds) {
                    try {
                        const resp = await suiClient.getObject({
                            id: objId,
                            options: { showType: true },
                        });
                        const typeName = resp.data?.type ?? '';
                        if (typeName.includes('GameSession')) {
                            sessionId = objId;
                            break;
                        }
                    } catch (e) {
                        console.warn(`[startGame] Failed to read ${objId}:`, e);
                    }
                }
            }

            if (!sessionId && createdIds.length > 0) {
                sessionId = createdIds[0];
            }

            if (!sessionId) {
                throw new Error('Could not find GameSession in transaction results');
            }

            console.log('[startGame] ✅ Session ID:', sessionId);
            store.setGameObjects(sessionId, WORLD_ID);
            store.setLoading(false);
            return sessionId;
        } catch (e) {
            console.error('[startGame] Error:', e instanceof Error ? e.message : e);
            store.setError(parseTransactionError(e));
            store.setLoading(false);
            return null;
        }
    };

    // ─── Save final score to blockchain ───
    const saveGame = async (
        finalScore: number,
        pipesPassed: number,
    ): Promise<boolean> => {
        if (!store.sessionId) {
            console.warn('[saveGame] No sessionId, skipping save');
            return false;
        }
        store.setLoading(true);
        store.setError(null);
        try {
            await ensureGas();

            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'save_game',
                arguments: [
                    tx.object(store.sessionId),
                    tx.pure.u64(finalScore),
                    tx.pure.u64(pipesPassed),
                ],
            });

            console.log('[saveGame] Submitting transaction...');
            const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });

            if (result.$kind === 'FailedTransaction') {
                const failedTx = result.FailedTransaction as any;
                const msg = failedTx?.status?.error ?? failedTx?.error ?? 'Transaction failed';
                throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
            }

            console.log('[saveGame] ✅ Score saved successfully!');
            store.setLoading(false);
            return true;
        } catch (e) {
            console.error('[saveGame] Error:', e instanceof Error ? e.message : e);
            store.setError(parseTransactionError(e));
            store.setLoading(false);
            return false;
        }
    };

    return { startGame, saveGame };
}
