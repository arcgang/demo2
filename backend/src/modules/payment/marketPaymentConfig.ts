export interface PaymentMethodConfig {
  type: string;
  label: string;
  iconKey: string;
}

interface MarketPaymentEntry {
  card: boolean;
  mobile_money: boolean;
}

const MARKET_PAYMENT_CONFIG: Record<string, MarketPaymentEntry> = {
  ZA: { card: true, mobile_money: true },
  TZ: { card: true, mobile_money: true },
  MZ: { card: true, mobile_money: true },
  XX: { card: true, mobile_money: false },
};

const METHOD_DEFINITIONS: Record<string, PaymentMethodConfig> = {
  card: { type: 'card', label: 'Credit / Debit Card', iconKey: 'card' },
  mobile_money: { type: 'mobile_money', label: 'Mobile Money', iconKey: 'mobile_money' },
};

export function getPaymentMethodsForMarket(marketCode: string): PaymentMethodConfig[] | null {
  const config = MARKET_PAYMENT_CONFIG[marketCode];
  if (!config) return null;

  const methods: PaymentMethodConfig[] = [];
  if (config.card) methods.push(METHOD_DEFINITIONS.card);
  if (config.mobile_money) methods.push(METHOD_DEFINITIONS.mobile_money);
  return methods;
}
