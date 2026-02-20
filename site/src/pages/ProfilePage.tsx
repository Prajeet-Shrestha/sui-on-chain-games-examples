import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import {
  HiOutlineClipboardDocument,
  HiCheck,
  HiArrowLeft,
} from 'react-icons/hi2';
import { useUserProfile } from '../hooks/useUserProfile';
import AuthButton from '../components/AuthButton';

function formatSui(mist: string): string {
  const val = Number(mist) / 1_000_000_000;
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export default function ProfilePage() {
  const currentAccount = useCurrentAccount();
  const { profile } = useUserProfile();
  const [copied, setCopied] = useState(false);

  const walletAddress = currentAccount?.address || profile?.address || '';
  const isLoggedIn = currentAccount || profile;

  // Fetch SUI balance
  const { data: balanceData, isLoading: balanceLoading } = useSuiClientQuery(
    'getBalance',
    { owner: walletAddress, coinType: '0x2::sui::SUI' },
    { enabled: !!walletAddress },
  );

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  const handleCopy = async () => {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="root">
      {/* Navbar */}
      <nav className="navbar">
        <Link to="/" className="logo">
          <img src="/logo_full.png" alt="Makara Gaming" className="logo-img" />
        </Link>
        <div style={{ flex: 1 }} />
        <AuthButton />
      </nav>

      {/* Profile Content */}
      <div className="profile-page">
        <div className="profile-container">
          {/* Back link */}
          <Link to="/" className="profile-back">
            <HiArrowLeft size={14} /> Back to Home
          </Link>

          {/* Profile Card */}
          <div className="profile-card">
            {/* Header with gradient */}
            <div className="profile-card-banner" />

            <div className="profile-card-body">
              {/* Avatar */}
              <div className="profile-avatar-wrapper">
                {profile?.picture ? (
                  <img
                    src={profile.picture}
                    alt={profile.name}
                    className="profile-avatar-img"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="profile-avatar-fallback">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Name & email */}
              <h1 className="profile-name">{profile?.name || 'Anonymous'}</h1>
              {profile?.email && (
                <p className="profile-email">{profile.email}</p>
              )}

              <div className="profile-divider" />

              {/* Wallet Section */}
              <div className="profile-section">
                <h3 className="profile-section-title">Wallet</h3>

                <div className="profile-wallet-card">
                  <div className="profile-wallet-row">
                    <div className="profile-wallet-info">
                      <span className="profile-wallet-label">Address</span>
                      <span className="profile-wallet-addr">{walletAddress || 'Not connected'}</span>
                    </div>
                    {walletAddress && (
                      <button className="profile-copy-btn" onClick={handleCopy} title="Copy address">
                        {copied ? <HiCheck size={16} /> : <HiOutlineClipboardDocument size={16} />}
                      </button>
                    )}
                  </div>

                  <div className="profile-wallet-row">
                    <div className="profile-wallet-info">
                      <span className="profile-wallet-label">Network</span>
                      <span className="profile-network-badge">Testnet</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SUI Balance Section */}
              <div className="profile-section">
                <h3 className="profile-section-title">Balance</h3>

                <div className="profile-balance-card">
                  <div className="profile-balance-row">
                    <div className="profile-balance-token">
                      <img
                        src="https://img.cryptorank.io/coins/sui1750268474192.png"
                        alt="SUI"
                        className="profile-token-icon"
                      />
                      <span className="profile-token-name">SUI</span>
                    </div>
                    <span className="profile-balance-amount">
                      {balanceLoading
                        ? '...'
                        : balanceData?.totalBalance
                          ? formatSui(balanceData.totalBalance)
                          : '0.00'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
