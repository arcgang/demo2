import { randomBytes } from 'crypto';

export interface LineItem {
  name: string;
  qty: number;
  unitPrice: number;
}

export interface NextStep {
  step: string;
  status: string;
  estimatedMinutes: number;
}

export interface StoredOrder {
  orderReference: string;
  orderDate: string;
  lineItems: LineItem[];
  onceOffTotal: number;
  monthlyTotal: number;
  paymentStatus: string;
  nextSteps: NextStep[];
}

const orders = new Map<string, StoredOrder>();
const usedRefs = new Set<string>();

export function generateOrderReference(): string {
  let ref: string;
  do {
    const hex = randomBytes(3).toString('hex').toUpperCase();
    ref = `ORD-${hex}`;
  } while (usedRefs.has(ref));
  usedRefs.add(ref);
  return ref;
}

export function storeOrder(order: StoredOrder): void {
  orders.set(order.orderReference, order);
}

export function getOrderByRef(ref: string): StoredOrder | undefined {
  return orders.get(ref);
}
