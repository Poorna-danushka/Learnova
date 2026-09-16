// ─── Auth Context ─────────────────────────────────────────────────────────────
// Provides a reactive auth state that the root layout and all screens can use.
// Calling signOut() clears the token AND triggers a full navigation reset to /auth.

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { clearAuthTokens, getAccessToken, saveAuthTokens } from '@/services/authStorage';
import { logoutUser } from '@/services/api/userApi';
import { setAuthExpiredHandler } from '@/services/api/apiClient';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  status: AuthStatus;
  signIn: (accessToken: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  status: 'loading',
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Bootstrap: read persisted token once on mount
  useEffect(() => {
    getAccessToken()
      .then((token) => setStatus(token ? 'authenticated' : 'unauthenticated'))
      .catch(() => setStatus('unauthenticated'));
  }, []);

  const signIn = useCallback(async (accessToken: string, refreshToken: string) => {
    await saveAuthTokens(accessToken, refreshToken);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // The local session must still be cleared if the API is unavailable.
    }
    await clearAuthTokens();
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    setAuthExpiredHandler(() => {
      void clearAuthTokens();
      setStatus('unauthenticated');
    });
    return () => setAuthExpiredHandler(null);
  }, []);

  return (
    <AuthContext.Provider value={{ status, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
