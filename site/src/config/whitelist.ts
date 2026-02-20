/**
 * Whitelisted addresses that can access /create.
 * Add new Sui addresses here to grant access.
 */
export const WHITELISTED_ADDRESSES: string[] = [
    '0x64065081494fd22d3547cbb1e1ff887869b6ec03742b8a192657a3b985a41a0a',
];

export function isWhitelisted(address: string | undefined): boolean {
    if (!address) return false;
    return WHITELISTED_ADDRESSES.includes(address.toLowerCase());
}
