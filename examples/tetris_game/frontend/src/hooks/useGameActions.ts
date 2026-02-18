// ═══════════════════════════════════════════════
// SuiTris — Fully On-Chain Game Actions
//
// Every piece placement is recorded on-chain.
// Pieces are buffered locally. When the buffer hits the
// threshold, the game pauses and the player signs ONE big
// batched PTB containing all buffered place_piece calls.
// ═══════════════════════════════════════════════

import { Transaction } from '@mysten/sui/transactions';
import { useDAppKit } from '@mysten/dapp-kit-react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useGameStore } from '../stores/gameStore';
import { PACKAGE_ID, WORLD_ID, SIGN_THRESHOLD, ERROR_MAP } from '../constants';
import { suiClient } from '../lib/suiClient';
import { requestSuiFromFaucetV2, getFaucetHost, FaucetRateLimitError } from '@mysten/sui/faucet';
import { useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface PieceRecord {
    pieceType: number;        // 0-6
    col: number;              // 0-9
    rotation: number;         // 0-3
    linesClearedByThis: number;
    cumulativeScore: number;
    cumulativeLines: number;
}

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

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
        return 'Insufficient SUI for gas. Request testnet SUI from the faucet.';
    if (errorStr.includes('rate') || errorStr.includes('429') || errorStr.includes('RateLimit'))
        return 'Faucet rate-limited. Wait a few seconds and try again.';
    return errorStr.length > 200 ? errorStr.slice(0, 200) + '...' : errorStr;
}

async function requestFaucetFunding(address: string): Promise<boolean> {
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`[faucet] Attempt ${attempt}/${MAX_RETRIES}`);
        try {
            await requestSuiFromFaucetV2({
                host: getFaucetHost('testnet'),
                recipient: address,
            });
            console.log('[faucet] ✅ Success!');
            await new Promise(r => setTimeout(r, 2000));
            return true;
        } catch (e) {
            if (e instanceof FaucetRateLimitError) {
                const waitSec = Math.min(attempt * 3, 10);
                console.warn(`[faucet] Rate-limited, waiting ${waitSec}s...`);
                await new Promise(r => setTimeout(r, waitSec * 1000));
            } else {
                console.error(`[faucet] Error:`, e);
                return false;
            }
        }
    }
    return false;
}

// ═══════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════

export function useGameActions() {
    const dAppKit = useDAppKit();
    const store = useGameStore();
    const account = useCurrentAccount();

    // Piece buffer — accumulates locally until signed
    const pieceBufferRef = useRef<PieceRecord[]>([]);

    async function ensureGas(): Promise<boolean> {
        if (!account?.address) return false;
        try {
            const balance = await suiClient.getBalance({ owner: account.address });
            const balanceMist = BigInt(balance?.totalBalance ?? '0');
            if (balanceMist < 10_000_000n) {
                return await requestFaucetFunding(account.address);
            }
            return true;
        } catch {
            if (account?.address) return await requestFaucetFunding(account.address);
            return false;
        }
    }

    // ─── Record a piece (buffered locally, no tx yet) ───
    const recordPiece = useCallback((record: PieceRecord): boolean => {
        pieceBufferRef.current.push(record);
        const count = pieceBufferRef.current.length;
        store.setBufferedPieces(count);

        console.log(
            `[record] Piece #${count} buffered (type=${record.pieceType} col=${record.col} rot=${record.rotation} lines=${record.linesClearedByThis})`,
        );

        // Check if we need to pause for signing
        if (count >= SIGN_THRESHOLD) {
            console.log(`[record] ⚠️ Buffer at ${count}/${SIGN_THRESHOLD} → pause for signing`);
            store.setNeedsSign(true);
            return true; // signal: game should pause
        }
        return false; // signal: game continues
    }, [store]);

    // ─── Flush buffer: build ONE big PTB, player signs ───
    const flushPieces = useCallback(async (): Promise<boolean> => {
        const pieces = pieceBufferRef.current.splice(0);
        if (pieces.length === 0) {
            store.setNeedsSign(false);
            return true;
        }
        if (!store.sessionId) return false;

        const sessionId = store.sessionId;
        store.setSyncPending(true);
        store.setError(null);

        try {
            await ensureGas();

            const tx = new Transaction();
            for (const p of pieces) {
                tx.moveCall({
                    package: PACKAGE_ID,
                    module: 'game',
                    function: 'place_piece',
                    arguments: [
                        tx.object(sessionId),
                        tx.pure.u64(p.pieceType),
                        tx.pure.u64(p.col),
                        tx.pure.u64(p.rotation),
                        tx.pure.u64(p.linesClearedByThis),
                        tx.pure.u64(p.cumulativeScore),
                        tx.pure.u64(p.cumulativeLines),
                    ],
                });
            }

            console.log(`[flush] 🔄 PTB: ${pieces.length}× place_piece → signing...`);
            const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });

            if (result.$kind === 'FailedTransaction') {
                throw new Error('Batch PTB failed');
            }

            const synced = store.piecesSynced + pieces.length;
            console.log(`[flush] ✅ ${pieces.length} pieces confirmed on-chain! (total synced: ${synced})`);
            store.setPiecesSynced(synced);
            store.setBufferedPieces(0);
            store.setNeedsSign(false);
            return true;
        } catch (e) {
            console.error('[flush] ❌ Batch failed:', e);
            // Put pieces back in buffer so they aren't lost
            pieceBufferRef.current.unshift(...pieces);
            store.setBufferedPieces(pieceBufferRef.current.length);
            store.setSyncPending(false);
            store.setError(parseTransactionError(e));
            return false;
        }
    }, [dAppKit, store, ensureGas]);

    // ─── Start a new game session on-chain ───
    const startGame = useCallback(async (): Promise<string | null> => {
        store.setLoading(true);
        store.setError(null);
        pieceBufferRef.current = [];
        store.setBufferedPieces(0);
        store.setNeedsSign(false);

        try {
            const hasGas = await ensureGas();
            if (!hasGas) {
                console.warn('[startGame] No gas, playing local-only');
                store.setLoading(false);
                return null;
            }

            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'start_game',
                arguments: [tx.object(WORLD_ID)],
            });

            console.log('[startGame] Submitting...');
            const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });

            if (result.$kind === 'FailedTransaction') {
                const failedTx = result.FailedTransaction as any;
                const msg = failedTx?.status?.error ?? failedTx?.error ?? 'Transaction failed';
                throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
            }

            // Extract session ID
            const changedObjects = result.Transaction.effects?.changedObjects ?? [];
            const createdIds = changedObjects
                .filter((obj: any) => obj.idOperation === 'Created')
                .map((obj: any) => obj.objectId);

            let sessionId = '';
            const objectTypes = (result.Transaction.objectTypes ?? {}) as Record<string, string>;

            for (const id of createdIds) {
                const t = objectTypes[id] ?? '';
                if (t.includes('GameSession')) { sessionId = id; break; }
            }

            // JSON-RPC fallback
            if (!sessionId && createdIds.length > 0) {
                await new Promise(r => setTimeout(r, 2000));
                for (const objId of createdIds) {
                    try {
                        const resp = await suiClient.getObject({ id: objId, options: { showType: true } });
                        if ((resp.data?.type ?? '').includes('GameSession')) { sessionId = objId; break; }
                    } catch { /* skip */ }
                }
            }

            if (!sessionId && createdIds.length > 0) sessionId = createdIds[0];
            if (!sessionId) throw new Error('Could not find GameSession');

            console.log('[startGame] ✅ Session:', sessionId);
            store.setGameObjects(sessionId, WORLD_ID);
            store.setLoading(false);
            return sessionId;
        } catch (e) {
            console.error('[startGame] Error:', e instanceof Error ? e.message : e);
            store.setError(parseTransactionError(e));
            store.setLoading(false);
            return null;
        }
    }, [dAppKit, store, ensureGas]);

    // ─── Save game: flush remaining buffer + save_game in one PTB ───
    const saveGame = useCallback(async (
        finalScore: number, totalLines: number, level: number, piecesPlaced: number,
    ): Promise<boolean> => {
        if (!store.sessionId) return false;

        const sessionId = store.sessionId;
        const remaining = pieceBufferRef.current.splice(0);

        store.setLoading(true);
        store.setError(null);

        try {
            await ensureGas();

            const tx = new Transaction();

            // Flush remaining buffered pieces
            for (const p of remaining) {
                tx.moveCall({
                    package: PACKAGE_ID,
                    module: 'game',
                    function: 'place_piece',
                    arguments: [
                        tx.object(sessionId),
                        tx.pure.u64(p.pieceType),
                        tx.pure.u64(p.col),
                        tx.pure.u64(p.rotation),
                        tx.pure.u64(p.linesClearedByThis),
                        tx.pure.u64(p.cumulativeScore),
                        tx.pure.u64(p.cumulativeLines),
                    ],
                });
            }

            // Then save the game
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'save_game',
                arguments: [
                    tx.object(sessionId),
                    tx.pure.u64(finalScore),
                    tx.pure.u64(totalLines),
                    tx.pure.u64(level),
                    tx.pure.u64(piecesPlaced),
                ],
            });

            const totalCalls = remaining.length + 1;
            console.log(`[saveGame] 🔄 Final PTB: ${remaining.length}× place_piece + save_game (${totalCalls} calls)...`);
            const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });

            if (result.$kind === 'FailedTransaction') {
                throw new Error('Save PTB failed');
            }

            console.log('[saveGame] ✅ Game saved on-chain!');
            store.setPiecesSynced(store.piecesSynced + remaining.length);
            store.setBufferedPieces(0);
            store.setNeedsSign(false);
            store.setLoading(false);
            return true;
        } catch (e) {
            console.error('[saveGame] Error:', e instanceof Error ? e.message : e);
            store.setError(parseTransactionError(e));
            store.setLoading(false);
            return false;
        }
    }, [dAppKit, store, ensureGas]);

    return { startGame, recordPiece, flushPieces, saveGame };
}
