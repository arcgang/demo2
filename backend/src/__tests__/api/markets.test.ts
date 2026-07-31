import request from 'supertest';
import express, { Application } from 'express';

/**
 * Acceptance tests for GET /api/markets
 *
 * Contract (task §4 — MarketContextService and market list endpoint):
 *   - Returns an array of market objects
 *   - Each market: { code, name, currency, taxRate, taxLabel, defaultLanguage }
 *   - South Africa (ZA) is seeded: ZAR, 15% VAT
 */

interface Market {
  code: string;
  name: string;
  currency: string;
  taxRate: number;
  taxLabel: string;
  defaultLanguage: string;
}

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

// ---------------------------------------------------------------------------
// AC-1  Route exists and returns HTTP 200
// ---------------------------------------------------------------------------

describe('GET /api/markets — availability', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 200', async () => {
    const res = await request(app).get('/api/markets');
    expect(res.status).toBe(200);
  });

  it('response body is an array', async () => {
    const res = await request(app).get('/api/markets');
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('array is non-empty (at least the ZA seed is present)', async () => {
    const res = await request(app).get('/api/markets');
    expect((res.body as Market[]).length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// AC-2  Each market object has the required fields
// ---------------------------------------------------------------------------

describe('GET /api/markets — response shape', () => {
  let app: Application;
  let markets: Market[];

  beforeAll(async () => {
    app = getApp();
    const res = await request(app).get('/api/markets');
    markets = res.body as Market[];
  });

  it('every market has a code field (string)', () => {
    for (const m of markets) {
      expect(typeof m.code).toBe('string');
      expect(m.code.length).toBeGreaterThan(0);
    }
  });

  it('every market has a name field (string)', () => {
    for (const m of markets) {
      expect(typeof m.name).toBe('string');
      expect(m.name.length).toBeGreaterThan(0);
    }
  });

  it('every market has a currency field (string)', () => {
    for (const m of markets) {
      expect(typeof m.currency).toBe('string');
      expect(m.currency.length).toBeGreaterThan(0);
    }
  });

  it('every market has a taxRate field (number)', () => {
    for (const m of markets) {
      expect(typeof m.taxRate).toBe('number');
    }
  });

  it('every market has a taxLabel field (string)', () => {
    for (const m of markets) {
      expect(typeof m.taxLabel).toBe('string');
      expect(m.taxLabel.length).toBeGreaterThan(0);
    }
  });

  it('every market has a defaultLanguage field (string)', () => {
    for (const m of markets) {
      expect(typeof m.defaultLanguage).toBe('string');
      expect(m.defaultLanguage.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-3  South Africa seed data is correct
// ---------------------------------------------------------------------------

describe('GET /api/markets — South Africa seed', () => {
  let app: Application;
  let zaMarket: Market | undefined;

  beforeAll(async () => {
    app = getApp();
    const res = await request(app).get('/api/markets');
    zaMarket = (res.body as Market[]).find((m) => m.code === 'ZA');
  });

  it('ZA market is present in the list', () => {
    expect(zaMarket).toBeDefined();
  });

  it('ZA market currency is ZAR', () => {
    expect(zaMarket!.currency).toBe('ZAR');
  });

  it('ZA market taxRate is 0.15 (15%)', () => {
    expect(zaMarket!.taxRate).toBe(0.15);
  });

  it('ZA market taxLabel is VAT', () => {
    expect(zaMarket!.taxLabel).toBe('VAT');
  });

  it('ZA market has a name', () => {
    expect(zaMarket!.name.length).toBeGreaterThan(0);
  });

  it('ZA market has a defaultLanguage', () => {
    expect(zaMarket!.defaultLanguage.length).toBeGreaterThan(0);
  });
});
