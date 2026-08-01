import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests: Adapter timeout guardrails and degraded responses.
 *
 * Per task spec:
 *   - All outbound adapter calls in EligibilityService, FinancingService, and
 *     OrderManagementService must complete or time out within 1500 ms.
 *   - On timeout, the endpoint returns HTTP 200 with:
 *       { status: 'pending', ... }   (partial / degraded payload)
 *   - The degraded payload must still satisfy a minimal shape contract so the
 *     frontend can render a loading state.
 *   - Eligibility and order-summary endpoints must resolve (200 with
 *     status: 'pending' or a full result) within 2000 ms when the upstream
 *     adapter is slow.
 *
 * These tests inject a slow adapter via the SLOW_ADAPTER_MS environment
 * variable (or a module-level override if the implementation exposes one).
 * When no slowdown injection is available the tests verify the shape of a
 * degraded response returned by an intentionally slow mock.
 *
 * All tests are expected to FAIL against the current implementation because:
 *   1. No timeout budget is applied to adapter calls.
 *   2. No degraded (status: 'pending') response shape is emitted on timeout.
 */

const TIMEOUT_BUDGET_MS = 1500;
const ACCEPTANCE_WINDOW_MS = 2000;

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app') as { createApp: () => Application };
  return createApp();
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  Eligibility endpoint returns within 2000 ms when adapter is slow
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/upgrade/eligibility — adapter timeout guardrail', () => {
  let app: Application;

  beforeAll(() => {
    // Signal the implementation to use a slow mock adapter (> 1500 ms delay)
    process.env['SLOW_ADAPTER_MS'] = '2000';
    app = getApp();
  });

  afterAll(() => {
    delete process.env['SLOW_ADAPTER_MS'];
  });

  it('responds within the 2000 ms acceptance window even when the adapter is slow', async () => {
    const start = process.hrtime.bigint();
    const res = await request(app)
      .post('/api/upgrade/eligibility')
      .set('Content-Type', 'application/json')
      .send({ customerId: 'cust_1001', lineId: 'msisdn_27831234567', marketCode: 'ZA' })
      .timeout(ACCEPTANCE_WINDOW_MS + 500); // supertest client timeout to avoid hanging
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    expect(elapsedMs).toBeLessThan(ACCEPTANCE_WINDOW_MS);
    expect(res.status).toBe(200);
  }, ACCEPTANCE_WINDOW_MS + 1000);

  it('degraded response has status field equal to "pending"', async () => {
    const res = await request(app)
      .post('/api/upgrade/eligibility')
      .set('Content-Type', 'application/json')
      .send({ customerId: 'cust_1001', lineId: 'msisdn_27831234567', marketCode: 'ZA' })
      .timeout(ACCEPTANCE_WINDOW_MS + 500);
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body['status']).toBe('pending');
  }, ACCEPTANCE_WINDOW_MS + 1000);

  it('degraded response contains a partialData field or equivalent partial shape', async () => {
    const res = await request(app)
      .post('/api/upgrade/eligibility')
      .set('Content-Type', 'application/json')
      .send({ customerId: 'cust_1001', lineId: 'msisdn_27831234567', marketCode: 'ZA' })
      .timeout(ACCEPTANCE_WINDOW_MS + 500);
    const body = res.body as Record<string, unknown>;
    // At minimum a status: 'pending' plus some data key must be present
    expect(body['status']).toBe('pending');
    const hasPartial = body['partialData'] !== undefined
      || body['currentPlan'] !== undefined
      || body['upgradeWindowOpen'] !== undefined;
    expect(hasPartial).toBe(true);
  }, ACCEPTANCE_WINDOW_MS + 1000);
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  Financing endpoint returns within 2000 ms when adapter is slow
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/upgrade/financing — adapter timeout guardrail', () => {
  let app: Application;

  beforeAll(() => {
    process.env['SLOW_ADAPTER_MS'] = '2000';
    app = getApp();
  });

  afterAll(() => {
    delete process.env['SLOW_ADAPTER_MS'];
  });

  it('responds within the 2000 ms acceptance window even when the adapter is slow', async () => {
    const start = process.hrtime.bigint();
    const res = await request(app)
      .get('/api/upgrade/financing')
      .timeout(ACCEPTANCE_WINDOW_MS + 500);
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    expect(elapsedMs).toBeLessThan(ACCEPTANCE_WINDOW_MS);
    expect(res.status).toBe(200);
  }, ACCEPTANCE_WINDOW_MS + 1000);

  it('degraded financing response has a status field equal to "pending"', async () => {
    const res = await request(app)
      .get('/api/upgrade/financing')
      .timeout(ACCEPTANCE_WINDOW_MS + 500);
    expect(res.status).toBe(200);
    // When degraded the body may be a wrapper object or the array may contain a sentinel item.
    // The spec requires { status: 'pending' } at the top level or inside each degraded item.
    const body = res.body as unknown;
    if (Array.isArray(body)) {
      // Each item in the degraded array must carry a status field
      const items = body as Array<Record<string, unknown>>;
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item['status']).toBe('pending');
      }
    } else {
      expect((body as Record<string, unknown>)['status']).toBe('pending');
    }
  }, ACCEPTANCE_WINDOW_MS + 1000);
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  Order-creation endpoint returns within 2000 ms when adapter is slow
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/orders — adapter timeout guardrail', () => {
  let app: Application;

  const VALID_ORDER_PAYLOAD = {
    cartId: 'cart_timeout_test',
    paymentAttemptId: 'pay_timeout_test',
    paymentStatus: 'PENDING_PROVIDER_CONFIRMATION',
    lineItems: [{ name: 'iPhone 15', qty: 1, unitPrice: 18999 }],
    onceOffTotal: 18999,
    monthlyTotal: 799,
  };

  beforeAll(() => {
    process.env['SLOW_ADAPTER_MS'] = '2000';
    app = getApp();
  });

  afterAll(() => {
    delete process.env['SLOW_ADAPTER_MS'];
  });

  it('responds within the 2000 ms acceptance window even when the adapter is slow', async () => {
    const start = process.hrtime.bigint();
    const res = await request(app)
      .post('/api/orders')
      .set('Content-Type', 'application/json')
      .send(VALID_ORDER_PAYLOAD)
      .timeout(ACCEPTANCE_WINDOW_MS + 500);
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    expect(elapsedMs).toBeLessThan(ACCEPTANCE_WINDOW_MS);
    // HTTP 200 or 201 — degraded or confirmed
    expect([200, 201]).toContain(res.status);
  }, ACCEPTANCE_WINDOW_MS + 1000);

  it('degraded order response has a status field equal to "pending"', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Content-Type', 'application/json')
      .send(VALID_ORDER_PAYLOAD)
      .timeout(ACCEPTANCE_WINDOW_MS + 500);
    const body = res.body as Record<string, unknown>;
    // Must carry status: 'pending' in degraded path
    expect(body['status']).toBe('pending');
  }, ACCEPTANCE_WINDOW_MS + 1000);

  it('degraded order response includes a partial orderId or correlationId', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Content-Type', 'application/json')
      .send(VALID_ORDER_PAYLOAD)
      .timeout(ACCEPTANCE_WINDOW_MS + 500);
    const body = res.body as Record<string, unknown>;
    const hasRef = body['orderId'] !== undefined
      || body['correlationId'] !== undefined
      || body['cartId'] !== undefined;
    expect(hasRef).toBe(true);
  }, ACCEPTANCE_WINDOW_MS + 1000);
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  Adapter timeout must fire within the 1500 ms budget
// ─────────────────────────────────────────────────────────────────────────────

describe('Adapter timeout budget — must not exceed 1500 ms', () => {
  let app: Application;

  beforeAll(() => {
    process.env['SLOW_ADAPTER_MS'] = '3000'; // adapter would take 3 s without a timeout
    app = getApp();
  });

  afterAll(() => {
    delete process.env['SLOW_ADAPTER_MS'];
  });

  it('eligibility responds well within 1500 ms + overhead even with a 3000 ms slow adapter', async () => {
    const start = process.hrtime.bigint();
    const res = await request(app)
      .post('/api/upgrade/eligibility')
      .set('Content-Type', 'application/json')
      .send({ customerId: 'cust_timeout', lineId: 'line_timeout', marketCode: 'ZA' })
      .timeout(TIMEOUT_BUDGET_MS + 1000);
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    // Must have cut-off at or before the 1500 ms budget (with 200 ms tolerance)
    expect(elapsedMs).toBeLessThan(TIMEOUT_BUDGET_MS + 200);
    expect(res.status).toBe(200);
    expect((res.body as Record<string, unknown>)['status']).toBe('pending');
  }, TIMEOUT_BUDGET_MS + 1500);

  it('financing responds well within 1500 ms + overhead even with a 3000 ms slow adapter', async () => {
    const start = process.hrtime.bigint();
    const res = await request(app)
      .get('/api/upgrade/financing')
      .timeout(TIMEOUT_BUDGET_MS + 1000);
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    expect(elapsedMs).toBeLessThan(TIMEOUT_BUDGET_MS + 200);
    expect(res.status).toBe(200);
  }, TIMEOUT_BUDGET_MS + 1500);
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  Degraded response shape contract
// ─────────────────────────────────────────────────────────────────────────────

describe('Degraded response shape — status: pending contract', () => {
  let app: Application;

  beforeAll(() => {
    process.env['SLOW_ADAPTER_MS'] = '2000';
    app = getApp();
  });

  afterAll(() => {
    delete process.env['SLOW_ADAPTER_MS'];
  });

  it('eligibility degraded response is a JSON object (not an error envelope)', async () => {
    const res = await request(app)
      .post('/api/upgrade/eligibility')
      .set('Content-Type', 'application/json')
      .send({ customerId: 'cust_1001', lineId: 'line_1', marketCode: 'ZA' })
      .timeout(ACCEPTANCE_WINDOW_MS + 500);
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('object');
    expect(res.body).not.toBeNull();
    // Must NOT be an error envelope
    expect((res.body as Record<string, unknown>)['errorCode']).toBeUndefined();
  }, ACCEPTANCE_WINDOW_MS + 1000);

  it('eligibility degraded response carries status: "pending" at the top level', async () => {
    const res = await request(app)
      .post('/api/upgrade/eligibility')
      .set('Content-Type', 'application/json')
      .send({ customerId: 'cust_1001', lineId: 'line_1', marketCode: 'ZA' })
      .timeout(ACCEPTANCE_WINDOW_MS + 500);
    expect((res.body as Record<string, unknown>)['status']).toBe('pending');
  }, ACCEPTANCE_WINDOW_MS + 1000);
});
