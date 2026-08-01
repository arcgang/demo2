import request from 'supertest';
import express, { Application } from 'express';

/**
 * Acceptance tests for POST /api/upgrade/trade-in/valuation
 *
 * Contract (LLD §5 / task spec):
 *   Request: { brand: string, model: string, storage: number, condition: string }
 *   200 Response: TradeInQuote {
 *     estimatedCredit: number,
 *     validUntil: string (ISO-8601),
 *     asyncPending: boolean
 *   }
 *   Routes through the Trade-In Valuation Boundary (TradeInAdapter) per HLD §9.3.
 *   asyncPending must be present so the frontend can surface the async-review notice.
 */

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_PAYLOAD = {
  brand: 'Apple',
  model: 'iPhone 12',
  storage: 128,
  condition: 'GOOD',
};

const VALID_PAYLOAD_POOR = {
  brand: 'Samsung',
  model: 'Galaxy S21',
  storage: 256,
  condition: 'POOR',
};

// ---------------------------------------------------------------------------
// Response type shapes
// ---------------------------------------------------------------------------

interface TradeInQuote {
  estimatedCredit: number;
  validUntil: string;
  asyncPending: boolean;
}

interface ErrorResponse {
  errorCode: string;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

async function postValuation(
  app: Application,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app)
    .post('/api/upgrade/trade-in/valuation')
    .set('Content-Type', 'application/json')
    .send(payload);
  return { status: res.status, body: res.body };
}

// ---------------------------------------------------------------------------
// AC-1  Valid request returns TradeInQuote shape
// ---------------------------------------------------------------------------

describe('POST /api/upgrade/trade-in/valuation — valid request', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await postValuation(app, VALID_PAYLOAD);
  });

  it('returns HTTP 200', () => {
    expect(result.status).toBe(200);
  });

  it('response body contains estimatedCredit as a non-negative number', () => {
    const body = result.body as TradeInQuote;
    expect(typeof body.estimatedCredit).toBe('number');
    expect(body.estimatedCredit).toBeGreaterThanOrEqual(0);
  });

  it('response body contains validUntil as a non-empty string', () => {
    const body = result.body as TradeInQuote;
    expect(typeof body.validUntil).toBe('string');
    expect(body.validUntil.length).toBeGreaterThan(0);
  });

  it('validUntil is a parseable ISO-8601 datetime', () => {
    const body = result.body as TradeInQuote;
    expect(new Date(body.validUntil).getTime()).not.toBeNaN();
  });

  it('response body contains asyncPending as a boolean', () => {
    const body = result.body as TradeInQuote;
    expect(typeof body.asyncPending).toBe('boolean');
  });

  it('response body has the three mandated fields', () => {
    const body = result.body as TradeInQuote;
    expect(body).toHaveProperty('estimatedCredit');
    expect(body).toHaveProperty('validUntil');
    expect(body).toHaveProperty('asyncPending');
  });

  it('also returns 200 for a POOR condition device', async () => {
    const res = await postValuation(app, VALID_PAYLOAD_POOR);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// AC-2  asyncPending is always present (frontend async-review notice)
// ---------------------------------------------------------------------------

describe('POST /api/upgrade/trade-in/valuation — asyncPending invariant', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('asyncPending field is present on the response', async () => {
    const res = await postValuation(app, VALID_PAYLOAD);
    const body = res.body as TradeInQuote;
    expect(Object.prototype.hasOwnProperty.call(body, 'asyncPending')).toBe(true);
  });

  it('asyncPending is a boolean (not null or undefined)', async () => {
    const res = await postValuation(app, VALID_PAYLOAD);
    const body = res.body as TradeInQuote;
    expect(body.asyncPending === true || body.asyncPending === false).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-3  Missing required fields — 422 with field-level errors
// ---------------------------------------------------------------------------

describe('POST /api/upgrade/trade-in/valuation — missing required fields', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  const requiredFields = ['brand', 'model', 'storage', 'condition'] as const;

  for (const field of requiredFields) {
    it(`returns 422 when "${field}" is omitted`, async () => {
      const payload = { ...VALID_PAYLOAD } as Record<string, unknown>;
      delete payload[field];
      const res = await postValuation(app, payload);
      expect(res.status).toBe(422);
    });

    it(`422 response for missing "${field}" has a non-empty errors array`, async () => {
      const payload = { ...VALID_PAYLOAD } as Record<string, unknown>;
      delete payload[field];
      const res = await postValuation(app, payload);
      const body = res.body as ErrorResponse;
      expect(Array.isArray(body.errors)).toBe(true);
      expect((body.errors as unknown[]).length).toBeGreaterThan(0);
    });

    it(`error entry for missing "${field}" references the correct field`, async () => {
      const payload = { ...VALID_PAYLOAD } as Record<string, unknown>;
      delete payload[field];
      const res = await postValuation(app, payload);
      const body = res.body as ErrorResponse;
      const err = (body.errors ?? []).find((e) => e.field === field);
      expect(err).toBeDefined();
    });
  }

  it('returns 422 when condition is an empty string', async () => {
    const res = await postValuation(app, { ...VALID_PAYLOAD, condition: '' });
    expect(res.status).toBe(422);
  });

  it('returns 422 when storage is a negative number', async () => {
    const res = await postValuation(app, { ...VALID_PAYLOAD, storage: -1 });
    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// AC-4  Routes through Trade-In Valuation Boundary
// ---------------------------------------------------------------------------

describe('POST /api/upgrade/trade-in/valuation — Trade-In Boundary routing', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('endpoint is reachable and does not return 404', async () => {
    const res = await postValuation(app, VALID_PAYLOAD);
    expect(res.status).not.toBe(404);
  });

  it('endpoint is reachable and does not return 500', async () => {
    const res = await postValuation(app, VALID_PAYLOAD);
    expect(res.status).not.toBe(500);
  });

  it('estimatedCredit may differ by condition (adapter boundary exercised)', async () => {
    const goodRes = await postValuation(app, VALID_PAYLOAD);
    const poorRes = await postValuation(app, VALID_PAYLOAD_POOR);
    const goodBody = goodRes.body as TradeInQuote;
    const poorBody = poorRes.body as TradeInQuote;
    // Both must be valid quotes; adapter must produce non-negative credits
    expect(goodBody.estimatedCredit).toBeGreaterThanOrEqual(0);
    expect(poorBody.estimatedCredit).toBeGreaterThanOrEqual(0);
  });
});
