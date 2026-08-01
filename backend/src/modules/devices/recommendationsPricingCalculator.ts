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

export function calculateRecommendationsPricing(attachments: SelectedAttachment[], vatRate: number): PricingResult {
  const onceOffSubtotal = attachments.reduce((sum, a) => sum + a.pricingRule.onceOff, 0);
  const monthlyTotal = attachments.reduce((sum, a) => sum + a.pricingRule.monthly, 0);
  const vatAmount = parseFloat((onceOffSubtotal * vatRate).toFixed(2));
  return { onceOffSubtotal, vatRate, vatAmount, monthlyTotal };
}
