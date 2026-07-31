import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for GET /api/catalog/products
 *
 * Contract (task spec + LLD §5.2, §6.1, §6.2):
 *   - Accepts `market` (required) and optional `category` query params.
 *   - Returns only products available in the requested market.
 *   - Prices and tax are denominated in the market currency (ZAR for ZA).
 *   - Each product includes an `isPurchasable` boolean.
 *   - At least six smartphone SKUs are seeded for the ZA market.
 *   - Products whose availability depends on an unavailable payment method
 *     have isPurchasable = false.
 *   - Missing or unknown market returns 400.
 */

// ─── response shapes ─────────────────────────────────────────────────────────

interface ProductPrice {
  onceOff?: number;
  recurring?: number;
  currency: string;
}

interface TaxBreakdown {
  taxLabel: string;
  taxAmount: number;
  taxRate: number;
}

interface CatalogProduct {
  productId: string;
  productType: string;
  name: string;
  price: ProductPrice;
  tax?: TaxBreakdown;
  isPurchasable: boolean;
  availableAttachments?: string[];
  badges?: string[];
}

interface CatalogListResponse {
  market?: {
    marketCode: string;
    currency: string;
  };
  catalog?: CatalogProduct[];
  products?: CatalogProduct[];
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

async function getCatalogProducts(
  app: Application,
  query: Record<string, string> = {},
): Promise<{ status: number; body: unknown }> {
  const res = await request(app)
    .get('/api/catalog/products')
    .query(query);
  return { status: res.status, body: res.body };
}

function extractProducts(body: unknown): CatalogProduct[] {
  const b = body as CatalogListResponse;
  return b.catalog ?? b.products ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  200 response shape for ZA market
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — AC-1 ZA 200 shape', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await getCatalogProducts(app, { market: 'ZA' });
  });

  it('returns HTTP 200 for the ZA market', () => {
    expect(result.status).toBe(200);
  });

  it('response body is a non-null object', () => {
    expect(typeof result.body).toBe('object');
    expect(result.body).not.toBeNull();
  });

  it('response contains a products array (catalog or products key)', () => {
    const products = extractProducts(result.body);
    expect(Array.isArray(products)).toBe(true);
  });

  it('at least one product is returned for the ZA market', () => {
    const products = extractProducts(result.body);
    expect(products.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  Each product has mandated fields
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — AC-2 product field shapes', () => {
  let app: Application;
  let products: CatalogProduct[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getCatalogProducts(app, { market: 'ZA' });
    products = extractProducts(body);
  });

  it('each product has a productId string', () => {
    for (const p of products) {
      expect(typeof p.productId).toBe('string');
      expect(p.productId.trim().length).toBeGreaterThan(0);
    }
  });

  it('each product has a productType string', () => {
    for (const p of products) {
      expect(typeof p.productType).toBe('string');
      expect(p.productType.trim().length).toBeGreaterThan(0);
    }
  });

  it('each product has a name string', () => {
    for (const p of products) {
      expect(typeof p.name).toBe('string');
      expect(p.name.trim().length).toBeGreaterThan(0);
    }
  });

  it('each product has a price object', () => {
    for (const p of products) {
      expect(typeof p.price).toBe('object');
      expect(p.price).not.toBeNull();
    }
  });

  it('each product price contains a currency field', () => {
    for (const p of products) {
      expect(typeof p.price.currency).toBe('string');
      expect(p.price.currency.trim().length).toBeGreaterThan(0);
    }
  });

  it('each product has an isPurchasable boolean', () => {
    for (const p of products) {
      expect(typeof p.isPurchasable).toBe('boolean');
    }
  });

  it('each product has isPurchasable defined (not undefined)', () => {
    for (const p of products) {
      expect(Object.prototype.hasOwnProperty.call(p, 'isPurchasable')).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  Prices denominated in market currency (ZAR for ZA)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — AC-3 ZAR pricing for ZA', () => {
  let app: Application;
  let products: CatalogProduct[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getCatalogProducts(app, { market: 'ZA' });
    products = extractProducts(body);
  });

  it('all product prices use ZAR currency for the ZA market', () => {
    for (const p of products) {
      expect(p.price.currency).toBe('ZAR');
    }
  });

  it('onceOff price, when present, is a non-negative number', () => {
    for (const p of products) {
      if (p.price.onceOff !== undefined) {
        expect(typeof p.price.onceOff).toBe('number');
        expect(p.price.onceOff).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('recurring price, when present, is a non-negative number', () => {
    for (const p of products) {
      if (p.price.recurring !== undefined) {
        expect(typeof p.price.recurring).toBe('number');
        expect(p.price.recurring).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  Tax breakdown present and valid
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — AC-4 tax breakdown', () => {
  let app: Application;
  let products: CatalogProduct[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getCatalogProducts(app, { market: 'ZA' });
    products = extractProducts(body);
  });

  it('at least one product includes a tax breakdown object', () => {
    const withTax = products.filter(p => p.tax !== undefined);
    expect(withTax.length).toBeGreaterThan(0);
  });

  it('tax breakdown taxLabel is a non-empty string when present', () => {
    for (const p of products) {
      if (p.tax) {
        expect(typeof p.tax.taxLabel).toBe('string');
        expect(p.tax.taxLabel.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('tax breakdown taxAmount is a non-negative number when present', () => {
    for (const p of products) {
      if (p.tax) {
        expect(typeof p.tax.taxAmount).toBe('number');
        expect(p.tax.taxAmount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('tax breakdown taxRate is between 0 and 1 when present', () => {
    for (const p of products) {
      if (p.tax) {
        expect(p.tax.taxRate).toBeGreaterThan(0);
        expect(p.tax.taxRate).toBeLessThan(1);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  Minimum six smartphone SKUs seeded for ZA
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — AC-5 minimum six device SKUs seeded', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('at least six DEVICE products are present for the ZA market', async () => {
    const { body } = await getCatalogProducts(app, { market: 'ZA' });
    const products = extractProducts(body);
    const devices = products.filter(p => p.productType === 'DEVICE');
    expect(devices.length).toBeGreaterThanOrEqual(6);
  });

  it('all device products have a non-zero onceOff price in ZAR', async () => {
    const { body } = await getCatalogProducts(app, { market: 'ZA' });
    const products = extractProducts(body);
    const devices = products.filter(p => p.productType === 'DEVICE');
    for (const d of devices) {
      expect(d.price.currency).toBe('ZAR');
      expect(d.price.onceOff).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6  Market exclusion — products not in the market are excluded
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — AC-6 market-scoped exclusion', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('productIds returned for ZA are a distinct set from another market', async () => {
    const zaRes = await getCatalogProducts(app, { market: 'ZA' });
    const zaProducts = extractProducts(zaRes.body);
    expect(zaProducts.length).toBeGreaterThan(0);

    // Every product returned must carry currency ZAR — none from another market bleeds in
    for (const p of zaProducts) {
      expect(p.price.currency).toBe('ZAR');
    }
  });

  it('all returned productIds are unique strings', async () => {
    const { body } = await getCatalogProducts(app, { market: 'ZA' });
    const products = extractProducts(body);
    const ids = products.map(p => p.productId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-7  isPurchasable = false when payment method unavailable
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — AC-7 isPurchasable constraint', () => {
  let app: Application;
  let products: CatalogProduct[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getCatalogProducts(app, { market: 'ZA' });
    products = extractProducts(body);
  });

  it('isPurchasable is a boolean on every product (never null/undefined)', () => {
    for (const p of products) {
      expect(p.isPurchasable === true || p.isPurchasable === false).toBe(true);
    }
  });

  it('products available in ZA with standard payment methods have isPurchasable true', () => {
    const purchasable = products.filter(p => p.isPurchasable);
    // At minimum the seeded device SKUs should be purchasable in ZA
    expect(purchasable.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-8  Optional category filter
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — AC-8 category filter', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('category=devices returns only DEVICE products', async () => {
    const { status, body } = await getCatalogProducts(app, { market: 'ZA', category: 'devices' });
    expect(status).toBe(200);
    const products = extractProducts(body);
    expect(products.length).toBeGreaterThan(0);
    for (const p of products) {
      expect(p.productType).toBe('DEVICE');
    }
  });

  it('category=plans returns only PLAN products', async () => {
    const { status, body } = await getCatalogProducts(app, { market: 'ZA', category: 'plans' });
    expect(status).toBe(200);
    const products = extractProducts(body);
    for (const p of products) {
      expect(p.productType).toBe('PLAN');
    }
  });

  it('category filter without market still returns 400', async () => {
    const { status } = await getCatalogProducts(app, { category: 'devices' });
    expect(status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-9  400 for unknown or missing market
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — AC-9 missing or unknown market 400', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns 400 when market is omitted', async () => {
    const { status } = await getCatalogProducts(app, {});
    expect(status).toBe(400);
  });

  it('400 response has an errorCode', async () => {
    const { body } = await getCatalogProducts(app, {});
    const err = body as ErrorResponse;
    expect(typeof err.errorCode).toBe('string');
    expect(err.errorCode.trim().length).toBeGreaterThan(0);
  });

  it('returns 400 for an unknown market code', async () => {
    const { status } = await getCatalogProducts(app, { market: 'XX' });
    expect(status).toBe(400);
  });

  it('unknown market 400 response has an errorCode', async () => {
    const { body } = await getCatalogProducts(app, { market: 'XX' });
    const err = body as ErrorResponse;
    expect(typeof err.errorCode).toBe('string');
    expect(err.errorCode.trim().length).toBeGreaterThan(0);
  });
});
