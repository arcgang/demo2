import request from 'supertest';
import express, { Application } from 'express';

/**
 * Acceptance tests for GET /api/catalog/products/:id
 *
 * Contract (task §6):
 *   GET /api/catalog/products/:id?market=ZA
 *     - Returns a single product with localized price, currency, taxRate, purchasable
 *     - Includes a plans list: three seeded plans
 *         Red 5GB        R299/mo
 *         Unlimited 20GB R799/mo
 *         Red Premium    R299/mo
 *     - Includes recommendedAccessories array
 *     - 404 for unknown product id
 *     - 400/404 for unknown market
 */

interface Plan {
  id: string;
  name: string;
  dataAllowance?: string;
  monthlyPrice: number;
  currency: string;
}

interface Accessory {
  id: string;
  name: string;
}

interface ProductDetail {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  taxRate: number;
  taxLabel: string;
  purchasable: boolean;
  plans: Plan[];
  recommendedAccessories: Accessory[];
}

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

async function fetchProduct(
  app: Application,
  id: string,
  market: string,
): Promise<{ status: number; body: ProductDetail }> {
  const res = await request(app)
    .get(`/api/catalog/products/${id}`)
    .query({ market });
  return { status: res.status, body: res.body as ProductDetail };
}

// ---------------------------------------------------------------------------
// AC-1  Retrieve a known seeded product
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products/:id — basic retrieval', () => {
  let app: Application;
  let firstProductId: string;

  beforeAll(async () => {
    app = getApp();
    // Discover a valid product id from the catalog list endpoint
    const listRes = await request(app)
      .get('/api/catalog/products')
      .query({ market: 'ZA', category: 'smartphones' });
    const products = listRes.body.products as Array<{ id: string }>;
    expect(products.length).toBeGreaterThan(0);
    firstProductId = products[0].id;
  });

  it('returns HTTP 200 for a known product with market=ZA', async () => {
    const { status } = await fetchProduct(app, firstProductId, 'ZA');
    expect(status).toBe(200);
  });

  it('returns 404 for an unknown product id', async () => {
    const res = await request(app)
      .get('/api/catalog/products/nonexistent-product-xyz')
      .query({ market: 'ZA' });
    expect(res.status).toBe(404);
  });

  it('returns 400 or 404 when market param is missing', async () => {
    const res = await request(app).get(`/api/catalog/products/${firstProductId}`);
    expect([400, 404, 422]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// AC-2  Product detail response shape
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products/:id — response shape', () => {
  let app: Application;
  let product: ProductDetail;

  beforeAll(async () => {
    app = getApp();
    const listRes = await request(app)
      .get('/api/catalog/products')
      .query({ market: 'ZA', category: 'smartphones' });
    const products = listRes.body.products as Array<{ id: string }>;
    const { body } = await fetchProduct(app, products[0].id, 'ZA');
    product = body;
  });

  it('response has an id field (string)', () => {
    expect(typeof product.id).toBe('string');
    expect(product.id.length).toBeGreaterThan(0);
  });

  it('response has a name field (string)', () => {
    expect(typeof product.name).toBe('string');
    expect(product.name.length).toBeGreaterThan(0);
  });

  it('response has a price field (number > 0)', () => {
    expect(typeof product.price).toBe('number');
    expect(product.price).toBeGreaterThan(0);
  });

  it('response has currency=ZAR', () => {
    expect(product.currency).toBe('ZAR');
  });

  it('response has taxRate=0.15', () => {
    expect(product.taxRate).toBe(0.15);
  });

  it('response has taxLabel=VAT', () => {
    expect(product.taxLabel).toBe('VAT');
  });

  it('response has a purchasable boolean', () => {
    expect(typeof product.purchasable).toBe('boolean');
  });

  it('response has a plans array', () => {
    expect(Array.isArray(product.plans)).toBe(true);
  });

  it('response has a recommendedAccessories array', () => {
    expect(Array.isArray(product.recommendedAccessories)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-3  Three seeded plans are present with correct prices
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products/:id — seeded plans', () => {
  let app: Application;
  let plans: Plan[];

  beforeAll(async () => {
    app = getApp();
    const listRes = await request(app)
      .get('/api/catalog/products')
      .query({ market: 'ZA', category: 'smartphones' });
    const products = listRes.body.products as Array<{ id: string }>;
    const { body } = await fetchProduct(app, products[0].id, 'ZA');
    plans = body.plans;
  });

  it('product has exactly three plans', () => {
    expect(plans).toHaveLength(3);
  });

  it('each plan has an id (string)', () => {
    for (const plan of plans) {
      expect(typeof plan.id).toBe('string');
      expect(plan.id.length).toBeGreaterThan(0);
    }
  });

  it('each plan has a name (string)', () => {
    for (const plan of plans) {
      expect(typeof plan.name).toBe('string');
      expect(plan.name.length).toBeGreaterThan(0);
    }
  });

  it('each plan has a monthlyPrice (number > 0)', () => {
    for (const plan of plans) {
      expect(typeof plan.monthlyPrice).toBe('number');
      expect(plan.monthlyPrice).toBeGreaterThan(0);
    }
  });

  it('each plan has currency=ZAR', () => {
    for (const plan of plans) {
      expect(plan.currency).toBe('ZAR');
    }
  });

  it('one plan is named "Red 5GB" with monthlyPrice=299', () => {
    const plan = plans.find((p) => /red\s*5gb/i.test(p.name));
    expect(plan).toBeDefined();
    expect(plan!.monthlyPrice).toBe(299);
  });

  it('one plan is named "Unlimited 20GB" with monthlyPrice=799', () => {
    const plan = plans.find((p) => /unlimited\s*20gb/i.test(p.name));
    expect(plan).toBeDefined();
    expect(plan!.monthlyPrice).toBe(799);
  });

  it('one plan is named "Red Premium" with monthlyPrice=299', () => {
    const plan = plans.find((p) => /red\s*premium/i.test(p.name));
    expect(plan).toBeDefined();
    expect(plan!.monthlyPrice).toBe(299);
  });
});

// ---------------------------------------------------------------------------
// AC-4  recommendedAccessories
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products/:id — recommendedAccessories', () => {
  let app: Application;
  let accessories: Accessory[];

  beforeAll(async () => {
    app = getApp();
    const listRes = await request(app)
      .get('/api/catalog/products')
      .query({ market: 'ZA', category: 'smartphones' });
    const products = listRes.body.products as Array<{ id: string }>;
    const { body } = await fetchProduct(app, products[0].id, 'ZA');
    accessories = body.recommendedAccessories;
  });

  it('recommendedAccessories is an array', () => {
    expect(Array.isArray(accessories)).toBe(true);
  });

  it('each accessory has an id field', () => {
    for (const a of accessories) {
      expect(typeof a.id).toBe('string');
    }
  });

  it('each accessory has a name field', () => {
    for (const a of accessories) {
      expect(typeof a.name).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// AC-5  Market context resolution via query param
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products/:id — market context', () => {
  let app: Application;
  let firstProductId: string;

  beforeAll(async () => {
    app = getApp();
    const listRes = await request(app)
      .get('/api/catalog/products')
      .query({ market: 'ZA', category: 'smartphones' });
    const products = listRes.body.products as Array<{ id: string }>;
    firstProductId = products[0].id;
  });

  it('returns 400/404 for an unknown market code', async () => {
    const res = await request(app)
      .get(`/api/catalog/products/${firstProductId}`)
      .query({ market: 'XX' });
    expect([400, 404, 422]).toContain(res.status);
  });

  it('ZA product detail carries taxRate=0.15', async () => {
    const { body } = await fetchProduct(app, firstProductId, 'ZA');
    expect(body.taxRate).toBe(0.15);
  });

  it('ZA product detail carries taxLabel=VAT', async () => {
    const { body } = await fetchProduct(app, firstProductId, 'ZA');
    expect(body.taxLabel).toBe('VAT');
  });
});
