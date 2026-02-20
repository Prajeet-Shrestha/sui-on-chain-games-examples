import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  SuiClientProvider,
  WalletProvider,
  createNetworkConfig,
} from '@mysten/dapp-kit';
import { getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import RegisterEnokiWallets from './components/RegisterEnokiWallets';
import AuthCallbackHandler from './components/AuthCallbackHandler';
import App from './App';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import WhitelistGuard from './components/WhitelistGuard';
import '@mysten/dapp-kit/dist/index.css';
import './index.css';

const queryClient = new QueryClient();

const { networkConfig } = createNetworkConfig({
  testnet: { url: getJsonRpcFullnodeUrl('testnet'), network: 'testnet' },
  mainnet: { url: getJsonRpcFullnodeUrl('mainnet'), network: 'mainnet' },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <RegisterEnokiWallets />
        <WalletProvider autoConnect>
          <AuthCallbackHandler />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/create" element={<WhitelistGuard><ChatPage /></WhitelistGuard>} />
            </Routes>
          </BrowserRouter>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </StrictMode>
);
