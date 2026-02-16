import { ERROR_MAP } from '../constants';

export function parseTransactionError(failure: any): Error {
    const match = failure.error.match(/MoveAbort.*?(\d+)\)?$/);
    if (match) {
        const code = Number(match[1]);
        const message = ERROR_MAP[code] ?? `Transaction failed (code ${code})`;
        return new Error(message);
    }
    return new Error(failure.error || 'Transaction failed');
}
