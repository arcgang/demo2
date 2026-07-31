import { TradeInCondition } from './tradeInAdapter';

export interface TradeInQuoteRecord {
  id: string;
  brand: string;
  model: string;
  storage: number;
  condition: TradeInCondition;
  estimatedCredit: number;
  validUntil: string;
  cartId: string | null;
}

// In-memory store representing the trade_in_quotes table.
const store = new Map<string, TradeInQuoteRecord>();

let counter = 1;

export function saveQuote(record: Omit<TradeInQuoteRecord, 'id'>): TradeInQuoteRecord {
  const id = `tiq_${counter++}`;
  const full: TradeInQuoteRecord = { id, ...record };
  store.set(id, full);
  return full;
}

export function findQuote(id: string): TradeInQuoteRecord | undefined {
  return store.get(id);
}

export function attachCartToQuote(id: string, cartId: string): void {
  const record = store.get(id);
  if (record) {
    record.cartId = cartId;
  }
}
