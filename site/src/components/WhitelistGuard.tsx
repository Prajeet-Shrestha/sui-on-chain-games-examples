import { Navigate } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useUserProfile } from '../hooks/useUserProfile';
import { isWhitelisted } from '../config/whitelist';

/**
 * Route guard that only allows whitelisted addresses to access wrapped routes.
 * Redirects to home page if the user is not authenticated or not whitelisted.
 */
export default function WhitelistGuard({ children }: { children: React.ReactNode }) {
  const currentAccount = useCurrentAccount();
  const { profile } = useUserProfile();
  const address = currentAccount?.address || profile?.address;

  if (!isWhitelisted(address)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
