import { MarketConfig, getMarket } from '../../../backend/src/modules/market/marketConfig';

export interface MarketContext {
  marketCode: string;
  marketName: string;
  locale: string;
  currency: string;
  currencySymbol: string;
  taxLabel: string;
  vatRate: number;
  enabledPaymentMethods: string[];
  liteModeDefault: boolean;
}

function toMarketContext(m: MarketConfig): MarketContext {
  return {
    marketCode: m.marketCode,
    marketName: m.marketName,
    locale: m.language,
    currency: m.currency,
    currencySymbol: m.currencySymbol,
    taxLabel: m.taxLabel,
    vatRate: m.vatRate,
    enabledPaymentMethods: m.paymentMethods,
    liteModeDefault: m.liteModeDefault,
  };
}

export function getMarketContext(marketCode: string): MarketContext | undefined {
  const m = getMarket(marketCode);
  return m ? toMarketContext(m) : undefined;
}

export function getDefaultMarketContext(): MarketContext {
  return toMarketContext(getMarket('ZA')!);
}
