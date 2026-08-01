import { randomBytes } from 'crypto';

export interface PersistedTimelineEvent {
  eventType: string;
  label: string;
  description: string;
  timestamp: string | null;
  isCurrent: boolean;
}

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
  timelineEvents: PersistedTimelineEvent[];
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

export function persistTimelineEventsForOrder(orderId: string, events: PersistedTimelineEvent[]): void {
  const order = ordersStore.find((o) => o.orderId === orderId);
  if (order) {
    order.timelineEvents = [...events];
  }
}

export function getPersistedTimelineEvents(orderId: string): PersistedTimelineEvent[] {
  const order = ordersStore.find((o) => o.orderId === orderId || o.orderReference === orderId);
  return order?.timelineEvents ?? [];
}

export function hasPersistedTimelineEvents(orderId: string): boolean {
  const events = getPersistedTimelineEvents(orderId);
  return events.length > 0;
}

export function persistOrderAuditEvent(event: OrderAuditEvent): void {
  auditEventsStore.push(event);
}

export function getAllOrders(): StoredOrder[] {
  return [...ordersStore];
}

export function getOrderByReference(ref: string): StoredOrder | undefined {
  return ordersStore.find((o) => o.orderReference === ref || o.orderId === ref);
}

export function getOrderAuditEvents(): OrderAuditEvent[] {
  return [...auditEventsStore];
}

export function updateOrderActivationState(orderId: string, state: string): void {
  const order = ordersStore.find((o) => o.orderId === orderId);
  if (order) order.activationState = state;
}

export function updateOrderVerificationStatus(orderId: string, status: string): void {
  const order = ordersStore.find((o) => o.orderId === orderId);
  if (order) order.verificationStatus = status;
}
