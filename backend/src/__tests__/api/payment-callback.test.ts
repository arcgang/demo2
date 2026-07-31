import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for POST /api/checkout/payment-callback
 *
 * Contract (from LLD §5 / §8 task acceptance criteria):
 *
 *   Headers:
 *     x-callback-secret   string  required  — shared secret for integrity validation
 *
 *   Request body (M-Pesa-style callback):
 *     paymentAttemptId    string  required
 *     providerReference   string  required
 *     status              'SUCCESS' | 'FAILED' | 'PENDING'   required
 *     walletReference     string  optional
 *     confirmedAt         string  optional — ISO-8601 timestamp
 *
 *   200  — callback accepted and PaymentAttempt status updated
 *   401  — shared-secret header missing or invalid
 *   404  — paymentAttemptId not found
 *   422  — missing/invalid required fields
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_SECRET = 'test-callback-secret';
const WRONG_SECRET = 'wrong-secret-value';

// ---------------------------------------------------------------------------
// Response type shapes
// ---------------------------------------------------------------------------

interface CallbackAcceptedResponse {
  paymentAttemptId: string;
  status: string;
}

interface ErrorResponse {
  errorCode: string;
  message?: string;
}

interface InitiatePaymentResponse {
  paymentAttemptId: string;
  method: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

async function postCallback(
  app: Application,
  payload: Record<string, unknown>,
  secret: string | null,
): Promise<{ status: number; body: unknown }> {
  const req = request(app)
    .post('/api/checkout/payment-callback')
    .set('Content-Type', 'application/json');
  if (secret !== null) {
    req.set('x-callback-secret', secret);
  }
  const res = await req.send(payload);
  return { status: res.status, body: res.body };
}

// Seeds a payment attempt via initiate-payment and returns the generated paymentAttemptId.
async function seedPaymentAttempt(
  app: Application,
  method: 'card' | 'mobile_money',
): Promise<string> {
  const payload =
    method === 'card'
      ? { orderId: `ord_seed_card_${Date.now()}`, method: 'card', token: 'psp_tok_seed_abc' }
      : { orderId: `ord_seed_mm_${Date.now()}`, method: 'mobile_money', walletRef: '27835550000' };

  const res = await request(app)
    .post('/api/checkout/initiate-payment')
    .set('Content-Type', 'application/json')
    .send(payload);

  return (res.body as InitiatePaymentResponse).paymentAttemptId;
}

// ---------------------------------------------------------------------------
// AC-1  Missing or invalid shared-secret header — 401
// ---------------------------------------------------------------------------

describe('POST /api/checkout/payment-callback — shared-secret validation', () => {
  let app: Application;
  // A well-formed callback payload; the attempt may not exist — we only care about 401 here.
  const anyCallbackPayload = {
    paymentAttemptId: 'pay_does_not_matter',
    providerReference: 'mpesa_tx_12345',
    status: 'SUCCESS',
  };

  beforeAll(() => { app = getApp(); });

  it('returns HTTP 401 when x-callback-secret header is absent', async () => {
    const res = await postCallback(app, anyCallbackPayload, null);
    expect(res.status).toBe(401);
  });

  it('401 response has an errorCode', async () => {
    const res = await postCallback(app, anyCallbackPayload, null);
    const body = res.body as ErrorResponse;
    expect(typeof body.errorCode).toBe('string');
    expect(body.errorCode.length).toBeGreaterThan(0);
  });

  it('returns HTTP 401 when x-callback-secret header is present but wrong', async () => {
    const res = await postCallback(app, anyCallbackPayload, WRONG_SECRET);
    expect(res.status).toBe(401);
  });

  it('does NOT return 401 when the correct shared-secret is supplied', async () => {
    const res = await postCallback(app, anyCallbackPayload, VALID_SECRET);
    // May be 200, 404 (attempt not found), or 422 — but NOT 401
    expect(res.status).not.toBe(401);
  });
});

// ---------------------------------------------------------------------------
// AC-2  Valid callback with correct secret — 200 and status updated
// ---------------------------------------------------------------------------

describe('POST /api/checkout/payment-callback — valid SUCCESS callback', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    const paymentAttemptId = await seedPaymentAttempt(app, 'mobile_money');
    result = await postCallback(app, {
      paymentAttemptId,
      providerReference: 'mpesa_tx_12345',
      status: 'SUCCESS',
      walletReference: '27835550000',
      confirmedAt: '2026-07-28T10:05:00Z',
    }, VALID_SECRET);
  });

  it('returns HTTP 200', () => {
    expect(result.status).toBe(200);
  });

  it('response body contains paymentAttemptId', () => {
    const body = result.body as CallbackAcceptedResponse;
    expect(typeof body.paymentAttemptId).toBe('string');
    expect(body.paymentAttemptId.length).toBeGreaterThan(0);
  });

  it('response body status reflects the callback status (SUCCESS)', () => {
    const body = result.body as CallbackAcceptedResponse;
    expect(body.status).toBe('SUCCESS');
  });
});

describe('POST /api/checkout/payment-callback — valid FAILED callback', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    const paymentAttemptId = await seedPaymentAttempt(app, 'mobile_money');
    result = await postCallback(app, {
      paymentAttemptId,
      providerReference: 'mpesa_tx_99999',
      status: 'FAILED',
    }, VALID_SECRET);
  });

  it('returns HTTP 200', () => {
    expect(result.status).toBe(200);
  });

  it('response body status reflects FAILED', () => {
    const body = result.body as CallbackAcceptedResponse;
    expect(body.status).toBe('FAILED');
  });
});

// ---------------------------------------------------------------------------
// AC-3  Idempotent: second identical callback does not error
// ---------------------------------------------------------------------------

describe('POST /api/checkout/payment-callback — idempotency', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('returns 200 on a repeated callback for the same attempt', async () => {
    const paymentAttemptId = await seedPaymentAttempt(app, 'mobile_money');
    const callbackPayload = {
      paymentAttemptId,
      providerReference: 'mpesa_tx_idempotent',
      status: 'SUCCESS',
    };
    // First call
    await postCallback(app, callbackPayload, VALID_SECRET);
    // Second identical call
    const res = await postCallback(app, callbackPayload, VALID_SECRET);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// AC-4  Unknown paymentAttemptId — 404
// ---------------------------------------------------------------------------

describe('POST /api/checkout/payment-callback — unknown attempt', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  const UNKNOWN_ATTEMPT_CALLBACK = {
    paymentAttemptId: 'pay_does_not_exist',
    providerReference: 'mpesa_tx_x',
    status: 'SUCCESS',
  };

  it('returns HTTP 404 when paymentAttemptId does not exist', async () => {
    const res = await postCallback(app, UNKNOWN_ATTEMPT_CALLBACK, VALID_SECRET);
    expect(res.status).toBe(404);
  });

  it('404 response has an errorCode', async () => {
    const res = await postCallback(app, UNKNOWN_ATTEMPT_CALLBACK, VALID_SECRET);
    const body = res.body as ErrorResponse;
    expect(typeof body.errorCode).toBe('string');
    expect(body.errorCode.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC-5  Missing required body fields — 422
// ---------------------------------------------------------------------------

describe('POST /api/checkout/payment-callback — missing required fields', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  const VALID_SHAPE = {
    paymentAttemptId: 'pay_does_not_matter',
    providerReference: 'mpesa_tx_12345',
    status: 'SUCCESS',
    walletReference: '27835550000',
    confirmedAt: '2026-07-28T10:05:00Z',
  };

  it('returns 422 when paymentAttemptId is missing', async () => {
    const { paymentAttemptId: _omit, ...payload } = VALID_SHAPE as Record<string, unknown>;
    void _omit;
    const res = await postCallback(app, payload, VALID_SECRET);
    expect(res.status).toBe(422);
  });

  it('returns 422 when providerReference is missing', async () => {
    const { providerReference: _omit, ...payload } = VALID_SHAPE as Record<string, unknown>;
    void _omit;
    const res = await postCallback(app, payload, VALID_SECRET);
    expect(res.status).toBe(422);
  });

  it('returns 422 when status is missing', async () => {
    const { status: _omit, ...payload } = VALID_SHAPE as Record<string, unknown>;
    void _omit;
    const res = await postCallback(app, payload, VALID_SECRET);
    expect(res.status).toBe(422);
  });

  it('returns 422 when status has an invalid value', async () => {
    const res = await postCallback(app, { ...VALID_SHAPE, status: 'BOGUS' }, VALID_SECRET);
    expect(res.status).toBe(422);
  });
});
