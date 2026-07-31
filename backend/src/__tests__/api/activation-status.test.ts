import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for GET /api/activation/:orderId
 *
 * Contract (from LLD task spec):
 *   Returns an ActivationStatus object whose milestones are explicitly typed
 *   with a phase field discriminating:
 *     'fulfilment' — order_placed, payment_confirmed, verification_complete, esim_issued
 *     'activation' — esim_activated
 *
 *   This enables the frontend to render the two phases separately.
 *
 *   Response shape:
 *     {
 *       orderId: string,
 *       activationState: string,
 *       milestones: Array<{
 *         id: string,
 *         phase: 'fulfilment' | 'activation',
 *         label: string,
 *         status: 'completed' | 'pending' | 'blocked',
 *         timestamp: string | null
 *       }>
 *     }
 */

type MilestonePhase = 'fulfilment' | 'activation';
type MilestoneStatus = 'completed' | 'pending' | 'blocked';

interface ActivationMilestone {
  id: string;
  phase: MilestonePhase;
  label: string;
  status: MilestoneStatus;
  timestamp: string | null;
}

interface ActivationStatusResponse {
  orderId: string;
  activationState: string;
  milestones: ActivationMilestone[];
}

const FULFILMENT_IDS = [
  'order_placed',
  'payment_confirmed',
  'verification_complete',
  'esim_issued',
] as const;

const ACTIVATION_IDS = ['esim_activated'] as const;

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

async function fetchActivation(
  app: Application,
  orderId: string,
): Promise<{ status: number; body: ActivationStatusResponse }> {
  const res = await request(app).get(`/api/activation/${orderId}`);
  return { status: res.status, body: res.body as ActivationStatusResponse };
}

// ---------------------------------------------------------------------------
// AC-1  HTTP contract and top-level shape
// ---------------------------------------------------------------------------

describe('GET /api/activation/:orderId — top-level response shape', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('returns HTTP 200 for a known orderId', async () => {
    const { status } = await fetchActivation(app, 'ord_001');
    expect(status).toBe(200);
  });

  it('response orderId matches the path parameter', async () => {
    const { body } = await fetchActivation(app, 'ord_abc');
    expect(body.orderId).toBe('ord_abc');
  });

  it('response has activationState as a non-empty string', async () => {
    const { body } = await fetchActivation(app, 'ord_001');
    expect(typeof body.activationState).toBe('string');
    expect(body.activationState.length).toBeGreaterThan(0);
  });

  it('response has a milestones array', async () => {
    const { body } = await fetchActivation(app, 'ord_001');
    expect(Array.isArray(body.milestones)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-2  Phase discriminator — 'fulfilment' | 'activation'
// ---------------------------------------------------------------------------

describe('GET /api/activation/:orderId — phase discriminator', () => {
  let app: Application;
  let milestones: ActivationMilestone[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await fetchActivation(app, 'ord_001');
    milestones = body.milestones;
  });

  it('every milestone has a phase field', () => {
    for (const m of milestones) {
      expect(m).toHaveProperty('phase');
    }
  });

  it('every milestone phase is "fulfilment" or "activation"', () => {
    for (const m of milestones) {
      expect(['fulfilment', 'activation']).toContain(m.phase);
    }
  });

  it('fulfilment-phase milestones include order_placed, payment_confirmed, verification_complete, esim_issued', () => {
    const fulfilmentIds = milestones
      .filter((m) => m.phase === 'fulfilment')
      .map((m) => m.id);
    for (const expectedId of FULFILMENT_IDS) {
      expect(fulfilmentIds).toContain(expectedId);
    }
  });

  it('activation-phase milestones include esim_activated', () => {
    const activationIds = milestones
      .filter((m) => m.phase === 'activation')
      .map((m) => m.id);
    for (const expectedId of ACTIVATION_IDS) {
      expect(activationIds).toContain(expectedId);
    }
  });

  it('no fulfilment milestone appears in the activation phase', () => {
    const activationMilestones = milestones.filter((m) => m.phase === 'activation');
    const activationIds = activationMilestones.map((m) => m.id);
    for (const fulfilmentId of FULFILMENT_IDS) {
      expect(activationIds).not.toContain(fulfilmentId);
    }
  });

  it('no activation milestone appears in the fulfilment phase', () => {
    const fulfilmentMilestones = milestones.filter((m) => m.phase === 'fulfilment');
    const fulfilmentIds = fulfilmentMilestones.map((m) => m.id);
    for (const activationId of ACTIVATION_IDS) {
      expect(fulfilmentIds).not.toContain(activationId);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-3  Per-milestone required fields
// ---------------------------------------------------------------------------

describe('GET /api/activation/:orderId — per-milestone required fields', () => {
  let app: Application;
  let milestones: ActivationMilestone[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await fetchActivation(app, 'ord_001');
    milestones = body.milestones;
  });

  it('every milestone has id, phase, label, status, timestamp', () => {
    for (const m of milestones) {
      expect(m).toHaveProperty('id');
      expect(m).toHaveProperty('phase');
      expect(m).toHaveProperty('label');
      expect(m).toHaveProperty('status');
      expect(m).toHaveProperty('timestamp');
    }
  });

  it('every milestone id is a non-empty string', () => {
    for (const m of milestones) {
      expect(typeof m.id).toBe('string');
      expect(m.id.length).toBeGreaterThan(0);
    }
  });

  it('every milestone label is a non-empty string', () => {
    for (const m of milestones) {
      expect(typeof m.label).toBe('string');
      expect(m.label.length).toBeGreaterThan(0);
    }
  });

  it('every milestone status is "completed", "pending", or "blocked"', () => {
    for (const m of milestones) {
      expect(['completed', 'pending', 'blocked']).toContain(m.status);
    }
  });

  it('completed milestones have a non-null ISO timestamp', () => {
    for (const m of milestones) {
      if (m.status === 'completed') {
        expect(typeof m.timestamp).toBe('string');
        expect(new Date(m.timestamp as string).getTime()).not.toBeNaN();
      }
    }
  });

  it('pending or blocked milestones have null or string timestamp (not a required ISO date)', () => {
    for (const m of milestones) {
      if (m.status !== 'completed') {
        expect(m.timestamp === null || typeof m.timestamp === 'string').toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// AC-4  The two phases are independently renderable (separate groupings)
// ---------------------------------------------------------------------------

describe('GET /api/activation/:orderId — phases are independently groupable', () => {
  let app: Application;
  let milestones: ActivationMilestone[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await fetchActivation(app, 'ord_001');
    milestones = body.milestones;
  });

  it('there is at least one milestone with phase="fulfilment"', () => {
    const fulfilment = milestones.filter((m) => m.phase === 'fulfilment');
    expect(fulfilment.length).toBeGreaterThan(0);
  });

  it('there is at least one milestone with phase="activation"', () => {
    const activation = milestones.filter((m) => m.phase === 'activation');
    expect(activation.length).toBeGreaterThan(0);
  });

  it('filtering milestones by phase returns non-overlapping sets', () => {
    const fulfilmentIds = new Set(
      milestones.filter((m) => m.phase === 'fulfilment').map((m) => m.id),
    );
    const activationIds = new Set(
      milestones.filter((m) => m.phase === 'activation').map((m) => m.id),
    );
    for (const id of fulfilmentIds) {
      expect(activationIds.has(id)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-5  activationState reflects overall activation progress
// ---------------------------------------------------------------------------

describe('GET /api/activation/:orderId — activationState values', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  const KNOWN_STATES = [
    'PENDING',
    'ORDER_PLACED',
    'PAYMENT_CONFIRMED',
    'VERIFICATION_COMPLETE',
    'ESIM_ISSUED',
    'ESIM_ACTIVATED',
    'BLOCKED',
    'FAILED',
  ];

  it('activationState is a known state value', async () => {
    const { body } = await fetchActivation(app, 'ord_001');
    expect(KNOWN_STATES).toContain(body.activationState);
  });
});

// ---------------------------------------------------------------------------
// AC-6  Edge cases
// ---------------------------------------------------------------------------

describe('GET /api/activation/:orderId — edge cases', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 404 for an unknown orderId', async () => {
    const { status } = await fetchActivation(app, 'ord_does_not_exist_xyz');
    expect(status).toBe(404);
  });

  it('404 response body has an errorCode field', async () => {
    const res = await request(app).get('/api/activation/ord_does_not_exist_xyz');
    expect(res.body).toHaveProperty('errorCode');
  });
});
