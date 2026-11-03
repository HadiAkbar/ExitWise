'use client';

import Link from 'next/link';
import { usePortfolio } from './components/portfolio-provider';

const money = (value: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);

export default function Home() {
  const { positions, isDemo, connected, loading } = usePortfolio();
  const totals = positions.reduce((result, position) => {
    result.set(position.currency, (result.get(position.currency) || 0) + position.value);
    return result;
  }, new Map<string, number>());
  const recent = positions.slice(0, 4);

  return (
    <div className="dashboard-page">
      <section className="dashboard-welcome">
        <div>
          <span className="eyebrow">WHEN YOU NEED LIQUIDITY</span>
          <h1>Need money? See what selling could provide.</h1>
          <p>Compare what you might receive by selling individual investments. Understand the trade-offs, then decide for yourself.</p>
          <Link className="primary-button" href="/plan">Compare ways to sell <span aria-hidden="true">→</span></Link>
        </div>
        <div className="welcome-illustration">
          <div className="idea-card">
            <span className="idea-kicker">A CLEARER NEXT STEP</span>
            <strong>Need money?</strong>
            <div className="idea-row"><i>1</i><span>Set how much you need</span><b>✓</b></div>
            <div className="idea-row"><i>2</i><span>Compare holdings to sell</span><b>✓</b></div>
            <div className="idea-row"><i>3</i><span>You decide what to do</span><b>→</b></div>
          </div>
          <span className="idea-accent" aria-hidden="true" />
        </div>
      </section>

      {isDemo && !loading && (
        <div className="notice-banner">
          <span className="notice-icon" aria-hidden="true">i</span>
          <p><strong>Example portfolio.</strong> These holdings and prices are fictional, for exploring the planner only.</p>
          <Link href="/connect">Connect a brokerage <span aria-hidden="true">→</span></Link>
        </div>
      )}

      <section className="dashboard-grid">
        <div className="dashboard-panel portfolio-summary">
          <div className="panel-heading">
            <div><span className="eyebrow">YOUR PORTFOLIO</span><h2>{connected ? 'Holdings at a glance' : 'Example holdings'}</h2></div>
            <Link href="/investments" className="text-link">Review holdings <span aria-hidden="true">→</span></Link>
          </div>
          {totals.size
            ? <div className="currency-totals">{[...totals].map(([currency, total]) => (
              <div className="currency-total" key={currency}>
                <span>{currency} total</span><strong>{money(total, currency)}</strong>
                <small>{positions.filter((position) => position.currency === currency).length} holdings</small>
              </div>
            ))}</div>
            : <p className="empty-copy">{loading ? 'Loading your holdings…' : 'No holdings to show yet.'}</p>}
          <div className="mini-holdings">
            {recent.map((position) => (
              <div className="mini-holding" key={position.id}>
                <span className={`ticker ticker-${position.symbol.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4)}`}>{position.symbol.slice(0, 1)}</span>
                <span className="mini-holding-name"><strong>{position.symbol}</strong><small>{position.name}</small></span>
                <strong className="mini-holding-value">{money(position.value, position.currency)}</strong>
              </div>
            ))}
          </div>
          <Link className="panel-bottom-link" href="/investments">Review all holdings <span aria-hidden="true">→</span></Link>
        </div>

        <div className="dashboard-panel next-step-panel">
          <span className="eyebrow">PLAN YOUR NEXT MOVE</span>
          <div className="next-step-art" aria-hidden="true"><span>$</span><i>?</i></div>
          <h2>Decide how much liquidity you need.</h2>
          <p>Compare selling one holding at a time. See estimated proceeds and reported purchase-price differences before making your own decision.</p>
          <Link className="secondary-button" href="/plan">Compare holdings to sell <span aria-hidden="true">→</span></Link>
          {!connected && <Link className="subtle-link" href="/connect">How brokerage connection works</Link>}
        </div>
      </section>
      <p className="dashboard-footnote">Prices and proceeds are estimates and may be delayed. Exitwise helps you consider a sale; it never places trades.</p>
    </div>
  );
}
