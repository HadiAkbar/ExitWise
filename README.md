# ExitWise

ExitWise is a read-only liquidity planning prototype for people considering selling an investment to meet a cash need. It connects a brokerage through SnapTrade, compares hypothetical sales of individual holdings, and explains the trade-offs behind each comparison.

**ExitWise does not place trades, move money, provide individualized financial or tax advice, or guarantee a sale price.** A comparison score is a transparent heuristic—not a claim that one investment is universally best to sell.

## What it does

- Shows brokerage holdings and their reported values, grouped by native currency. It does not convert currencies.
- Lets a person enter an amount they may need and compares selling one holding at a time.
- Estimates the number of shares or coins and the gross proceeds, before fees, taxes, spreads, or price movement.
- Displays estimated gain or loss against the available reported cost basis. This is not a tax-lot or tax calculation.
- Requests the latest-trade prices SnapTrade makes available when the user compares. A latest-trade price may be delayed, and SnapTrade does not provide the time that trade occurred.
- Loads daily historical closes from Twelve Data to show the price change over the prior 30 calendar days.
- Labels demo data and unavailable data; missing information is not presented as a live signal.

### How the comparison score works

The planner sorts up to three holdings using a 0–100 comparison score:

| Factor | Weight | How it is interpreted |
|---|---:|---|
| Cash-target coverage | 40% | Higher estimated coverage scores better; a holding that covers the entire amount is not automatically ranked first. |
| Estimated gain/loss impact | 30% | A smaller absolute difference from reported cost basis scores better. |
| 30-day price movement | 30% | Weaker recent momentum scores higher as one consideration, not as a forecast. |

Unavailable cost basis or trend data receives a neutral score for that factor. The optional “Don’t show holdings currently below their reported purchase price” control filters out reported losses; it is not investment or tax advice. The score does not account for diversification, tax lots, fees, account rules, or the investor’s future plans.

## Technology

- Next.js 15 App Router, React 19, and TypeScript
- SnapTrade OAuth 2.0 authorization-code flow with PKCE and OpenID Connect identity verification
- SnapTrade read-only portfolio and latest-trade quote endpoints
- Twelve Data daily time-series endpoint for 30-day historical context
- Encrypted, HTTP-only cookies for the prototype’s OAuth session

## Run locally

### Requirements

- Node.js 20 or newer
- A SnapTrade OAuth application and connected brokerage account
- A Twelve Data API key for market trends

### Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy the example environment file:

   ```sh
   cp .env.example .env.local
   ```

3. Set the environment values in `.env.local`:

   | Variable | Purpose |
   |---|---|
   | `SNAPTRADE_OAUTH_CLIENT_ID` | SnapTrade OAuth client ID |
   | `SNAPTRADE_OAUTH_CLIENT_SECRET` | SnapTrade OAuth client secret |
   | `SNAPTRADE_REDIRECT_URI` | Exact callback URL registered in SnapTrade |
   | `SESSION_ENCRYPTION_KEY` | Base64-encoded 32-byte key used to encrypt session cookies |
   | `TWELVE_DATA_API_KEY` | Twelve Data key used by the server for market history |

   Generate the session key with:

   ```sh
   openssl rand -base64 32
   ```

   Keep `.env.local` private. Do not commit credentials or expose provider keys through `NEXT_PUBLIC_*` variables.

4. Register this exact local callback URL in the SnapTrade OAuth application:

   ```text
   http://localhost:3000/api/auth/snaptrade/callback
   ```

5. Start the development server:

   ```sh
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000). The app starts with clearly labeled fictional data. Connect SnapTrade to load a real portfolio.

### Checks

```sh
npm test
npm run typecheck
npm run build
```

`npm test` covers portfolio normalization, score ranking, cost-basis handling, currency separation, and 30-day trend calculations. `npm run build` performs Next.js production compilation and type validation.

## Deploy to Vercel

1. Import the GitHub repository into Vercel and select the Next.js framework preset. The standard build command is `npm run build`; no custom output directory is needed.
2. In Vercel **Project → Settings → Environment Variables**, add the five variables listed above. Apply them to the intended environments. Keep all secrets server-side; do not prefix them with `NEXT_PUBLIC_`.
3. Assign the production domain in Vercel, then set `SNAPTRADE_REDIRECT_URI` to the exact production callback:

   ```text
   https://YOUR-DOMAIN/api/auth/snaptrade/callback
   ```

4. Register the same production callback URL in the SnapTrade OAuth application. The local callback and production callback are different URLs and both must be registered if you use both.
5. Redeploy after setting or changing environment variables. Verify the Overview, Sell planner, Holdings, brokerage connection, quote refresh, and trend results on the deployed domain.
6. Before inviting users, confirm the SnapTrade OAuth app is approved and configured for the intended audience. Test-mode user limits and access restrictions are controlled by SnapTrade.

Vercel automatically provisions the required Node.js runtime for the API routes. Do not deploy `.env.local`; configure secrets in Vercel’s project settings instead.

## Market-data behavior and limits

- SnapTrade is used for brokerage holdings and latest-trade prices. Those prices can be delayed; the time of the request is not the time of the trade.
- Twelve Data is called from a server-side route, so the API key is not sent to the browser. The app requests up to eight distinct symbols per comparison and uses daily closing prices within the previous 30 calendar days.
- Only holding symbols, asset kinds, and currencies needed to identify the public market instrument are sent to Twelve Data—not account IDs, position sizes, or cost basis.
- Unsupported symbols, provider errors, rate limits, and missing configuration are reported as unavailable. Trend data is informational and does not predict future prices.
- SnapTrade quote requests are limited to ten investments per account. Holdings without a returned quote use the portfolio price and are labeled accordingly.
- Fractional sale quantities may not be tradable. Fees, taxes, FX, spreads, settlement, cash balances, and account-specific restrictions are not modeled.

## Production and privacy notes

This repository is an internship-project prototype, not a fully hardened financial application. Before broad public use:

- Replace the prototype’s encrypted session cookie with durable, server-side token storage and an opaque session identifier. Cookie-size limits can prevent some SnapTrade sessions from working, and a shared encryption key must be protected carefully.
- Review consent, privacy disclosures, retention/deletion, logging, abuse/rate limiting, and incident-response requirements for the users and jurisdictions you intend to support.
- Ensure SnapTrade and Twelve Data terms, API access, pricing, and OAuth approval allow the intended production use.
- Reassess the score with product, compliance, and financial professionals. It is not investment advice and should not be marketed as an objectively “best” sale.

Never put live credentials in the repository, screenshots, issue reports, or chat. If a provider key was exposed, revoke or rotate it and update the local/Vercel environment variable.

## References

- [SnapTrade OAuth apps](https://docs.snaptrade.com/docs/oauth-apps)
- [SnapTrade account positions](https://docs.snaptrade.com/reference/Account%20Information/AccountInformation_getAllAccountPositions)
- [Twelve Data time series](https://twelvedata.com/docs/market-data/time-series)
- [Vercel: Deploying Next.js](https://vercel.com/docs/frameworks/nextjs)
