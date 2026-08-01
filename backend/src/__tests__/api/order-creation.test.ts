import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for POST /api/orders
 *
 * Acceptance criteria (task spec + LLD §5.12, §6, §7):
 *   AC-1  Valid checkout payload → 201 with confirmation schema:
 *         orderReference, orderDate, lineItems (name/qty/unitPrice),
 *         onceOffTotal, monthlyTotal, paymentStatus, nextSteps[].
 *   AC-2  orderReference is unique across calls and matches ORD-XXXX pattern.
 *   AC-3  Order is persisted; activationState is 'pending' in the store.
 *   AC-4  Activation Orchestration Service is invoked; downstream activation
 *         recorded as pending regardless of payment/verification gate outcome.
 *   AC-5  An AuditEvent with eventType ORDER_CREATED is written for every
 *         successful order creation.
 *   AC-6  422 is returned when required fields are missing from the request.
 */

// ─── store contracts (implemented by the feature) ────────────────────────────

import {
  clearAll,
  getAllOrders,
  getOrderAuditEvents,
} from '../../modules/order/orderStore';

// ─── types ───────────────────────────────────────────────────────────────────

interface LineItemInput {
  name: string;
  qty: number;
  unitPrice: number;
}

interface CheckoutPayload {
  cartId: string;
  paymentAttemptId: string;
  paymentStatus: string;
  verificationCaseId?: string;
  verificationStatus?: string;
  customerId?: string;
  lineItems: LineItemInput[];
  onceOffTotal: number;
  monthlyTotal: number;
  consents?: Array<{ purpose: string; granted: boolean }>;
}

interface LineItemResponse {
  name: string;
  qty: number;
  unitPrice: number;
}

interface NextStep {
  step: string;
  status: string;
  estimatedMinutes: number;
}

interface OrderConfirmation {
  orderReference: string;
  orderDate: string;
  lineItems: LineItemResponse[];
  onceOffTotal: number;
  monthlyTotal: number;
  paymentStatus: string;
  nextSteps: NextStep[];
}

interface StoredOrder {
  orderId: string;
  orderReference: string;
  activationState: string;
}

interface StoredAuditEvent {
  orderId: string;
  eventType: string;
  eventCategory: string;
}

// ─── constants ───────────────────────────────────────────────────────────────

const VALID_PAYLOAD: CheckoutPayload = {
  cartId: 'cart_8f3a',
  paymentAttemptId: 'pay_501',
  paymentStatus: 'CONFIRMED',
  verificationCaseId: 'ver_9001',
  verificationStatus: 'COMPLETED',
  customerId: 'cust_1001',
  lineItems: [
    { name: 'iPhone 15', qty: 1, unitPrice: 18999.00 },
    { name: 'Unlimited 20GB', qty: 1, unitPrice: 799.00 },
  ],
  onceOffTotal: 18999.00,
  monthlyTotal: 799.00,
  consents: [{ purpose: 'MARKETING', granted: false }],
};

const ORDER_REF_PATTERN = /^ORD-[A-Z0-9]{4,}$/;

// ─── app factory ─────────────────────────────────────────────────────────────

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app') as { createApp: () => Application };
  return createApp();
}

// ─── helpers ─────────────────────────────────────────────────────────────────

async function postOrder(
  app: Application,
  payload: Partial<CheckoutPayload>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await request(app).post('/api/orders').send(payload);
  return { status: res.status, body: res.body as Record<string, unknown> };
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  201 response with full confirmation schema
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/orders — AC-1 confirmation schema', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
  });

  it('returns HTTP 201 for a valid checkout payload', async () => {
    const { status } = await postOrder(app, VALID_PAYLOAD);
    expect(status).toBe(201);
  });

  it('response body includes orderReference', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    expect(typeof body.orderReference).toBe('string');
    expect((body.orderReference as string).length).toBeGreaterThan(0);
  });

  it('response body includes orderDate as an ISO-8601 timestamp', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    expect(typeof body.orderDate).toBe('string');
    expect(new Date(body.orderDate as string).getTime()).not.toBeNaN();
  });

  it('response body includes lineItems array', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    expect(Array.isArray(body.lineItems)).toBe(true);
  });

  it('lineItems array has the same length as the submitted line items', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    const items = body.lineItems as LineItemResponse[];
    expect(items).toHaveLength(VALID_PAYLOAD.lineItems.length);
  });

  it('each lineItem in the response has name, qty, and unitPrice fields', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    for (const item of body.lineItems as LineItemResponse[]) {
      expect(typeof item.name).toBe('string');
      expect(typeof item.qty).toBe('number');
      expect(typeof item.unitPrice).toBe('number');
    }
  });

  it('lineItems in response match the submitted names', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    const responseNames = (body.lineItems as LineItemResponse[]).map((i) => i.name).sort();
    const inputNames = VALID_PAYLOAD.lineItems.map((i) => i.name).sort();
    expect(responseNames).toEqual(inputNames);
  });

  it('response body includes onceOffTotal as a number', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    expect(typeof body.onceOffTotal).toBe('number');
  });

  it('onceOffTotal in response matches the submitted value', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    expect(body.onceOffTotal).toBe(VALID_PAYLOAD.onceOffTotal);
  });

  it('response body includes monthlyTotal as a number', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    expect(typeof body.monthlyTotal).toBe('number');
  });

  it('monthlyTotal in response matches the submitted value', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    expect(body.monthlyTotal).toBe(VALID_PAYLOAD.monthlyTotal);
  });

  it('response body includes paymentStatus', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    expect(typeof body.paymentStatus).toBe('string');
    expect((body.paymentStatus as string).length).toBeGreaterThan(0);
  });

  it('paymentStatus in response reflects the submitted paymentStatus', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    expect(body.paymentStatus).toBe(VALID_PAYLOAD.paymentStatus);
  });

  it('response body includes nextSteps array', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    expect(Array.isArray(body.nextSteps)).toBe(true);
  });

  it('nextSteps array is non-empty', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    expect((body.nextSteps as NextStep[]).length).toBeGreaterThan(0);
  });

  it('each nextStep has step, status, and estimatedMinutes fields', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    for (const step of body.nextSteps as NextStep[]) {
      expect(typeof step.step).toBe('string');
      expect(typeof step.status).toBe('string');
      expect(typeof step.estimatedMinutes).toBe('number');
    }
  });

  it('nextSteps contains at least one entry with status pending', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    const pending = (body.nextSteps as NextStep[]).filter((s) => s.status === 'pending');
    expect(pending.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  orderReference uniqueness and format
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/orders — AC-2 orderReference uniqueness', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
  });

  it('orderReference matches the ORD-XXXX pattern', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    expect(ORDER_REF_PATTERN.test(body.orderReference as string)).toBe(true);
  });

  it('two successive orders receive different orderReferences', async () => {
    const first = await postOrder(app, VALID_PAYLOAD);
    const second = await postOrder(app, { ...VALID_PAYLOAD, cartId: 'cart_9999' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.orderReference).not.toBe(second.body.orderReference);
  });

  it('ten successive orders all have distinct orderReferences', async () => {
    const refs = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const { status, body } = await postOrder(app, {
        ...VALID_PAYLOAD,
        cartId: `cart_${i}`,
      });
      expect(status).toBe(201);
      refs.add(body.orderReference as string);
    }
    expect(refs.size).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  Order persistence and initial activation state
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/orders — AC-3 persistence and activation state', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
  });

  it('order is persisted in the store after a successful creation', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    expect(body.orderReference).toBeDefined();

    const orders = getAllOrders() as StoredOrder[];
    expect(orders.length).toBeGreaterThanOrEqual(1);
  });

  it('persisted order has an orderReference matching the response', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    const ref = body.orderReference as string;

    const orders = getAllOrders() as StoredOrder[];
    const found = orders.find((o) => o.orderReference === ref);
    expect(found).toBeDefined();
  });

  it('persisted order has activationState set to pending', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    const ref = body.orderReference as string;

    const orders = getAllOrders() as StoredOrder[];
    const found = orders.find((o) => o.orderReference === ref);
    expect(found?.activationState).toBe('pending');
  });

  it('activation state remains pending even when payment and verification are both confirmed', async () => {
    const payload: CheckoutPayload = {
      ...VALID_PAYLOAD,
      paymentStatus: 'CONFIRMED',
      verificationStatus: 'COMPLETED',
    };

    const { body } = await postOrder(app, payload);
    const ref = body.orderReference as string;

    const orders = getAllOrders() as StoredOrder[];
    const found = orders.find((o) => o.orderReference === ref);
    expect(found?.activationState).toBe('pending');
  });

  it('each new order creates a separate persisted record', async () => {
    await postOrder(app, VALID_PAYLOAD);
    await postOrder(app, { ...VALID_PAYLOAD, cartId: 'cart_second' });

    const orders = getAllOrders() as StoredOrder[];
    expect(orders.length).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  Activation Orchestration Service invocation
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/orders — AC-4 activation orchestration gating', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
  });

  it('nextSteps includes an activation-related milestone', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    const steps = body.nextSteps as NextStep[];
    const activationStep = steps.find(
      (s) => s.step.toLowerCase().includes('activation') || s.step.toLowerCase().includes('esim'),
    );
    expect(activationStep).toBeDefined();
  });

  it('activation-related nextStep has status pending', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    const steps = body.nextSteps as NextStep[];
    const activationStep = steps.find(
      (s) => s.step.toLowerCase().includes('activation') || s.step.toLowerCase().includes('esim'),
    );
    expect(activationStep?.status).toBe('pending');
  });

  it('activation-related nextStep has a positive estimatedMinutes value', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    const steps = body.nextSteps as NextStep[];
    const activationStep = steps.find(
      (s) => s.step.toLowerCase().includes('activation') || s.step.toLowerCase().includes('esim'),
    );
    expect((activationStep?.estimatedMinutes as number)).toBeGreaterThan(0);
  });

  it('activation state in store is pending when payment is CONFIRMED and verification is COMPLETED', async () => {
    const { body } = await postOrder(app, {
      ...VALID_PAYLOAD,
      paymentStatus: 'CONFIRMED',
      verificationStatus: 'COMPLETED',
    });
    const orders = getAllOrders() as StoredOrder[];
    const found = orders.find((o) => o.orderReference === (body.orderReference as string));
    expect(found?.activationState).toBe('pending');
  });

  it('activation state in store is pending when payment is not yet confirmed', async () => {
    const { body } = await postOrder(app, {
      ...VALID_PAYLOAD,
      paymentStatus: 'PENDING',
    });
    const orders = getAllOrders() as StoredOrder[];
    const found = orders.find((o) => o.orderReference === (body.orderReference as string));
    expect(found?.activationState).toBe('pending');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  AuditEvent for order creation
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/orders — AC-5 audit event', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
  });

  it('an audit event is written after successful order creation', async () => {
    await postOrder(app, VALID_PAYLOAD);

    const events = getOrderAuditEvents() as StoredAuditEvent[];
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it('audit event has eventType ORDER_CREATED', async () => {
    await postOrder(app, VALID_PAYLOAD);

    const events = getOrderAuditEvents() as StoredAuditEvent[];
    const orderCreated = events.find((e) => e.eventType === 'ORDER_CREATED');
    expect(orderCreated).toBeDefined();
  });

  it('audit event has a non-empty orderId', async () => {
    await postOrder(app, VALID_PAYLOAD);

    const events = getOrderAuditEvents() as StoredAuditEvent[];
    const orderCreated = events.find((e) => e.eventType === 'ORDER_CREATED');
    expect(typeof orderCreated?.orderId).toBe('string');
    expect((orderCreated?.orderId as string).length).toBeGreaterThan(0);
  });

  it('audit event orderId matches the persisted order', async () => {
    const { body } = await postOrder(app, VALID_PAYLOAD);
    const ref = body.orderReference as string;

    const orders = getAllOrders() as StoredOrder[];
    const found = orders.find((o) => o.orderReference === ref);
    expect(found).toBeDefined();

    const events = getOrderAuditEvents() as StoredAuditEvent[];
    const orderCreated = events.find((e) => e.eventType === 'ORDER_CREATED');
    expect(orderCreated?.orderId).toBe(found?.orderId);
  });

  it('each order creation writes exactly one ORDER_CREATED audit event', async () => {
    await postOrder(app, VALID_PAYLOAD);
    await postOrder(app, { ...VALID_PAYLOAD, cartId: 'cart_second' });

    const events = getOrderAuditEvents() as StoredAuditEvent[];
    const orderCreatedEvents = events.filter((e) => e.eventType === 'ORDER_CREATED');
    expect(orderCreatedEvents.length).toBe(2);
  });

  it('audit event has a non-empty eventCategory', async () => {
    await postOrder(app, VALID_PAYLOAD);

    const events = getOrderAuditEvents() as StoredAuditEvent[];
    const orderCreated = events.find((e) => e.eventType === 'ORDER_CREATED');
    expect(typeof orderCreated?.eventCategory).toBe('string');
    expect((orderCreated?.eventCategory as string).length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6  422 for missing required fields
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/orders — AC-6 validation errors', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
  });

  it('returns HTTP 422 when cartId is missing', async () => {
    const { cartId: _cartId, ...noCartId } = VALID_PAYLOAD;
    const { status } = await postOrder(app, noCartId);
    expect(status).toBe(422);
  });

  it('returns HTTP 422 when paymentAttemptId is missing', async () => {
    const { paymentAttemptId: _pay, ...noPayAttempt } = VALID_PAYLOAD;
    const { status } = await postOrder(app, noPayAttempt);
    expect(status).toBe(422);
  });

  it('returns HTTP 422 when lineItems is missing', async () => {
    const { lineItems: _items, ...noItems } = VALID_PAYLOAD;
    const { status } = await postOrder(app, noItems);
    expect(status).toBe(422);
  });

  it('returns HTTP 422 when lineItems is an empty array', async () => {
    const { status } = await postOrder(app, { ...VALID_PAYLOAD, lineItems: [] });
    expect(status).toBe(422);
  });

  it('returns HTTP 422 when paymentStatus is missing', async () => {
    const { paymentStatus: _ps, ...noPayStatus } = VALID_PAYLOAD;
    const { status } = await postOrder(app, noPayStatus);
    expect(status).toBe(422);
  });

  it('422 response body includes an errorCode', async () => {
    const { cartId: _cartId, ...noCartId } = VALID_PAYLOAD;
    const { body } = await postOrder(app, noCartId);
    expect(typeof body.errorCode).toBe('string');
    expect((body.errorCode as string).length).toBeGreaterThan(0);
  });

  it('422 response body includes an errors array or message describing the missing fields', async () => {
    const { cartId: _cartId, ...noCartId } = VALID_PAYLOAD;
    const { body } = await postOrder(app, noCartId);
    const hasErrors = Array.isArray(body.errors) && (body.errors as unknown[]).length > 0;
    const hasMessage = typeof body.message === 'string' && (body.message as string).length > 0;
    expect(hasErrors || hasMessage).toBe(true);
  });

  it('does not persist an order when required fields are missing', async () => {
    const { cartId: _cartId, ...noCartId } = VALID_PAYLOAD;
    await postOrder(app, noCartId);

    const orders = getAllOrders() as StoredOrder[];
    expect(orders.length).toBe(0);
  });

  it('does not write an audit event when validation fails', async () => {
    const { cartId: _cartId, ...noCartId } = VALID_PAYLOAD;
    await postOrder(app, noCartId);

    const events = getOrderAuditEvents() as StoredAuditEvent[];
    expect(events.length).toBe(0);
  });

  it('returns HTTP 422 when the request body is empty', async () => {
    const { status } = await postOrder(app, {});
    expect(status).toBe(422);
  });
});
