import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for GET /api/config/market/:marketId
 *
 * Contract (LLD §5.1, §7.2, §7.3 market_config table):
 *   - Path parameter :marketId identifies the market (e.g. ZA).
 *   - Returns a MarketContext object: marketCode, displayName, locale, currency,
 *     taxLabel, vatRate, enabledPaymentMethods (structured list),
 *     mobileMoneyEnabled, cardPaymentEnabled.
 *   - ZA seed must match: currency=ZAR, vatRate=0.15, taxLabel=VAT,
 *     enabledPaymentMethods includes CARD_TOKEN and MOBILE_MONEY,
 *     mobileMoneyEnabled=true, cardPaymentEnabled=true.
 *   - Unknown :marketId returns 404 with errorCode.
 *   - The endpoint reads from the database/seed layer (MarketConfig entity)
 *     so that changing seed data propagates to all consumers without per-page
 *     code changes.
 *
 * Acceptance criteria driving these tests:
 *   AC-1  Endpoint exists at GET /api/config/market/:marketId and is not 404.
 *   AC-2  ZA response shape — all required fields present with correct types.
 *   AC-3  ZA seed data — values match ZAR/VAT-15%/card+mobile-money profile.
 *   AC-4  enabledPaymentMethods is a structured list (array of strings).
 *   AC-5  Unknown marketId returns 404 with errorCode.
 *   AC-6  Catalog route honours market config (currency/vatRate derived from seed).
 *   AC-7  Case-insensitive marketId lookup (za == ZA).
 */

// ─── response shapes ─────────────────────────────────────────────────────────

interface MarketContext {
  marketCode: string;
  displayName: string;
  locale: string;
  currency: string;
  taxLabel: string;
  vatRate: number;
  enabledPaymentMethods: string[];
  mobileMoneyEnabled: boolean;
  cardPaymentEnabled: boolean;
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

async function fetchMarketConfig(
  app: Application,
  marketId: string,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app).get(`/api/config/market/${marketId}`);
  return { status: res.status, body: res.body };
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  Endpoint exists
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/config/market/:marketId — AC-1 endpoint exists', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('endpoint exists and returns non-404 for ZA', async () => {
    const { status } = await fetchMarketConfig(app, 'ZA');
    expect(status).not.toBe(404);
  });

  it('endpoint does not return 500 for a valid market', async () => {
    const { status } = await fetchMarketConfig(app, 'ZA');
    expect(status).not.toBe(500);
  });

  it('returns HTTP 200 for ZA', async () => {
    const { status } = await fetchMarketConfig(app, 'ZA');
    expect(status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  ZA response shape
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/config/market/:marketId — AC-2 ZA response shape', () => {
  let app: Application;
  let body: unknown;

  beforeAll(async () => {
    app = getApp();
    ({ body } = await fetchMarketConfig(app, 'ZA'));
  });

  it('response body is a non-null object', () => {
    expect(typeof body).toBe('object');
    expect(body).not.toBeNull();
  });

  it('response contains marketCode as a non-empty string', () => {
    const ctx = body as MarketContext;
    expect(typeof ctx.marketCode).toBe('string');
    expect(ctx.marketCode.trim().length).toBeGreaterThan(0);
  });

  it('marketCode matches requested market ZA', () => {
    const ctx = body as MarketContext;
    expect(ctx.marketCode).toBe('ZA');
  });

  it('response contains displayName as a non-empty string', () => {
    const ctx = body as MarketContext;
    expect(typeof ctx.displayName).toBe('string');
    expect(ctx.displayName.trim().length).toBeGreaterThan(0);
  });

  it('response contains locale as a non-empty string', () => {
    const ctx = body as MarketContext;
    expect(typeof ctx.locale).toBe('string');
    expect(ctx.locale.trim().length).toBeGreaterThan(0);
  });

  it('response contains currency as a non-empty string', () => {
    const ctx = body as MarketContext;
    expect(typeof ctx.currency).toBe('string');
    expect(ctx.currency.trim().length).toBeGreaterThan(0);
  });

  it('response contains taxLabel as a non-empty string', () => {
    const ctx = body as MarketContext;
    expect(typeof ctx.taxLabel).toBe('string');
    expect(ctx.taxLabel.trim().length).toBeGreaterThan(0);
  });

  it('response contains vatRate as a number', () => {
    const ctx = body as MarketContext;
    expect(typeof ctx.vatRate).toBe('number');
  });

  it('response contains enabledPaymentMethods as an array', () => {
    const ctx = body as MarketContext;
    expect(Array.isArray(ctx.enabledPaymentMethods)).toBe(true);
  });

  it('response contains mobileMoneyEnabled as a boolean', () => {
    const ctx = body as MarketContext;
    expect(typeof ctx.mobileMoneyEnabled).toBe('boolean');
  });

  it('response contains cardPaymentEnabled as a boolean', () => {
    const ctx = body as MarketContext;
    expect(typeof ctx.cardPaymentEnabled).toBe('boolean');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  ZA seed data values
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/config/market/:marketId — AC-3 ZA seed data values', () => {
  let app: Application;
  let ctx: MarketContext;

  beforeAll(async () => {
    app = getApp();
    const { body } = await fetchMarketConfig(app, 'ZA');
    ctx = body as MarketContext;
  });

  it('currency is ZAR', () => {
    expect(ctx.currency).toBe('ZAR');
  });

  it('taxLabel is VAT', () => {
    expect(ctx.taxLabel).toBe('VAT');
  });

  it('vatRate is 0.15 (15% as decimal fraction)', () => {
    expect(ctx.vatRate).toBe(0.15);
  });

  it('vatRate is between 0 and 1 (not a percentage integer)', () => {
    expect(ctx.vatRate).toBeGreaterThan(0);
    expect(ctx.vatRate).toBeLessThan(1);
  });

  it('mobileMoneyEnabled is true for ZA', () => {
    expect(ctx.mobileMoneyEnabled).toBe(true);
  });

  it('cardPaymentEnabled is true for ZA', () => {
    expect(ctx.cardPaymentEnabled).toBe(true);
  });

  it('locale starts with "en" for ZA', () => {
    expect(ctx.locale.startsWith('en')).toBe(true);
  });

  it('displayName references South Africa', () => {
    expect(ctx.displayName.toLowerCase()).toContain('south africa');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  enabledPaymentMethods structure
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/config/market/:marketId — AC-4 enabledPaymentMethods structure', () => {
  let app: Application;
  let ctx: MarketContext;

  beforeAll(async () => {
    app = getApp();
    const { body } = await fetchMarketConfig(app, 'ZA');
    ctx = body as MarketContext;
  });

  it('enabledPaymentMethods is non-empty for ZA', () => {
    expect(ctx.enabledPaymentMethods.length).toBeGreaterThan(0);
  });

  it('each entry in enabledPaymentMethods is a non-empty uppercase string', () => {
    for (const method of ctx.enabledPaymentMethods) {
      expect(typeof method).toBe('string');
      expect(method).toMatch(/^[A-Z0-9_]+$/);
    }
  });

  it('enabledPaymentMethods contains CARD_TOKEN', () => {
    expect(ctx.enabledPaymentMethods).toContain('CARD_TOKEN');
  });

  it('enabledPaymentMethods contains MOBILE_MONEY', () => {
    expect(ctx.enabledPaymentMethods).toContain('MOBILE_MONEY');
  });

  it('enabledPaymentMethods has no duplicates', () => {
    const unique = new Set(ctx.enabledPaymentMethods);
    expect(unique.size).toBe(ctx.enabledPaymentMethods.length);
  });

  it('mobileMoneyEnabled flag is consistent with MOBILE_MONEY in enabledPaymentMethods', () => {
    const hasMobileMoney = ctx.enabledPaymentMethods.includes('MOBILE_MONEY');
    expect(ctx.mobileMoneyEnabled).toBe(hasMobileMoney);
  });

  it('cardPaymentEnabled flag is consistent with CARD_TOKEN in enabledPaymentMethods', () => {
    const hasCard = ctx.enabledPaymentMethods.includes('CARD_TOKEN');
    expect(ctx.cardPaymentEnabled).toBe(hasCard);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  Unknown marketId returns 404
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/config/market/:marketId — AC-5 unknown marketId 404', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 404 for an unknown market code', async () => {
    const { status } = await fetchMarketConfig(app, 'XX');
    expect(status).toBe(404);
  });

  it('404 response body contains an errorCode field', async () => {
    const { body } = await fetchMarketConfig(app, 'XX');
    const err = body as ErrorResponse;
    expect(typeof err.errorCode).toBe('string');
    expect(err.errorCode.trim().length).toBeGreaterThan(0);
  });

  it('returns HTTP 404 for a clearly invalid market code', async () => {
    const { status } = await fetchMarketConfig(app, 'NOTAMARKET');
    expect(status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6  Catalog route honours market config from seed (currency/vatRate)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/config/market/:marketId — AC-6 catalog route reflects market config', () => {
  let app: Application;
  let marketCtx: MarketContext;

  beforeAll(async () => {
    app = getApp();
    const { body } = await fetchMarketConfig(app, 'ZA');
    marketCtx = body as MarketContext;
  });

  it('catalog products endpoint returns currency matching market config for ZA', async () => {
    const res = await request(app).get('/api/catalog/products').query({ market: 'ZA' });
    expect(res.status).toBe(200);
    const catalog = res.body as { market?: { currency?: string }; catalog?: unknown[] };
    const catalogCurrency = catalog.market?.currency;
    expect(catalogCurrency).toBe(marketCtx.currency);
  });

  it('catalog product tax rate matches vatRate from market config for ZA', async () => {
    const res = await request(app).get('/api/catalog/products').query({ market: 'ZA' });
    expect(res.status).toBe(200);
    const catalog = res.body as { catalog?: Array<{ tax?: { taxRate?: number } }> };
    const products = catalog.catalog ?? [];
    expect(products.length).toBeGreaterThan(0);
    for (const product of products) {
      if (product.tax?.taxRate !== undefined) {
        expect(product.tax.taxRate).toBe(marketCtx.vatRate);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-7  Case-insensitive lookup
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/config/market/:marketId — AC-7 case-insensitive lookup', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('lowercase "za" resolves to the same market as uppercase "ZA"', async () => {
    const upperResult = await fetchMarketConfig(app, 'ZA');
    const lowerResult = await fetchMarketConfig(app, 'za');
    expect(lowerResult.status).toBe(200);
    const upper = upperResult.body as MarketContext;
    const lower = lowerResult.body as MarketContext;
    expect(lower.marketCode).toBe(upper.marketCode);
    expect(lower.currency).toBe(upper.currency);
  });
});
