import {
  recordConsent,
  emitAuditEvent,
  getJourneyAuditTrail,
  type ConsentRecord,
  type AuditEvent,
  type AuditEventType,
} from '../../modules/consentAudit/consentAndAuditService';
import { clearAll } from '../../modules/consentAudit/consentAuditStore';

/**
 * Acceptance tests for ConsentAndAuditService
 *
 * Acceptance criteria (task spec):
 *   AC-1  recordConsent — happy-path returns a ConsentRecord with all required fields.
 *   AC-2  recordConsent — purpose and captured_at are stored as separate typed fields
 *         (not merged into a single free-text string).
 *   AC-3  emitAuditEvent — happy-path returns an AuditEvent with all required fields.
 *   AC-4  getJourneyAuditTrail — returns events for a known order sorted by
 *         occurred_at ascending.
 *   AC-5  getJourneyAuditTrail — returns an empty array (not-found) for an unknown orderRef.
 */

// ─── type guards ─────────────────────────────────────────────────────────────

const PURPOSE_VALUES = ['terms', 'marketing'] as const;
const AUDIT_EVENT_TYPE_VALUES = [
  'consent_capture',
  'payment_outcome',
  'verification_outcome',
  'order_created',
  'activation_status_change',
] as const;

function isIso8601(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return !Number.isNaN(new Date(value).getTime());
}

// ─── shared fixtures ─────────────────────────────────────────────────────────

const CONSENT_PARAMS = {
  orderId: 'ord-test-001',
  sessionId: 'sess-test-001',
  purpose: 'terms' as const,
  accepted: true,
  ipAddress: '192.168.1.1',
};

const AUDIT_PARAMS = {
  type: 'order_created' as AuditEventType,
  orderId: 'ord-test-001',
  journeyRef: 'journey-001',
  actorRef: 'system',
  payload: { step: 'checkout', amount: 18999.0 },
};

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  recordConsent — happy-path shape
// ─────────────────────────────────────────────────────────────────────────────

describe('ConsentAndAuditService.recordConsent — AC-1 happy-path shape', () => {
  beforeEach(() => { clearAll(); });

  it('resolves without throwing', async () => {
    await expect(recordConsent(CONSENT_PARAMS)).resolves.not.toThrow();
  });

  it('returns an object (ConsentRecord)', async () => {
    const result = await recordConsent(CONSENT_PARAMS);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('returned record has a non-empty string id', async () => {
    const result: ConsentRecord = await recordConsent(CONSENT_PARAMS);
    expect(typeof result.id).toBe('string');
    expect(result.id.length).toBeGreaterThan(0);
  });

  it('returned record has orderId matching input', async () => {
    const result: ConsentRecord = await recordConsent(CONSENT_PARAMS);
    expect(result.orderId).toBe(CONSENT_PARAMS.orderId);
  });

  it('returned record has sessionId matching input', async () => {
    const result: ConsentRecord = await recordConsent(CONSENT_PARAMS);
    expect(result.sessionId).toBe(CONSENT_PARAMS.sessionId);
  });

  it('returned record has purpose matching input', async () => {
    const result: ConsentRecord = await recordConsent(CONSENT_PARAMS);
    expect(result.purpose).toBe(CONSENT_PARAMS.purpose);
  });

  it('returned record has accepted matching input', async () => {
    const result: ConsentRecord = await recordConsent(CONSENT_PARAMS);
    expect(result.accepted).toBe(CONSENT_PARAMS.accepted);
  });

  it('returned record has capturedAt as a valid ISO-8601 timestamp', async () => {
    const result: ConsentRecord = await recordConsent(CONSENT_PARAMS);
    expect(isIso8601(result.capturedAt)).toBe(true);
  });

  it('returned record includes ipAddress when provided', async () => {
    const result: ConsentRecord = await recordConsent(CONSENT_PARAMS);
    expect(result.ipAddress).toBe(CONSENT_PARAMS.ipAddress);
  });

  it('returned record accepts absent ipAddress without error', async () => {
    const { ipAddress: _omit, ...paramsNoIp } = CONSENT_PARAMS;
    const result: ConsentRecord = await recordConsent(paramsNoIp);
    expect(result.orderId).toBe(paramsNoIp.orderId);
  });

  it('stores purpose "marketing" correctly', async () => {
    const result: ConsentRecord = await recordConsent({
      ...CONSENT_PARAMS,
      purpose: 'marketing',
      accepted: false,
    });
    expect(result.purpose).toBe('marketing');
    expect(result.accepted).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  recordConsent — purpose and capturedAt are separate typed fields
// ─────────────────────────────────────────────────────────────────────────────

describe('ConsentAndAuditService.recordConsent — AC-2 separate typed fields', () => {
  beforeEach(() => { clearAll(); });

  it('purpose is one of the enum values, not an arbitrary free-text string', async () => {
    const result: ConsentRecord = await recordConsent(CONSENT_PARAMS);
    expect(PURPOSE_VALUES).toContain(result.purpose);
  });

  it('capturedAt is a dedicated field (not merged with purpose into a single string)', async () => {
    const result: ConsentRecord = await recordConsent(CONSENT_PARAMS);
    expect(Object.prototype.hasOwnProperty.call(result, 'purpose')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(result, 'capturedAt')).toBe(true);
    // Both exist independently — purpose is a short enum token, not a sentence
    expect(result.purpose.length).toBeLessThan(32);
    expect(isIso8601(result.capturedAt)).toBe(true);
  });

  it('purpose field on the record is a string enum token, not a composite description', async () => {
    const result: ConsentRecord = await recordConsent(CONSENT_PARAMS);
    // Must NOT be e.g. "terms accepted at 2026-08-01T..."
    expect(result.purpose).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('capturedAt is a parseable date independent of the purpose value', async () => {
    const [r1, r2] = await Promise.all([
      recordConsent({ ...CONSENT_PARAMS, purpose: 'terms' }),
      recordConsent({ ...CONSENT_PARAMS, purpose: 'marketing' }),
    ]);
    expect(isIso8601(r1.capturedAt)).toBe(true);
    expect(isIso8601(r2.capturedAt)).toBe(true);
    expect(r1.purpose).toBe('terms');
    expect(r2.purpose).toBe('marketing');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  emitAuditEvent — happy-path shape
// ─────────────────────────────────────────────────────────────────────────────

describe('ConsentAndAuditService.emitAuditEvent — AC-3 happy-path shape', () => {
  beforeEach(() => { clearAll(); });

  it('resolves without throwing', async () => {
    await expect(emitAuditEvent(AUDIT_PARAMS)).resolves.not.toThrow();
  });

  it('returns an object (AuditEvent)', async () => {
    const result = await emitAuditEvent(AUDIT_PARAMS);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('returned event has a non-empty string id', async () => {
    const result: AuditEvent = await emitAuditEvent(AUDIT_PARAMS);
    expect(typeof result.id).toBe('string');
    expect(result.id.length).toBeGreaterThan(0);
  });

  it('returned event has eventType matching input', async () => {
    const result: AuditEvent = await emitAuditEvent(AUDIT_PARAMS);
    expect(result.eventType).toBe(AUDIT_PARAMS.type);
  });

  it('eventType is one of the permitted enum values', async () => {
    const result: AuditEvent = await emitAuditEvent(AUDIT_PARAMS);
    expect(AUDIT_EVENT_TYPE_VALUES).toContain(result.eventType);
  });

  it('returned event has orderId matching input', async () => {
    const result: AuditEvent = await emitAuditEvent(AUDIT_PARAMS);
    expect(result.orderId).toBe(AUDIT_PARAMS.orderId);
  });

  it('returned event has occurredAt as a valid ISO-8601 timestamp', async () => {
    const result: AuditEvent = await emitAuditEvent(AUDIT_PARAMS);
    expect(isIso8601(result.occurredAt)).toBe(true);
  });

  it('returned event has payload as an object', async () => {
    const result: AuditEvent = await emitAuditEvent(AUDIT_PARAMS);
    expect(typeof result.payload).toBe('object');
    expect(result.payload).not.toBeNull();
  });

  it('payload contains the keys provided in input', async () => {
    const result: AuditEvent = await emitAuditEvent(AUDIT_PARAMS);
    expect(result.payload).toMatchObject(AUDIT_PARAMS.payload);
  });

  it('returned event has journeyRef when provided', async () => {
    const result: AuditEvent = await emitAuditEvent(AUDIT_PARAMS);
    expect(result.journeyRef).toBe(AUDIT_PARAMS.journeyRef);
  });

  it('returned event has actorRef when provided', async () => {
    const result: AuditEvent = await emitAuditEvent(AUDIT_PARAMS);
    expect(result.actorRef).toBe(AUDIT_PARAMS.actorRef);
  });

  it('two successive emitAuditEvent calls produce events with distinct ids', async () => {
    const [r1, r2] = await Promise.all([
      emitAuditEvent(AUDIT_PARAMS),
      emitAuditEvent({ ...AUDIT_PARAMS, type: 'payment_outcome' }),
    ]);
    expect(r1.id).not.toBe(r2.id);
  });

  it('emits all five permitted event types without error', async () => {
    for (const type of AUDIT_EVENT_TYPE_VALUES) {
      const result: AuditEvent = await emitAuditEvent({ ...AUDIT_PARAMS, type });
      expect(result.eventType).toBe(type);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  getJourneyAuditTrail — returns events sorted ascending by occurred_at
// ─────────────────────────────────────────────────────────────────────────────

describe('ConsentAndAuditService.getJourneyAuditTrail — AC-4 happy path', () => {
  const ORDER_ID = 'ord-trail-001';

  beforeEach(() => { clearAll(); });

  it('resolves without throwing for a known orderRef', async () => {
    await emitAuditEvent({ ...AUDIT_PARAMS, orderId: ORDER_ID });
    await expect(getJourneyAuditTrail(ORDER_ID)).resolves.not.toThrow();
  });

  it('returns an array', async () => {
    await emitAuditEvent({ ...AUDIT_PARAMS, orderId: ORDER_ID });
    const result = await getJourneyAuditTrail(ORDER_ID);
    expect(Array.isArray(result)).toBe(true);
  });

  it('includes the event emitted for the given orderRef', async () => {
    const emitted: AuditEvent = await emitAuditEvent({ ...AUDIT_PARAMS, orderId: ORDER_ID });
    const trail = await getJourneyAuditTrail(ORDER_ID);
    const found = trail.find((e) => e.id === emitted.id);
    expect(found).toBeDefined();
  });

  it('does not include events for a different order', async () => {
    await emitAuditEvent({ ...AUDIT_PARAMS, orderId: ORDER_ID });
    await emitAuditEvent({ ...AUDIT_PARAMS, orderId: 'ord-other' });
    const trail = await getJourneyAuditTrail(ORDER_ID);
    const wrongOrder = trail.find((e) => e.orderId !== ORDER_ID);
    expect(wrongOrder).toBeUndefined();
  });

  it('returns all events for the order when multiple events were emitted', async () => {
    await emitAuditEvent({ ...AUDIT_PARAMS, orderId: ORDER_ID, type: 'order_created' });
    await emitAuditEvent({ ...AUDIT_PARAMS, orderId: ORDER_ID, type: 'payment_outcome' });
    await emitAuditEvent({ ...AUDIT_PARAMS, orderId: ORDER_ID, type: 'verification_outcome' });
    const trail = await getJourneyAuditTrail(ORDER_ID);
    expect(trail.length).toBeGreaterThanOrEqual(3);
  });

  it('events are sorted in ascending occurredAt order', async () => {
    await emitAuditEvent({ ...AUDIT_PARAMS, orderId: ORDER_ID, type: 'order_created' });
    await emitAuditEvent({ ...AUDIT_PARAMS, orderId: ORDER_ID, type: 'payment_outcome' });
    await emitAuditEvent({ ...AUDIT_PARAMS, orderId: ORDER_ID, type: 'activation_status_change' });
    const trail = await getJourneyAuditTrail(ORDER_ID);

    for (let i = 1; i < trail.length; i++) {
      const prev = new Date(trail[i - 1].occurredAt).getTime();
      const curr = new Date(trail[i].occurredAt).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it('each event in the trail has id, eventType, orderId, occurredAt, and payload', async () => {
    await emitAuditEvent({ ...AUDIT_PARAMS, orderId: ORDER_ID });
    const trail = await getJourneyAuditTrail(ORDER_ID);
    for (const event of trail) {
      expect(typeof event.id).toBe('string');
      expect(typeof event.eventType).toBe('string');
      expect(event.orderId).toBe(ORDER_ID);
      expect(isIso8601(event.occurredAt)).toBe(true);
      expect(typeof event.payload).toBe('object');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  getJourneyAuditTrail — not-found returns empty array
// ─────────────────────────────────────────────────────────────────────────────

describe('ConsentAndAuditService.getJourneyAuditTrail — AC-5 not-found', () => {
  beforeEach(() => { clearAll(); });

  it('returns an array (not null or undefined) for an unknown orderRef', async () => {
    const result = await getJourneyAuditTrail('ord-does-not-exist');
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns an empty array for an unknown orderRef', async () => {
    const result = await getJourneyAuditTrail('ord-does-not-exist');
    expect(result).toHaveLength(0);
  });

  it('does not throw for an unknown orderRef', async () => {
    await expect(getJourneyAuditTrail('ord-does-not-exist')).resolves.not.toThrow();
  });

  it('empty array response is distinct from a known-order trail', async () => {
    await emitAuditEvent({ ...AUDIT_PARAMS, orderId: 'ord-known' });
    const knownTrail = await getJourneyAuditTrail('ord-known');
    const unknownTrail = await getJourneyAuditTrail('ord-does-not-exist');
    expect(knownTrail.length).toBeGreaterThan(0);
    expect(unknownTrail.length).toBe(0);
  });
});
