import request from 'supertest';
import express, { Application } from 'express';

/**
 * Acceptance tests for GET /api/catalog/products
 *
 * Contract (task §5 acceptance criteria):
 *   GET /api/catalog/products?market=ZA&category=smartphones
 *     - Returns only the six seeded smartphone products
 *     - Products have ZAR prices and correct VAT rate (0.15)
 *     - Response payload includes: currency, taxRate, taxLabel, purchasable
 *     - Products with available=false for market ZA are excluded
 *
 *   Filters: market, category, brand, priceMin, priceMax, storage, inStock
 */

interface ProductListing {
  id: string;
  name: string;
  category: string;
  basePrice?: number;
  price: number;
  currency: string;
  taxRate: number;
  taxLabel: string;
  purchasable: boolean;
  badges?: string[];
  imageUrl?: string;
  available?: boolean;
}

interface CatalogResponse {
  products: ProductListing[];
  market?: {
    code: string;
    currency: string;
    taxRate: number;
    taxLabel: string;
  };
}

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

async function fetchCatalog(
  app: Application,
  params: Record<string, string | number | boolean>,
): Promise<{ status: number; body: CatalogResponse }> {
  const res = await request(app)
    .get('/api/catalog/products')
    .query(params as Record<string, string>);
  return { status: res.status, body: res.body as CatalogResponse };
}

// ---------------------------------------------------------------------------
// AC-1  Route responds
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products — availability', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 200 for market=ZA&category=smartphones', async () => {
    const { status } = await fetchCatalog(app, { market: 'ZA', category: 'smartphones' });
    expect(status).toBe(200);
  });

  it('returns 400 or 404 when market param is missing', async () => {
    const res = await request(app).get('/api/catalog/products').query({ category: 'smartphones' });
    expect([400, 404, 422]).toContain(res.status);
  });

  it('returns 400 or 404 for an unknown market code', async () => {
    const res = await request(app).get('/api/catalog/products').query({ market: 'XX' });
    expect([400, 404, 422]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// AC-2  Response shape
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products — response shape', () => {
  let app: Application;
  let body: CatalogResponse;

  beforeAll(async () => {
    app = getApp();
    const res = await fetchCatalog(app, { market: 'ZA', category: 'smartphones' });
    body = res.body;
  });

  it('response contains a products array', () => {
    expect(Array.isArray(body.products)).toBe(true);
  });

  it('every product has an id field (string)', () => {
    for (const p of body.products) {
      expect(typeof p.id).toBe('string');
      expect(p.id.length).toBeGreaterThan(0);
    }
  });

  it('every product has a name field (string)', () => {
    for (const p of body.products) {
      expect(typeof p.name).toBe('string');
      expect(p.name.length).toBeGreaterThan(0);
    }
  });

  it('every product has a price field (number)', () => {
    for (const p of body.products) {
      expect(typeof p.price).toBe('number');
      expect(p.price).toBeGreaterThan(0);
    }
  });

  it('every product has currency=ZAR', () => {
    for (const p of body.products) {
      expect(p.currency).toBe('ZAR');
    }
  });

  it('every product has taxRate=0.15', () => {
    for (const p of body.products) {
      expect(p.taxRate).toBe(0.15);
    }
  });

  it('every product has taxLabel=VAT', () => {
    for (const p of body.products) {
      expect(p.taxLabel).toBe('VAT');
    }
  });

  it('every product has a purchasable boolean field', () => {
    for (const p of body.products) {
      expect(typeof p.purchasable).toBe('boolean');
    }
  });
});

// ---------------------------------------------------------------------------
// AC-3  Six seeded smartphones are returned
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products — six seeded smartphones', () => {
  let app: Application;
  let products: ProductListing[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await fetchCatalog(app, { market: 'ZA', category: 'smartphones' });
    products = body.products;
  });

  it('returns exactly six products for category=smartphones and market=ZA', () => {
    expect(products).toHaveLength(6);
  });

  it('all returned products belong to the smartphones category', () => {
    for (const p of products) {
      expect(p.category.toLowerCase()).toMatch(/smartphone/);
    }
  });

  it('all returned products have ZAR prices greater than zero', () => {
    for (const p of products) {
      expect(p.price).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-4  available=false products are excluded
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products — availability filtering', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('products with available=false for market ZA do not appear in results', async () => {
    const { body } = await fetchCatalog(app, { market: 'ZA', category: 'smartphones' });
    for (const p of body.products) {
      // If the API surfaces an available field it must be true; absence is also acceptable
      if ('available' in p) {
        expect(p.available).not.toBe(false);
      }
    }
  });

  it('products with purchasable=false for market ZA do not appear in results', async () => {
    const { body } = await fetchCatalog(app, { market: 'ZA', category: 'smartphones' });
    for (const p of body.products) {
      expect(p.purchasable).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-5  Filter parameters are respected
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products — filter parameters', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('inStock=true returns only purchasable products', async () => {
    const { body } = await fetchCatalog(app, { market: 'ZA', category: 'smartphones', inStock: 'true' });
    expect(Array.isArray(body.products)).toBe(true);
    for (const p of body.products) {
      expect(p.purchasable).toBe(true);
    }
  });

  it('priceMin filter excludes products below the minimum price', async () => {
    const { body } = await fetchCatalog(app, { market: 'ZA', category: 'smartphones', priceMin: '50000' });
    for (const p of body.products) {
      expect(p.price).toBeGreaterThanOrEqual(50000);
    }
  });

  it('priceMax filter excludes products above the maximum price', async () => {
    const { body } = await fetchCatalog(app, { market: 'ZA', category: 'smartphones', priceMax: '1' });
    // No products should cost <= 1 ZAR
    expect(body.products).toHaveLength(0);
  });

  it('unknown market returns an error status code', async () => {
    const res = await request(app).get('/api/catalog/products').query({ market: 'ZZZZ', category: 'smartphones' });
    expect([400, 404, 422]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// AC-6  Badges are present (5G, Trade-In)
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products — badges', () => {
  let app: Application;
  let products: ProductListing[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await fetchCatalog(app, { market: 'ZA', category: 'smartphones' });
    products = body.products;
  });

  it('at least one product carries a 5G badge', () => {
    const hasFiveG = products.some(
      (p) => Array.isArray(p.badges) && p.badges.some((b) => /5g/i.test(b)),
    );
    expect(hasFiveG).toBe(true);
  });

  it('at least one product carries a Trade-In badge', () => {
    const hasTradeIn = products.some(
      (p) => Array.isArray(p.badges) && p.badges.some((b) => /trade/i.test(b)),
    );
    expect(hasTradeIn).toBe(true);
  });
});
