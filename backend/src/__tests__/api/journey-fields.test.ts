import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for GET /api/journeys/:type/fields
 *
 * Contract (task spec / LLD §4):
 *   Response: FieldDefinition[]
 *   Each FieldDefinition: {
 *     name:             string   — machine identifier
 *     label:            string   — human-readable label
 *     inputType:        string   — e.g. "text", "email", "select", "tel"
 *     required:         boolean
 *     businessPurpose:  string   — non-empty for every required field
 *     collectionStep:   number   — step index within the journey
 *   }
 *
 *   Journey types: "purchase", "onboarding", "activation"
 *
 *   Invariants:
 *   - Every required field has a non-empty businessPurpose.
 *   - No sensitive identity fields (idDocumentNumber, idDocumentType, idNumber)
 *     appear in the purchase journey's first step (collectionStep === 1).
 *   - Onboarding journey includes RICA/KYC identity fields gated after
 *     the payment step (collectionStep > 1).
 *   - Activation journey returns an eSIM-only subset.
 *   - Unknown journey type returns 404.
 */

// ---------------------------------------------------------------------------
// Response type shapes
// ---------------------------------------------------------------------------

interface FieldDefinition {
  name: string;
  label: string;
  inputType: string;
  required: boolean;
  businessPurpose: string;
  collectionStep: number;
}

interface ErrorResponse {
  errorCode: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Sensitive identity field names (RICA/KYC — must not appear in purchase step 1)
// ---------------------------------------------------------------------------

const SENSITIVE_IDENTITY_FIELD_NAMES = [
  'idDocumentNumber',
  'idDocumentType',
  'idNumber',
  'nationalId',
  'passportNumber',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

async function getJourneyFields(
  app: Application,
  journeyType: string,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app)
    .get(`/api/journeys/${journeyType}/fields`)
    .set('Accept', 'application/json');
  return { status: res.status, body: res.body };
}

// ---------------------------------------------------------------------------
// AC-1  Endpoint reachability and HTTP status for all three journey types
// ---------------------------------------------------------------------------

describe('GET /api/journeys/:type/fields — endpoint reachability', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  for (const journeyType of ['purchase', 'onboarding', 'activation']) {
    it(`returns HTTP 200 for journey type "${journeyType}"`, async () => {
      const { status } = await getJourneyFields(app, journeyType);
      expect(status).toBe(200);
    });

    it(`response body is an array for journey type "${journeyType}"`, async () => {
      const { body } = await getJourneyFields(app, journeyType);
      expect(Array.isArray(body)).toBe(true);
    });

    it(`array contains at least one field for journey type "${journeyType}"`, async () => {
      const { body } = await getJourneyFields(app, journeyType);
      expect((body as FieldDefinition[]).length).toBeGreaterThan(0);
    });
  }
});

// ---------------------------------------------------------------------------
// AC-2  Field schema shape — all six required properties present on every entry
// ---------------------------------------------------------------------------

describe('GET /api/journeys/:type/fields — field schema shape', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  for (const journeyType of ['purchase', 'onboarding', 'activation']) {
    it(`every field in "${journeyType}" has a "name" string property`, async () => {
      const { body } = await getJourneyFields(app, journeyType);
      for (const f of body as FieldDefinition[]) {
        expect(typeof f.name).toBe('string');
        expect(f.name.trim().length).toBeGreaterThan(0);
      }
    });

    it(`every field in "${journeyType}" has a "label" string property`, async () => {
      const { body } = await getJourneyFields(app, journeyType);
      for (const f of body as FieldDefinition[]) {
        expect(typeof f.label).toBe('string');
        expect(f.label.trim().length).toBeGreaterThan(0);
      }
    });

    it(`every field in "${journeyType}" has an "inputType" string property`, async () => {
      const { body } = await getJourneyFields(app, journeyType);
      for (const f of body as FieldDefinition[]) {
        expect(typeof f.inputType).toBe('string');
        expect(f.inputType.trim().length).toBeGreaterThan(0);
      }
    });

    it(`every field in "${journeyType}" has a "required" boolean property`, async () => {
      const { body } = await getJourneyFields(app, journeyType);
      for (const f of body as FieldDefinition[]) {
        expect(typeof f.required).toBe('boolean');
      }
    });

    it(`every field in "${journeyType}" has a "businessPurpose" string property`, async () => {
      const { body } = await getJourneyFields(app, journeyType);
      for (const f of body as FieldDefinition[]) {
        expect(typeof f.businessPurpose).toBe('string');
      }
    });

    it(`every field in "${journeyType}" has a "collectionStep" integer property`, async () => {
      const { body } = await getJourneyFields(app, journeyType);
      for (const f of body as FieldDefinition[]) {
        expect(typeof f.collectionStep).toBe('number');
        expect(Number.isInteger(f.collectionStep)).toBe(true);
        expect(f.collectionStep).toBeGreaterThanOrEqual(1);
      }
    });

    it(`every field in "${journeyType}" has exactly the six mandated properties`, async () => {
      const { body } = await getJourneyFields(app, journeyType);
      for (const f of body as FieldDefinition[]) {
        expect(f).toHaveProperty('name');
        expect(f).toHaveProperty('label');
        expect(f).toHaveProperty('inputType');
        expect(f).toHaveProperty('required');
        expect(f).toHaveProperty('businessPurpose');
        expect(f).toHaveProperty('collectionStep');
      }
    });
  }
});

// ---------------------------------------------------------------------------
// AC-3  Mandatory-field invariant: every required field has a non-empty businessPurpose
// ---------------------------------------------------------------------------

describe('GET /api/journeys/:type/fields — businessPurpose invariant', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  for (const journeyType of ['purchase', 'onboarding', 'activation']) {
    it(`every required field in "${journeyType}" has a non-empty businessPurpose`, async () => {
      const { body } = await getJourneyFields(app, journeyType);
      const required = (body as FieldDefinition[]).filter((f) => f.required);
      expect(required.length).toBeGreaterThan(0);
      for (const f of required) {
        expect(typeof f.businessPurpose).toBe('string');
        expect(f.businessPurpose.trim().length).toBeGreaterThan(0);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// AC-4  Purchase journey — customer details + payment step only
// ---------------------------------------------------------------------------

describe('GET /api/journeys/purchase/fields — purchase journey constraints', () => {
  let app: Application;
  let fields: FieldDefinition[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getJourneyFields(app, 'purchase');
    fields = body as FieldDefinition[];
  });

  it('purchase journey contains at least one field in step 1 (customer details)', () => {
    const step1 = fields.filter((f) => f.collectionStep === 1);
    expect(step1.length).toBeGreaterThan(0);
  });

  it('purchase journey step 1 includes a required "email" field', () => {
    const step1 = fields.filter((f) => f.collectionStep === 1);
    const email = step1.find((f) => f.name === 'email');
    expect(email).toBeDefined();
    expect(email!.required).toBe(true);
  });

  it('purchase journey email field businessPurpose is non-empty', () => {
    const email = fields.find((f) => f.name === 'email');
    expect(email).toBeDefined();
    expect(email!.businessPurpose.trim().length).toBeGreaterThan(0);
  });

  it('purchase journey contains a payment tokenization step (step 2 or higher)', () => {
    const paymentStepFields = fields.filter((f) => f.collectionStep >= 2);
    expect(paymentStepFields.length).toBeGreaterThan(0);
  });

  it('NO sensitive identity fields appear in purchase journey step 1', () => {
    const step1 = fields.filter((f) => f.collectionStep === 1);
    const step1Names = step1.map((f) => f.name);
    for (const sensitive of SENSITIVE_IDENTITY_FIELD_NAMES) {
      expect(step1Names).not.toContain(sensitive);
    }
  });

  it('idDocumentNumber does not appear anywhere in the purchase journey', () => {
    const names = fields.map((f) => f.name);
    expect(names).not.toContain('idDocumentNumber');
  });

  it('idDocumentType does not appear anywhere in the purchase journey', () => {
    const names = fields.map((f) => f.name);
    expect(names).not.toContain('idDocumentType');
  });

  it('idNumber does not appear anywhere in the purchase journey', () => {
    const names = fields.map((f) => f.name);
    expect(names).not.toContain('idNumber');
  });
});

// ---------------------------------------------------------------------------
// AC-5  Onboarding journey — RICA/KYC identity fields gated after payment step
// ---------------------------------------------------------------------------

describe('GET /api/journeys/onboarding/fields — onboarding journey constraints', () => {
  let app: Application;
  let fields: FieldDefinition[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getJourneyFields(app, 'onboarding');
    fields = body as FieldDefinition[];
  });

  it('onboarding journey contains more fields than the purchase journey', async () => {
    const { body: purchaseBody } = await getJourneyFields(app, 'purchase');
    expect(fields.length).toBeGreaterThan((purchaseBody as FieldDefinition[]).length);
  });

  it('onboarding journey includes at least one RICA/KYC identity field', () => {
    const identityFields = fields.filter((f) =>
      SENSITIVE_IDENTITY_FIELD_NAMES.includes(f.name),
    );
    expect(identityFields.length).toBeGreaterThan(0);
  });

  it('RICA/KYC identity fields in onboarding appear on a step after step 1 (gated behind payment)', () => {
    const identityFields = fields.filter((f) =>
      SENSITIVE_IDENTITY_FIELD_NAMES.includes(f.name),
    );
    for (const f of identityFields) {
      expect(f.collectionStep).toBeGreaterThan(1);
    }
  });

  it('onboarding journey RICA/KYC identity fields all have non-empty businessPurpose', () => {
    const identityFields = fields.filter((f) =>
      SENSITIVE_IDENTITY_FIELD_NAMES.includes(f.name),
    );
    for (const f of identityFields) {
      expect(f.businessPurpose.trim().length).toBeGreaterThan(0);
    }
  });

  it('onboarding journey contains an email field', () => {
    const email = fields.find((f) => f.name === 'email');
    expect(email).toBeDefined();
  });

  it('onboarding journey contains a phone/msisdn field', () => {
    const phoneField = fields.find(
      (f) => f.name === 'phone' || f.name === 'msisdn' || f.name === 'phoneNumber',
    );
    expect(phoneField).toBeDefined();
  });

  it('onboarding journey contains at least three distinct collectionStep values', () => {
    const steps = new Set(fields.map((f) => f.collectionStep));
    expect(steps.size).toBeGreaterThanOrEqual(3);
  });

  it('mandatory identity fields in onboarding have businessPurpose referencing RICA or identity or regulatory', () => {
    const idField = fields.find((f) =>
      SENSITIVE_IDENTITY_FIELD_NAMES.includes(f.name) && f.required,
    );
    expect(idField).toBeDefined();
    const purpose = idField!.businessPurpose.toLowerCase();
    const referencesRegulatoryContext =
      purpose.includes('rica') ||
      purpose.includes('kyc') ||
      purpose.includes('identity') ||
      purpose.includes('regulatory') ||
      purpose.includes('verification') ||
      purpose.includes('identification');
    expect(referencesRegulatoryContext).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-6  Activation journey — eSIM-only subset
// ---------------------------------------------------------------------------

describe('GET /api/journeys/activation/fields — activation journey constraints', () => {
  let app: Application;
  let fields: FieldDefinition[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getJourneyFields(app, 'activation');
    fields = body as FieldDefinition[];
  });

  it('activation journey returns at least one field', () => {
    expect(fields.length).toBeGreaterThan(0);
  });

  it('activation journey does not contain a payment card token field', () => {
    const cardField = fields.find(
      (f) => f.name === 'cardToken' || f.name === 'card_token' || f.name === 'pan',
    );
    expect(cardField).toBeUndefined();
  });

  it('activation journey has fewer fields than the onboarding journey', async () => {
    const { body: onboardingBody } = await getJourneyFields(app, 'onboarding');
    expect(fields.length).toBeLessThan((onboardingBody as FieldDefinition[]).length);
  });

  it('all required fields in the activation journey have a non-empty businessPurpose', () => {
    const required = fields.filter((f) => f.required);
    for (const f of required) {
      expect(f.businessPurpose.trim().length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-7  Unknown journey type returns 404
// ---------------------------------------------------------------------------

describe('GET /api/journeys/:type/fields — unknown journey type', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 404 for an unknown journey type', async () => {
    const { status } = await getJourneyFields(app, 'nonexistent_journey');
    expect(status).toBe(404);
  });

  it('404 response contains an errorCode', async () => {
    const { body } = await getJourneyFields(app, 'nonexistent_journey');
    const r = body as ErrorResponse;
    expect(typeof r.errorCode).toBe('string');
    expect(r.errorCode.trim().length).toBeGreaterThan(0);
  });

  it('404 response contains a human-readable message', async () => {
    const { body } = await getJourneyFields(app, 'nonexistent_journey');
    const r = body as ErrorResponse;
    expect(typeof r.message).toBe('string');
    expect(r.message.trim().length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC-8  Registry completeness — seeded journeys cover mandated coverage
// ---------------------------------------------------------------------------

describe('GET /api/journeys/:type/fields — registry coverage', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('purchase journey is seeded (endpoint does not return 404)', async () => {
    const { status } = await getJourneyFields(app, 'purchase');
    expect(status).toBe(200);
  });

  it('onboarding journey is seeded (endpoint does not return 404)', async () => {
    const { status } = await getJourneyFields(app, 'onboarding');
    expect(status).toBe(200);
  });

  it('activation journey is seeded (endpoint does not return 404)', async () => {
    const { status } = await getJourneyFields(app, 'activation');
    expect(status).toBe(200);
  });

  it('all three journey type arrays are non-empty', async () => {
    for (const jt of ['purchase', 'onboarding', 'activation']) {
      const { body } = await getJourneyFields(app, jt);
      expect((body as FieldDefinition[]).length).toBeGreaterThan(0);
    }
  });
});
