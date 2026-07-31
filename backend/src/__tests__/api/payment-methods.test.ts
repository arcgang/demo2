import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for GET /api/checkout/payment-methods
 *
 * Contract (from LLD §5 / task acceptance criteria):
 *
 *   Query parameters:
 *     market   string  required  — market code, e.g. ZA, XX
 *
 *   200  — array of [{type, label, iconKey}] for that market
 *   400  — market query param is absent
 *   404  — market code not in configuration
 *
 *   ZA market: card_payment_enabled + mobile_money_enabled → both methods
 *   XX market: card_payment_enabled only                   → card only
 */

// ---------------------------------------------------------------------------
// Response type shapes
// ---------------------------------------------------------------------------

interface PaymentMethod {
  type: string;
  label: string;
  iconKey: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

async function fetchPaymentMethods(
  app: Application,
  market: string,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app)
    .get('/api/checkout/payment-methods')
    .query({ market });
  return { status: res.status, body: res.body };
}

// ---------------------------------------------------------------------------
// AC-1  ZA market — returns both card and mobile_money
// ---------------------------------------------------------------------------

describe('GET /api/checkout/payment-methods — ZA market (card + mobile_money)', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await fetchPaymentMethods(app, 'ZA');
  });

  it('returns HTTP 200', () => {
    expect(result.status).toBe(200);
  });

  it('response body is an array', () => {
    expect(Array.isArray(result.body)).toBe(true);
  });

  it('array contains a method with type "card"', () => {
    const methods = result.body as PaymentMethod[];
    const card = methods.find((m) => m.type === 'card');
    expect(card).toBeDefined();
  });

  it('array contains a method with type "mobile_money"', () => {
    const methods = result.body as PaymentMethod[];
    const mm = methods.find((m) => m.type === 'mobile_money');
    expect(mm).toBeDefined();
  });

  it('card method has a non-empty label', () => {
    const methods = result.body as PaymentMethod[];
    const card = methods.find((m) => m.type === 'card')!;
    expect(typeof card.label).toBe('string');
    expect(card.label.length).toBeGreaterThan(0);
  });

  it('card method has a non-empty iconKey', () => {
    const methods = result.body as PaymentMethod[];
    const card = methods.find((m) => m.type === 'card')!;
    expect(typeof card.iconKey).toBe('string');
    expect(card.iconKey.length).toBeGreaterThan(0);
  });

  it('mobile_money method has a non-empty label', () => {
    const methods = result.body as PaymentMethod[];
    const mm = methods.find((m) => m.type === 'mobile_money')!;
    expect(typeof mm.label).toBe('string');
    expect(mm.label.length).toBeGreaterThan(0);
  });

  it('mobile_money method has a non-empty iconKey', () => {
    const methods = result.body as PaymentMethod[];
    const mm = methods.find((m) => m.type === 'mobile_money')!;
    expect(typeof mm.iconKey).toBe('string');
    expect(mm.iconKey.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC-2  XX market (card-only) — returns only card, no mobile_money
// ---------------------------------------------------------------------------

describe('GET /api/checkout/payment-methods — XX card-only market', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await fetchPaymentMethods(app, 'XX');
  });

  it('returns HTTP 200', () => {
    expect(result.status).toBe(200);
  });

  it('response body is an array', () => {
    expect(Array.isArray(result.body)).toBe(true);
  });

  it('array contains exactly one method', () => {
    const methods = result.body as PaymentMethod[];
    expect(methods).toHaveLength(1);
  });

  it('the single method has type "card"', () => {
    const methods = result.body as PaymentMethod[];
    expect(methods[0].type).toBe('card');
  });

  it('array does NOT contain a mobile_money method', () => {
    const methods = result.body as PaymentMethod[];
    const mm = methods.find((m) => m.type === 'mobile_money');
    expect(mm).toBeUndefined();
  });

  it('card method has a non-empty label', () => {
    const methods = result.body as PaymentMethod[];
    expect(typeof methods[0].label).toBe('string');
    expect(methods[0].label.length).toBeGreaterThan(0);
  });

  it('card method has a non-empty iconKey', () => {
    const methods = result.body as PaymentMethod[];
    expect(typeof methods[0].iconKey).toBe('string');
    expect(methods[0].iconKey.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('GET /api/checkout/payment-methods — edge cases', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns 400 when the market query param is absent', async () => {
    const res = await request(app).get('/api/checkout/payment-methods');
    expect(res.status).toBe(400);
  });

  it('400 response has an errorCode field', async () => {
    const res = await request(app).get('/api/checkout/payment-methods');
    expect(typeof (res.body as Record<string, unknown>).errorCode).toBe('string');
  });

  it('returns 404 for a market code not present in configuration', async () => {
    const res = await request(app)
      .get('/api/checkout/payment-methods')
      .query({ market: 'ZZZZ_UNKNOWN' });
    expect(res.status).toBe(404);
  });

  it('404 response has an errorCode field', async () => {
    const res = await request(app)
      .get('/api/checkout/payment-methods')
      .query({ market: 'ZZZZ_UNKNOWN' });
    expect(typeof (res.body as Record<string, unknown>).errorCode).toBe('string');
  });
});
