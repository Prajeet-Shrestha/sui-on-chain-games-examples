import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineUser,
  HiOutlineClipboardDocument,
  HiOutlineArrowRightOnRectangle,
  HiCheck,
} from 'react-icons/hi2';
import { IoGameControllerOutline } from 'react-icons/io5';
import {
  useCurrentAccount,
  useConnectWallet,
  useDisconnectWallet,
  useWallets,
} from '@mysten/dapp-kit';
import { isEnokiWallet, type EnokiWallet, type AuthProvider } from '@mysten/enoki';
import { useUserProfile } from '../hooks/useUserProfile';
import { isWhitelisted } from '../config/whitelist';

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const PROVIDER_META: Record<string, { label: string; icon: string; color: string }> = {
  google: {
    label: 'Sign in with Google',
    icon: 'G',
    color: '#4285f4',
  },
  facebook: {
    label: 'Sign in with Facebook',
    icon: 'f',
    color: '#1877f2',
  },
  twitch: {
    label: 'Sign in with Twitch',
    icon: '▶',
    color: '#9146ff',
  },
};

export default function AuthButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentAccount = useCurrentAccount();
  const { mutateAsync: connect, isPending: isConnecting } = useConnectWallet();
  const { mutateAsync: disconnect } = useDisconnectWallet();
  const wallets = useWallets().filter(isEnokiWallet);
  const { profile, clearProfile } = useUserProfile();

  const walletsByProvider = wallets.reduce(
    (map, wallet) => map.set(wallet.provider, wallet),
    new Map<AuthProvider, EnokiWallet>(),
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const walletAddress = currentAccount?.address || profile?.address || '';

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = async (wallet: EnokiWallet) => {
    try {
      await connect({ wallet });
      setOpen(false);
    } catch (err) {
      console.error('Failed to connect:', err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      clearProfile();
      setOpen(false);
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const handleSignOut = () => {
    clearProfile();
    if (currentAccount) {
      handleDisconnect();
    }
    setOpen(false);
  };

  // ── Logged-in state (wallet connected OR profile from OAuth) ──
  const isLoggedIn = currentAccount || profile;

  if (isLoggedIn) {
    const displayName = profile?.name
      || (currentAccount ? truncateAddress(currentAccount.address) : 'User');

    return (
      <div className="auth-wrapper" ref={dropdownRef}>
        <button
          className="auth-user-chip"
          onClick={() => setOpen(!open)}
        >
          <span className="auth-avatar">
            {profile?.picture ? (
              <img
                src={profile.picture}
                alt={profile.name}
                className="auth-profile-img"
                referrerPolicy="no-referrer"
              />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
            )}
          </span>
          <span className="auth-user-name">{displayName}</span>
          <span className="auth-chevron">▾</span>
        </button>

        {open && (
          <div className="auth-dropdown">
            {/* Profile header */}
            <div className="auth-dropdown-profile-header">
              <span className="auth-avatar-lg">
                {profile?.picture ? (
                  <img
                    src={profile.picture}
                    alt={profile.name}
                    className="auth-profile-img-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                  </svg>
                )}
              </span>
              <div className="auth-dropdown-profile-info">
                <span className="auth-dropdown-profile-name">{profile?.name || 'Anonymous'}</span>
                {walletAddress && (
                  <span className="auth-dropdown-addr-row">
                    <span className="auth-dropdown-addr">{truncateAddress(walletAddress)}</span>
                    <button className="auth-copy-icon" onClick={handleCopyAddress} title="Copy address">
                      {copied ? <HiCheck size={12} /> : <HiOutlineClipboardDocument size={12} />}
                    </button>
                  </span>
                )}
              </div>
            </div>

            <div className="auth-dropdown-divider" />

            {/* Menu items */}
            <Link to="/profile" className="auth-dropdown-item auth-dropdown-link" onClick={() => setOpen(false)}>
              <HiOutlineUser size={15} /> View Profile
            </Link>
            {isWhitelisted(walletAddress) && (
              <Link to="/create" className="auth-dropdown-item auth-dropdown-link" onClick={() => setOpen(false)}>
                <IoGameControllerOutline size={15} /> Create a Game
              </Link>
            )}

            <div className="auth-dropdown-divider" />



            <button className="auth-dropdown-item auth-dropdown-logout" onClick={handleSignOut}>
              <HiOutlineArrowRightOnRectangle size={15} /> Sign Out
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Logged-out state ──
  return (
    <div className="auth-wrapper" ref={dropdownRef}>
      <button
        className="signin-btn"
        onClick={() => setOpen(!open)}
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting...' : 'Sign in'}
      </button>

      {open && (
        <div className="auth-dropdown">
          <div className="auth-dropdown-header">
            <span className="auth-dropdown-label">Sign in to continue</span>
          </div>
          {Array.from(walletsByProvider.entries()).map(([provider, wallet]) => {
            const meta = PROVIDER_META[provider];
            if (!meta) return null;
            return (
              <button
                key={provider}
                className="auth-provider-btn"
                onClick={() => handleConnect(wallet)}
                disabled={isConnecting}
              >
                <span
                  className="auth-provider-icon"
                  style={{ backgroundColor: meta.color }}
                >
                  {meta.icon}
                </span>
                <span className="auth-provider-label">{meta.label}</span>
              </button>
            );
          })}
          {walletsByProvider.size === 0 && (
            <div className="auth-dropdown-empty">
              No login providers available. Check your configuration.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
