import { NextResponse } from 'next/server';
import { readSession } from '../../../lib/session';
import { apiGet } from '../../../lib/snaptrade';
import { normalizePositions } from '../../../lib/engine.mjs';

export const runtime = 'nodejs';

type Account = { id: string; name?: string };
type Quote = { symbol?: { symbol?: string }; last_trade_price?: number };

export async function POST() {
  const session = await readSession();
  if (!session || typeof session.access !== 'string') {
    return NextResponse.json({ error: 'Connect your brokerage to check its quotes.' }, { status: 401 });
  }
  const access = session.access;

  try {
    const accounts: unknown = await apiGet('/accounts', access);
    if (!Array.isArray(accounts)) throw new Error('SnapTrade returned an unexpected accounts response.');

    const portfolios = await Promise.all((accounts as Account[]).slice(0, 20).map(async (account) => {
      if (!account || typeof account.id !== 'string') return [];
      const positionsPayload = await apiGet(`/accounts/${encodeURIComponent(account.id)}/positions/all`, access);
      return normalizePositions(account.id, positionsPayload);
    }));
    const positions = portfolios.flat();
    const grouped = new Map<string, typeof positions>();
    for (const position of positions) {
      const accountPositions = grouped.get(position.accountId) || [];
      if (accountPositions.length < 10) accountPositions.push(position);
      grouped.set(position.accountId, accountPositions);
    }

    const requestedAt = new Date().toISOString();
    const quoteGroups = await Promise.all([...grouped.entries()].map(async ([accountId, accountPositions]) => {
      const symbols = [...new Set(accountPositions.map((position) => position.symbol))];
      const query = new URLSearchParams({ symbols: symbols.join(','), use_ticker: 'true' });
      try {
        const quotes: unknown = await apiGet(`/accounts/${encodeURIComponent(accountId)}/quotes?${query}`, access);
        if (!Array.isArray(quotes)) throw new Error('SnapTrade returned an unexpected quotes response.');
        return { accountId, quotes: quotes as Quote[], reason: undefined };
      } catch (error) {
        return {
          accountId,
          quotes: [] as Quote[],
          reason: error instanceof Error ? error.message : 'SnapTrade could not retrieve quotes for this account.',
        };
      }
    }));
    const failedQuoteAccounts = quoteGroups.filter((group) => group.reason);
    if (failedQuoteAccounts.length === quoteGroups.length && quoteGroups.length > 0) {
      return NextResponse.json({
        error: failedQuoteAccounts.map((group) => group.reason).join(' '),
      }, { status: 502 });
    }
    const quotesByAccount = new Map(quoteGroups.map((group) => [group.accountId, group.quotes]));
    const quoteErrorsByAccount = new Map(quoteGroups.map((group) => [group.accountId, group.reason]));

    const results = positions.map((position) => {
      const included = grouped.get(position.accountId)?.some((item) => item.id === position.id);
      const quote = included
        ? quotesByAccount.get(position.accountId)?.find((item) =>
          item.symbol?.symbol?.toUpperCase() === position.symbol.toUpperCase())
        : undefined;
      const price = typeof quote?.last_trade_price === 'number' &&
        Number.isFinite(quote.last_trade_price) && quote.last_trade_price > 0
        ? quote.last_trade_price
        : null;
      return {
        id: position.id,
        symbol: position.symbol,
        price,
        requestedAt: price === null ? null : requestedAt,
        reason: !included
          ? 'SnapTrade quotes are limited to 10 investments per account.'
          : quoteErrorsByAccount.get(position.accountId)
            ? quoteErrorsByAccount.get(position.accountId)
          : price === null
            ? 'SnapTrade did not return a quote for this investment.'
            : undefined,
      };
    });

    return NextResponse.json({
      quotes: results,
      requestedAt,
      source: 'SnapTrade latest trade prices',
      quoteErrors: failedQuoteAccounts.map((group) => group.reason),
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'SnapTrade quotes could not be loaded.',
    }, { status: 502 });
  }
}
