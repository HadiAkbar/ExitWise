'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { compareSales } from '../../lib/engine.mjs';
import { primaryCurrency, usePortfolio } from '../components/portfolio-provider';

const format = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);

type BrokerageQuote = {
  id: string;
  symbol: string;
  price: number | null;
  requestedAt: string | null;
  reason?: string;
};

type MarketTrend = {
  symbol: string;
  changePct: number | null;
  asOf: string | null;
  reason?: string;
};

type QuoteStatus = 'idle' | 'loading' | 'ready' | 'error' | 'demo';
type TrendStatus = 'idle' | 'loading' | 'ready' | 'error' | 'demo';

function unitsLabel(kind: string) {
  if (['stock', 'adr', 'etf', 'mutualfund', 'cef'].includes(kind.toLowerCase())) return 'shares';
  return kind.toLowerCase() === 'crypto' ? 'coins' : 'units';
}

export default function PlanPage() {
  const { positions, isDemo, connected, error } = usePortfolio();
  const currency = primaryCurrency(positions);
  const planPositions = positions.filter((position) => position.currency === currency);
  const otherCurrencies = [...new Set(positions.filter((position) => position.currency !== currency).map((position) => position.currency))];
  const [cash, setCash] = useState('2000');
  const [avoidLoss, setAvoidLoss] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState<QuoteStatus>('idle');
  const [quoteError, setQuoteError] = useState('');
  const [quotePrices, setQuotePrices] = useState<Record<string, BrokerageQuote>>({});
  const [quotesRequestedAt, setQuotesRequestedAt] = useState<string | null>(null);
  const [marketTrends, setMarketTrends] = useState<Record<string, MarketTrend>>({});
  const [trendStatus, setTrendStatus] = useState<TrendStatus>('idle');
  const [trendError, setTrendError] = useState('');
  const trendsBySymbol = Object.fromEntries(
    Object.values(marketTrends)
      .filter((trend): trend is MarketTrend & { changePct: number } => trend.changePct !== null)
      .map((trend) => [trend.symbol.toUpperCase(), trend.changePct]),
  );
  const results = useMemo(
    () => compareSales(planPositions.map((position) => ({
      ...position,
      price: quotePrices[position.id]?.price ?? position.price,
    })), Number(cash), currency, avoidLoss, trendsBySymbol),
    [planPositions, cash, currency, avoidLoss, quotePrices, marketTrends],
  );
  const priceTimestamp = planPositions
    .filter((position) => position.asOf)
    .map((position) => new Date(position.asOf as string))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const showCashOptions = async () => {
    setShowOptions(true);
    setQuotePrices({});
    setQuotesRequestedAt(null);
    setQuoteError('');
    setMarketTrends({});
    setTrendError('');
    if (isDemo) {
      setQuoteStatus('demo');
      setTrendStatus('demo');
      return;
    }

    setQuoteStatus('loading');
    setTrendStatus('loading');
    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error(`The SnapTrade quote service returned an unexpected response (HTTP ${response.status}).`);
      }
      const data = await response.json() as { error?: string; quotes?: BrokerageQuote[]; requestedAt?: string; quoteErrors?: string[] };
      if (!response.ok) throw new Error(data.error || 'SnapTrade quotes could not be loaded.');
      if (!Array.isArray(data.quotes)) throw new Error('SnapTrade returned an unexpected quote response.');
      setQuotePrices(Object.fromEntries(data.quotes.map((quote) => [quote.id, quote])));
      setQuotesRequestedAt(data.requestedAt || null);
      setQuoteError(data.quoteErrors?.join(' ') || '');
      setQuoteStatus('ready');
    } catch (cause) {
      setQuoteError(cause instanceof Error ? cause.message : 'SnapTrade quotes could not be loaded.');
      setQuoteStatus('error');
    }

    try {
      const response = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: planPositions.map(({ symbol, kind, currency: holdingCurrency }) => ({
            symbol,
            kind,
            currency: holdingCurrency,
          })),
        }),
      });
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error(`The market-trend service returned an unexpected response (HTTP ${response.status}).`);
      }
      const data = await response.json() as { error?: string; trends?: MarketTrend[] };
      if (!response.ok) throw new Error(data.error || '30-day market trends could not be loaded.');
      if (!Array.isArray(data.trends)) throw new Error('The market-trend service returned an unexpected response.');
      setMarketTrends(Object.fromEntries(data.trends.map((trend) => [trend.symbol, trend])));
      const unavailable = data.trends.filter((trend) => trend.changePct === null);
      setTrendError(unavailable.length
        ? `${unavailable.length} holding(s) have no 30-day trend data. ${unavailable.find((trend) => trend.reason)?.reason || ''}`
        : '');
      setTrendStatus('ready');
    } catch (cause) {
      setTrendError(cause instanceof Error ? cause.message : '30-day market trends could not be loaded.');
      setTrendStatus('error');
    }
  };

  return (
    <div className="inner-page plan-page">
      <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><strong>Sell planner</strong></div>
      <header className="page-intro">
        <span className="eyebrow">YOUR LIQUIDITY NEED</span>
        <h1>How much money do you need?</h1>
        <p>Set an amount. We’ll compare what selling each holding could provide. This is a planning estimate—nothing is sold.</p>
      </header>

      {isDemo && <div className="notice-banner compact"><span className="notice-icon" aria-hidden="true">i</span><p><strong>Example portfolio:</strong> these holdings and prices are fictional.</p><Link href="/connect">Connect brokerage <span aria-hidden="true">→</span></Link></div>}
      {error && <p className="error-message page-error" role="alert">{error}</p>}

      <section className="planner-layout">
        <div className="planner-form-card">
          <label className="form-label" htmlFor="cash">I need about</label>
          <div className="big-amount-input"><span>{currency}</span><input id="cash" type="number" min="1" step="0.01" value={cash} onChange={(event) => { setCash(event.target.value); setShowOptions(false); }} /></div>
          <div className="quick-goals larger-goals" aria-label="Suggested amounts">
            {[1000, 2000, 5000, 10000].map((amount) => (
              <button type="button" className={Number(cash) === amount ? 'quick-goal selected' : 'quick-goal'} key={amount} onClick={() => { setCash(String(amount)); setShowOptions(false); }}>
                {format(amount, currency)}
              </button>
            ))}
          </div>
          <p className="goal-currency-note">{otherCurrencies.length
            ? `Comparisons use ${currency}. Holdings in ${otherCurrencies.join(', ')} are kept separate; currencies aren’t converted.`
            : `Comparisons use ${currency}. Currency conversion isn’t applied.`}</p>
          <label className="large-checkbox">
            <input type="checkbox" checked={avoidLoss} onChange={(event) => { setAvoidLoss(event.target.checked); setShowOptions(false); }} />
            <span className="large-checkmark" aria-hidden="true" />
            <span><strong>Don’t show holdings currently below their reported purchase price</strong><small>Purchase-price information may be incomplete and may differ from your tax records.</small></span>
          </label>
          <button className="primary-button full-button" onClick={() => void showCashOptions()} disabled={!Number.isFinite(Number(cash)) || Number(cash) <= 0 || quoteStatus === 'loading'}>
            {quoteStatus === 'loading' ? 'Getting brokerage prices…' : 'Compare ways to sell'} <span aria-hidden="true">→</span>
          </button>
          <p className="safety-note"><span aria-hidden="true">✓</span> Planning only. Exitwise never sells investments.</p>
          {connected && <p className="provider-disclosure">When you compare, Exitwise sends holding symbols (not account details or position sizes) to Twelve Data for 30-day price history.</p>}
        </div>
        <aside className="plain-help-card">
          <span className="help-number">?</span>
          <h2>What these comparisons mean</h2>
          <p>Each choice looks at selling one holding by itself. It estimates the money from selling enough shares or coins to meet your amount—or all of that holding if it isn’t enough.</p>
          <ul><li>“Could meet your amount” means the estimate reaches your target.</li><li>Price and purchase-price comparisons are estimates, not your final sale proceeds or tax result.</li><li>Fees, taxes, price changes, and brokerage rules are not included.</li></ul>
          <Link href="/investments">Review your holdings <span aria-hidden="true">→</span></Link>
        </aside>
      </section>

      {showOptions && (
        <section className="plan-results" aria-live="polite">
          <div className="results-title">
            <div className="results-title-copy">
              <span className="eyebrow">INDIVIDUAL HOLDINGS, COMPARED</span>
              <h2>Holdings you could sell</h2>
              <p>Each holding gets a comparison score: 40% target coverage, 30% estimated gain/loss impact, and 30% 30-day price trend. We favor smaller gain/loss impacts and weaker recent momentum. Missing information counts as neutral, not as a positive signal. This is a simple comparison, not a forecast or personalized advice.</p>
            </div>
            {connected && <button className="refresh-button" type="button" onClick={() => void showCashOptions()} disabled={quoteStatus === 'loading'}>
              <span aria-hidden="true">{quoteStatus === 'loading' ? '↻' : '⟳'}</span> {quoteStatus === 'loading' ? 'Getting prices…' : 'Get latest brokerage prices'}
            </button>}
          </div>
          <p className="price-timestamp">
            {isDemo
              ? 'Example prices only. No live brokerage data is connected.'
              : priceTimestamp
                ? `Portfolio prices last updated by SnapTrade: ${priceTimestamp.toLocaleString()}.`
                : 'SnapTrade did not include a portfolio price-update time.'}
            {' '}These portfolio prices can be delayed.
          </p>
          <p className={`brokerage-quote-note ${quoteStatus === 'error' ? 'brokerage-quote-error' : ''}`} role="status">
            {quoteStatus === 'loading'
              ? 'Asking SnapTrade for the latest trade prices supplied by your brokerage…'
              : quoteStatus === 'ready'
                ? `${Object.values(quotePrices).filter((quote) => quote.price !== null).length} latest-trade price(s) returned by SnapTrade. ${quotesRequestedAt ? `Request sent ${new Date(quotesRequestedAt).toLocaleString()}. ` : ''}SnapTrade doesn’t include when each trade occurred, so the request time isn’t the trade time. Brokerage prices may be delayed. ${Object.values(quotePrices).some((quote) => quote.price === null) ? 'Where a price was missing, the portfolio price is shown instead.' : ''} ${quoteError}`
                : quoteStatus === 'error'
                  ? `${quoteError} Showing portfolio prices instead.`
                  : quoteStatus === 'demo'
                    ? 'Example prices only—not live prices from your brokerage.'
                    : 'When you compare holdings, Exitwise asks SnapTrade for the latest trade prices your brokerage supplies. These may be delayed; SnapTrade doesn’t include when each trade occurred.'}
            {Object.values(quotePrices).some((quote) => quote.reason === 'SnapTrade quotes are limited to 10 investments per account.') && ' SnapTrade returns quotes for up to 10 investments per account; other holdings use their latest portfolio prices.'}
          </p>
          <p className={`trend-note ${trendStatus === 'error' ? 'brokerage-quote-error' : ''}`} role="status">
            {trendStatus === 'loading'
              ? 'Loading 30-day daily closing-price trends…'
              : trendStatus === 'ready'
                ? `30-day trend data uses Twelve Data daily closes. Only holding symbols are sent; no account details or position sizes. ${trendError || 'All compared holdings have trend data.'}`
                : trendStatus === 'demo'
                  ? '30-day trends are not shown for fictional demo holdings.'
                  : trendStatus === 'error'
                    ? `${trendError} Trend scores are neutral until trend data is available.`
                    : '30-day trends are loaded when you compare holdings. Trend data is informational and does not predict future prices.'}
          </p>
          {!planPositions.length
            ? <div className="results-empty">There are no holdings in {currency} to compare. <Link href="/investments">Review your holdings</Link>.</div>
            : results.length === 0
              ? <div className="results-empty">No holdings match this amount and your current settings. Try a different amount or change the purchase-price filter.</div>
              : <div className="options-grid">{results.map((result, index) => {
                const trend = marketTrends[result.symbol.toUpperCase()];
                return (
                <article className={`option-card ${index === 0 ? 'option-card-first' : ''}`} key={result.id}>
                  <div className="option-top"><span className="option-count">CHOICE {result.rank} · SCORE {Math.round(result.comparisonScore)}/100</span><span className={result.fullyCovers ? 'coverage-label full' : 'coverage-label'}>{result.fullyCovers ? 'Could meet your amount' : 'Would cover part'}</span></div>
                  <h3>{result.symbol} <span>{result.name}</span></h3>
                  <span className="option-kicker">ESTIMATED MONEY BEFORE FEES OR TAX</span>
                  <strong className="option-cash">{format(result.estimatedProceeds, currency)}</strong>
                  <p className="sale-recap">Estimated sale: about <strong>{result.quantity.toLocaleString('en-US', { maximumFractionDigits: 6 })} {unitsLabel(result.kind)}</strong> of {result.symbol}.</p>
                  <div className="coverage-track" aria-label={`${Math.round(result.coveragePct)} percent of your amount`}><span style={{ width: `${result.coveragePct}%` }} /></div>
                  <div className="option-facts">
                    <div><span>{quotePrices[result.id]?.price !== null && quotePrices[result.id]?.price !== undefined ? 'Latest trade price from SnapTrade' : 'Latest price in portfolio'}</span><strong>{format(result.price, currency)} per {result.kind === 'crypto' ? 'coin' : 'share'}{quotePrices[result.id]?.requestedAt && <small>Requested {new Date(quotePrices[result.id].requestedAt as string).toLocaleString()}</small>}</strong></div>
                    <div><span>Estimated gain/loss vs. purchase price</span><strong className={result.gain === null ? 'change-unknown' : result.gain >= 0 ? 'change-up' : 'change-down'}>
                      {result.gain === null ? 'Unknown' : `${result.gain >= 0 ? '+' : '−'}${format(Math.abs(result.gain), currency)}`}
                      {result.gainPct !== null && <small>{result.gainPct >= 0 ? '+' : ''}{result.gainPct.toFixed(2)}% of reported cost basis</small>}
                    </strong></div>
                    <div><span>30-day price trend</span><strong className={trend?.changePct == null ? 'change-unknown' : trend.changePct >= 0 ? 'change-up' : 'change-down'}>
                      {trend?.changePct == null
                        ? 'Unavailable'
                        : `${trend.changePct > 0 ? '+' : ''}${trend.changePct.toFixed(2)}%`}
                      {trend?.asOf && <small>Through {trend.asOf}</small>}
                    </strong></div>
                  </div>
                  <p className="option-explainer">{result.gain === null ? 'Purchase price wasn’t available, so the score treats this factor as neutral.' : 'The score favors a smaller estimated gain/loss impact. This is not a tax calculation.'} A recent trend is historical context, not a prediction.</p>
                </article>
                );
              })}</div>}
          <p className="estimate-note">This is an estimate based on available prices—not a guaranteed sale price or the amount you’ll receive. Fees, taxes, spreads, price changes, and account rules can change the result. Exitwise never places trades.</p>
        </section>
      )}
    </div>
  );
}
