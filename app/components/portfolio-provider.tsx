'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Position = {
  id: string;
  accountId: string;
  symbol: string;
  name: string;
  kind: string;
  units: number;
  price: number;
  costBasis: number | null;
  currency: string;
  value: number;
  asOf: string | null;
};

export function primaryCurrency(positions: Position[]) {
  const counts = new Map<string, number>();
  positions.forEach((position) => counts.set(position.currency, (counts.get(position.currency) || 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] || 'USD';
}

const demoPositions: Position[] = [
  { id: 'demo-apple', accountId: 'demo', symbol: 'AAPL', name: 'Apple', kind: 'stock', units: 15, price: 235, costBasis: 170, currency: 'USD', value: 3525, asOf: null },
  { id: 'demo-bitcoin', accountId: 'demo', symbol: 'BTC', name: 'Bitcoin', kind: 'crypto', units: .07, price: 92000, costBasis: 97000, currency: 'USD', value: 6440, asOf: null },
  { id: 'demo-etf', accountId: 'demo', symbol: 'VOO', name: 'Vanguard S&P 500 ETF', kind: 'etf', units: 9, price: 540, costBasis: 490, currency: 'USD', value: 4860, asOf: null },
  { id: 'demo-eth', accountId: 'demo', symbol: 'ETH', name: 'Ethereum', kind: 'crypto', units: .3, price: 3100, costBasis: null, currency: 'USD', value: 930, asOf: null },
];

function connectionErrorMessage(code: string | null, origin: string) {
  switch (code) {
    case 'setup':
      return `Brokerage sign-in is not configured for this deployment. In Vercel Production, set SNAPTRADE_OAUTH_CLIENT_ID, SNAPTRADE_OAUTH_CLIENT_SECRET, SNAPTRADE_REDIRECT_URI, and a valid 32-byte SESSION_ENCRYPTION_KEY, then redeploy. The callback URL must be ${origin}/api/auth/snaptrade/callback and must match the URL registered in SnapTrade.`;
    case 'oauth_start':
      return 'ExitWise could not reach SnapTrade to start sign-in. Please try again later; the site owner can check the Vercel Function logs.';
    case 'state':
      return 'The sign-in session expired or returned to a different domain. Start again from the same ExitWise website address.';
    case 'denied':
      return 'The brokerage connection was canceled before it finished.';
    case 'code':
    case 'token':
    case 'identity':
    case 'oauth':
      return 'SnapTrade sign-in could not be completed. Check that the production callback URL in Vercel exactly matches the URL registered in SnapTrade, then try again.';
    case 'session_size':
      return 'SnapTrade sign-in succeeded, but this prototype could not store the connection securely in a browser cookie. Contact the site owner.';
    default:
      return code ? 'We couldn’t finish connecting. Please try again.' : '';
  }
}

type PortfolioContextValue = {
  positions: Position[];
  isDemo: boolean;
  connected: boolean;
  loading: boolean;
  refreshing: boolean;
  error: string;
  refresh: () => Promise<void>;
};

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [positions, setPositions] = useState(demoPositions);
  const [isDemo, setIsDemo] = useState(true);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const response = await fetch('/api/portfolio', { cache: 'no-store' });
      if (response.status === 401) throw new Error('Your brokerage connection has expired. Connect again to refresh prices.');
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error(`The portfolio service returned an unexpected response (HTTP ${response.status}).`);
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'We couldn’t refresh your holdings.');
      setConnected(true);
      setIsDemo(false);
      setPositions(data.positions || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We couldn’t refresh your holdings.');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectionError = connectionErrorMessage(params.get('error'), window.location.origin);
    if (connectionError) setError(connectionError);
    if (params.get('connected') === 'true') {
      void refresh();
      return;
    }

    fetch('/api/portfolio', { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.headers.get('content-type')?.includes('application/json')) {
          throw new Error(`The portfolio service returned an unexpected response (HTTP ${response.status}).`);
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'We couldn’t load your holdings.');
        return data as { positions?: Position[] };
      })
      .then((data) => {
        if (data) {
          setConnected(true);
          setIsDemo(false);
          setPositions(data.positions || []);
        }
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'We couldn’t load your holdings.'))
      .finally(() => setLoading(false));
  }, [refresh]);

  const value = useMemo(() => ({ positions, isDemo, connected, loading, refreshing, error, refresh }), [positions, isDemo, connected, loading, refreshing, error, refresh]);
  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const value = useContext(PortfolioContext);
  if (!value) throw new Error('usePortfolio must be used within PortfolioProvider');
  return value;
}
