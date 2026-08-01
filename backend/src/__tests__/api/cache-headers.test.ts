import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests: Cache-Control and ETag headers on catalog and
 * market-config endpoints.
 *
 * Per task spec / LLD §5.2:
 *   - GET /api/catalog/products must carry a Cache-Control header with a
 *     max-age directive AND an ETag header.
 *   - GET /api/market-config must carry Cache-Control and/or ETag headers.
 *   - Repeated identical requests must return the same ETag value.
 *   - Different market codes must produce different ETags.
 *   - A conditional GET (If-None-Match: <currentETag>) must return 304.
 *
 * All tests in this file are expected to FAIL against the current implementation
 * because no caching headers are emitted and /api/market-config does not exist.
 */

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app') as { createApp: () => Application };
  return createApp();
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  Cache-Control header on GET /api/catalog/products
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — Cache-Control header', () => {
  let app: Application;
  let headers: Record<string, string>;

  beforeAll(async () => {
    app = getApp();
    const res = await request(app)
      .get('/api/catalog/products')
      .query({ market: 'ZA' });
    headers = res.headers as Record<string, string>;
  });

  it('returns a Cache-Control header', () => {
    expect(headers['cache-control']).toBeDefined();
  });

  it('Cache-Control includes a max-age directive', () => {
    expect(headers['cache-control']).toMatch(/max-age=\d+/i);
  });

  it('max-age is a positive integer', () => {
    const match = (headers['cache-control'] ?? '').match(/max-age=(\d+)/i);
    expect(match).not.toBeNull();
    const age = parseInt((match as RegExpMatchArray)[1], 10);
    expect(age).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  ETag header on GET /api/catalog/products
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — ETag header', () => {
  let app: Application;
  let headers: Record<string, string>;

  beforeAll(async () => {
    app = getApp();
    const res = await request(app)
      .get('/api/catalog/products')
      .query({ market: 'ZA' });
    headers = res.headers as Record<string, string>;
  });

  it('returns an ETag header', () => {
    expect(headers['etag']).toBeDefined();
  });

  it('ETag is a non-empty string', () => {
    expect(typeof headers['etag']).toBe('string');
    expect((headers['etag'] ?? '').trim().length).toBeGreaterThan(0);
  });

  it('ETag value is wrapped in quotes (strong or weak format)', () => {
    const etag = headers['etag'] ?? '';
    // Valid formats: "abc123"  or  W/"abc123"
    expect(etag).toMatch(/^(W\/)?"[^"]+"$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  ETag consistency on GET /api/catalog/products
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — ETag consistency', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('two identical GETs return the same ETag value', async () => {
    const res1 = await request(app).get('/api/catalog/products').query({ market: 'ZA' });
    const res2 = await request(app).get('/api/catalog/products').query({ market: 'ZA' });
    expect(res1.headers['etag']).toBeDefined();
    expect(res1.headers['etag']).toBe(res2.headers['etag']);
  });

  it('different market codes produce different ETags', async () => {
    const resZA = await request(app).get('/api/catalog/products').query({ market: 'ZA' });
    const resTZ = await request(app).get('/api/catalog/products').query({ market: 'TZ' });
    expect(resZA.headers['etag']).toBeDefined();
    expect(resTZ.headers['etag']).toBeDefined();
    expect(resZA.headers['etag']).not.toBe(resTZ.headers['etag']);
  });

  it('a category filter changes the ETag relative to the unfiltered response', async () => {
    const resAll = await request(app).get('/api/catalog/products').query({ market: 'ZA' });
    const resDevices = await request(app)
      .get('/api/catalog/products')
      .query({ market: 'ZA', category: 'devices' });
    expect(resAll.headers['etag']).toBeDefined();
    expect(resDevices.headers['etag']).toBeDefined();
    expect(resAll.headers['etag']).not.toBe(resDevices.headers['etag']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  Conditional GET (If-None-Match) on GET /api/catalog/products
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — conditional GET (304)', () => {
  let app: Application;
  let etag: string;

  beforeAll(async () => {
    app = getApp();
    const res = await request(app)
      .get('/api/catalog/products')
      .query({ market: 'ZA' });
    etag = res.headers['etag'] as string;
  });

  it('returns 304 when If-None-Match matches the current ETag', async () => {
    const res = await request(app)
      .get('/api/catalog/products')
      .query({ market: 'ZA' })
      .set('If-None-Match', etag);
    expect(res.status).toBe(304);
  });

  it('304 response has no body', async () => {
    const res = await request(app)
      .get('/api/catalog/products')
      .query({ market: 'ZA' })
      .set('If-None-Match', etag);
    expect(res.status).toBe(304);
    expect(res.text).toBeFalsy();
  });

  it('returns 200 with full body when If-None-Match does not match', async () => {
    const res = await request(app)
      .get('/api/catalog/products')
      .query({ market: 'ZA' })
      .set('If-None-Match', '"stale-value-does-not-match"');
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  GET /api/market-config — endpoint exists and returns cache headers
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/market-config — endpoint and cache headers', () => {
  let app: Application;
  let res: import('supertest').Response;

  beforeAll(async () => {
    app = getApp();
    res = await request(app).get('/api/market-config').query({ market: 'ZA' });
  });

  it('endpoint exists and returns HTTP 200 for a valid market', () => {
    expect(res.status).toBe(200);
  });

  it('response body contains marketCode', () => {
    expect((res.body as Record<string, unknown>).marketCode).toBeDefined();
  });

  it('returns a Cache-Control header', () => {
    expect(res.headers['cache-control']).toBeDefined();
  });

  it('returns an ETag header', () => {
    expect(res.headers['etag']).toBeDefined();
  });

  it('ETag is consistent on repeated identical requests', async () => {
    const r1 = await request(app).get('/api/market-config').query({ market: 'ZA' });
    const r2 = await request(app).get('/api/market-config').query({ market: 'ZA' });
    expect(r1.headers['etag']).toBeDefined();
    expect(r1.headers['etag']).toBe(r2.headers['etag']);
  });

  it('returns 304 when If-None-Match matches the current ETag', async () => {
    const first = await request(app).get('/api/market-config').query({ market: 'ZA' });
    const currentEtag = first.headers['etag'] as string;
    expect(currentEtag).toBeDefined();

    const conditional = await request(app)
      .get('/api/market-config')
      .query({ market: 'ZA' })
      .set('If-None-Match', currentEtag);
    expect(conditional.status).toBe(304);
  });

  it('returns 400 when market is missing', async () => {
    const r = await request(app).get('/api/market-config');
    expect(r.status).toBe(400);
  });
});
