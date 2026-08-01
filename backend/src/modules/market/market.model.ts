export interface Market {
  code: string;
  name: string;
  displayLabel: string;
  flagEmoji: string;
  currencySymbol: string;
  currencyCode: string;
  taxLabel: string;
  taxRate: number;
  enabledPaymentMethods: string[];
  active: boolean;
}
