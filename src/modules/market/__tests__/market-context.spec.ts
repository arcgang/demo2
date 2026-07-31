import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests for market-aware rendering contracts:
 *
 *  - GET /api/markets  — list endpoint available from frontend app
 *  - GET /api/markets/:code — per-market context contract
 *  - Market selector data contract: dropdown lists active markets with display label
 *  - Market-sensitive rendering contract: currency, tax, payment methods, availability
 *  - Catalog availability: products expose marketAvailability flags
 *  - Cart item ineligibility contract: items can be flagged ineligible after market switch
 *
 * Tests are written against the API surface that the frontend MarketContext
 * consumes. They FAIL until the market endpoints and catalog market fields
 * are implemented.
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface Market {
  code: string;
  name: string;
  displayLabel: string; // e.g. 'South Africa - ZAR'
  currencySymbol: string;
  currencyCode: string;
  taxLabel: string;
  taxRate: number;
  enabledPaymentMethods: string[];
  active: boolean;
}

interface MarketListResponse {
  markets: Market[];
}

// ---------------------------------------------------------------------------
// AC-M1  Market list endpoint — available via frontend app
// ---------------------------------------------------------------------------

describe('GET /api/markets — market selector data', () => {
  it('returns HTTP 200', async () => {
    const res = await request(app).get('/api/markets');
    expect(res.status).toBe(200);
  });

  it('response body contains a markets array', async () => {
    const res = await request(app).get('/api/markets');
    expect(res.body).toHaveProperty('markets');
    expect(Array.isArray(res.body.markets)).toBe(true);
  });

  it('contains at least one active market', async () => {
    const res = await request(app).get('/api/markets');
    const active: Market[] = res.body.markets.filter((m: Market) => m.active);
    expect(active.length).toBeGreaterThanOrEqual(1);
  });

  it('every active market has a non-empty displayLabel for the dropdown', async () => {
    const res = await request(app).get('/api/markets');
    const active: Market[] = res.body.markets.filter((m: Market) => m.active);
    for (const m of active) {
      expect(typeof m.displayLabel).toBe('string');
      expect(m.displayLabel.trim().length).toBeGreaterThan(0);
    }
  });

  it('ZA market displayLabel is "South Africa - ZAR"', async () => {
    const res = await request(app).get('/api/markets');
    const za: Market | undefined = res.body.markets.find((m: Market) => m.code === 'ZA');
    expect(za).toBeDefined();
    expect(za!.displayLabel).toBe('South Africa - ZAR');
  });

  it('every market has required fields: code, name, currencySymbol, currencyCode, taxLabel, taxRate, enabledPaymentMethods, active', async () => {
    const res = await request(app).get('/api/markets');
    for (const m of res.body.markets as Market[]) {
      expect(typeof m.code).toBe('string');
      expect(m.code.length).toBeGreaterThan(0);
      expect(typeof m.name).toBe('string');
      expect(typeof m.currencySymbol).toBe('string');
      expect(typeof m.currencyCode).toBe('string');
      expect(typeof m.taxLabel).toBe('string');
      expect(typeof m.taxRate).toBe('number');
      expect(Array.isArray(m.enabledPaymentMethods)).toBe(true);
      expect(typeof m.active).toBe('boolean');
    }
  });
});

// ---------------------------------------------------------------------------
// AC-M2  Single market endpoint: MarketContext contract
// ---------------------------------------------------------------------------

describe('GET /api/markets/:code — MarketContext contract', () => {
  it('returns HTTP 200 for code ZA', async () => {
    const res = await request(app).get('/api/markets/ZA');
    expect(res.status).toBe(200);
  });

  it('returns 404 for an unknown market code', async () => {
    const res = await request(app).get('/api/markets/ZZZUNKNOWN');
    expect(res.status).toBe(404);
  });

  it('ZA market: currencyCode is ZAR', async () => {
    const res = await request(app).get('/api/markets/ZA');
    expect(res.body.currencyCode).toBe('ZAR');
  });

  it('ZA market: taxRate is 0.15', async () => {
    const res = await request(app).get('/api/markets/ZA');
    expect(res.body.taxRate).toBeCloseTo(0.15);
  });

  it('ZA market: taxLabel contains "15" to derive the display string', async () => {
    const res = await request(app).get('/api/markets/ZA');
    expect(res.body.taxLabel).toMatch(/15/);
  });

  it('ZA market: enabledPaymentMethods contains "card" and "mobile_money"', async () => {
    const res = await request(app).get('/api/markets/ZA');
    expect(res.body.enabledPaymentMethods).toContain('card');
    expect(res.body.enabledPaymentMethods).toContain('mobile_money');
  });

  it('taxRate is a number — not a formatted "15%" string', async () => {
    const res = await request(app).get('/api/markets/ZA');
    expect(typeof res.body.taxRate).toBe('number');
  });

  it('enabledPaymentMethods is an array, not a comma-separated string', async () => {
    const res = await request(app).get('/api/markets/ZA');
    expect(Array.isArray(res.body.enabledPaymentMethods)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-M3  Payment method toggling: card-only market hides mobile_money
// ---------------------------------------------------------------------------

describe('Market switching — mobile_money visibility contract', () => {
  it('at least one active market has only "card" in enabledPaymentMethods (no mobile_money)', async () => {
    const res = await request(app).get('/api/markets');
    const cardOnly: Market[] = res.body.markets.filter(
      (m: Market) => m.active && !m.enabledPaymentMethods.includes('mobile_money'),
    );
    expect(cardOnly.length).toBeGreaterThanOrEqual(1);
  });

  it('card-only market does not include "mobile_money" in enabledPaymentMethods', async () => {
    const listRes = await request(app).get('/api/markets');
    const cardOnly: Market | undefined = listRes.body.markets.find(
      (m: Market) => m.active && !m.enabledPaymentMethods.includes('mobile_money'),
    );
    expect(cardOnly).toBeDefined();

    const res = await request(app).get(`/api/markets/${cardOnly!.code}`);
    expect(res.status).toBe(200);
    expect(res.body.enabledPaymentMethods).not.toContain('mobile_money');
  });

  it('switching from ZA to a card-only market changes the enabledPaymentMethods set', async () => {
    const zaRes = await request(app).get('/api/markets/ZA');
    const zaMarket: Market = zaRes.body;

    const listRes = await request(app).get('/api/markets');
    const cardOnly: Market | undefined = listRes.body.markets.find(
      (m: Market) => m.active && !m.enabledPaymentMethods.includes('mobile_money'),
    );
    expect(cardOnly).toBeDefined();
    const altRes = await request(app).get(`/api/markets/${cardOnly!.code}`);
    const altMarket: Market = altRes.body;

    expect(zaMarket.enabledPaymentMethods).toContain('mobile_money');
    expect(altMarket.enabledPaymentMethods).not.toContain('mobile_money');
  });
});

// ---------------------------------------------------------------------------
// AC-M4  Tax label and rate change across markets
// ---------------------------------------------------------------------------

describe('Market switching — tax context contract', () => {
  it('ZA market exposes taxLabel and taxRate consistent with 15% VAT', async () => {
    const res = await request(app).get('/api/markets/ZA');
    const m: Market = res.body;
    expect(m.taxLabel).toMatch(/VAT/i);
    expect(m.taxRate).toBeCloseTo(0.15);
  });

  it('a second market exposes its own taxLabel and taxRate (not hardcoded ZA values)', async () => {
    const listRes = await request(app).get('/api/markets');
    const others: Market[] = (listRes.body.markets as Market[]).filter(
      (m) => m.active && m.code !== 'ZA',
    );
    expect(others.length).toBeGreaterThanOrEqual(1);

    for (const other of others) {
      const res = await request(app).get(`/api/markets/${other.code}`);
      const m: Market = res.body;
      // taxLabel must be non-empty and come from the market record
      expect(typeof m.taxLabel).toBe('string');
      expect(m.taxLabel.trim().length).toBeGreaterThan(0);
      // taxRate must be numeric — UI uses this to compute the tax line amount
      expect(typeof m.taxRate).toBe('number');
    }
  });
});

// ---------------------------------------------------------------------------
// AC-M5  Currency context: no hardcoded 'R' — symbol comes from currencySymbol
// ---------------------------------------------------------------------------

describe('Market context — currency symbol contract', () => {
  it('ZA market currencySymbol is the ZAR symbol (R)', async () => {
    const res = await request(app).get('/api/markets/ZA');
    const m: Market = res.body;
    expect(m.currencySymbol).toBe('R');
  });

  it('every active market declares a currencySymbol and currencyCode', async () => {
    const res = await request(app).get('/api/markets');
    const active: Market[] = res.body.markets.filter((m: Market) => m.active);
    for (const m of active) {
      expect(typeof m.currencySymbol).toBe('string');
      expect(m.currencySymbol.trim().length).toBeGreaterThan(0);
      expect(typeof m.currencyCode).toBe('string');
      expect(m.currencyCode.trim().length).toBeGreaterThan(0);
    }
  });

  it('a non-ZA market has a different currencyCode to ZAR', async () => {
    const listRes = await request(app).get('/api/markets');
    const nonZA: Market | undefined = (listRes.body.markets as Market[]).find(
      (m) => m.active && m.code !== 'ZA',
    );
    expect(nonZA).toBeDefined();
    expect(nonZA!.currencyCode).not.toBe('ZAR');
  });
});

// ---------------------------------------------------------------------------
// AC-M6  Catalog availability: products expose market availability
// ---------------------------------------------------------------------------

describe('GET /api/catalog/products — market availability fields', () => {
  it('returns HTTP 200', async () => {
    const res = await request(app).get('/api/catalog/products');
    expect(res.status).toBe(200);
  });

  it('each product has an availableMarkets array or marketAvailability flag', async () => {
    const res = await request(app).get('/api/catalog/products');
    const products: unknown[] = res.body.products ?? res.body;
    expect(Array.isArray(products)).toBe(true);
    for (const p of products as Record<string, unknown>[]) {
      const hasAvailableMarkets = Array.isArray(p['availableMarkets']);
      const hasMarketAvailability = typeof p['marketAvailability'] !== 'undefined';
      expect(hasAvailableMarkets || hasMarketAvailability).toBe(true);
    }
  });

  it('filtering by market=ZA returns only products available in ZA', async () => {
    const res = await request(app).get('/api/catalog/products?market=ZA');
    expect(res.status).toBe(200);
    const products: Record<string, unknown>[] = res.body.products ?? res.body;
    for (const p of products) {
      const available = p['availableMarkets'];
      if (Array.isArray(available)) {
        expect(available).toContain('ZA');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// AC-M7  Cart item ineligibility after market switch
// ---------------------------------------------------------------------------

describe('POST /api/cart/validate — market ineligibility contract', () => {
  it('returns HTTP 200 for a cart with ZA-eligible items in market ZA', async () => {
    const res = await request(app)
      .post('/api/cart/validate')
      .send({ marketCode: 'ZA', items: [{ productId: 'iphone-15-pro', quantity: 1 }] });
    expect(res.status).toBe(200);
  });

  it('returns a validation result with an items array', async () => {
    const res = await request(app)
      .post('/api/cart/validate')
      .send({ marketCode: 'ZA', items: [{ productId: 'iphone-15-pro', quantity: 1 }] });
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('a ZA-eligible item in market ZA has eligible=true', async () => {
    const res = await request(app)
      .post('/api/cart/validate')
      .send({ marketCode: 'ZA', items: [{ productId: 'iphone-15-pro', quantity: 1 }] });
    const items: { productId: string; eligible: boolean }[] = res.body.items;
    const item = items.find((i) => i.productId === 'iphone-15-pro');
    expect(item).toBeDefined();
    expect(item!.eligible).toBe(true);
  });

  it('an item not available in the selected market has eligible=false', async () => {
    // Switch to a card-only non-ZA market and use a ZA-only product
    const listRes = await request(app).get('/api/markets');
    const cardOnly: Market | undefined = listRes.body.markets.find(
      (m: Market) => m.active && !m.enabledPaymentMethods.includes('mobile_money'),
    );
    expect(cardOnly).toBeDefined();

    const res = await request(app)
      .post('/api/cart/validate')
      .send({
        marketCode: cardOnly!.code,
        items: [{ productId: 'za-only-product', quantity: 1 }],
      });
    expect(res.status).toBe(200);
    const items: { productId: string; eligible: boolean; warning?: string }[] = res.body.items;
    const item = items.find((i) => i.productId === 'za-only-product');
    expect(item).toBeDefined();
    expect(item!.eligible).toBe(false);
  });

  it('an ineligible cart item carries a non-empty warning message', async () => {
    const listRes = await request(app).get('/api/markets');
    const cardOnly: Market | undefined = listRes.body.markets.find(
      (m: Market) => m.active && !m.enabledPaymentMethods.includes('mobile_money'),
    );
    expect(cardOnly).toBeDefined();

    const res = await request(app)
      .post('/api/cart/validate')
      .send({
        marketCode: cardOnly!.code,
        items: [{ productId: 'za-only-product', quantity: 1 }],
      });
    const items: { productId: string; eligible: boolean; warning?: string }[] = res.body.items;
    const item = items.find((i) => i.productId === 'za-only-product');
    expect(item).toBeDefined();
    expect(typeof item!.warning).toBe('string');
    expect((item!.warning as string).trim().length).toBeGreaterThan(0);
  });

  it('a cart containing an ineligible item has canProceedToCheckout=false', async () => {
    const listRes = await request(app).get('/api/markets');
    const cardOnly: Market | undefined = listRes.body.markets.find(
      (m: Market) => m.active && !m.enabledPaymentMethods.includes('mobile_money'),
    );
    expect(cardOnly).toBeDefined();

    const res = await request(app)
      .post('/api/cart/validate')
      .send({
        marketCode: cardOnly!.code,
        items: [{ productId: 'za-only-product', quantity: 1 }],
      });
    expect(res.body.canProceedToCheckout).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC-M8  Default market resolution — first active market when no preference
// ---------------------------------------------------------------------------

describe('GET /api/markets/default — default market resolution', () => {
  it('returns HTTP 200', async () => {
    const res = await request(app).get('/api/markets/default');
    expect(res.status).toBe(200);
  });

  it('response matches the first active market from GET /api/markets', async () => {
    const listRes = await request(app).get('/api/markets');
    const firstActive: Market | undefined = (listRes.body.markets as Market[]).find(
      (m) => m.active,
    );
    expect(firstActive).toBeDefined();

    const defaultRes = await request(app).get('/api/markets/default');
    expect(defaultRes.body.code).toBe(firstActive!.code);
  });

  it('default market has all required MarketContext fields', async () => {
    const res = await request(app).get('/api/markets/default');
    const m: Market = res.body;
    expect(typeof m.code).toBe('string');
    expect(typeof m.currencySymbol).toBe('string');
    expect(typeof m.currencyCode).toBe('string');
    expect(typeof m.taxLabel).toBe('string');
    expect(typeof m.taxRate).toBe('number');
    expect(Array.isArray(m.enabledPaymentMethods)).toBe(true);
  });
});
