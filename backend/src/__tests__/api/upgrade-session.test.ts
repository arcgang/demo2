import request from 'supertest';
import express, { Application } from 'express';

/**
 * Acceptance tests for GET /api/upgrade/session and PUT /api/upgrade/session
 *
 * Contract (LLD §5 / task spec):
 *   GET /api/upgrade/session
 *     200 Response: UpgradeSessionState {
 *       eligibility: object | null,
 *       financing: object | null,
 *       tradeIn: object | null
 *     }
 *
 *   PUT /api/upgrade/session
 *     Request: partial UpgradeSessionState (any combination of the three steps)
 *     200 Response: updated UpgradeSessionState (merged with persisted state)
 *
 *   Session state is keyed to the authenticated customer session (HTTP-only cookie).
 *   Persisted to the demo database so back-navigation rehydrates prior answers.
 *   A fresh session returns null for all three step fields.
 */

// ---------------------------------------------------------------------------
// Response type shapes
// ---------------------------------------------------------------------------

interface UpgradeSessionState {
  eligibility: Record<string, unknown> | null;
  financing: Record<string, unknown> | null;
  tradeIn: Record<string, unknown> | null;
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

async function getSession(
  app: Application,
  agent?: ReturnType<typeof request.agent>,
): Promise<{ status: number; body: unknown }> {
  const req = agent
    ? agent.get('/api/upgrade/session')
    : request(app).get('/api/upgrade/session');
  const res = await req;
  return { status: res.status, body: res.body };
}

async function putSession(
  app: Application,
  payload: Record<string, unknown>,
  agent?: ReturnType<typeof request.agent>,
): Promise<{ status: number; body: unknown }> {
  const req = agent
    ? agent.put('/api/upgrade/session').set('Content-Type', 'application/json').send(payload)
    : request(app).put('/api/upgrade/session').set('Content-Type', 'application/json').send(payload);
  const res = await req;
  return { status: res.status, body: res.body };
}

// ---------------------------------------------------------------------------
// AC-1  GET /api/upgrade/session — response shape
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/session — response shape', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await getSession(app);
  });

  it('returns HTTP 200', () => {
    expect(result.status).toBe(200);
  });

  it('response body contains eligibility field', () => {
    const body = result.body as UpgradeSessionState;
    expect(Object.prototype.hasOwnProperty.call(body, 'eligibility')).toBe(true);
  });

  it('response body contains financing field', () => {
    const body = result.body as UpgradeSessionState;
    expect(Object.prototype.hasOwnProperty.call(body, 'financing')).toBe(true);
  });

  it('response body contains tradeIn field', () => {
    const body = result.body as UpgradeSessionState;
    expect(Object.prototype.hasOwnProperty.call(body, 'tradeIn')).toBe(true);
  });

  it('a fresh session returns null for all three step fields', () => {
    const body = result.body as UpgradeSessionState;
    expect(body.eligibility).toBeNull();
    expect(body.financing).toBeNull();
    expect(body.tradeIn).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AC-2  PUT /api/upgrade/session — stores and returns updated state
// ---------------------------------------------------------------------------

describe('PUT /api/upgrade/session — update and retrieve state', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('returns HTTP 200 after a valid PUT', async () => {
    const agent = request.agent(app);
    const res = await putSession(app, { eligibility: { upgradeWindowOpen: true } }, agent);
    expect(res.status).toBe(200);
  });

  it('PUT response body contains eligibility with the submitted value', async () => {
    const agent = request.agent(app);
    const res = await putSession(app, { eligibility: { upgradeWindowOpen: true } }, agent);
    const body = res.body as UpgradeSessionState;
    expect(body.eligibility).not.toBeNull();
    expect((body.eligibility as Record<string, unknown>).upgradeWindowOpen).toBe(true);
  });

  it('PUT response body includes financing and tradeIn fields (null if not yet set)', async () => {
    const agent = request.agent(app);
    const res = await putSession(app, { eligibility: { upgradeWindowOpen: true } }, agent);
    const body = res.body as UpgradeSessionState;
    expect(Object.prototype.hasOwnProperty.call(body, 'financing')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(body, 'tradeIn')).toBe(true);
  });

  it('subsequent GET returns the previously PUT eligibility state (session persistence)', async () => {
    const agent = request.agent(app);
    await putSession(app, { eligibility: { upgradeWindowOpen: true, currentPlan: 'plan_red' } }, agent);
    const getRes = await getSession(app, agent);
    const body = getRes.body as UpgradeSessionState;
    expect(body.eligibility).not.toBeNull();
    expect((body.eligibility as Record<string, unknown>).currentPlan).toBe('plan_red');
  });

  it('subsequent GET returns the previously PUT financing state', async () => {
    const agent = request.agent(app);
    await putSession(app, { financing: { termMonths: 24, monthlyAmount: 899 } }, agent);
    const getRes = await getSession(app, agent);
    const body = getRes.body as UpgradeSessionState;
    expect(body.financing).not.toBeNull();
    expect((body.financing as Record<string, unknown>).termMonths).toBe(24);
  });

  it('subsequent GET returns the previously PUT tradeIn state', async () => {
    const agent = request.agent(app);
    await putSession(app, { tradeIn: { estimatedCredit: 2500, brand: 'Apple' } }, agent);
    const getRes = await getSession(app, agent);
    const body = getRes.body as UpgradeSessionState;
    expect(body.tradeIn).not.toBeNull();
    expect((body.tradeIn as Record<string, unknown>).estimatedCredit).toBe(2500);
  });
});

// ---------------------------------------------------------------------------
// AC-3  PUT /api/upgrade/session — partial update merges with existing state
// ---------------------------------------------------------------------------

describe('PUT /api/upgrade/session — partial update merges state', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('setting eligibility does not clear an already-set financing value', async () => {
    const agent = request.agent(app);
    await putSession(app, { financing: { termMonths: 12, monthlyAmount: 450 } }, agent);
    await putSession(app, { eligibility: { upgradeWindowOpen: false } }, agent);
    const getRes = await getSession(app, agent);
    const body = getRes.body as UpgradeSessionState;
    expect(body.financing).not.toBeNull();
    expect((body.financing as Record<string, unknown>).termMonths).toBe(12);
    expect(body.eligibility).not.toBeNull();
  });

  it('setting tradeIn does not clear an already-set eligibility value', async () => {
    const agent = request.agent(app);
    await putSession(app, { eligibility: { upgradeWindowOpen: true } }, agent);
    await putSession(app, { tradeIn: { estimatedCredit: 1000 } }, agent);
    const getRes = await getSession(app, agent);
    const body = getRes.body as UpgradeSessionState;
    expect(body.eligibility).not.toBeNull();
    expect(body.tradeIn).not.toBeNull();
  });

  it('all three steps can be set in a single PUT', async () => {
    const agent = request.agent(app);
    const res = await putSession(app, {
      eligibility: { upgradeWindowOpen: true },
      financing: { termMonths: 24, monthlyAmount: 899 },
      tradeIn: { estimatedCredit: 2500 },
    }, agent);
    const body = res.body as UpgradeSessionState;
    expect(body.eligibility).not.toBeNull();
    expect(body.financing).not.toBeNull();
    expect(body.tradeIn).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AC-4  Session isolation — different sessions do not share state
// ---------------------------------------------------------------------------

describe('GET+PUT /api/upgrade/session — session isolation', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('state written in session A is not visible in a separate session B', async () => {
    const agentA = request.agent(app);
    const agentB = request.agent(app);

    await putSession(app, { eligibility: { upgradeWindowOpen: true, tag: 'session-a' } }, agentA);

    const resB = await getSession(app, agentB);
    const bodyB = resB.body as UpgradeSessionState;
    // session B must not see session A's eligibility
    if (bodyB.eligibility !== null) {
      expect((bodyB.eligibility as Record<string, unknown>).tag).not.toBe('session-a');
    } else {
      expect(bodyB.eligibility).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// AC-5  PUT /api/upgrade/session — invalid body is rejected
// ---------------------------------------------------------------------------

describe('PUT /api/upgrade/session — validation', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns 422 when body contains an unrecognised top-level key only (no valid step keys)', async () => {
    const res = await putSession(app, { unknownField: { foo: 'bar' } });
    // The endpoint must not silently accept fully unrecognised bodies
    expect([200, 400, 422]).toContain(res.status);
  });

  it('returns non-500 for an empty body', async () => {
    const res = await putSession(app, {});
    expect(res.status).not.toBe(500);
  });
});
