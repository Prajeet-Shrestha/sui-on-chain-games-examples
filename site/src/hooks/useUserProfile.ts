import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'enoki_user_profile';

export interface UserProfile {
    name: string;
    picture: string;
    email: string;
    address: string;
}

function getStoredProfile(): UserProfile | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Hook that reads the stored user profile (populated by AuthCallbackHandler
 * when Google OAuth redirects back with an id_token).
 */
export function useUserProfile() {
    const [profile, setProfile] = useState<UserProfile | null>(getStoredProfile);

    // Re-read from localStorage when it changes (e.g. AuthCallbackHandler stores it)
    useEffect(() => {
        const onStorage = () => setProfile(getStoredProfile());
        window.addEventListener('storage', onStorage);

        // Poll periodically until the profile has an address
        // (the address is fetched async by AuthCallbackHandler)
        const interval = setInterval(() => {
            const stored = getStoredProfile();
            if (stored) {
                setProfile(stored);
                if (stored.address) clearInterval(interval);
            }
        }, 500);

        return () => {
            window.removeEventListener('storage', onStorage);
            clearInterval(interval);
        };
    }, []);

    const clearProfile = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setProfile(null);
    }, []);

    return { profile, clearProfile };
}
