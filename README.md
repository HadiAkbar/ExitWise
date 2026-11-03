# ExitWise

When you need liquidity, deciding which investment to sell can involve more than checking which holding covers the amount. ExitWise helps you compare possible sales side by side, so you can understand estimated proceeds, reported gain or loss, and recent price movement before making your own decision.

ExitWise is a read-only planning app. It does not place trades, move money, or tell you what you should sell.

## How it works

1. Connect a brokerage through SnapTrade.
2. Enter an approximate amount you need.
3. Review up to three individual-holding sale comparisons, including estimated quantity, gross proceeds, price, reported cost-basis impact, and recent trend.
4. Consider the trade-offs and decide for yourself.

The app also includes a clearly labeled example portfolio so you can explore the planner without connecting an account.

## How comparisons are ranked

Each holding receives a comparison score from 0 to 100. The score balances three factors:

| Factor | Weight | What it measures |
|---|---:|---|
| Amount covered | 40% | How much of the amount you entered the estimated sale could provide. Covering the full amount does not automatically make a holding the top choice. |
| Estimated gain/loss impact | 30% | How much the estimated sale differs from the holding’s reported purchase price. Smaller differences score higher. |
| 30-day price movement | 30% | Recent movement in daily closing prices. Weaker recent momentum scores higher as one consideration, not as a forecast. |

Unavailable information is treated as neutral. You can optionally hide holdings that are below their reported purchase price. That filter and the comparison score are planning aids—not individualized investment or tax advice.

## Prices and market information

- **Brokerage holdings and latest-trade prices:** supplied by SnapTrade from the connected brokerage. Prices may be delayed. SnapTrade does not provide the time the latest trade occurred, so the app does not present the request time as the trade time.
- **Recent price movement:** daily historical closes supplied by Twelve Data for the prior 30 calendar days.
- **Currency:** holdings are compared in their native currency. ExitWise does not convert currencies.
- **Unavailable values:** if a provider does not return a price, cost basis, or trend, the app identifies the missing information rather than inventing it.

Only the symbols and market-identifying details needed to request public market history are sent to Twelve Data; account identifiers, position sizes, and cost basis are not included in that request.

## Important limitations

ExitWise is a prototype for comparing hypothetical sales, not a financial service or a source of personalized recommendations. Its score is a simple heuristic; it cannot determine what is “best” for an individual.

Estimates do not include fees, taxes, tax lots, spreads, price changes during a sale, settlement timing, cash balances, diversification, or account-specific trading restrictions. Reported cost basis may be incomplete or differ from tax records. Fractional quantities may not be tradable. Recent market trends describe past price movement and do not predict future prices.

Connecting an account allows ExitWise to read available portfolio information through SnapTrade. ExitWise cannot execute trades or move funds. Review the permissions presented during account connection.
