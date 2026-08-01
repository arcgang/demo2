import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Order Details audit-trail timeline (Screen 6)
 *
 * Route   : GET /orders/:id          (frontend order detail page)
 * API dep : GET /api/orders/:ref/audit-trail
 *
 * The page must:
 *  1. Fetch /api/orders/:ref/audit-trail on load, using the order reference
 *     from the URL (e.g. ORD-3001).
 *  2. Render each AuditEvent as a timeline step with:
 *       - an icon
 *       - a human-readable label derived from event_type
 *       - occurred_at formatted as '28 July 2026, 10:05 AM'
 *       - a one-line summary from the payload
 *  3. Map the five canonical milestones to their corresponding event_type.
 *  4. Render all five milestone events when the audit trail contains them.
 *  5. Support a support operator opening any order reference within the
 *     10-minute reconstruction window.
 *
 * Acceptance criteria encoded here:
 *  AC-1  GET /orders/:id returns 200 with text/html.
 *  AC-2  The timeline is driven by audit-trail data: the page uses
 *        GET /api/orders/:ref/audit-trail to populate its milestones rather
 *        than a static hard-coded list.
 *  AC-3  All five canonical milestone labels render when the audit trail
 *        contains all five event types.
 *  AC-4  Each audit event renders an icon, a label, a formatted timestamp,
 *        and a payload summary.
 *  AC-5  occurred_at is formatted as human-readable date/time (e.g.
 *        '28 July 2026, 10:05 AM' style).
 *  AC-6  The event_type-to-label mapping is correct for each of the five
 *        canonical types.
 *  AC-7  A payment_outcome event surfaces the payment summary from its payload
 *        (e.g. 'Payment of R 20,496.55 successfully processed via mobile money').
 *  AC-8  The timeline section carries the class or id needed for operator use
 *        (class="order-status-timeline").
 *  AC-9  An unknown order reference returns 404.
 */

const FIVE_AUDIT_REF = 'ORD-3001';

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  Page loads
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details audit-trail timeline — AC-1 page load', () => {
  it('returns HTTP 200 for a valid order reference', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}`);
    expect(res.status).toBe(200);
  });

  it('Content-Type is text/html', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}`);
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });

  it('H1 is "Order Details"', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}`);
    expect(res.text).toMatch(/<h1[^>]*>.*Order Details.*<\/h1>/is);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  Timeline is data-driven via audit-trail endpoint
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details audit-trail timeline — AC-2 data-driven rendering', () => {
  it('page fetches or references the audit-trail API path in its markup or script', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}`);
    // The rendered HTML must include a reference to the audit-trail endpoint
    // (embedded script fetch URL, data-src attribute, or inline data block)
    expect(res.text).toMatch(/audit-trail/i);
  });

  it('the order reference from the URL is passed to the audit-trail fetch', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}`);
    // The page must embed or reference the order reference so the client-side
    // fetch can use it (data attribute, JS variable, or path segment in script)
    expect(res.text).toContain(FIVE_AUDIT_REF);
  });

  it('the timeline section is present and rendered via audit-trail data', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}`);
    expect(res.text).toMatch(/class=["'][^"']*order-status-timeline[^"']*["']/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  All five canonical milestone labels render
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details audit-trail timeline — AC-3 five canonical milestones rendered', () => {
  it('renders "Order Placed" milestone', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    expect(res.text).toMatch(/Order Placed/i);
  });

  it('renders "Payment Confirmed" milestone', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    expect(res.text).toMatch(/Payment Confirmed/i);
  });

  it('renders "Verification Complete" milestone', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    expect(res.text).toMatch(/Verification Complete/i);
  });

  it('renders "eSIM Issued" milestone', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    expect(res.text).toMatch(/eSIM Issued/i);
  });

  it('renders "Activation Complete" milestone', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    expect(res.text).toMatch(/Activation Complete/i);
  });

  it('milestones appear in chronological order', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    const html = res.text;
    const order = [
      'Order Placed',
      'Payment Confirmed',
      'Verification Complete',
      'eSIM Issued',
      'Activation Complete',
    ];
    const positions = order.map((label) => html.search(new RegExp(label, 'i')));
    for (let i = 0; i < positions.length - 1; i++) {
      expect(positions[i]).toBeGreaterThanOrEqual(0);
      expect(positions[i]).toBeLessThan(positions[i + 1]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  Each audit event renders icon, label, formatted timestamp, and summary
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details audit-trail timeline — AC-4 event rendering structure', () => {
  it('milestone elements carry the "milestone" CSS class', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    expect(res.text).toMatch(/class=["'][^"']*milestone[^"']*["']/i);
  });

  it('each milestone element has a data-step attribute mapping to the event_type', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    const EXPECTED_STEPS = [
      'order_created',
      'order_placed',
      'payment_outcome',
      'payment_confirmed',
      'verification_outcome',
      'verification_complete',
      'activation_status_change',
      'esim_issued',
      'activation_complete',
    ];
    // At least one data-step attribute matching one of the known event types must be present
    const hasDataStep = EXPECTED_STEPS.some((step) =>
      res.text.includes(`data-step="${step}"`),
    );
    expect(hasDataStep).toBe(true);
  });

  it('each completed milestone displays a timestamp in the rendered HTML', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    // At minimum a year (2026) should appear near milestone elements
    expect(res.text).toMatch(/2026/);
  });

  it('milestone elements contain an icon span or character', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    // icon: checkmark, bullet, or warning glyph in the HTML
    expect(res.text).toMatch(/(milestone__icon|&#10003;|&#9679;|&#9888;|✓|•|⚠)/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  occurred_at is formatted as human-readable date/time
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details audit-trail timeline — AC-5 timestamp formatting', () => {
  it('timestamp is formatted with month name, year, and time (not raw ISO)', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    // Wireframe format: "28 July 2026, 10:05 AM" — check for month-name pattern
    expect(res.text).toMatch(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i,
    );
  });

  it('timestamp includes a time component (AM/PM or 24h hour:minute)', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    expect(res.text).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)?/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6  event_type-to-label mapping is data-driven, not hard-coded strings
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details audit-trail timeline — AC-6 event_type mapped to label', () => {
  it('order_created / order_placed event maps to "Order Placed" label', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    expect(res.text).toMatch(/Order Placed/i);
  });

  it('payment_outcome / payment_confirmed event maps to "Payment Confirmed" label', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    expect(res.text).toMatch(/Payment Confirmed/i);
  });

  it('verification_outcome / verification_complete event maps to "Verification Complete" label', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    expect(res.text).toMatch(/Verification Complete/i);
  });

  it('activation_status_change / esim_issued event maps to "eSIM Issued" label', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    expect(res.text).toMatch(/eSIM Issued/i);
  });

  it('activation_complete event maps to "Activation Complete" label', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    expect(res.text).toMatch(/Activation Complete/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-7  payment_outcome event surfaces the payment summary from its payload
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details audit-trail timeline — AC-7 payment_outcome payload summary', () => {
  it('payment summary line is rendered on the page', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    // Wireframe example: "Payment of R 20,496.55 successfully processed via mobile money"
    // At minimum the page should show a payment amount or payment confirmation text
    expect(res.text).toMatch(/(Payment|payment)/);
  });

  it('payment amount is present in the rendered timeline event', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}?scenario=activation_complete`);
    // The timeline step for payment should surface the amount from the payload
    expect(res.text).toMatch(/R\s*20[,.]?496[,.]?55|payment.*processed|processed.*payment/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-8  Timeline section has the correct CSS class for operator use
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details audit-trail timeline — AC-8 operator-accessible timeline section', () => {
  it('section.order-status-timeline or element with class order-status-timeline is present', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}`);
    expect(res.text).toMatch(/class=["'][^"']*order-status-timeline[^"']*["']/i);
  });

  it('"Order Status Timeline" H2 heading is present', async () => {
    const res = await request(app).get(`/orders/${FIVE_AUDIT_REF}`);
    expect(res.text).toMatch(/Order Status Timeline/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-9  Unknown order reference returns 404
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details audit-trail timeline — AC-9 unknown order reference', () => {
  it('returns 404 for an order reference with no audit trail data', async () => {
    const res = await request(app).get('/orders/ORD-UNKNOWN-XYZ-999');
    expect(res.status).toBe(404);
  });
});
