export interface CatalogVisibility {
  showDevices: boolean;
  showPlans: boolean;
  showBundles: boolean;
  showAccessories: boolean;
}

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
  catalogVisibility: CatalogVisibility;
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
    catalogVisibility: { showDevices: true, showPlans: true, showBundles: true, showAccessories: true },
  },
  TZ: {
    marketCode: 'TZ',
    marketName: 'Tanzania',
    currency: 'TZS',
    currencySymbol: 'TSh',
    language: 'sw-TZ',
    taxLabel: 'VAT',
    vatRate: 0.18,
    paymentMethods: ['CARD_TOKEN', 'MOBILE_MONEY'],
    mobileMoneyEnabled: true,
    cardPaymentEnabled: true,
    catalogVisibility: { showDevices: true, showPlans: true, showBundles: true, showAccessories: false },
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
    catalogVisibility: { showDevices: true, showPlans: true, showBundles: false, showAccessories: false },
  },
};

export function getMarket(marketCode: string): MarketConfig | undefined {
  return MARKETS[marketCode.toUpperCase()];
}

// Returns the default market (ZA) — used when no market cookie/header is present.
export function getDefaultMarket(): MarketConfig {
  return MARKETS['ZA'];
}
