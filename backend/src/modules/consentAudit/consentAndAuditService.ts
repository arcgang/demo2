import {
  insertConsentRecord,
  insertAuditEvent,
  getAuditEventsForOrder,
  type StoredConsentRecord,
  type StoredAuditEvent,
  type AuditEventType,
} from './consentAuditStore';

export type { AuditEventType };

export type ConsentPurpose = 'terms' | 'marketing';

export interface ConsentRecord {
  id: string;
  orderId: string;
  sessionId: string;
  purpose: ConsentPurpose;
  accepted: boolean;
  capturedAt: string;
  ipAddress?: string;
}

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  orderId: string;
  journeyRef?: string;
  actorRef?: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

function toConsentRecord(stored: StoredConsentRecord): ConsentRecord {
  return {
    id: stored.id,
    orderId: stored.orderId,
    sessionId: stored.sessionId,
    purpose: stored.purpose,
    accepted: stored.accepted,
    capturedAt: stored.capturedAt,
    ipAddress: stored.ipAddress,
  };
}

function toAuditEvent(stored: StoredAuditEvent): AuditEvent {
  return {
    id: stored.id,
    eventType: stored.eventType,
    orderId: stored.orderId,
    journeyRef: stored.journeyRef,
    actorRef: stored.actorRef,
    payload: stored.payload,
    occurredAt: stored.occurredAt,
  };
}

export async function recordConsent(params: {
  orderId: string;
  sessionId: string;
  purpose: ConsentPurpose;
  accepted: boolean;
  ipAddress?: string;
}): Promise<ConsentRecord> {
  const stored = insertConsentRecord({
    orderId: params.orderId,
    sessionId: params.sessionId,
    purpose: params.purpose,
    accepted: params.accepted,
    ipAddress: params.ipAddress,
  });
  return toConsentRecord(stored);
}

export async function emitAuditEvent(params: {
  type: AuditEventType;
  orderId: string;
  journeyRef?: string;
  actorRef?: string;
  payload: Record<string, unknown>;
}): Promise<AuditEvent> {
  const stored = insertAuditEvent({
    eventType: params.type,
    orderId: params.orderId,
    journeyRef: params.journeyRef,
    actorRef: params.actorRef,
    payload: params.payload,
  });
  return toAuditEvent(stored);
}

export async function getJourneyAuditTrail(orderRef: string): Promise<AuditEvent[]> {
  return getAuditEventsForOrder(orderRef).map(toAuditEvent);
}
