import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for GET /api/catalog/products/:id
 *
 * Contract (task spec + LLD §5.3, §6.1):
 *   - Returns full product spec, localized price in market currency, tax
 *     presentation, and plan options scoped to the market.
 *   - At least three plan options are available for ZA-market device SKUs
 *     (per wireframe_product_detail.html and wireframe_bundle_configuration.html).
 *   - Unknown productId returns 404 with errorCode.
 *   - Market query param scopes compatible plans to that market.
 */

// ─── response shapes ─────────────────────────────────────────────────────────

interface ProductPrice {
  onceOff?: number;
  recurring?: number;
  currency: string;
}

interface TaxPresentation {
  taxLabel: string;
  taxAmount?: number;
  taxRate?: number;
  inclusive?: boolean;
}

interface PlanOption {
  productId: string;
  name: string;
  price: ProductPrice;
}

interface ProductDetail {
  productId: string;
  productType: string;
  name: string;
  price: ProductPrice;
  tax?: TaxPresentation;
  marketAvailability?: string[];
  compatibleOffers?: PlanOption[];
  onboardingRequirements?: string[];
  recommendedAccessories?: unknown[];
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

async function getProductDetail(
  app: Application,
  productId: string,
  query: Record<string, string> = {},
): Promise<{ status: number; body: unknown }> {
  const res = await request(app)
    .get(`/api/catalog/products/${productId}`)
    .query(query);
  return { status: res.status, body: res.body };
}

async function getFirstDeviceId(app: Application): Promise<string> {
  const res = await request(app)
    .get('/api/catalog/products')
    .query({ market: 'ZA', category: 'devices' });
  const body = res.body as { catalog?: Array<{ productId: string }>; products?: Array<{ productId: string }> };
  const products = body.catalog ?? body.products ?? [];
  if (products.length === 0) throw new Error('No ZA devices seeded');
  return products[0].productId;
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  200 response shape for a known ZA device
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products/:id — AC-1 200 shape for known device', () => {
  let app: Application;
  let productId: string;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    productId = await getFirstDeviceId(app);
    result = await getProductDetail(app, productId, { market: 'ZA' });
  });

  it('returns HTTP 200 for a known product with ZA market', () => {
    expect(result.status).toBe(200);
  });

  it('response body is a non-null object', () => {
    expect(typeof result.body).toBe('object');
    expect(result.body).not.toBeNull();
  });

  it('response includes productId matching the requested id', () => {
    const detail = result.body as ProductDetail;
    expect(detail.productId).toBe(productId);
  });

  it('response includes productType as a non-empty string', () => {
    const detail = result.body as ProductDetail;
    expect(typeof detail.productType).toBe('string');
    expect(detail.productType.trim().length).toBeGreaterThan(0);
  });

  it('response includes name as a non-empty string', () => {
    const detail = result.body as ProductDetail;
    expect(typeof detail.name).toBe('string');
    expect(detail.name.trim().length).toBeGreaterThan(0);
  });

  it('response includes a price object', () => {
    const detail = result.body as ProductDetail;
    expect(typeof detail.price).toBe('object');
    expect(detail.price).not.toBeNull();
  });

  it('price currency is ZAR for ZA market', () => {
    const detail = result.body as ProductDetail;
    expect(detail.price.currency).toBe('ZAR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  Tax presentation on detail page
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products/:id — AC-2 tax presentation', () => {
  let app: Application;
  let productId: string;
  let detail: ProductDetail;

  beforeAll(async () => {
    app = getApp();
    productId = await getFirstDeviceId(app);
    const { body } = await getProductDetail(app, productId, { market: 'ZA' });
    detail = body as ProductDetail;
  });

  it('detail response includes a tax field', () => {
    expect(detail.tax).toBeDefined();
  });

  it('tax.taxLabel is a non-empty string', () => {
    expect(typeof detail.tax?.taxLabel).toBe('string');
    expect((detail.tax?.taxLabel ?? '').trim().length).toBeGreaterThan(0);
  });

  it('tax label for ZA is VAT', () => {
    expect(detail.tax?.taxLabel).toBe('VAT');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  compatibleOffers / plan options scoped to market
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products/:id — AC-3 compatibleOffers plan options', () => {
  let app: Application;
  let productId: string;
  let detail: ProductDetail;

  beforeAll(async () => {
    app = getApp();
    productId = await getFirstDeviceId(app);
    const { body } = await getProductDetail(app, productId, { market: 'ZA' });
    detail = body as ProductDetail;
  });

  it('response includes a compatibleOffers array', () => {
    expect(Array.isArray(detail.compatibleOffers)).toBe(true);
  });

  it('at least three plan options are available for a ZA device', () => {
    expect((detail.compatibleOffers ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('each plan option has a productId string', () => {
    for (const plan of detail.compatibleOffers ?? []) {
      expect(typeof plan.productId).toBe('string');
      expect(plan.productId.trim().length).toBeGreaterThan(0);
    }
  });

  it('each plan option has a name string', () => {
    for (const plan of detail.compatibleOffers ?? []) {
      expect(typeof plan.name).toBe('string');
      expect(plan.name.trim().length).toBeGreaterThan(0);
    }
  });

  it('each plan option price uses ZAR currency for ZA market', () => {
    for (const plan of detail.compatibleOffers ?? []) {
      expect(plan.price.currency).toBe('ZAR');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  marketAvailability includes ZA for seeded devices
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products/:id — AC-4 marketAvailability', () => {
  let app: Application;
  let productId: string;
  let detail: ProductDetail;

  beforeAll(async () => {
    app = getApp();
    productId = await getFirstDeviceId(app);
    const { body } = await getProductDetail(app, productId, { market: 'ZA' });
    detail = body as ProductDetail;
  });

  it('marketAvailability is an array when present', () => {
    if (detail.marketAvailability !== undefined) {
      expect(Array.isArray(detail.marketAvailability)).toBe(true);
    }
  });

  it('marketAvailability includes ZA for a ZA-seeded device', () => {
    if (detail.marketAvailability) {
      expect(detail.marketAvailability).toContain('ZA');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  404 for unknown product id
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products/:id — AC-5 404 for unknown product', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 404 for an unknown productId', async () => {
    const { status } = await getProductDetail(app, 'prod-does-not-exist-xyz', { market: 'ZA' });
    expect(status).toBe(404);
  });

  it('404 response includes an errorCode', async () => {
    const { body } = await getProductDetail(app, 'prod-does-not-exist-xyz', { market: 'ZA' });
    const err = body as ErrorResponse;
    expect(typeof err.errorCode).toBe('string');
    expect(err.errorCode.trim().length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6  Endpoint reachability
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products/:id — AC-6 endpoint reachability', () => {
  let app: Application;
  let productId: string;

  beforeAll(async () => {
    app = getApp();
    productId = await getFirstDeviceId(app);
  });

  it('endpoint does not return 404 for a known product', async () => {
    const { status } = await getProductDetail(app, productId, { market: 'ZA' });
    expect(status).not.toBe(404);
  });

  it('endpoint does not return 500 for a known product', async () => {
    const { status } = await getProductDetail(app, productId, { market: 'ZA' });
    expect(status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-7  All six seeded device SKUs are individually retrievable
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products/:id — AC-7 all seeded devices retrievable', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('each of the seeded device SKUs returns 200 with market=ZA', async () => {
    const listRes = await request(app)
      .get('/api/catalog/products')
      .query({ market: 'ZA', category: 'devices' });
    const listBody = listRes.body as { catalog?: Array<{ productId: string }>; products?: Array<{ productId: string }> };
    const devices = listBody.catalog ?? listBody.products ?? [];
    expect(devices.length).toBeGreaterThanOrEqual(6);

    for (const device of devices.slice(0, 6)) {
      const { status } = await getProductDetail(app, device.productId, { market: 'ZA' });
      expect(status).toBe(200);
    }
  });
});
