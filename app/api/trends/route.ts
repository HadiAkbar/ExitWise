import { NextResponse } from 'next/server';
import { readSession } from '../../../lib/session';
import { calculate30DayChange } from '../../../lib/engine.mjs';

export const runtime = 'nodejs';

type TrendRequest = { symbols?: unknown };
type TrendCandidate = { symbol: string; kind: string; currency: string };
type TwelveDataResponse = {
  status?: string;
  message?: string;
  values?: { datetime?: string; close?: string | number }[];
};

const MAX_SYMBOLS_PER_REQUEST = 8;

function providerSymbol(candidate: TrendCandidate) {
  return candidate.kind.toLowerCase() === 'crypto'
    ? `${candidate.symbol}/${candidate.currency}`
    : candidate.symbol;
}

export async function POST(request: Request) {
  const session = await readSession();
  if (!session || typeof session.access !== 'string') {
    return NextResponse.json({ error: 'Connect your brokerage to check market trends.' }, { status: 401 });
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: '30-day market trends are not configured. Add a Twelve Data API key as TWELVE_DATA_API_KEY in .env.local.',
    }, { status: 503 });
  }

  let body: TrendRequest;
  try {
    body = await request.json() as TrendRequest;
  } catch {
    return NextResponse.json({ error: 'The market-trend request was not valid JSON.' }, { status: 400 });
  }

  if (!Array.isArray(body.symbols) || body.symbols.length > 200) {
    return NextResponse.json({ error: 'Provide a list of up to 200 holding symbols.' }, { status: 400 });
  }

  const candidates: TrendCandidate[] = [];
  for (const item of body.symbols) {
    if (!item || typeof item !== 'object') {
      return NextResponse.json({ error: 'Every trend symbol must include a symbol, kind, and currency.' }, { status: 400 });
    }
    const candidate = item as Partial<TrendCandidate>;
    if (typeof candidate.symbol !== 'string' || typeof candidate.kind !== 'string' ||
      typeof candidate.currency !== 'string' || !/^[A-Z0-9.^=-]{1,24}$/i.test(candidate.symbol) ||
      !/^[A-Z]{3,8}$/i.test(candidate.currency)) {
      return NextResponse.json({ error: 'A holding contains an unsupported market symbol or currency.' }, { status: 400 });
    }
    candidates.push({
      symbol: candidate.symbol.toUpperCase(),
      kind: candidate.kind,
      currency: candidate.currency.toUpperCase(),
    });
  }

  const unique = [...new Map(candidates.map(candidate => [providerSymbol(candidate), candidate])).values()];
  const now = new Date();
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() - 1);
  const endDate = end.toISOString().slice(0, 10);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 30);
  const startDate = start.toISOString().slice(0, 10);
  const selected = unique.slice(0, MAX_SYMBOLS_PER_REQUEST);
  const trends: {
    symbol: string;
    changePct: number | null;
    asOf: string | null;
    reason?: string;
  }[] = await Promise.all(selected.map(async (candidate) => {
    const query = new URLSearchParams({
      symbol: providerSymbol(candidate),
      interval: '1day',
      start_date: startDate,
      end_date: endDate,
      apikey: apiKey,
    });
    try {
      const response = await fetch(`https://api.twelvedata.com/time_series?${query}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      const payload = await response.json() as TwelveDataResponse;
      if (!response.ok || payload.status === 'error') {
        return {
          symbol: candidate.symbol,
          changePct: null,
          asOf: null,
          reason: payload.message || `Twelve Data returned HTTP ${response.status}.`,
        };
      }
      const change = calculate30DayChange(payload.values, startDate, endDate);
      return change
        ? { symbol: candidate.symbol, ...change }
        : { symbol: candidate.symbol, changePct: null, asOf: null, reason: 'Twelve Data returned fewer than two daily prices for this period.' };
    } catch (error) {
      return {
        symbol: candidate.symbol,
        changePct: null,
        asOf: null,
        reason: error instanceof Error ? error.message : 'Twelve Data could not load this market history.',
      };
    }
  }));
  for (const candidate of unique.slice(MAX_SYMBOLS_PER_REQUEST)) {
    trends.push({
      symbol: candidate.symbol,
      changePct: null,
      asOf: null,
      reason: `ExitWise checks up to ${MAX_SYMBOLS_PER_REQUEST} distinct symbols per comparison.`,
    });
  }

  return NextResponse.json({
    trends,
    source: 'Twelve Data daily closing prices',
    period: { startDate, endDate },
    requestedAt: now.toISOString(),
  });
}
