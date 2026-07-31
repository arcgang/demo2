import { randomBytes } from 'crypto';

export interface StoredOrder {
  orderId: string;
  orderReference: string;
  cartId: string;
  paymentAttemptId: string;
  paymentStatus: string;
  verificationCaseId?: string;
  verificationStatus?: string;
  customerId?: string;
  lineItems: Array<{ name: string; qty: number; unitPrice: number }>;
  onceOffTotal: number;
  monthlyTotal: number;
  activationState: string;
  createdAt: string;
}

export interface OrderAuditEvent {
  auditEventId: string;
  orderId: string;
  eventType: string;
  eventCategory: string;
  actorType: string;
  occurredAt: string;
  payloadJson: Record<string, unknown>;
}

const ordersStore: StoredOrder[] = [];
const auditEventsStore: OrderAuditEvent[] = [];
const usedRefs = new Set<string>();

export function clearAll(): void {
  ordersStore.length = 0;
  auditEventsStore.length = 0;
  usedRefs.clear();
}

export function generateOrderReference(): string {
  let ref: string;
  do {
    const hex = randomBytes(3).toString('hex').toUpperCase();
    ref = `ORD-${hex}`;
  } while (usedRefs.has(ref));
  usedRefs.add(ref);
  return ref;
}

export function persistOrder(order: StoredOrder): void {
  ordersStore.push(order);
}

export function persistOrderAuditEvent(event: OrderAuditEvent): void {
  auditEventsStore.push(event);
}

export function getAllOrders(): StoredOrder[] {
  return [...ordersStore];
}

export function getOrderAuditEvents(): OrderAuditEvent[] {
  return [...auditEventsStore];
}
