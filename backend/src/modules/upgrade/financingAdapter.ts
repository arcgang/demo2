import { getSlowAdapterMs } from '../shared/adapterTimeout';

export interface FinancingQuote {
  monthlyAmount: number;
  termMonths: number;
  asyncPending: boolean;
}

export function getFinancingQuotes(): Promise<FinancingQuote[]> {
  const delay = getSlowAdapterMs();
  return new Promise<FinancingQuote[]>((resolve) => {
    setTimeout(() => {
      resolve([
        { monthlyAmount: 899.00, termMonths: 24, asyncPending: true },
        { monthlyAmount: 1149.00, termMonths: 18, asyncPending: true },
        { monthlyAmount: 1549.00, termMonths: 12, asyncPending: false },
      ]);
    }, delay);
  });
}
