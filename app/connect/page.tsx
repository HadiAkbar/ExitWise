'use client';

import Link from 'next/link';
import { usePortfolio } from '../components/portfolio-provider';

export default function ConnectPage() {
  const { connected, loading, error } = usePortfolio();

  return (
    <div className="inner-page connect-page">
      <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><strong>Connect brokerage</strong></div>
      <section className="connect-layout">
        <div className="connect-copy">
          <span className="eyebrow">YOUR DATA, YOUR PERMISSION</span>
          <h1>Connect a brokerage to review your holdings.</h1>
          <p>SnapTrade will guide you to choose a brokerage and sign in there. Exitwise never asks for or sees your brokerage password.</p>
          <div className="connection-points">
            <div><span>1</span><p><strong>Select your brokerage</strong><small>SnapTrade directs you to your brokerage’s own sign-in.</small></p></div>
            <div><span>2</span><p><strong>Review and approve access</strong><small>Check the permissions shown in the connection flow before continuing.</small></p></div>
            <div><span>3</span><p><strong>Compare possible sales</strong><small>Exitwise can read available holdings and prices. It cannot place trades or move money.</small></p></div>
          </div>
          {error && <p className="error-message connect-error" role="alert">{error}</p>}
          {connected
            ? <div className="connected-panel"><span className="connected-check">✓</span><div><strong>Brokerage connected</strong><small>Your available holdings can now be reviewed in Exitwise.</small></div></div>
            : <a className="primary-button connect-start" href="/api/auth/snaptrade/start">{loading ? 'Continue to SnapTrade' : 'Continue to SnapTrade'} <span aria-hidden="true">→</span></a>}
          {connected && <form action="/api/auth/snaptrade/logout" method="post"><button className="disconnect-button" type="submit">Disconnect this account</button></form>}
          <p className="connect-back"><Link href="/">Back to overview</Link></p>
        </div>
        <aside className="privacy-card">
          <div className="privacy-art" aria-hidden="true"><span className="privacy-lock">✓</span><i /><b /></div>
          <h2>You decide whether to sell.</h2>
          <p>Connecting lets Exitwise read the information needed for comparisons. You stay in control of your brokerage and any decision to sell.</p>
          <div className="privacy-rule" />
          <p className="privacy-small">Prices may be delayed. Estimates can be incomplete. Exitwise does not execute trades or provide financial advice.</p>
        </aside>
      </section>
    </div>
  );
}
