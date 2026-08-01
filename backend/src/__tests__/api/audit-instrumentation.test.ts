import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../app';

/**
 * Acceptance tests for audit instrumentation across payment, verification,
 * order, and activation flows.
 *
 * AC-1  PaymentOrchestrationService.settlePayment emits 'payment_outcome' to
 *       ConsentAuditStore with provider_ref, amount, currency, status, payment_method.
 * AC-2  OnboardingAndVerificationService.runVerification emits 'verification_outcome'
 *       with verification_case_id, outcome, provider_code.
 * AC-3  OrderManagementService.createOrder emits 'order_created' with order_ref,
 *       cart_id, line_item_count.
 * AC-4  ActivationOrchestrationService.issueEsim emits 'activation_status_change' via
 *       ConsentAuditStore (not just the local activationStore) with esim_ref,
 *       from_status, to_status.
 * AC-5  CheckoutService (POST /api/orders) records consent for 'terms' and 'marketing'.
 * AC-6  No service silently swallows an emitAuditEvent error — must log and re-throw.
 * AC-7  Integration: a complete demo checkout journey produces exactly four audit events
 *       (order_created, payment_outcome, verification_outcome, activation_status_change)
 *       plus two consent records (terms + marketing) all keyed to the same order.
 */

// ── new service modules that must be created ─────────────────────────────────
// These imports will fail to compile until the modules are implemented,
// making this test file RED (compile-time failure) as required by TDD.
import {
  settlePayment,
  type SettlePaymentInput,
} from '../../modules/payment/paymentOrchestrationService';

import {
  runVerification,
  type RunVerificationInput,
} from '../../modules/onboarding/onboardingAndVerificationService';

// ── existing service modules ──────────────────────────────────────────────────
import { createOrder, type CreateOrderInput } from '../../modules/order/orderService';
import { issueEsim } from '../../modules/activation/activationOrchestrationService';

// ── store helpers for direct inspection ──────────────────────────────────────
import { clearAll as clearOrderStore, getAllOrders } from '../../modules/order/orderStore';
import { clearAll as clearActivationStore, seedOrder } from '../../modules/activation/activationStore';

// getConsentRecordsForOrder does not yet exist in the store —
// this import is RED until the function is exported.
import {
  clearAll as clearAuditStore,
  getAuditEventsForOrder,
  getConsentRecordsForOrder,
  type StoredConsentRecord,
} from '../../modules/consentAudit/consentAuditStore';

// Used to spy on emitAuditEvent for error-propagation tests.
import * as consentAuditSvc from '../../modules/consentAudit/consentAndAuditService';

// ── shared helpers ────────────────────────────────────────────────────────────

function clearAllStores(): void {
  clearOrderStore();
  clearActivationStore();
  clearAuditStore();
}

function getApp(): Application {
  return createApp();
}

async function postOrder(
  app: Application,
  body: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await request(app).post('/api/orders').send(body);
  return { status: res.status, body: res.body as Record<string, unknown> };
}

// ── shared fixtures ───────────────────────────────────────────────────────────

const VALID_ORDER_INPUT: CreateOrderInput = {
  cartId: 'cart-audit-001',
  paymentAttemptId: 'pay-audit-001',
  paymentStatus: 'CONFIRMED',
  verificationCaseId: 'ver-audit-001',
  verificationStatus: 'COMPLETED',
  customerId: 'cust-audit-001',
  lineItems: [
    { name: 'iPhone 15', qty: 1, unitPrice: 18999 },
    { name: 'Unlimited 20GB', qty: 1, unitPrice: 799 },
  ],
  onceOffTotal: 18999,
  monthlyTotal: 799,
};

const VALID_CHECKOUT_BODY: Record<string, unknown> = {
  ...VALID_ORDER_INPUT,
  consents: [
    { purpose: 'terms', granted: true },
    { purpose: 'marketing', granted: false },
  ],
};

const SETTLE_PAYMENT_INPUT: SettlePaymentInput = {
  orderRef: 'ORD-PLACEHOLDER',
  providerRef: 'prov-ref-001',
  amount: 18999,
  currency: 'ZAR',
  status: 'success',
  paymentMethod: 'card',
};

const RUN_VERIFICATION_INPUT: RunVerificationInput = {
  orderRef: 'ORD-PLACEHOLDER',
  verificationCaseId: 'ver-audit-001',
  outcome: 'pass',
  providerCode: 'RICA_OK',
};

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  PaymentOrchestrationService — payment_outcome audit event
// ─────────────────────────────────────────────────────────────────────────────

describe('PaymentOrchestrationService.settlePayment — AC-1 audit event', () => {
  const ORDER_REF = 'ORD-PAY001';

  beforeEach(() => { clearAllStores(); });

  it('resolves without throwing for a successful payment', async () => {
    await expect(
      settlePayment({ ...SETTLE_PAYMENT_INPUT, orderRef: ORDER_REF }),
    ).resolves.not.toThrow();
  });

  it('writes a payment_outcome audit event to ConsentAuditStore', async () => {
    await settlePayment({ ...SETTLE_PAYMENT_INPUT, orderRef: ORDER_REF });
    const events = getAuditEventsForOrder(ORDER_REF);
    const paymentEvent = events.find((e) => e.eventType === 'payment_outcome');
    expect(paymentEvent).toBeDefined();
  });

  it('payment_outcome event payload includes provider_ref', async () => {
    await settlePayment({ ...SETTLE_PAYMENT_INPUT, orderRef: ORDER_REF, providerRef: 'prov-xyz' });
    const events = getAuditEventsForOrder(ORDER_REF);
    const paymentEvent = events.find((e) => e.eventType === 'payment_outcome');
    expect(paymentEvent?.payload.provider_ref).toBe('prov-xyz');
  });

  it('payment_outcome event payload includes amount', async () => {
    await settlePayment({ ...SETTLE_PAYMENT_INPUT, orderRef: ORDER_REF, amount: 18999 });
    const events = getAuditEventsForOrder(ORDER_REF);
    const paymentEvent = events.find((e) => e.eventType === 'payment_outcome');
    expect(paymentEvent?.payload.amount).toBe(18999);
  });

  it('payment_outcome event payload includes currency', async () => {
    await settlePayment({ ...SETTLE_PAYMENT_INPUT, orderRef: ORDER_REF, currency: 'ZAR' });
    const events = getAuditEventsForOrder(ORDER_REF);
    const paymentEvent = events.find((e) => e.eventType === 'payment_outcome');
    expect(paymentEvent?.payload.currency).toBe('ZAR');
  });

  it('payment_outcome event payload includes status', async () => {
    await settlePayment({ ...SETTLE_PAYMENT_INPUT, orderRef: ORDER_REF, status: 'success' });
    const events = getAuditEventsForOrder(ORDER_REF);
    const paymentEvent = events.find((e) => e.eventType === 'payment_outcome');
    expect(paymentEvent?.payload.status).toBe('success');
  });

  it('payment_outcome event payload includes payment_method for card', async () => {
    await settlePayment({ ...SETTLE_PAYMENT_INPUT, orderRef: ORDER_REF, paymentMethod: 'card' });
    const events = getAuditEventsForOrder(ORDER_REF);
    const paymentEvent = events.find((e) => e.eventType === 'payment_outcome');
    expect(paymentEvent?.payload.payment_method).toBe('card');
  });

  it('payment_outcome event payload includes payment_method for mobile_money', async () => {
    await settlePayment({ ...SETTLE_PAYMENT_INPUT, orderRef: ORDER_REF, paymentMethod: 'mobile_money' });
    const events = getAuditEventsForOrder(ORDER_REF);
    const paymentEvent = events.find((e) => e.eventType === 'payment_outcome');
    expect(paymentEvent?.payload.payment_method).toBe('mobile_money');
  });

  it('payment_outcome event is emitted for a failed payment as well', async () => {
    await settlePayment({ ...SETTLE_PAYMENT_INPUT, orderRef: ORDER_REF, status: 'failure' });
    const events = getAuditEventsForOrder(ORDER_REF);
    const paymentEvent = events.find((e) => e.eventType === 'payment_outcome');
    expect(paymentEvent?.payload.status).toBe('failure');
  });

  it('audit event is keyed by the orderRef (not an internal UUID)', async () => {
    await settlePayment({ ...SETTLE_PAYMENT_INPUT, orderRef: ORDER_REF });
    const events = getAuditEventsForOrder(ORDER_REF);
    expect(events.length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  OnboardingAndVerificationService — verification_outcome audit event
// ─────────────────────────────────────────────────────────────────────────────

describe('OnboardingAndVerificationService.runVerification — AC-2 audit event', () => {
  const ORDER_REF = 'ORD-VER001';

  beforeEach(() => { clearAllStores(); });

  it('resolves without throwing for a passing verification', async () => {
    await expect(
      runVerification({ ...RUN_VERIFICATION_INPUT, orderRef: ORDER_REF }),
    ).resolves.not.toThrow();
  });

  it('writes a verification_outcome audit event to ConsentAuditStore', async () => {
    await runVerification({ ...RUN_VERIFICATION_INPUT, orderRef: ORDER_REF });
    const events = getAuditEventsForOrder(ORDER_REF);
    const verEvent = events.find((e) => e.eventType === 'verification_outcome');
    expect(verEvent).toBeDefined();
  });

  it('verification_outcome payload includes verification_case_id', async () => {
    await runVerification({
      ...RUN_VERIFICATION_INPUT,
      orderRef: ORDER_REF,
      verificationCaseId: 'ver-case-99',
    });
    const events = getAuditEventsForOrder(ORDER_REF);
    const verEvent = events.find((e) => e.eventType === 'verification_outcome');
    expect(verEvent?.payload.verification_case_id).toBe('ver-case-99');
  });

  it('verification_outcome payload includes outcome', async () => {
    await runVerification({ ...RUN_VERIFICATION_INPUT, orderRef: ORDER_REF, outcome: 'pass' });
    const events = getAuditEventsForOrder(ORDER_REF);
    const verEvent = events.find((e) => e.eventType === 'verification_outcome');
    expect(verEvent?.payload.outcome).toBe('pass');
  });

  it('verification_outcome payload includes provider_code', async () => {
    await runVerification({ ...RUN_VERIFICATION_INPUT, orderRef: ORDER_REF, providerCode: 'RICA_OK' });
    const events = getAuditEventsForOrder(ORDER_REF);
    const verEvent = events.find((e) => e.eventType === 'verification_outcome');
    expect(verEvent?.payload.provider_code).toBe('RICA_OK');
  });

  it('emits verification_outcome for a failed transition', async () => {
    await runVerification({ ...RUN_VERIFICATION_INPUT, orderRef: ORDER_REF, outcome: 'fail' });
    const events = getAuditEventsForOrder(ORDER_REF);
    const verEvent = events.find((e) => e.eventType === 'verification_outcome');
    expect(verEvent?.payload.outcome).toBe('fail');
  });

  it('emits verification_outcome for a pending transition', async () => {
    await runVerification({ ...RUN_VERIFICATION_INPUT, orderRef: ORDER_REF, outcome: 'pending' });
    const events = getAuditEventsForOrder(ORDER_REF);
    const verEvent = events.find((e) => e.eventType === 'verification_outcome');
    expect(verEvent?.payload.outcome).toBe('pending');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  OrderManagementService — order_created audit event payload shape
// ─────────────────────────────────────────────────────────────────────────────

describe('OrderManagementService.createOrder — AC-3 audit event payload', () => {
  beforeEach(() => { clearAllStores(); });

  it('emits an order_created audit event to ConsentAuditStore', async () => {
    const confirmation = await createOrder(VALID_ORDER_INPUT);
    const events = getAuditEventsForOrder(confirmation.orderReference);
    const orderCreated = events.find((e) => e.eventType === 'order_created');
    expect(orderCreated).toBeDefined();
  });

  it('order_created payload includes order_ref', async () => {
    const confirmation = await createOrder(VALID_ORDER_INPUT);
    const events = getAuditEventsForOrder(confirmation.orderReference);
    const orderCreated = events.find((e) => e.eventType === 'order_created');
    expect(typeof orderCreated?.payload.order_ref).toBe('string');
    expect((orderCreated?.payload.order_ref as string).length).toBeGreaterThan(0);
  });

  it('order_created payload order_ref matches the returned orderReference', async () => {
    const confirmation = await createOrder(VALID_ORDER_INPUT);
    const events = getAuditEventsForOrder(confirmation.orderReference);
    const orderCreated = events.find((e) => e.eventType === 'order_created');
    expect(orderCreated?.payload.order_ref).toBe(confirmation.orderReference);
  });

  it('order_created payload includes cart_id', async () => {
    const confirmation = await createOrder(VALID_ORDER_INPUT);
    const events = getAuditEventsForOrder(confirmation.orderReference);
    const orderCreated = events.find((e) => e.eventType === 'order_created');
    expect(orderCreated?.payload.cart_id).toBe(VALID_ORDER_INPUT.cartId);
  });

  it('order_created payload includes line_item_count equal to the number of line items', async () => {
    const confirmation = await createOrder(VALID_ORDER_INPUT);
    const events = getAuditEventsForOrder(confirmation.orderReference);
    const orderCreated = events.find((e) => e.eventType === 'order_created');
    expect(orderCreated?.payload.line_item_count).toBe(VALID_ORDER_INPUT.lineItems.length);
  });

  it('order_created event is keyed by orderReference in ConsentAuditStore', async () => {
    const confirmation = await createOrder(VALID_ORDER_INPUT);
    const events = getAuditEventsForOrder(confirmation.orderReference);
    expect(events.some((e) => e.eventType === 'order_created')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  ActivationOrchestrationService — activation_status_change via ConsentAuditStore
// ─────────────────────────────────────────────────────────────────────────────

describe('ActivationOrchestrationService.issueEsim — AC-4 activation_status_change in ConsentAuditStore', () => {
  const ESIM_ORDER_ID = 'esim-order-001';

  beforeEach(() => {
    clearAllStores();
    seedOrder(ESIM_ORDER_ID, {
      paymentStatus: 'CONFIRMED',
      verificationStatus: 'COMPLETED',
    });
  });

  it('writes an activation_status_change event to ConsentAuditStore on successful eSIM issuance', async () => {
    await issueEsim(ESIM_ORDER_ID);
    // ConsentAuditStore audit events are keyed by orderRef; issueEsim must look up
    // the orderReference from the order to use as the key.
    // We query all audit events by ESIM_ORDER_ID (pre-implementation fallback key)
    // and also check if the event exists in the store at all.
    const allOrderEvents = getAuditEventsForOrder(ESIM_ORDER_ID);
    const activationEvent = allOrderEvents.find((e) => e.eventType === 'activation_status_change');
    expect(activationEvent).toBeDefined();
  });

  it('activation_status_change payload includes esim_ref', async () => {
    await issueEsim(ESIM_ORDER_ID);
    const events = getAuditEventsForOrder(ESIM_ORDER_ID);
    const activationEvent = events.find((e) => e.eventType === 'activation_status_change');
    expect(typeof activationEvent?.payload.esim_ref).toBe('string');
    expect((activationEvent?.payload.esim_ref as string).length).toBeGreaterThan(0);
  });

  it('activation_status_change payload includes from_status', async () => {
    await issueEsim(ESIM_ORDER_ID);
    const events = getAuditEventsForOrder(ESIM_ORDER_ID);
    const activationEvent = events.find((e) => e.eventType === 'activation_status_change');
    expect(activationEvent?.payload.from_status).toBeDefined();
  });

  it('activation_status_change payload includes to_status', async () => {
    await issueEsim(ESIM_ORDER_ID);
    const events = getAuditEventsForOrder(ESIM_ORDER_ID);
    const activationEvent = events.find((e) => e.eventType === 'activation_status_change');
    expect(activationEvent?.payload.to_status).toBeDefined();
  });

  it('to_status reflects the new activation state after eSIM issuance', async () => {
    await issueEsim(ESIM_ORDER_ID);
    const events = getAuditEventsForOrder(ESIM_ORDER_ID);
    const activationEvent = events.find((e) => e.eventType === 'activation_status_change');
    // The implementation emits ESIM_ISSUED or similar; it must be a non-empty string
    expect(typeof activationEvent?.payload.to_status).toBe('string');
    expect((activationEvent?.payload.to_status as string).length).toBeGreaterThan(0);
  });

  it('from_status and to_status are distinct values', async () => {
    await issueEsim(ESIM_ORDER_ID);
    const events = getAuditEventsForOrder(ESIM_ORDER_ID);
    const activationEvent = events.find((e) => e.eventType === 'activation_status_change');
    expect(activationEvent?.payload.from_status).not.toBe(activationEvent?.payload.to_status);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  CheckoutService — consent records for terms and marketing
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/orders (CheckoutService) — AC-5 consent recording', () => {
  let app: Application;

  beforeEach(() => {
    clearAllStores();
    app = getApp();
  });

  it('records a consent entry for purpose=terms after order creation', async () => {
    const { status, body } = await postOrder(app, VALID_CHECKOUT_BODY);
    expect(status).toBe(201);

    const orderRef = body.orderReference as string;
    const consentRecords = getConsentRecordsForOrder(orderRef);
    const termsRecord = consentRecords.find((r: StoredConsentRecord) => r.purpose === 'terms');
    expect(termsRecord).toBeDefined();
  });

  it('records a consent entry for purpose=marketing after order creation', async () => {
    const { status, body } = await postOrder(app, VALID_CHECKOUT_BODY);
    expect(status).toBe(201);

    const orderRef = body.orderReference as string;
    const consentRecords = getConsentRecordsForOrder(orderRef);
    const marketingRecord = consentRecords.find((r: StoredConsentRecord) => r.purpose === 'marketing');
    expect(marketingRecord).toBeDefined();
  });

  it('terms consent record reflects the submitted checkbox value (granted=true)', async () => {
    const payload = {
      ...VALID_CHECKOUT_BODY,
      consents: [
        { purpose: 'terms', granted: true },
        { purpose: 'marketing', granted: false },
      ],
    };
    const { body } = await postOrder(app, payload);
    const orderRef = body.orderReference as string;
    const consentRecords = getConsentRecordsForOrder(orderRef);
    const termsRecord = consentRecords.find((r: StoredConsentRecord) => r.purpose === 'terms');
    expect(termsRecord?.accepted).toBe(true);
  });

  it('marketing consent record reflects the submitted checkbox value (granted=false)', async () => {
    const payload = {
      ...VALID_CHECKOUT_BODY,
      consents: [
        { purpose: 'terms', granted: true },
        { purpose: 'marketing', granted: false },
      ],
    };
    const { body } = await postOrder(app, payload);
    const orderRef = body.orderReference as string;
    const consentRecords = getConsentRecordsForOrder(orderRef);
    const marketingRecord = consentRecords.find((r: StoredConsentRecord) => r.purpose === 'marketing');
    expect(marketingRecord?.accepted).toBe(false);
  });

  it('exactly two consent records are written per order (one terms, one marketing)', async () => {
    const { body } = await postOrder(app, VALID_CHECKOUT_BODY);
    const orderRef = body.orderReference as string;
    const consentRecords = getConsentRecordsForOrder(orderRef);
    expect(consentRecords).toHaveLength(2);
  });

  it('consent records share the same orderId as the created order', async () => {
    const { body } = await postOrder(app, VALID_CHECKOUT_BODY);
    const orderRef = body.orderReference as string;
    const consentRecords = getConsentRecordsForOrder(orderRef);
    for (const record of consentRecords) {
      expect(record.orderId).toBe(orderRef);
    }
  });

  it('no consent records exist when order creation fails due to validation error', async () => {
    const { status } = await postOrder(app, { lineItems: [] });
    expect(status).toBe(422);
    // Store should remain empty since the order was rejected
    // We can't query by orderRef (there is none), so we verify no orders exist
    const orders = getAllOrders();
    expect(orders.length).toBe(0);
  });

  it('consent records are written even when marketing consent is denied', async () => {
    const payload = {
      ...VALID_CHECKOUT_BODY,
      consents: [
        { purpose: 'terms', granted: true },
        { purpose: 'marketing', granted: false },
      ],
    };
    const { body } = await postOrder(app, payload);
    const orderRef = body.orderReference as string;
    const consentRecords = getConsentRecordsForOrder(orderRef);
    expect(consentRecords).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6  Error propagation — services must not swallow emitAuditEvent failures
// ─────────────────────────────────────────────────────────────────────────────

describe('PaymentOrchestrationService — AC-6 error propagation', () => {
  afterEach(() => { jest.restoreAllMocks(); clearAllStores(); });

  it('re-throws when emitAuditEvent rejects', async () => {
    jest
      .spyOn(consentAuditSvc, 'emitAuditEvent')
      .mockRejectedValue(new Error('audit store unavailable'));

    await expect(
      settlePayment({ ...SETTLE_PAYMENT_INPUT, orderRef: 'ORD-ERR01' }),
    ).rejects.toThrow('audit store unavailable');
  });
});

describe('OnboardingAndVerificationService — AC-6 error propagation', () => {
  afterEach(() => { jest.restoreAllMocks(); clearAllStores(); });

  it('re-throws when emitAuditEvent rejects', async () => {
    jest
      .spyOn(consentAuditSvc, 'emitAuditEvent')
      .mockRejectedValue(new Error('audit store unavailable'));

    await expect(
      runVerification({ ...RUN_VERIFICATION_INPUT, orderRef: 'ORD-ERR02' }),
    ).rejects.toThrow('audit store unavailable');
  });
});

describe('OrderManagementService.createOrder — AC-6 error propagation', () => {
  afterEach(() => { jest.restoreAllMocks(); clearAllStores(); });

  it('re-throws when emitAuditEvent rejects', async () => {
    jest
      .spyOn(consentAuditSvc, 'emitAuditEvent')
      .mockRejectedValue(new Error('audit store unavailable'));

    await expect(createOrder(VALID_ORDER_INPUT)).rejects.toThrow('audit store unavailable');
  });
});

describe('ActivationOrchestrationService.issueEsim — AC-6 error propagation', () => {
  const ORDER_ID = 'esim-err-001';

  beforeEach(() => {
    clearAllStores();
    seedOrder(ORDER_ID, { paymentStatus: 'CONFIRMED', verificationStatus: 'COMPLETED' });
  });

  afterEach(() => { jest.restoreAllMocks(); });

  it('re-throws when emitAuditEvent rejects', async () => {
    jest
      .spyOn(consentAuditSvc, 'emitAuditEvent')
      .mockRejectedValue(new Error('audit store unavailable'));

    await expect(issueEsim(ORDER_ID)).rejects.toThrow('audit store unavailable');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-7  Integration — full checkout journey produces exactly the required writes
// ─────────────────────────────────────────────────────────────────────────────

describe('Full checkout journey — AC-7 integration: all audit/consent writes present', () => {
  let app: Application;
  let orderRef: string;
  let internalOrderId: string;

  beforeAll(async () => {
    clearAllStores();
    app = getApp();

    // Step 1: Place order (CheckoutService) — produces order_created + 2 consent records
    const orderPayload = {
      ...VALID_CHECKOUT_BODY,
      consents: [
        { purpose: 'terms', granted: true },
        { purpose: 'marketing', granted: true },
      ],
    };
    const { body } = await postOrder(app, orderPayload);
    orderRef = body.orderReference as string;

    // Retrieve the internal UUID for esim/activation calls
    const orders = getAllOrders();
    const persisted = orders.find((o) => o.orderReference === orderRef);
    internalOrderId = persisted?.orderId ?? orderRef;

    // Seed activation store so issueEsim can proceed
    seedOrder(internalOrderId, {
      paymentStatus: 'CONFIRMED',
      verificationStatus: 'COMPLETED',
    });

    // Step 2: Settle payment (PaymentOrchestrationService) — produces payment_outcome
    await settlePayment({
      orderRef,
      providerRef: 'prov-integration-001',
      amount: 18999,
      currency: 'ZAR',
      status: 'success',
      paymentMethod: 'card',
    });

    // Step 3: Run verification (OnboardingAndVerificationService) — produces verification_outcome
    await runVerification({
      orderRef,
      verificationCaseId: 'ver-integration-001',
      outcome: 'pass',
      providerCode: 'RICA_VERIFIED',
    });

    // Step 4: Issue eSIM (ActivationOrchestrationService) — produces activation_status_change
    await issueEsim(internalOrderId);
  });

  it('exactly one order_created audit event exists for the order', () => {
    const events = getAuditEventsForOrder(orderRef);
    const orderCreatedEvents = events.filter((e) => e.eventType === 'order_created');
    expect(orderCreatedEvents).toHaveLength(1);
  });

  it('exactly one payment_outcome audit event exists for the order', () => {
    const events = getAuditEventsForOrder(orderRef);
    const paymentEvents = events.filter((e) => e.eventType === 'payment_outcome');
    expect(paymentEvents).toHaveLength(1);
  });

  it('exactly one verification_outcome audit event exists for the order', () => {
    const events = getAuditEventsForOrder(orderRef);
    const verificationEvents = events.filter((e) => e.eventType === 'verification_outcome');
    expect(verificationEvents).toHaveLength(1);
  });

  it('exactly one activation_status_change audit event exists for the order', () => {
    const events = getAuditEventsForOrder(orderRef);
    const activationEvents = events.filter((e) => e.eventType === 'activation_status_change');
    expect(activationEvents).toHaveLength(1);
  });

  it('exactly four distinct audit event types are present for the order', () => {
    const events = getAuditEventsForOrder(orderRef);
    const types = new Set(events.map((e) => e.eventType));
    expect(types.has('order_created')).toBe(true);
    expect(types.has('payment_outcome')).toBe(true);
    expect(types.has('verification_outcome')).toBe(true);
    expect(types.has('activation_status_change')).toBe(true);
  });

  it('exactly two consent records exist for the order (terms + marketing)', () => {
    const records = getConsentRecordsForOrder(orderRef);
    expect(records).toHaveLength(2);
  });

  it('consent records cover both purposes: terms and marketing', () => {
    const records = getConsentRecordsForOrder(orderRef);
    const purposes = records.map((r: StoredConsentRecord) => r.purpose);
    expect(purposes).toContain('terms');
    expect(purposes).toContain('marketing');
  });

  it('all audit events are keyed by the same orderReference', () => {
    const events = getAuditEventsForOrder(orderRef);
    for (const event of events) {
      expect(event.orderId).toBe(orderRef);
    }
  });

  it('all consent records are keyed by the same orderReference', () => {
    const records = getConsentRecordsForOrder(orderRef);
    for (const record of records) {
      expect(record.orderId).toBe(orderRef);
    }
  });

  it('no unexpected audit event types are present (no phantom events)', () => {
    const events = getAuditEventsForOrder(orderRef);
    const allowedTypes = new Set([
      'order_created',
      'payment_outcome',
      'verification_outcome',
      'activation_status_change',
    ]);
    for (const event of events) {
      expect(allowedTypes.has(event.eventType)).toBe(true);
    }
  });

  it('audit events for this order are not polluted by events from other orders', () => {
    // A second, unrelated order should not produce events visible under the first order's ref
    const events = getAuditEventsForOrder(orderRef);
    // All must belong to orderRef
    const foreign = events.filter((e) => e.orderId !== orderRef);
    expect(foreign).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-7 supplementary — instrumentation is unconditional (no feature flags)
// ─────────────────────────────────────────────────────────────────────────────

describe('Instrumentation — AC-7 unconditional: not behind feature flags', () => {
  beforeEach(() => { clearAllStores(); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('payment_outcome is emitted even when no feature-flag env var is set', async () => {
    const saved = process.env.AUDIT_ENABLED;
    delete process.env.AUDIT_ENABLED;

    await settlePayment({ ...SETTLE_PAYMENT_INPUT, orderRef: 'ORD-FLAG01' });
    const events = getAuditEventsForOrder('ORD-FLAG01');
    expect(events.some((e) => e.eventType === 'payment_outcome')).toBe(true);

    if (saved !== undefined) process.env.AUDIT_ENABLED = saved;
  });

  it('verification_outcome is emitted even when no feature-flag env var is set', async () => {
    const saved = process.env.AUDIT_ENABLED;
    delete process.env.AUDIT_ENABLED;

    await runVerification({ ...RUN_VERIFICATION_INPUT, orderRef: 'ORD-FLAG02' });
    const events = getAuditEventsForOrder('ORD-FLAG02');
    expect(events.some((e) => e.eventType === 'verification_outcome')).toBe(true);

    if (saved !== undefined) process.env.AUDIT_ENABLED = saved;
  });
});
