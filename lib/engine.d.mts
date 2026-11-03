export type Position = {
  id: string;
  accountId: string;
  symbol: string;
  name: string;
  kind: string;
  units: number;
  price: number;
  costBasis: number | null;
  currency: string;
  value: number;
  asOf: string | null;
};

export type SaleOption = Position & {
  quantity: number;
  estimatedProceeds: number;
  fullyCovers: boolean;
  gain: number | null;
  gainPct: number | null;
  remainingUnits: number;
  coveragePct: number;
  trend30dPct: number | null;
  comparisonScore: number;
  rankingFactors: {
    coverage: number;
    profitLoss: number | null;
    trend: number | null;
  };
  rank: number;
};

export function asNumber(value: unknown): number | null;
export function normalizePositions(accountId: string, payload: unknown): Position[];
export function compareSales(
  positions: Position[],
  target: number,
  currency?: string,
  avoidLosses?: boolean,
  trendsBySymbol?: Record<string, number | null>,
): SaleOption[];
export function calculate30DayChange(
  values: unknown,
  startDate: string,
  endDate: string,
): { changePct: number; asOf: string } | null;
