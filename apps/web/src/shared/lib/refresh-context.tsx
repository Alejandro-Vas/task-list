'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type RefreshContextValue = {
  version: number;
  refresh: () => void;
};

const RefreshContext = createContext<RefreshContextValue | null>(null);

type RefreshProviderProps = {
  children: ReactNode;
};

export function RefreshProvider(props: RefreshProviderProps) {
  const { children } = props;
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((current) => current + 1), []);
  const value = useMemo(() => ({ version, refresh }), [version, refresh]);

  return (
    <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>
  );
}

export function useRefresh(): RefreshContextValue {
  const context = useContext(RefreshContext);

  if (!context) {
    throw new Error('useRefresh must be used within RefreshProvider');
  }

  return context;
}
