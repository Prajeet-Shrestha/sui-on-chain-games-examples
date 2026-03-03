// ═══════════════════════════════════════════════
// City Delivery — On-Chain Game Actions
// PTB batching: buffer per-level, flush between levels
// ═══════════════════════════════════════════════

import { Transaction } from '@mysten/sui/transactions';
import { useDAppKit } from '@mysten/dapp-kit-react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useGameStore } from '../stores/gameStore';
import { PACKAGE_ID, WORLD_ID, ERROR_MAP } from '../constants';
import { suiClient } from '../lib/suiClient';
import { requestSuiFromFaucetV2, getFaucetHost, FaucetRateLimitError } from '@mysten/sui/faucet';
import { useCallback, useRef } from 'react';
import type { DeliveryRecord } from '../lib/deliveryEngine';

// ─── Helpers ───

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
        return 'Faucet rate-limited. Wait a few seconds and try again.';
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

// ─── Hook ───

export function useGameActions() {
    const dAppKit = useDAppKit();
    const account = useCurrentAccount();
    const bufferRef = useRef<DeliveryRecord[]>([]);
    const accountRef = useRef(account);
    accountRef.current = account;

    // Use getState() to avoid store subscription causing re-renders
    const getStore = useCallback(() => useGameStore.getState(), []);

    async function ensureGas(): Promise<boolean> {
        const addr = accountRef.current?.address;
        if (!addr) {
            console.warn('[ensureGas] No account connected');
            return false;
        }
        try {
            const balance = await suiClient.getBalance({ owner: addr });
            const mist = BigInt(balance?.totalBalance ?? '0');
            console.log('[ensureGas] Balance:', mist.toString(), 'MIST');
            if (mist < 10_000_000n) {
                console.log('[ensureGas] Low balance, requesting faucet...');
                return await requestFaucetFunding(addr);
            }
            return true;
        } catch (e) {
            console.warn('[ensureGas] Balance check failed, trying faucet:', e);
            return await requestFaucetFunding(addr);
        }
    }

    /** Buffer a delivery locally (no tx). */
    const recordDelivery = useCallback((record: DeliveryRecord): void => {
        bufferRef.current.push(record);
    }, []);

    /** Flush all buffered deliveries as one PTB. */
    const flushDeliveries = useCallback(async (): Promise<boolean> => {
        const deliveries = bufferRef.current.splice(0);
        if (deliveries.length === 0) return true;

        const { sessionId } = getStore();
        if (!sessionId) {
            console.error('[flush] No session ID');
            return false;
        }

        const store = getStore();
        store.setSyncPending(true);
        store.setError(null);

        try {
            await ensureGas();

            const tx = new Transaction();
            for (const d of deliveries) {
                tx.moveCall({
                    package: PACKAGE_ID,
                    module: 'game',
                    function: 'record_delivery',
                    arguments: [
                        tx.object(sessionId),
                        tx.pure.u64(d.houseId),
                        tx.pure.u64(d.scoreTier),
                        tx.pure.u64(d.cumulativeScore),
                        tx.pure.u64(d.deliveryNumber),
                    ],
                });
            }

            console.log(`[flush] 🔄 PTB: ${deliveries.length}× record_delivery`);
            const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
            if (result.$kind === 'FailedTransaction') throw new Error('PTB failed');

            const synced = getStore().deliveriesSynced + deliveries.length;
            console.log(`[flush] ✅ ${deliveries.length} deliveries on-chain (total synced: ${synced})`);

            const s = getStore();
            s.setDeliveriesSynced(synced);
            s.setBufferedDeliveries(0);
            s.setSyncPending(false);
            return true;
        } catch (e) {
            console.error('[flush] ❌', e);
            // Re-add deliveries to buffer
            bufferRef.current.unshift(...deliveries);
            const s = getStore();
            s.setBufferedDeliveries(bufferRef.current.length);
            s.setSyncPending(false);
            s.setError(parseTransactionError(e));
            return false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dAppKit, getStore]);

    /** Start a new game on-chain. */
    const startGame = useCallback(async (): Promise<string | null> => {
        const store = getStore();
        store.setLoading(true);
        store.setError(null);
        bufferRef.current = [];
        store.setBufferedDeliveries(0);
        store.setNeedsSign(false);

        try {
            await ensureGas();

            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'start_game',
                arguments: [tx.object(WORLD_ID)],
            });

            console.log('[startGame] 🔄 Signing start_game tx...');
            const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
            if (result.$kind === 'FailedTransaction') throw new Error('start_game failed');
            console.log('[startGame] ✅ Transaction result:', result);

            // Extract session ID from created objects
            const changedObjects = result.Transaction.effects?.changedObjects ?? [];
            const createdIds = changedObjects
                .filter((obj: any) => obj.idOperation === 'Created')
                .map((obj: any) => obj.objectId);

            console.log('[startGame] Created object IDs:', createdIds);

            let sessionId = '';
            const objectTypes = (result.Transaction.objectTypes ?? {}) as Record<string, string>;

            for (const id of createdIds) {
                const t = objectTypes[id] ?? '';
                if (t.includes('GameSession')) { sessionId = id; break; }
            }

            // Fallback: query chain directly
            if (!sessionId && createdIds.length > 0) {
                console.log('[startGame] Querying chain for GameSession type...');
                await new Promise(r => setTimeout(r, 2000));
                for (const objId of createdIds) {
                    try {
                        const resp = await suiClient.getObject({ id: objId, options: { showType: true } });
                        const type = resp.data?.type ?? '';
                        console.log(`  ${objId} → ${type}`);
                        if (type.includes('GameSession')) { sessionId = objId; break; }
                    } catch { /* skip */ }
                }
            }
            if (!sessionId && createdIds.length > 0) sessionId = createdIds[0];
            if (!sessionId) throw new Error('GameSession object not found in tx results');

            console.log('[startGame] ✅ Session:', sessionId);
            getStore().setGameObjects(sessionId, WORLD_ID);
            getStore().setLoading(false);
            return sessionId;
        } catch (e) {
            console.error('[startGame] ❌', e);
            getStore().setError(parseTransactionError(e));
            getStore().setLoading(false);
            return null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dAppKit, getStore]);

    /** Save game: flush remaining buffer + save_game in one PTB. */
    const saveGame = useCallback(async (
        finalScore: number,
        totalDeliveries: number,
        perfectCount: number,
        goodCount: number,
        okCount: number,
        missCount: number,
    ): Promise<boolean> => {
        const { sessionId } = getStore();
        if (!sessionId) return false;
        const remaining = bufferRef.current.splice(0);

        getStore().setLoading(true);
        getStore().setError(null);

        try {
            await ensureGas();
            const tx = new Transaction();

            for (const d of remaining) {
                tx.moveCall({
                    package: PACKAGE_ID,
                    module: 'game',
                    function: 'record_delivery',
                    arguments: [
                        tx.object(sessionId),
                        tx.pure.u64(d.houseId),
                        tx.pure.u64(d.scoreTier),
                        tx.pure.u64(d.cumulativeScore),
                        tx.pure.u64(d.deliveryNumber),
                    ],
                });
            }

            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'save_game',
                arguments: [
                    tx.object(sessionId),
                    tx.pure.u64(finalScore),
                    tx.pure.u64(totalDeliveries),
                    tx.pure.u64(perfectCount),
                    tx.pure.u64(goodCount),
                    tx.pure.u64(okCount),
                    tx.pure.u64(missCount),
                ],
            });

            console.log(`[saveGame] 🔄 Final PTB: ${remaining.length}× record_delivery + save_game`);
            const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
            if (result.$kind === 'FailedTransaction') throw new Error('save PTB failed');

            console.log('[saveGame] ✅ Saved on-chain!');
            getStore().setLoading(false);
            return true;
        } catch (e) {
            console.error('[saveGame] ❌', e);
            getStore().setError(parseTransactionError(e));
            getStore().setLoading(false);
            return false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dAppKit, getStore]);

    return { startGame, recordDelivery, flushDeliveries, saveGame };
}
