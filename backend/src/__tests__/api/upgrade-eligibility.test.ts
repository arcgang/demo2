import request from 'supertest';
import express, { Application } from 'express';

/**
 * Acceptance tests for the Eligibility Service API (task: Backend – Eligibility Service API
 * with three-state outcome model).
 *
 * Contract (LLD §5 / task acceptance criteria):
 *
 *   GET /api/upgrade/eligibility
 *     Auth-gated (Authorization: ******
 *     Returns EligibilityResult:
 *       {
 *         status: 'ELIGIBLE' | 'CONDITIONALLY_ELIGIBLE' | 'NOT_ELIGIBLE',
 *         currentPlan: { name: string, monthlyCost: number, contractEndDate: string },
 *         nextStepGuidance: string[],        // non-empty when NOT ELIGIBLE or CONDITIONALLY_ELIGIBLE
 *         availableUpgradeOfferIds: string[] // non-empty only when ELIGIBLE
 *       }
 *
 *   POST /api/upgrade/eligibility
 *     Request: { customerId, lineId, marketCode }
 *     200 Response: { currentPlan: string, upgradeWindowOpen: boolean, availableDevices: string[] }
 *
 *   POST /api/carts/:cartId/items
 *     Eligibility gate: upgrade-only offers added by a NOT_ELIGIBLE customer are rejected
 *     with HTTP 403 and the EligibilityResult payload as the response body.
 *
 * Seeded demo tokens (deterministic mock):
 *   token_eligible     → contract end ≤ 90 days  → ELIGIBLE
 *   token_cond         → contract end 91-180 days → CONDITIONALLY_ELIGIBLE
 *   token_not_eligible → contract end > 180 days  → NOT_ELIGIBLE
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

interface CurrentPlan {
  name: string;
  monthlyCost: number;
  contractEndDate: string;
}

interface EligibilityResult {
  status: 'ELIGIBLE' | 'CONDITIONALLY_ELIGIBLE' | 'NOT_ELIGIBLE';
  currentPlan: CurrentPlan;
  nextStepGuidance: string[];
  availableUpgradeOfferIds: string[];
}

interface PostEligibilityResult {
  currentPlan: string;
  upgradeWindowOpen: boolean;
  availableDevices: string[];
}

interface ErrorResponse {
  errorCode: string;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}

async function fetchEligibility(
  app: Application,
  token: string | null,
): Promise<{ status: number; body: EligibilityResult }> {
  const req = request(app).get('/api/upgrade/eligibility');
  if (token) {
    req.set('Authorization', 'Bearer ' + token);
  }
  const res = await req;
  return { status: res.status, body: res.body as EligibilityResult };
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

async function addCartItem(
  app: Application,
  cartId: string,
  offerId: string,
  token: string | null,
): Promise<{ status: number; body: unknown }> {
  const req = request(app)
    .post(`/api/carts/${cartId}/items`)
    .send({
      lines: [
        {
          lineType: 'UPGRADE_OFFER',
          productId: offerId,
          quantity: 1,
        },
      ],
    });
  if (token) {
    req.set('Authorization', 'Bearer ' + token);
  }
  const res = await req;
  return { status: res.status, body: res.body };
}

function assertEligibilityResultShape(body: EligibilityResult): void {
  // top-level status
  expect(['ELIGIBLE', 'CONDITIONALLY_ELIGIBLE', 'NOT_ELIGIBLE']).toContain(body.status);

  // currentPlan shape
  expect(body).toHaveProperty('currentPlan');
  expect(typeof body.currentPlan.name).toBe('string');
  expect(body.currentPlan.name.length).toBeGreaterThan(0);
  expect(typeof body.currentPlan.monthlyCost).toBe('number');
  expect(body.currentPlan.monthlyCost).toBeGreaterThanOrEqual(0);
  expect(typeof body.currentPlan.contractEndDate).toBe('string');
  expect(new Date(body.currentPlan.contractEndDate).getTime()).not.toBeNaN();

  // guidance is always an array
  expect(Array.isArray(body.nextStepGuidance)).toBe(true);

  // availableUpgradeOfferIds is always an array
  expect(Array.isArray(body.availableUpgradeOfferIds)).toBe(true);
}

// ---------------------------------------------------------------------------
// AC-0  Auth gate (GET /api/upgrade/eligibility)
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/eligibility — auth gate', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 401 when no Authorization header is supplied', async () => {
    const { status } = await fetchEligibility(app, null);
    expect(status).toBe(401);
  });

  it('returns HTTP 401 when an unrecognised token is supplied', async () => {
    const { status } = await fetchEligibility(app, 'token_unknown_xyz');
    expect(status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// AC-1  EligibilityResult response shape (GET /api/upgrade/eligibility)
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/eligibility — response shape', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 200 for the seeded eligible customer', async () => {
    const { status } = await fetchEligibility(app, 'token_eligible');
    expect(status).toBe(200);
  });

  it('response body contains status field with one of the three allowed values', async () => {
    const { body } = await fetchEligibility(app, 'token_eligible');
    expect(['ELIGIBLE', 'CONDITIONALLY_ELIGIBLE', 'NOT_ELIGIBLE']).toContain(body.status);
  });

  it('response body contains a currentPlan object', async () => {
    const { body } = await fetchEligibility(app, 'token_eligible');
    expect(body).toHaveProperty('currentPlan');
    expect(typeof body.currentPlan).toBe('object');
  });

  it('currentPlan has name, monthlyCost, and contractEndDate fields', async () => {
    const { body } = await fetchEligibility(app, 'token_eligible');
    assertEligibilityResultShape(body);
  });

  it('nextStepGuidance is an array', async () => {
    const { body } = await fetchEligibility(app, 'token_eligible');
    expect(Array.isArray(body.nextStepGuidance)).toBe(true);
  });

  it('availableUpgradeOfferIds is an array', async () => {
    const { body } = await fetchEligibility(app, 'token_eligible');
    expect(Array.isArray(body.availableUpgradeOfferIds)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-2  Seeded ELIGIBLE customer
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/eligibility — seeded ELIGIBLE customer', () => {
  let app: Application;
  let body: EligibilityResult;

  beforeAll(async () => {
    app = getApp();
    const res = await fetchEligibility(app, 'token_eligible');
    body = res.body;
  });

  it('returns HTTP 200', async () => {
    const { status } = await fetchEligibility(app, 'token_eligible');
    expect(status).toBe(200);
  });

  it('status is ELIGIBLE', () => {
    expect(body.status).toBe('ELIGIBLE');
  });

  it('availableUpgradeOfferIds is non-empty for ELIGIBLE customer', () => {
    expect(body.availableUpgradeOfferIds.length).toBeGreaterThan(0);
  });

  it('every availableUpgradeOfferId is a non-empty string', () => {
    for (const id of body.availableUpgradeOfferIds) {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    }
  });

  it('full EligibilityResult shape is valid', () => {
    assertEligibilityResultShape(body);
  });
});

// ---------------------------------------------------------------------------
// AC-3  Seeded NOT_ELIGIBLE customer
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/eligibility — seeded NOT_ELIGIBLE customer', () => {
  let app: Application;
  let body: EligibilityResult;

  beforeAll(async () => {
    app = getApp();
    const res = await fetchEligibility(app, 'token_not_eligible');
    body = res.body;
  });

  it('returns HTTP 200', async () => {
    const { status } = await fetchEligibility(app, 'token_not_eligible');
    expect(status).toBe(200);
  });

  it('status is NOT_ELIGIBLE', () => {
    expect(body.status).toBe('NOT_ELIGIBLE');
  });

  it('availableUpgradeOfferIds is empty for NOT_ELIGIBLE customer', () => {
    expect(body.availableUpgradeOfferIds).toHaveLength(0);
  });

  it('nextStepGuidance is non-empty for NOT_ELIGIBLE customer', () => {
    expect(body.nextStepGuidance.length).toBeGreaterThan(0);
  });

  it('nextStepGuidance contains "Contact Support"', () => {
    expect(body.nextStepGuidance).toContain('Contact Support');
  });

  it('nextStepGuidance contains "View your current plan"', () => {
    expect(body.nextStepGuidance).toContain('View your current plan');
  });

  it('full EligibilityResult shape is valid', () => {
    assertEligibilityResultShape(body);
  });
});

// ---------------------------------------------------------------------------
// AC-4  Seeded CONDITIONALLY_ELIGIBLE customer
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/eligibility — seeded CONDITIONALLY_ELIGIBLE customer', () => {
  let app: Application;
  let body: EligibilityResult;

  beforeAll(async () => {
    app = getApp();
    const res = await fetchEligibility(app, 'token_cond');
    body = res.body;
  });

  it('returns HTTP 200', async () => {
    const { status } = await fetchEligibility(app, 'token_cond');
    expect(status).toBe(200);
  });

  it('status is CONDITIONALLY_ELIGIBLE', () => {
    expect(body.status).toBe('CONDITIONALLY_ELIGIBLE');
  });

  it('availableUpgradeOfferIds is empty for CONDITIONALLY_ELIGIBLE customer', () => {
    expect(body.availableUpgradeOfferIds).toHaveLength(0);
  });

  it('nextStepGuidance is non-empty for CONDITIONALLY_ELIGIBLE customer', () => {
    expect(body.nextStepGuidance.length).toBeGreaterThan(0);
  });

  it('every guidance item is a non-empty string', () => {
    for (const item of body.nextStepGuidance) {
      expect(typeof item).toBe('string');
      expect(item.trim().length).toBeGreaterThan(0);
    }
  });

  it('full EligibilityResult shape is valid', () => {
    assertEligibilityResultShape(body);
  });
});

// ---------------------------------------------------------------------------
// AC-5  Eligibility gate on cart add — NOT_ELIGIBLE customer blocked with 403
// ---------------------------------------------------------------------------

describe('POST /api/carts/:cartId/items — eligibility gate', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 403 when NOT_ELIGIBLE customer attempts to add an upgrade-only offer', async () => {
    const { status } = await addCartItem(app, 'cart_demo_001', 'offer_upgrade_only_001', 'token_not_eligible');
    expect(status).toBe(403);
  });

  it('403 response body includes an EligibilityResult with status NOT_ELIGIBLE', async () => {
    const { body } = await addCartItem(app, 'cart_demo_001', 'offer_upgrade_only_001', 'token_not_eligible');
    const result = body as EligibilityResult;
    expect(result.status).toBe('NOT_ELIGIBLE');
  });

  it('403 response body EligibilityResult has a currentPlan object', async () => {
    const { body } = await addCartItem(app, 'cart_demo_001', 'offer_upgrade_only_001', 'token_not_eligible');
    const result = body as EligibilityResult;
    expect(result).toHaveProperty('currentPlan');
    expect(typeof result.currentPlan).toBe('object');
  });

  it('403 response body EligibilityResult has nextStepGuidance array', async () => {
    const { body } = await addCartItem(app, 'cart_demo_001', 'offer_upgrade_only_001', 'token_not_eligible');
    const result = body as EligibilityResult;
    expect(Array.isArray(result.nextStepGuidance)).toBe(true);
    expect(result.nextStepGuidance.length).toBeGreaterThan(0);
  });

  it('403 response body EligibilityResult has empty availableUpgradeOfferIds', async () => {
    const { body } = await addCartItem(app, 'cart_demo_001', 'offer_upgrade_only_001', 'token_not_eligible');
    const result = body as EligibilityResult;
    expect(Array.isArray(result.availableUpgradeOfferIds)).toBe(true);
    expect(result.availableUpgradeOfferIds).toHaveLength(0);
  });

  it('full 403 EligibilityResult shape is valid', async () => {
    const { body } = await addCartItem(app, 'cart_demo_001', 'offer_upgrade_only_001', 'token_not_eligible');
    assertEligibilityResultShape(body as EligibilityResult);
  });

  it('ELIGIBLE customer adding an upgrade-only offer is NOT blocked (does not return 403)', async () => {
    const { status } = await addCartItem(app, 'cart_demo_002', 'offer_upgrade_only_001', 'token_eligible');
    expect(status).not.toBe(403);
  });

  it('CONDITIONALLY_ELIGIBLE customer adding an upgrade-only offer returns HTTP 200', async () => {
    const { status } = await addCartItem(app, 'cart_demo_003', 'offer_upgrade_only_001', 'token_cond');
    expect(status).toBe(200);
  });

  it('CONDITIONALLY_ELIGIBLE cart response body contains eligibility.status === CONDITIONALLY_ELIGIBLE', async () => {
    const { body } = await addCartItem(app, 'cart_demo_003', 'offer_upgrade_only_001', 'token_cond');
    const result = body as { eligibility: EligibilityResult };
    expect(result.eligibility.status).toBe('CONDITIONALLY_ELIGIBLE');
  });

  it('returns HTTP 401 when no Authorization header is provided with an UPGRADE_OFFER line', async () => {
    const { status } = await addCartItem(app, 'cart_demo_001', 'offer_upgrade_only_001', null);
    expect(status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/upgrade/eligibility — valid request
// ---------------------------------------------------------------------------

const VALID_POST_PAYLOAD = {
  customerId: 'cust_1001',
  lineId: 'msisdn_27831234567',
  marketCode: 'ZA',
};

describe('POST /api/upgrade/eligibility — valid request', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await postEligibility(app, VALID_POST_PAYLOAD);
  });

  it('returns HTTP 200', () => {
    expect(result.status).toBe(200);
  });

  it('response body contains currentPlan as a non-empty string', () => {
    const body = result.body as PostEligibilityResult;
    expect(typeof body.currentPlan).toBe('string');
    expect(body.currentPlan.length).toBeGreaterThan(0);
  });

  it('response body contains upgradeWindowOpen as a boolean', () => {
    const body = result.body as PostEligibilityResult;
    expect(typeof body.upgradeWindowOpen).toBe('boolean');
  });

  it('response body contains availableDevices as an array', () => {
    const body = result.body as PostEligibilityResult;
    expect(Array.isArray(body.availableDevices)).toBe(true);
  });

  it('availableDevices entries are strings', () => {
    const body = result.body as PostEligibilityResult;
    for (const d of body.availableDevices) {
      expect(typeof d).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/upgrade/eligibility — missing required fields — 422
// ---------------------------------------------------------------------------

describe('POST /api/upgrade/eligibility — missing required fields', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns 422 when customerId is omitted', async () => {
    const res = await postEligibility(app, { lineId: 'msisdn_27831234567', marketCode: 'ZA' });
    expect(res.status).toBe(422);
  });

  it('returns 422 when lineId is omitted', async () => {
    const res = await postEligibility(app, { customerId: 'cust_1001', marketCode: 'ZA' });
    expect(res.status).toBe(422);
  });

  it('returns 422 when marketCode is omitted', async () => {
    const res = await postEligibility(app, { customerId: 'cust_1001', lineId: 'msisdn_27831234567' });
    expect(res.status).toBe(422);
  });

  it('422 response for missing customerId has a non-empty errors array', async () => {
    const res = await postEligibility(app, { lineId: 'msisdn_27831234567', marketCode: 'ZA' });
    const body = res.body as ErrorResponse;
    expect(Array.isArray(body.errors)).toBe(true);
    expect((body.errors as unknown[]).length).toBeGreaterThan(0);
  });

  it('422 response for missing lineId references the lineId field', async () => {
    const res = await postEligibility(app, { customerId: 'cust_1001', marketCode: 'ZA' });
    const body = res.body as ErrorResponse;
    const err = (body.errors ?? []).find((e) => e.field === 'lineId');
    expect(err).toBeDefined();
  });

  it('422 response for missing marketCode references the marketCode field', async () => {
    const res = await postEligibility(app, { customerId: 'cust_1001', lineId: 'msisdn_27831234567' });
    const body = res.body as ErrorResponse;
    const err = (body.errors ?? []).find((e) => e.field === 'marketCode');
    expect(err).toBeDefined();
  });
});
