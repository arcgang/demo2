import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Checkout page & Place Order wiring (Screen 3: wireframe_checkout_payment.html)
 *
 * Route    : GET /checkout
 * POST dep : POST /api/orders → 201 { orderReference, lineItems, onceOffTotal, monthlyTotal, nextSteps }
 * Redirect : POST success → GET /confirmation/:ref
 *
 * Acceptance criteria encoded here:
 *  AC-1  Checkout page loads (HTTP 200, text/html).
 *  AC-2  H1 heading is "Checkout".
 *  AC-3  3-step progress indicator (1 Cart, 2 Checkout, 3 Confirmation) is rendered.
 *  AC-4  Breadcrumb contains Home → Cart → Checkout segments.
 *  AC-5  All required customer-detail form fields are present with correct name attributes.
 *  AC-6  Payment method inputs (card fields) are present.
 *  AC-7  Terms & Consent checkboxes (terms required, marketing optional) are rendered.
 *  AC-8  "Place Order" button is present as a <button> element.
 *  AC-9  An ARIA live / alert region exists for inline error messaging.
 *  AC-10 Place Order button carries markup that supports a loading/disabled state.
 *  AC-11 Order Summary sidebar (aside.summary-card) with totals is present.
 *  AC-12 POST /api/orders with a valid payload returns HTTP 201 and an orderReference.
 *  AC-13 GET /confirmation/:ref returns HTTP 200 after a successful POST.
 *  AC-14 POST /api/orders returns HTTP 422 for an invalid (incomplete) payload.
 */

const CHECKOUT_URL = '/checkout';

const VALID_ORDER_PAYLOAD = {
  cartId: 'cart-checkout-ac-test-001',
  paymentAttemptId: 'pay-checkout-ac-test-001',
  paymentStatus: 'CONFIRMED',
  lineItems: [
    { name: 'iPhone 15 Pro 256GB', qty: 1, unitPrice: 18999 },
    { name: 'Silicone Case', qty: 1, unitPrice: 599 },
    { name: '20W USB-C Power Adapter', qty: 1, unitPrice: 399 },
  ],
  onceOffTotal: 20496.55,
  monthlyTotal: 799,
};

// ── AC-1: page loads ──────────────────────────────────────────────────────────

describe('Checkout page – AC-1: page load', () => {
  it('returns HTTP 200 for GET /checkout', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.status).toBe(200);
  });

  it('Content-Type is text/html', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });
});

// ── AC-2: H1 heading ─────────────────────────────────────────────────────────

describe('Checkout page – AC-2: H1 heading', () => {
  it('H1 heading is "Checkout"', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/<h1[^>]*>\s*Checkout\s*<\/h1>/i);
  });
});

// ── AC-3: 3-step progress indicator ──────────────────────────────────────────

describe('Checkout page – AC-3: 3-step progress indicator', () => {
  it('step "1 Cart" is rendered in the progress indicator', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/1\s*Cart/i);
  });

  it('step "2 Checkout" is rendered in the progress indicator', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/2\s*Checkout/i);
  });

  it('step "3 Confirmation" is rendered in the progress indicator', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/3\s*Confirmation/i);
  });
});

// ── AC-4: breadcrumb ─────────────────────────────────────────────────────────

describe('Checkout page – AC-4: breadcrumb navigation', () => {
  it('nav.breadcrumb element is present', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/class=["'][^"']*breadcrumb[^"']*["']/i);
  });

  it('"Home" breadcrumb link is present', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/href=["']\/["'][^>]*>Home/i);
  });

  it('"Cart" segment links to /cart in the breadcrumb', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/href=["']\/cart["'][^>]*>[\s\S]*?Cart/i);
  });

  it('"Checkout" segment is present in the breadcrumb', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/class=["'][^"']*breadcrumb[^"']*["'][\s\S]{0,500}Checkout/i);
  });
});

// ── AC-5: customer detail form fields ────────────────────────────────────────

describe('Checkout page – AC-5: customer detail form fields', () => {
  it('"1 Customer Details" section heading (H2) is present', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/<h2[^>]*>[\s\S]*?Customer Details[\s\S]*?<\/h2>/i);
  });

  it('first-name input is present and required', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/name=["']first-name["'][^>]*required|required[^>]*name=["']first-name["']/i);
  });

  it('last-name input is present and required', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/name=["']last-name["'][^>]*required|required[^>]*name=["']last-name["']/i);
  });

  it('email input is present and required', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/name=["']email["'][^>]*required|required[^>]*name=["']email["']/i);
  });

  it('phone input is present and required', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/name=["']phone["'][^>]*required|required[^>]*name=["']phone["']/i);
  });

  it('address input is present and required', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/name=["']address["'][^>]*required|required[^>]*name=["']address["']/i);
  });

  it('city input is present and required', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/name=["']city["'][^>]*required|required[^>]*name=["']city["']/i);
  });

  it('postal-code input is present and required', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/name=["']postal-code["'][^>]*required|required[^>]*name=["']postal-code["']/i);
  });
});

// ── AC-6: payment method fields ───────────────────────────────────────────────

describe('Checkout page – AC-6: payment method fields', () => {
  it('"2 Payment Method" section heading (H2) is present', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/<h2[^>]*>[\s\S]*?Payment Method[\s\S]*?<\/h2>/i);
  });

  it('payment-method radio inputs are present', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/name=["']payment-method["']/i);
  });

  it('card-number input is present', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/name=["']card-number["']/i);
  });

  it('expiry input is present', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/name=["']expiry["']/i);
  });

  it('cvv input is present', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/name=["']cvv["']/i);
  });

  it('cardholder-name input is present', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/name=["']cardholder-name["']/i);
  });
});

// ── AC-7: terms & consent checkboxes ─────────────────────────────────────────

describe('Checkout page – AC-7: terms and consent checkboxes', () => {
  it('"3 Terms & Consent" section heading (H2) is present', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/<h2[^>]*>[\s\S]*?Terms[\s\S]*?Consent[\s\S]*?<\/h2>/i);
  });

  it('terms checkbox is present and required', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/name=["']terms["'][^>]*required|required[^>]*name=["']terms["']/i);
  });

  it('marketing consent checkbox is present (optional)', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/name=["']marketing["']/i);
  });

  it('"Terms and Conditions" link is rendered', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/Terms and Conditions/i);
  });

  it('"Privacy Policy" link is rendered', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/Privacy Policy/i);
  });
});

// ── AC-8: Place Order button ──────────────────────────────────────────────────

describe('Checkout page – AC-8: Place Order button', () => {
  it('"Place Order" button element is rendered', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/<button[^>]*>[\s\S]*?Place Order[\s\S]*?<\/button>/i);
  });
});

// ── AC-9: ARIA error region for inline error messaging ────────────────────────

describe('Checkout page – AC-9: ARIA error / live region', () => {
  it('an element with role="alert" or aria-live is present for inline error messaging', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/(role=["']alert["']|aria-live=["'](assertive|polite)["'])/i);
  });
});

// ── AC-10: Place Order button — loading/disabled state support ────────────────

describe('Checkout page – AC-10: Place Order button supports loading state', () => {
  it('Place Order button or form has an id, aria-busy, or data attribute enabling loading-state control', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    // Any of: id="place-order", aria-busy, data-loading, data-submitting signal the JS harness can target it
    expect(res.text).toMatch(
      /(id=["']place-order["']|aria-busy=|data-loading=|data-submitting=)/i,
    );
  });
});

// ── AC-11: Order Summary sidebar ──────────────────────────────────────────────

describe('Checkout page – AC-11: Order Summary sidebar', () => {
  it('"Order Summary" heading is present', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/Order Summary/i);
  });

  it('aside.summary-card element is present', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/class=["'][^"']*summary-card[^"']*["']/i);
  });

  it('"Once-Off Subtotal" line item is present in the summary', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/Once-Off Subtotal/i);
  });

  it('"Monthly Plan" line item is present in the summary', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/Monthly Plan/i);
  });
});

// ── AC-12: POST /api/orders returns 201 + orderReference ─────────────────────

describe('Checkout page – AC-12: POST /api/orders creates an order', () => {
  it('POST /api/orders with a valid payload returns HTTP 201', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send(VALID_ORDER_PAYLOAD);
    expect(res.status).toBe(201);
  });

  it('POST /api/orders response body includes a non-empty orderReference string', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send(VALID_ORDER_PAYLOAD);
    expect(res.body.orderReference).toBeDefined();
    expect(typeof res.body.orderReference).toBe('string');
    expect(res.body.orderReference.length).toBeGreaterThan(0);
  });

  it('POST /api/orders response body includes a nextSteps array with at least one entry', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send(VALID_ORDER_PAYLOAD);
    expect(Array.isArray(res.body.nextSteps)).toBe(true);
    expect(res.body.nextSteps.length).toBeGreaterThan(0);
  });

  it('POST /api/orders response body includes the lineItems array', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send(VALID_ORDER_PAYLOAD);
    expect(Array.isArray(res.body.lineItems)).toBe(true);
    expect(res.body.lineItems.length).toBe(VALID_ORDER_PAYLOAD.lineItems.length);
  });

  it('POST /api/orders response body includes onceOffTotal and monthlyTotal', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send(VALID_ORDER_PAYLOAD);
    expect(res.body.onceOffTotal).toBe(VALID_ORDER_PAYLOAD.onceOffTotal);
    expect(res.body.monthlyTotal).toBe(VALID_ORDER_PAYLOAD.monthlyTotal);
  });
});

// ── AC-13: confirmation page accessible at /confirmation/:ref after POST ──────

describe('Checkout page – AC-13: /confirmation/:ref reachable after POST', () => {
  it('GET /confirmation/:ref returns HTTP 200 after a successful order POST', async () => {
    const postRes = await request(app)
      .post('/api/orders')
      .send(VALID_ORDER_PAYLOAD);
    expect(postRes.status).toBe(201);
    const { orderReference } = postRes.body;
    const confirmRes = await request(app).get(`/confirmation/${orderReference}`);
    expect(confirmRes.status).toBe(200);
  });

  it('confirmation page Content-Type is text/html', async () => {
    const postRes = await request(app)
      .post('/api/orders')
      .send(VALID_ORDER_PAYLOAD);
    const { orderReference } = postRes.body;
    const confirmRes = await request(app).get(`/confirmation/${orderReference}`);
    expect(confirmRes.headers['content-type']).toMatch(/text\/html/i);
  });
});

// ── AC-14: POST /api/orders returns 422 for invalid payload ──────────────────

describe('Checkout page – AC-14: POST /api/orders validates payload', () => {
  it('POST /api/orders with missing cartId returns HTTP 422', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        paymentAttemptId: 'pay-001',
        paymentStatus: 'CONFIRMED',
        lineItems: [{ name: 'Test', qty: 1, unitPrice: 100 }],
        onceOffTotal: 100,
        monthlyTotal: 0,
      });
    expect(res.status).toBe(422);
  });

  it('POST /api/orders with empty lineItems array returns HTTP 422', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        cartId: 'cart-001',
        paymentAttemptId: 'pay-001',
        paymentStatus: 'CONFIRMED',
        lineItems: [],
        onceOffTotal: 0,
        monthlyTotal: 0,
      });
    expect(res.status).toBe(422);
  });
});
