export interface TradeInQuote {
  estimatedCredit: number;
  validUntil: string;
  asyncPending: boolean;
}

const CONDITION_MULTIPLIERS: Record<string, number> = {
  EXCELLENT: 1.0,
  GOOD: 0.75,
  FAIR: 0.5,
  POOR: 0.25,
};

const BASE_CREDITS: Record<string, number> = {
  Apple: 3000,
  Samsung: 2500,
};

export function getTradeInQuote(
  brand: string,
  _model: string,
  _storageGb: number,
  condition: string,
): TradeInQuote {
  const base = BASE_CREDITS[brand] ?? 1000;
  const multiplier = CONDITION_MULTIPLIERS[condition] ?? 0.25;
  return {
    estimatedCredit: Math.round(base * multiplier),
    validUntil: '2026-08-08T23:59:59Z',
    asyncPending: true,
  };
}
