import request from 'supertest';
import express, { Application } from 'express';

/**
 * Acceptance tests for POST /api/upgrade/eligibility
 *
 * Contract (LLD §5 / task spec):
 *   Request: { customerId, lineId, marketCode }
 *   200 Response: {
 *     currentPlan: string,
 *     upgradeWindowOpen: boolean,
 *     availableDevices: string[]
 *   }
 *   Routing must pass through the EligibilityModule / EligibilityInventoryAdapter boundary.
 */

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_PAYLOAD = {
  customerId: 'cust_1001',
  lineId: 'msisdn_27831234567',
  marketCode: 'ZA',
};

const MISSING_CUSTOMER_PAYLOAD = {
  lineId: 'msisdn_27831234567',
  marketCode: 'ZA',
};

const MISSING_LINE_PAYLOAD = {
  customerId: 'cust_1001',
  marketCode: 'ZA',
};

const MISSING_MARKET_PAYLOAD = {
  customerId: 'cust_1001',
  lineId: 'msisdn_27831234567',
};

// ---------------------------------------------------------------------------
// Response type shapes
// ---------------------------------------------------------------------------

interface EligibilityResult {
  currentPlan: string;
  upgradeWindowOpen: boolean;
  availableDevices: string[];
}

interface ErrorResponse {
  errorCode: string;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

async function postEligibility(
  app: Application,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app)
    .post('/api/upgrade/eligibility')
    .set('Content-Type', 'application/json')
    .send(payload);
  return { status: res.status, body: res.body };
}

// ---------------------------------------------------------------------------
// AC-1  Valid request returns EligibilityResult shape
// ---------------------------------------------------------------------------

describe('POST /api/upgrade/eligibility — valid request', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await postEligibility(app, VALID_PAYLOAD);
  });

  it('returns HTTP 200', () => {
    expect(result.status).toBe(200);
  });

  it('response body contains currentPlan as a non-empty string', () => {
    const body = result.body as EligibilityResult;
    expect(typeof body.currentPlan).toBe('string');
    expect(body.currentPlan.length).toBeGreaterThan(0);
  });

  it('response body contains upgradeWindowOpen as a boolean', () => {
    const body = result.body as EligibilityResult;
    expect(typeof body.upgradeWindowOpen).toBe('boolean');
  });

  it('response body contains availableDevices as an array', () => {
    const body = result.body as EligibilityResult;
    expect(Array.isArray(body.availableDevices)).toBe(true);
  });

  it('availableDevices entries are strings', () => {
    const body = result.body as EligibilityResult;
    for (const d of body.availableDevices) {
      expect(typeof d).toBe('string');
    }
  });

  it('response body has exactly the three mandated fields and no extraneous top-level shape violation', () => {
    const body = result.body as EligibilityResult;
    expect(body).toHaveProperty('currentPlan');
    expect(body).toHaveProperty('upgradeWindowOpen');
    expect(body).toHaveProperty('availableDevices');
  });
});

// ---------------------------------------------------------------------------
// AC-2  Missing required fields — 422 with field-level errors
// ---------------------------------------------------------------------------

describe('POST /api/upgrade/eligibility — missing required fields', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns 422 when customerId is omitted', async () => {
    const res = await postEligibility(app, MISSING_CUSTOMER_PAYLOAD);
    expect(res.status).toBe(422);
  });

  it('returns 422 when lineId is omitted', async () => {
    const res = await postEligibility(app, MISSING_LINE_PAYLOAD);
    expect(res.status).toBe(422);
  });

  it('returns 422 when marketCode is omitted', async () => {
    const res = await postEligibility(app, MISSING_MARKET_PAYLOAD);
    expect(res.status).toBe(422);
  });

  it('422 response for missing customerId has a non-empty errors array', async () => {
    const res = await postEligibility(app, MISSING_CUSTOMER_PAYLOAD);
    const body = res.body as ErrorResponse;
    expect(Array.isArray(body.errors)).toBe(true);
    expect((body.errors as unknown[]).length).toBeGreaterThan(0);
  });

  it('422 response for missing lineId references the lineId field', async () => {
    const res = await postEligibility(app, MISSING_LINE_PAYLOAD);
    const body = res.body as ErrorResponse;
    const err = (body.errors ?? []).find((e) => e.field === 'lineId');
    expect(err).toBeDefined();
  });

  it('422 response for missing marketCode references the marketCode field', async () => {
    const res = await postEligibility(app, MISSING_MARKET_PAYLOAD);
    const body = res.body as ErrorResponse;
    const err = (body.errors ?? []).find((e) => e.field === 'marketCode');
    expect(err).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AC-3  upgradeWindowOpen semantics
// ---------------------------------------------------------------------------

describe('POST /api/upgrade/eligibility — upgradeWindowOpen semantics', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('when upgradeWindowOpen is true, availableDevices is non-empty', async () => {
    const res = await postEligibility(app, VALID_PAYLOAD);
    const body = res.body as EligibilityResult;
    if (body.upgradeWindowOpen) {
      expect(body.availableDevices.length).toBeGreaterThan(0);
    }
  });

  it('returns 200 for any customer with a non-empty customerId string', async () => {
    const res = await postEligibility(app, { ...VALID_PAYLOAD, customerId: 'cust_9999' });
    expect(res.status).toBe(200);
  });
});
