export interface MarketContext {
  code: string;
  name: string;
  currencyCode: string;
  currencySymbol: string;
  taxLabel: string;
  taxRate: number;
  languageCode: string;
  enabledPaymentMethods: string[];
}
