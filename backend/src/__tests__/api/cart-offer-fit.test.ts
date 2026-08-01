import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for Cart service offer-fit enforcement.
 *
 * Contract (LLD §5.5 validation rules, §6.1 VAL-03, task spec AC-c):
 *   POST /api/carts/{cartId}/items must call the offer-fit check before
 *   committing a device+plan combination.
 *
 *   - Incompatible device+plan addition → HTTP 422 with a reason field.
 *   - Compatible device+plan addition → HTTP 200/201 (item accepted).
 *   - Cart totals for a valid device+plan pair reflect the combination's
 *     specific pricing (AC-4 from task spec).
 *
 * Acceptance criteria mapped:
 *   AC-c1  Adding an incompatible plan to a cart that already has a device
 *          returns HTTP 422 with a structured error body including reason.
 *   AC-c2  Adding a compatible plan to a cart with a device returns HTTP 200/201.
 *   AC-c3  GET /api/carts/{cartId} totals include onceOffSubtotal, recurringSubtotal,
 *          and taxAmount reflecting the device+plan combo pricing.
 */

// ─── response shapes ─────────────────────────────────────────────────────────

interface CartCreateResponse {
  cartId: string;
  status: string;
}

interface CartTotals {
  onceOffSubtotal: number;
  recurringSubtotal: number;
  taxAmount: number;
  payableNow: number;
}

interface CartGetResponse {
  cartId: string;
  items: Array<{
    lineType: string;
    onceOffAmount: number;
    recurringAmount: number;
  }>;
  totals: CartTotals;
}

interface IncompatibleErrorResponse {
  errorCode?: string;
  message?: string;
  reason?: string;
  compatible?: boolean;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app') as { createApp: () => Application };
  return createApp();
}

async function createCart(app: Application): Promise<string> {
  const res = await request(app)
    .post('/api/carts')
    .send({ marketCode: 'ZA', customerContext: { customerId: 'cust_test_001', isAuthenticated: false } })
    .set('Content-Type', 'application/json');
  expect(res.status).toBe(201);
  return (res.body as CartCreateResponse).cartId;
}

async function addCartItems(
  app: Application,
  cartId: string,
  lines: Array<{ lineType: string; productId: string; quantity: number }>,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app)
    .post(`/api/carts/${cartId}/items`)
    .send({ lines })
    .set('Content-Type', 'application/json');
  return { status: res.status, body: res.body };
}

async function getCart(app: Application, cartId: string): Promise<{ status: number; body: unknown }> {
  const res = await request(app).get(`/api/carts/${cartId}`);
  return { status: res.status, body: res.body };
}

// ─── seed constants ───────────────────────────────────────────────────────────

const DEVICE_ID          = 'prod_za_iphone15pro_256';
const COMPATIBLE_PLAN    = 'plan_za_red_essential_20gb';
const INCOMPATIBLE_PLAN  = 'plan_tz_nonexistent_999';

// ─────────────────────────────────────────────────────────────────────────────
// AC-c1  Cart rejects incompatible device+plan addition with 422 + reason
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/carts/{cartId}/items — AC-c1 incompatible pair rejected', () => {
  let app: Application;
  let cartId: string;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    cartId = await createCart(app);
    result = await addCartItems(app, cartId, [
      { lineType: 'DEVICE', productId: DEVICE_ID, quantity: 1 },
      { lineType: 'PLAN',   productId: INCOMPATIBLE_PLAN, quantity: 1 },
    ]);
  });

  it('returns HTTP 422 when an incompatible plan is added with a device', () => {
    expect(result.status).toBe(422);
  });

  it('response body contains a reason field', () => {
    const body = result.body as IncompatibleErrorResponse;
    const reason = body.reason ?? body.message;
    expect(typeof reason).toBe('string');
    expect((reason as string).trim().length).toBeGreaterThan(0);
  });

  it('response body is a non-null object', () => {
    expect(typeof result.body).toBe('object');
    expect(result.body).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-c2  Compatible device+plan addition succeeds
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/carts/{cartId}/items — AC-c2 compatible pair accepted', () => {
  let app: Application;
  let cartId: string;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    cartId = await createCart(app);
    result = await addCartItems(app, cartId, [
      { lineType: 'DEVICE', productId: DEVICE_ID, quantity: 1 },
      { lineType: 'PLAN',   productId: COMPATIBLE_PLAN, quantity: 1 },
    ]);
  });

  it('returns HTTP 200 or 201 when a compatible device+plan pair is added', () => {
    expect([200, 201]).toContain(result.status);
  });

  it('response body is a non-null object', () => {
    expect(typeof result.body).toBe('object');
    expect(result.body).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-c3  Cart totals reflect device+plan combo pricing
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/carts/{cartId} — AC-c3 totals reflect combo pricing', () => {
  let app: Application;
  let cartId: string;
  let cartBody: CartGetResponse;

  beforeAll(async () => {
    app = getApp();
    cartId = await createCart(app);
    const addResult = await addCartItems(app, cartId, [
      { lineType: 'DEVICE', productId: DEVICE_ID, quantity: 1 },
      { lineType: 'PLAN',   productId: COMPATIBLE_PLAN, quantity: 1 },
    ]);
    expect([200, 201]).toContain(addResult.status);
    const { body } = await getCart(app, cartId);
    cartBody = body as CartGetResponse;
  });

  it('GET cart returns HTTP 200', async () => {
    const app2 = getApp();
    const cartId2 = await createCart(app2);
    await addCartItems(app2, cartId2, [
      { lineType: 'DEVICE', productId: DEVICE_ID, quantity: 1 },
      { lineType: 'PLAN',   productId: COMPATIBLE_PLAN, quantity: 1 },
    ]);
    const { status } = await getCart(app2, cartId2);
    expect(status).toBe(200);
  });

  it('totals object is present', () => {
    expect(cartBody.totals).toBeDefined();
    expect(typeof cartBody.totals).toBe('object');
  });

  it('totals.onceOffSubtotal is a positive number (device has a price)', () => {
    expect(typeof cartBody.totals.onceOffSubtotal).toBe('number');
    expect(cartBody.totals.onceOffSubtotal).toBeGreaterThan(0);
  });

  it('totals.recurringSubtotal is a positive number (plan has a recurring fee)', () => {
    expect(typeof cartBody.totals.recurringSubtotal).toBe('number');
    expect(cartBody.totals.recurringSubtotal).toBeGreaterThan(0);
  });

  it('totals.taxAmount is a non-negative number', () => {
    expect(typeof cartBody.totals.taxAmount).toBe('number');
    expect(cartBody.totals.taxAmount).toBeGreaterThanOrEqual(0);
  });

  it('totals.payableNow is a non-negative number', () => {
    expect(typeof cartBody.totals.payableNow).toBe('number');
    expect(cartBody.totals.payableNow).toBeGreaterThanOrEqual(0);
  });

  it('items array contains both the DEVICE and PLAN line', () => {
    expect(Array.isArray(cartBody.items)).toBe(true);
    const types = cartBody.items.map(i => i.lineType);
    expect(types).toContain('DEVICE');
    expect(types).toContain('PLAN');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-c4  Adding a plan alone (no device) does not trigger offer-fit check
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/carts/{cartId}/items — AC-c4 plan-only addition succeeds', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('adding only a plan to a cart succeeds without offer-fit rejection', async () => {
    const cartId = await createCart(app);
    const { status } = await addCartItems(app, cartId, [
      { lineType: 'PLAN', productId: COMPATIBLE_PLAN, quantity: 1 },
    ]);
    expect([200, 201]).toContain(status);
  });
});
