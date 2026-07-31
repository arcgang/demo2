import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for the mobile money simulate-callback endpoint
 * and the state machine / state reconciliation rules.
 *
 * AC-1  Simulated success callback transitions status to 'success' and records resolvedAt.
 * AC-2  Simulated failure callback transitions status to 'failed' and records resolvedAt.
 * AC-3  State transitions are one-way: 'success' cannot be overwritten with 'failed'.
 * AC-4  State transitions are one-way: 'failed' cannot be overwritten with 'success'.
 * AC-5  A 'success' record cannot re-enter 'awaiting_customer_action'.
 * AC-6  Callback for an unknown providerReference returns 404.
 * AC-7  Callback with invalid outcome value returns 422.
 */

import {
  clearAll,
  getPaymentAttempts,
  seedPaymentAttempt,
} from '../../modules/payment/paymentStore';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

interface CallbackResponse {
  paymentAttemptId: string;
  status: string;
  resolvedAt?: string;
}

interface ErrorResponse {
  errorCode: string;
  message?: string;
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

const ATTEMPT_AWAITING = 'pay_awaiting_001';
const ATTEMPT_SUCCESS  = 'pay_success_001';
const ATTEMPT_FAILED   = 'pay_failed_001';
const PROVIDER_REF     = 'mpesa_tx_ref_001';

function seedAwaiting(id: string, providerRef: string): void {
  seedPaymentAttempt({
    id,
    orderId: `ord_for_${id}`,
    method: 'mobile_money',
    provider: 'mpesa',
    status: 'awaiting_customer_action',
    providerReference: providerRef,
    initiatedAt: new Date().toISOString(),
    resolvedAt: null,
  });
}

function seedSuccess(id: string, providerRef: string): void {
  seedPaymentAttempt({
    id,
    orderId: `ord_for_${id}`,
    method: 'mobile_money',
    provider: 'mpesa',
    status: 'success',
    providerReference: providerRef,
    initiatedAt: new Date().toISOString(),
    resolvedAt: new Date().toISOString(),
  });
}

function seedFailed(id: string, providerRef: string): void {
  seedPaymentAttempt({
    id,
    orderId: `ord_for_${id}`,
    method: 'mobile_money',
    provider: 'mpesa',
    status: 'failed',
    providerReference: providerRef,
    initiatedAt: new Date().toISOString(),
    resolvedAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app') as { createApp: () => Application };
  return createApp();
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

// ---------------------------------------------------------------------------
// AC-1  Success callback transitions status to 'success'
// ---------------------------------------------------------------------------

describe('POST /api/payments/mobile-money/simulate-callback — AC-1 success transition', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
    seedAwaiting(ATTEMPT_AWAITING, PROVIDER_REF);
  });

  it('returns HTTP 200 for a valid success callback', async () => {
    const { status } = await postCallback(app, PROVIDER_REF, 'success');
    expect(status).toBe(200);
  });

  it('response status field is "success" after success callback', async () => {
    const { body } = await postCallback(app, PROVIDER_REF, 'success');
    const b = body as CallbackResponse;
    expect(b.status).toBe('success');
  });

  it('persisted PaymentAttempt status is "success" after success callback', async () => {
    await postCallback(app, PROVIDER_REF, 'success');
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    const attempt = attempts.find((a) => a.providerReference === PROVIDER_REF);
    expect(attempt?.status).toBe('success');
  });

  it('persisted PaymentAttempt resolvedAt is set (non-null) after success callback', async () => {
    await postCallback(app, PROVIDER_REF, 'success');
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    const attempt = attempts.find((a) => a.providerReference === PROVIDER_REF);
    expect(attempt?.resolvedAt).not.toBeNull();
    expect(typeof attempt?.resolvedAt).toBe('string');
  });

  it('resolvedAt is a valid ISO timestamp', async () => {
    await postCallback(app, PROVIDER_REF, 'success');
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    const attempt = attempts.find((a) => a.providerReference === PROVIDER_REF);
    expect(new Date(attempt?.resolvedAt as string).getTime()).not.toBeNaN();
  });

  it('response includes a paymentAttemptId', async () => {
    const { body } = await postCallback(app, PROVIDER_REF, 'success');
    const b = body as CallbackResponse;
    expect(typeof b.paymentAttemptId).toBe('string');
    expect(b.paymentAttemptId.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC-2  Failure callback transitions status to 'failed'
// ---------------------------------------------------------------------------

describe('POST /api/payments/mobile-money/simulate-callback — AC-2 failure transition', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
    seedAwaiting(ATTEMPT_AWAITING, PROVIDER_REF);
  });

  it('returns HTTP 200 for a valid failed callback', async () => {
    const { status } = await postCallback(app, PROVIDER_REF, 'failed');
    expect(status).toBe(200);
  });

  it('response status field is "failed" after failure callback', async () => {
    const { body } = await postCallback(app, PROVIDER_REF, 'failed');
    const b = body as CallbackResponse;
    expect(b.status).toBe('failed');
  });

  it('persisted PaymentAttempt status is "failed" after failure callback', async () => {
    await postCallback(app, PROVIDER_REF, 'failed');
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    const attempt = attempts.find((a) => a.providerReference === PROVIDER_REF);
    expect(attempt?.status).toBe('failed');
  });

  it('persisted PaymentAttempt resolvedAt is set (non-null) after failure callback', async () => {
    await postCallback(app, PROVIDER_REF, 'failed');
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    const attempt = attempts.find((a) => a.providerReference === PROVIDER_REF);
    expect(attempt?.resolvedAt).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AC-3  State machine: 'success' cannot be overwritten with 'failed'
// ---------------------------------------------------------------------------

describe('POST /api/payments/mobile-money/simulate-callback — AC-3 success is terminal', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
    seedSuccess(ATTEMPT_SUCCESS, PROVIDER_REF);
  });

  it('returns HTTP 409 when attempting to set "failed" on an already-success record', async () => {
    const { status } = await postCallback(app, PROVIDER_REF, 'failed');
    expect(status).toBe(409);
  });

  it('409 response includes a machine-readable errorCode', async () => {
    const { body } = await postCallback(app, PROVIDER_REF, 'failed');
    const b = body as ErrorResponse;
    expect(typeof b.errorCode).toBe('string');
    expect(b.errorCode.length).toBeGreaterThan(0);
  });

  it('persisted status remains "success" after rejected overwrite attempt', async () => {
    await postCallback(app, PROVIDER_REF, 'failed');
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    const attempt = attempts.find((a) => a.providerReference === PROVIDER_REF);
    expect(attempt?.status).toBe('success');
  });

  it('idempotent: calling success callback again on a success record returns 200 or 409, never 5xx', async () => {
    const { status } = await postCallback(app, PROVIDER_REF, 'success');
    expect([200, 409]).toContain(status);
  });
});

// ---------------------------------------------------------------------------
// AC-4  State machine: 'failed' cannot be overwritten with 'success'
// ---------------------------------------------------------------------------

describe('POST /api/payments/mobile-money/simulate-callback — AC-4 failed is terminal', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
    seedFailed(ATTEMPT_FAILED, PROVIDER_REF);
  });

  it('returns HTTP 409 when attempting to set "success" on an already-failed record', async () => {
    const { status } = await postCallback(app, PROVIDER_REF, 'success');
    expect(status).toBe(409);
  });

  it('409 response includes a machine-readable errorCode', async () => {
    const { body } = await postCallback(app, PROVIDER_REF, 'success');
    const b = body as ErrorResponse;
    expect(typeof b.errorCode).toBe('string');
    expect(b.errorCode.length).toBeGreaterThan(0);
  });

  it('persisted status remains "failed" after rejected overwrite attempt', async () => {
    await postCallback(app, PROVIDER_REF, 'success');
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    const attempt = attempts.find((a) => a.providerReference === PROVIDER_REF);
    expect(attempt?.status).toBe('failed');
  });
});

// ---------------------------------------------------------------------------
// AC-5  'success' cannot re-enter 'awaiting_customer_action'
// ---------------------------------------------------------------------------

describe('POST /api/payments/mobile-money/simulate-callback — AC-5 no rewind from success', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
    seedSuccess(ATTEMPT_SUCCESS, PROVIDER_REF);
  });

  it('cannot set awaiting_customer_action on a success record — returns 409', async () => {
    const res = await request(app)
      .post('/api/payments/mobile-money/simulate-callback')
      .set('Content-Type', 'application/json')
      .send({ providerReference: PROVIDER_REF, outcome: 'awaiting_customer_action' });
    expect(res.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// AC-6  Callback for unknown providerReference returns 404
// ---------------------------------------------------------------------------

describe('POST /api/payments/mobile-money/simulate-callback — AC-6 not found', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
  });

  it('returns 404 for an unknown providerReference', async () => {
    const { status } = await postCallback(app, 'mpesa_nonexistent_ref', 'success');
    expect(status).toBe(404);
  });

  it('404 response includes a machine-readable errorCode', async () => {
    const { body } = await postCallback(app, 'mpesa_nonexistent_ref', 'success');
    const b = body as ErrorResponse;
    expect(typeof b.errorCode).toBe('string');
    expect(b.errorCode.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC-7  Invalid outcome value returns 422
// ---------------------------------------------------------------------------

describe('POST /api/payments/mobile-money/simulate-callback — AC-7 invalid outcome', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
    seedAwaiting(ATTEMPT_AWAITING, PROVIDER_REF);
  });

  it('returns 422 when outcome is an unrecognised value', async () => {
    const { status } = await postCallback(app, PROVIDER_REF, 'refunded');
    expect(status).toBe(422);
  });

  it('returns 422 when outcome field is missing', async () => {
    const res = await request(app)
      .post('/api/payments/mobile-money/simulate-callback')
      .set('Content-Type', 'application/json')
      .send({ providerReference: PROVIDER_REF });
    expect(res.status).toBe(422);
  });

  it('returns 422 when providerReference field is missing', async () => {
    const res = await request(app)
      .post('/api/payments/mobile-money/simulate-callback')
      .set('Content-Type', 'application/json')
      .send({ outcome: 'success' });
    expect(res.status).toBe(422);
  });
});
