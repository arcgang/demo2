export interface FinancingQuote {
  termMonths: number;
  monthlyAmount: number;
  onceOffDeposit: number;
  activationFee: number;
  totalCost: number;
  interestRate: number;
}

// totalCost = termMonths * monthlyAmount + onceOffDeposit + activationFee
const QUOTES_BY_PRODUCT: Record<string, FinancingQuote[]> = {
  'iphone-15-pro': [
    { termMonths: 12, monthlyAmount: 2299, onceOffDeposit: 1499, activationFee: 350, totalCost: 29437, interestRate: 9.5 },
    { termMonths: 24, monthlyAmount: 1299, onceOffDeposit: 999,  activationFee: 350, totalCost: 32525, interestRate: 11.5 },
    { termMonths: 36, monthlyAmount: 949,  onceOffDeposit: 499,  activationFee: 350, totalCost: 35013, interestRate: 14.0 },
  ],
  'samsung-s24-ultra': [
    { termMonths: 12, monthlyAmount: 2099, onceOffDeposit: 1299, activationFee: 350, totalCost: 26837, interestRate: 9.5 },
    { termMonths: 24, monthlyAmount: 1199, onceOffDeposit: 899,  activationFee: 350, totalCost: 30025, interestRate: 11.5 },
    { termMonths: 36, monthlyAmount: 879,  onceOffDeposit: 399,  activationFee: 350, totalCost: 32393, interestRate: 14.0 },
  ],
  'iphone-15': [
    { termMonths: 12, monthlyAmount: 1799, onceOffDeposit: 999,  activationFee: 350, totalCost: 22937, interestRate: 9.5 },
    { termMonths: 24, monthlyAmount: 999,  onceOffDeposit: 799,  activationFee: 350, totalCost: 25125, interestRate: 11.5 },
    { termMonths: 36, monthlyAmount: 729,  onceOffDeposit: 299,  activationFee: 350, totalCost: 26893, interestRate: 14.0 },
  ],
};

export function getFinancingQuotesByProductId(productId: string): FinancingQuote[] | null {
  return QUOTES_BY_PRODUCT[productId] ?? null;
}
