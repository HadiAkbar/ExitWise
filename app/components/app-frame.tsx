'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PortfolioProvider, usePortfolio } from './portfolio-provider';

const navigation = [
  { href: '/', label: 'Overview' },
  { href: '/plan', label: 'Sell planner' },
  { href: '/investments', label: 'Holdings' },
];

function FrameContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { connected, loading } = usePortfolio();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="wordmark" href="/" aria-label="Exitwise home">
          <span>exitwise<span className="wordmark-dot">.</span></span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <Link className={pathname === item.href ? 'nav-link active' : 'nav-link'} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="topbar-right">
          <span className={`account-status ${connected ? 'connected' : ''}`}>
            <span className="status-dot" />
            {loading ? 'Checking' : connected ? 'Connected' : 'Demo'}
          </span>
          <Link className="connect-button" href="/connect">{connected ? 'Brokerage' : 'Connect'}</Link>
        </div>
      </header>
      <main className="page-content">{children}</main>
      <footer className="site-footer">
        <Link className="footer-brand" href="/">exitwise<span className="wordmark-dot">.</span></Link>
        <span>Explore possible sales. The decision stays yours.</span>
        <span className="footer-disclaimer">Estimates only · Not financial advice</span>
      </footer>
    </div>
  );
}

export default function AppFrame({ children }: { children: React.ReactNode }) {
  return <PortfolioProvider><FrameContent>{children}</FrameContent></PortfolioProvider>;
}
