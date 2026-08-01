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

export function clearTimelineStore(): void {
  store.clear();
}

export function seedTimelineEvents(orderId: string, events: TimelineEvent[]): void {
  store.set(orderId, [...events]);
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
}
