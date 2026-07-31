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
  market: string;
  currency: string;
  items: CartItem[];
  totals: CartTotals;
}

const VAT_RATE = 0.15;

function calcTotals(items: CartItem[]): CartTotals {
  let once_off_subtotal = 0;
  let recurring_subtotal = 0;
  let credits = 0;

  for (const item of items) {
    if (item.item_type === 'credit') {
      credits += item.once_off_price_cents * item.qty;
    } else {
      once_off_subtotal += item.once_off_price_cents * item.qty;
      recurring_subtotal += item.recurring_price_cents * item.qty;
    }
  }

  const tax_amount = Math.round(once_off_subtotal * VAT_RATE);
  const total_once_off = once_off_subtotal + tax_amount + credits;
  const total_monthly = recurring_subtotal;

  return { once_off_subtotal, recurring_subtotal, tax_amount, credits, total_once_off, total_monthly };
}

// Per-session cart store keyed by session id
const carts = new Map<string, Cart>();

function getOrCreateCart(sessionId: string): Cart {
  let cart = carts.get(sessionId);
  if (!cart) {
    cart = {
      id: randomUUID(),
      market: 'ZA',
      currency: 'ZAR',
      items: [],
      totals: calcTotals([]),
    };
    carts.set(sessionId, cart);
  }
  return cart;
}

export function getCart(sessionId: string): Cart {
  return getOrCreateCart(sessionId);
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

export function addItem(sessionId: string, input: AddItemInput): CartItem {
  const cart = getOrCreateCart(sessionId);

  const validTypes: ItemType[] = ['device', 'plan', 'bundle', 'accessory', 'sim', 'credit'];
  if (!validTypes.includes(input.item_type as ItemType)) {
    throw new Error('INVALID_ITEM_TYPE');
  }

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
  };

  cart.items.push(item);
  cart.totals = calcTotals(cart.items);
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
  const cart = getOrCreateCart(sessionId);
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) return null;

  if (patch.qty !== undefined) item.qty = patch.qty;
  if ('variant_label' in patch) item.variant_label = patch.variant_label ?? null;

  cart.totals = calcTotals(cart.items);
  return item;
}

export type DeleteResult =
  | { ok: true }
  | { ok: false; errorCode: string; message: string };

export function deleteItem(
  sessionId: string,
  itemId: string,
  force: boolean,
): DeleteResult {
  const cart = getOrCreateCart(sessionId);
  const idx = cart.items.findIndex((i) => i.id === itemId);
  if (idx === -1) {
    return { ok: false, errorCode: 'ITEM_NOT_FOUND', message: 'Item not found in cart.' };
  }

  const item = cart.items[idx];
  const hasDependents = cart.items.some((i) => i.parent_item_id === itemId);

  if (!item.is_optional && !force) {
    return {
      ok: false,
      errorCode: 'ITEM_NOT_REMOVABLE',
      message: 'Non-optional items cannot be removed without the force flag.',
    };
  }

  if (hasDependents && !force) {
    return {
      ok: false,
      errorCode: 'ITEM_HAS_DEPENDENTS',
      message: 'Item has dependent items and cannot be removed without the force flag.',
    };
  }

  cart.items.splice(idx, 1);
  cart.totals = calcTotals(cart.items);
  return { ok: true };
}
