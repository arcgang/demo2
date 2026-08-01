import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests: In-memory response caching for catalog and market-config.
 *
 * Per task spec:
 *   - A repeated GET to /api/catalog/products under test returns in < 100 ms
 *     after the first call (served from in-memory cache).
 *   - A repeated GET to /api/market-config under test returns in < 100 ms
 *     after the first call.
 *   - Cache is keyed by market code (and catalog fragment hash where applicable)
 *     so different markets are cached independently.
 *   - The cache layer is transparent: the response body on the second call is
 *     identical to the first.
 *
 * All tests in this file are expected to FAIL against the current
 * implementation because no in-memory cache exists.
 */

const CACHE_THRESHOLD_MS = 100;

function getApp(): Application {
  // Fresh app instance per suite — module-level cache must survive across
  // requests within the same process.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app') as { createApp: () => Application };
  return createApp();
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  Second catalog request is served from cache within 100 ms
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — in-memory cache hit latency', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('first request completes without error (warm-up)', async () => {
    const res = await request(app).get('/api/catalog/products').query({ market: 'ZA' });
    expect(res.status).toBe(200);
  });

  it(`second request completes in under ${CACHE_THRESHOLD_MS} ms`, async () => {
    const start = process.hrtime.bigint();
    const res = await request(app).get('/api/catalog/products').query({ market: 'ZA' });
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    expect(res.status).toBe(200);
    expect(elapsedMs).toBeLessThan(CACHE_THRESHOLD_MS);
  });

  it('cached response body equals the first response body', async () => {
    const r1 = await request(app).get('/api/catalog/products').query({ market: 'ZA' });
    const r2 = await request(app).get('/api/catalog/products').query({ market: 'ZA' });
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(JSON.stringify(r2.body)).toBe(JSON.stringify(r1.body));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  Second market-config request is served from cache within 100 ms
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/market-config — in-memory cache hit latency', () => {
  let app: Application;

  beforeAll(async () => {
    app = getApp();
    // warm-up
    await request(app).get('/api/market-config').query({ market: 'ZA' });
  });

  it(`second request completes in under ${CACHE_THRESHOLD_MS} ms`, async () => {
    const start = process.hrtime.bigint();
    const res = await request(app).get('/api/market-config').query({ market: 'ZA' });
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    expect(res.status).toBe(200);
    expect(elapsedMs).toBeLessThan(CACHE_THRESHOLD_MS);
  });

  it('cached market-config body equals the first response body', async () => {
    const r1 = await request(app).get('/api/market-config').query({ market: 'ZA' });
    const r2 = await request(app).get('/api/market-config').query({ market: 'ZA' });
    expect(JSON.stringify(r2.body)).toBe(JSON.stringify(r1.body));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  Cache is keyed per market — different markets have distinct entries
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — cache keyed per market', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('ZA and TZ catalog responses differ (independent cache keys)', async () => {
    const resZA = await request(app).get('/api/catalog/products').query({ market: 'ZA' });
    const resTZ = await request(app).get('/api/catalog/products').query({ market: 'TZ' });
    // Both succeed
    expect(resZA.status).toBe(200);
    expect(resTZ.status).toBe(200);
    // Their bodies are different (different currency in market block)
    const zaMarket = (resZA.body as { market?: { currency: string } }).market;
    const tzMarket = (resTZ.body as { market?: { currency: string } }).market;
    expect(zaMarket?.currency).not.toBe(tzMarket?.currency);
  });

  it('ZA catalog is still correct after TZ was cached', async () => {
    // Ensure ZA is already in cache
    await request(app).get('/api/catalog/products').query({ market: 'ZA' });
    await request(app).get('/api/catalog/products').query({ market: 'TZ' });
    const res = await request(app).get('/api/catalog/products').query({ market: 'ZA' });
    expect(res.status).toBe(200);
    const market = (res.body as { market?: { currency: string } }).market;
    expect(market?.currency).toBe('ZAR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  Cache-control header present on cached response
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — cache headers on cached hit', () => {
  let app: Application;

  beforeAll(async () => {
    app = getApp();
    // prime the cache
    await request(app).get('/api/catalog/products').query({ market: 'ZA' });
  });

  it('cached response still carries Cache-Control header', async () => {
    const res = await request(app).get('/api/catalog/products').query({ market: 'ZA' });
    expect(res.headers['cache-control']).toBeDefined();
  });

  it('cached response still carries ETag header', async () => {
    const res = await request(app).get('/api/catalog/products').query({ market: 'ZA' });
    expect(res.headers['etag']).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  Cache-control header present on cached market-config hit
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/market-config — cache headers on cached hit', () => {
  let app: Application;

  beforeAll(async () => {
    app = getApp();
    await request(app).get('/api/market-config').query({ market: 'ZA' });
  });

  it('cached market-config response carries Cache-Control header', async () => {
    const res = await request(app).get('/api/market-config').query({ market: 'ZA' });
    expect(res.headers['cache-control']).toBeDefined();
  });

  it('cached market-config response carries ETag header', async () => {
    const res = await request(app).get('/api/market-config').query({ market: 'ZA' });
    expect(res.headers['etag']).toBeDefined();
  });
});
