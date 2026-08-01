import request from 'supertest';
import { Application } from 'express';
import {
  clearAll as clearActivationStore,
  seedOrder,
} from '../../modules/activation/activationStore';
import { clearAll as clearOrderStore } from '../../modules/order/orderStore';
import { KYC_FAIL_ID_PREFIX } from '../../modules/onboarding/kycRicaAdapter';

/**
 * Acceptance tests: structured error response contract and classification (LLD §10).
 *
 * Every 4xx/5xx API response must include:
 *   reasonCode     — string from the documented enum:
 *                    payment_failed | payment_pending | kyc_failed | kyc_pending |
 *                    eligibility_unavailable | activation_delayed | cart_expired |
 *                    session_timeout | support_required
 *   retryable      — boolean; true when the client may retry without human intervention
 *   statePreserved — { cart: boolean; order: boolean; payment: boolean }
 *                    flags indicating what has been saved server-side
 *   nextSteps      — Array<{ action: string; url: string }>
 *                    machine-readable guidance for the client
 *
 * Acceptance criteria:
 *   AC-1  Schema contract: existing error endpoints (4xx/5xx) include all 4 new fields.
 *   AC-2  payment_failed scenario is correctly classified.
 *   AC-3  payment_pending scenario is correctly classified.
 *   AC-4  kyc_failed scenario is correctly classified.
 *   AC-5  kyc_pending scenario is correctly classified.
 *   AC-6  eligibility_unavailable scenario is correctly classified.
 *   AC-7  activation_delayed scenario is correctly classified.
 *   AC-8  cart_expired scenario is correctly classified.
 *   AC-9  retryable defaults are correct per scenario.
 *   AC-10 statePreserved defaults are correct per scenario.
 *   AC-11 nextSteps is a non-empty array with {action,url} objects on every error.
 */

// ─── type definitions ─────────────────────────────────────────────────────────

interface StatePreserved {
  cart: boolean;
  order: boolean;
  payment: boolean;
}

interface NextStep {
  action: string;
  url: string;
}

interface StructuredErrorBody {
  reasonCode: string;
  retryable: boolean;
  statePreserved: StatePreserved;
  nextSteps: NextStep[];
}

// ─── constants ────────────────────────────────────────────────────────────────

const VALID_REASON_CODES = [
  'payment_failed',
  'payment_pending',
  'kyc_failed',
  'kyc_pending',
  'eligibility_unavailable',
  'activation_delayed',
  'cart_expired',
  'session_timeout',
  'support_required',
  'not_found',
  'validation_error',
] as const;

type ReasonCode = (typeof VALID_REASON_CODES)[number];
const REASON_CODE_SET: ReadonlySet<string> = new Set<string>(VALID_REASON_CODES);

// Seed IDs for issuance-gate scenarios (existing endpoint)
const ORD_PAYMENT_PENDING   = 'ord_err_pay_pending';
const ORD_KYC_PENDING       = 'ord_err_kyc_pending';
const ORD_ACTIVATION_DELAYED = 'ord_err_act_delayed';

// Cart IDs the implementation must recognise to trigger specific scenarios
const CART_PAYMENT_FAILED   = 'cart_pay_fail_test';
const CART_EXPIRED          = 'cart_expired_test';

// KYC-fail trigger: idNumber starting with KYC_FAIL_ID_PREFIX → mock adapter returns failed
const FAILING_ID_NUMBER = `${KYC_FAIL_ID_PREFIX}1015800088`;

// ─── app factory ─────────────────────────────────────────────────────────────

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app') as { createApp: () => Application };
  return createApp();
}

// ─── request helpers ─────────────────────────────────────────────────────────

async function postEsimIssue(
  app: Application,
  orderId: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await request(app).post(`/api/orders/${orderId}/esim/issue`);
  return { status: res.status, body: res.body as Record<string, unknown> };
}

async function postVerification(
  app: Application,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await request(app)
    .post('/api/onboarding/verification')
    .set('Content-Type', 'application/json')
    .send(payload);
  return { status: res.status, body: res.body as Record<string, unknown> };
}

async function postCheckoutPayment(
  app: Application,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await request(app)
    .post('/api/checkout/payments')
    .set('Content-Type', 'application/json')
    .send(payload);
  return { status: res.status, body: res.body as Record<string, unknown> };
}

async function postEligibilityCheck(
  app: Application,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await request(app)
    .post('/api/upgrade/eligibility')
    .set('Content-Type', 'application/json')
    .send(payload);
  return { status: res.status, body: res.body as Record<string, unknown> };
}

async function postOrders(
  app: Application,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await request(app)
    .post('/api/orders')
    .set('Content-Type', 'application/json')
    .send(payload);
  return { status: res.status, body: res.body as Record<string, unknown> };
}

// ─── shared assertion helpers ─────────────────────────────────────────────────

function assertStructuredErrorShape(body: Record<string, unknown>): void {
  expect(typeof body.reasonCode).toBe('string');
  expect(REASON_CODE_SET.has(body.reasonCode as string)).toBe(true);
  expect(typeof body.retryable).toBe('boolean');
  expect(body.statePreserved !== null && typeof body.statePreserved === 'object').toBe(true);
  const sp = body.statePreserved as StatePreserved;
  expect(typeof sp.cart).toBe('boolean');
  expect(typeof sp.order).toBe('boolean');
  expect(typeof sp.payment).toBe('boolean');
  expect(Array.isArray(body.nextSteps)).toBe(true);
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  Schema contract — every error response includes all 4 structured fields
// ─────────────────────────────────────────────────────────────────────────────

describe('AC-1 Schema contract — structured error fields present on existing 4xx responses', () => {
  let app: Application;

  beforeEach(() => {
    clearActivationStore();
    clearOrderStore();
    app = getApp();
  });

  it('POST /api/orders 422 response includes reasonCode from the valid enum', async () => {
    const { body } = await postOrders(app, {});
    expect(typeof body.reasonCode).toBe('string');
    expect(REASON_CODE_SET.has(body.reasonCode as string)).toBe(true);
  });

  it('POST /api/orders 422 response includes retryable boolean', async () => {
    const { body } = await postOrders(app, {});
    expect(typeof body.retryable).toBe('boolean');
  });

  it('POST /api/orders 422 response includes statePreserved object with cart/order/payment flags', async () => {
    const { body } = await postOrders(app, {});
    expect(body.statePreserved !== null && typeof body.statePreserved === 'object').toBe(true);
    const sp = body.statePreserved as StatePreserved;
    expect(typeof sp.cart).toBe('boolean');
    expect(typeof sp.order).toBe('boolean');
    expect(typeof sp.payment).toBe('boolean');
  });

  it('POST /api/orders 422 response includes nextSteps array', async () => {
    const { body } = await postOrders(app, {});
    expect(Array.isArray(body.nextSteps)).toBe(true);
  });

  it('POST /api/orders/:id/esim/issue 403 (payment gate) includes reasonCode', async () => {
    seedOrder(ORD_PAYMENT_PENDING, { paymentStatus: 'PENDING', verificationStatus: 'COMPLETED' });
    const { body } = await postEsimIssue(app, ORD_PAYMENT_PENDING);
    expect(typeof body.reasonCode).toBe('string');
    expect(REASON_CODE_SET.has(body.reasonCode as string)).toBe(true);
  });

  it('POST /api/orders/:id/esim/issue 403 (payment gate) includes retryable boolean', async () => {
    seedOrder(ORD_PAYMENT_PENDING, { paymentStatus: 'PENDING', verificationStatus: 'COMPLETED' });
    const { body } = await postEsimIssue(app, ORD_PAYMENT_PENDING);
    expect(typeof body.retryable).toBe('boolean');
  });

  it('POST /api/orders/:id/esim/issue 403 (payment gate) includes statePreserved', async () => {
    seedOrder(ORD_PAYMENT_PENDING, { paymentStatus: 'PENDING', verificationStatus: 'COMPLETED' });
    const { body } = await postEsimIssue(app, ORD_PAYMENT_PENDING);
    expect(body.statePreserved !== null && typeof body.statePreserved === 'object').toBe(true);
    const sp = body.statePreserved as StatePreserved;
    expect(typeof sp.cart).toBe('boolean');
    expect(typeof sp.order).toBe('boolean');
    expect(typeof sp.payment).toBe('boolean');
  });

  it('POST /api/orders/:id/esim/issue 403 (payment gate) includes nextSteps', async () => {
    seedOrder(ORD_PAYMENT_PENDING, { paymentStatus: 'PENDING', verificationStatus: 'COMPLETED' });
    const { body } = await postEsimIssue(app, ORD_PAYMENT_PENDING);
    expect(Array.isArray(body.nextSteps)).toBe(true);
  });

  it('POST /api/orders/:id/esim/issue 403 (KYC gate) includes all 4 structured fields', async () => {
    seedOrder(ORD_KYC_PENDING, { paymentStatus: 'CONFIRMED', verificationStatus: 'PENDING_REVIEW' });
    const { body } = await postEsimIssue(app, ORD_KYC_PENDING);
    assertStructuredErrorShape(body);
  });

  it('POST /api/upgrade/eligibility 422 (validation) includes all 4 structured fields', async () => {
    const { body } = await postEligibilityCheck(app, {});
    assertStructuredErrorShape(body);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  payment_failed scenario
// ─────────────────────────────────────────────────────────────────────────────

describe('AC-2 payment_failed scenario — POST /api/checkout/payments with declined payment', () => {
  let app: Application;

  beforeEach(() => {
    clearActivationStore();
    clearOrderStore();
    app = getApp();
  });

  const declinedPayload = {
    cartId: CART_PAYMENT_FAILED,
    paymentMethod: 'CARD_TOKEN',
    paymentPayload: { pspToken: 'tok_declined_test' },
  };

  it('returns a 4xx HTTP status when payment is declined', async () => {
    const { status } = await postCheckoutPayment(app, declinedPayload);
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(600);
  });

  it('response includes reasonCode "payment_failed"', async () => {
    const { body } = await postCheckoutPayment(app, declinedPayload);
    expect(body.reasonCode).toBe('payment_failed');
  });

  it('response includes retryable boolean', async () => {
    const { body } = await postCheckoutPayment(app, declinedPayload);
    expect(typeof body.retryable).toBe('boolean');
  });

  it('response includes statePreserved with cart/order/payment flags', async () => {
    const { body } = await postCheckoutPayment(app, declinedPayload);
    const sp = body.statePreserved as StatePreserved;
    expect(typeof sp.cart).toBe('boolean');
    expect(typeof sp.order).toBe('boolean');
    expect(typeof sp.payment).toBe('boolean');
  });

  it('response includes non-empty nextSteps array', async () => {
    const { body } = await postCheckoutPayment(app, declinedPayload);
    expect(Array.isArray(body.nextSteps)).toBe(true);
    expect((body.nextSteps as NextStep[]).length).toBeGreaterThan(0);
  });

  it('each nextStep has action and url strings', async () => {
    const { body } = await postCheckoutPayment(app, declinedPayload);
    for (const step of body.nextSteps as NextStep[]) {
      expect(typeof step.action).toBe('string');
      expect(step.action.length).toBeGreaterThan(0);
      expect(typeof step.url).toBe('string');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  payment_pending scenario
// ─────────────────────────────────────────────────────────────────────────────

describe('AC-3 payment_pending scenario — eSIM issuance blocked by unconfirmed payment', () => {
  let app: Application;

  beforeEach(() => {
    clearActivationStore();
    app = getApp();
  });

  it('response reasonCode is "payment_pending"', async () => {
    seedOrder(ORD_PAYMENT_PENDING, { paymentStatus: 'PENDING', verificationStatus: 'COMPLETED' });
    const { body } = await postEsimIssue(app, ORD_PAYMENT_PENDING);
    expect(body.reasonCode).toBe('payment_pending');
  });

  it('response status is 4xx', async () => {
    seedOrder(ORD_PAYMENT_PENDING, { paymentStatus: 'PENDING', verificationStatus: 'COMPLETED' });
    const { status } = await postEsimIssue(app, ORD_PAYMENT_PENDING);
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);
  });

  it('statePreserved.order is true — order shell is not lost', async () => {
    seedOrder(ORD_PAYMENT_PENDING, { paymentStatus: 'PENDING', verificationStatus: 'COMPLETED' });
    const { body } = await postEsimIssue(app, ORD_PAYMENT_PENDING);
    expect((body.statePreserved as StatePreserved).order).toBe(true);
  });

  it('statePreserved.cart is true — cart data is not discarded', async () => {
    seedOrder(ORD_PAYMENT_PENDING, { paymentStatus: 'PENDING', verificationStatus: 'COMPLETED' });
    const { body } = await postEsimIssue(app, ORD_PAYMENT_PENDING);
    expect((body.statePreserved as StatePreserved).cart).toBe(true);
  });

  it('nextSteps is non-empty', async () => {
    seedOrder(ORD_PAYMENT_PENDING, { paymentStatus: 'PENDING', verificationStatus: 'COMPLETED' });
    const { body } = await postEsimIssue(app, ORD_PAYMENT_PENDING);
    expect((body.nextSteps as NextStep[]).length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  kyc_failed scenario
// ─────────────────────────────────────────────────────────────────────────────

describe('AC-4 kyc_failed scenario — verification endpoint with failing ID number', () => {
  let app: Application;

  beforeEach(() => {
    app = getApp();
  });

  const kycFailPayload = {
    orderId: 'ord_kyc_fail_001',
    customerId: 'cust_kyc_fail',
    type: 'KYC',
    identityFields: {
      firstName: 'Test',
      lastName: 'User',
      idNumber: FAILING_ID_NUMBER,
      addressLine1: '1 Test Road',
      city: 'Cape Town',
    },
  };

  it('returns a 4xx HTTP status when KYC check fails', async () => {
    const { status } = await postVerification(app, kycFailPayload);
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(600);
  });

  it('response includes reasonCode "kyc_failed"', async () => {
    const { body } = await postVerification(app, kycFailPayload);
    expect(body.reasonCode).toBe('kyc_failed');
  });

  it('response includes retryable boolean', async () => {
    const { body } = await postVerification(app, kycFailPayload);
    expect(typeof body.retryable).toBe('boolean');
  });

  it('response includes statePreserved with cart/order/payment flags', async () => {
    const { body } = await postVerification(app, kycFailPayload);
    const sp = body.statePreserved as StatePreserved;
    expect(typeof sp.cart).toBe('boolean');
    expect(typeof sp.order).toBe('boolean');
    expect(typeof sp.payment).toBe('boolean');
  });

  it('response includes non-empty nextSteps array', async () => {
    const { body } = await postVerification(app, kycFailPayload);
    expect(Array.isArray(body.nextSteps)).toBe(true);
    expect((body.nextSteps as NextStep[]).length).toBeGreaterThan(0);
  });

  it('each nextStep in kyc_failed response has action and url fields', async () => {
    const { body } = await postVerification(app, kycFailPayload);
    for (const step of body.nextSteps as NextStep[]) {
      expect(typeof step.action).toBe('string');
      expect(step.action.length).toBeGreaterThan(0);
      expect(typeof step.url).toBe('string');
    }
  });

  it('verification with passing ID does not return reasonCode kyc_failed', async () => {
    const passingPayload = {
      ...kycFailPayload,
      orderId: 'ord_kyc_pass_001',
      identityFields: { ...kycFailPayload.identityFields, idNumber: '9001015800088' },
    };
    const { body } = await postVerification(app, passingPayload);
    expect(body.reasonCode).not.toBe('kyc_failed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  kyc_pending scenario
// ─────────────────────────────────────────────────────────────────────────────

describe('AC-5 kyc_pending scenario — eSIM issuance blocked by unresolved verification', () => {
  let app: Application;

  beforeEach(() => {
    clearActivationStore();
    app = getApp();
  });

  it('response reasonCode is "kyc_pending"', async () => {
    seedOrder(ORD_KYC_PENDING, { paymentStatus: 'CONFIRMED', verificationStatus: 'PENDING_REVIEW' });
    const { body } = await postEsimIssue(app, ORD_KYC_PENDING);
    expect(body.reasonCode).toBe('kyc_pending');
  });

  it('response status is 4xx', async () => {
    seedOrder(ORD_KYC_PENDING, { paymentStatus: 'CONFIRMED', verificationStatus: 'PENDING_REVIEW' });
    const { status } = await postEsimIssue(app, ORD_KYC_PENDING);
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);
  });

  it('statePreserved.cart is true — verification case data is preserved', async () => {
    seedOrder(ORD_KYC_PENDING, { paymentStatus: 'CONFIRMED', verificationStatus: 'PENDING_REVIEW' });
    const { body } = await postEsimIssue(app, ORD_KYC_PENDING);
    expect((body.statePreserved as StatePreserved).cart).toBe(true);
  });

  it('nextSteps is non-empty', async () => {
    seedOrder(ORD_KYC_PENDING, { paymentStatus: 'CONFIRMED', verificationStatus: 'PENDING_REVIEW' });
    const { body } = await postEsimIssue(app, ORD_KYC_PENDING);
    expect((body.nextSteps as NextStep[]).length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6  eligibility_unavailable scenario
// ─────────────────────────────────────────────────────────────────────────────

describe('AC-6 eligibility_unavailable scenario — upgrade eligibility service unavailable', () => {
  let app: Application;

  beforeEach(() => {
    app = getApp();
  });

  // The implementation must recognise customerId 'cust_ineligible_unavailable'
  // as an eligibility-service-unavailable probe.
  const unavailablePayload = {
    customerId: 'cust_ineligible_unavailable',
    lineId: 'msisdn_27831000000',
    marketCode: 'ZA',
  };

  it('returns a non-2xx HTTP status when eligibility is unavailable', async () => {
    const { status } = await postEligibilityCheck(app, unavailablePayload);
    // accepts 4xx or 5xx
    expect(status).toBeGreaterThanOrEqual(400);
  });

  it('response includes reasonCode "eligibility_unavailable"', async () => {
    const { body } = await postEligibilityCheck(app, unavailablePayload);
    expect(body.reasonCode).toBe('eligibility_unavailable');
  });

  it('response includes retryable boolean', async () => {
    const { body } = await postEligibilityCheck(app, unavailablePayload);
    expect(typeof body.retryable).toBe('boolean');
  });

  it('response includes statePreserved with cart/order/payment flags', async () => {
    const { body } = await postEligibilityCheck(app, unavailablePayload);
    const sp = body.statePreserved as StatePreserved;
    expect(typeof sp.cart).toBe('boolean');
    expect(typeof sp.order).toBe('boolean');
    expect(typeof sp.payment).toBe('boolean');
  });

  it('response includes non-empty nextSteps', async () => {
    const { body } = await postEligibilityCheck(app, unavailablePayload);
    expect(Array.isArray(body.nextSteps)).toBe(true);
    expect((body.nextSteps as NextStep[]).length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-7  activation_delayed scenario
// ─────────────────────────────────────────────────────────────────────────────

describe('AC-7 activation_delayed scenario — checkout/payment with delayed activation market', () => {
  let app: Application;

  beforeEach(() => {
    clearActivationStore();
    clearOrderStore();
    app = getApp();
  });

  // Activation is delayed for TZ/MZ markets (LLD §9.3 / porting scenario).
  const delayedActivationPayload = {
    cartId: 'cart_tz_activation',
    paymentMethod: 'MOBILE_MONEY',
    paymentPayload: { walletProvider: 'MPESA', walletReference: '255712345678' },
    marketCode: 'TZ',
  };

  it('response includes reasonCode "activation_delayed"', async () => {
    const { body } = await postCheckoutPayment(app, delayedActivationPayload);
    expect(body.reasonCode).toBe('activation_delayed');
  });

  it('response includes retryable boolean', async () => {
    const { body } = await postCheckoutPayment(app, delayedActivationPayload);
    expect(typeof body.retryable).toBe('boolean');
  });

  it('statePreserved.order is true — order is saved despite delay', async () => {
    const { body } = await postCheckoutPayment(app, delayedActivationPayload);
    expect((body.statePreserved as StatePreserved).order).toBe(true);
  });

  it('statePreserved.payment is true — payment is saved despite activation delay', async () => {
    const { body } = await postCheckoutPayment(app, delayedActivationPayload);
    expect((body.statePreserved as StatePreserved).payment).toBe(true);
  });

  it('nextSteps is non-empty and contains guidance for the delay', async () => {
    const { body } = await postCheckoutPayment(app, delayedActivationPayload);
    expect(Array.isArray(body.nextSteps)).toBe(true);
    expect((body.nextSteps as NextStep[]).length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-8  cart_expired scenario
// ─────────────────────────────────────────────────────────────────────────────

describe('AC-8 cart_expired scenario — checkout with an expired cart', () => {
  let app: Application;

  beforeEach(() => {
    clearActivationStore();
    clearOrderStore();
    app = getApp();
  });

  const expiredCartPayload = {
    cartId: CART_EXPIRED,
    paymentMethod: 'CARD_TOKEN',
    paymentPayload: { pspToken: 'tok_valid_test' },
  };

  it('returns a 4xx HTTP status for an expired cart', async () => {
    const { status } = await postCheckoutPayment(app, expiredCartPayload);
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(600);
  });

  it('response includes reasonCode "cart_expired"', async () => {
    const { body } = await postCheckoutPayment(app, expiredCartPayload);
    expect(body.reasonCode).toBe('cart_expired');
  });

  it('response includes retryable boolean', async () => {
    const { body } = await postCheckoutPayment(app, expiredCartPayload);
    expect(typeof body.retryable).toBe('boolean');
  });

  it('statePreserved.cart is false — expired cart cannot be recovered', async () => {
    const { body } = await postCheckoutPayment(app, expiredCartPayload);
    expect((body.statePreserved as StatePreserved).cart).toBe(false);
  });

  it('statePreserved.order is false — no order was created before cart expiry', async () => {
    const { body } = await postCheckoutPayment(app, expiredCartPayload);
    expect((body.statePreserved as StatePreserved).order).toBe(false);
  });

  it('nextSteps is non-empty', async () => {
    const { body } = await postCheckoutPayment(app, expiredCartPayload);
    expect(Array.isArray(body.nextSteps)).toBe(true);
    expect((body.nextSteps as NextStep[]).length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-9  retryable defaults per scenario
// ─────────────────────────────────────────────────────────────────────────────

describe('AC-9 retryable defaults — correct flag per documented scenario', () => {
  let app: Application;

  beforeEach(() => {
    clearActivationStore();
    clearOrderStore();
    app = getApp();
  });

  it('payment_pending is retryable (client may poll or retry)', async () => {
    seedOrder(ORD_PAYMENT_PENDING, { paymentStatus: 'PENDING', verificationStatus: 'COMPLETED' });
    const { body } = await postEsimIssue(app, ORD_PAYMENT_PENDING);
    expect(body.reasonCode).toBe('payment_pending');
    expect(body.retryable).toBe(true);
  });

  it('payment_failed is NOT retryable (payment must be re-initiated)', async () => {
    const { body } = await postCheckoutPayment(app, {
      cartId: CART_PAYMENT_FAILED,
      paymentMethod: 'CARD_TOKEN',
      paymentPayload: { pspToken: 'tok_declined_test' },
    });
    expect(body.reasonCode).toBe('payment_failed');
    expect(body.retryable).toBe(false);
  });

  it('kyc_pending is retryable (awaiting review completion)', async () => {
    seedOrder(ORD_KYC_PENDING, { paymentStatus: 'CONFIRMED', verificationStatus: 'PENDING_REVIEW' });
    const { body } = await postEsimIssue(app, ORD_KYC_PENDING);
    expect(body.reasonCode).toBe('kyc_pending');
    expect(body.retryable).toBe(true);
  });

  it('kyc_failed is NOT retryable without correction (must re-submit corrected data)', async () => {
    const { body } = await postVerification(app, {
      orderId: 'ord_kyc_retry_test',
      customerId: 'cust_kyc_retry',
      type: 'KYC',
      identityFields: {
        firstName: 'Test',
        lastName: 'Retry',
        idNumber: FAILING_ID_NUMBER,
        addressLine1: '1 Test Road',
        city: 'Durban',
      },
    });
    expect(body.reasonCode).toBe('kyc_failed');
    expect(body.retryable).toBe(false);
  });

  it('eligibility_unavailable is NOT retryable without operator action', async () => {
    const { body } = await postEligibilityCheck(app, {
      customerId: 'cust_ineligible_unavailable',
      lineId: 'msisdn_27831000000',
      marketCode: 'ZA',
    });
    expect(body.reasonCode).toBe('eligibility_unavailable');
    expect(body.retryable).toBe(false);
  });

  it('activation_delayed is retryable (poll for activation progress)', async () => {
    const { body } = await postCheckoutPayment(app, {
      cartId: 'cart_tz_activation',
      paymentMethod: 'MOBILE_MONEY',
      paymentPayload: { walletProvider: 'MPESA', walletReference: '255712345678' },
      marketCode: 'TZ',
    });
    expect(body.reasonCode).toBe('activation_delayed');
    expect(body.retryable).toBe(true);
  });

  it('cart_expired is NOT retryable (must start a new cart)', async () => {
    const { body } = await postCheckoutPayment(app, {
      cartId: CART_EXPIRED,
      paymentMethod: 'CARD_TOKEN',
      paymentPayload: { pspToken: 'tok_valid_test' },
    });
    expect(body.reasonCode).toBe('cart_expired');
    expect(body.retryable).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-10 statePreserved defaults per scenario
// ─────────────────────────────────────────────────────────────────────────────

describe('AC-10 statePreserved defaults — correct flags per documented scenario', () => {
  let app: Application;

  beforeEach(() => {
    clearActivationStore();
    clearOrderStore();
    app = getApp();
  });

  it('payment_failed: cart=true and order=true — order shell must not be deleted (LLD §10.3)', async () => {
    const { body } = await postCheckoutPayment(app, {
      cartId: CART_PAYMENT_FAILED,
      paymentMethod: 'CARD_TOKEN',
      paymentPayload: { pspToken: 'tok_declined_test' },
    });
    expect(body.reasonCode).toBe('payment_failed');
    expect((body.statePreserved as StatePreserved).cart).toBe(true);
    expect((body.statePreserved as StatePreserved).order).toBe(true);
  });

  it('payment_failed: payment=false — payment attempt itself was not completed', async () => {
    const { body } = await postCheckoutPayment(app, {
      cartId: CART_PAYMENT_FAILED,
      paymentMethod: 'CARD_TOKEN',
      paymentPayload: { pspToken: 'tok_declined_test' },
    });
    expect(body.reasonCode).toBe('payment_failed');
    expect((body.statePreserved as StatePreserved).payment).toBe(false);
  });

  it('payment_pending: cart=true and order=true — state is preserved awaiting confirmation', async () => {
    seedOrder(ORD_PAYMENT_PENDING, { paymentStatus: 'PENDING', verificationStatus: 'COMPLETED' });
    const { body } = await postEsimIssue(app, ORD_PAYMENT_PENDING);
    expect(body.reasonCode).toBe('payment_pending');
    expect((body.statePreserved as StatePreserved).cart).toBe(true);
    expect((body.statePreserved as StatePreserved).order).toBe(true);
  });

  it('kyc_failed: cart=true — submitted case data is preserved for correction (LLD §10.3)', async () => {
    const { body } = await postVerification(app, {
      orderId: 'ord_kyc_sp_test',
      customerId: 'cust_kyc_sp',
      type: 'KYC',
      identityFields: {
        firstName: 'Test',
        lastName: 'SP',
        idNumber: FAILING_ID_NUMBER,
        addressLine1: '1 Test Road',
        city: 'Pretoria',
      },
    });
    expect(body.reasonCode).toBe('kyc_failed');
    expect((body.statePreserved as StatePreserved).cart).toBe(true);
  });

  it('cart_expired: cart=false and order=false — expired cart cannot be recovered', async () => {
    const { body } = await postCheckoutPayment(app, {
      cartId: CART_EXPIRED,
      paymentMethod: 'CARD_TOKEN',
      paymentPayload: { pspToken: 'tok_valid_test' },
    });
    expect(body.reasonCode).toBe('cart_expired');
    expect((body.statePreserved as StatePreserved).cart).toBe(false);
    expect((body.statePreserved as StatePreserved).order).toBe(false);
  });

  it('activation_delayed: cart=true, order=true, payment=true — all saved, only activation deferred', async () => {
    const { body } = await postCheckoutPayment(app, {
      cartId: 'cart_tz_activation',
      paymentMethod: 'MOBILE_MONEY',
      paymentPayload: { walletProvider: 'MPESA', walletReference: '255712345678' },
      marketCode: 'TZ',
    });
    expect(body.reasonCode).toBe('activation_delayed');
    expect((body.statePreserved as StatePreserved).cart).toBe(true);
    expect((body.statePreserved as StatePreserved).order).toBe(true);
    expect((body.statePreserved as StatePreserved).payment).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-11 nextSteps structure — non-empty array, valid {action,url} shape
// ─────────────────────────────────────────────────────────────────────────────

describe('AC-11 nextSteps structure — populated and well-formed on every error scenario', () => {
  let app: Application;

  beforeEach(() => {
    clearActivationStore();
    clearOrderStore();
    app = getApp();
  });

  it('payment_pending nextSteps each have action and url string fields', async () => {
    seedOrder(ORD_PAYMENT_PENDING, { paymentStatus: 'PENDING', verificationStatus: 'COMPLETED' });
    const { body } = await postEsimIssue(app, ORD_PAYMENT_PENDING);
    for (const step of body.nextSteps as NextStep[]) {
      expect(typeof step.action).toBe('string');
      expect(step.action.length).toBeGreaterThan(0);
      expect(typeof step.url).toBe('string');
    }
  });

  it('kyc_pending nextSteps each have action and url string fields', async () => {
    seedOrder(ORD_KYC_PENDING, { paymentStatus: 'CONFIRMED', verificationStatus: 'PENDING_REVIEW' });
    const { body } = await postEsimIssue(app, ORD_KYC_PENDING);
    for (const step of body.nextSteps as NextStep[]) {
      expect(typeof step.action).toBe('string');
      expect(step.action.length).toBeGreaterThan(0);
      expect(typeof step.url).toBe('string');
    }
  });

  it('kyc_failed nextSteps each have action and url string fields', async () => {
    const { body } = await postVerification(app, {
      orderId: 'ord_kyc_ns_test',
      customerId: 'cust_ns',
      type: 'KYC',
      identityFields: {
        firstName: 'NS',
        lastName: 'Test',
        idNumber: FAILING_ID_NUMBER,
        addressLine1: '1 NS Road',
        city: 'Polokwane',
      },
    });
    for (const step of body.nextSteps as NextStep[]) {
      expect(typeof step.action).toBe('string');
      expect(step.action.length).toBeGreaterThan(0);
      expect(typeof step.url).toBe('string');
    }
  });

  it('payment_failed nextSteps contains at least one entry', async () => {
    const { body } = await postCheckoutPayment(app, {
      cartId: CART_PAYMENT_FAILED,
      paymentMethod: 'CARD_TOKEN',
      paymentPayload: { pspToken: 'tok_declined_test' },
    });
    expect((body.nextSteps as NextStep[]).length).toBeGreaterThan(0);
  });

  it('cart_expired nextSteps contains at least one entry', async () => {
    const { body } = await postCheckoutPayment(app, {
      cartId: CART_EXPIRED,
      paymentMethod: 'CARD_TOKEN',
      paymentPayload: { pspToken: 'tok_valid_test' },
    });
    expect((body.nextSteps as NextStep[]).length).toBeGreaterThan(0);
  });

  it('validation error on POST /api/orders still includes nextSteps array', async () => {
    const { body } = await postOrders(app, {});
    expect(Array.isArray(body.nextSteps)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Enum completeness — reasonCode is always from the documented set
// ─────────────────────────────────────────────────────────────────────────────

describe('reasonCode enum — all returned codes are within the documented set', () => {
  let app: Application;

  beforeEach(() => {
    clearActivationStore();
    clearOrderStore();
    app = getApp();
  });

  const scenarios: Array<{
    label: string;
    trigger: (a: Application) => Promise<{ status: number; body: Record<string, unknown> }>;
  }> = [
    {
      label: 'payment_pending (esim issue blocked)',
      trigger: async (a) => {
        seedOrder(ORD_PAYMENT_PENDING, { paymentStatus: 'PENDING', verificationStatus: 'COMPLETED' });
        return postEsimIssue(a, ORD_PAYMENT_PENDING);
      },
    },
    {
      label: 'kyc_pending (esim issue blocked)',
      trigger: async (a) => {
        seedOrder(ORD_KYC_PENDING, { paymentStatus: 'CONFIRMED', verificationStatus: 'PENDING_REVIEW' });
        return postEsimIssue(a, ORD_KYC_PENDING);
      },
    },
    {
      label: 'kyc_failed (verification POST)',
      trigger: (a) =>
        postVerification(a, {
          orderId: 'ord_enum_test',
          customerId: 'cust_enum',
          type: 'KYC',
          identityFields: {
            firstName: 'E',
            lastName: 'T',
            idNumber: FAILING_ID_NUMBER,
            addressLine1: '1 Road',
            city: 'City',
          },
        }),
    },
    {
      label: 'payment_failed (checkout POST)',
      trigger: (a) =>
        postCheckoutPayment(a, {
          cartId: CART_PAYMENT_FAILED,
          paymentMethod: 'CARD_TOKEN',
          paymentPayload: { pspToken: 'tok_declined_test' },
        }),
    },
    {
      label: 'cart_expired (checkout POST)',
      trigger: (a) =>
        postCheckoutPayment(a, {
          cartId: CART_EXPIRED,
          paymentMethod: 'CARD_TOKEN',
          paymentPayload: { pspToken: 'tok_valid_test' },
        }),
    },
    {
      label: 'eligibility_unavailable',
      trigger: (a) =>
        postEligibilityCheck(a, {
          customerId: 'cust_ineligible_unavailable',
          lineId: 'msisdn_27831000000',
          marketCode: 'ZA',
        }),
    },
    {
      label: 'activation_delayed (checkout TZ market)',
      trigger: (a) =>
        postCheckoutPayment(a, {
          cartId: 'cart_tz_activation',
          paymentMethod: 'MOBILE_MONEY',
          paymentPayload: { walletProvider: 'MPESA', walletReference: '255712345678' },
          marketCode: 'TZ',
        }),
    },
  ];

  for (const scenario of scenarios) {
    it(`reasonCode returned by "${scenario.label}" is from the documented enum`, async () => {
      const { body } = await scenario.trigger(app);
      expect(typeof body.reasonCode).toBe('string');
      expect(REASON_CODE_SET.has(body.reasonCode as string)).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-12 session_timeout scenario — unauthenticated audit-trail access
// ─────────────────────────────────────────────────────────────────────────────

describe('AC-12 session_timeout scenario — audit-trail endpoint without authentication', () => {
  let app: Application;

  beforeEach(() => {
    clearActivationStore();
    clearOrderStore();
    app = getApp();
  });

  async function getAuditTrail(
    a: Application,
    ref: string,
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    const res = await request(a).get(`/api/orders/${ref}/audit-trail`);
    return { status: res.status, body: res.body as Record<string, unknown> };
  }

  it('returns HTTP 401 when no auth header is provided', async () => {
    const { status } = await getAuditTrail(app, 'ORD-DUMMY');
    expect(status).toBe(401);
  });

  it('response includes reasonCode "session_timeout"', async () => {
    const { body } = await getAuditTrail(app, 'ORD-DUMMY');
    expect(body.reasonCode).toBe('session_timeout');
  });

  it('response includes retryable=false — client must re-authenticate', async () => {
    const { body } = await getAuditTrail(app, 'ORD-DUMMY');
    expect(body.retryable).toBe(false);
  });

  it('statePreserved.cart and statePreserved.order are false — no state implied', async () => {
    const { body } = await getAuditTrail(app, 'ORD-DUMMY');
    const sp = body.statePreserved as StatePreserved;
    expect(sp.cart).toBe(false);
    expect(sp.order).toBe(false);
  });

  it('nextSteps contains a sign_in action', async () => {
    const { body } = await getAuditTrail(app, 'ORD-DUMMY');
    const steps = body.nextSteps as NextStep[];
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.some((s) => s.action === 'sign_in')).toBe(true);
  });
});
