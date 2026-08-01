export interface MarketConfig {
  marketCode: string;
  marketName: string;
  currency: string;
  currencySymbol: string;
  language: string;
  taxLabel: string;
  vatRate: number;
  paymentMethods: string[];
  mobileMoneyEnabled: boolean;
  cardPaymentEnabled: boolean;
  portingSupported: boolean;
  liteModeDefault: boolean;
}

const MARKETS: Record<string, MarketConfig> = {
  ZA: {
    marketCode: 'ZA',
    marketName: 'South Africa',
    currency: 'ZAR',
    currencySymbol: 'R',
    language: 'en-ZA',
    taxLabel: 'VAT',
    vatRate: 0.15,
    paymentMethods: ['CARD_TOKEN', 'MOBILE_MONEY'],
    mobileMoneyEnabled: true,
    cardPaymentEnabled: true,
    portingSupported: true,
    liteModeDefault: false,
  },
  TZ: {
    marketCode: 'TZ',
    marketName: 'Tanzania',
    currency: 'TZS',
    currencySymbol: 'TZS',
    language: 'sw-TZ',
    taxLabel: 'VAT',
    vatRate: 0.18,
    paymentMethods: ['CARD_TOKEN', 'MOBILE_MONEY'],
    mobileMoneyEnabled: true,
    cardPaymentEnabled: true,
    portingSupported: true,
    liteModeDefault: false,
  },
  MZ: {
    marketCode: 'MZ',
    marketName: 'Mozambique',
    currency: 'MZN',
    currencySymbol: 'MT',
    language: 'pt-MZ',
    taxLabel: 'IVA',
    vatRate: 0.17,
    paymentMethods: ['CARD_TOKEN', 'MOBILE_MONEY'],
    mobileMoneyEnabled: true,
    cardPaymentEnabled: true,
    portingSupported: true,
    liteModeDefault: false,
  },
};

export function getMarket(marketCode: string): MarketConfig | undefined {
  return MARKETS[marketCode.toUpperCase()];
}

export function isKnownMarket(marketCode: string): boolean {
  return marketCode.toUpperCase() in MARKETS;
}
