import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for the payment initiation and status API.
 *
 * AC-1  POST /api/payments/initiate creates a PaymentAttempt and persists it.
 * AC-2  The response includes {paymentAttemptId, status, instructions, actionUrl}.
 * AC-3  The initial status is 'awaiting_customer_action' for mobile_money.
 * AC-4  GET /api/payments/:paymentAttemptId/status returns {status, updatedAt}.
 * AC-5  Missing required fields return 422 with field-level errors.
 * AC-6  GET returns 404 for an unknown paymentAttemptId.
 */

import {
  clearAll,
  getPaymentAttempts,
} from '../../modules/payment/paymentStore';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

interface InitiateResponse {
  paymentAttemptId: string;
  status: string;
  instructions: string;
  actionUrl: string;
}

interface StatusResponse {
  status: string;
  updatedAt: string;
}

interface ErrorResponse {
  errorCode: string;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
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

const VALID_INITIATE_PAYLOAD = {
  orderId: 'ord_pay_test_001',
  method: 'mobile_money',
  msisdn: '27835550001',
  amount: 199.99,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app') as { createApp: () => Application };
  return createApp();
}

async function postInitiate(
  app: Application,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app)
    .post('/api/payments/initiate')
    .set('Content-Type', 'application/json')
    .send(payload);
  return { status: res.status, body: res.body };
}

async function getStatus(
  app: Application,
  paymentAttemptId: string,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app).get(`/api/payments/${paymentAttemptId}/status`);
  return { status: res.status, body: res.body };
}

// ---------------------------------------------------------------------------
// AC-1  PaymentAttempt created and persisted
// ---------------------------------------------------------------------------

describe('POST /api/payments/initiate — AC-1 creation and persistence', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
  });

  it('returns HTTP 201 on valid mobile_money initiation', async () => {
    const { status } = await postInitiate(app, VALID_INITIATE_PAYLOAD);
    expect(status).toBe(201);
  });

  it('persists exactly one PaymentAttempt after a valid initiation', async () => {
    await postInitiate(app, VALID_INITIATE_PAYLOAD);
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    expect(attempts.length).toBe(1);
  });

  it('persisted PaymentAttempt has the orderId from the request', async () => {
    await postInitiate(app, VALID_INITIATE_PAYLOAD);
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    expect(attempts[0].orderId).toBe(VALID_INITIATE_PAYLOAD.orderId);
  });

  it('persisted PaymentAttempt has method "mobile_money"', async () => {
    await postInitiate(app, VALID_INITIATE_PAYLOAD);
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    expect(attempts[0].method).toBe('mobile_money');
  });

  it('persisted PaymentAttempt has an initiatedAt ISO timestamp', async () => {
    await postInitiate(app, VALID_INITIATE_PAYLOAD);
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    expect(typeof attempts[0].initiatedAt).toBe('string');
    expect(new Date(attempts[0].initiatedAt).getTime()).not.toBeNaN();
  });

  it('persisted PaymentAttempt has resolvedAt as null on creation', async () => {
    await postInitiate(app, VALID_INITIATE_PAYLOAD);
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    expect(attempts[0].resolvedAt).toBeNull();
  });

  it('persisted PaymentAttempt has a non-empty id', async () => {
    await postInitiate(app, VALID_INITIATE_PAYLOAD);
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    expect(typeof attempts[0].id).toBe('string');
    expect(attempts[0].id.length).toBeGreaterThan(0);
  });

  it('persisted PaymentAttempt has provider set to an mpesa or vodacom_wallet value', async () => {
    await postInitiate(app, VALID_INITIATE_PAYLOAD);
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    expect(['mpesa', 'vodacom_wallet', 'psp']).toContain(attempts[0].provider);
  });
});

// ---------------------------------------------------------------------------
// AC-2  Response shape: {paymentAttemptId, status, instructions, actionUrl}
// ---------------------------------------------------------------------------

describe('POST /api/payments/initiate — AC-2 response shape', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeEach(async () => {
    clearAll();
    app = getApp();
    result = await postInitiate(app, VALID_INITIATE_PAYLOAD);
  });

  it('response body includes paymentAttemptId string', () => {
    const body = result.body as InitiateResponse;
    expect(typeof body.paymentAttemptId).toBe('string');
    expect(body.paymentAttemptId.length).toBeGreaterThan(0);
  });

  it('response body includes status string', () => {
    const body = result.body as InitiateResponse;
    expect(typeof body.status).toBe('string');
    expect(body.status.length).toBeGreaterThan(0);
  });

  it('response body includes non-empty instructions string', () => {
    const body = result.body as InitiateResponse;
    expect(typeof body.instructions).toBe('string');
    expect(body.instructions.length).toBeGreaterThan(0);
  });

  it('response body includes non-empty actionUrl string', () => {
    const body = result.body as InitiateResponse;
    expect(typeof body.actionUrl).toBe('string');
    expect(body.actionUrl.length).toBeGreaterThan(0);
  });

  it('paymentAttemptId in response matches the persisted record id', async () => {
    const body = result.body as InitiateResponse;
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    expect(attempts[0].id).toBe(body.paymentAttemptId);
  });
});

// ---------------------------------------------------------------------------
// AC-3  Initial status is 'awaiting_customer_action' for mobile_money
// ---------------------------------------------------------------------------

describe('POST /api/payments/initiate — AC-3 initial status', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
  });

  it('response status field is "awaiting_customer_action" for mobile_money', async () => {
    const { body } = await postInitiate(app, VALID_INITIATE_PAYLOAD);
    const b = body as InitiateResponse;
    expect(b.status).toBe('awaiting_customer_action');
  });

  it('persisted PaymentAttempt status is "awaiting_customer_action"', async () => {
    await postInitiate(app, VALID_INITIATE_PAYLOAD);
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    expect(attempts[0].status).toBe('awaiting_customer_action');
  });

  it('two initiations for different orders produce two independent records', async () => {
    await postInitiate(app, VALID_INITIATE_PAYLOAD);
    await postInitiate(app, { ...VALID_INITIATE_PAYLOAD, orderId: 'ord_pay_test_002' });
    const attempts = getPaymentAttempts() as PersistedPaymentAttempt[];
    expect(attempts.length).toBe(2);
    const ids = attempts.map((a) => a.id);
    expect(ids[0]).not.toBe(ids[1]);
  });
});

// ---------------------------------------------------------------------------
// AC-4  GET /api/payments/:paymentAttemptId/status returns {status, updatedAt}
// ---------------------------------------------------------------------------

describe('GET /api/payments/:paymentAttemptId/status — AC-4 status retrieval', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
  });

  it('returns HTTP 200 for an existing paymentAttemptId', async () => {
    const { body: initBody } = await postInitiate(app, VALID_INITIATE_PAYLOAD);
    const { paymentAttemptId } = initBody as InitiateResponse;
    const { status } = await getStatus(app, paymentAttemptId);
    expect(status).toBe(200);
  });

  it('response body includes status field', async () => {
    const { body: initBody } = await postInitiate(app, VALID_INITIATE_PAYLOAD);
    const { paymentAttemptId } = initBody as InitiateResponse;
    const { body } = await getStatus(app, paymentAttemptId);
    const b = body as StatusResponse;
    expect(typeof b.status).toBe('string');
    expect(b.status.length).toBeGreaterThan(0);
  });

  it('response body includes updatedAt ISO timestamp', async () => {
    const { body: initBody } = await postInitiate(app, VALID_INITIATE_PAYLOAD);
    const { paymentAttemptId } = initBody as InitiateResponse;
    const { body } = await getStatus(app, paymentAttemptId);
    const b = body as StatusResponse;
    expect(typeof b.updatedAt).toBe('string');
    expect(new Date(b.updatedAt).getTime()).not.toBeNaN();
  });

  it('status returned is "awaiting_customer_action" immediately after initiation', async () => {
    const { body: initBody } = await postInitiate(app, VALID_INITIATE_PAYLOAD);
    const { paymentAttemptId } = initBody as InitiateResponse;
    const { body } = await getStatus(app, paymentAttemptId);
    const b = body as StatusResponse;
    expect(b.status).toBe('awaiting_customer_action');
  });
});

// ---------------------------------------------------------------------------
// AC-5  Validation — missing required fields return 422
// ---------------------------------------------------------------------------

describe('POST /api/payments/initiate — AC-5 validation errors', () => {
  let app: Application;
  beforeEach(() => {
    clearAll();
    app = getApp();
  });

  const requiredFields = ['orderId', 'method', 'msisdn'] as const;

  for (const field of requiredFields) {
    it(`returns 422 when "${field}" is omitted`, async () => {
      const payload = { ...VALID_INITIATE_PAYLOAD } as Record<string, unknown>;
      delete payload[field];
      const { status } = await postInitiate(app, payload);
      expect(status).toBe(422);
    });

    it(`422 response for missing "${field}" includes errors array`, async () => {
      const payload = { ...VALID_INITIATE_PAYLOAD } as Record<string, unknown>;
      delete payload[field];
      const { body } = await postInitiate(app, payload);
      const b = body as ErrorResponse;
      expect(Array.isArray(b.errors)).toBe(true);
      expect((b.errors as Array<unknown>).length).toBeGreaterThan(0);
    });
  }

  it('returns 422 when method is not "mobile_money" or "card"', async () => {
    const { status } = await postInitiate(app, { ...VALID_INITIATE_PAYLOAD, method: 'cash' });
    expect(status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// AC-6  GET returns 404 for unknown paymentAttemptId
// ---------------------------------------------------------------------------

describe('GET /api/payments/:paymentAttemptId/status — AC-6 not found', () => {
  let app: Application;
  beforeEach(() => {
    clearAll();
    app = getApp();
  });

  it('returns HTTP 404 for a non-existent paymentAttemptId', async () => {
    const { status } = await getStatus(app, 'pay_does_not_exist');
    expect(status).toBe(404);
  });

  it('404 response includes a machine-readable errorCode', async () => {
    const { body } = await getStatus(app, 'pay_does_not_exist');
    const b = body as ErrorResponse;
    expect(typeof b.errorCode).toBe('string');
    expect(b.errorCode.length).toBeGreaterThan(0);
  });
});
