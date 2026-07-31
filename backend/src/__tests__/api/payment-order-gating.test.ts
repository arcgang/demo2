import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for order gating and activation gating behind payment status.
 *
 * AC-1  Order may only advance from 'payment_pending' to 'confirmed' when
 *       PaymentAttempt.status === 'success'. Returns 402 otherwise.
 * AC-2  Activation/eSIM issuance must verify PaymentAttempt.status === 'success'
 *       via the payment store, returning 402 when not met.
 * AC-3  Simulated success callback allows order to advance.
 * AC-4  Simulated failure callback leaves order in 'payment_pending'; advance returns 402.
 * AC-5  GET /api/payments/:id/status reflects updated status after callback.
 */

import {
  clearAll as clearPayments,
  getPaymentAttempts,
  seedPaymentAttempt,
} from '../../modules/payment/paymentStore';

import {
  clearAll as clearActivation,
  seedOrder,
} from '../../modules/activation/activationStore';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

interface ErrorResponse {
  errorCode: string;
  message?: string;
}

interface OrderAdvanceResponse {
  orderId: string;
  orderStatus: string;
}

interface StatusResponse {
  status: string;
  updatedAt: string;
}

interface PersistedPaymentAttempt {
  id: string;
  orderId: string;
  method: string;
  provider: string;
  status: string;
  providerReference: string | null;
  initiatedAt: string;
  resolvedAt: string | null;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORDER_PENDING_PAY  = 'ord_gate_pending_001';
const ORDER_SUCCESS_PAY  = 'ord_gate_success_001';
const ORDER_FAILED_PAY   = 'ord_gate_failed_001';

const ATTEMPT_PENDING_ID   = 'pay_gate_pending_001';
const ATTEMPT_SUCCESS_ID   = 'pay_gate_success_001';
const ATTEMPT_FAILED_ID    = 'pay_gate_failed_001';

const PROVIDER_REF_PENDING = 'mpesa_gate_pending_ref';
const PROVIDER_REF_SUCCESS = 'mpesa_gate_success_ref';
const PROVIDER_REF_FAILED  = 'mpesa_gate_failed_ref';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app') as { createApp: () => Application };
  return createApp();
}

async function postAdvanceOrder(
  app: Application,
  orderId: string,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app)
    .post(`/api/orders/${orderId}/advance`)
    .set('Content-Type', 'application/json')
    .send({});
  return { status: res.status, body: res.body };
}

async function postCallback(
  app: Application,
  providerReference: string,
  outcome: string,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app)
    .post('/api/payments/mobile-money/simulate-callback')
    .set('Content-Type', 'application/json')
    .send({ providerReference, outcome });
  return { status: res.status, body: res.body };
}

async function getPaymentStatus(
  app: Application,
  paymentAttemptId: string,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app).get(`/api/payments/${paymentAttemptId}/status`);
  return { status: res.status, body: res.body };
}

// ---------------------------------------------------------------------------
// AC-1  Order advance blocked when payment is not 'success'
// ---------------------------------------------------------------------------

describe('POST /api/orders/:id/advance — AC-1 payment gate blocks advance', () => {
  let app: Application;

  beforeEach(() => {
    clearPayments();
    clearActivation();
    app = getApp();

    seedPaymentAttempt({
      id: ATTEMPT_PENDING_ID,
      orderId: ORDER_PENDING_PAY,
      method: 'mobile_money',
      provider: 'mpesa',
      status: 'awaiting_customer_action',
      providerReference: PROVIDER_REF_PENDING,
      initiatedAt: new Date().toISOString(),
      resolvedAt: null,
    });

    seedOrder(ORDER_PENDING_PAY, {
      paymentStatus: 'PENDING',
      verificationStatus: 'COMPLETED',
    });
  });

  it('returns 402 when PaymentAttempt status is awaiting_customer_action', async () => {
    const { status } = await postAdvanceOrder(app, ORDER_PENDING_PAY);
    expect(status).toBe(402);
  });

  it('402 response includes errorCode PAYMENT_REQUIRED', async () => {
    const { body } = await postAdvanceOrder(app, ORDER_PENDING_PAY);
    const b = body as ErrorResponse;
    expect(b.errorCode).toBe('PAYMENT_REQUIRED');
  });

  it('402 response includes a human-readable message', async () => {
    const { body } = await postAdvanceOrder(app, ORDER_PENDING_PAY);
    const b = body as ErrorResponse;
    expect(typeof b.message).toBe('string');
    expect((b.message as string).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC-2  Activation blocked when payment not 'success'
// ---------------------------------------------------------------------------

describe('POST /api/orders/:id/esim/issue — AC-2 payment gating via payment store', () => {
  let app: Application;

  beforeEach(() => {
    clearPayments();
    clearActivation();
    app = getApp();

    seedPaymentAttempt({
      id: ATTEMPT_PENDING_ID,
      orderId: ORDER_PENDING_PAY,
      method: 'mobile_money',
      provider: 'mpesa',
      status: 'awaiting_customer_action',
      providerReference: PROVIDER_REF_PENDING,
      initiatedAt: new Date().toISOString(),
      resolvedAt: null,
    });

    seedOrder(ORDER_PENDING_PAY, {
      paymentStatus: 'PENDING',
      verificationStatus: 'COMPLETED',
    });
  });

  it('eSIM issue returns non-200 when payment is not confirmed', async () => {
    const res = await request(app).post(`/api/orders/${ORDER_PENDING_PAY}/esim/issue`);
    expect(res.status).not.toBe(200);
  });
});

// ---------------------------------------------------------------------------
// AC-3  Simulated success callback allows order to advance
// ---------------------------------------------------------------------------

describe('POST /api/orders/:id/advance — AC-3 success callback unblocks advance', () => {
  let app: Application;

  beforeEach(async () => {
    clearPayments();
    clearActivation();
    app = getApp();

    seedPaymentAttempt({
      id: ATTEMPT_SUCCESS_ID,
      orderId: ORDER_SUCCESS_PAY,
      method: 'mobile_money',
      provider: 'mpesa',
      status: 'awaiting_customer_action',
      providerReference: PROVIDER_REF_SUCCESS,
      initiatedAt: new Date().toISOString(),
      resolvedAt: null,
    });

    seedOrder(ORDER_SUCCESS_PAY, {
      paymentStatus: 'PENDING',
      verificationStatus: 'COMPLETED',
    });

    await postCallback(app, PROVIDER_REF_SUCCESS, 'success');
  });

  it('order advance returns 200 after payment success callback', async () => {
    const { status } = await postAdvanceOrder(app, ORDER_SUCCESS_PAY);
    expect(status).toBe(200);
  });

  it('order advance response includes orderStatus "confirmed"', async () => {
    const { body } = await postAdvanceOrder(app, ORDER_SUCCESS_PAY);
    const b = body as OrderAdvanceResponse;
    expect(b.orderStatus).toBe('confirmed');
  });

  it('payment attempt status is "success" in the store after callback', () => {
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    const attempt = attempts.find((a) => a.id === ATTEMPT_SUCCESS_ID);
    expect(attempt?.status).toBe('success');
  });
});

// ---------------------------------------------------------------------------
// AC-4  Simulated failure callback leaves order in 'payment_pending'
// ---------------------------------------------------------------------------

describe('POST /api/orders/:id/advance — AC-4 failure callback keeps order blocked', () => {
  let app: Application;

  beforeEach(async () => {
    clearPayments();
    clearActivation();
    app = getApp();

    seedPaymentAttempt({
      id: ATTEMPT_FAILED_ID,
      orderId: ORDER_FAILED_PAY,
      method: 'mobile_money',
      provider: 'mpesa',
      status: 'awaiting_customer_action',
      providerReference: PROVIDER_REF_FAILED,
      initiatedAt: new Date().toISOString(),
      resolvedAt: null,
    });

    seedOrder(ORDER_FAILED_PAY, {
      paymentStatus: 'PENDING',
      verificationStatus: 'COMPLETED',
    });

    await postCallback(app, PROVIDER_REF_FAILED, 'failed');
  });

  it('returns 402 when PaymentAttempt status is "failed"', async () => {
    const { status } = await postAdvanceOrder(app, ORDER_FAILED_PAY);
    expect(status).toBe(402);
  });

  it('402 response errorCode is PAYMENT_REQUIRED', async () => {
    const { body } = await postAdvanceOrder(app, ORDER_FAILED_PAY);
    const b = body as ErrorResponse;
    expect(b.errorCode).toBe('PAYMENT_REQUIRED');
  });

  it('payment attempt status is "failed" in the store', () => {
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    const attempt = attempts.find((a) => a.id === ATTEMPT_FAILED_ID);
    expect(attempt?.status).toBe('failed');
  });
});

// ---------------------------------------------------------------------------
// AC-5  GET /api/payments/:id/status reflects updated status after callback
// ---------------------------------------------------------------------------

describe('GET /api/payments/:id/status — AC-5 status reflects callback outcome', () => {
  let app: Application;

  beforeEach(() => {
    clearPayments();
    clearActivation();
    app = getApp();
  });

  it('status changes to "success" after success callback', async () => {
    seedPaymentAttempt({
      id: ATTEMPT_SUCCESS_ID,
      orderId: ORDER_SUCCESS_PAY,
      method: 'mobile_money',
      provider: 'mpesa',
      status: 'awaiting_customer_action',
      providerReference: PROVIDER_REF_SUCCESS,
      initiatedAt: new Date().toISOString(),
      resolvedAt: null,
    });

    await postCallback(app, PROVIDER_REF_SUCCESS, 'success');
    const { body } = await getPaymentStatus(app, ATTEMPT_SUCCESS_ID);
    const b = body as StatusResponse;
    expect(b.status).toBe('success');
  });

  it('status changes to "failed" after failed callback', async () => {
    seedPaymentAttempt({
      id: ATTEMPT_FAILED_ID,
      orderId: ORDER_FAILED_PAY,
      method: 'mobile_money',
      provider: 'mpesa',
      status: 'awaiting_customer_action',
      providerReference: PROVIDER_REF_FAILED,
      initiatedAt: new Date().toISOString(),
      resolvedAt: null,
    });

    await postCallback(app, PROVIDER_REF_FAILED, 'failed');
    const { body } = await getPaymentStatus(app, ATTEMPT_FAILED_ID);
    const b = body as StatusResponse;
    expect(b.status).toBe('failed');
  });

  it('updatedAt in status response is a valid ISO timestamp', async () => {
    seedPaymentAttempt({
      id: ATTEMPT_SUCCESS_ID,
      orderId: ORDER_SUCCESS_PAY,
      method: 'mobile_money',
      provider: 'mpesa',
      status: 'awaiting_customer_action',
      providerReference: PROVIDER_REF_SUCCESS,
      initiatedAt: new Date().toISOString(),
      resolvedAt: null,
    });

    await postCallback(app, PROVIDER_REF_SUCCESS, 'success');
    const { body } = await getPaymentStatus(app, ATTEMPT_SUCCESS_ID);
    const b = body as StatusResponse;
    expect(new Date(b.updatedAt).getTime()).not.toBeNaN();
  });
});
