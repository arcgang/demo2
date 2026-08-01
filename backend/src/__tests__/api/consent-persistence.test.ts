import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for POST /api/consent and GET /api/consent
 *
 * Contract (LLD §5, §7.2, §7.3 — consent_records table + ConsentAuditModule):
 *
 *   consent_records columns (as mandated by the task spec):
 *     id                 UUID PRIMARY KEY
 *     user_id            VARCHAR nullable (guest allowed)
 *     session_id         VARCHAR NOT NULL
 *     consent_type       enum: 'terms_and_privacy' | 'marketing' | 'personalization'
 *     granted            BOOLEAN NOT NULL
 *     purpose_description TEXT
 *     ip_address         VARCHAR
 *     user_agent         VARCHAR
 *     created_at         TIMESTAMPTZ NOT NULL — SERVER-GENERATED, never client-supplied
 *
 *   audit_events columns:
 *     id           UUID PRIMARY KEY
 *     event_type   VARCHAR NOT NULL
 *     entity_id    VARCHAR
 *     entity_type  VARCHAR
 *     actor_id     VARCHAR
 *     payload      JSONB
 *     created_at   TIMESTAMPTZ NOT NULL
 *
 *   POST /api/consent
 *     201  valid input → persisted consent_record row,
 *          returns { id, consentType, granted, createdAt }
 *     201  userId is optional; guest sessions (no userId) are accepted
 *     400  missing required fields → error response
 *     400  invalid consentType value → error response
 *     —    created_at is server-generated; a client-supplied timestamp is IGNORED
 *
 *   GET /api/consent?userId=<id>
 *     200  returns array of consent records for the given userId
 *     200  empty array when no records exist for the userId
 *     400  missing userId query parameter → error response
 */

// ─── response shapes ──────────────────────────────────────────────────────────

interface ConsentResponse {
  id: string;
  consentType: string;
  granted: boolean;
  createdAt: string;
}

interface ConsentListItem {
  id: string;
  consentType: string;
  granted: boolean;
  createdAt: string;
  userId?: string;
  sessionId?: string;
}

interface ErrorResponse {
  errorCode?: string;
  message?: string;
  errors?: unknown[];
}

// ─── valid consent types (from task spec) ─────────────────────────────────────

const VALID_CONSENT_TYPES = ['terms_and_privacy', 'marketing', 'personalization'] as const;
type ConsentType = typeof VALID_CONSENT_TYPES[number];

// ─── helpers ──────────────────────────────────────────────────────────────────

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app') as { createApp: () => Application };
  return createApp();
}

function isIso8601(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return !Number.isNaN(new Date(value).getTime());
}

function isUuid(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function postConsent(
  app: Application,
  body: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app).post('/api/consent').send(body);
  return { status: res.status, body: res.body };
}

async function getConsent(
  app: Application,
  query: Record<string, string>,
): Promise<{ status: number; body: unknown }> {
  const qs = new URLSearchParams(query).toString();
  const res = await request(app).get(`/api/consent?${qs}`);
  return { status: res.status, body: res.body };
}

// ─── fixtures ─────────────────────────────────────────────────────────────────

const TERMS_PAYLOAD = {
  consentType: 'terms_and_privacy' as ConsentType,
  granted: true,
  purposeDescription: 'User accepted terms and privacy policy at checkout',
  sessionId: 'sess-consent-001',
};

const MARKETING_PAYLOAD = {
  consentType: 'marketing' as ConsentType,
  granted: false,
  purposeDescription: 'User declined marketing communications',
  sessionId: 'sess-consent-002',
  userId: 'user-001',
};

const PERSONALIZATION_PAYLOAD = {
  consentType: 'personalization' as ConsentType,
  granted: true,
  purposeDescription: 'User opted into personalized recommendations',
  sessionId: 'sess-consent-003',
  userId: 'user-002',
};

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  POST /api/consent — 201 response shape
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/consent — AC-1 201 response shape', () => {
  let app: Application;

  beforeAll(() => {
    app = getApp();
  });

  it('returns HTTP 201 for a valid terms_and_privacy consent payload', async () => {
    const { status } = await postConsent(app, TERMS_PAYLOAD);
    expect(status).toBe(201);
  });

  it('returns HTTP 201 for a valid marketing consent payload', async () => {
    const { status } = await postConsent(app, MARKETING_PAYLOAD);
    expect(status).toBe(201);
  });

  it('returns HTTP 201 for a valid personalization consent payload', async () => {
    const { status } = await postConsent(app, PERSONALIZATION_PAYLOAD);
    expect(status).toBe(201);
  });

  it('response body contains id as a UUID', async () => {
    const { body } = await postConsent(app, TERMS_PAYLOAD);
    const res = body as ConsentResponse;
    expect(isUuid(res.id)).toBe(true);
  });

  it('response body contains consentType matching the submitted value', async () => {
    const { body } = await postConsent(app, TERMS_PAYLOAD);
    const res = body as ConsentResponse;
    expect(res.consentType).toBe('terms_and_privacy');
  });

  it('response body contains granted matching the submitted boolean', async () => {
    const { body } = await postConsent(app, TERMS_PAYLOAD);
    const res = body as ConsentResponse;
    expect(res.granted).toBe(true);
  });

  it('response body contains createdAt as an ISO-8601 timestamp', async () => {
    const { body } = await postConsent(app, TERMS_PAYLOAD);
    const res = body as ConsentResponse;
    expect(isIso8601(res.createdAt)).toBe(true);
  });

  it('granted=false is persisted and reflected in response', async () => {
    const { body } = await postConsent(app, { ...MARKETING_PAYLOAD, sessionId: 'sess-granted-false' });
    const res = body as ConsentResponse;
    expect(res.granted).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  POST /api/consent — userId is optional (guest sessions)
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/consent — AC-2 guest sessions (no userId)', () => {
  let app: Application;

  beforeAll(() => {
    app = getApp();
  });

  it('returns 201 when userId is omitted (guest consent)', async () => {
    const guestPayload = {
      consentType: 'terms_and_privacy',
      granted: true,
      purposeDescription: 'Guest accepted terms',
      sessionId: 'sess-guest-001',
    };
    const { status } = await postConsent(app, guestPayload);
    expect(status).toBe(201);
  });

  it('returns 201 when userId is explicitly null', async () => {
    const nullUserPayload = {
      consentType: 'marketing',
      granted: false,
      purposeDescription: 'Guest declined marketing',
      sessionId: 'sess-guest-002',
      userId: null,
    };
    const { status } = await postConsent(app, nullUserPayload);
    expect(status).toBe(201);
  });

  it('all three consentType values are accepted without userId', async () => {
    for (const consentType of VALID_CONSENT_TYPES) {
      const { status } = await postConsent(app, {
        consentType,
        granted: true,
        purposeDescription: `Guest ${consentType} consent`,
        sessionId: `sess-guest-type-${consentType}`,
      });
      expect(status).toBe(201);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  POST /api/consent — created_at is server-generated
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/consent — AC-3 server-generated created_at', () => {
  let app: Application;

  beforeAll(() => {
    app = getApp();
  });

  it('createdAt in response is a recent server timestamp, not a client-supplied value', async () => {
    const before = Date.now();
    const clientTimestamp = '2000-01-01T00:00:00.000Z';

    const { body } = await postConsent(app, {
      ...TERMS_PAYLOAD,
      sessionId: 'sess-server-ts-001',
      createdAt: clientTimestamp,
    });

    const after = Date.now();
    const res = body as ConsentResponse;

    // The server must not echo back the client-supplied timestamp
    expect(res.createdAt).not.toBe(clientTimestamp);

    // The returned createdAt must fall within the request window
    const ts = new Date(res.createdAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after + 5000); // 5 s tolerance for slow test runners
  });

  it('createdAt is present and valid regardless of whether client omits it', async () => {
    const { body } = await postConsent(app, {
      consentType: 'personalization',
      granted: false,
      purposeDescription: 'Personalization declined',
      sessionId: 'sess-server-ts-002',
    });
    const res = body as ConsentResponse;
    expect(isIso8601(res.createdAt)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  POST /api/consent — validation errors
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/consent — AC-4 validation errors', () => {
  let app: Application;

  beforeAll(() => {
    app = getApp();
  });

  it('returns 400 when consentType is missing', async () => {
    const { status } = await postConsent(app, {
      granted: true,
      purposeDescription: 'Missing consentType',
      sessionId: 'sess-val-001',
    });
    expect(status).toBe(400);
  });

  it('returns 400 when granted is missing', async () => {
    const { status } = await postConsent(app, {
      consentType: 'terms_and_privacy',
      purposeDescription: 'Missing granted',
      sessionId: 'sess-val-002',
    });
    expect(status).toBe(400);
  });

  it('returns 400 when sessionId is missing', async () => {
    const { status } = await postConsent(app, {
      consentType: 'terms_and_privacy',
      granted: true,
      purposeDescription: 'Missing sessionId',
    });
    expect(status).toBe(400);
  });

  it('returns 400 when consentType is an invalid enum value', async () => {
    const { status } = await postConsent(app, {
      consentType: 'cookie_wall',
      granted: true,
      purposeDescription: 'Invalid consentType',
      sessionId: 'sess-val-003',
    });
    expect(status).toBe(400);
  });

  it('400 response includes an errorCode or errors field', async () => {
    const { body } = await postConsent(app, {
      granted: true,
      sessionId: 'sess-val-004',
    });
    const err = body as ErrorResponse;
    const hasError = typeof err.errorCode === 'string' || Array.isArray(err.errors) || typeof err.message === 'string';
    expect(hasError).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  GET /api/consent?userId= — audit retrieval
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/consent — AC-5 audit retrieval by userId', () => {
  let app: Application;

  beforeAll(() => {
    app = getApp();
  });

  it('returns HTTP 200 for a userId that has consent records', async () => {
    const userId = 'user-audit-get-001';

    // Seed a record for this user
    await postConsent(app, {
      consentType: 'marketing',
      granted: false,
      purposeDescription: 'Marketing opt-out',
      sessionId: 'sess-audit-get-001',
      userId,
    });

    const { status } = await getConsent(app, { userId });
    expect(status).toBe(200);
  });

  it('response is an array', async () => {
    const userId = 'user-audit-get-002';

    await postConsent(app, {
      consentType: 'personalization',
      granted: true,
      purposeDescription: 'Personalization opt-in',
      sessionId: 'sess-audit-get-002',
      userId,
    });

    const { body } = await getConsent(app, { userId });
    expect(Array.isArray(body)).toBe(true);
  });

  it('each record in the array includes id, consentType, granted, and createdAt', async () => {
    const userId = 'user-audit-get-003';

    await postConsent(app, {
      consentType: 'terms_and_privacy',
      granted: true,
      purposeDescription: 'Terms accepted',
      sessionId: 'sess-audit-get-003',
      userId,
    });

    const { body } = await getConsent(app, { userId });
    const records = body as ConsentListItem[];
    expect(records.length).toBeGreaterThan(0);

    for (const record of records) {
      expect(isUuid(record.id)).toBe(true);
      expect(typeof record.consentType).toBe('string');
      expect(typeof record.granted).toBe('boolean');
      expect(isIso8601(record.createdAt)).toBe(true);
    }
  });

  it('consentType in each record is one of the valid enum values', async () => {
    const userId = 'user-audit-enum-001';

    await postConsent(app, {
      consentType: 'marketing',
      granted: true,
      purposeDescription: 'Marketing opted in',
      sessionId: 'sess-audit-enum-001',
      userId,
    });

    const { body } = await getConsent(app, { userId });
    const records = body as ConsentListItem[];
    for (const record of records) {
      expect(VALID_CONSENT_TYPES as readonly string[]).toContain(record.consentType);
    }
  });

  it('returns only records belonging to the requested userId', async () => {
    const userId = 'user-isolation-001';
    const otherUserId = 'user-isolation-other';

    await postConsent(app, {
      consentType: 'marketing',
      granted: true,
      purposeDescription: 'Isolation test',
      sessionId: 'sess-isolation-001',
      userId,
    });
    await postConsent(app, {
      consentType: 'personalization',
      granted: false,
      purposeDescription: 'Other user consent',
      sessionId: 'sess-isolation-002',
      userId: otherUserId,
    });

    const { body } = await getConsent(app, { userId });
    const records = body as ConsentListItem[];
    for (const record of records) {
      // Each record must belong to the requested userId (if userId is returned)
      if (record.userId !== undefined) {
        expect(record.userId).toBe(userId);
      }
    }
  });

  it('returns 200 with an empty array when no records exist for the userId', async () => {
    const { status, body } = await getConsent(app, { userId: 'user-never-consented-xyz' });
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect((body as unknown[]).length).toBe(0);
  });

  it('returns 400 when userId query param is missing', async () => {
    const res = await request(app).get('/api/consent');
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6  consentType enum coverage — all three values are accepted
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/consent — AC-6 consentType enum coverage', () => {
  let app: Application;

  beforeAll(() => {
    app = getApp();
  });

  it.each(VALID_CONSENT_TYPES)(
    'consentType "%s" is accepted with HTTP 201',
    async (consentType) => {
      const { status } = await postConsent(app, {
        consentType,
        granted: true,
        purposeDescription: `Acceptance test for ${consentType}`,
        sessionId: `sess-enum-coverage-${consentType}`,
        userId: `user-enum-${consentType}`,
      });
      expect(status).toBe(201);
    },
  );

  it.each(VALID_CONSENT_TYPES)(
    'consentType "%s" is echoed back in the response',
    async (consentType) => {
      const { body } = await postConsent(app, {
        consentType,
        granted: false,
        purposeDescription: `Echo test for ${consentType}`,
        sessionId: `sess-enum-echo-${consentType}`,
      });
      const res = body as ConsentResponse;
      expect(res.consentType).toBe(consentType);
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-7  Persistence — every POST produces a retrievable record
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/consent — AC-7 record persistence', () => {
  let app: Application;

  beforeAll(() => {
    app = getApp();
  });

  it('a consent record posted for a userId is later retrievable via GET', async () => {
    const userId = 'user-persist-round-trip-001';

    const postRes = await postConsent(app, {
      consentType: 'personalization',
      granted: true,
      purposeDescription: 'Round-trip persistence test',
      sessionId: 'sess-persist-001',
      userId,
    });
    expect(postRes.status).toBe(201);

    const postedId = (postRes.body as ConsentResponse).id;

    const { body } = await getConsent(app, { userId });
    const records = body as ConsentListItem[];
    const found = records.find((r) => r.id === postedId);
    expect(found).toBeDefined();
  });

  it('multiple consents for the same userId are all returned', async () => {
    const userId = 'user-persist-multi-001';

    await postConsent(app, {
      consentType: 'terms_and_privacy',
      granted: true,
      purposeDescription: 'Terms consent',
      sessionId: 'sess-multi-001',
      userId,
    });
    await postConsent(app, {
      consentType: 'marketing',
      granted: false,
      purposeDescription: 'Marketing declined',
      sessionId: 'sess-multi-002',
      userId,
    });
    await postConsent(app, {
      consentType: 'personalization',
      granted: true,
      purposeDescription: 'Personalization accepted',
      sessionId: 'sess-multi-003',
      userId,
    });

    const { body } = await getConsent(app, { userId });
    const records = body as ConsentListItem[];
    expect(records.length).toBeGreaterThanOrEqual(3);
  });
});
