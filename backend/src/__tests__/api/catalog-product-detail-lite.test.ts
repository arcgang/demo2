import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../app';

/**
 * Acceptance tests for lite-mode flag on GET /api/catalog/products/:id
 *
 * Contract (task spec + LLD §5.3, §3.2):
 *   - ?lite=true (or header Save-Data: on) activates lite mode.
 *   - Lite responses include ONLY essential fields:
 *       productId, name, price, monthlyFrom, availability, category,
 *       storageOptions, colorOptions, planAttachOptions, esim, fiveG, tradeIn
 *   - Lite responses OMIT:
 *       tax/taxBreakdown, spec/metadata marketing copy, recommendedAccessories,
 *       personalizedRecommendations, onboardingRequirements
 *   - Full (non-lite) responses are unchanged.
 */

// ─── response shapes ─────────────────────────────────────────────────────────

interface ProductPrice {
  onceOff?: number;
  recurring?: number;
  currency: string;
}

interface LiteProductDetail {
  productId: string;
  name: string;
  price: ProductPrice;
  monthlyFrom: number;
  availability: string;
  category: string;
  storageOptions: string[];
  colorOptions: string[];
  planAttachOptions: string[];
  esim: boolean;
  fiveG: boolean;
  tradeIn: boolean;
}

interface FullProductDetail {
  productId: string;
  productType?: string;
  name?: string;
  price?: ProductPrice;
  tax?: {
    taxLabel: string;
    taxAmount?: number;
    taxRate?: number;
    inclusive?: boolean;
  };
  spec?: Record<string, unknown>;
  recommendedAccessories?: unknown[];
  onboardingRequirements?: string[];
  personalizedRecommendations?: unknown[];
  compatibleOffers?: unknown[];
  [key: string]: unknown;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function getApp(): Application {
  return createApp();
}

async function getProductDetail(
  app: Application,
  productId: string,
  query: Record<string, string> = {},
  headers: Record<string, string> = {},
): Promise<{ status: number; body: unknown }> {
  let req = request(app)
    .get(`/api/catalog/products/${productId}`)
    .query(query);
  for (const [k, v] of Object.entries(headers)) {
    req = req.set(k, v);
  }
  const res = await req;
  return { status: res.status, body: res.body };
}

async function getFirstDeviceId(app: Application): Promise<string> {
  const res = await request(app)
    .get('/api/catalog/products')
    .query({ market: 'ZA', category: 'devices' });
  const body = res.body as { catalog?: Array<{ productId: string }>; products?: Array<{ productId: string }> };
  const list = body.catalog ?? body.products ?? [];
  if (list.length === 0) throw new Error('No devices seeded for ZA market');
  return list[0].productId;
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-DL1  lite=true returns 200 with product
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products/:id — AC-DL1 lite=true returns 200', () => {
  let app: Application;
  let productId: string;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    productId = await getFirstDeviceId(app);
    result = await getProductDetail(app, productId, { market: 'ZA', lite: 'true' });
  });

  it('returns HTTP 200 for a known product with lite=true', () => {
    expect(result.status).toBe(200);
  });

  it('response body is an object', () => {
    expect(typeof result.body).toBe('object');
    expect(result.body).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DL2  Save-Data: on header activates lite mode on product detail
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products/:id — AC-DL2 Save-Data header activates lite mode', () => {
  let app: Application;
  let productId: string;
  let detail: LiteProductDetail;

  beforeAll(async () => {
    app = getApp();
    productId = await getFirstDeviceId(app);
    const { body } = await getProductDetail(
      app,
      productId,
      { market: 'ZA' },
      { 'Save-Data': 'on' },
    );
    detail = body as LiteProductDetail;
  });

  it('Save-Data: on returns productId', () => {
    expect(typeof detail.productId).toBe('string');
    expect(detail.productId.length).toBeGreaterThan(0);
  });

  it('Save-Data: on omits tax field', () => {
    expect(Object.prototype.hasOwnProperty.call(detail, 'tax')).toBe(false);
  });

  it('Save-Data: on omits spec/metadata marketing copy', () => {
    expect(Object.prototype.hasOwnProperty.call(detail, 'spec')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(detail, 'metadata')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DL3  lite detail essential fields present
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products/:id — AC-DL3 lite detail essential fields', () => {
  let app: Application;
  let productId: string;
  let detail: LiteProductDetail;

  beforeAll(async () => {
    app = getApp();
    productId = await getFirstDeviceId(app);
    const { body } = await getProductDetail(app, productId, { market: 'ZA', lite: 'true' });
    detail = body as LiteProductDetail;
  });

  it('contains productId string', () => {
    expect(typeof detail.productId).toBe('string');
    expect(detail.productId.length).toBeGreaterThan(0);
  });

  it('contains name string', () => {
    expect(typeof detail.name).toBe('string');
    expect(detail.name.length).toBeGreaterThan(0);
  });

  it('contains price with currency', () => {
    expect(typeof detail.price).toBe('object');
    expect(typeof detail.price.currency).toBe('string');
  });

  it('contains numeric monthlyFrom', () => {
    expect(typeof detail.monthlyFrom).toBe('number');
  });

  it('contains non-empty availability string', () => {
    expect(typeof detail.availability).toBe('string');
    expect(detail.availability.length).toBeGreaterThan(0);
  });

  it('contains non-empty category string', () => {
    expect(typeof detail.category).toBe('string');
    expect(detail.category.length).toBeGreaterThan(0);
  });

  it('contains storageOptions array', () => {
    expect(Array.isArray(detail.storageOptions)).toBe(true);
  });

  it('contains colorOptions array', () => {
    expect(Array.isArray(detail.colorOptions)).toBe(true);
  });

  it('contains planAttachOptions array', () => {
    expect(Array.isArray(detail.planAttachOptions)).toBe(true);
  });

  it('contains boolean esim flag', () => {
    expect(typeof detail.esim).toBe('boolean');
  });

  it('contains boolean fiveG flag', () => {
    expect(typeof detail.fiveG).toBe('boolean');
  });

  it('contains boolean tradeIn flag', () => {
    expect(typeof detail.tradeIn).toBe('boolean');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DL4  lite detail omits non-essential fields
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products/:id — AC-DL4 lite detail omits non-essential fields', () => {
  let app: Application;
  let productId: string;
  let detail: LiteProductDetail;

  beforeAll(async () => {
    app = getApp();
    productId = await getFirstDeviceId(app);
    const { body } = await getProductDetail(app, productId, { market: 'ZA', lite: 'true' });
    detail = body as LiteProductDetail;
  });

  it('omits tax field', () => {
    expect(Object.prototype.hasOwnProperty.call(detail, 'tax')).toBe(false);
  });

  it('omits spec/metadata marketing copy', () => {
    expect(Object.prototype.hasOwnProperty.call(detail, 'spec')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(detail, 'metadata')).toBe(false);
  });

  it('omits recommendedAccessories', () => {
    expect(Object.prototype.hasOwnProperty.call(detail, 'recommendedAccessories')).toBe(false);
  });

  it('omits personalizedRecommendations', () => {
    expect(Object.prototype.hasOwnProperty.call(detail, 'personalizedRecommendations')).toBe(false);
  });

  it('omits onboardingRequirements', () => {
    expect(Object.prototype.hasOwnProperty.call(detail, 'onboardingRequirements')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DL5  flag derivation for device
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products/:id — AC-DL5 flag derivation for ZA device', () => {
  let app: Application;
  let detail: LiteProductDetail;

  beforeAll(async () => {
    app = getApp();
    // Use iphone15_128 which has ESIM, 5G badge, and Trade-In Eligible badge
    const { body } = await getProductDetail(
      app,
      'prod_za_iphone15_128',
      { market: 'ZA', lite: 'true' },
    );
    detail = body as LiteProductDetail;
  });

  it('iphone15_128 has fiveG = true (has 5G badge)', () => {
    expect(detail.fiveG).toBe(true);
  });

  it('iphone15_128 has tradeIn = true (has Trade-In Eligible badge)', () => {
    expect(detail.tradeIn).toBe(true);
  });

  it('iphone15_128 has esim = true (simType ESIM in metadata)', () => {
    expect(detail.esim).toBe(true);
  });

  it('iphone15_128 planAttachOptions contains compatible plan IDs', () => {
    expect(detail.planAttachOptions.length).toBeGreaterThan(0);
    expect(detail.planAttachOptions).toContain('plan_za_red_essential_20gb');
  });

  it('iphone15_128 monthlyFrom matches lowest compatible plan recurring price', () => {
    // Lowest ZA plan is Red Essential 20GB at 599
    expect(detail.monthlyFrom).toBe(599);
  });

  it('iphone15_128 storageOptions contains its storage SKU', () => {
    expect(detail.storageOptions).toContain('128GB');
  });

  it('iphone15_128 colorOptions contains its colour', () => {
    expect(detail.colorOptions).toContain('Midnight');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DL6  full (non-lite) product detail response is unaffected
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products/:id — AC-DL6 full response unchanged when lite not set', () => {
  let app: Application;
  let productId: string;
  let detail: FullProductDetail;

  beforeAll(async () => {
    app = getApp();
    productId = await getFirstDeviceId(app);
    const { body } = await getProductDetail(app, productId, { market: 'ZA' });
    detail = body as FullProductDetail;
  });

  it('full detail still contains tax field', () => {
    expect(detail.tax).toBeDefined();
    expect(typeof (detail.tax as { taxLabel: string }).taxLabel).toBe('string');
  });

  it('full detail still contains spec/metadata field', () => {
    expect(detail.spec).toBeDefined();
  });

  it('full detail still contains recommendedAccessories', () => {
    expect(Object.prototype.hasOwnProperty.call(detail, 'recommendedAccessories')).toBe(true);
  });

  it('full detail still contains onboardingRequirements', () => {
    expect(Object.prototype.hasOwnProperty.call(detail, 'onboardingRequirements')).toBe(true);
  });

  it('full detail still contains compatibleOffers', () => {
    expect(Object.prototype.hasOwnProperty.call(detail, 'compatibleOffers')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DL7  404 behaviour is unchanged in lite mode
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products/:id — AC-DL7 404 unchanged in lite mode', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('returns 404 for unknown productId even with lite=true', async () => {
    const { status, body } = await getProductDetail(
      app,
      'prod_does_not_exist',
      { market: 'ZA', lite: 'true' },
    );
    expect(status).toBe(404);
    expect((body as { errorCode: string }).errorCode).toBe('PRODUCT_NOT_FOUND');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DL8  all seeded ZA devices retrievable in lite mode
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products/:id — AC-DL8 all seeded devices retrievable in lite mode', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('each of the seeded ZA device SKUs returns 200 with lite=true', async () => {
    const listRes = await request(app)
      .get('/api/catalog/products')
      .query({ market: 'ZA', category: 'devices' });
    const listBody = listRes.body as { catalog?: Array<{ productId: string }> };
    const devices = listBody.catalog ?? [];
    expect(devices.length).toBeGreaterThanOrEqual(6);

    for (const device of devices.slice(0, 6)) {
      const { status } = await getProductDetail(app, device.productId, { market: 'ZA', lite: 'true' });
      expect(status).toBe(200);
    }
  });
});
