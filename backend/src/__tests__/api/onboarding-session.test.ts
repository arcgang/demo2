import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for POST /api/onboarding/session
 *
 * Contract (from LLD task spec):
 *   Accepts progressive customer data payloads (personal details, address,
 *   RICA fields) and persists VerificationCase state in PostgreSQL.
 *   Returns the current completion stage and the fields required for the
 *   next stage so the frontend can drive progressive disclosure.
 *
 *   Request shape (progressive — any subset of fields):
 *     {
 *       sessionId?: string,          // omitted on first call; returned in first response
 *       stage?: string,              // 'personal' | 'address' | 'rica'
 *       data: {
 *         firstName?: string,
 *         lastName?: string,
 *         idDocumentType?: string,
 *         idDocumentNumber?: string,
 *         addressLine1?: string,
 *         city?: string,
 *         postalCode?: string,
 *         country?: string,
 *         msisdn?: string,
 *         ownershipConfirmed?: boolean
 *       }
 *     }
 *
 *   Response shape:
 *     {
 *       sessionId: string,
 *       currentStage: string,
 *       completedStages: string[],
 *       nextStage: string | null,
 *       requiredFields: string[],
 *       verificationStatus: string
 *     }
 */

interface OnboardingRequest {
  sessionId?: string;
  stage?: string;
  data: Record<string, unknown>;
}

interface OnboardingResponse {
  sessionId: string;
  currentStage: string;
  completedStages: string[];
  nextStage: string | null;
  requiredFields: string[];
  verificationStatus: string;
}

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

async function postOnboarding(
  app: Application,
  payload: OnboardingRequest,
): Promise<{ status: number; body: OnboardingResponse }> {
  const res = await request(app)
    .post('/api/onboarding/session')
    .send(payload)
    .set('Content-Type', 'application/json');
  return { status: res.status, body: res.body as OnboardingResponse };
}

// ---------------------------------------------------------------------------
// AC-1  First POST — initiate a new onboarding session
// ---------------------------------------------------------------------------

describe('POST /api/onboarding/session — initiate session', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('returns HTTP 200 when personal data is submitted', async () => {
    const { status } = await postOnboarding(app, {
      stage: 'personal',
      data: {
        firstName: 'Amina',
        lastName: 'Dlamini',
        idDocumentType: 'NATIONAL_ID',
        idDocumentNumber: '9001015800088',
      },
    });
    expect(status).toBe(200);
  });

  it('response contains a sessionId string', async () => {
    const { body } = await postOnboarding(app, {
      stage: 'personal',
      data: { firstName: 'Amina', lastName: 'Dlamini' },
    });
    expect(typeof body.sessionId).toBe('string');
    expect(body.sessionId.length).toBeGreaterThan(0);
  });

  it('response contains currentStage as a non-empty string', async () => {
    const { body } = await postOnboarding(app, {
      stage: 'personal',
      data: { firstName: 'Amina', lastName: 'Dlamini' },
    });
    expect(typeof body.currentStage).toBe('string');
    expect(body.currentStage.length).toBeGreaterThan(0);
  });

  it('response contains completedStages as an array', async () => {
    const { body } = await postOnboarding(app, {
      stage: 'personal',
      data: { firstName: 'Amina', lastName: 'Dlamini' },
    });
    expect(Array.isArray(body.completedStages)).toBe(true);
  });

  it('response contains requiredFields as an array', async () => {
    const { body } = await postOnboarding(app, {
      stage: 'personal',
      data: { firstName: 'Amina', lastName: 'Dlamini' },
    });
    expect(Array.isArray(body.requiredFields)).toBe(true);
  });

  it('response contains verificationStatus as a non-empty string', async () => {
    const { body } = await postOnboarding(app, {
      stage: 'personal',
      data: { firstName: 'Amina', lastName: 'Dlamini' },
    });
    expect(typeof body.verificationStatus).toBe('string');
    expect(body.verificationStatus.length).toBeGreaterThan(0);
  });

  it('nextStage is either null or a string', async () => {
    const { body } = await postOnboarding(app, {
      stage: 'personal',
      data: { firstName: 'Amina', lastName: 'Dlamini' },
    });
    expect(body.nextStage === null || typeof body.nextStage === 'string').toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-2  requiredFields drives progressive disclosure (not full field set)
// ---------------------------------------------------------------------------

describe('POST /api/onboarding/session — progressive disclosure of requiredFields', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('requiredFields after personal stage does not include personal stage fields already submitted', async () => {
    const { body } = await postOnboarding(app, {
      stage: 'personal',
      data: {
        firstName: 'Amina',
        lastName: 'Dlamini',
        idDocumentType: 'NATIONAL_ID',
        idDocumentNumber: '9001015800088',
      },
    });
    // Fields from the submitted personal stage should not appear in the next-stage required list
    expect(body.requiredFields).not.toContain('firstName');
    expect(body.requiredFields).not.toContain('lastName');
  });

  it('requiredFields is a subset relevant to the next stage, not the complete field set', async () => {
    const { body } = await postOnboarding(app, {
      stage: 'personal',
      data: { firstName: 'Amina', lastName: 'Dlamini' },
    });
    // Rica fields (msisdn, ownershipConfirmed) must not appear when we are only at personal stage
    // — the frontend must not receive the full field list at once
    const allKnownFields = [
      'firstName', 'lastName', 'idDocumentType', 'idDocumentNumber',
      'addressLine1', 'city', 'postalCode', 'country',
      'msisdn', 'ownershipConfirmed',
    ];
    // requiredFields must be a proper subset, not the entire set of all fields
    expect(body.requiredFields.length).toBeLessThan(allKnownFields.length);
  });
});

// ---------------------------------------------------------------------------
// AC-3  State persists and advances across successive POST calls
// ---------------------------------------------------------------------------

describe('POST /api/onboarding/session — state advances across calls', () => {
  let app: Application;
  let sessionId: string;

  beforeAll(async () => {
    app = getApp();
    // First call: personal stage
    const { body } = await postOnboarding(app, {
      stage: 'personal',
      data: {
        firstName: 'Amina',
        lastName: 'Dlamini',
        idDocumentType: 'NATIONAL_ID',
        idDocumentNumber: '9001015800088',
      },
    });
    sessionId = body.sessionId;
  });

  it('second POST with same sessionId returns HTTP 200', async () => {
    const { status } = await postOnboarding(app, {
      sessionId,
      stage: 'address',
      data: {
        addressLine1: '10 Palm Street',
        city: 'Johannesburg',
        postalCode: '2000',
        country: 'ZA',
      },
    });
    expect(status).toBe(200);
  });

  it('second POST returns the same sessionId', async () => {
    const { body } = await postOnboarding(app, {
      sessionId,
      stage: 'address',
      data: {
        addressLine1: '10 Palm Street',
        city: 'Johannesburg',
        postalCode: '2000',
        country: 'ZA',
      },
    });
    expect(body.sessionId).toBe(sessionId);
  });

  it('completedStages after address POST includes the personal stage', async () => {
    const { body } = await postOnboarding(app, {
      sessionId,
      stage: 'address',
      data: {
        addressLine1: '10 Palm Street',
        city: 'Johannesburg',
        postalCode: '2000',
        country: 'ZA',
      },
    });
    expect(body.completedStages).toContain('personal');
  });

  it('currentStage advances from personal after address submission', async () => {
    const { body } = await postOnboarding(app, {
      sessionId,
      stage: 'address',
      data: {
        addressLine1: '10 Palm Street',
        city: 'Johannesburg',
        postalCode: '2000',
        country: 'ZA',
      },
    });
    expect(body.currentStage).not.toBe('personal');
  });

  it('third POST for rica stage further advances completedStages', async () => {
    // address stage first to get consistent state
    await postOnboarding(app, {
      sessionId,
      stage: 'address',
      data: {
        addressLine1: '10 Palm Street',
        city: 'Johannesburg',
        postalCode: '2000',
        country: 'ZA',
      },
    });
    const { body } = await postOnboarding(app, {
      sessionId,
      stage: 'rica',
      data: {
        msisdn: '27835550000',
        ownershipConfirmed: true,
      },
    });
    expect(body.completedStages).toContain('personal');
    expect(body.completedStages).toContain('address');
  });
});

// ---------------------------------------------------------------------------
// AC-4  Validation — missing required data returns 400
// ---------------------------------------------------------------------------

describe('POST /api/onboarding/session — validation', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 400 when request body has no data field', async () => {
    const res = await request(app)
      .post('/api/onboarding/session')
      .send({})
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });

  it('returns HTTP 400 when data field is not an object', async () => {
    const res = await request(app)
      .post('/api/onboarding/session')
      .send({ data: 'not-an-object' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// AC-5  verificationStatus is a known state
// ---------------------------------------------------------------------------

describe('POST /api/onboarding/session — verificationStatus values', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  const KNOWN_STATUSES = ['INCOMPLETE', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED'];

  it('verificationStatus is a known status value after initial personal stage', async () => {
    const { body } = await postOnboarding(app, {
      stage: 'personal',
      data: { firstName: 'Amina', lastName: 'Dlamini' },
    });
    expect(KNOWN_STATUSES).toContain(body.verificationStatus);
  });
});
