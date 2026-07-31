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

export const VALID_CONDITIONS = Object.keys(CONDITION_MULTIPLIERS);

export function getTradeInQuote(
  brand: string,
  _model: string,
  _storageGb: number,
  condition: string,
): TradeInQuote | { errorCode: string; message: string } {
  if (!VALID_CONDITIONS.includes(condition)) {
    return {
      errorCode: 'VALIDATION_ERROR',
      message: `condition must be one of: ${VALID_CONDITIONS.join(', ')}.`,
    };
  }
  const base = BASE_CREDITS[brand] ?? 1000;
  const multiplier = CONDITION_MULTIPLIERS[condition];
  const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  return {
    estimatedCredit: Math.round(base * multiplier),
    validUntil,
    asyncPending: true,
  };
}
