import { createDAppKit } from '@mysten/dapp-kit-core';
import { SuiGrpcClient } from '@mysten/sui/grpc';

const GRPC_URLS: Record<string, string> = {
    testnet: 'https://fullnode.testnet.sui.io:443',
    devnet: 'https://fullnode.devnet.sui.io:443',
};

export const dAppKit = createDAppKit({
    networks: ['testnet', 'devnet'],
    defaultNetwork: 'testnet',
    enableBurnerWallet: true, // Always enable for seamless PTB gameplay
    createClient(network) {
        return new SuiGrpcClient({
            network,
            baseUrl: GRPC_URLS[network] ?? GRPC_URLS.testnet,
        });
    },
});

declare module '@mysten/dapp-kit-core' {
    interface Register {
        dAppKit: typeof dAppKit;
    }
}
