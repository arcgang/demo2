import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for:
 *   POST /api/onboarding/verification
 *   GET  /api/onboarding/verification/:orderId
 *
 * Contract (from LLD §7.2 / task acceptance criteria):
 *
 *   VerificationCase schema fields:
 *     id              string   — UUID primary key
 *     orderId         string   required
 *     customerId      string   required
 *     type            string   required  — "KYC" | "RICA"
 *     status          string   — "pending" | "verified" | "failed"
 *     submittedAt     string   — ISO-8601 timestamp set on creation
 *     resolvedAt      string   — ISO-8601 timestamp set when mock adapter resolves
 *     identityFields  object   — JSONB: firstName, lastName, idNumber, addressLine1, city
 *     auditRef        string   — non-empty reference string
 *
 *   POST /api/onboarding/verification
 *     201  well-formed input (idNumber NOT starting with '000') → status=verified
 *     201  idNumber starting with '000' → status=failed
 *     422  missing required field → field-level errors array
 *
 *   GET /api/onboarding/verification/:orderId
 *     200  returns the VerificationCase for the given orderId
 *     404  orderId not found
 */

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_PAYLOAD = {
  orderId: 'ord_1001',
  customerId: 'cust_001',
  type: 'KYC',
  identityFields: {
    firstName: 'Amina',
    lastName: 'Dlamini',
    idNumber: '9001015800088',
    addressLine1: '10 Palm Street',
    city: 'Johannesburg',
  },
};

const FAILING_ID_PAYLOAD = {
  orderId: 'ord_1002',
  customerId: 'cust_002',
  type: 'RICA',
  identityFields: {
    firstName: 'Test',
    lastName: 'User',
    idNumber: '0001015800088',
    addressLine1: '1 Test Street',
    city: 'Cape Town',
  },
};

// ---------------------------------------------------------------------------
// Response type shapes
// ---------------------------------------------------------------------------

interface IdentityFields {
  firstName: string;
  lastName: string;
  idNumber: string;
  addressLine1: string;
  city: string;
}

interface VerificationCaseResponse {
  id: string;
  orderId: string;
  customerId: string;
  type: string;
  status: string;
  submittedAt: string;
  resolvedAt: string | null;
  identityFields: IdentityFields;
  auditRef: string;
}

interface FieldError {
  field: string;
  message: string;
}

interface ValidationErrorResponse {
  errorCode: string;
  errors: FieldError[];
}

interface NotFoundResponse {
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

async function postVerification(
  app: Application,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app)
    .post('/api/onboarding/verification')
    .set('Content-Type', 'application/json')
    .send(payload);
  return { status: res.status, body: res.body };
}

async function getVerification(
  app: Application,
  orderId: string,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app)
    .get(`/api/onboarding/verification/${orderId}`)
    .set('Accept', 'application/json');
  return { status: res.status, body: res.body };
}

function isIso8601(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const ts = new Date(value).getTime();
  return !isNaN(ts);
}

// ---------------------------------------------------------------------------
// AC-1  POST with valid well-formed input → 201, status=verified
// ---------------------------------------------------------------------------

describe('POST /api/onboarding/verification — valid well-formed input', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await postVerification(app, VALID_PAYLOAD);
  });

  it('returns HTTP 201', () => {
    expect(result.status).toBe(201);
  });

  it('response body status is "verified"', () => {
    const body = result.body as VerificationCaseResponse;
    expect(body.status).toBe('verified');
  });

  it('response body contains a non-empty id string', () => {
    const body = result.body as VerificationCaseResponse;
    expect(typeof body.id).toBe('string');
    expect(body.id.length).toBeGreaterThan(0);
  });

  it('response body orderId matches submitted orderId', () => {
    const body = result.body as VerificationCaseResponse;
    expect(body.orderId).toBe(VALID_PAYLOAD.orderId);
  });

  it('response body customerId matches submitted customerId', () => {
    const body = result.body as VerificationCaseResponse;
    expect(body.customerId).toBe(VALID_PAYLOAD.customerId);
  });

  it('response body type matches submitted type', () => {
    const body = result.body as VerificationCaseResponse;
    expect(body.type).toBe(VALID_PAYLOAD.type);
  });

  it('response body submittedAt is a valid ISO-8601 timestamp', () => {
    const body = result.body as VerificationCaseResponse;
    expect(isIso8601(body.submittedAt)).toBe(true);
  });

  it('response body resolvedAt is a valid ISO-8601 timestamp (set by mock adapter)', () => {
    const body = result.body as VerificationCaseResponse;
    expect(isIso8601(body.resolvedAt)).toBe(true);
  });

  it('response body auditRef is a non-empty string', () => {
    const body = result.body as VerificationCaseResponse;
    expect(typeof body.auditRef).toBe('string');
    expect((body.auditRef as string).length).toBeGreaterThan(0);
  });

  it('response body identityFields reflects submitted identity data', () => {
    const body = result.body as VerificationCaseResponse;
    expect(body.identityFields).toBeDefined();
    expect(typeof body.identityFields).toBe('object');
    expect(body.identityFields.firstName).toBe(VALID_PAYLOAD.identityFields.firstName);
    expect(body.identityFields.lastName).toBe(VALID_PAYLOAD.identityFields.lastName);
    expect(body.identityFields.idNumber).toBe(VALID_PAYLOAD.identityFields.idNumber);
    expect(body.identityFields.addressLine1).toBe(VALID_PAYLOAD.identityFields.addressLine1);
    expect(body.identityFields.city).toBe(VALID_PAYLOAD.identityFields.city);
  });
});

// ---------------------------------------------------------------------------
// AC-2  POST with test-prefix SA ID (starts with '000') → 201, status=failed
// ---------------------------------------------------------------------------

describe('POST /api/onboarding/verification — test-prefix ID number', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await postVerification(app, FAILING_ID_PAYLOAD);
  });

  it('returns HTTP 201', () => {
    expect(result.status).toBe(201);
  });

  it('response body status is "failed" for test-prefix ID starting with "000"', () => {
    const body = result.body as VerificationCaseResponse;
    expect(body.status).toBe('failed');
  });

  it('response body contains a non-empty id string', () => {
    const body = result.body as VerificationCaseResponse;
    expect(typeof body.id).toBe('string');
    expect(body.id.length).toBeGreaterThan(0);
  });

  it('response body submittedAt is a valid ISO-8601 timestamp', () => {
    const body = result.body as VerificationCaseResponse;
    expect(isIso8601(body.submittedAt)).toBe(true);
  });

  it('response body resolvedAt is a valid ISO-8601 timestamp (mock adapter sets it on failure too)', () => {
    const body = result.body as VerificationCaseResponse;
    expect(isIso8601(body.resolvedAt)).toBe(true);
  });

  it('response body auditRef is a non-empty string', () => {
    const body = result.body as VerificationCaseResponse;
    expect(typeof body.auditRef).toBe('string');
    expect((body.auditRef as string).length).toBeGreaterThan(0);
  });

  it('valid idNumber (not starting with "000") does NOT return status=failed', async () => {
    const res = await postVerification(app, VALID_PAYLOAD);
    const body = res.body as VerificationCaseResponse;
    expect(body.status).not.toBe('failed');
  });
});

// ---------------------------------------------------------------------------
// AC-3  Timestamps and auditRef are populated on every persisted record
// ---------------------------------------------------------------------------

describe('POST /api/onboarding/verification — row metadata invariants', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('submittedAt is always set (verified case)', async () => {
    const res = await postVerification(app, VALID_PAYLOAD);
    const body = res.body as VerificationCaseResponse;
    expect(isIso8601(body.submittedAt)).toBe(true);
  });

  it('resolvedAt is always set (verified case)', async () => {
    const res = await postVerification(app, VALID_PAYLOAD);
    const body = res.body as VerificationCaseResponse;
    expect(isIso8601(body.resolvedAt)).toBe(true);
  });

  it('submittedAt is always set (failed case)', async () => {
    const res = await postVerification(app, FAILING_ID_PAYLOAD);
    const body = res.body as VerificationCaseResponse;
    expect(isIso8601(body.submittedAt)).toBe(true);
  });

  it('resolvedAt is always set (failed case)', async () => {
    const res = await postVerification(app, FAILING_ID_PAYLOAD);
    const body = res.body as VerificationCaseResponse;
    expect(isIso8601(body.resolvedAt)).toBe(true);
  });

  it('auditRef is always a non-empty string (verified case)', async () => {
    const res = await postVerification(app, VALID_PAYLOAD);
    const body = res.body as VerificationCaseResponse;
    expect(typeof body.auditRef).toBe('string');
    expect(body.auditRef.length).toBeGreaterThan(0);
  });

  it('auditRef is always a non-empty string (failed case)', async () => {
    const res = await postVerification(app, FAILING_ID_PAYLOAD);
    const body = res.body as VerificationCaseResponse;
    expect(typeof body.auditRef).toBe('string');
    expect(body.auditRef.length).toBeGreaterThan(0);
  });

  it('resolvedAt is not earlier than submittedAt', async () => {
    const res = await postVerification(app, VALID_PAYLOAD);
    const body = res.body as VerificationCaseResponse;
    const submitted = new Date(body.submittedAt).getTime();
    const resolved = new Date(body.resolvedAt as string).getTime();
    expect(resolved).toBeGreaterThanOrEqual(submitted);
  });
});

// ---------------------------------------------------------------------------
// AC-4  POST missing required fields → 422 with field-level errors
// ---------------------------------------------------------------------------

describe('POST /api/onboarding/verification — missing required top-level fields', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  const requiredTopLevel: Array<'orderId' | 'customerId' | 'type'> = [
    'orderId',
    'customerId',
    'type',
  ];

  for (const field of requiredTopLevel) {
    it(`returns 422 when "${field}" is omitted`, async () => {
      const payload = { ...VALID_PAYLOAD };
      delete (payload as Record<string, unknown>)[field];
      const res = await postVerification(app, payload);
      expect(res.status).toBe(422);
    });

    it(`422 response for missing "${field}" includes a field-level errors array`, async () => {
      const payload = { ...VALID_PAYLOAD };
      delete (payload as Record<string, unknown>)[field];
      const res = await postVerification(app, payload);
      const body = res.body as ValidationErrorResponse;
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors.length).toBeGreaterThan(0);
    });

    it(`error entry for missing "${field}" references the correct field name`, async () => {
      const payload = { ...VALID_PAYLOAD };
      delete (payload as Record<string, unknown>)[field];
      const res = await postVerification(app, payload);
      const body = res.body as ValidationErrorResponse;
      const match = body.errors.find((e: FieldError) => e.field === field);
      expect(match).toBeDefined();
    });
  }
});

describe('POST /api/onboarding/verification — missing required identityFields', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  const requiredIdentityFields: Array<keyof typeof VALID_PAYLOAD.identityFields> = [
    'firstName',
    'lastName',
    'idNumber',
    'addressLine1',
    'city',
  ];

  for (const field of requiredIdentityFields) {
    it(`returns 422 when identityFields.${field} is omitted`, async () => {
      const identityFields = { ...VALID_PAYLOAD.identityFields };
      delete (identityFields as Record<string, unknown>)[field];
      const res = await postVerification(app, { ...VALID_PAYLOAD, identityFields });
      expect(res.status).toBe(422);
    });

    it(`422 response for missing identityFields.${field} includes a non-empty errors array`, async () => {
      const identityFields = { ...VALID_PAYLOAD.identityFields };
      delete (identityFields as Record<string, unknown>)[field];
      const res = await postVerification(app, { ...VALID_PAYLOAD, identityFields });
      const body = res.body as ValidationErrorResponse;
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors.length).toBeGreaterThan(0);
    });
  }

  it('returns 422 when identityFields is absent entirely', async () => {
    const payload = { ...VALID_PAYLOAD };
    delete (payload as Record<string, unknown>)['identityFields'];
    const res = await postVerification(app, payload);
    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// AC-5  GET /api/onboarding/verification/:orderId returns the correct record
// ---------------------------------------------------------------------------

describe('GET /api/onboarding/verification/:orderId — found', () => {
  let app: Application;
  let postedBody: VerificationCaseResponse;

  beforeAll(async () => {
    app = getApp();
    const post = await postVerification(app, {
      ...VALID_PAYLOAD,
      orderId: 'ord_get_test_001',
    });
    postedBody = post.body as VerificationCaseResponse;
  });

  it('returns HTTP 200 for a known orderId', async () => {
    const { status } = await getVerification(app, 'ord_get_test_001');
    expect(status).toBe(200);
  });

  it('GET response orderId matches the path parameter', async () => {
    const { body } = await getVerification(app, 'ord_get_test_001');
    const r = body as VerificationCaseResponse;
    expect(r.orderId).toBe('ord_get_test_001');
  });

  it('GET response id matches the id returned by POST', async () => {
    const { body } = await getVerification(app, 'ord_get_test_001');
    const r = body as VerificationCaseResponse;
    expect(r.id).toBe(postedBody.id);
  });

  it('GET response status matches the status returned by POST', async () => {
    const { body } = await getVerification(app, 'ord_get_test_001');
    const r = body as VerificationCaseResponse;
    expect(r.status).toBe(postedBody.status);
  });

  it('GET response contains submittedAt as an ISO-8601 timestamp', async () => {
    const { body } = await getVerification(app, 'ord_get_test_001');
    const r = body as VerificationCaseResponse;
    expect(isIso8601(r.submittedAt)).toBe(true);
  });

  it('GET response contains resolvedAt as an ISO-8601 timestamp', async () => {
    const { body } = await getVerification(app, 'ord_get_test_001');
    const r = body as VerificationCaseResponse;
    expect(isIso8601(r.resolvedAt)).toBe(true);
  });

  it('GET response auditRef matches the auditRef returned by POST', async () => {
    const { body } = await getVerification(app, 'ord_get_test_001');
    const r = body as VerificationCaseResponse;
    expect(r.auditRef).toBe(postedBody.auditRef);
  });

  it('GET response identityFields are present', async () => {
    const { body } = await getVerification(app, 'ord_get_test_001');
    const r = body as VerificationCaseResponse;
    expect(r.identityFields).toBeDefined();
    expect(typeof r.identityFields).toBe('object');
  });
});

// ---------------------------------------------------------------------------
// AC-6  GET /api/onboarding/verification/:orderId — not found
// ---------------------------------------------------------------------------

describe('GET /api/onboarding/verification/:orderId — not found', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 404 for an unknown orderId', async () => {
    const { status } = await getVerification(app, 'ord_does_not_exist_xyz');
    expect(status).toBe(404);
  });

  it('404 response contains an errorCode', async () => {
    const { body } = await getVerification(app, 'ord_does_not_exist_xyz');
    const r = body as NotFoundResponse;
    expect(typeof r.errorCode).toBe('string');
    expect(r.errorCode.length).toBeGreaterThan(0);
  });

  it('404 response contains a human-readable message', async () => {
    const { body } = await getVerification(app, 'ord_does_not_exist_xyz');
    const r = body as NotFoundResponse;
    expect(typeof r.message).toBe('string');
    expect(r.message.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC-7  Mock adapter determinism — same ID prefix always yields same result
// ---------------------------------------------------------------------------

describe('POST /api/onboarding/verification — mock adapter determinism', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('idNumber starting with "000" consistently returns status=failed across multiple calls', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await postVerification(app, {
        ...FAILING_ID_PAYLOAD,
        orderId: `ord_fail_det_${i}`,
      });
      const body = res.body as VerificationCaseResponse;
      expect(body.status).toBe('failed');
    }
  });

  it('idNumber NOT starting with "000" consistently returns status=verified across multiple calls', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await postVerification(app, {
        ...VALID_PAYLOAD,
        orderId: `ord_pass_det_${i}`,
      });
      const body = res.body as VerificationCaseResponse;
      expect(body.status).toBe('verified');
    }
  });
});
