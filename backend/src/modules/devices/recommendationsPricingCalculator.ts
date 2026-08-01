export interface SelectedAttachment {
  id: string;
  type: string;
  required: boolean;
  pricingRule: { onceOff: number; monthly: number };
}

export interface PricingResult {
  onceOffSubtotal: number;
  vatRate: number;
  vatAmount: number;
  monthlyTotal: number;
}

const VAT_RATE = 0.15;

export function calculateRecommendationsPricing(attachments: SelectedAttachment[]): PricingResult {
  const onceOffSubtotal = attachments.reduce((sum, a) => sum + a.pricingRule.onceOff, 0);
  const monthlyTotal = attachments.reduce((sum, a) => sum + a.pricingRule.monthly, 0);
  const vatAmount = parseFloat((onceOffSubtotal * VAT_RATE).toFixed(2));
  return { onceOffSubtotal, vatRate: VAT_RATE, vatAmount, monthlyTotal };
}
