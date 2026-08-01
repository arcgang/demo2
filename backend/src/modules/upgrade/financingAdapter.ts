export interface FinancingQuote {
  termMonths: number;
  monthlyAmount: number;
  onceOffDeposit: number;
  totalCost: number;
  interestRate: number;
}

const QUOTES_BY_PRODUCT: Record<string, FinancingQuote[]> = {
  'iphone-15-pro': [
    { termMonths: 12, monthlyAmount: 2299, onceOffDeposit: 1499, totalCost: 29087, interestRate: 9.5 },
    { termMonths: 24, monthlyAmount: 1299, onceOffDeposit: 999,  totalCost: 32175, interestRate: 11.5 },
    { termMonths: 36, monthlyAmount: 949,  onceOffDeposit: 499,  totalCost: 34663, interestRate: 14.0 },
  ],
  'samsung-s24-ultra': [
    { termMonths: 12, monthlyAmount: 2099, onceOffDeposit: 1299, totalCost: 26487, interestRate: 9.5 },
    { termMonths: 24, monthlyAmount: 1199, onceOffDeposit: 899,  totalCost: 29675, interestRate: 11.5 },
    { termMonths: 36, monthlyAmount: 879,  onceOffDeposit: 399,  totalCost: 32043, interestRate: 14.0 },
  ],
  'iphone-15': [
    { termMonths: 12, monthlyAmount: 1799, onceOffDeposit: 999,  totalCost: 22587, interestRate: 9.5 },
    { termMonths: 24, monthlyAmount: 999,  onceOffDeposit: 799,  totalCost: 24775, interestRate: 11.5 },
    { termMonths: 36, monthlyAmount: 729,  onceOffDeposit: 299,  totalCost: 26543, interestRate: 14.0 },
  ],
};

export function getFinancingQuotesByProductId(productId: string): FinancingQuote[] | null {
  return QUOTES_BY_PRODUCT[productId] ?? null;
}
