import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Order Details page: Status Timeline driven by live order data
 *
 * Screen  : GET /orders/:id                     (wireframe_order_tracking_account.html)
 * Endpoint: POST /orders/:id/esim/issue          (issuance stores timestamps used by timeline)
 *
 * The Status Timeline section must reflect the five-step milestone sequence:
 *   Order Placed → Payment Confirmed → Verification Complete → eSIM Issued
 *   → Activation Complete
 *
 * Each milestone must be timestamped from the ActivationStatus/Order record
 * when called WITHOUT the ?scenario= stub parameter — the page must read live
 * order and activation state, not fall back to a hardcoded scenario.
 *
 * Acceptance criteria:
 *  AC-1  All five milestone labels appear in the correct sequence (scenario stub OK).
 *  AC-2  When called without ?scenario=, the page derives milestone state from the
 *        actual persisted order + activation records.
 *  AC-3  After successful eSIM issuance via POST, the "eSIM Issued" milestone is
 *        marked completed with a timestamp drawn from the activation record.
 *  AC-4  An order whose payment has not been confirmed shows "Payment Confirmed"
 *        as NOT completed when the page is loaded without ?scenario=.
 *  AC-5  An order whose verification has not been completed shows
 *        "Verification Complete" as NOT completed (no ?scenario=).
 *  AC-6  The page H2 heading "Order Status Timeline" is present.
 *  AC-7  The page H1 is "Order Details".
 *  AC-8  Milestone elements carry data-step attributes for all five canonical steps.
 *  AC-9  The timeline container holds exactly five milestone elements.
 *  AC-10 Completed milestone elements carry a CSS class containing "completed".
 *  AC-11 Pending/blocked milestone elements do NOT carry the "completed" CSS class.
 *  AC-12 Completed milestones show a formatted timestamp from the activation/order
 *        record (not a static hardcoded value).
 */

// ─── milestone constants ─────────────────────────────────────────────────────

const ORDERED_STEPS = [
  'order_placed',
  'payment_confirmed',
  'verification_complete',
  'esim_issued',
  'activation_complete',
] as const;

const MILESTONE_LABELS: Record<string, string> = {
  order_placed:          'Order Placed',
  payment_confirmed:     'Payment Confirmed',
  verification_complete: 'Verification Complete',
  esim_issued:           'eSIM Issued',
  activation_complete:   'Activation Complete',
};

// ─── helpers ─────────────────────────────────────────────────────────────────

async function getOrderPage(
  orderId: string,
  scenario?: string,
): Promise<{ status: number; text: string }> {
  const url = scenario
    ? `/orders/${orderId}?scenario=${scenario}`
    : `/orders/${orderId}`;
  const res = await request(app).get(url);
  return { status: res.status, text: res.text };
}

async function issueEsim(orderId: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await request(app).post(`/orders/${orderId}/esim/issue`);
  return { status: res.status, body: res.body as Record<string, unknown> };
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  All five milestone labels appear in the correct sequence (scenario stub)
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details page – AC-1: all five milestones appear in order', () => {
  it('page returns HTTP 200', async () => {
    const { status } = await getOrderPage('ord_timeline_001', 'activation_complete');
    expect(status).toBe(200);
  });

  it('Content-Type is text/html', async () => {
    const res = await request(app).get('/orders/ord_timeline_001?scenario=activation_complete');
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });

  it('renders "Order Placed" milestone label', async () => {
    const { text } = await getOrderPage('ord_timeline_001', 'activation_complete');
    expect(text).toMatch(/Order Placed/i);
  });

  it('renders "Payment Confirmed" milestone label', async () => {
    const { text } = await getOrderPage('ord_timeline_001', 'activation_complete');
    expect(text).toMatch(/Payment Confirmed/i);
  });

  it('renders "Verification Complete" milestone label', async () => {
    const { text } = await getOrderPage('ord_timeline_001', 'activation_complete');
    expect(text).toMatch(/Verification Complete/i);
  });

  it('renders "eSIM Issued" milestone label', async () => {
    const { text } = await getOrderPage('ord_timeline_001', 'activation_complete');
    expect(text).toMatch(/eSIM Issued/i);
  });

  it('renders "Activation Complete" milestone label', async () => {
    const { text } = await getOrderPage('ord_timeline_001', 'activation_complete');
    expect(text).toMatch(/Activation Complete/i);
  });

  it('milestone labels appear in the canonical five-step sequence', async () => {
    const { text } = await getOrderPage('ord_timeline_001', 'activation_complete');
    const positions = ORDERED_STEPS.map((step) => {
      const label = MILESTONE_LABELS[step];
      return text.search(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    });
    for (let i = 0; i < positions.length - 1; i++) {
      expect(positions[i]).toBeGreaterThanOrEqual(0);
      expect(positions[i]).toBeLessThan(positions[i + 1]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  Without ?scenario= the page derives milestone state from live order data
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details page – AC-2: live-data path (no scenario param)', () => {
  it('page returns HTTP 200 when loaded without ?scenario=', async () => {
    // Pre-seeded order "ord_live_001" must exist in the orders store.
    const { status } = await getOrderPage('ord_live_001');
    expect(status).toBe(200);
  });

  it('all five milestone labels are still present without ?scenario=', async () => {
    const { text } = await getOrderPage('ord_live_001');
    for (const label of Object.values(MILESTONE_LABELS)) {
      expect(text).toMatch(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    }
  });

  it('an order with PAYMENT_PENDING shows "Payment Confirmed" milestone as NOT completed (no scenario)', async () => {
    // ord_pay_pending has paymentStatus=PENDING. Without a scenario param the
    // router MUST read from the order store, not fall back to activation_complete.
    const { text } = await getOrderPage('ord_pay_pending');
    const payIdx = text.search(/data-step=["']payment_confirmed["']/i);
    expect(payIdx).toBeGreaterThan(-1);
    const surroundingHtml = text.slice(Math.max(0, payIdx - 200), payIdx + 50);
    // Must NOT be marked completed
    expect(surroundingHtml).not.toMatch(/class=["'][^"']*milestone[^"']*completed[^"']*["']/i);
  });

  it('an order with VERIFICATION_PENDING shows "Verification Complete" as NOT completed (no scenario)', async () => {
    // ord_ver_pending has paymentStatus=CONFIRMED, verificationStatus=PENDING_REVIEW.
    const { text } = await getOrderPage('ord_ver_pending');
    const verIdx = text.search(/data-step=["']verification_complete["']/i);
    expect(verIdx).toBeGreaterThan(-1);
    const surroundingHtml = text.slice(Math.max(0, verIdx - 200), verIdx + 50);
    expect(surroundingHtml).not.toMatch(/class=["'][^"']*milestone[^"']*completed[^"']*["']/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  After POST issuance, "eSIM Issued" milestone is completed with timestamp
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details page – AC-3: "eSIM Issued" milestone completed after issuance', () => {
  it('POST /orders/:id/esim/issue succeeds for ord_issued_live', async () => {
    const { status } = await issueEsim('ord_issued_live');
    expect(status).toBe(200);
  });

  it('"eSIM Issued" milestone is marked completed after issuance (no scenario param)', async () => {
    await issueEsim('ord_issued_live');
    const { text } = await getOrderPage('ord_issued_live');
    // The esim_issued milestone must carry the "completed" class
    const esimlIdx = text.search(/data-step=["']esim_issued["']/i);
    expect(esimlIdx).toBeGreaterThan(-1);
    const surroundingHtml = text.slice(Math.max(0, esimlIdx - 200), esimlIdx + 50);
    expect(surroundingHtml).toMatch(/class=["'][^"']*milestone[^"']*completed[^"']*["']/i);
  });

  it('"eSIM Issued" milestone shows a timestamp derived from the activation record', async () => {
    await issueEsim('ord_issued_live');
    const { text } = await getOrderPage('ord_issued_live');
    const esimlIdx = text.search(/eSIM Issued/i);
    expect(esimlIdx).toBeGreaterThan(-1);
    // A non-hardcoded year value must appear near the "eSIM Issued" label
    const segment = text.slice(esimlIdx, esimlIdx + 400);
    expect(segment).toMatch(/\d{4}/); // some 4-digit year
  });

  it('"eSIM Issued" milestone timestamp is not the static stub timestamp', async () => {
    await issueEsim('ord_issued_live');
    const { text } = await getOrderPage('ord_issued_live');
    // The static stub timestamps are '2026-07-28T09:25:00Z' (activation_complete)
    // The live timestamp comes from the activation store updatedAt field and must
    // not match the hardcoded stub value.
    expect(text).not.toContain('2026-07-28T09:25:00Z');
  });

  it('"eSIM Issued" milestone is NOT completed when the order has not been issued (no scenario)', async () => {
    // ord_not_yet_issued exists with both gates CONFIRMED but issuance not called
    const { text } = await getOrderPage('ord_not_yet_issued');
    const esimlIdx = text.search(/data-step=["']esim_issued["']/i);
    expect(esimlIdx).toBeGreaterThan(-1);
    const surroundingHtml = text.slice(Math.max(0, esimlIdx - 200), esimlIdx + 50);
    expect(surroundingHtml).not.toMatch(/class=["'][^"']*milestone[^"']*completed[^"']*["']/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  "Payment Confirmed" not completed when order has PAYMENT_PENDING
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details page – AC-4: "Payment Confirmed" reflects live payment status', () => {
  it('"Payment Confirmed" is pending/blocked for an order with PAYMENT_PENDING (no scenario)', async () => {
    const { text } = await getOrderPage('ord_pay_pending');
    const payIdx = text.search(/data-step=["']payment_confirmed["']/i);
    expect(payIdx).toBeGreaterThan(-1);
    const surroundingHtml = text.slice(Math.max(0, payIdx - 200), payIdx + 50);
    expect(surroundingHtml).toMatch(/class=["'][^"']*milestone[^"']*(?:pending|blocked)[^"']*["']/i);
  });

  it('"Payment Confirmed" is completed for an order with PAYMENT_CONFIRMED (no scenario)', async () => {
    const { text } = await getOrderPage('ord_ver_pending');
    // ord_ver_pending has CONFIRMED payment but PENDING verification
    const payIdx = text.search(/data-step=["']payment_confirmed["']/i);
    expect(payIdx).toBeGreaterThan(-1);
    const surroundingHtml = text.slice(Math.max(0, payIdx - 200), payIdx + 50);
    expect(surroundingHtml).toMatch(/class=["'][^"']*milestone[^"']*completed[^"']*["']/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  "Verification Complete" reflects live verification status
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details page – AC-5: "Verification Complete" reflects live verification status', () => {
  it('"Verification Complete" is not completed for PENDING_REVIEW verification (no scenario)', async () => {
    const { text } = await getOrderPage('ord_ver_pending');
    const verIdx = text.search(/data-step=["']verification_complete["']/i);
    expect(verIdx).toBeGreaterThan(-1);
    const surroundingHtml = text.slice(Math.max(0, verIdx - 200), verIdx + 50);
    expect(surroundingHtml).not.toMatch(/class=["'][^"']*milestone[^"']*completed[^"']*["']/i);
  });

  it('"Verification Complete" is completed for COMPLETED verification (after issuance)', async () => {
    await issueEsim('ord_issued_live');
    const { text } = await getOrderPage('ord_issued_live');
    const verIdx = text.search(/data-step=["']verification_complete["']/i);
    expect(verIdx).toBeGreaterThan(-1);
    const surroundingHtml = text.slice(Math.max(0, verIdx - 200), verIdx + 50);
    expect(surroundingHtml).toMatch(/class=["'][^"']*milestone[^"']*completed[^"']*["']/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6  "Order Status Timeline" H2 heading
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details page – AC-6: "Order Status Timeline" heading', () => {
  it('page contains an H2 "Order Status Timeline"', async () => {
    const { text } = await getOrderPage('ord_timeline_001', 'activation_complete');
    expect(text).toMatch(/<h2[^>]*>.*Order Status Timeline.*<\/h2>/is);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-7  Page H1 is "Order Details"
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details page – AC-7: H1 is "Order Details"', () => {
  it('page contains an H1 "Order Details"', async () => {
    const { text } = await getOrderPage('ord_timeline_001', 'activation_complete');
    expect(text).toMatch(/<h1[^>]*>.*Order Details.*<\/h1>/is);
  });

  it('page title contains "Order Details"', async () => {
    const { text } = await getOrderPage('ord_timeline_001', 'activation_complete');
    expect(text).toMatch(/<title[^>]*>.*Order Details.*<\/title>/is);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-8  data-step attributes for all five canonical steps
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details page – AC-8: data-step attributes on milestone elements', () => {
  for (const step of ORDERED_STEPS) {
    it(`milestone element has data-step="${step}"`, async () => {
      const { text } = await getOrderPage('ord_timeline_001', 'activation_complete');
      expect(text).toMatch(new RegExp(`data-step=["']${step}["']`, 'i'));
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-9  Exactly five milestone elements in the timeline container
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details page – AC-9: exactly five milestone elements', () => {
  it('timeline container contains exactly five milestone elements', async () => {
    const { text } = await getOrderPage('ord_timeline_001', 'activation_complete');
    const matches = text.match(/class=["'][^"']*\bmilestone\b[^"']*["']/gi);
    expect(matches).not.toBeNull();
    expect((matches as RegExpMatchArray).length).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-10  Completed milestones carry the "completed" CSS class
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details page – AC-10: completed milestones carry "completed" CSS class', () => {
  it('at least one milestone element has class "completed" in activation_complete scenario', async () => {
    const { text } = await getOrderPage('ord_timeline_001', 'activation_complete');
    expect(text).toMatch(/class=["'][^"']*milestone[^"']*completed[^"']*["']/i);
  });

  it('all five milestones have "completed" class in activation_complete scenario', async () => {
    const { text } = await getOrderPage('ord_timeline_001', 'activation_complete');
    const completedMatches = text.match(/class=["'][^"']*milestone[^"']*completed[^"']*["']/gi);
    expect(completedMatches).not.toBeNull();
    expect((completedMatches as RegExpMatchArray).length).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-11  Pending/blocked milestones do NOT carry the "completed" CSS class
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details page – AC-11: pending/blocked milestones not marked "completed"', () => {
  it('pending milestone elements carry class "pending"', async () => {
    const { text } = await getOrderPage('ord_timeline_002', 'pending_verification');
    expect(text).toMatch(/class=["'][^"']*milestone[^"']*pending[^"']*["']/i);
  });

  it('blocked milestone elements carry class "blocked"', async () => {
    const { text } = await getOrderPage('ord_timeline_003', 'blocked_verification');
    expect(text).toMatch(/class=["'][^"']*milestone[^"']*blocked[^"']*["']/i);
  });

  it('in pending_verification exactly 2 milestones are "completed" and 3 are not', async () => {
    const { text } = await getOrderPage('ord_timeline_002', 'pending_verification');
    const allMilestones = text.match(/class=["'][^"']*\bmilestone\b[^"']*["']/gi) ?? [];
    const completedMilestones = text.match(/class=["'][^"']*milestone[^"']*completed[^"']*["']/gi) ?? [];
    expect(allMilestones.length).toBe(5);
    expect(completedMilestones.length).toBe(2);
  });

  it('next_step guidance text is shown for pending milestones', async () => {
    const { text } = await getOrderPage('ord_timeline_002', 'pending_verification');
    expect(text).toMatch(/identity verification is under review/i);
    expect(text).toMatch(/eSIM will be issued once verification is complete/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-12  Completed milestones show a formatted timestamp from activation/order record
// ─────────────────────────────────────────────────────────────────────────────

describe('Order Details page – AC-12: timestamps from live activation/order records', () => {
  it('completed milestone timestamp is formatted for display (contains a year)', async () => {
    const { text } = await getOrderPage('ord_timeline_001', 'activation_complete');
    expect(text).toMatch(/2026/);
  });

  it('after live issuance the "eSIM Issued" timestamp is taken from the activation record updatedAt', async () => {
    await issueEsim('ord_issued_live');
    const { text } = await getOrderPage('ord_issued_live');
    const esimlIdx = text.search(/eSIM Issued/i);
    expect(esimlIdx).toBeGreaterThan(-1);
    // A year must appear within 400 chars after the "eSIM Issued" label
    const segment = text.slice(esimlIdx, esimlIdx + 400);
    expect(segment).toMatch(/\d{4}/);
  });

  it('"eSIM Issued" timestamp differs from the stub activation_complete scenario timestamp', async () => {
    await issueEsim('ord_issued_live');
    const liveText = (await getOrderPage('ord_issued_live')).text;
    // Stub says '2026-07-28T09:25:00Z' → formatted as something with 25 and July
    // The live record's updatedAt is set by the activation service at call time.
    // The static stub value must not appear verbatim in the live-path response.
    const stubFormattedTimestamp = '09:25'; // part of the formatted stub timestamp
    expect(liveText).not.toContain(stubFormattedTimestamp);
  });
});
