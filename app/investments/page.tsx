'use client';

import Link from 'next/link';
import { usePortfolio } from '../components/portfolio-provider';

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);

export default function InvestmentsPage() {
  const { positions, isDemo, connected, loading } = usePortfolio();
  const currencies = [...new Set(positions.map((position) => position.currency))].sort();

  return (
    <div className="inner-page">
      <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><strong>Holdings</strong></div>
      <header className="page-intro">
        <span className="eyebrow">{connected ? 'FROM YOUR BROKERAGE' : 'EXAMPLE PORTFOLIO'}</span>
        <h1>Your holdings</h1>
        <p>Review the investments in your portfolio, their reported values, and any available purchase-price information. Different currencies are shown separately.</p>
      </header>
      {isDemo && !loading && <div className="notice-banner compact"><span className="notice-icon" aria-hidden="true">i</span><p><strong>Example data:</strong> these holdings and values are fictional.</p><Link href="/connect">Connect brokerage <span aria-hidden="true">→</span></Link></div>}
      {currencies.length === 0
        ? <section className="empty-investments"><h2>No holdings to show</h2><p>{loading ? 'Loading your holdings…' : connected ? 'SnapTrade did not return any supported holdings for this account.' : 'Connect a brokerage to see your holdings here.'}</p><Link className="primary-button" href="/connect">Connect a brokerage <span aria-hidden="true">→</span></Link></section>
        : <div className="holdings-groups">{currencies.map((selectedCurrency) => {
          const items = positions.filter((position) => position.currency === selectedCurrency);
          const total = items.reduce((sum, position) => sum + position.value, 0);
          return (
            <section className="holdings-group" key={selectedCurrency}>
              <header className="holdings-group-header"><div><span className="eyebrow">VALUES IN {selectedCurrency}</span><h2>{money(total, selectedCurrency)}</h2></div><span>{items.length} {items.length === 1 ? 'investment' : 'investments'}</span></header>
              <div className="holdings-table">
                <div className="holdings-table-head"><span>INVESTMENT</span><span>SHARES / UNITS</span><span>PRICE</span><span>VALUE</span><span>CHANGE SINCE PURCHASE</span></div>
                {items.map((position) => {
                  const gain = position.costBasis === null ? null : position.units * (position.price - position.costBasis);
                  return (
                    <div className="holdings-table-row" key={position.id}>
                      <span className="holding-identity"><i>{position.symbol.slice(0, 1)}</i><span><strong>{position.symbol}</strong><small>{position.name}</small></span></span>
                      <span>{position.units.toLocaleString('en-US', { maximumFractionDigits: 6 })}</span>
                      <span>{money(position.price, selectedCurrency)}</span>
                      <strong>{money(position.value, selectedCurrency)}</strong>
                      <span className={gain === null ? 'change-unknown' : gain >= 0 ? 'change-up' : 'change-down'}>{gain === null ? 'Unknown' : `${gain >= 0 ? '+' : '−'}${money(Math.abs(gain), selectedCurrency)}`}</span>
                    </div>
                  );
                })}
              </div>
              <p className="table-footnote">Values and purchase prices are based on information provided by your brokerage through SnapTrade. They may be delayed or differ from your tax records.</p>
            </section>
          );
        })}</div>}
      <div className="page-bottom-cta"><p>Need money? Compare what selling a holding could provide.</p><Link className="secondary-button" href="/plan">Compare ways to sell <span aria-hidden="true">→</span></Link></div>
    </div>
  );
}
