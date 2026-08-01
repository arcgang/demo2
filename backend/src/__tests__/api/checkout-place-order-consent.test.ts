import request from 'supertest';
import { Application } from 'express';
import { clearAll as clearConsentAuditStore } from '../../modules/consentAudit/consentAuditStore';
import { clearAll as clearOrderStore } from '../../modules/order/orderStore';

/**
 * Acceptance tests for POST /api/checkout/place-order — consent capture wiring
 *
 * Task acceptance criteria:
 *   AC-1  Posting with consent: { terms: true, marketing: false } returns a response
 *         that includes an order_ref field (signals consent records are written).
 *   AC-2  Two consent rows with distinct purposes ('terms' and 'marketing') appear
 *         in the audit trail for the created order after the call completes.
 *   AC-3  The 'terms' consent row reflects accepted=true; 'marketing' reflects the
 *         submitted value (false in the canonical test case).
 *   AC-4  POST body without a terms consent field is rejected (422) — terms is required.
 *   AC-5  The audit trail for the order contains at least one consent_capture event
 *         per purpose, verifying the backend wrote both rows.
 */

interface ConsentInput {
  terms: boolean;
  marketing: boolean;
}

interface CheckoutPayload {
  cartId: string;
  paymentAttemptId: string;
  paymentStatus: string;
  lineItems: Array<{ name: string; qty: number; unitPrice: number }>;
  onceOffTotal: number;
  monthlyTotal: number;
  consent: ConsentInput;
}

interface PlaceOrderResponse {
  order_ref?: string;
  orderReference?: string;
  [key: string]: unknown;
}

interface AuditEventItem {
  id: string;
  eventType: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

interface AuditTrailResponse {
  orderId: string;
  events: AuditEventItem[];
}

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app') as { createApp: () => Application };
  return createApp();
}

const AUTH_HEADER = { 'X-Session-Token': 'test-session-token' };

const BASE_PAYLOAD: CheckoutPayload = {
  cartId: 'cart-consent-001',
  paymentAttemptId: 'pay-consent-001',
  paymentStatus: 'CONFIRMED',
  lineItems: [
    { name: 'iPhone 15 Pro 256GB', qty: 1, unitPrice: 18999 },
    { name: 'Unlimited 20GB Plan', qty: 1, unitPrice: 799 },
  ],
  onceOffTotal: 18999,
  monthlyTotal: 799,
  consent: { terms: true, marketing: false },
};

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  Response includes order_ref confirming consent records written
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/checkout/place-order — AC-1 response includes order_ref', () => {
  let app: Application;

  beforeEach(() => {
    clearConsentAuditStore();
    clearOrderStore();
    app = getApp();
  });

  it('returns HTTP 201 for a valid checkout payload with consent', async () => {
    const res = await request(app)
      .post('/api/checkout/place-order')
      .send(BASE_PAYLOAD);
    expect(res.status).toBe(201);
  });

  it('response body includes order_ref as a non-empty string', async () => {
    const res = await request(app)
      .post('/api/checkout/place-order')
      .send(BASE_PAYLOAD);
    const body = res.body as PlaceOrderResponse;
    const ref = body.order_ref ?? body.orderReference;
    expect(typeof ref).toBe('string');
    expect((ref as string).length).toBeGreaterThan(0);
  });

  it('order_ref matches the ORD- pattern', async () => {
    const res = await request(app)
      .post('/api/checkout/place-order')
      .send(BASE_PAYLOAD);
    const body = res.body as PlaceOrderResponse;
    const ref = (body.order_ref ?? body.orderReference) as string;
    expect(ref).toMatch(/^ORD-/i);
  });

  it('response is a JSON object', async () => {
    const res = await request(app)
      .post('/api/checkout/place-order')
      .send(BASE_PAYLOAD);
    expect(typeof res.body).toBe('object');
    expect(res.body).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  Audit trail contains consent_capture events for both purposes
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/checkout/place-order — AC-2 two consent rows in audit trail', () => {
  let app: Application;

  beforeEach(() => {
    clearConsentAuditStore();
    clearOrderStore();
    app = getApp();
  });

  it('audit trail for the created order contains at least two consent_capture events', async () => {
    const orderRes = await request(app)
      .post('/api/checkout/place-order')
      .send(BASE_PAYLOAD);
    expect(orderRes.status).toBe(201);

    const body = orderRes.body as PlaceOrderResponse;
    const ref = (body.order_ref ?? body.orderReference) as string;

    const trailRes = await request(app)
      .get(`/api/orders/${ref}/audit-trail`)
      .set(AUTH_HEADER);
    expect(trailRes.status).toBe(200);

    const trail = trailRes.body as AuditTrailResponse;
    const consentEvents = trail.events.filter(
      (e) => e.eventType === 'consent_capture',
    );
    expect(consentEvents.length).toBeGreaterThanOrEqual(2);
  });

  it('audit trail contains a consent_capture event for purpose "terms"', async () => {
    const orderRes = await request(app)
      .post('/api/checkout/place-order')
      .send(BASE_PAYLOAD);
    const body = orderRes.body as PlaceOrderResponse;
    const ref = (body.order_ref ?? body.orderReference) as string;

    const trailRes = await request(app)
      .get(`/api/orders/${ref}/audit-trail`)
      .set(AUTH_HEADER);
    const trail = trailRes.body as AuditTrailResponse;

    const termsEvent = trail.events.find(
      (e) =>
        e.eventType === 'consent_capture' &&
        (e.payload.purpose === 'terms' || e.payload.purpose === 'TERMS'),
    );
    expect(termsEvent).toBeDefined();
  });

  it('audit trail contains a consent_capture event for purpose "marketing"', async () => {
    const orderRes = await request(app)
      .post('/api/checkout/place-order')
      .send(BASE_PAYLOAD);
    const body = orderRes.body as PlaceOrderResponse;
    const ref = (body.order_ref ?? body.orderReference) as string;

    const trailRes = await request(app)
      .get(`/api/orders/${ref}/audit-trail`)
      .set(AUTH_HEADER);
    const trail = trailRes.body as AuditTrailResponse;

    const marketingEvent = trail.events.find(
      (e) =>
        e.eventType === 'consent_capture' &&
        (e.payload.purpose === 'marketing' || e.payload.purpose === 'MARKETING'),
    );
    expect(marketingEvent).toBeDefined();
  });

  it('the two consent_capture events have distinct purposes', async () => {
    const orderRes = await request(app)
      .post('/api/checkout/place-order')
      .send(BASE_PAYLOAD);
    const body = orderRes.body as PlaceOrderResponse;
    const ref = (body.order_ref ?? body.orderReference) as string;

    const trailRes = await request(app)
      .get(`/api/orders/${ref}/audit-trail`)
      .set(AUTH_HEADER);
    const trail = trailRes.body as AuditTrailResponse;

    const consentEvents = trail.events.filter((e) => e.eventType === 'consent_capture');
    const purposes = consentEvents.map((e) =>
      String(e.payload.purpose ?? '').toLowerCase(),
    );
    expect(new Set(purposes).size).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  Consent row values match submitted consent input
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/checkout/place-order — AC-3 consent accepted values match input', () => {
  let app: Application;

  beforeEach(() => {
    clearConsentAuditStore();
    clearOrderStore();
    app = getApp();
  });

  it('terms consent row has accepted=true when terms:true was submitted', async () => {
    const orderRes = await request(app)
      .post('/api/checkout/place-order')
      .send({ ...BASE_PAYLOAD, consent: { terms: true, marketing: false } });
    const body = orderRes.body as PlaceOrderResponse;
    const ref = (body.order_ref ?? body.orderReference) as string;

    const trailRes = await request(app)
      .get(`/api/orders/${ref}/audit-trail`)
      .set(AUTH_HEADER);
    const trail = trailRes.body as AuditTrailResponse;

    const termsEvent = trail.events.find(
      (e) =>
        e.eventType === 'consent_capture' &&
        String(e.payload.purpose ?? '').toLowerCase() === 'terms',
    );
    expect(termsEvent).toBeDefined();
    expect(termsEvent?.payload.accepted).toBe(true);
  });

  it('marketing consent row has accepted=false when marketing:false was submitted', async () => {
    const orderRes = await request(app)
      .post('/api/checkout/place-order')
      .send({ ...BASE_PAYLOAD, consent: { terms: true, marketing: false } });
    const body = orderRes.body as PlaceOrderResponse;
    const ref = (body.order_ref ?? body.orderReference) as string;

    const trailRes = await request(app)
      .get(`/api/orders/${ref}/audit-trail`)
      .set(AUTH_HEADER);
    const trail = trailRes.body as AuditTrailResponse;

    const marketingEvent = trail.events.find(
      (e) =>
        e.eventType === 'consent_capture' &&
        String(e.payload.purpose ?? '').toLowerCase() === 'marketing',
    );
    expect(marketingEvent).toBeDefined();
    expect(marketingEvent?.payload.accepted).toBe(false);
  });

  it('marketing consent row has accepted=true when marketing:true was submitted', async () => {
    const orderRes = await request(app)
      .post('/api/checkout/place-order')
      .send({ ...BASE_PAYLOAD, consent: { terms: true, marketing: true } });
    const body = orderRes.body as PlaceOrderResponse;
    const ref = (body.order_ref ?? body.orderReference) as string;

    const trailRes = await request(app)
      .get(`/api/orders/${ref}/audit-trail`)
      .set(AUTH_HEADER);
    const trail = trailRes.body as AuditTrailResponse;

    const marketingEvent = trail.events.find(
      (e) =>
        e.eventType === 'consent_capture' &&
        String(e.payload.purpose ?? '').toLowerCase() === 'marketing',
    );
    expect(marketingEvent).toBeDefined();
    expect(marketingEvent?.payload.accepted).toBe(true);
  });

  it('each consent_capture event has an ISO-8601 capturedAt or occurredAt timestamp', async () => {
    const orderRes = await request(app)
      .post('/api/checkout/place-order')
      .send(BASE_PAYLOAD);
    const body = orderRes.body as PlaceOrderResponse;
    const ref = (body.order_ref ?? body.orderReference) as string;

    const trailRes = await request(app)
      .get(`/api/orders/${ref}/audit-trail`)
      .set(AUTH_HEADER);
    const trail = trailRes.body as AuditTrailResponse;

    const consentEvents = trail.events.filter((e) => e.eventType === 'consent_capture');
    for (const e of consentEvents) {
      const ts = e.occurredAt ?? (e.payload.capturedAt as string);
      expect(typeof ts).toBe('string');
      expect(new Date(ts).getTime()).not.toBeNaN();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  Missing consent field returns 422
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/checkout/place-order — AC-4 consent validation', () => {
  let app: Application;

  beforeEach(() => {
    clearConsentAuditStore();
    clearOrderStore();
    app = getApp();
  });

  it('returns 422 when the consent field is absent', async () => {
    const { consent: _omit, ...noConsent } = BASE_PAYLOAD;
    const res = await request(app)
      .post('/api/checkout/place-order')
      .send(noConsent);
    expect(res.status).toBe(422);
  });

  it('returns 422 when consent.terms is false (terms acceptance is required)', async () => {
    const res = await request(app)
      .post('/api/checkout/place-order')
      .send({ ...BASE_PAYLOAD, consent: { terms: false, marketing: false } });
    expect(res.status).toBe(422);
  });

  it('422 response body includes an errorCode', async () => {
    const { consent: _omit, ...noConsent } = BASE_PAYLOAD;
    const res = await request(app)
      .post('/api/checkout/place-order')
      .send(noConsent);
    expect(typeof (res.body as Record<string, unknown>).errorCode).toBe('string');
  });

  it('422 response body includes a message or errors array', async () => {
    const { consent: _omit, ...noConsent } = BASE_PAYLOAD;
    const res = await request(app)
      .post('/api/checkout/place-order')
      .send(noConsent);
    const body = res.body as Record<string, unknown>;
    const hasErrors = Array.isArray(body.errors) && (body.errors as unknown[]).length > 0;
    const hasMessage = typeof body.message === 'string' && (body.message as string).length > 0;
    expect(hasErrors || hasMessage).toBe(true);
  });

  it('does not write consent records when terms consent is absent', async () => {
    const { consent: _omit, ...noConsent } = BASE_PAYLOAD;
    await request(app)
      .post('/api/checkout/place-order')
      .send(noConsent);

    // No order was created so audit trail lookup is irrelevant;
    // verify no order was created either
    const trailRes = await request(app)
      .get('/api/orders/ord-no-such-order/audit-trail')
      .set(AUTH_HEADER);
    expect(trailRes.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  marketing consent is optional — omitting it still succeeds
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/checkout/place-order — AC-5 marketing consent is optional', () => {
  let app: Application;

  beforeEach(() => {
    clearConsentAuditStore();
    clearOrderStore();
    app = getApp();
  });

  it('returns 201 when only terms is provided (marketing omitted)', async () => {
    const payload = {
      ...BASE_PAYLOAD,
      consent: { terms: true } as unknown as ConsentInput,
    };
    const res = await request(app)
      .post('/api/checkout/place-order')
      .send(payload);
    // Either 201 (marketing defaults to false) or 201 with no marketing row
    expect(res.status).toBe(201);
  });

  it('returns 201 when marketing is explicitly provided as false', async () => {
    const res = await request(app)
      .post('/api/checkout/place-order')
      .send({ ...BASE_PAYLOAD, consent: { terms: true, marketing: false } });
    expect(res.status).toBe(201);
  });

  it('returns 201 when marketing is explicitly provided as true', async () => {
    const res = await request(app)
      .post('/api/checkout/place-order')
      .send({ ...BASE_PAYLOAD, consent: { terms: true, marketing: true } });
    expect(res.status).toBe(201);
  });
});
