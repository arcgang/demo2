import request from 'supertest';
import express, { Application } from 'express';

/**
 * Acceptance tests for GET /api/orders/:id/status
 *
 * Contract (from LLD §5 / task acceptance criteria):
 *   Response shape:
 *     {
 *       orderId: string,
 *       milestones: Array<{
 *         step: 'order_placed' | 'payment_confirmed' | 'verification_complete' |
 *               'esim_issued' | 'activation_complete',
 *         state: 'completed' | 'pending' | 'blocked',
 *         timestamp: string | null,
 *         next_step: string | null
 *       }>
 *     }
 *   Scenarios via ?scenario=<name>:
 *     activation_complete, pending_verification, blocked_verification
 */

const ORDERED_STEPS = [
  'order_placed',
  'payment_confirmed',
  'verification_complete',
  'esim_issued',
  'activation_complete',
] as const;

type MilestoneStep = typeof ORDERED_STEPS[number];
type MilestoneState = 'completed' | 'pending' | 'blocked';

interface Milestone {
  step: MilestoneStep;
  state: MilestoneState;
  timestamp: string | null;
  next_step: string | null;
}

interface StatusResponse {
  orderId: string;
  milestones: Milestone[];
}

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchStatus(
  app: Application,
  orderId: string,
  scenario: string,
): Promise<{ status: number; body: StatusResponse }> {
  const res = await request(app)
    .get(`/api/orders/${orderId}/status`)
    .query({ scenario });
  return { status: res.status, body: res.body as StatusResponse };
}

function assertValidMilestone(m: Milestone): void {
  expect(ORDERED_STEPS).toContain(m.step);
  expect(['completed', 'pending', 'blocked']).toContain(m.state);

  // timestamp must be an ISO-8601 string when completed, null otherwise
  if (m.state === 'completed') {
    expect(typeof m.timestamp).toBe('string');
    expect(new Date(m.timestamp as string).getTime()).not.toBeNaN();
  } else {
    // pending or blocked: timestamp may be null or a string, but next_step must be non-empty
    expect(typeof m.next_step).toBe('string');
    expect((m.next_step as string).length).toBeGreaterThan(0);
  }
}

// ---------------------------------------------------------------------------
// AC-1  Full milestone array with correct structure
// ---------------------------------------------------------------------------

describe('GET /api/orders/:id/status — milestone array shape', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 200 for a valid scenario', async () => {
    const { status } = await fetchStatus(app, 'ord_001', 'activation_complete');
    expect(status).toBe(200);
  });

  it('returns orderId matching the path parameter', async () => {
    const { body } = await fetchStatus(app, 'ord_abc', 'activation_complete');
    expect(body.orderId).toBe('ord_abc');
  });

  it('response contains a milestones array', async () => {
    const { body } = await fetchStatus(app, 'ord_001', 'activation_complete');
    expect(Array.isArray(body.milestones)).toBe(true);
  });

  it('milestones array contains exactly 5 entries', async () => {
    const { body } = await fetchStatus(app, 'ord_001', 'activation_complete');
    expect(body.milestones).toHaveLength(5);
  });

  it('milestones appear in the mandated order', async () => {
    const { body } = await fetchStatus(app, 'ord_001', 'activation_complete');
    const steps = body.milestones.map((m: Milestone) => m.step);
    expect(steps).toEqual([...ORDERED_STEPS]);
  });

  it('every milestone has required fields: step, state, timestamp, next_step', async () => {
    const { body } = await fetchStatus(app, 'ord_001', 'activation_complete');
    for (const m of body.milestones as Milestone[]) {
      expect(m).toHaveProperty('step');
      expect(m).toHaveProperty('state');
      expect(m).toHaveProperty('timestamp');
      expect(m).toHaveProperty('next_step');
    }
  });

  it('each milestone has a valid step value from the allowed enum', async () => {
    const { body } = await fetchStatus(app, 'ord_001', 'activation_complete');
    for (const m of body.milestones as Milestone[]) {
      expect(ORDERED_STEPS).toContain(m.step);
    }
  });

  it('each milestone has a valid state value: completed | pending | blocked', async () => {
    const { body } = await fetchStatus(app, 'ord_001', 'activation_complete');
    for (const m of body.milestones as Milestone[]) {
      expect(['completed', 'pending', 'blocked']).toContain(m.state);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-2  pending / blocked milestones always carry non-empty next_step
// ---------------------------------------------------------------------------

describe('GET /api/orders/:id/status — next_step invariant', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  const scenarios = ['activation_complete', 'pending_verification', 'blocked_verification'];

  for (const scenario of scenarios) {
    it(`every pending/blocked milestone has a non-empty next_step in scenario=${scenario}`, async () => {
      const { body } = await fetchStatus(app, 'ord_001', scenario);
      for (const m of body.milestones as Milestone[]) {
        if (m.state === 'pending' || m.state === 'blocked') {
          expect(typeof m.next_step).toBe('string');
          expect((m.next_step as string).trim().length).toBeGreaterThan(0);
        }
      }
    });
  }

  it('completed milestones have a non-null ISO timestamp', async () => {
    const { body } = await fetchStatus(app, 'ord_001', 'activation_complete');
    for (const m of body.milestones as Milestone[]) {
      if (m.state === 'completed') {
        expect(typeof m.timestamp).toBe('string');
        expect(new Date(m.timestamp as string).getTime()).not.toBeNaN();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// AC-3a  Scenario: activation_complete — all milestones completed
// ---------------------------------------------------------------------------

describe('scenario=activation_complete', () => {
  let app: Application;
  let milestones: Milestone[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await fetchStatus(app, 'ord_001', 'activation_complete');
    milestones = body.milestones;
  });

  it('returns HTTP 200', async () => {
    const { status } = await fetchStatus(app, 'ord_001', 'activation_complete');
    expect(status).toBe(200);
  });

  it('all 5 milestones are in state=completed', () => {
    for (const m of milestones) {
      expect(m.state).toBe('completed');
    }
  });

  it('order_placed is completed with a timestamp', () => {
    const m = milestones.find((x) => x.step === 'order_placed')!;
    expect(m.state).toBe('completed');
    expect(typeof m.timestamp).toBe('string');
    expect(new Date(m.timestamp as string).getTime()).not.toBeNaN();
  });

  it('payment_confirmed is completed with a timestamp', () => {
    const m = milestones.find((x) => x.step === 'payment_confirmed')!;
    expect(m.state).toBe('completed');
    expect(typeof m.timestamp).toBe('string');
  });

  it('verification_complete is completed with a timestamp', () => {
    const m = milestones.find((x) => x.step === 'verification_complete')!;
    expect(m.state).toBe('completed');
    expect(typeof m.timestamp).toBe('string');
  });

  it('esim_issued is completed with a timestamp', () => {
    const m = milestones.find((x) => x.step === 'esim_issued')!;
    expect(m.state).toBe('completed');
    expect(typeof m.timestamp).toBe('string');
  });

  it('activation_complete is completed with a timestamp', () => {
    const m = milestones.find((x) => x.step === 'activation_complete')!;
    expect(m.state).toBe('completed');
    expect(typeof m.timestamp).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// AC-3b  Scenario: pending_verification
// ---------------------------------------------------------------------------

describe('scenario=pending_verification', () => {
  let app: Application;
  let milestones: Milestone[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await fetchStatus(app, 'ord_002', 'pending_verification');
    milestones = body.milestones;
  });

  it('returns HTTP 200', async () => {
    const { status } = await fetchStatus(app, 'ord_002', 'pending_verification');
    expect(status).toBe(200);
  });

  it('order_placed is completed', () => {
    const m = milestones.find((x) => x.step === 'order_placed')!;
    expect(m.state).toBe('completed');
  });

  it('payment_confirmed is completed', () => {
    const m = milestones.find((x) => x.step === 'payment_confirmed')!;
    expect(m.state).toBe('completed');
  });

  it('verification_complete is pending', () => {
    const m = milestones.find((x) => x.step === 'verification_complete')!;
    expect(m.state).toBe('pending');
  });

  it('verification_complete pending milestone has a non-empty next_step', () => {
    const m = milestones.find((x) => x.step === 'verification_complete')!;
    expect(typeof m.next_step).toBe('string');
    expect((m.next_step as string).trim().length).toBeGreaterThan(0);
  });

  it('esim_issued is not completed (pending or blocked) and has a next_step', () => {
    const m = milestones.find((x) => x.step === 'esim_issued')!;
    expect(m.state).not.toBe('completed');
    expect(typeof m.next_step).toBe('string');
    expect((m.next_step as string).trim().length).toBeGreaterThan(0);
  });

  it('activation_complete is not completed (pending or blocked) and has a next_step', () => {
    const m = milestones.find((x) => x.step === 'activation_complete')!;
    expect(m.state).not.toBe('completed');
    expect(typeof m.next_step).toBe('string');
    expect((m.next_step as string).trim().length).toBeGreaterThan(0);
  });

  it('passes per-milestone validity assertions', () => {
    for (const m of milestones) {
      assertValidMilestone(m);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-3c  Scenario: blocked_verification
// ---------------------------------------------------------------------------

describe('scenario=blocked_verification', () => {
  let app: Application;
  let milestones: Milestone[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await fetchStatus(app, 'ord_003', 'blocked_verification');
    milestones = body.milestones;
  });

  it('returns HTTP 200', async () => {
    const { status } = await fetchStatus(app, 'ord_003', 'blocked_verification');
    expect(status).toBe(200);
  });

  it('order_placed is completed', () => {
    const m = milestones.find((x) => x.step === 'order_placed')!;
    expect(m.state).toBe('completed');
  });

  it('payment_confirmed is completed', () => {
    const m = milestones.find((x) => x.step === 'payment_confirmed')!;
    expect(m.state).toBe('completed');
  });

  it('verification_complete is blocked', () => {
    const m = milestones.find((x) => x.step === 'verification_complete')!;
    expect(m.state).toBe('blocked');
  });

  it('verification_complete blocked milestone has a non-empty next_step', () => {
    const m = milestones.find((x) => x.step === 'verification_complete')!;
    expect(typeof m.next_step).toBe('string');
    expect((m.next_step as string).trim().length).toBeGreaterThan(0);
  });

  it('esim_issued is not completed (pending or blocked) and has a next_step', () => {
    const m = milestones.find((x) => x.step === 'esim_issued')!;
    expect(m.state).not.toBe('completed');
    expect(typeof m.next_step).toBe('string');
    expect((m.next_step as string).trim().length).toBeGreaterThan(0);
  });

  it('activation_complete is not completed (pending or blocked) and has a next_step', () => {
    const m = milestones.find((x) => x.step === 'activation_complete')!;
    expect(m.state).not.toBe('completed');
    expect(typeof m.next_step).toBe('string');
    expect((m.next_step as string).trim().length).toBeGreaterThan(0);
  });

  it('passes per-milestone validity assertions', () => {
    for (const m of milestones) {
      assertValidMilestone(m);
    }
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('GET /api/orders/:id/status — edge cases', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns 404 when no scenario query param is supplied', async () => {
    const res = await request(app).get('/api/orders/ord_999/status');
    expect(res.status).toBe(404);
  });

  it('returns 404 for an unknown scenario value', async () => {
    const res = await request(app)
      .get('/api/orders/ord_999/status')
      .query({ scenario: 'nonexistent_scenario' });
    expect(res.status).toBe(404);
  });
});
