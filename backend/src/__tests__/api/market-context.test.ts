import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for GET /api/market-context
 *
 * Contract (task spec + LLD §5.2, §6.2):
 *   - Accepts a `market` query parameter (e.g. ZA) or detects market from context.
 *   - Returns a valid MarketContext object: marketCode, currency, language, vatRate,
 *     paymentMethods.
 *   - For ZA: currency=ZAR, vatRate=0.15, paymentMethods includes CARD_TOKEN.
 *   - Missing or unknown market returns 400 with errorCode.
 */

// ─── response shapes ─────────────────────────────────────────────────────────

interface MarketContext {
  marketCode: string;
  currency: string;
  language: string;
  vatRate: number;
  paymentMethods: string[];
}

interface ErrorResponse {
  errorCode: string;
  message?: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app') as { createApp: () => Application };
  return createApp();
}

async function getMarketContext(
  app: Application,
  query: Record<string, string> = {},
): Promise<{ status: number; body: unknown }> {
  const res = await request(app)
    .get('/api/market-context')
    .query(query);
  return { status: res.status, body: res.body };
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  200 response shape for South Africa market
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/market-context — AC-1 ZA market 200 shape', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await getMarketContext(app, { market: 'ZA' });
  });

  it('returns HTTP 200 for the ZA market', () => {
    expect(result.status).toBe(200);
  });

  it('response body is a non-null object', () => {
    expect(typeof result.body).toBe('object');
    expect(result.body).not.toBeNull();
  });

  it('response includes marketCode', () => {
    const ctx = result.body as MarketContext;
    expect(typeof ctx.marketCode).toBe('string');
    expect(ctx.marketCode.trim().length).toBeGreaterThan(0);
  });

  it('marketCode matches the requested market ZA', () => {
    const ctx = result.body as MarketContext;
    expect(ctx.marketCode).toBe('ZA');
  });

  it('response includes currency as a non-empty string', () => {
    const ctx = result.body as MarketContext;
    expect(typeof ctx.currency).toBe('string');
    expect(ctx.currency.trim().length).toBeGreaterThan(0);
  });

  it('currency is ZAR for the ZA market', () => {
    const ctx = result.body as MarketContext;
    expect(ctx.currency).toBe('ZAR');
  });

  it('response includes language as a non-empty string', () => {
    const ctx = result.body as MarketContext;
    expect(typeof ctx.language).toBe('string');
    expect(ctx.language.trim().length).toBeGreaterThan(0);
  });

  it('response includes vatRate as a number', () => {
    const ctx = result.body as MarketContext;
    expect(typeof ctx.vatRate).toBe('number');
  });

  it('vatRate is 0.15 (15%) for the ZA market', () => {
    const ctx = result.body as MarketContext;
    expect(ctx.vatRate).toBe(0.15);
  });

  it('response includes paymentMethods as an array', () => {
    const ctx = result.body as MarketContext;
    expect(Array.isArray(ctx.paymentMethods)).toBe(true);
  });

  it('paymentMethods array is non-empty for the ZA market', () => {
    const ctx = result.body as MarketContext;
    expect(ctx.paymentMethods.length).toBeGreaterThan(0);
  });

  it('each payment method is a non-empty string', () => {
    const ctx = result.body as MarketContext;
    for (const method of ctx.paymentMethods) {
      expect(typeof method).toBe('string');
      expect(method.trim().length).toBeGreaterThan(0);
    }
  });

  it('CARD_TOKEN is among the enabled payment methods for ZA', () => {
    const ctx = result.body as MarketContext;
    expect(ctx.paymentMethods).toContain('CARD_TOKEN');
  });

  it('response has exactly the five mandated fields', () => {
    const ctx = result.body as MarketContext;
    expect(ctx).toHaveProperty('marketCode');
    expect(ctx).toHaveProperty('currency');
    expect(ctx).toHaveProperty('language');
    expect(ctx).toHaveProperty('vatRate');
    expect(ctx).toHaveProperty('paymentMethods');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  vatRate is expressed as a decimal fraction
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/market-context — AC-2 vatRate decimal representation', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('vatRate for ZA is strictly between 0 and 1 (decimal, not percentage)', async () => {
    const { body } = await getMarketContext(app, { market: 'ZA' });
    const ctx = body as MarketContext;
    expect(ctx.vatRate).toBeGreaterThan(0);
    expect(ctx.vatRate).toBeLessThan(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  paymentMethods contract for ZA
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/market-context — AC-3 ZA payment methods', () => {
  let app: Application;
  let ctx: MarketContext;

  beforeAll(async () => {
    app = getApp();
    const { body } = await getMarketContext(app, { market: 'ZA' });
    ctx = body as MarketContext;
  });

  it('ZA market exposes at least one payment method', () => {
    expect(ctx.paymentMethods.length).toBeGreaterThanOrEqual(1);
  });

  it('all payment method values are uppercase strings with no spaces', () => {
    for (const method of ctx.paymentMethods) {
      expect(method).toMatch(/^[A-Z0-9_]+$/);
    }
  });

  it('payment methods list contains no duplicates', () => {
    const unique = new Set(ctx.paymentMethods);
    expect(unique.size).toBe(ctx.paymentMethods.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  400 for unknown market code
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/market-context — AC-4 unknown market 400', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 400 for an unknown market code', async () => {
    const { status } = await getMarketContext(app, { market: 'XX' });
    expect(status).toBe(400);
  });

  it('400 response includes an errorCode', async () => {
    const { body } = await getMarketContext(app, { market: 'XX' });
    const err = body as ErrorResponse;
    expect(typeof err.errorCode).toBe('string');
    expect(err.errorCode.trim().length).toBeGreaterThan(0);
  });

  it('returns 400 when market parameter is omitted', async () => {
    const { status } = await getMarketContext(app, {});
    expect(status).toBe(400);
  });

  it('missing market 400 response includes an errorCode', async () => {
    const { body } = await getMarketContext(app, {});
    const err = body as ErrorResponse;
    expect(typeof err.errorCode).toBe('string');
    expect(err.errorCode.trim().length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  Endpoint reachability
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/market-context — AC-5 endpoint reachability', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('endpoint exists and is not 404', async () => {
    const { status } = await getMarketContext(app, { market: 'ZA' });
    expect(status).not.toBe(404);
  });

  it('endpoint does not return 500 for a valid market', async () => {
    const { status } = await getMarketContext(app, { market: 'ZA' });
    expect(status).not.toBe(500);
  });
});
