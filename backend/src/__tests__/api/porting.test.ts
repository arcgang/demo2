import request from 'supertest';
import express, { Application } from 'express';

/**
 * Acceptance tests for POST /api/onboarding/porting
 *
 * Contract (from LLD §5 / task acceptance criteria):
 *
 *   PortingInput schema fields:
 *     donorNetwork        string  required  — donor network name
 *     accountHolderName   string  required  — account holder name
 *     accountNumber       string  required  — account number
 *     idNumber            string  required  — ID number
 *     portingReference    string  optional  — porting reference / notes
 *     marketCode          string  required  — active market identifier
 *
 *   201  — valid input: persists VerificationCase (status: pending_porting),
 *          returns { caseId, status: "pending_porting", kycStub }
 *   422  — missing/invalid required field: field-level errors array
 *   403  — market does not support porting: clear message
 */

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_PAYLOAD = {
  marketCode: 'ZA',
  donorNetwork: 'MTN',
  accountHolderName: 'Amina Dlamini',
  accountNumber: 'ACC123456',
  idNumber: '9001015800088',
};

const VALID_PAYLOAD_WITH_NOTES = {
  ...VALID_PAYLOAD,
  portingReference: 'Porting requested on advice of store agent',
};

const UNSUPPORTED_MARKET_PAYLOAD = {
  ...VALID_PAYLOAD,
  marketCode: 'XX',
};

// ---------------------------------------------------------------------------
// Response type shapes
// ---------------------------------------------------------------------------

interface PortingSuccessResponse {
  caseId: string;
  status: string;
  kycStub: unknown;
}

interface FieldError {
  field: string;
  message: string;
}

interface ValidationErrorResponse {
  errorCode: string;
  errors: FieldError[];
}

interface ForbiddenResponse {
  errorCode: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

async function postPorting(
  app: Application,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app)
    .post('/api/onboarding/porting')
    .set('Content-Type', 'application/json')
    .send(payload);
  return { status: res.status, body: res.body };
}

// ---------------------------------------------------------------------------
// AC-1  Valid submission — 201 with VerificationCase and pending_porting status
// ---------------------------------------------------------------------------

describe('POST /api/onboarding/porting — valid submission', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await postPorting(app, VALID_PAYLOAD);
  });

  it('returns HTTP 201', () => {
    expect(result.status).toBe(201);
  });

  it('response body contains a caseId string', () => {
    const body = result.body as PortingSuccessResponse;
    expect(typeof body.caseId).toBe('string');
    expect(body.caseId.length).toBeGreaterThan(0);
  });

  it('response body status is "pending_porting"', () => {
    const body = result.body as PortingSuccessResponse;
    expect(body.status).toBe('pending_porting');
  });

  it('response body contains a kycStub object (mock KYC/RICA adapter wired)', () => {
    const body = result.body as PortingSuccessResponse;
    expect(body.kycStub).toBeDefined();
    expect(typeof body.kycStub).toBe('object');
  });

  it('also succeeds with the optional portingReference field present', async () => {
    const res = await postPorting(app, VALID_PAYLOAD_WITH_NOTES);
    expect(res.status).toBe(201);
    const body = res.body as PortingSuccessResponse;
    expect(body.status).toBe('pending_porting');
  });
});

// ---------------------------------------------------------------------------
// AC-2  Missing required fields — 422 with field-level errors
// ---------------------------------------------------------------------------

describe('POST /api/onboarding/porting — missing required fields', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  const requiredFields: Array<keyof typeof VALID_PAYLOAD> = [
    'donorNetwork',
    'accountHolderName',
    'accountNumber',
    'idNumber',
    'marketCode',
  ];

  for (const field of requiredFields) {
    it(`returns 422 when "${field}" is omitted`, async () => {
      const payload = { ...VALID_PAYLOAD };
      delete (payload as Record<string, unknown>)[field];
      const res = await postPorting(app, payload);
      expect(res.status).toBe(422);
    });

    it(`422 response for missing "${field}" includes field-level errors array`, async () => {
      const payload = { ...VALID_PAYLOAD };
      delete (payload as Record<string, unknown>)[field];
      const res = await postPorting(app, payload);
      const body = res.body as ValidationErrorResponse;
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors.length).toBeGreaterThan(0);
    });

    it(`error entry for missing "${field}" references the correct field name`, async () => {
      const payload = { ...VALID_PAYLOAD };
      delete (payload as Record<string, unknown>)[field];
      const res = await postPorting(app, payload);
      const body = res.body as ValidationErrorResponse;
      const matchingError = body.errors.find((e: FieldError) => e.field === field);
      expect(matchingError).toBeDefined();
    });

    it(`error entry for missing "${field}" has a non-empty message`, async () => {
      const payload = { ...VALID_PAYLOAD };
      delete (payload as Record<string, unknown>)[field];
      const res = await postPorting(app, payload);
      const body = res.body as ValidationErrorResponse;
      const matchingError = body.errors.find((e: FieldError) => e.field === field);
      expect(typeof matchingError?.message).toBe('string');
      expect((matchingError?.message as string).length).toBeGreaterThan(0);
    });
  }

  it('returns 422 and a field error when donorNetwork is an empty string', async () => {
    const res = await postPorting(app, { ...VALID_PAYLOAD, donorNetwork: '' });
    expect(res.status).toBe(422);
    const body = res.body as ValidationErrorResponse;
    const err = body.errors.find((e: FieldError) => e.field === 'donorNetwork');
    expect(err).toBeDefined();
  });

  it('returns 422 and a field error when accountHolderName is an empty string', async () => {
    const res = await postPorting(app, { ...VALID_PAYLOAD, accountHolderName: '' });
    expect(res.status).toBe(422);
    const body = res.body as ValidationErrorResponse;
    const err = body.errors.find((e: FieldError) => e.field === 'accountHolderName');
    expect(err).toBeDefined();
  });

  it('returns 422 and a field error when accountNumber is an empty string', async () => {
    const res = await postPorting(app, { ...VALID_PAYLOAD, accountNumber: '' });
    expect(res.status).toBe(422);
    const body = res.body as ValidationErrorResponse;
    const err = body.errors.find((e: FieldError) => e.field === 'accountNumber');
    expect(err).toBeDefined();
  });

  it('returns 422 and a field error when idNumber is an empty string', async () => {
    const res = await postPorting(app, { ...VALID_PAYLOAD, idNumber: '' });
    expect(res.status).toBe(422);
    const body = res.body as ValidationErrorResponse;
    const err = body.errors.find((e: FieldError) => e.field === 'idNumber');
    expect(err).toBeDefined();
  });

  it('does NOT return 422 when only the optional portingReference field is omitted', async () => {
    const payload = { ...VALID_PAYLOAD };
    const res = await postPorting(app, payload);
    expect(res.status).not.toBe(422);
  });
});

// ---------------------------------------------------------------------------
// AC-3  Unsupported market — 403 with clear message
// ---------------------------------------------------------------------------

describe('POST /api/onboarding/porting — market does not support porting', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await postPorting(app, UNSUPPORTED_MARKET_PAYLOAD);
  });

  it('returns HTTP 403', () => {
    expect(result.status).toBe(403);
  });

  it('response body contains an errorCode', () => {
    const body = result.body as ForbiddenResponse;
    expect(typeof body.errorCode).toBe('string');
    expect(body.errorCode.length).toBeGreaterThan(0);
  });

  it('response body contains a human-readable message', () => {
    const body = result.body as ForbiddenResponse;
    expect(typeof body.message).toBe('string');
    expect(body.message.length).toBeGreaterThan(0);
  });

  it('403 message text conveys that porting is not supported in the market', () => {
    const body = result.body as ForbiddenResponse;
    const lc = body.message.toLowerCase();
    const mentionsPortingOrMarket =
      lc.includes('porting') || lc.includes('market') || lc.includes('not supported');
    expect(mentionsPortingOrMarket).toBe(true);
  });

  it('valid payload with supported market does NOT return 403', async () => {
    const res = await postPorting(app, VALID_PAYLOAD);
    expect(res.status).not.toBe(403);
  });
});
