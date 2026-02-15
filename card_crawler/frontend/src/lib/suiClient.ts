/**
 * Dedicated JSON-RPC client for data reads.
 * The gRPC client created by createDAppKit has a broken URL resolver
 * (GrpcWebFetchTransport.makeUrl gets undefined baseUrl), so we use
 * the legacy JSON-RPC client for getObject / getDynamicFields / etc.
 */
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

export const suiClient = new SuiJsonRpcClient({
    network: 'testnet',
    url: getJsonRpcFullnodeUrl('testnet'),
});
