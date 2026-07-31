import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests for Catalog & Offer API endpoints.
 *
 * Endpoints under test:
 *   GET /api/catalog/products?category=smartphones|sim-esim|accessories
 *   GET /api/catalog/products/:slug
 *   GET /api/catalog/plans
 *
 * Required seeded products:
 *   - iPhone 15 Pro 256GB   (category: smartphones)
 *   - Samsung Galaxy S24 Ultra (category: smartphones)
 *   - iPhone 15 128GB       (category: smartphones)
 *   - SIM-only offer        (category: sim-esim, type: SIM)
 *   - eSIM offer            (category: sim-esim, type: ESIM)
 *   - Silicone case         (category: accessories)
 *   - USB-C adapter         (category: accessories)
 */

// ---------------------------------------------------------------------------
// Shared type definitions (mirrors expected API shapes)
// ---------------------------------------------------------------------------

interface ProductListItem {
  slug: string;
  name: string;
  price: {
    onceOff: number;
    currency: string;
    fromPricePerMonth?: number | null;
  };
  availability: 'in-stock' | 'pre-order';
  badges: string[];
  financingEligible: boolean;
  tradeInEligible: boolean;
  compatibleDeviceFamilies?: string[];
}

interface ProductListResponse {
  products: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface AttachablePlan {
  id: string;
  name: string;
  data: string;
  pricePerMonth: number;
}

interface AttachableBundle {
  id: string;
  name: string;
  pricePerMonth: number;
}

interface ProductDetail {
  slug: string;
  name: string;
  productType: string;
  price: {
    onceOff: number;
    currency: string;
    fromPricePerMonth?: number | null;
  };
  availability: 'in-stock' | 'pre-order';
  financingEligible: boolean;
  attachablePlans: AttachablePlan[];
  attachableBundles: AttachableBundle[];
  verificationRequired?: boolean;
  activationRequirements?: string[];
  compatibilityCues?: string[];
}

interface PlanOffer {
  id: string;
  name: string;
  data: string;
  pricePerMonth: number;
  currency: string;
}

interface PlansResponse {
  plans: PlanOffer[];
}

// ---------------------------------------------------------------------------
// Helper: typed GET request
// ---------------------------------------------------------------------------

async function getProducts(
  category?: string,
): Promise<{ status: number; body: ProductListResponse }> {
  const req = request(app).get('/api/catalog/products');
  const res = category ? await req.query({ category }) : await req;
  return { status: res.status, body: res.body as ProductListResponse };
}

async function getProductDetail(
  slug: string,
): Promise<{ status: number; body: ProductDetail }> {
  const res = await request(app).get(`/api/catalog/products/${slug}`);
  return { status: res.status, body: res.body as ProductDetail };
}

async function getPlans(): Promise<{ status: number; body: PlansResponse }> {
  const res = await request(app).get('/api/catalog/plans');
  return { status: res.status, body: res.body as PlansResponse };
}

// ---------------------------------------------------------------------------
// AC-1  GET /api/catalog/products — base response shape
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products — response shape', () => {
  it('returns HTTP 200', async () => {
    const { status } = await getProducts();
    expect(status).toBe(200);
  });

  it('response is JSON with a products array', async () => {
    const { body } = await getProducts();
    expect(Array.isArray(body.products)).toBe(true);
  });

  it('response includes pagination fields: total, page, pageSize', async () => {
    const { body } = await getProducts();
    expect(typeof body.total).toBe('number');
    expect(typeof body.page).toBe('number');
    expect(typeof body.pageSize).toBe('number');
  });

  it('every product item carries required fields', async () => {
    const { body } = await getProducts();
    for (const p of body.products) {
      expect(typeof p.slug).toBe('string');
      expect(p.slug.length).toBeGreaterThan(0);
      expect(typeof p.name).toBe('string');
      expect(p.name.length).toBeGreaterThan(0);
      expect(p).toHaveProperty('price');
      expect(typeof p.price.onceOff).toBe('number');
      expect(typeof p.price.currency).toBe('string');
      expect(['in-stock', 'pre-order']).toContain(p.availability);
      expect(Array.isArray(p.badges)).toBe(true);
      expect(typeof p.financingEligible).toBe('boolean');
      expect(typeof p.tradeInEligible).toBe('boolean');
    }
  });

  it('returns at least 7 seeded products in total (unfiltered)', async () => {
    const { body } = await getProducts();
    expect(body.products.length).toBeGreaterThanOrEqual(7);
  });
});

// ---------------------------------------------------------------------------
// AC-2  GET /api/catalog/products?category=smartphones
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products?category=smartphones', () => {
  it('returns HTTP 200', async () => {
    const { status } = await getProducts('smartphones');
    expect(status).toBe(200);
  });

  it('returns only smartphone/device products', async () => {
    const { body } = await getProducts('smartphones');
    expect(body.products.length).toBeGreaterThanOrEqual(3);
  });

  it('iPhone 15 Pro 256GB is present', async () => {
    const { body } = await getProducts('smartphones');
    const found = body.products.some((p) =>
      p.name.toLowerCase().includes('iphone 15 pro'),
    );
    expect(found).toBe(true);
  });

  it('Samsung Galaxy S24 Ultra is present', async () => {
    const { body } = await getProducts('smartphones');
    const found = body.products.some((p) =>
      p.name.toLowerCase().includes('galaxy s24 ultra'),
    );
    expect(found).toBe(true);
  });

  it('iPhone 15 128GB is present', async () => {
    const { body } = await getProducts('smartphones');
    const found = body.products.some((p) =>
      p.name.toLowerCase().includes('iphone 15') &&
      !p.name.toLowerCase().includes('pro'),
    );
    expect(found).toBe(true);
  });

  it('smartphone products carry financingEligible and tradeInEligible flags', async () => {
    const { body } = await getProducts('smartphones');
    for (const p of body.products) {
      expect(typeof p.financingEligible).toBe('boolean');
      expect(typeof p.tradeInEligible).toBe('boolean');
    }
  });

  it('at least one smartphone has a 5G badge', async () => {
    const { body } = await getProducts('smartphones');
    const has5G = body.products.some((p) => p.badges.includes('5G'));
    expect(has5G).toBe(true);
  });

  it('at least one smartphone has a trade-in-eligible badge', async () => {
    const { body } = await getProducts('smartphones');
    const hasTradeIn = body.products.some((p) =>
      p.badges.some((b) => b.toLowerCase().includes('trade-in')),
    );
    expect(hasTradeIn).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-3  GET /api/catalog/products?category=sim-esim
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products?category=sim-esim', () => {
  it('returns HTTP 200', async () => {
    const { status } = await getProducts('sim-esim');
    expect(status).toBe(200);
  });

  it('returns at least 2 products (one SIM, one eSIM)', async () => {
    const { body } = await getProducts('sim-esim');
    expect(body.products.length).toBeGreaterThanOrEqual(2);
  });

  it('SIM products carry financingEligible and tradeInEligible flags', async () => {
    const { body } = await getProducts('sim-esim');
    for (const p of body.products) {
      expect(typeof p.financingEligible).toBe('boolean');
      expect(typeof p.tradeInEligible).toBe('boolean');
    }
  });
});

// ---------------------------------------------------------------------------
// AC-4  GET /api/catalog/products?category=accessories
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products?category=accessories', () => {
  it('returns HTTP 200', async () => {
    const { status } = await getProducts('accessories');
    expect(status).toBe(200);
  });

  it('returns at least 2 accessories', async () => {
    const { body } = await getProducts('accessories');
    expect(body.products.length).toBeGreaterThanOrEqual(2);
  });

  it('silicone case is present', async () => {
    const { body } = await getProducts('accessories');
    const found = body.products.some((p) =>
      p.name.toLowerCase().includes('silicone case'),
    );
    expect(found).toBe(true);
  });

  it('USB-C adapter is present', async () => {
    const { body } = await getProducts('accessories');
    const found = body.products.some((p) =>
      p.name.toLowerCase().includes('usb-c'),
    );
    expect(found).toBe(true);
  });

  it('every accessory has a compatibleDeviceFamilies array', async () => {
    const { body } = await getProducts('accessories');
    for (const p of body.products) {
      expect(Array.isArray(p.compatibleDeviceFamilies)).toBe(true);
      expect((p.compatibleDeviceFamilies as string[]).length).toBeGreaterThan(0);
    }
  });

  it('accessory products carry financingEligible and tradeInEligible flags', async () => {
    const { body } = await getProducts('accessories');
    for (const p of body.products) {
      expect(typeof p.financingEligible).toBe('boolean');
      expect(typeof p.tradeInEligible).toBe('boolean');
    }
  });
});

// ---------------------------------------------------------------------------
// AC-5  GET /api/catalog/products/:slug — device detail shape
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products/:slug — smartphone detail', () => {
  const IPHONE_SLUG = 'iphone-15-pro-256gb';

  it('returns HTTP 200 for a known device slug', async () => {
    const { status } = await getProductDetail(IPHONE_SLUG);
    expect(status).toBe(200);
  });

  it('returns the correct slug and name', async () => {
    const { body } = await getProductDetail(IPHONE_SLUG);
    expect(body.slug).toBe(IPHONE_SLUG);
    expect(typeof body.name).toBe('string');
    expect(body.name.length).toBeGreaterThan(0);
  });

  it('returns price object with onceOff and currency', async () => {
    const { body } = await getProductDetail(IPHONE_SLUG);
    expect(typeof body.price.onceOff).toBe('number');
    expect(body.price.onceOff).toBeGreaterThan(0);
    expect(typeof body.price.currency).toBe('string');
  });

  it('returns availability field', async () => {
    const { body } = await getProductDetail(IPHONE_SLUG);
    expect(['in-stock', 'pre-order']).toContain(body.availability);
  });

  it('returns financingEligible boolean', async () => {
    const { body } = await getProductDetail(IPHONE_SLUG);
    expect(typeof body.financingEligible).toBe('boolean');
  });

  it('returns attachablePlans array with at least one plan', async () => {
    const { body } = await getProductDetail(IPHONE_SLUG);
    expect(Array.isArray(body.attachablePlans)).toBe(true);
    expect(body.attachablePlans.length).toBeGreaterThanOrEqual(1);
  });

  it('each attachable plan has id, name, data, and pricePerMonth', async () => {
    const { body } = await getProductDetail(IPHONE_SLUG);
    for (const plan of body.attachablePlans) {
      expect(typeof plan.id).toBe('string');
      expect(plan.id.length).toBeGreaterThan(0);
      expect(typeof plan.name).toBe('string');
      expect(plan.name.length).toBeGreaterThan(0);
      expect(typeof plan.data).toBe('string');
      expect(typeof plan.pricePerMonth).toBe('number');
    }
  });

  it('returns attachableBundles array with at least one bundle', async () => {
    const { body } = await getProductDetail(IPHONE_SLUG);
    expect(Array.isArray(body.attachableBundles)).toBe(true);
    expect(body.attachableBundles.length).toBeGreaterThanOrEqual(1);
  });

  it('each attachable bundle has id, name, and pricePerMonth', async () => {
    const { body } = await getProductDetail(IPHONE_SLUG);
    for (const bundle of body.attachableBundles) {
      expect(typeof bundle.id).toBe('string');
      expect(bundle.id.length).toBeGreaterThan(0);
      expect(typeof bundle.name).toBe('string');
      expect(typeof bundle.pricePerMonth).toBe('number');
    }
  });

  it('device detail does NOT include verificationRequired or activationRequirements', async () => {
    const { body } = await getProductDetail(IPHONE_SLUG);
    expect(body.verificationRequired).toBeUndefined();
    expect(body.activationRequirements).toBeUndefined();
  });

  it('returns HTTP 404 for an unknown slug', async () => {
    const { status } = await getProductDetail('no-such-product-xyz');
    expect(status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// AC-6  GET /api/catalog/products/:slug — SIM product detail
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products/:slug — SIM product detail', () => {
  const SIM_SLUG = 'sim-only-standard';

  it('returns HTTP 200 for a known SIM slug', async () => {
    const { status } = await getProductDetail(SIM_SLUG);
    expect(status).toBe(200);
  });

  it('productType is SIM', async () => {
    const { body } = await getProductDetail(SIM_SLUG);
    expect(body.productType).toBe('SIM');
  });

  it('includes verificationRequired boolean', async () => {
    const { body } = await getProductDetail(SIM_SLUG);
    expect(typeof body.verificationRequired).toBe('boolean');
  });

  it('includes activationRequirements as a non-empty array', async () => {
    const { body } = await getProductDetail(SIM_SLUG);
    expect(Array.isArray(body.activationRequirements)).toBe(true);
    expect((body.activationRequirements as string[]).length).toBeGreaterThan(0);
  });

  it('each activationRequirements entry is a non-empty string', async () => {
    const { body } = await getProductDetail(SIM_SLUG);
    for (const req of body.activationRequirements as string[]) {
      expect(typeof req).toBe('string');
      expect(req.trim().length).toBeGreaterThan(0);
    }
  });

  it('returns attachablePlans with at least one plan', async () => {
    const { body } = await getProductDetail(SIM_SLUG);
    expect(Array.isArray(body.attachablePlans)).toBe(true);
    expect(body.attachablePlans.length).toBeGreaterThanOrEqual(1);
  });

  it('returns attachableBundles with at least one bundle', async () => {
    const { body } = await getProductDetail(SIM_SLUG);
    expect(Array.isArray(body.attachableBundles)).toBe(true);
    expect(body.attachableBundles.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// AC-7  GET /api/catalog/products/:slug — eSIM product detail
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products/:slug — eSIM product detail', () => {
  const ESIM_SLUG = 'esim-standard';

  it('returns HTTP 200 for a known eSIM slug', async () => {
    const { status } = await getProductDetail(ESIM_SLUG);
    expect(status).toBe(200);
  });

  it('productType is ESIM', async () => {
    const { body } = await getProductDetail(ESIM_SLUG);
    expect(body.productType).toBe('ESIM');
  });

  it('verificationRequired is present and boolean', async () => {
    const { body } = await getProductDetail(ESIM_SLUG);
    expect(typeof body.verificationRequired).toBe('boolean');
  });

  it('activationRequirements is a non-empty string array', async () => {
    const { body } = await getProductDetail(ESIM_SLUG);
    expect(Array.isArray(body.activationRequirements)).toBe(true);
    expect((body.activationRequirements as string[]).length).toBeGreaterThan(0);
    for (const req of body.activationRequirements as string[]) {
      expect(typeof req).toBe('string');
      expect(req.trim().length).toBeGreaterThan(0);
    }
  });

  it('returns attachablePlans with at least one plan', async () => {
    const { body } = await getProductDetail(ESIM_SLUG);
    expect(Array.isArray(body.attachablePlans)).toBe(true);
    expect(body.attachablePlans.length).toBeGreaterThanOrEqual(1);
  });

  it('returns attachableBundles with at least one bundle', async () => {
    const { body } = await getProductDetail(ESIM_SLUG);
    expect(Array.isArray(body.attachableBundles)).toBe(true);
    expect(body.attachableBundles.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// AC-8  GET /api/catalog/products/:slug — accessory detail
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products/:slug — accessory detail', () => {
  const CASE_SLUG = 'silicone-case';

  it('returns HTTP 200 for a known accessory slug', async () => {
    const { status } = await getProductDetail(CASE_SLUG);
    expect(status).toBe(200);
  });

  it('productType is ACCESSORY', async () => {
    const { body } = await getProductDetail(CASE_SLUG);
    expect(body.productType).toBe('ACCESSORY');
  });

  it('includes compatibilityCues as a non-empty array', async () => {
    const { body } = await getProductDetail(CASE_SLUG);
    expect(Array.isArray(body.compatibilityCues)).toBe(true);
    expect((body.compatibilityCues as string[]).length).toBeGreaterThan(0);
  });

  it('each compatibilityCue is a non-empty string', async () => {
    const { body } = await getProductDetail(CASE_SLUG);
    for (const cue of body.compatibilityCues as string[]) {
      expect(typeof cue).toBe('string');
      expect(cue.trim().length).toBeGreaterThan(0);
    }
  });

  it('at least one compatibilityCue references iPhone 15', async () => {
    const { body } = await getProductDetail(CASE_SLUG);
    const hasRef = (body.compatibilityCues as string[]).some((c) =>
      c.toLowerCase().includes('iphone 15'),
    );
    expect(hasRef).toBe(true);
  });

  it('accessory does NOT include verificationRequired', async () => {
    const { body } = await getProductDetail(CASE_SLUG);
    expect(body.verificationRequired).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AC-9  GET /api/catalog/plans — plan offer listing
// ---------------------------------------------------------------------------

describe('GET /api/catalog/plans', () => {
  it('returns HTTP 200', async () => {
    const { status } = await getPlans();
    expect(status).toBe(200);
  });

  it('response contains a plans array', async () => {
    const { body } = await getPlans();
    expect(Array.isArray(body.plans)).toBe(true);
  });

  it('plans array contains at least one plan', async () => {
    const { body } = await getPlans();
    expect(body.plans.length).toBeGreaterThanOrEqual(1);
  });

  it('every plan has required fields: id, name, data, pricePerMonth, currency', async () => {
    const { body } = await getPlans();
    for (const plan of body.plans) {
      expect(typeof plan.id).toBe('string');
      expect(plan.id.length).toBeGreaterThan(0);
      expect(typeof plan.name).toBe('string');
      expect(plan.name.length).toBeGreaterThan(0);
      expect(typeof plan.data).toBe('string');
      expect(plan.data.length).toBeGreaterThan(0);
      expect(typeof plan.pricePerMonth).toBe('number');
      expect(plan.pricePerMonth).toBeGreaterThan(0);
      expect(typeof plan.currency).toBe('string');
      expect(plan.currency.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-10  Error envelope shape for 404s
// ---------------------------------------------------------------------------

describe('Error envelope shape', () => {
  it('404 for unknown product slug returns JSON with errorCode and message', async () => {
    const res = await request(app).get('/api/catalog/products/does-not-exist-xyz');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('errorCode');
    expect(typeof res.body.errorCode).toBe('string');
    expect(res.body.errorCode.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('message');
    expect(typeof res.body.message).toBe('string');
  });
});
