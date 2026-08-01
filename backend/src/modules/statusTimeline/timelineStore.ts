export type StatusEventType =
  | 'order_placed'
  | 'payment_confirmed'
  | 'payment_pending'
  | 'payment_failed'
  | 'verification_complete'
  | 'verification_pending'
  | 'verification_failed'
  | 'esim_issued'
  | 'fulfillment_in_progress'
  | 'activation_complete'
  | 'activation_pending'
  | 'activation_failed';

export interface TimelineEvent {
  eventType: StatusEventType;
  label: string;
  description: string;
  timestamp: string | null;
  isCurrent: boolean;
}

const store = new Map<string, TimelineEvent[]>();

// Lazy import to avoid circular dependency at module load time.
function persistToDb(orderId: string, events: TimelineEvent[]): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { persistTimelineEventsForOrder } = require('../order/orderStore') as {
      persistTimelineEventsForOrder: (id: string, events: TimelineEvent[]) => void;
    };
    persistTimelineEventsForOrder(orderId, events);
  } catch {
    // order may not exist in store yet (e.g. test seeds) — tolerated
  }
}

export function clearTimelineStore(): void {
  store.clear();
}

export function seedTimelineEvents(orderId: string, events: TimelineEvent[]): void {
  store.set(orderId, [...events]);
  persistToDb(orderId, events);
}

export function getTimelineEvents(orderId: string): TimelineEvent[] {
  return store.get(orderId) ?? [];
}

export function hasTimelineEvents(orderId: string): boolean {
  const events = store.get(orderId);
  return events !== undefined && events.length > 0;
}

export function appendTimelineEvent(orderId: string, event: TimelineEvent): void {
  const existing = store.get(orderId) ?? [];
  const updated = existing.map((e) => ({ ...e, isCurrent: false }));
  updated.push(event);
  store.set(orderId, updated);
  persistToDb(orderId, updated);
}
