import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for POST /api/offer-fit
 *
 * Contract (LLD §5, §6.1 VAL-03, task spec):
 *   Request:  { deviceId: string, planId: string }
 *   200 Response (compatible):
 *     { compatible: true, pricing: { onceOff: number, monthly: number, vatRate: number } }
 *   422 Response (incompatible):
 *     { compatible: false, reason: string }
 *
 * Acceptance criteria:
 *   AC-1  Compatible pair returns HTTP 200 with compatible=true and a pricing object.
 *   AC-2  Incompatible pair returns HTTP 422 with compatible=false and a non-empty reason string.
 *   AC-3  Missing deviceId or planId returns HTTP 400.
 *   AC-4  pricing object contains onceOff, monthly, and vatRate fields.
 *   AC-5  vatRate is a number between 0 and 1 (exclusive).
 */

// ─── response shapes ─────────────────────────────────────────────────────────

interface OfferFitPricing {
  onceOff: number;
  monthly: number;
  vatRate: number;
}

interface OfferFitResponse {
  compatible: boolean;
  reason?: string;
  pricing?: OfferFitPricing;
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

async function postOfferFit(
  app: Application,
  body: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app)
    .post('/api/offer-fit')
    .send(body)
    .set('Content-Type', 'application/json');
  return { status: res.status, body: res.body };
}

// ─── seed constants drawn from catalogData (ZA_PLAN_IDS cover all ZA_DEVICES) ─

// A known compatible pair: iPhone 15 Pro + Red Essential 20GB
const COMPATIBLE_DEVICE = 'prod_za_iphone15pro_256';
const COMPATIBLE_PLAN   = 'plan_za_red_essential_20gb';

// An incompatible pair: use a device SKU with a plan SKU from a different
// market or a non-existent plan ID so the rule fires.
const INCOMPATIBLE_DEVICE = 'prod_za_iphone15pro_256';
const INCOMPATIBLE_PLAN   = 'plan_tz_nonexistent_999';

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  Compatible pair → 200 with compatible=true
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/offer-fit — AC-1 compatible pair 200', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await postOfferFit(app, {
      deviceId: COMPATIBLE_DEVICE,
      planId: COMPATIBLE_PLAN,
    });
  });

  it('returns HTTP 200 for a compatible device+plan pair', () => {
    expect(result.status).toBe(200);
  });

  it('response body is a non-null object', () => {
    expect(typeof result.body).toBe('object');
    expect(result.body).not.toBeNull();
  });

  it('compatible is true', () => {
    const body = result.body as OfferFitResponse;
    expect(body.compatible).toBe(true);
  });

  it('pricing object is present', () => {
    const body = result.body as OfferFitResponse;
    expect(body.pricing).toBeDefined();
    expect(typeof body.pricing).toBe('object');
  });

  it('reason is absent or undefined for compatible pairs', () => {
    const body = result.body as OfferFitResponse;
    expect(body.reason).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  Incompatible pair → 422 with compatible=false and reason
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/offer-fit — AC-2 incompatible pair 422', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await postOfferFit(app, {
      deviceId: INCOMPATIBLE_DEVICE,
      planId: INCOMPATIBLE_PLAN,
    });
  });

  it('returns HTTP 422 for an incompatible device+plan pair', () => {
    expect(result.status).toBe(422);
  });

  it('compatible is false', () => {
    const body = result.body as OfferFitResponse;
    expect(body.compatible).toBe(false);
  });

  it('reason is a non-empty string', () => {
    const body = result.body as OfferFitResponse;
    expect(typeof body.reason).toBe('string');
    expect((body.reason as string).trim().length).toBeGreaterThan(0);
  });

  it('pricing is absent for incompatible pairs', () => {
    const body = result.body as OfferFitResponse;
    expect(body.pricing).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  Missing required fields → 400
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/offer-fit — AC-3 missing fields 400', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns 400 when deviceId is missing', async () => {
    const { status } = await postOfferFit(app, { planId: COMPATIBLE_PLAN });
    expect(status).toBe(400);
  });

  it('returns 400 when planId is missing', async () => {
    const { status } = await postOfferFit(app, { deviceId: COMPATIBLE_DEVICE });
    expect(status).toBe(400);
  });

  it('returns 400 when both fields are missing', async () => {
    const { status } = await postOfferFit(app, {});
    expect(status).toBe(400);
  });

  it('400 response has an errorCode field', async () => {
    const { body } = await postOfferFit(app, {});
    const err = body as ErrorResponse;
    expect(typeof err.errorCode).toBe('string');
    expect(err.errorCode.trim().length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  pricing object shape for compatible pair
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/offer-fit — AC-4 pricing object fields', () => {
  let app: Application;
  let pricing: OfferFitPricing;

  beforeAll(async () => {
    app = getApp();
    const { body } = await postOfferFit(app, {
      deviceId: COMPATIBLE_DEVICE,
      planId: COMPATIBLE_PLAN,
    });
    pricing = (body as OfferFitResponse).pricing as OfferFitPricing;
  });

  it('pricing.onceOff is a non-negative number', () => {
    expect(typeof pricing.onceOff).toBe('number');
    expect(pricing.onceOff).toBeGreaterThanOrEqual(0);
  });

  it('pricing.monthly is a non-negative number', () => {
    expect(typeof pricing.monthly).toBe('number');
    expect(pricing.monthly).toBeGreaterThanOrEqual(0);
  });

  it('pricing.vatRate is a number', () => {
    expect(typeof pricing.vatRate).toBe('number');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  vatRate is between 0 and 1 exclusive
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/offer-fit — AC-5 vatRate range', () => {
  let app: Application;
  let pricing: OfferFitPricing;

  beforeAll(async () => {
    app = getApp();
    const { body } = await postOfferFit(app, {
      deviceId: COMPATIBLE_DEVICE,
      planId: COMPATIBLE_PLAN,
    });
    pricing = (body as OfferFitResponse).pricing as OfferFitPricing;
  });

  it('vatRate is greater than 0', () => {
    expect(pricing.vatRate).toBeGreaterThan(0);
  });

  it('vatRate is less than 1', () => {
    expect(pricing.vatRate).toBeLessThan(1);
  });
});
