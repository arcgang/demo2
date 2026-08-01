import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for GET /api/orders/:ref/audit-trail
 *
 * Contract (task spec + LLD §4, §5):
 *   200 — authenticated request for a known order returns event list sorted
 *         chronologically, each entry including event_type, occurred_at, payload.
 *   404 — unknown orderRef returns 404 with errorCode.
 *   Response time <1 s for demo transactions (structural proxy: no artificial delay).
 *
 * Authentication: session or operator token (header X-Session-Token or
 * X-Operator-Token accepted; missing auth → 401).
 */

// ─── response shapes ─────────────────────────────────────────────────────────

interface AuditEventResponse {
  id: string;
  eventType: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  orderId?: string;
  journeyRef?: string;
  actorRef?: string;
}

interface AuditTrailResponse {
  orderId: string;
  events: AuditEventResponse[];
}

interface ErrorResponse {
  errorCode: string;
  message?: string;
}

// ─── permitted event types ────────────────────────────────────────────────────

const AUDIT_EVENT_TYPES = [
  'consent_capture',
  'payment_outcome',
  'verification_outcome',
  'order_created',
  'activation_status_change',
] as const;

// ─── helpers ─────────────────────────────────────────────────────────────────

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app') as { createApp: () => Application };
  return createApp();
}

function isIso8601(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return !Number.isNaN(new Date(value).getTime());
}

async function getAuditTrail(
  app: Application,
  orderRef: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: unknown; elapsed: number }> {
  const start = Date.now();
  const req = request(app).get(`/api/orders/${orderRef}/audit-trail`);
  for (const [key, value] of Object.entries(headers)) {
    req.set(key, value);
  }
  const res = await req;
  return { status: res.status, body: res.body, elapsed: Date.now() - start };
}

const AUTH_HEADER = { 'X-Session-Token': 'test-session-token' };

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  200 response shape for a known order
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/orders/:ref/audit-trail — AC-1 200 shape', () => {
  let app: Application;

  beforeAll(() => {
    app = getApp();
  });

  it('returns HTTP 200 for a known order with valid auth', async () => {
    // The feature must seed or recognise at least one order for demo; if none
    // exist, seeding should be done through the order creation endpoint.
    // Here we create an order first, then fetch its trail.
    const orderRes = await request(app)
      .post('/api/orders')
      .set(AUTH_HEADER)
      .send({
        cartId: 'cart-audit-001',
        paymentAttemptId: 'pay-audit-001',
        paymentStatus: 'CONFIRMED',
        lineItems: [{ name: 'iPhone 15', qty: 1, unitPrice: 18999 }],
        onceOffTotal: 18999,
        monthlyTotal: 0,
      });
    expect([200, 201]).toContain(orderRes.status);

    const ref: string = (orderRes.body as Record<string, unknown>).orderReference as string
      ?? (orderRes.body as Record<string, unknown>).orderId as string;
    expect(ref).toBeDefined();

    const { status } = await getAuditTrail(app, ref, AUTH_HEADER);
    expect(status).toBe(200);
  });

  it('response body is an object', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set(AUTH_HEADER)
      .send({
        cartId: 'cart-audit-002',
        paymentAttemptId: 'pay-audit-002',
        paymentStatus: 'CONFIRMED',
        lineItems: [{ name: 'SIM Card', qty: 1, unitPrice: 0 }],
        onceOffTotal: 0,
        monthlyTotal: 199,
      });
    const ref: string = (orderRes.body as Record<string, unknown>).orderReference as string
      ?? (orderRes.body as Record<string, unknown>).orderId as string;

    const { body } = await getAuditTrail(app, ref, AUTH_HEADER);
    expect(typeof body).toBe('object');
    expect(body).not.toBeNull();
  });

  it('response body includes an events array', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set(AUTH_HEADER)
      .send({
        cartId: 'cart-audit-003',
        paymentAttemptId: 'pay-audit-003',
        paymentStatus: 'CONFIRMED',
        lineItems: [{ name: 'Bundle', qty: 1, unitPrice: 299 }],
        onceOffTotal: 299,
        monthlyTotal: 0,
      });
    const ref: string = (orderRes.body as Record<string, unknown>).orderReference as string
      ?? (orderRes.body as Record<string, unknown>).orderId as string;

    const { body } = await getAuditTrail(app, ref, AUTH_HEADER);
    const trail = body as AuditTrailResponse;
    expect(Array.isArray(trail.events)).toBe(true);
  });

  it('each event in the array has event_type or eventType', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set(AUTH_HEADER)
      .send({
        cartId: 'cart-audit-004',
        paymentAttemptId: 'pay-audit-004',
        paymentStatus: 'CONFIRMED',
        lineItems: [{ name: 'Device', qty: 1, unitPrice: 9999 }],
        onceOffTotal: 9999,
        monthlyTotal: 0,
      });
    const ref: string = (orderRes.body as Record<string, unknown>).orderReference as string
      ?? (orderRes.body as Record<string, unknown>).orderId as string;

    const { body } = await getAuditTrail(app, ref, AUTH_HEADER);
    const trail = body as AuditTrailResponse;
    for (const event of trail.events) {
      const typeField = (event as unknown as Record<string, unknown>).event_type ?? event.eventType;
      expect(typeof typeField).toBe('string');
      expect((typeField as string).length).toBeGreaterThan(0);
    }
  });

  it('each event has occurred_at or occurredAt as an ISO-8601 timestamp', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set(AUTH_HEADER)
      .send({
        cartId: 'cart-audit-005',
        paymentAttemptId: 'pay-audit-005',
        paymentStatus: 'CONFIRMED',
        lineItems: [{ name: 'Plan', qty: 1, unitPrice: 399 }],
        onceOffTotal: 0,
        monthlyTotal: 399,
      });
    const ref: string = (orderRes.body as Record<string, unknown>).orderReference as string
      ?? (orderRes.body as Record<string, unknown>).orderId as string;

    const { body } = await getAuditTrail(app, ref, AUTH_HEADER);
    const trail = body as AuditTrailResponse;
    for (const event of trail.events) {
      const tsField = (event as unknown as Record<string, unknown>).occurred_at ?? event.occurredAt;
      expect(isIso8601(tsField)).toBe(true);
    }
  });

  it('each event has a payload field that is an object', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set(AUTH_HEADER)
      .send({
        cartId: 'cart-audit-006',
        paymentAttemptId: 'pay-audit-006',
        paymentStatus: 'CONFIRMED',
        lineItems: [{ name: 'Accessory', qty: 2, unitPrice: 199 }],
        onceOffTotal: 398,
        monthlyTotal: 0,
      });
    const ref: string = (orderRes.body as Record<string, unknown>).orderReference as string
      ?? (orderRes.body as Record<string, unknown>).orderId as string;

    const { body } = await getAuditTrail(app, ref, AUTH_HEADER);
    const trail = body as AuditTrailResponse;
    for (const event of trail.events) {
      expect(typeof event.payload).toBe('object');
      expect(event.payload).not.toBeNull();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  Chronological ordering of events
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/orders/:ref/audit-trail — AC-2 chronological order', () => {
  let app: Application;

  beforeAll(() => {
    app = getApp();
  });

  it('events are returned sorted by occurred_at/occurredAt ascending', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set(AUTH_HEADER)
      .send({
        cartId: 'cart-chrono-001',
        paymentAttemptId: 'pay-chrono-001',
        paymentStatus: 'CONFIRMED',
        lineItems: [{ name: 'Device', qty: 1, unitPrice: 18999 }],
        onceOffTotal: 18999,
        monthlyTotal: 0,
      });
    const ref: string = (orderRes.body as Record<string, unknown>).orderReference as string
      ?? (orderRes.body as Record<string, unknown>).orderId as string;

    const { body } = await getAuditTrail(app, ref, AUTH_HEADER);
    const trail = body as AuditTrailResponse;

    if (trail.events.length < 2) return; // nothing to sort-check

    for (let i = 1; i < trail.events.length; i++) {
      const prevRaw = (trail.events[i - 1] as unknown as Record<string, unknown>).occurred_at
        ?? trail.events[i - 1].occurredAt;
      const currRaw = (trail.events[i] as unknown as Record<string, unknown>).occurred_at
        ?? trail.events[i].occurredAt;
      const prev = new Date(prevRaw as string).getTime();
      const curr = new Date(currRaw as string).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  404 for unknown orderRef
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/orders/:ref/audit-trail — AC-3 not-found', () => {
  let app: Application;

  beforeAll(() => {
    app = getApp();
  });

  it('returns HTTP 404 for an unknown orderRef', async () => {
    const { status } = await getAuditTrail(app, 'ord-does-not-exist-xyz', AUTH_HEADER);
    expect(status).toBe(404);
  });

  it('404 response body includes an errorCode', async () => {
    const { body } = await getAuditTrail(app, 'ord-does-not-exist-xyz', AUTH_HEADER);
    const errorBody = body as ErrorResponse;
    expect(typeof errorBody.errorCode).toBe('string');
    expect(errorBody.errorCode.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  Authentication requirement
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/orders/:ref/audit-trail — AC-4 authentication', () => {
  let app: Application;

  beforeAll(() => {
    app = getApp();
  });

  it('returns 401 when no auth header is provided', async () => {
    const { status } = await getAuditTrail(app, 'ord-any-ref');
    // Must be 401 (unauthenticated) or 403 (forbidden) — never 200 or 404 first
    expect([401, 403]).toContain(status);
  });

  it('accepts X-Session-Token header as valid auth', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set(AUTH_HEADER)
      .send({
        cartId: 'cart-auth-001',
        paymentAttemptId: 'pay-auth-001',
        paymentStatus: 'CONFIRMED',
        lineItems: [{ name: 'SIM', qty: 1, unitPrice: 0 }],
        onceOffTotal: 0,
        monthlyTotal: 99,
      });
    const ref: string = (orderRes.body as Record<string, unknown>).orderReference as string
      ?? (orderRes.body as Record<string, unknown>).orderId as string;

    const { status } = await getAuditTrail(app, ref, { 'X-Session-Token': 'valid-session' });
    expect(status).toBe(200);
  });

  it('accepts X-Operator-Token header as valid auth', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set({ 'X-Operator-Token': 'operator-token' })
      .send({
        cartId: 'cart-auth-002',
        paymentAttemptId: 'pay-auth-002',
        paymentStatus: 'CONFIRMED',
        lineItems: [{ name: 'eSIM', qty: 1, unitPrice: 0 }],
        onceOffTotal: 0,
        monthlyTotal: 149,
      });
    const ref: string = (orderRes.body as Record<string, unknown>).orderReference as string
      ?? (orderRes.body as Record<string, unknown>).orderId as string;

    const { status } = await getAuditTrail(app, ref, { 'X-Operator-Token': 'operator-token' });
    expect(status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  Response time <1 s for demo transactions
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/orders/:ref/audit-trail — AC-5 response time', () => {
  let app: Application;

  beforeAll(() => {
    app = getApp();
  });

  it('responds in under 1000 ms for a demo transaction', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set(AUTH_HEADER)
      .send({
        cartId: 'cart-perf-001',
        paymentAttemptId: 'pay-perf-001',
        paymentStatus: 'CONFIRMED',
        lineItems: [{ name: 'Device', qty: 1, unitPrice: 18999 }],
        onceOffTotal: 18999,
        monthlyTotal: 0,
      });
    const ref: string = (orderRes.body as Record<string, unknown>).orderReference as string
      ?? (orderRes.body as Record<string, unknown>).orderId as string;

    const { elapsed } = await getAuditTrail(app, ref, AUTH_HEADER);
    expect(elapsed).toBeLessThan(1000);
  });
});
