export type TradeInCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';

export const VALID_CONDITIONS: ReadonlySet<string> = new Set<TradeInCondition>([
  'EXCELLENT', 'GOOD', 'FAIR', 'POOR',
]);

// Brand + model → per-condition credit (ZAR). Unknown devices fall back to DEFAULT_VALUATION.
const VALUATION_TABLE: Record<string, Record<TradeInCondition, number>> = {
  'Apple|iPhone 12':    { EXCELLENT: 3500, GOOD: 2500, FAIR: 1800, POOR: 1000 },
  'Apple|iPhone 13':    { EXCELLENT: 4500, GOOD: 3500, FAIR: 2500, POOR: 1500 },
  'Apple|iPhone 14':    { EXCELLENT: 6000, GOOD: 4800, FAIR: 3500, POOR: 2000 },
  'Apple|iPhone 15':    { EXCELLENT: 8000, GOOD: 6500, FAIR: 4800, POOR: 2800 },
  'Samsung|Galaxy S21': { EXCELLENT: 3000, GOOD: 2200, FAIR: 1600, POOR:  900 },
  'Samsung|Galaxy S22': { EXCELLENT: 4000, GOOD: 3000, FAIR: 2200, POOR: 1200 },
  'Samsung|Galaxy S23': { EXCELLENT: 5500, GOOD: 4200, FAIR: 3000, POOR: 1600 },
};

const DEFAULT_VALUATION: Record<TradeInCondition, number> = {
  EXCELLENT: 2000, GOOD: 1500, FAIR: 1000, POOR: 600,
};

export function getEstimatedCredit(
  brand: string,
  model: string,
  condition: TradeInCondition,
): number {
  const key = `${brand}|${model}`;
  const table = VALUATION_TABLE[key] ?? DEFAULT_VALUATION;
  return table[condition];
}
