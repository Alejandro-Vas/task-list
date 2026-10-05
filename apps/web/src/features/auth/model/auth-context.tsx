'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthUser, LoginInput, RegisterInput } from '@repo/shared';
import {
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from '@/shared/api/auth';
import {
  refreshAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from '@/shared/api/client';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider(props: AuthProviderProps) {
  const { children } = props;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const queryClient = useQueryClient();

  useEffect(() => {
    let isActive = true;

    setUnauthorizedHandler(() => {
      queryClient.clear();
      setAccessToken(null);
      setUser(null);
      setStatus('anonymous');
    });

    async function restoreSession() {
      const token = await refreshAccessToken();

      if (!isActive) {
        return;
      }

      if (!token) {
        setStatus('anonymous');
        return;
      }

      try {
        const currentUser = await getMe();

        if (!isActive) {
          return;
        }

        setUser(currentUser);
        setStatus('authenticated');
      } catch {
        if (!isActive) {
          return;
        }

        setAccessToken(null);
        setStatus('anonymous');
      }
    }

    void restoreSession();

    return () => {
      isActive = false;
      setUnauthorizedHandler(null);
    };
  }, [queryClient]);

  const login = useCallback(async (input: LoginInput) => {
    const result = await loginRequest(input);
    setAccessToken(result.accessToken);
    setUser(result.user);
    setStatus('authenticated');
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await registerRequest(input);
    setAccessToken(result.accessToken);
    setUser(result.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => undefined);
    queryClient.clear();
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
