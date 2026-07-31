import { randomUUID } from 'crypto';

export type ItemType = 'device' | 'plan' | 'bundle' | 'accessory' | 'sim' | 'credit';

export interface CartItem {
  id: string;
  cart_id: string;
  item_type: ItemType;
  product_id: string;
  product_name: string;
  variant_label: string | null;
  qty: number;
  once_off_price_cents: number;
  recurring_price_cents: number;
  tax_inclusive: boolean;
  is_optional: boolean;
  parent_item_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartTotals {
  once_off_subtotal: number;
  recurring_subtotal: number;
  tax_amount: number;
  credits: number;
  total_once_off: number;
  total_monthly: number;
}

export interface Cart {
  id: string;
  session_id: string;
  market: string;
  currency: string;
  items: CartItem[];
  totals: CartTotals;
  created_at: string;
  updated_at: string;
}

// VAT rates by market code; env var VAT_RATE_<MARKET> overrides at runtime.
const MARKET_VAT_RATES: Record<string, number> = {
  ZA: 0.15,
  TZ: 0.18,
  MZ: 0.17,
};

// Default currency per market.
const MARKET_CURRENCIES: Record<string, string> = {
  ZA: 'ZAR',
  TZ: 'TZS',
  MZ: 'MZN',
};

function getVatRate(market: string): number {
  const envKey = `VAT_RATE_${market.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal !== undefined) {
    const parsed = parseFloat(envVal);
    if (!isNaN(parsed)) return parsed;
  }
  return MARKET_VAT_RATES[market.toUpperCase()] ?? 0.15;
}

function calcTotals(items: CartItem[], market: string): CartTotals {
  const vatRate = getVatRate(market);
  let once_off_subtotal = 0;
  let taxable_base = 0;
  let recurring_subtotal = 0;
  let credits = 0;

  for (const item of items) {
    if (item.item_type === 'credit') {
      credits += item.once_off_price_cents * item.qty;
    } else {
      const lineTotal = item.once_off_price_cents * item.qty;
      once_off_subtotal += lineTotal;
      // tax_inclusive items already embed VAT — exclude from the taxable base.
      if (!item.tax_inclusive) {
        taxable_base += lineTotal;
      }
      recurring_subtotal += item.recurring_price_cents * item.qty;
    }
  }

  const tax_amount = Math.round(taxable_base * vatRate);
  const total_once_off = once_off_subtotal + tax_amount + credits;
  const total_monthly = recurring_subtotal;

  return { once_off_subtotal, recurring_subtotal, tax_amount, credits, total_once_off, total_monthly };
}

// Demo in-memory store — replace with a PostgreSQL CartRepository once a DB layer is wired in.
class InMemoryCartStore {
  private readonly carts = new Map<string, Cart>();

  findBySessionId(sessionId: string): Cart | undefined {
    return this.carts.get(sessionId);
  }

  save(sessionId: string, cart: Cart): void {
    this.carts.set(sessionId, cart);
  }
}

const store = new InMemoryCartStore();

function resolveMarketContext(market?: string): { market: string; currency: string } {
  const m = (market ?? process.env.DEFAULT_MARKET ?? 'ZA').toUpperCase();
  const currency = MARKET_CURRENCIES[m] ?? 'ZAR';
  return { market: m, currency };
}

function getOrCreateCart(sessionId: string, market?: string): Cart {
  let cart = store.findBySessionId(sessionId);
  if (!cart) {
    const now = new Date().toISOString();
    const resolved = resolveMarketContext(market);
    cart = {
      id: randomUUID(),
      session_id: sessionId,
      market: resolved.market,
      currency: resolved.currency,
      items: [],
      totals: calcTotals([], resolved.market),
      created_at: now,
      updated_at: now,
    };
    store.save(sessionId, cart);
  }
  return cart;
}

export function getCart(sessionId: string, market?: string): Cart {
  return getOrCreateCart(sessionId, market);
}

export interface AddItemInput {
  item_type: string;
  product_id: string;
  product_name: string;
  variant_label?: string | null;
  qty: number;
  once_off_price_cents: number;
  recurring_price_cents: number;
  tax_inclusive?: boolean;
  is_optional?: boolean;
  parent_item_id?: string | null;
}

export function addItem(sessionId: string, input: AddItemInput, market?: string): CartItem {
  const cart = getOrCreateCart(sessionId, market);

  const validTypes: ItemType[] = ['device', 'plan', 'bundle', 'accessory', 'sim', 'credit'];
  if (!validTypes.includes(input.item_type as ItemType)) {
    throw new Error('INVALID_ITEM_TYPE');
  }

  if (!Number.isInteger(input.qty) || input.qty <= 0) {
    throw new Error('INVALID_QTY');
  }

  if (!Number.isInteger(input.once_off_price_cents) || !Number.isInteger(input.recurring_price_cents)) {
    throw new Error('INVALID_PRICE_CENTS');
  }

  // Only credit items may carry a negative once_off price.
  if (input.item_type !== 'credit' && input.once_off_price_cents < 0) {
    throw new Error('INVALID_PRICE_CENTS');
  }

  if (input.recurring_price_cents < 0) {
    throw new Error('INVALID_PRICE_CENTS');
  }

  // Validate parent_item_id references an existing item in the same cart.
  if (input.parent_item_id != null) {
    const parentExists = cart.items.some((i) => i.id === input.parent_item_id);
    if (!parentExists) {
      throw new Error('INVALID_PARENT_ITEM_ID');
    }
  }

  const now = new Date().toISOString();
  const item: CartItem = {
    id: randomUUID(),
    cart_id: cart.id,
    item_type: input.item_type as ItemType,
    product_id: input.product_id,
    product_name: input.product_name,
    variant_label: input.variant_label ?? null,
    qty: input.qty,
    once_off_price_cents: input.once_off_price_cents,
    recurring_price_cents: input.recurring_price_cents,
    tax_inclusive: input.tax_inclusive ?? false,
    is_optional: input.is_optional ?? false,
    parent_item_id: input.parent_item_id ?? null,
    created_at: now,
    updated_at: now,
  };

  cart.items.push(item);
  cart.totals = calcTotals(cart.items, cart.market);
  cart.updated_at = now;
  return item;
}

export interface UpdateItemInput {
  qty?: number;
  variant_label?: string | null;
}

export function updateItem(
  sessionId: string,
  itemId: string,
  patch: UpdateItemInput,
): CartItem | null {
  // Read-only lookup — do not create an empty cart for an unknown session.
  const cart = store.findBySessionId(sessionId);
  if (!cart) return null;

  const item = cart.items.find((i) => i.id === itemId);
  if (!item) return null;

  if (patch.qty !== undefined) {
    if (!Number.isInteger(patch.qty) || patch.qty <= 0) {
      throw new Error('INVALID_QTY');
    }
    item.qty = patch.qty;
  }
  if ('variant_label' in patch) item.variant_label = patch.variant_label ?? null;

  const now = new Date().toISOString();
  item.updated_at = now;
  cart.totals = calcTotals(cart.items, cart.market);
  cart.updated_at = now;
  return item;
}

export type DeleteResult =
  | { ok: true }
  | { ok: false; errorCode: string; message: string };

function collectDependentIds(items: CartItem[], parentId: string): string[] {
  const directChildren = items.filter((i) => i.parent_item_id === parentId).map((i) => i.id);
  const all = [...directChildren];
  for (const childId of directChildren) {
    all.push(...collectDependentIds(items, childId));
  }
  return all;
}

export function deleteItem(
  sessionId: string,
  itemId: string,
  force: boolean,
): DeleteResult {
  // Read-only lookup — do not create an empty cart for an unknown session.
  const cart = store.findBySessionId(sessionId);
  if (!cart) {
    return { ok: false, errorCode: 'ITEM_NOT_FOUND', message: 'Item not found in cart.' };
  }

  const target = cart.items.find((i) => i.id === itemId);
  if (!target) {
    return { ok: false, errorCode: 'ITEM_NOT_FOUND', message: 'Item not found in cart.' };
  }

  const dependentIds = collectDependentIds(cart.items, itemId);

  if (!target.is_optional && !force) {
    return {
      ok: false,
      errorCode: 'ITEM_NOT_REMOVABLE',
      message: 'Non-optional items cannot be removed without the force flag.',
    };
  }

  if (dependentIds.length > 0 && !force) {
    return {
      ok: false,
      errorCode: 'ITEM_HAS_DEPENDENTS',
      message: 'Item has dependent items and cannot be removed without the force flag.',
    };
  }

  const removeIds = new Set([itemId, ...dependentIds]);
  cart.items = cart.items.filter((i) => !removeIds.has(i.id));
  cart.totals = calcTotals(cart.items, cart.market);
  cart.updated_at = new Date().toISOString();
  return { ok: true };
}
