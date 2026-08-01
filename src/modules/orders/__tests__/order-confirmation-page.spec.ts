import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Order Confirmation page (/confirmation/:ref)
 *
 * Route   : GET /confirmation/:ref
 * API dep : POST /api/orders → 201 { orderReference, lineItems, onceOffTotal, monthlyTotal, nextSteps }
 *
 * Acceptance criteria encoded here:
 *  AC-1  Confirmation page loads (HTTP 200, text/html) for a real order reference.
 *  AC-2  Order reference is displayed prominently (e.g. "Order ORD-xxxx confirmed").
 *  AC-3  Line-item summary is present (product names, quantities, once-off total, monthly charge).
 *  AC-4  Next-steps section lists each fulfilment/activation milestone with status and estimated time.
 *  AC-5  Async messaging makes clear activation continues without customer action.
 *  AC-6  Breadcrumb trail: Home → Cart → Checkout → Confirmation.
 *  AC-7  "Track my order" link points to /orders/:ref.
 *  AC-8  "Back to Cart" navigation link points to /cart.
 *  AC-9  WCAG 2.1 AA — status/loading regions use ARIA roles or live regions.
 *  AC-10 GET /confirmation/:ref for an unknown reference returns HTTP 404 (or a clear not-found page).
 */

// ---------------------------------------------------------------------------
// Helper: create a fresh order and return its reference
// ---------------------------------------------------------------------------

async function createOrder(): Promise<string> {
  const res = await request(app)
    .post('/api/orders')
    .send({
      cartId: 'cart-confirm-ac-001',
      paymentAttemptId: 'pay-confirm-ac-001',
      paymentStatus: 'CONFIRMED',
      lineItems: [
        { name: 'iPhone 15 Pro 256GB', qty: 1, unitPrice: 18999 },
        { name: 'Silicone Case', qty: 1, unitPrice: 599 },
        { name: '20W USB-C Power Adapter', qty: 1, unitPrice: 399 },
      ],
      onceOffTotal: 20496.55,
      monthlyTotal: 799,
    });
  expect(res.status).toBe(201);
  return res.body.orderReference as string;
}

// ── AC-1: page loads ──────────────────────────────────────────────────────────

describe('Order Confirmation page – AC-1: page load', () => {
  it('returns HTTP 200 for GET /confirmation/:ref after a successful order POST', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.status).toBe(200);
  });

  it('Content-Type is text/html', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });
});

// ── AC-2: order reference displayed prominently ───────────────────────────────

describe('Order Confirmation page – AC-2: order reference display', () => {
  it('order reference appears in the page body', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.text).toContain(ref);
  });

  it('"confirmed" word appears near the order reference (e.g. "Order ORD-xxxx confirmed")', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    // The reference and "confirmed" must both appear in the HTML
    expect(res.text).toContain(ref);
    expect(res.text).toMatch(/confirmed/i);
  });

  it('order reference is displayed within a heading element (H1 or H2)', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    // The ref must appear inside <h1> or <h2> tags
    expect(res.text).toMatch(new RegExp(`<h[12][^>]*>[^<]*${ref}[^<]*<\/h[12]>`, 'i'));
  });
});

// ── AC-3: line-item summary ───────────────────────────────────────────────────

describe('Order Confirmation page – AC-3: line-item summary', () => {
  it('line-item product names from the order are present in the page', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.text).toMatch(/iPhone 15 Pro 256GB/i);
    expect(res.text).toMatch(/Silicone Case/i);
    expect(res.text).toMatch(/20W USB-C Power Adapter/i);
  });

  it('quantity value is shown for each line item', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    // qty 1 must appear in the line-item table/list (e.g. "Qty: 1" or just "1")
    expect(res.text).toMatch(/(Qty|qty|Quantity|quantity)\s*[:]\s*1/i);
  });

  it('once-off total is shown in the summary', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    // 20496.55 → rendered as "20,496.55" or "20496.55"
    expect(res.text).toMatch(/20[,.]?496[,.]?55/);
  });

  it('monthly plan charge is shown in the summary', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    // monthlyTotal: 799 → rendered as "R 799" or "799.00"
    expect(res.text).toMatch(/R\s*799|799\.00/i);
  });

  it('a once-off charges or line-item summary section is present', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.text).toMatch(/(Once-Off|once-off|line.item|Line.Item|order.summary|Order.Summary)/i);
  });
});

// ── AC-4: next-steps section with fulfilment milestones ───────────────────────

describe('Order Confirmation page – AC-4: next-steps fulfilment milestones', () => {
  it('a "next steps" or "what happens next" section is present', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.text).toMatch(/(next.step|next step|what happen|what's next|fulfilment|fulfillment)/i);
  });

  it('"eSIM issuance" milestone step is listed', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.text).toMatch(/eSIM\s*(issuance|issue)/i);
  });

  it('"activation" milestone step is listed', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.text).toMatch(/activation/i);
  });

  it('each milestone step includes a status value', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    // The nextSteps returned by the API have status "pending"; it must appear near the milestones
    expect(res.text).toMatch(/pending/i);
  });

  it('each milestone step includes an estimated time', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    // API returns estimatedMinutes (5 or 10); page must surface the time value
    expect(res.text).toMatch(/(\d+\s*minute|\d+\s*min)/i);
  });
});

// ── AC-5: async activation messaging ─────────────────────────────────────────

describe('Order Confirmation page – AC-5: async activation messaging', () => {
  it('page conveys that activation continues without customer action', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    // Must include language like "no action needed", "automatically", "approximately X minutes"
    expect(res.text).toMatch(
      /(no action needed|no action required|automatically|approximately|will be issued|will be activated)/i,
    );
  });

  it('eSIM issuance estimated time (~5 minutes) is mentioned', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.text).toMatch(/5\s*minute/i);
  });
});

// ── AC-6: breadcrumb trail ────────────────────────────────────────────────────

describe('Order Confirmation page – AC-6: breadcrumb trail', () => {
  it('nav.breadcrumb element is present', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.text).toMatch(/class=["'][^"']*breadcrumb[^"']*["']/i);
  });

  it('"Home" breadcrumb segment is present', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.text).toMatch(/breadcrumb[\s\S]{0,600}Home/i);
  });

  it('"Cart" breadcrumb segment is present', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.text).toMatch(/breadcrumb[\s\S]{0,600}Cart/i);
  });

  it('"Checkout" breadcrumb segment is present', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.text).toMatch(/breadcrumb[\s\S]{0,600}Checkout/i);
  });

  it('"Confirmation" breadcrumb segment is present', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.text).toMatch(/breadcrumb[\s\S]{0,600}Confirmation/i);
  });

  it('breadcrumb segments appear in the correct order: Home before Cart before Checkout before Confirmation', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    const html = res.text;
    const breadcrumbStart = html.search(/class=["'][^"']*breadcrumb[^"']*["']/i);
    expect(breadcrumbStart).toBeGreaterThan(-1);
    const breadcrumb = html.slice(breadcrumbStart, breadcrumbStart + 800);
    const homePos = breadcrumb.search(/\bHome\b/i);
    const cartPos = breadcrumb.search(/\bCart\b/i);
    const checkoutPos = breadcrumb.search(/\bCheckout\b/i);
    const confirmPos = breadcrumb.search(/\bConfirmation\b/i);
    expect(homePos).toBeGreaterThanOrEqual(0);
    expect(cartPos).toBeGreaterThan(homePos);
    expect(checkoutPos).toBeGreaterThan(cartPos);
    expect(confirmPos).toBeGreaterThan(checkoutPos);
  });
});

// ── AC-7: "Track my order" link ───────────────────────────────────────────────

describe('Order Confirmation page – AC-7: "Track my order" link', () => {
  it('"Track my order" link is present on the confirmation page', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.text).toMatch(/Track\s*(my\s*)?order/i);
  });

  it('"Track my order" link points to /orders/:ref', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.text).toMatch(new RegExp(`href=["']/orders/${ref}["']`, 'i'));
  });
});

// ── AC-8: back-navigation to /cart ───────────────────────────────────────────

describe('Order Confirmation page – AC-8: back-navigation to /cart', () => {
  it('a link to /cart is present on the confirmation page', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.text).toMatch(/href=["']\/cart["']/i);
  });
});

// ── AC-9: WCAG 2.1 AA — ARIA for status, loading, error regions ───────────────

describe('Order Confirmation page – AC-9: WCAG 2.1 AA ARIA accessibility', () => {
  it('page carries a role="status", role="alert", or aria-live region for status messaging', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.text).toMatch(
      /(role=["'](status|alert)["']|aria-live=["'](polite|assertive)["'])/i,
    );
  });

  it('page lang attribute is set (root <html lang=...>)', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.text).toMatch(/<html[^>]+lang=["'][a-z-]+["']/i);
  });

  it('page has a <title> element containing "Confirmation"', async () => {
    const ref = await createOrder();
    const res = await request(app).get(`/confirmation/${ref}`);
    expect(res.text).toMatch(/<title[^>]*>[\s\S]*Confirmation[\s\S]*<\/title>/i);
  });
});

// ── AC-10: unknown reference returns 404 ─────────────────────────────────────

describe('Order Confirmation page – AC-10: unknown reference handling', () => {
  it('GET /confirmation/UNKNOWN-REF returns HTTP 404', async () => {
    const res = await request(app).get('/confirmation/UNKNOWN-REF-DOES-NOT-EXIST');
    expect(res.status).toBe(404);
  });
});
