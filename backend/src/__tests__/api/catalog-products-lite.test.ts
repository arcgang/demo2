import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../app';

/**
 * Acceptance tests for lite-mode flag on GET /api/catalog/products
 *
 * Contract (task spec + LLD §5.2, §3.2, §3.3):
 *   - ?lite=true (or header Save-Data: on) activates lite mode.
 *   - Lite responses include ONLY essential commerce fields:
 *       productId, name, price, monthlyFrom, availability, category,
 *       storageOptions, colorOptions, planAttachOptions, esim, fiveG, tradeIn
 *   - Lite responses OMIT:
 *       tax/taxBreakdown, spec/metadata marketing copy, recommendedAccessories,
 *       personalizedRecommendations, isPurchasable, onboardingRequirements
 *   - Full (non-lite) responses are unchanged and still contain tax etc.
 */

// ─── response shapes ─────────────────────────────────────────────────────────

interface ProductPrice {
  onceOff?: number;
  recurring?: number;
  currency: string;
}

interface LiteCatalogProduct {
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

interface LiteCatalogResponse {
  market?: {
    marketCode: string;
    currency: string;
  };
  catalog?: LiteCatalogProduct[];
  products?: LiteCatalogProduct[];
}

interface FullCatalogProduct {
  productId: string;
  tax?: {
    taxLabel: string;
    taxAmount: number;
    taxRate: number;
  };
  isPurchasable?: boolean;
  [key: string]: unknown;
}

interface FullCatalogResponse {
  catalog?: FullCatalogProduct[];
  products?: FullCatalogProduct[];
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function getApp(): Application {
  return createApp();
}

async function getCatalogLite(
  app: Application,
  query: Record<string, string> = {},
  headers: Record<string, string> = {},
): Promise<{ status: number; body: unknown }> {
  let req = request(app).get('/api/catalog/products').query(query);
  for (const [k, v] of Object.entries(headers)) {
    req = req.set(k, v);
  }
  const res = await req;
  return { status: res.status, body: res.body };
}

function extractLiteProducts(body: unknown): LiteCatalogProduct[] {
  const b = body as LiteCatalogResponse;
  return (b.catalog ?? b.products ?? []) as LiteCatalogProduct[];
}

function extractFullProducts(body: unknown): FullCatalogProduct[] {
  const b = body as FullCatalogResponse;
  return (b.catalog ?? b.products ?? []) as FullCatalogProduct[];
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-L1  lite=true query param returns 200
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — AC-L1 lite=true returns 200', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await getCatalogLite(app, { market: 'ZA', lite: 'true' });
  });

  it('returns HTTP 200 when lite=true is set', () => {
    expect(result.status).toBe(200);
  });

  it('response body contains a catalog array', () => {
    const products = extractLiteProducts(result.body);
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);
  });

  it('market block is present with marketCode and currency', () => {
    const b = result.body as LiteCatalogResponse;
    expect(b.market).toBeDefined();
    expect(b.market?.marketCode).toBe('ZA');
    expect(b.market?.currency).toBe('ZAR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-L2  Save-Data: on header activates lite mode
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — AC-L2 Save-Data header activates lite mode', () => {
  let app: Application;
  let products: LiteCatalogProduct[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getCatalogLite(
      app,
      { market: 'ZA' },
      { 'Save-Data': 'on' },
    );
    products = extractLiteProducts(body);
  });

  it('returns at least one product when Save-Data: on is set', () => {
    expect(products.length).toBeGreaterThan(0);
  });

  it('Save-Data: on response omits tax field on each product', () => {
    for (const p of products) {
      expect(Object.prototype.hasOwnProperty.call(p, 'tax')).toBe(false);
    }
  });

  it('Save-Data: on response omits spec/metadata marketing copy', () => {
    for (const p of products) {
      expect(Object.prototype.hasOwnProperty.call(p, 'spec')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(p, 'metadata')).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-L3  lite response essential fields present
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — AC-L3 lite response essential fields', () => {
  let app: Application;
  let products: LiteCatalogProduct[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getCatalogLite(app, { market: 'ZA', lite: 'true' });
    products = extractLiteProducts(body);
  });

  it('every lite product has a non-empty productId string', () => {
    for (const p of products) {
      expect(typeof p.productId).toBe('string');
      expect(p.productId.length).toBeGreaterThan(0);
    }
  });

  it('every lite product has a non-empty name string', () => {
    for (const p of products) {
      expect(typeof p.name).toBe('string');
      expect(p.name.length).toBeGreaterThan(0);
    }
  });

  it('every lite product has a price object with currency', () => {
    for (const p of products) {
      expect(typeof p.price).toBe('object');
      expect(typeof p.price.currency).toBe('string');
    }
  });

  it('every lite product has a numeric monthlyFrom field', () => {
    for (const p of products) {
      expect(typeof p.monthlyFrom).toBe('number');
    }
  });

  it('every lite product has a non-empty availability string', () => {
    for (const p of products) {
      expect(typeof p.availability).toBe('string');
      expect(p.availability.length).toBeGreaterThan(0);
    }
  });

  it('every lite product has a non-empty category string', () => {
    for (const p of products) {
      expect(typeof p.category).toBe('string');
      expect(p.category.length).toBeGreaterThan(0);
    }
  });

  it('every lite product has a storageOptions array', () => {
    for (const p of products) {
      expect(Array.isArray(p.storageOptions)).toBe(true);
    }
  });

  it('every lite product has a colorOptions array', () => {
    for (const p of products) {
      expect(Array.isArray(p.colorOptions)).toBe(true);
    }
  });

  it('every lite product has a planAttachOptions array', () => {
    for (const p of products) {
      expect(Array.isArray(p.planAttachOptions)).toBe(true);
    }
  });

  it('every lite product has a boolean esim flag', () => {
    for (const p of products) {
      expect(typeof p.esim).toBe('boolean');
    }
  });

  it('every lite product has a boolean fiveG flag', () => {
    for (const p of products) {
      expect(typeof p.fiveG).toBe('boolean');
    }
  });

  it('every lite product has a boolean tradeIn flag', () => {
    for (const p of products) {
      expect(typeof p.tradeIn).toBe('boolean');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-L4  lite response omits non-essential fields
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — AC-L4 lite response omits non-essential fields', () => {
  let app: Application;
  let products: LiteCatalogProduct[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getCatalogLite(app, { market: 'ZA', lite: 'true' });
    products = extractLiteProducts(body);
  });

  it('lite response omits tax breakdown on every product', () => {
    for (const p of products) {
      expect(Object.prototype.hasOwnProperty.call(p, 'tax')).toBe(false);
    }
  });

  it('lite response omits spec/metadata marketing copy on every product', () => {
    for (const p of products) {
      expect(Object.prototype.hasOwnProperty.call(p, 'spec')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(p, 'metadata')).toBe(false);
    }
  });

  it('lite response omits recommendedAccessories on every product', () => {
    for (const p of products) {
      expect(Object.prototype.hasOwnProperty.call(p, 'recommendedAccessories')).toBe(false);
    }
  });

  it('lite response omits personalizedRecommendations on every product', () => {
    for (const p of products) {
      expect(Object.prototype.hasOwnProperty.call(p, 'personalizedRecommendations')).toBe(false);
    }
  });

  it('lite response omits onboardingRequirements on every product', () => {
    for (const p of products) {
      expect(Object.prototype.hasOwnProperty.call(p, 'onboardingRequirements')).toBe(false);
    }
  });

  it('lite response omits isPurchasable on every product', () => {
    for (const p of products) {
      expect(Object.prototype.hasOwnProperty.call(p, 'isPurchasable')).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-L5  flag derivation — DEVICE products in ZA market
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — AC-L5 flag derivation for ZA devices', () => {
  let app: Application;
  let devices: LiteCatalogProduct[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getCatalogLite(app, { market: 'ZA', lite: 'true', category: 'devices' });
    devices = extractLiteProducts(body);
  });

  it('at least one ZA device has fiveG = true', () => {
    const fiveGDevices = devices.filter(d => d.fiveG === true);
    expect(fiveGDevices.length).toBeGreaterThan(0);
  });

  it('at least one ZA device has tradeIn = true', () => {
    const tradeInDevices = devices.filter(d => d.tradeIn === true);
    expect(tradeInDevices.length).toBeGreaterThan(0);
  });

  it('at least one ZA device has esim = true', () => {
    const esimDevices = devices.filter(d => d.esim === true);
    expect(esimDevices.length).toBeGreaterThan(0);
  });

  it('ZA devices in lite mode have planAttachOptions listing compatible plan IDs', () => {
    const withPlans = devices.filter(d => d.planAttachOptions.length > 0);
    expect(withPlans.length).toBeGreaterThan(0);
  });

  it('monthlyFrom for devices with compatible plans is a positive number', () => {
    const withPlans = devices.filter(d => d.planAttachOptions.length > 0);
    for (const d of withPlans) {
      expect(d.monthlyFrom).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-L6  flag derivation — PLAN products
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — AC-L6 monthlyFrom for plan products', () => {
  let app: Application;
  let plans: LiteCatalogProduct[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getCatalogLite(app, { market: 'ZA', lite: 'true', category: 'plans' });
    plans = extractLiteProducts(body);
  });

  it('plan products have monthlyFrom equal to their recurring price', () => {
    expect(plans.length).toBeGreaterThan(0);
    for (const p of plans) {
      expect(p.monthlyFrom).toBeGreaterThan(0);
      if (p.price.recurring !== undefined) {
        expect(p.monthlyFrom).toBe(p.price.recurring);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-L7  full (non-lite) response is unaffected
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — AC-L7 full response unchanged when lite not set', () => {
  let app: Application;
  let products: FullCatalogProduct[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getCatalogLite(app, { market: 'ZA' });
    products = extractFullProducts(body);
  });

  it('full response still contains tax breakdown on each product', () => {
    expect(products.length).toBeGreaterThan(0);
    for (const p of products) {
      expect(p.tax).toBeDefined();
      expect(typeof (p.tax as { taxLabel: string }).taxLabel).toBe('string');
    }
  });

  it('full response still contains isPurchasable on each product', () => {
    for (const p of products) {
      expect(typeof p.isPurchasable).toBe('boolean');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-L8  lite=false is treated as non-lite (full response)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog/products — AC-L8 lite=false returns full response', () => {
  let app: Application;
  let products: FullCatalogProduct[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getCatalogLite(app, { market: 'ZA', lite: 'false' });
    products = extractFullProducts(body);
  });

  it('lite=false returns full response with tax field', () => {
    expect(products.length).toBeGreaterThan(0);
    for (const p of products) {
      expect(p.tax).toBeDefined();
    }
  });
});
