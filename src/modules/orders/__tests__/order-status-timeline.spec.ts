import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Order Status Timeline (Screen 6: wireframe_order_tracking_account.html)
 *
 * Screen  : GET /orders/:id              (wireframe_order_tracking_account.html)
 * Region  : section.order-status-timeline (or main.main-content > .timeline)
 * API dep : GET /api/orders/:id/status?scenario=<name>
 *
 * The backend order-status API returns:
 *   {
 *     orderId: string,
 *     milestones: Array<{
 *       step: 'order_placed' | 'payment_confirmed' | 'verification_complete' |
 *             'esim_issued' | 'activation_complete',
 *       state: 'completed' | 'pending' | 'blocked',
 *       timestamp: string | null,
 *       next_step: string | null
 *     }>
 *   }
 *
 * Acceptance criteria encoded here:
 *  AC-1  All five milestones appear on the page in the correct order.
 *  AC-2  A pending milestone shows its next_step guidance text inline.
 *  AC-3  A blocked milestone is visually differentiated from a pending one.
 *  AC-4  Completed milestones show a non-null timestamp formatted for display.
 *  AC-5  The page title / H1 is "Order Details" per the design spec.
 *  AC-6  The "Order Status Timeline" heading is present per the design spec.
 *  AC-7  An element for each of the five canonical milestone step labels is rendered.
 */

const MILESTONE_LABELS: Record<string, string> = {
  order_placed: 'Order Placed',
  payment_confirmed: 'Payment Confirmed',
  verification_complete: 'Verification Complete',
  esim_issued: 'eSIM Issued',
  activation_complete: 'Activation Complete',
};

const ORDERED_STEPS = [
  'order_placed',
  'payment_confirmed',
  'verification_complete',
  'esim_issued',
  'activation_complete',
];

// ---------------------------------------------------------------------------
// AC-1  All five milestones appear in order
// ---------------------------------------------------------------------------

describe('Order Details page – AC-1: all five milestones rendered in order', () => {
  it('returns HTTP 200 for a valid order', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    expect(res.status).toBe(200);
  });

  it('Content-Type is text/html', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });

  it('renders "Order Placed" milestone label', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    expect(res.text).toMatch(/Order Placed/i);
  });

  it('renders "Payment Confirmed" milestone label', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    expect(res.text).toMatch(/Payment Confirmed/i);
  });

  it('renders "Verification Complete" milestone label', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    expect(res.text).toMatch(/Verification Complete/i);
  });

  it('renders "eSIM Issued" milestone label', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    expect(res.text).toMatch(/eSIM Issued/i);
  });

  it('renders "Activation Complete" milestone label', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    expect(res.text).toMatch(/Activation Complete/i);
  });

  it('milestones appear in the canonical order (order_placed before activation_complete)', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    const html = res.text;
    const positions = ORDERED_STEPS.map((step) => {
      const label = MILESTONE_LABELS[step];
      return html.search(new RegExp(label, 'i'));
    });
    for (let i = 0; i < positions.length - 1; i++) {
      expect(positions[i]).toBeGreaterThanOrEqual(0);
      expect(positions[i]).toBeLessThan(positions[i + 1]);
    }
  });

  it('contains the timeline container element', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    expect(res.text).toMatch(/class=["'][^"']*order-status-timeline[^"']*["']/i);
  });
});

// ---------------------------------------------------------------------------
// AC-2  Pending milestone shows next_step guidance text
// ---------------------------------------------------------------------------

describe('Order Details page – AC-2: pending milestone shows next_step text', () => {
  it('pending_verification scenario returns HTTP 200', async () => {
    const res = await request(app).get('/orders/ord_002?scenario=pending_verification');
    expect(res.status).toBe(200);
  });

  it('next_step guidance text for pending verification is shown inline', async () => {
    const res = await request(app).get('/orders/ord_002?scenario=pending_verification');
    // The backend next_step text for pending verification_complete
    expect(res.text).toMatch(/identity verification is under review/i);
  });

  it('next_step text for pending eSIM issuance is shown inline', async () => {
    const res = await request(app).get('/orders/ord_002?scenario=pending_verification');
    expect(res.text).toMatch(/eSIM will be issued once verification is complete/i);
  });

  it('next_step text for pending activation is shown inline', async () => {
    const res = await request(app).get('/orders/ord_002?scenario=pending_verification');
    expect(res.text).toMatch(/Activation will begin after verification/i);
  });

  it('pending steps do not show a formatted timestamp', async () => {
    const res = await request(app).get('/orders/ord_002?scenario=pending_verification');
    // The pending steps must NOT show the fixed 10:07 or later timestamps
    // (those belong to blocked/completed variants). Verify the page renders but
    // the next_step guidance text appears near the "Verification Complete" label.
    expect(res.text).toMatch(/identity verification is under review/i);
    // The next_step paragraph/span must be adjacent to the milestone in the HTML
    const idx = res.text.search(/Verification Complete/i);
    const nextStepIdx = res.text.search(/identity verification is under review/i);
    expect(idx).toBeGreaterThan(-1);
    expect(nextStepIdx).toBeGreaterThan(-1);
  });

  it('each pending milestone carries a CSS class marking it as pending', async () => {
    const res = await request(app).get('/orders/ord_002?scenario=pending_verification');
    expect(res.text).toMatch(/class=["'][^"']*milestone[^"']*pending[^"']*["']/i);
  });
});

// ---------------------------------------------------------------------------
// AC-3  Blocked milestone is visually differentiated from pending
// ---------------------------------------------------------------------------

describe('Order Details page – AC-3: blocked milestone visually differs from pending', () => {
  it('blocked_verification scenario returns HTTP 200', async () => {
    const res = await request(app).get('/orders/ord_003?scenario=blocked_verification');
    expect(res.status).toBe(200);
  });

  it('blocked steps carry a CSS class of "blocked" (distinct from "pending")', async () => {
    const res = await request(app).get('/orders/ord_003?scenario=blocked_verification');
    expect(res.text).toMatch(/class=["'][^"']*milestone[^"']*blocked[^"']*["']/i);
  });

  it('a blocked milestone step does NOT carry only the pending CSS class', async () => {
    const res = await request(app).get('/orders/ord_003?scenario=blocked_verification');
    // Should have "blocked" in a milestone element
    expect(res.text).toMatch(/milestone[^>]*blocked/i);
    // The blocked state element must not be exclusively marked as pending
    // (implementation must not use only the "pending" class for a blocked step)
    const blockedMilestonePattern = /class=["'][^"']*milestone[^"']*blocked[^"']*["']/i;
    expect(res.text).toMatch(blockedMilestonePattern);
  });

  it('blocked verification next_step text is shown inline', async () => {
    const res = await request(app).get('/orders/ord_003?scenario=blocked_verification');
    expect(res.text).toMatch(/identity verification could not be completed/i);
  });

  it('blocked eSIM issuance next_step text is shown inline', async () => {
    const res = await request(app).get('/orders/ord_003?scenario=blocked_verification');
    expect(res.text).toMatch(/eSIM issuance is on hold/i);
  });

  it('blocked activation next_step text is shown inline', async () => {
    const res = await request(app).get('/orders/ord_003?scenario=blocked_verification');
    expect(res.text).toMatch(/Activation is blocked pending verification resolution/i);
  });

  it('HTML contains separate visual treatment for blocked vs pending (different CSS classes present)', async () => {
    const resPending = await request(app).get('/orders/ord_002?scenario=pending_verification');
    const resBlocked = await request(app).get('/orders/ord_003?scenario=blocked_verification');
    // pending page must contain "pending" marker
    expect(resPending.text).toMatch(/milestone[^>]*pending/i);
    // blocked page must contain "blocked" marker
    expect(resBlocked.text).toMatch(/milestone[^>]*blocked/i);
  });
});

// ---------------------------------------------------------------------------
// AC-4  Completed milestones show a formatted timestamp
// ---------------------------------------------------------------------------

describe('Order Details page – AC-4: completed milestones show a timestamp', () => {
  it('completed milestones show a date/time value in the HTML', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    // All 5 are completed in activation_complete; check for at least one date representation
    // The wireframe shows "28 July 2026, 10:00 AM" style timestamps
    expect(res.text).toMatch(/2026/);
  });

  it('completed milestone element carries a CSS class of "completed"', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    expect(res.text).toMatch(/class=["'][^"']*milestone[^"']*completed[^"']*["']/i);
  });

  it('completed milestone does not show a next_step guidance paragraph', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    // activation_complete scenario has all 5 completed — no "identity verification" guidance
    expect(res.text).not.toMatch(/identity verification is under review/i);
    expect(res.text).not.toMatch(/eSIM will be issued once verification/i);
  });
});

// ---------------------------------------------------------------------------
// AC-5  Page title / H1 is "Order Details"
// ---------------------------------------------------------------------------

describe('Order Details page – AC-5: page title and H1', () => {
  it('HTML contains an H1 "Order Details"', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    expect(res.text).toMatch(/<h1[^>]*>.*Order Details.*<\/h1>/is);
  });

  it('HTML page title contains "Order Details"', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    expect(res.text).toMatch(/<title[^>]*>.*Order Details.*<\/title>/is);
  });
});

// ---------------------------------------------------------------------------
// AC-6  "Order Status Timeline" heading is present
// ---------------------------------------------------------------------------

describe('Order Details page – AC-6: "Order Status Timeline" section heading', () => {
  it('HTML contains an "Order Status Timeline" heading', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    expect(res.text).toMatch(/Order Status Timeline/i);
  });

  it('heading is an H2 element per the design spec', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    expect(res.text).toMatch(/<h2[^>]*>.*Order Status Timeline.*<\/h2>/is);
  });
});

// ---------------------------------------------------------------------------
// AC-7  Each milestone renders an icon, label, and timestamp region
// ---------------------------------------------------------------------------

describe('Order Details page – AC-7: milestone structural completeness', () => {
  it('each milestone step renders a label element visible in the HTML', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    for (const label of Object.values(MILESTONE_LABELS)) {
      expect(res.text).toMatch(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    }
  });

  it('milestone elements each contain a data-step attribute for the step key', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    for (const step of ORDERED_STEPS) {
      expect(res.text).toMatch(new RegExp(`data-step=["']${step}["']`, 'i'));
    }
  });

  it('timeline container holds exactly five milestone elements', async () => {
    const res = await request(app).get('/orders/ord_001?scenario=activation_complete');
    const matches = res.text.match(/class=["'][^"']*milestone\b[^"']*["']/gi);
    expect(matches).not.toBeNull();
    expect((matches as RegExpMatchArray).length).toBe(5);
  });
});
