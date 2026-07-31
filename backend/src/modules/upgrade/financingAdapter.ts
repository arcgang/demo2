export interface FinancingQuote {
  monthlyAmount: number;
  termMonths: number;
  asyncPending: boolean;
}

export function getFinancingQuotes(): FinancingQuote[] {
  return [
    { monthlyAmount: 899.00, termMonths: 24, asyncPending: true },
    { monthlyAmount: 1149.00, termMonths: 18, asyncPending: true },
    { monthlyAmount: 1549.00, termMonths: 12, asyncPending: false },
  ];
}
