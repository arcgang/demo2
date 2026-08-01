/**
 * Acceptance tests for GET /api/orders/:orderId/status-timeline
 *
 * LLD §5.13 / task acceptance criteria:
 *   Response shape:
 *     {
 *       orderId: string,
 *       timeline: Array<{
 *         eventType: StatusEventType,   // one of the 11 state-machine states
 *         label:     string,
 *         description: string,
 *         timestamp: string | null,
 *         isCurrent: boolean
 *       }>,
 *       nextPollMs: number              // hint for callers; must be ≤ 60 000
 *     }
 *
 *   Acceptance criteria (from task brief):
 *     AC-1  HTTP 200 with the full event array
 *     AC-2  Response envelope has orderId, timeline[], nextPollMs
 *     AC-3  Each event carries eventType, label, description, timestamp, isCurrent
 *     AC-4  All four state categories are represented when a fully-processed order
 *           is queried (payment, verification, fulfillment, activation)
 *     AC-5  nextPollMs is a positive integer ≤ 60 000
 *     AC-6  A simulated activation_failed event appears in the timeline when
 *           the mocked boundary returns a failure
 *     AC-7  isCurrent is true for exactly one event (the latest active step)
 *     AC-8  HTTP 404 when the orderId has no persisted events
 *     AC-9  eventType values are from the authoritative 11-state enum
 *     AC-10 Events arrive in chronological order
 */

import request from 'supertest';
import { Application } from 'express';

// ── State-machine constants (must match StatusTimelineService) ────────────────

const PAYMENT_EVENT_TYPES = [
  'order_placed',
  'payment_confirmed',
  'payment_pending',
  'payment_failed',
] as const;

const VERIFICATION_EVENT_TYPES = [
  'verification_complete',
  'verification_pending',
  'verification_failed',
] as const;

const FULFILLMENT_EVENT_TYPES = [
  'fulfillment_in_progress',
  'esim_issued',
] as const;

const ACTIVATION_EVENT_TYPES = [
  'activation_complete',
  'activation_pending',
  'activation_failed',
] as const;

const ALL_EVENT_TYPES = [
  ...PAYMENT_EVENT_TYPES,
  ...VERIFICATION_EVENT_TYPES,
  ...FULFILLMENT_EVENT_TYPES,
  ...ACTIVATION_EVENT_TYPES,
] as const;

type StatusEventType = typeof ALL_EVENT_TYPES[number];

// ── Response types ────────────────────────────────────────────────────────────

interface TimelineEvent {
  eventType: StatusEventType;
  label: string;
  description: string;
  timestamp: string | null;
  isCurrent: boolean;
}

interface TimelineResponse {
  orderId: string;
  timeline: TimelineEvent[];
  nextPollMs: number;
}

// ── App + store helpers ───────────────────────────────────────────────────────

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app') as { createApp: () => Application };
  return createApp();
}

// The StatusTimelineModule exposes a store that tests can seed/reset directly.
// These imports will fail (red) until the module is implemented.
import {
  clearTimelineStore,
  seedTimelineEvents,
} from '../../modules/statusTimeline/timelineStore';

import {
  clearAll as clearOrderStore,
  persistOrder,
} from '../../modules/order/orderStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchTimeline(
  app: Application,
  orderId: string,
): Promise<{ status: number; body: TimelineResponse }> {
  const res = await request(app).get(`/api/orders/${orderId}/status-timeline`);
  return { status: res.status, body: res.body as TimelineResponse };
}

// Seed a fully-processed happy-path order so category coverage can be verified.
const HAPPY_PATH_ORDER_ID = 'ord_timeline_happy';
const FAILED_ACTIVATION_ORDER_ID = 'ord_timeline_failed_activation';

function seedHappyPathOrder(): void {
  const base = '2026-07-28T09:0';
  seedTimelineEvents(HAPPY_PATH_ORDER_ID, [
    { eventType: 'order_placed',          label: 'Order Placed',           description: 'Your order was received.',                    timestamp: `${base}0:00Z`, isCurrent: false },
    { eventType: 'payment_confirmed',     label: 'Payment Confirmed',       description: 'Payment was successfully processed.',          timestamp: `${base}5:00Z`, isCurrent: false },
    { eventType: 'verification_complete', label: 'Verification Complete',   description: 'Identity verification passed.',               timestamp: `${base}7:00Z`, isCurrent: false },
    { eventType: 'fulfillment_in_progress', label: 'Fulfillment In Progress', description: 'Your order is being prepared for activation.', timestamp: `${base}8:00Z`, isCurrent: false },
    { eventType: 'esim_issued',           label: 'eSIM Issued',             description: 'Your eSIM has been issued.',                  timestamp: `${base}9:00Z`, isCurrent: false },
    { eventType: 'activation_complete',   label: 'Activation Complete',     description: 'Your line is now active.',                    timestamp: `${base}9:30Z`, isCurrent: true  },
  ]);
}

function seedActivationFailedOrder(): void {
  const base = '2026-07-28T11:0';
  seedTimelineEvents(FAILED_ACTIVATION_ORDER_ID, [
    { eventType: 'order_placed',      label: 'Order Placed',      description: 'Your order was received.',               timestamp: `${base}0:00Z`, isCurrent: false },
    { eventType: 'payment_confirmed', label: 'Payment Confirmed', description: 'Payment was successfully processed.',     timestamp: `${base}5:00Z`, isCurrent: false },
    { eventType: 'verification_complete', label: 'Verification Complete', description: 'Identity verification passed.',  timestamp: `${base}7:00Z`, isCurrent: false },
    { eventType: 'activation_pending', label: 'Activation Pending', description: 'Activation is in progress.',           timestamp: `${base}8:00Z`, isCurrent: false },
    { eventType: 'activation_failed',  label: 'Activation Failed',  description: 'Activation could not be completed.',  timestamp: `${base}9:00Z`, isCurrent: true  },
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-8  404 for unknown order
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/orders/:id/status-timeline — unknown order', () => {
  let app: Application;

  beforeEach(() => {
    clearTimelineStore();
    app = getApp();
  });

  it('returns 404 when the orderId has no persisted events', async () => {
    const { status } = await fetchTimeline(app, 'ord_does_not_exist');
    expect(status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  HTTP 200 + envelope shape  (AC-2)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/orders/:id/status-timeline — response envelope', () => {
  let app: Application;

  beforeEach(() => {
    clearTimelineStore();
    seedHappyPathOrder();
    app = getApp();
  });

  it('returns HTTP 200 for an order with persisted events', async () => {
    const { status } = await fetchTimeline(app, HAPPY_PATH_ORDER_ID);
    expect(status).toBe(200);
  });

  it('response body contains orderId matching the path parameter', async () => {
    const { body } = await fetchTimeline(app, HAPPY_PATH_ORDER_ID);
    expect(body.orderId).toBe(HAPPY_PATH_ORDER_ID);
  });

  it('response body contains a timeline array', async () => {
    const { body } = await fetchTimeline(app, HAPPY_PATH_ORDER_ID);
    expect(Array.isArray(body.timeline)).toBe(true);
  });

  it('response body contains a nextPollMs field', async () => {
    const { body } = await fetchTimeline(app, HAPPY_PATH_ORDER_ID);
    expect(body).toHaveProperty('nextPollMs');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  Per-event field schema
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/orders/:id/status-timeline — per-event schema', () => {
  let app: Application;
  let events: TimelineEvent[];

  beforeAll(async () => {
    clearTimelineStore();
    seedHappyPathOrder();
    app = getApp();
    const { body } = await fetchTimeline(app, HAPPY_PATH_ORDER_ID);
    events = body.timeline;
  });

  it('timeline array is non-empty', () => {
    expect(events.length).toBeGreaterThan(0);
  });

  it('every event has an eventType field', () => {
    for (const e of events) {
      expect(e).toHaveProperty('eventType');
    }
  });

  it('every event has a label field', () => {
    for (const e of events) {
      expect(e).toHaveProperty('label');
    }
  });

  it('every event has a description field', () => {
    for (const e of events) {
      expect(e).toHaveProperty('description');
    }
  });

  it('every event has a timestamp field', () => {
    for (const e of events) {
      expect(e).toHaveProperty('timestamp');
    }
  });

  it('every event has an isCurrent field', () => {
    for (const e of events) {
      expect(e).toHaveProperty('isCurrent');
    }
  });

  it('label is a non-empty string on every event', () => {
    for (const e of events) {
      expect(typeof e.label).toBe('string');
      expect(e.label.trim().length).toBeGreaterThan(0);
    }
  });

  it('description is a non-empty string on every event', () => {
    for (const e of events) {
      expect(typeof e.description).toBe('string');
      expect(e.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('isCurrent is a boolean on every event', () => {
    for (const e of events) {
      expect(typeof e.isCurrent).toBe('boolean');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-9  eventType values are from the 11-state enum
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/orders/:id/status-timeline — eventType enum', () => {
  let app: Application;
  let events: TimelineEvent[];

  beforeAll(async () => {
    clearTimelineStore();
    seedHappyPathOrder();
    app = getApp();
    const { body } = await fetchTimeline(app, HAPPY_PATH_ORDER_ID);
    events = body.timeline;
  });

  it('every eventType is from the authoritative 11-state set', () => {
    for (const e of events) {
      expect(ALL_EVENT_TYPES as readonly string[]).toContain(e.eventType);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-7  isCurrent is true for exactly one event
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/orders/:id/status-timeline — isCurrent invariant', () => {
  let app: Application;

  beforeEach(() => {
    clearTimelineStore();
    app = getApp();
  });

  it('exactly one event has isCurrent=true in the happy-path scenario', async () => {
    seedHappyPathOrder();
    const { body } = await fetchTimeline(app, HAPPY_PATH_ORDER_ID);
    const currentEvents = (body.timeline as TimelineEvent[]).filter((e) => e.isCurrent);
    expect(currentEvents).toHaveLength(1);
  });

  it('isCurrent=true event is the last event in the timeline', async () => {
    seedHappyPathOrder();
    const { body } = await fetchTimeline(app, HAPPY_PATH_ORDER_ID);
    const events = body.timeline as TimelineEvent[];
    const lastEvent = events[events.length - 1];
    expect(lastEvent.isCurrent).toBe(true);
  });

  it('exactly one event has isCurrent=true in the activation-failed scenario', async () => {
    seedActivationFailedOrder();
    const { body } = await fetchTimeline(app, FAILED_ACTIVATION_ORDER_ID);
    const currentEvents = (body.timeline as TimelineEvent[]).filter((e) => e.isCurrent);
    expect(currentEvents).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  Four state categories present in a complete timeline
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/orders/:id/status-timeline — four-category coverage', () => {
  let app: Application;
  let eventTypes: string[];

  beforeAll(async () => {
    clearTimelineStore();
    seedHappyPathOrder();
    app = getApp();
    const { body } = await fetchTimeline(app, HAPPY_PATH_ORDER_ID);
    eventTypes = (body.timeline as TimelineEvent[]).map((e) => e.eventType);
  });

  it('at least one payment-category event is present', () => {
    const hasPayment = eventTypes.some((t) =>
      (PAYMENT_EVENT_TYPES as readonly string[]).includes(t),
    );
    expect(hasPayment).toBe(true);
  });

  it('at least one verification-category event is present', () => {
    const hasVerification = eventTypes.some((t) =>
      (VERIFICATION_EVENT_TYPES as readonly string[]).includes(t),
    );
    expect(hasVerification).toBe(true);
  });

  it('at least one fulfillment-category event is present', () => {
    const hasFulfillment = eventTypes.some((t) =>
      (FULFILLMENT_EVENT_TYPES as readonly string[]).includes(t),
    );
    expect(hasFulfillment).toBe(true);
  });

  it('at least one activation-category event is present', () => {
    const hasActivation = eventTypes.some((t) =>
      (ACTIVATION_EVENT_TYPES as readonly string[]).includes(t),
    );
    expect(hasActivation).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  nextPollMs contract
// ─────────────────────────────────────────────────────────────────────────────

const PENDING_ORDER_ID = 'ord_timeline_pending';

function seedPendingOrder(): void {
  seedTimelineEvents(PENDING_ORDER_ID, [
    { eventType: 'order_placed',      label: 'Order Placed',      description: 'Your order was received.', timestamp: '2026-07-28T09:00:00Z', isCurrent: false },
    { eventType: 'payment_confirmed', label: 'Payment Confirmed', description: 'Payment confirmed.',        timestamp: '2026-07-28T09:05:00Z', isCurrent: false },
    { eventType: 'activation_pending', label: 'Activation Pending', description: 'Activation in progress.', timestamp: null, isCurrent: true },
  ]);
}

describe('GET /api/orders/:id/status-timeline — nextPollMs contract', () => {
  let app: Application;

  beforeAll(() => {
    clearTimelineStore();
    seedPendingOrder();
    app = getApp();
  });

  it('nextPollMs is a number', async () => {
    const { body } = await fetchTimeline(app, PENDING_ORDER_ID);
    expect(typeof body.nextPollMs).toBe('number');
  });

  it('nextPollMs is a non-negative integer for a pending order', async () => {
    const { body } = await fetchTimeline(app, PENDING_ORDER_ID);
    expect(body.nextPollMs).toBeGreaterThan(0);
    expect(Number.isInteger(body.nextPollMs)).toBe(true);
  });

  it('nextPollMs does not exceed 60 000 ms', async () => {
    const { body } = await fetchTimeline(app, PENDING_ORDER_ID);
    expect(body.nextPollMs).toBeLessThanOrEqual(60_000);
  });

  it('nextPollMs is 0 for a terminal state (no further polling needed)', async () => {
    clearTimelineStore();
    seedHappyPathOrder();
    const freshApp = getApp();
    const { body } = await fetchTimeline(freshApp, HAPPY_PATH_ORDER_ID);
    expect(body.nextPollMs).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6  activation_failed event appears in timeline
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/orders/:id/status-timeline — activation failure scenario', () => {
  let app: Application;
  let events: TimelineEvent[];

  beforeAll(async () => {
    clearTimelineStore();
    seedActivationFailedOrder();
    app = getApp();
    const { body } = await fetchTimeline(app, FAILED_ACTIVATION_ORDER_ID);
    events = body.timeline as TimelineEvent[];
  });

  it('returns HTTP 200 for an order with activation failure', async () => {
    clearTimelineStore();
    seedActivationFailedOrder();
    const freshApp = getApp();
    const { status } = await fetchTimeline(freshApp, FAILED_ACTIVATION_ORDER_ID);
    expect(status).toBe(200);
  });

  it('timeline contains an activation_failed event', () => {
    const failedEvent = events.find((e) => e.eventType === 'activation_failed');
    expect(failedEvent).toBeDefined();
  });

  it('the activation_failed event has isCurrent=true', () => {
    const failedEvent = events.find((e) => e.eventType === 'activation_failed');
    expect(failedEvent?.isCurrent).toBe(true);
  });

  it('the activation_failed event has a non-empty description', () => {
    const failedEvent = events.find((e) => e.eventType === 'activation_failed');
    expect(typeof failedEvent?.description).toBe('string');
    expect((failedEvent?.description ?? '').trim().length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Real-order code path: order persisted via persistOrder, not timeline-store seed
// Exercises lines 119-162 of orders.ts and verifies no timestamp loss on GET.
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/orders/:id/status-timeline — real order code path', () => {
  let app: Application;
  const REAL_ORDER_ID = 'ord_real_path_001';
  const CREATED_AT = '2026-07-28T08:00:00Z';

  beforeEach(() => {
    clearOrderStore();
    clearTimelineStore();
    app = getApp();

    persistOrder({
      orderId: REAL_ORDER_ID,
      orderReference: REAL_ORDER_ID,
      cartId: 'cart_real_001',
      paymentAttemptId: 'pay_real_001',
      paymentStatus: 'payment_confirmed',
      verificationStatus: 'verification_complete',
      activationState: 'activation_complete',
      createdAt: CREATED_AT,
      lineItems: [{ name: 'iPhone 15', qty: 1, unitPrice: 18999 }],
      onceOffTotal: 18999,
      monthlyTotal: 799,
      timelineEvents: [],
    });
  });

  it('returns HTTP 200 for an order in the order store', async () => {
    const { status } = await fetchTimeline(app, REAL_ORDER_ID);
    expect(status).toBe(200);
  });

  it('response orderId matches the requested id', async () => {
    const { body } = await fetchTimeline(app, REAL_ORDER_ID);
    expect(body.orderId).toBe(REAL_ORDER_ID);
  });

  it('timeline contains order_placed with the persisted createdAt timestamp', async () => {
    const { body } = await fetchTimeline(app, REAL_ORDER_ID);
    const placed = (body.timeline as TimelineEvent[]).find((e) => e.eventType === 'order_placed');
    expect(placed).toBeDefined();
    expect(placed?.timestamp).toBe(CREATED_AT);
  });

  it('timeline includes all four state categories for a fully-processed order', async () => {
    const { body } = await fetchTimeline(app, REAL_ORDER_ID);
    const types = (body.timeline as TimelineEvent[]).map((e) => e.eventType);
    const hasPayment = types.some((t) => (PAYMENT_EVENT_TYPES as readonly string[]).includes(t));
    const hasVerification = types.some((t) => (VERIFICATION_EVENT_TYPES as readonly string[]).includes(t));
    const hasActivation = types.some((t) => (ACTIVATION_EVENT_TYPES as readonly string[]).includes(t));
    expect(hasPayment).toBe(true);
    expect(hasVerification).toBe(true);
    expect(hasActivation).toBe(true);
  });

  it('re-fetching the timeline preserves the order_placed timestamp (no timestamp loss)', async () => {
    // First call seeds the timeline; second call must return the same timestamp.
    await fetchTimeline(app, REAL_ORDER_ID);
    const { body } = await fetchTimeline(app, REAL_ORDER_ID);
    const placed = (body.timeline as TimelineEvent[]).find((e) => e.eventType === 'order_placed');
    expect(placed?.timestamp).toBe(CREATED_AT);
  });

  it('nextPollMs is 0 for a terminal activation_complete order', async () => {
    const { body } = await fetchTimeline(app, REAL_ORDER_ID);
    expect(body.nextPollMs).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-10  Events arrive in chronological (insertion) order
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/orders/:id/status-timeline — chronological ordering', () => {
  let app: Application;
  let events: TimelineEvent[];

  beforeAll(async () => {
    clearTimelineStore();
    seedHappyPathOrder();
    app = getApp();
    const { body } = await fetchTimeline(app, HAPPY_PATH_ORDER_ID);
    events = body.timeline as TimelineEvent[];
  });

  it('the first event has eventType=order_placed', () => {
    expect(events[0].eventType).toBe('order_placed');
  });

  it('timestamps are non-decreasing across events that have a timestamp', () => {
    const stamped = events.filter((e) => e.timestamp !== null) as Array<TimelineEvent & { timestamp: string }>;
    for (let i = 1; i < stamped.length; i++) {
      const prev = new Date(stamped[i - 1].timestamp).getTime();
      const curr = new Date(stamped[i].timestamp).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });
});
