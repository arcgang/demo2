export interface MarketConfig {
  marketCode: string;
  marketName: string;
  currency: string;
  language: string;
  taxLabel: string;
  vatRate: number;
  paymentMethods: string[];
  mobileMoneyEnabled: boolean;
  cardPaymentEnabled: boolean;
}

const MARKETS: Record<string, MarketConfig> = {
  ZA: {
    marketCode: 'ZA',
    marketName: 'South Africa',
    currency: 'ZAR',
    language: 'en-ZA',
    taxLabel: 'VAT',
    vatRate: 0.15,
    paymentMethods: ['CARD_TOKEN', 'MOBILE_MONEY'],
    mobileMoneyEnabled: true,
    cardPaymentEnabled: true,
  },
  TZ: {
    marketCode: 'TZ',
    marketName: 'Tanzania',
    currency: 'TZS',
    language: 'sw-TZ',
    taxLabel: 'VAT',
    vatRate: 0.18,
    paymentMethods: ['CARD_TOKEN', 'MOBILE_MONEY'],
    mobileMoneyEnabled: true,
    cardPaymentEnabled: true,
  },
  MZ: {
    marketCode: 'MZ',
    marketName: 'Mozambique',
    currency: 'MZN',
    language: 'pt-MZ',
    taxLabel: 'IVA',
    vatRate: 0.17,
    paymentMethods: ['CARD_TOKEN', 'MOBILE_MONEY'],
    mobileMoneyEnabled: true,
    cardPaymentEnabled: true,
  },
};

export function getMarket(marketCode: string): MarketConfig | undefined {
  return MARKETS[marketCode.toUpperCase()];
}

export function isKnownMarket(marketCode: string): boolean {
  return marketCode.toUpperCase() in MARKETS;
}
