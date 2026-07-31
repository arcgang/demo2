import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for POST /api/checkout/initiate-payment
 *
 * Contract (from LLD §5 / task acceptance criteria):
 *
 *   Request body:
 *     orderId    string   required
 *     method     'card' | 'mobile_money'   required
 *     token      string   optional — PSP token for card payments
 *     walletRef  string   optional — wallet reference for mobile money
 *
 *   201  — payment attempt created; body: { paymentAttemptId, method, status }
 *   400  — payload contains a raw 16-digit card number in any field
 *   422  — missing required fields
 *
 * PCI-DSS: no PAN, CVV, or expiry may be accepted or persisted.
 * The PaymentAttempt record must NOT include columns for raw card data.
 */

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_CARD_PAYLOAD = {
  orderId: 'ord_test_001',
  method: 'card',
  token: 'psp_tok_abc123xyz',
};

const VALID_MOBILE_MONEY_PAYLOAD = {
  orderId: 'ord_test_002',
  method: 'mobile_money',
  walletRef: '27835550000',
};

const RAW_PAN_IN_TOKEN = {
  orderId: 'ord_test_003',
  method: 'card',
  token: '4111111111111111',
};

const RAW_PAN_IN_WALLET_REF = {
  orderId: 'ord_test_004',
  method: 'mobile_money',
  walletRef: '4111111111111111',
};

const RAW_PAN_IN_EXTRA_FIELD = {
  orderId: 'ord_test_005',
  method: 'card',
  token: 'psp_tok_safe',
  cardNumber: '4111111111111111',
};

// ---------------------------------------------------------------------------
// Response type shapes
// ---------------------------------------------------------------------------

interface PaymentAttemptCreatedResponse {
  paymentAttemptId: string;
  method: string;
  status: string;
}

interface ErrorResponse {
  errorCode: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

async function postInitiatePayment(
  app: Application,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app)
    .post('/api/checkout/initiate-payment')
    .set('Content-Type', 'application/json')
    .send(payload);
  return { status: res.status, body: res.body };
}

// ---------------------------------------------------------------------------
// AC-1  Valid PSP token card payment — 201, PaymentAttempt created, no PAN columns
// ---------------------------------------------------------------------------

describe('POST /api/checkout/initiate-payment — valid card token', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await postInitiatePayment(app, VALID_CARD_PAYLOAD);
  });

  it('returns HTTP 201', () => {
    expect(result.status).toBe(201);
  });

  it('response body contains a paymentAttemptId string', () => {
    const body = result.body as PaymentAttemptCreatedResponse;
    expect(typeof body.paymentAttemptId).toBe('string');
    expect(body.paymentAttemptId.length).toBeGreaterThan(0);
  });

  it('response body method equals "card"', () => {
    const body = result.body as PaymentAttemptCreatedResponse;
    expect(body.method).toBe('card');
  });

  it('response body contains a status field', () => {
    const body = result.body as PaymentAttemptCreatedResponse;
    expect(typeof body.status).toBe('string');
    expect(body.status.length).toBeGreaterThan(0);
  });

  it('response body does NOT contain a pan field', () => {
    const body = result.body as Record<string, unknown>;
    expect(body.pan).toBeUndefined();
  });

  it('response body does NOT contain a cvv field', () => {
    const body = result.body as Record<string, unknown>;
    expect(body.cvv).toBeUndefined();
  });

  it('response body does NOT contain an expiry field', () => {
    const body = result.body as Record<string, unknown>;
    expect(body.expiry).toBeUndefined();
    expect(body.expiryDate).toBeUndefined();
    expect(body.cardExpiry).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AC-2  Valid mobile money payment — 201, PaymentAttempt created
// ---------------------------------------------------------------------------

describe('POST /api/checkout/initiate-payment — valid mobile money', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await postInitiatePayment(app, VALID_MOBILE_MONEY_PAYLOAD);
  });

  it('returns HTTP 201', () => {
    expect(result.status).toBe(201);
  });

  it('response body contains a paymentAttemptId string', () => {
    const body = result.body as PaymentAttemptCreatedResponse;
    expect(typeof body.paymentAttemptId).toBe('string');
    expect(body.paymentAttemptId.length).toBeGreaterThan(0);
  });

  it('response body method equals "mobile_money"', () => {
    const body = result.body as PaymentAttemptCreatedResponse;
    expect(body.method).toBe('mobile_money');
  });

  it('response body contains a status field', () => {
    const body = result.body as PaymentAttemptCreatedResponse;
    expect(typeof body.status).toBe('string');
    expect(body.status.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC-3  PAN-rejection guard — 400 when any field contains a raw 16-digit number
// ---------------------------------------------------------------------------

describe('POST /api/checkout/initiate-payment — PAN rejection guard', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 400 when token field is a raw 16-digit card number', async () => {
    const res = await postInitiatePayment(app, RAW_PAN_IN_TOKEN);
    expect(res.status).toBe(400);
  });

  it('400 for raw PAN in token has an errorCode', async () => {
    const res = await postInitiatePayment(app, RAW_PAN_IN_TOKEN);
    const body = res.body as ErrorResponse;
    expect(typeof body.errorCode).toBe('string');
    expect(body.errorCode.length).toBeGreaterThan(0);
  });

  it('returns HTTP 400 when walletRef field is a raw 16-digit card number', async () => {
    const res = await postInitiatePayment(app, RAW_PAN_IN_WALLET_REF);
    expect(res.status).toBe(400);
  });

  it('returns HTTP 400 when any extra field contains a raw 16-digit card number', async () => {
    const res = await postInitiatePayment(app, RAW_PAN_IN_EXTRA_FIELD);
    expect(res.status).toBe(400);
  });

  it('rejects a 16-digit number regardless of card brand prefix (Visa 4111...)', async () => {
    const res = await postInitiatePayment(app, {
      ...VALID_CARD_PAYLOAD,
      token: '4111111111111111',
    });
    expect(res.status).toBe(400);
  });

  it('rejects a 16-digit number with Mastercard prefix', async () => {
    const res = await postInitiatePayment(app, {
      ...VALID_CARD_PAYLOAD,
      token: '5500000000000004',
    });
    expect(res.status).toBe(400);
  });

  it('does NOT reject a PSP token that happens to be 16 characters but non-numeric', async () => {
    const res = await postInitiatePayment(app, {
      ...VALID_CARD_PAYLOAD,
      token: 'psp_tok_abc12345',
    });
    expect(res.status).not.toBe(400);
  });
});

// ---------------------------------------------------------------------------
// AC-4  Missing required fields — 422
// ---------------------------------------------------------------------------

describe('POST /api/checkout/initiate-payment — missing required fields', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns 422 when orderId is missing', async () => {
    const { orderId: _omit, ...payload } = VALID_CARD_PAYLOAD as Record<string, unknown>;
    void _omit;
    const res = await postInitiatePayment(app, payload);
    expect(res.status).toBe(422);
  });

  it('returns 422 when method is missing', async () => {
    const payload = { orderId: 'ord_test_x' };
    const res = await postInitiatePayment(app, payload);
    expect(res.status).toBe(422);
  });

  it('returns 422 when method is not a valid value', async () => {
    const res = await postInitiatePayment(app, {
      orderId: 'ord_test_x',
      method: 'bitcoin',
    });
    expect(res.status).toBe(422);
  });
});
