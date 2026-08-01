import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for GET /api/config/market/:marketId
 *
 * Contract (task spec + LLD §7.2, §5.2, §3.3):
 *   - Exposes structured MarketContext at /api/config/market/:marketId (path param, not query).
 *   - Response shape: marketCode, marketName, locale, currency, taxLabel, vatRate,
 *     enabledPaymentMethods (structured list), liteModeDefault (catalog visibility flag).
 *   - ZA seed: marketName="South Africa", currency="ZAR", vatRate=0.15,
 *     taxLabel="VAT", enabledPaymentMethods=["CARD_TOKEN","MOBILE_MONEY"],
 *     liteModeDefault=false.
 *   - Unknown market code returns HTTP 404 with errorCode.
 */

interface MarketContext {
  marketCode: string;
  marketName: string;
  locale: string;
  currency: string;
  taxLabel: string;
  vatRate: number;
  enabledPaymentMethods: string[];
  liteModeDefault: boolean;
}

interface ErrorResponse {
  errorCode: string;
  message?: string;
}

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app') as { createApp: () => Application };
  return createApp();
}

async function getMarketConfig(
  app: Application,
  marketId: string,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app).get(`/api/config/market/${marketId}`);
  return { status: res.status, body: res.body };
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  Endpoint exists at /api/config/market/:marketId and returns 200 for ZA
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/config/market/:marketId — AC-1 endpoint reachability', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('returns HTTP 200 for market ZA', async () => {
    const { status } = await getMarketConfig(app, 'ZA');
    expect(status).toBe(200);
  });

  it('endpoint is at path /api/config/market/ZA (not a query-param route)', async () => {
    const res = await request(getApp()).get('/api/config/market/ZA');
    expect(res.status).not.toBe(404);
  });

  it('response body is a non-null object', async () => {
    const { body } = await getMarketConfig(app, 'ZA');
    expect(typeof body).toBe('object');
    expect(body).not.toBeNull();
  });

  it('does not return 500 for a valid market', async () => {
    const { status } = await getMarketConfig(app, 'ZA');
    expect(status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  ZA seed data — identity and locale fields
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/config/market/:marketId — AC-2 ZA seed identity and locale', () => {
  let app: Application;
  let ctx: MarketContext;

  beforeAll(async () => {
    app = getApp();
    const { body } = await getMarketConfig(app, 'ZA');
    ctx = body as MarketContext;
  });

  it('response includes marketCode field', () => {
    expect(ctx).toHaveProperty('marketCode');
  });

  it('marketCode is "ZA"', () => {
    expect(ctx.marketCode).toBe('ZA');
  });

  it('response includes marketName field (display name)', () => {
    expect(ctx).toHaveProperty('marketName');
  });

  it('marketName is "South Africa"', () => {
    expect(ctx.marketName).toBe('South Africa');
  });

  it('response includes locale field', () => {
    expect(ctx).toHaveProperty('locale');
    expect(typeof ctx.locale).toBe('string');
    expect(ctx.locale.trim().length).toBeGreaterThan(0);
  });

  it('locale is "en-ZA" for South Africa', () => {
    expect(ctx.locale).toBe('en-ZA');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  ZA seed data — currency and tax fields
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/config/market/:marketId — AC-3 ZA currency and tax', () => {
  let app: Application;
  let ctx: MarketContext;

  beforeAll(async () => {
    app = getApp();
    const { body } = await getMarketConfig(app, 'ZA');
    ctx = body as MarketContext;
  });

  it('response includes currency field', () => {
    expect(ctx).toHaveProperty('currency');
  });

  it('currency is "ZAR" for the ZA market', () => {
    expect(ctx.currency).toBe('ZAR');
  });

  it('response includes taxLabel field', () => {
    expect(ctx).toHaveProperty('taxLabel');
    expect(typeof ctx.taxLabel).toBe('string');
    expect(ctx.taxLabel.trim().length).toBeGreaterThan(0);
  });

  it('taxLabel is "VAT" for the ZA market', () => {
    expect(ctx.taxLabel).toBe('VAT');
  });

  it('response includes vatRate field', () => {
    expect(ctx).toHaveProperty('vatRate');
    expect(typeof ctx.vatRate).toBe('number');
  });

  it('vatRate is 0.15 (15%) for the ZA market', () => {
    expect(ctx.vatRate).toBe(0.15);
  });

  it('vatRate is a decimal fraction strictly between 0 and 1', () => {
    expect(ctx.vatRate).toBeGreaterThan(0);
    expect(ctx.vatRate).toBeLessThan(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  ZA seed data — enabledPaymentMethods as a structured list
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/config/market/:marketId — AC-4 ZA enabledPaymentMethods structured list', () => {
  let app: Application;
  let ctx: MarketContext;

  beforeAll(async () => {
    app = getApp();
    const { body } = await getMarketConfig(app, 'ZA');
    ctx = body as MarketContext;
  });

  it('response includes enabledPaymentMethods field', () => {
    expect(ctx).toHaveProperty('enabledPaymentMethods');
  });

  it('enabledPaymentMethods is an array', () => {
    expect(Array.isArray(ctx.enabledPaymentMethods)).toBe(true);
  });

  it('enabledPaymentMethods is non-empty for ZA', () => {
    expect(ctx.enabledPaymentMethods.length).toBeGreaterThan(0);
  });

  it('CARD_TOKEN is listed for ZA (card PSP profile)', () => {
    expect(ctx.enabledPaymentMethods).toContain('CARD_TOKEN');
  });

  it('MOBILE_MONEY is listed for ZA (ZAR/mobile-money profile from wireframes)', () => {
    expect(ctx.enabledPaymentMethods).toContain('MOBILE_MONEY');
  });

  it('ZA has both CARD_TOKEN and MOBILE_MONEY enabled', () => {
    expect(ctx.enabledPaymentMethods).toContain('CARD_TOKEN');
    expect(ctx.enabledPaymentMethods).toContain('MOBILE_MONEY');
  });

  it('all payment method values are uppercase tokens', () => {
    for (const method of ctx.enabledPaymentMethods) {
      expect(typeof method).toBe('string');
      expect(method).toMatch(/^[A-Z0-9_]+$/);
    }
  });

  it('enabledPaymentMethods list has no duplicates', () => {
    const unique = new Set(ctx.enabledPaymentMethods);
    expect(unique.size).toBe(ctx.enabledPaymentMethods.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  Catalog visibility flags — liteModeDefault
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/config/market/:marketId — AC-5 catalog visibility flag liteModeDefault', () => {
  let app: Application;
  let ctx: MarketContext;

  beforeAll(async () => {
    app = getApp();
    const { body } = await getMarketConfig(app, 'ZA');
    ctx = body as MarketContext;
  });

  it('response includes liteModeDefault boolean field (catalog visibility flag)', () => {
    expect(ctx).toHaveProperty('liteModeDefault');
    expect(typeof ctx.liteModeDefault).toBe('boolean');
  });

  it('ZA liteModeDefault is false (South Africa is a full-feature market)', () => {
    expect(ctx.liteModeDefault).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6  Complete response shape — all mandated fields present
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/config/market/:marketId — AC-6 complete response shape', () => {
  let app: Application;
  let ctx: MarketContext;

  beforeAll(async () => {
    app = getApp();
    const { body } = await getMarketConfig(app, 'ZA');
    ctx = body as MarketContext;
  });

  it('response has marketCode field', () => { expect(ctx).toHaveProperty('marketCode'); });
  it('response has marketName field', () => { expect(ctx).toHaveProperty('marketName'); });
  it('response has locale field', () => { expect(ctx).toHaveProperty('locale'); });
  it('response has currency field', () => { expect(ctx).toHaveProperty('currency'); });
  it('response has taxLabel field', () => { expect(ctx).toHaveProperty('taxLabel'); });
  it('response has vatRate field', () => { expect(ctx).toHaveProperty('vatRate'); });
  it('response has enabledPaymentMethods field', () => { expect(ctx).toHaveProperty('enabledPaymentMethods'); });
  it('response has liteModeDefault field', () => { expect(ctx).toHaveProperty('liteModeDefault'); });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-7  Unknown market returns HTTP 404 with errorCode
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/config/market/:marketId — AC-7 unknown market 404', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('returns HTTP 404 for unknown market code "XX"', async () => {
    const { status } = await getMarketConfig(app, 'XX');
    expect(status).toBe(404);
  });

  it('404 response body includes an errorCode string', async () => {
    const { body } = await getMarketConfig(app, 'XX');
    const err = body as ErrorResponse;
    expect(typeof err.errorCode).toBe('string');
    expect(err.errorCode.trim().length).toBeGreaterThan(0);
  });

  it('returns 404 for empty-looking market segment (single space encoded)', async () => {
    const res = await request(getApp()).get('/api/config/market/UNKNOWN_CODE_9999');
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-8  Other markets present in seed data (TZ, MZ) respond without error
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/config/market/:marketId — AC-8 other seed markets return 200', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('TZ market returns HTTP 200', async () => {
    const { status } = await getMarketConfig(app, 'TZ');
    expect(status).toBe(200);
  });

  it('MZ market returns HTTP 200', async () => {
    const { status } = await getMarketConfig(app, 'MZ');
    expect(status).toBe(200);
  });

  it('TZ market currency is TZS', async () => {
    const { body } = await getMarketConfig(app, 'TZ');
    const ctx = body as MarketContext;
    expect(ctx.currency).toBe('TZS');
  });
});
