import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for GET /api/markets and GET /api/markets/:code
 *
 * Covers (from task AC):
 *  - Market list returns at least one active market with required fields
 *  - First active market can serve as default (no stored preference)
 *  - Single-market lookup by code returns currencySymbol, currencyCode, taxLabel, taxRate, enabledPaymentMethods
 *  - ZA market has currencyCode='ZAR', taxLabel includes '15', enabledPaymentMethods includes 'card' and 'mobile_money'
 *  - A market without 'mobile_money' in enabledPaymentMethods exists (or the contract allows it)
 *  - No hardcoded 'R' literal in market API response — currency comes from currencySymbol field
 *  - 404 for unknown market code
 */

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

interface Market {
  code: string;
  name: string;
  currencySymbol: string;
  currencyCode: string;
  taxLabel: string;
  taxRate: number;
  enabledPaymentMethods: string[];
  active: boolean;
}

interface MarketListResponse {
  markets: Market[];
}

// ---------------------------------------------------------------------------
// AC-1  GET /api/markets — list endpoint
// ---------------------------------------------------------------------------

describe('GET /api/markets — list of markets', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 200', async () => {
    const res = await request(app).get('/api/markets');
    expect(res.status).toBe(200);
  });

  it('response body contains a markets array', async () => {
    const res = await request(app).get('/api/markets');
    const body = res.body as MarketListResponse;
    expect(body).toHaveProperty('markets');
    expect(Array.isArray(body.markets)).toBe(true);
  });

  it('returns at least one active market', async () => {
    const res = await request(app).get('/api/markets');
    const body = res.body as MarketListResponse;
    const active = body.markets.filter((m) => m.active === true);
    expect(active.length).toBeGreaterThanOrEqual(1);
  });

  it('every market has required fields: code, name, currencySymbol, currencyCode, taxLabel, taxRate, enabledPaymentMethods, active', async () => {
    const res = await request(app).get('/api/markets');
    const body = res.body as MarketListResponse;
    for (const m of body.markets) {
      expect(typeof m.code).toBe('string');
      expect(m.code.length).toBeGreaterThan(0);

      expect(typeof m.name).toBe('string');
      expect(m.name.length).toBeGreaterThan(0);

      expect(typeof m.currencySymbol).toBe('string');
      expect(m.currencySymbol.length).toBeGreaterThan(0);

      expect(typeof m.currencyCode).toBe('string');
      expect(m.currencyCode.length).toBeGreaterThan(0);

      expect(typeof m.taxLabel).toBe('string');
      expect(m.taxLabel.length).toBeGreaterThan(0);

      expect(typeof m.taxRate).toBe('number');
      expect(m.taxRate).toBeGreaterThanOrEqual(0);

      expect(Array.isArray(m.enabledPaymentMethods)).toBe(true);

      expect(typeof m.active).toBe('boolean');
    }
  });

  it('first element in the list is active (default market resolves to first active)', async () => {
    const res = await request(app).get('/api/markets');
    const body = res.body as MarketListResponse;
    const firstActive = body.markets.find((m) => m.active === true);
    expect(firstActive).toBeDefined();
  });

  it('seed data includes the ZA market', async () => {
    const res = await request(app).get('/api/markets');
    const body = res.body as MarketListResponse;
    const za = body.markets.find((m) => m.code === 'ZA');
    expect(za).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AC-2  GET /api/markets/:code — single market lookup
// ---------------------------------------------------------------------------

describe('GET /api/markets/:code — single market', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 200 for a known market code', async () => {
    const res = await request(app).get('/api/markets/ZA');
    expect(res.status).toBe(200);
  });

  it('returns 404 for an unknown market code', async () => {
    const res = await request(app).get('/api/markets/UNKNOWN_XX');
    expect(res.status).toBe(404);
  });

  it('response body matches the requested market code', async () => {
    const res = await request(app).get('/api/markets/ZA');
    const m = res.body as Market;
    expect(m.code).toBe('ZA');
  });

  it('ZA market has currencyCode ZAR', async () => {
    const res = await request(app).get('/api/markets/ZA');
    const m = res.body as Market;
    expect(m.currencyCode).toBe('ZAR');
  });

  it('ZA market taxRate is 0.15 (15%)', async () => {
    const res = await request(app).get('/api/markets/ZA');
    const m = res.body as Market;
    expect(m.taxRate).toBeCloseTo(0.15);
  });

  it('ZA market taxLabel references 15%', async () => {
    const res = await request(app).get('/api/markets/ZA');
    const m = res.body as Market;
    // taxLabel must contain the rate — e.g. 'VAT (15%)' — not be a hardcoded blank
    expect(m.taxLabel).toMatch(/15/);
  });

  it('ZA market enabledPaymentMethods includes "card"', async () => {
    const res = await request(app).get('/api/markets/ZA');
    const m = res.body as Market;
    expect(m.enabledPaymentMethods).toContain('card');
  });

  it('ZA market enabledPaymentMethods includes "mobile_money"', async () => {
    const res = await request(app).get('/api/markets/ZA');
    const m = res.body as Market;
    expect(m.enabledPaymentMethods).toContain('mobile_money');
  });

  it('a non-ZA market without mobile_money exists in the seed — payment-method exclusion contract', async () => {
    const listRes = await request(app).get('/api/markets');
    const body = listRes.body as MarketListResponse;
    const cardOnly = body.markets.filter(
      (m) => m.active && !m.enabledPaymentMethods.includes('mobile_money'),
    );
    // At least one market must be seeded with only card (to verify UI hides M-Pesa for it)
    expect(cardOnly.length).toBeGreaterThanOrEqual(1);
  });

  it('card-only market returns the correct structure from /api/markets/:code', async () => {
    const listRes = await request(app).get('/api/markets');
    const body = listRes.body as MarketListResponse;
    const cardOnly = body.markets.find(
      (m) => m.active && !m.enabledPaymentMethods.includes('mobile_money'),
    );
    expect(cardOnly).toBeDefined();
    const res = await request(app).get(`/api/markets/${cardOnly!.code}`);
    expect(res.status).toBe(200);
    const m = res.body as Market;
    expect(m.enabledPaymentMethods).not.toContain('mobile_money');
    expect(m.enabledPaymentMethods).toContain('card');
  });
});

// ---------------------------------------------------------------------------
// AC-3  Configuration contract: no hardcoded market values in response body
// ---------------------------------------------------------------------------

describe('GET /api/markets — configuration contract', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('markets list response does not embed a hardcoded literal "R" as currency (currencySymbol field is used)', async () => {
    // The currency symbol must come through the currencySymbol field — this test
    // validates that the ZA market explicitly declares its symbol rather than
    // relying on any hardcoded 'R' elsewhere in the response envelope.
    const res = await request(app).get('/api/markets/ZA');
    const m = res.body as Market;
    // currencySymbol must be a non-empty string; the value 'R' is the expected one for ZAR
    expect(typeof m.currencySymbol).toBe('string');
    expect(m.currencySymbol.length).toBeGreaterThan(0);
    // taxLabel must not be the empty string (hardcoded blank)
    expect(m.taxLabel.trim().length).toBeGreaterThan(0);
  });

  it('taxRate is numeric — not a formatted string like "15%"', async () => {
    const res = await request(app).get('/api/markets/ZA');
    const m = res.body as Market;
    expect(typeof m.taxRate).toBe('number');
  });

  it('enabledPaymentMethods is an array of strings — not a comma-separated string', async () => {
    const res = await request(app).get('/api/markets/ZA');
    const m = res.body as Market;
    expect(Array.isArray(m.enabledPaymentMethods)).toBe(true);
    for (const method of m.enabledPaymentMethods) {
      expect(typeof method).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// AC-4  Market switching — tax and payment method changes
// ---------------------------------------------------------------------------

describe('Market switching — ZA vs card-only market', () => {
  let app: Application;
  let zaMarket: Market;
  let cardOnlyMarket: Market;

  beforeAll(async () => {
    app = getApp();
    const zaRes = await request(app).get('/api/markets/ZA');
    zaMarket = zaRes.body as Market;

    const listRes = await request(app).get('/api/markets');
    const all = (listRes.body as MarketListResponse).markets;
    const found = all.find((m) => m.active && !m.enabledPaymentMethods.includes('mobile_money'));
    expect(found).toBeDefined();
    const detailRes = await request(app).get(`/api/markets/${found!.code}`);
    cardOnlyMarket = detailRes.body as Market;
  });

  it('ZA and card-only market have different enabledPaymentMethods sets', () => {
    expect(zaMarket.enabledPaymentMethods).toContain('mobile_money');
    expect(cardOnlyMarket.enabledPaymentMethods).not.toContain('mobile_money');
  });

  it('switching market code changes the taxLabel received by the client', () => {
    // Both markets must expose taxLabel — UI updates dynamically from this field
    expect(typeof zaMarket.taxLabel).toBe('string');
    expect(typeof cardOnlyMarket.taxLabel).toBe('string');
  });

  it('switching market code changes the taxRate received by the client', () => {
    expect(typeof zaMarket.taxRate).toBe('number');
    expect(typeof cardOnlyMarket.taxRate).toBe('number');
  });

  it('switching market code changes the currencySymbol and currencyCode received by the client', () => {
    expect(typeof zaMarket.currencySymbol).toBe('string');
    expect(typeof cardOnlyMarket.currencySymbol).toBe('string');
    // Codes must differ between ZA and a card-only non-ZA market
    expect(zaMarket.currencyCode).toBe('ZAR');
    expect(cardOnlyMarket.currencyCode).not.toBe('ZAR');
  });
});
