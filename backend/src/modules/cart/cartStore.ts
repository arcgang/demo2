import { randomUUID } from 'crypto';

export interface CartItem {
  cartItemId: string;
  lineType: string;
  productId: string;
  displayName: string;
  quantity: number;
  onceOffAmount: number;
  recurringAmount: number;
}

export interface CartTotals {
  onceOffSubtotal: number;
  recurringSubtotal: number;
  taxAmount: number;
  creditAmount: number;
  payableNow: number;
}

export interface Cart {
  cartId: string;
  marketCode: string;
  status: string;
  currencyCode: string;
  customerId?: string;
  items: CartItem[];
  totals: CartTotals;
  createdAt: string;
  updatedAt: string;
}

const store = new Map<string, Cart>();

export function createCart(marketCode: string, currencyCode: string, customerId?: string): Cart {
  const now = new Date().toISOString();
  const cart: Cart = {
    cartId: randomUUID(),
    marketCode,
    status: 'ACTIVE',
    currencyCode,
    customerId,
    items: [],
    totals: {
      onceOffSubtotal: 0,
      recurringSubtotal: 0,
      taxAmount: 0,
      creditAmount: 0,
      payableNow: 0,
    },
    createdAt: now,
    updatedAt: now,
  };
  store.set(cart.cartId, cart);
  return cart;
}

export function getCart(cartId: string): Cart | undefined {
  return store.get(cartId);
}

export function replaceCartItems(cartId: string, items: CartItem[], vatRate: number): Cart | undefined {
  const cart = store.get(cartId);
  if (!cart) return undefined;

  cart.items = items;

  const onceOffSubtotal = items.reduce((sum, i) => sum + i.onceOffAmount * i.quantity, 0);
  const recurringSubtotal = items.reduce((sum, i) => sum + i.recurringAmount * i.quantity, 0);
  const taxableBase = onceOffSubtotal > 0 ? onceOffSubtotal : recurringSubtotal;
  const taxAmount = parseFloat((taxableBase * vatRate).toFixed(2));

  cart.totals = {
    onceOffSubtotal,
    recurringSubtotal,
    taxAmount,
    creditAmount: 0,
    payableNow: parseFloat((onceOffSubtotal + taxAmount).toFixed(2)),
  };

  cart.updatedAt = new Date().toISOString();
  return cart;
}

export function clearAll(): void {
  store.clear();
}
