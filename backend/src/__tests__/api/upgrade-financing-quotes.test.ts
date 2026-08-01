import request from 'supertest';
import express, { Application } from 'express';

/**
 * Acceptance tests for GET /api/upgrade/financing (Financing Service — new contract)
 *
 * Contract (task spec / LLD §4.1 FinancingModule):
 *   Query params:
 *     productId  — required
 *     planId     — optional
 *   200 Response: FinancingQuote[]
 *   Each FinancingQuote must contain exactly:
 *     termMonths      : integer   (loan term in months)
 *     monthlyAmount   : number    (recurring monthly installment)
 *     onceOffDeposit  : number    (once-off deposit charge)
 *     totalCost       : number    (total cost over term)
 *     interestRate    : number    (annual interest rate, 0-100)
 *   Response envelope distinguishes once-off amounts (onceOffDeposit) from
 *   recurring amounts (monthlyAmount) so the frontend can render separate
 *   charge groups.
 *   Deterministic mock responses seeded for demo device IDs:
 *     iphone-15-pro, samsung-s24-ultra, iphone-15
 *   Returns 404 for unknown productId values.
 *   Route is wired through the API Gateway Layer with input validation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FinancingQuote {
  termMonths: number;
  monthlyAmount: number;
  onceOffDeposit: number;
  totalCost: number;
  interestRate: number;
}

interface ErrorResponse {
  errorCode: string;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEMO_PRODUCT_IDS = ['iphone-15-pro', 'samsung-s24-ultra', 'iphone-15'] as const;
const UNKNOWN_PRODUCT_ID = 'unknown-product-xyz-does-not-exist';

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

async function getFinancing(
  app: Application,
  query: Record<string, string> = {},
): Promise<{ status: number; body: unknown }> {
  const res = await request(app)
    .get('/api/upgrade/financing')
    .query(query);
  return { status: res.status, body: res.body };
}

// ---------------------------------------------------------------------------
// AC-1  productId is required — missing productId must be rejected
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/financing — productId required', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns 400 or 422 when productId query param is absent', async () => {
    const res = await getFinancing(app, {});
    expect([400, 422]).toContain(res.status);
  });

  it('error response contains errorCode field when productId is absent', async () => {
    const res = await getFinancing(app, {});
    const body = res.body as ErrorResponse;
    expect(typeof body.errorCode).toBe('string');
    expect(body.errorCode.length).toBeGreaterThan(0);
  });

  it('returns 200 when productId is provided (demo id)', async () => {
    const res = await getFinancing(app, { productId: 'iphone-15' });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// AC-2  Unknown productId returns 404
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/financing — unknown productId → 404', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns 404 for an unknown productId', async () => {
    const res = await getFinancing(app, { productId: UNKNOWN_PRODUCT_ID });
    expect(res.status).toBe(404);
  });

  it('404 response has an errorCode field', async () => {
    const res = await getFinancing(app, { productId: UNKNOWN_PRODUCT_ID });
    const body = res.body as ErrorResponse;
    expect(typeof body.errorCode).toBe('string');
  });

  it('known demo product does not return 404', async () => {
    const res = await getFinancing(app, { productId: 'iphone-15-pro' });
    expect(res.status).not.toBe(404);
  });
});

// ---------------------------------------------------------------------------
// AC-3  Response shape: FinancingQuote[]
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/financing — response is FinancingQuote[]', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await getFinancing(app, { productId: 'iphone-15' });
  });

  it('returns HTTP 200', () => {
    expect(result.status).toBe(200);
  });

  it('response body is an array', () => {
    expect(Array.isArray(result.body)).toBe(true);
  });

  it('array contains at least one FinancingQuote', () => {
    expect((result.body as unknown[]).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC-4  Each FinancingQuote contains all five required fields
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/financing — FinancingQuote field completeness', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  for (const productId of DEMO_PRODUCT_IDS) {
    describe(`productId = ${productId}`, () => {
      let quotes: FinancingQuote[];

      beforeAll(async () => {
        const res = await getFinancing(app, { productId });
        quotes = res.body as FinancingQuote[];
      });

      it('each quote has termMonths', () => {
        for (const q of quotes) {
          expect(q).toHaveProperty('termMonths');
        }
      });

      it('each quote has monthlyAmount', () => {
        for (const q of quotes) {
          expect(q).toHaveProperty('monthlyAmount');
        }
      });

      it('each quote has onceOffDeposit', () => {
        for (const q of quotes) {
          expect(q).toHaveProperty('onceOffDeposit');
        }
      });

      it('each quote has totalCost', () => {
        for (const q of quotes) {
          expect(q).toHaveProperty('totalCost');
        }
      });

      it('each quote has interestRate', () => {
        for (const q of quotes) {
          expect(q).toHaveProperty('interestRate');
        }
      });
    });
  }
});

// ---------------------------------------------------------------------------
// AC-5  Field type correctness
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/financing — FinancingQuote field types', () => {
  let app: Application;
  let quotes: FinancingQuote[];

  beforeAll(async () => {
    app = getApp();
    const res = await getFinancing(app, { productId: 'iphone-15-pro' });
    quotes = res.body as FinancingQuote[];
  });

  it('termMonths is a positive integer on every quote', () => {
    for (const q of quotes) {
      expect(typeof q.termMonths).toBe('number');
      expect(Number.isInteger(q.termMonths)).toBe(true);
      expect(q.termMonths).toBeGreaterThan(0);
    }
  });

  it('monthlyAmount is a non-negative number on every quote', () => {
    for (const q of quotes) {
      expect(typeof q.monthlyAmount).toBe('number');
      expect(q.monthlyAmount).toBeGreaterThanOrEqual(0);
    }
  });

  it('onceOffDeposit is a non-negative number on every quote', () => {
    for (const q of quotes) {
      expect(typeof q.onceOffDeposit).toBe('number');
      expect(q.onceOffDeposit).toBeGreaterThanOrEqual(0);
    }
  });

  it('totalCost is a positive number on every quote', () => {
    for (const q of quotes) {
      expect(typeof q.totalCost).toBe('number');
      expect(q.totalCost).toBeGreaterThan(0);
    }
  });

  it('interestRate is a non-negative number on every quote', () => {
    for (const q of quotes) {
      expect(typeof q.interestRate).toBe('number');
      expect(q.interestRate).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-6  Charge group separation: once-off vs recurring
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/financing — once-off vs recurring separation', () => {
  let app: Application;
  let quotes: FinancingQuote[];

  beforeAll(async () => {
    app = getApp();
    const res = await getFinancing(app, { productId: 'samsung-s24-ultra' });
    quotes = res.body as FinancingQuote[];
  });

  it('onceOffDeposit (once-off charge) is a separate field from monthlyAmount (recurring charge)', () => {
    for (const q of quotes) {
      expect(Object.prototype.hasOwnProperty.call(q, 'onceOffDeposit')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(q, 'monthlyAmount')).toBe(true);
    }
  });

  it('onceOffDeposit and monthlyAmount are independent values', () => {
    for (const q of quotes) {
      // They can be equal by coincidence but must be independently represented
      expect(typeof q.onceOffDeposit).toBe('number');
      expect(typeof q.monthlyAmount).toBe('number');
    }
  });

  it('totalCost is consistent with term: termMonths * monthlyAmount + onceOffDeposit approx equals totalCost', () => {
    for (const q of quotes) {
      const computed = q.termMonths * q.monthlyAmount + q.onceOffDeposit;
      // Allow up to 1 ZAR rounding tolerance
      expect(Math.abs(computed - q.totalCost)).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-7  Deterministic responses for demo device IDs
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/financing — deterministic demo responses', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  for (const productId of DEMO_PRODUCT_IDS) {
    it(`${productId} returns the same quotes on repeated calls`, async () => {
      const first = await getFinancing(app, { productId });
      const second = await getFinancing(app, { productId });
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(first.body).toEqual(second.body);
    });
  }

  it('iphone-15-pro and iphone-15 return different quote amounts', async () => {
    const pro = await getFinancing(app, { productId: 'iphone-15-pro' });
    const base = await getFinancing(app, { productId: 'iphone-15' });
    expect(pro.status).toBe(200);
    expect(base.status).toBe(200);
    const proQuotes = pro.body as FinancingQuote[];
    const baseQuotes = base.body as FinancingQuote[];
    // At least one monthly amount must differ between the two products
    const proMonthly = proQuotes.map(q => q.monthlyAmount);
    const baseMonthly = baseQuotes.map(q => q.monthlyAmount);
    const allSame = proMonthly.every((v, i) => v === baseMonthly[i]);
    expect(allSame).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC-8  Optional planId param is accepted without error
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/financing — planId optional param', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns 200 when both productId and planId are provided', async () => {
    const res = await getFinancing(app, { productId: 'iphone-15', planId: 'plan_unlimited_20gb' });
    expect(res.status).toBe(200);
  });

  it('response is still a FinancingQuote array when planId is provided', async () => {
    const res = await getFinancing(app, { productId: 'iphone-15', planId: 'plan_unlimited_20gb' });
    expect(Array.isArray(res.body)).toBe(true);
    const quotes = res.body as FinancingQuote[];
    expect(quotes.length).toBeGreaterThan(0);
    for (const q of quotes) {
      expect(q).toHaveProperty('termMonths');
      expect(q).toHaveProperty('monthlyAmount');
      expect(q).toHaveProperty('onceOffDeposit');
      expect(q).toHaveProperty('totalCost');
      expect(q).toHaveProperty('interestRate');
    }
  });

  it('returns 200 without planId (planId is truly optional)', async () => {
    const res = await getFinancing(app, { productId: 'samsung-s24-ultra' });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// AC-9  All three demo device IDs return non-empty quote arrays
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/financing — demo device IDs all return quotes', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  for (const productId of DEMO_PRODUCT_IDS) {
    it(`${productId} returns a non-empty FinancingQuote array`, async () => {
      const res = await getFinancing(app, { productId });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as unknown[]).length).toBeGreaterThan(0);
    });
  }
});

// ---------------------------------------------------------------------------
// AC-10  Route is wired through the API Gateway Layer
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/financing — API Gateway Layer wiring', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('endpoint is mounted under /api/upgrade/financing', async () => {
    const res = await getFinancing(app, { productId: 'iphone-15' });
    expect(res.status).not.toBe(404);
  });

  it('endpoint does not return 500 for a valid demo productId', async () => {
    const res = await getFinancing(app, { productId: 'iphone-15-pro' });
    expect(res.status).not.toBe(500);
  });
});
