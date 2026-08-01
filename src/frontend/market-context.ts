import { Market } from '../modules/market/market.model';

export type { Market };

export interface ValidatedCartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  eligible: boolean;
  warning?: string;
}

export function formatPrice(amount: number, market: Market): string {
  return `${market.currencySymbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function computeTax(subtotal: number, market: Market): { label: string; amount: number } {
  return {
    label: market.taxLabel,
    amount: Math.round(subtotal * market.taxRate * 100) / 100,
  };
}

export function isPaymentMethodEnabled(method: string, market: Market): boolean {
  return market.enabledPaymentMethods.includes(method);
}

export function resolveDefaultMarket(markets: Market[]): Market | undefined {
  return markets.find((m) => m.active);
}

export const MARKET_PREFERENCE_KEY = 'selectedMarketCode';
