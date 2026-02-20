import { useEffect, useRef } from 'react';
import { useConnectWallet, useWallets } from '@mysten/dapp-kit';
import { isEnokiWallet, type EnokiWallet } from '@mysten/enoki';

/**
 * Handles the OAuth redirect callback when the Enoki popup flow fails.
 *
 * When the browser blocks the popup, Google OAuth completes in the same tab
 * and redirects back with `#id_token=...` in the URL hash. This component
 * detects that token, stores it, cleans the URL, and triggers a fresh
 * wallet connection attempt.
 */
export default function AuthCallbackHandler() {
  const wallets = useWallets().filter(isEnokiWallet);
  const { mutateAsync: connect } = useConnectWallet();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;

    const hash = window.location.hash;
    if (!hash || !hash.includes('id_token=')) return;

    handledRef.current = true;

    // Extract and store the id_token for profile display
    const params = new URLSearchParams(hash.slice(1));
    const idToken = params.get('id_token');

    if (idToken) {
      // Decode the JWT payload to extract profile info
      try {
        const base64 = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        const profile = {
          name: payload.name || payload.given_name || '',
          picture: payload.picture || '',
          email: payload.email || '',
          address: '',
        };
        if (profile.name || profile.picture || profile.email) {
          localStorage.setItem('enoki_user_profile', JSON.stringify(profile));
        }

        // Fetch the zkLogin wallet address from Enoki API
        const apiKey = import.meta.env.VITE_ENOKI_API_KEY;
        if (apiKey) {
          fetch('https://api.enoki.mystenlabs.com/v1/zklogin', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'zklogin-jwt': idToken,
            },
          })
            .then((res) => res.json())
            .then((result) => {
              if (result?.data?.address) {
                profile.address = result.data.address;
                localStorage.setItem('enoki_user_profile', JSON.stringify(profile));
              }
            })
            .catch((err) => console.warn('[AuthCallbackHandler] Failed to fetch address:', err));
        }
      } catch (e) {
        console.warn('[AuthCallbackHandler] Failed to decode JWT:', e);
      }
    }

    // Clean the URL immediately so the raw JWT isn't visible in the address bar
    window.history.replaceState(null, '', window.location.pathname);

    // The Enoki popup flow stored the session (ephemeral key, nonce, maxEpoch)
    // in IndexedDB BEFORE redirecting to Google. Since the page has now reloaded
    // with the token, we need to trigger the connect flow again. The SDK will
    // open a new popup — but since the user already authenticated with Google,
    // it should complete instantly via Google's silent auth (prompt=none).
    const googleWallet = wallets.find((w) => w.provider === 'google') as EnokiWallet | undefined;
    if (googleWallet) {
      // Small delay to ensure RegisterEnokiWallets has fully initialized
      setTimeout(() => {
        connect({ wallet: googleWallet }).catch((err) => {
          console.error('[AuthCallbackHandler] Wallet connect failed:', err);
        });
      }, 500);
    }
  }, [wallets, connect]);

  return null;
}
