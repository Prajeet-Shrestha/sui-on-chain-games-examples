import { createDAppKit } from '@mysten/dapp-kit-core';
import { SuiGrpcClient } from '@mysten/sui/grpc';

export const dAppKit = createDAppKit({
    networks: ['testnet', 'devnet'],
    defaultNetwork: 'testnet',
    enableBurnerWallet: import.meta.env.DEV,
    createClient(network) {
        // @ts-expect-error — SDK types require baseUrl but runtime resolves it from network
        return new SuiGrpcClient({ network });
    },
});

declare module '@mysten/dapp-kit-core' {
    interface Register {
        dAppKit: typeof dAppKit;
    }
}
