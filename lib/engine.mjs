/** All amounts are in the holding's native currency. Never mix currencies silently. */
/**
 * @typedef {Object} Position
 * @property {string} id
 * @property {string} accountId
 * @property {string} symbol
 * @property {string} name
 * @property {string} kind
 * @property {number} units
 * @property {number} price
 * @property {number|null} costBasis
 * @property {string} currency
 * @property {number} value
 * @property {string|null} asOf
 */
/**
 * @typedef {Position & {
 *   quantity: number,
 *   estimatedProceeds: number,
 *   fullyCovers: boolean,
 *   gain: number|null,
 *   gainPct: number|null,
 *   remainingUnits: number,
 *   coveragePct: number,
 *   trend30dPct: number|null,
 *   comparisonScore: number,
 *   rankingFactors: {coverage: number, profitLoss: number|null, trend: number|null},
 *   rank: number
 * }} SaleOption
 */
export function asNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
export function normalizePositions(accountId, payload) {
  const entries = Array.isArray(payload?.results) ? payload.results : [];
  const asOf = payload?.data_freshness?.as_of ?? null;
  return entries.flatMap((p) => {
    const kind = String(p?.instrument?.kind || 'other').toLowerCase();
    if (!['stock','adr','etf','crypto','mutualfund','cef'].includes(kind) || p.cash_equivalent === true) return [];
    const units = asNumber(p.units), price = asNumber(p.price), costBasis = asNumber(p.cost_basis);
    if (units === null || units <= 0 || price === null || price <= 0) return [];
    const currency = String(p.currency || p?.instrument?.currency || '').toUpperCase();
    if (!currency) return [];
    return [{ id: `${accountId}:${p.instrument?.id || p.instrument?.symbol || 'unknown'}`, accountId,
      symbol: String(p.instrument?.symbol || 'Unknown'), name: String(p.instrument?.description || p.instrument?.symbol || 'Investment'),
      kind, units, price, costBasis: costBasis !== null && costBasis >= 0 ? costBasis : null,
      currency, value: units * price, asOf }];
  });
}
/**
 * @param {Position[]} positions
 * @param {number} target
 * @param {string} currency
 * @param {boolean} avoidLosses
 * @returns {SaleOption[]}
 */
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function compareSales(positions, target, currency='USD', avoidLosses=false, trendsBySymbol={}) {
  if (!Number.isFinite(target) || target <= 0) return [];
  const options = positions.filter(p => p.currency === currency && p.price > 0 && p.units > 0)
    .map(p => {
      const quantity = Math.min(p.units, target / p.price);
      const estimatedProceeds = quantity * p.price;
      const fullyCovers = estimatedProceeds >= target - 0.01;
      const gain = p.costBasis === null ? null : quantity * (p.price-p.costBasis);
      const gainPct = p.costBasis === null || p.costBasis === 0 ? null : 100*(p.price-p.costBasis)/p.costBasis;
      const trend30dPct = asNumber(trendsBySymbol[p.symbol.toUpperCase()]);
      const profitLossScore = gain === null ? null : 100 - clamp(100 * Math.abs(gain) / estimatedProceeds, 0, 100);
      const trendScore = trend30dPct === null ? null : clamp(50 - trend30dPct, 0, 100);
      const coverageScore = Math.min(100, 100*estimatedProceeds/target);
      const comparisonScore = coverageScore*0.4 + (profitLossScore ?? 50)*0.3 + (trendScore ?? 50)*0.3;
      return {...p, quantity, estimatedProceeds, fullyCovers, gain, gainPct, remainingUnits:p.units-quantity,
        coveragePct: coverageScore, trend30dPct, comparisonScore,
        rankingFactors: {
          coverage: Math.min(100,100*estimatedProceeds/target),
          profitLoss: profitLossScore,
          trend: trendScore,
        }};
    }).filter(p=> !avoidLosses || p.gain === null || p.gain >= 0);
  return options.sort((a,b)=>b.comparisonScore-a.comparisonScore ||
    b.coveragePct-a.coveragePct ||
    Math.abs(a.gain ?? 0)-Math.abs(b.gain ?? 0) ||
    a.symbol.localeCompare(b.symbol)).slice(0,3).map((option,index)=>({...option,rank:index+1}));
}

export function calculate30DayChange(values, startDate, endDate) {
  const observations = (Array.isArray(values) ? values : [])
    .map(value => ({ date: String(value?.datetime || ''), close: asNumber(value?.close) }))
    .filter(value => value.close !== null && value.close > 0 && value.date >= startDate && value.date <= endDate)
    .sort((a,b) => a.date.localeCompare(b.date));
  if (observations.length < 2) return null;
  const first = observations[0];
  const last = observations[observations.length - 1];
  return { changePct: 100*(last.close-first.close)/first.close, asOf: last.date };
}
