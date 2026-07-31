import { randomUUID } from 'crypto';

export interface StoredConsentRecord {
  id: string;
  orderId: string;
  sessionId: string;
  purpose: 'terms' | 'marketing';
  accepted: boolean;
  capturedAt: string;
  ipAddress?: string;
}

export interface StoredAuditEvent {
  id: string;
  eventType: string;
  orderId: string;
  journeyRef?: string;
  actorRef?: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

const consentRecords: StoredConsentRecord[] = [];
const auditEvents: StoredAuditEvent[] = [];

export function clearAll(): void {
  consentRecords.length = 0;
  auditEvents.length = 0;
}

export function insertConsentRecord(params: Omit<StoredConsentRecord, 'id' | 'capturedAt'>): StoredConsentRecord {
  const record: StoredConsentRecord = {
    id: randomUUID(),
    capturedAt: new Date().toISOString(),
    ...params,
  };
  consentRecords.push(record);
  return record;
}

export function insertAuditEvent(params: Omit<StoredAuditEvent, 'id' | 'occurredAt'>): StoredAuditEvent {
  const event: StoredAuditEvent = {
    id: randomUUID(),
    occurredAt: new Date().toISOString(),
    ...params,
  };
  auditEvents.push(event);
  return event;
}

export function getAuditEventsForOrder(orderId: string): StoredAuditEvent[] {
  return auditEvents
    .filter((e) => e.orderId === orderId)
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
}
