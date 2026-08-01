export interface MarketContext {
  marketCode: string;
  marketName: string;
  locale: string;
  currency: string;
  taxLabel: string;
  vatRate: number;
  enabledPaymentMethods: string[];
  liteModeDefault: boolean;
}

const MARKETS: Record<string, MarketContext> = {
  ZA: {
    marketCode: 'ZA',
    marketName: 'South Africa',
    locale: 'en-ZA',
    currency: 'ZAR',
    taxLabel: 'VAT',
    vatRate: 0.15,
    enabledPaymentMethods: ['CARD_TOKEN', 'MOBILE_MONEY'],
    liteModeDefault: false,
  },
  TZ: {
    marketCode: 'TZ',
    marketName: 'Tanzania',
    locale: 'sw-TZ',
    currency: 'TZS',
    taxLabel: 'VAT',
    vatRate: 0.18,
    enabledPaymentMethods: ['CARD_TOKEN', 'MOBILE_MONEY'],
    liteModeDefault: false,
  },
  MZ: {
    marketCode: 'MZ',
    marketName: 'Mozambique',
    locale: 'pt-MZ',
    currency: 'MZN',
    taxLabel: 'IVA',
    vatRate: 0.17,
    enabledPaymentMethods: ['CARD_TOKEN', 'MOBILE_MONEY'],
    liteModeDefault: false,
  },
};

export function getMarketContext(marketCode: string): MarketContext | undefined {
  return MARKETS[marketCode.toUpperCase()];
}

export function getDefaultMarketContext(): MarketContext {
  return MARKETS['ZA'];
}
