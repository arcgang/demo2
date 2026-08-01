/**
 * Smoke tests for GET /api/orders/:id/status
 *
 * The /status endpoint now serves the unified timeline format (same handler as
 * /status-timeline). Full acceptance coverage lives in order-status-timeline.test.ts.
 * These tests confirm the /status alias is reachable and returns the correct shape.
 */

import request from 'supertest';
import { Application } from 'express';
import {
  clearTimelineStore,
  seedTimelineEvents,
} from '../../modules/statusTimeline/timelineStore';

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app') as { createApp: () => Application };
  return createApp();
}

const STATUS_ORDER_ID = 'ord_status_smoke';

function seedStatusOrder(): void {
  seedTimelineEvents(STATUS_ORDER_ID, [
    { eventType: 'order_placed',      label: 'Order Placed',      description: 'Order received.',           timestamp: '2026-07-28T09:00:00Z', isCurrent: false },
    { eventType: 'payment_confirmed', label: 'Payment Confirmed', description: 'Payment confirmed.',         timestamp: '2026-07-28T09:05:00Z', isCurrent: false },
    { eventType: 'activation_pending', label: 'Activation Pending', description: 'Activation in progress.', timestamp: null, isCurrent: true },
  ]);
}

describe('GET /api/orders/:id/status — timeline alias', () => {
  let app: Application;

  beforeEach(() => {
    clearTimelineStore();
    seedStatusOrder();
    app = getApp();
  });

  it('returns HTTP 200 for an order with seeded timeline events', async () => {
    const res = await request(app).get(`/api/orders/${STATUS_ORDER_ID}/status`);
    expect(res.status).toBe(200);
  });

  it('returns orderId matching the path parameter', async () => {
    const res = await request(app).get(`/api/orders/${STATUS_ORDER_ID}/status`);
    expect(res.body.orderId).toBe(STATUS_ORDER_ID);
  });

  it('returns a timeline array', async () => {
    const res = await request(app).get(`/api/orders/${STATUS_ORDER_ID}/status`);
    expect(Array.isArray(res.body.timeline)).toBe(true);
  });

  it('returns a nextPollMs field', async () => {
    const res = await request(app).get(`/api/orders/${STATUS_ORDER_ID}/status`);
    expect(res.body).toHaveProperty('nextPollMs');
  });

  it('returns HTTP 404 for an unknown orderId', async () => {
    clearTimelineStore();
    const res = await request(app).get('/api/orders/ord_unknown_xyz/status');
    expect(res.status).toBe(404);
  });
});
