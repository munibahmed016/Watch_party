// src/contexts/AuthContext.tsx
// Holds the current user + token in app-wide state.
// Manages Socket.IO connection lifecycle alongside auth state.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, AuthUser, onAuthFailure } from '@/lib/api';
import { tokenStorage, userStorage } from '@/lib/storage';
import { queryClient } from '@/lib/queryClient';
import { disconnectSocket, getSocket } from '@/lib/socket';

type AuthState = {
  ready: boolean;
  user: AuthUser | null;
};

type AuthContextValue = AuthState & {
  setSession: (user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>;
  setUser: (user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ ready: false, user: null });

  useEffect(() => {
    (async () => {
      try {
        const [accessToken, storedUser] = await Promise.all([
          tokenStorage.getAccessToken(),
          userStorage.get(),
        ]);
        if (accessToken && storedUser) {
          setState({ ready: true, user: storedUser as any });
          // Connect socket
          getSocket().catch(() => undefined);
          // Refresh /me in background
          authApi
            .me()
            .then(async ({ user }) => {
              await userStorage.set(user);
              setState({ ready: true, user });
            })
            .catch(() => undefined);
        } else {
          setState({ ready: true, user: null });
        }
      } catch {
        setState({ ready: true, user: null });
      }
    })();
  }, []);

  useEffect(() => {
    return onAuthFailure(() => {
      tokenStorage.clear();
      userStorage.clear();
      queryClient.clear();
      disconnectSocket();
      setState({ ready: true, user: null });
    });
  }, []);

  const setSession: AuthContextValue['setSession'] = async (user, accessToken, refreshToken) => {
    await tokenStorage.setTokens(accessToken, refreshToken);
    await userStorage.set(user);
    setState({ ready: true, user });
    // Open the socket
    getSocket().catch(() => undefined);
  };

  const setUser: AuthContextValue['setUser'] = async (user) => {
    await userStorage.set(user);
    setState((s) => ({ ...s, user }));
  };

  const signOut: AuthContextValue['signOut'] = async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken) authApi.logout(refreshToken).catch(() => undefined);
    disconnectSocket();
    await tokenStorage.clear();
    await userStorage.clear();
    queryClient.clear();
    setState({ ready: true, user: null });
  };

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, setSession, setUser, signOut }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
