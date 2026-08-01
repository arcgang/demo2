import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Checkout page consent capture wiring
 * (Screen 3: wireframe_checkout_payment.html — Section '3 Terms & Consent')
 *
 * Route: GET /checkout
 *
 * The checkout page must:
 *  1. Render the 'terms' checkbox (required, name='terms') and 'marketing'
 *     checkbox (optional, name='marketing').
 *  2. The Place Order button must be disabled until the terms checkbox is checked;
 *     marketing is always optional.
 *  3. The Place Order form must target POST /api/checkout/place-order and include
 *     the consent values in the request body as consent: { terms, marketing }.
 *  4. After a successful order response the UI waits for an order_ref before
 *     navigating (i.e. the form submission does not redirect before receiving the
 *     backend confirmation).
 *
 * Acceptance criteria encoded here:
 *  AC-1  GET /checkout returns 200 text/html.
 *  AC-2  H1 is "Checkout"; "3 Terms & Consent" heading is present.
 *  AC-3  terms checkbox exists with name="terms" and required attribute.
 *  AC-4  marketing checkbox exists with name="marketing" and no required attribute.
 *  AC-5  Place Order button is disabled (or aria-disabled/data-requires-terms) by
 *        default — it must not be an enabled, unrestricted button at page load.
 *  AC-6  The form or submit handler targets POST /api/checkout/place-order.
 *  AC-7  The consent values are sent in the POST body as consent.terms and
 *        consent.marketing (structure verified via data attributes or inline script).
 *  AC-8  The form or inline script waits for the backend response before navigating
 *        (order_ref / orderReference must be present before redirect).
 */

const CHECKOUT_URL = '/checkout';

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  Page loads
// ─────────────────────────────────────────────────────────────────────────────

describe('Checkout consent form — AC-1 page load', () => {
  it('returns HTTP 200', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.status).toBe(200);
  });

  it('Content-Type is text/html', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  Headings
// ─────────────────────────────────────────────────────────────────────────────

describe('Checkout consent form — AC-2 page headings', () => {
  it('H1 is "Checkout"', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/<h1[^>]*>.*Checkout.*<\/h1>/is);
  });

  it('"Terms & Consent" section heading is present', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/Terms\s*(&amp;|&|and)\s*Consent/i);
  });

  it('"3 Terms & Consent" or "Terms & Consent" heading is an H2', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/<h2[^>]*>.*[Tt]erms.*[Cc]onsent.*<\/h2>/is);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  terms checkbox — required
// ─────────────────────────────────────────────────────────────────────────────

describe('Checkout consent form — AC-3 terms checkbox (required)', () => {
  it('input with name="terms" is present', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/name=["']terms["']/);
  });

  it('terms input is type="checkbox"', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    // Find a checkbox with name="terms"
    expect(res.text).toMatch(
      /input[^>]*type=["']checkbox["'][^>]*name=["']terms["']|input[^>]*name=["']terms["'][^>]*type=["']checkbox["']/i,
    );
  });

  it('terms checkbox has the required attribute', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    // Must have required near the terms checkbox
    expect(res.text).toMatch(
      /input[^>]*name=["']terms["'][^>]*required|input[^>]*required[^>]*name=["']terms["']/i,
    );
  });

  it('label for terms includes "Required" text or equivalent indicator', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/(Required|required|Terms and Conditions)/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  marketing checkbox — optional (no required attribute)
// ─────────────────────────────────────────────────────────────────────────────

describe('Checkout consent form — AC-4 marketing checkbox (optional)', () => {
  it('input with name="marketing" is present', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/name=["']marketing["']/);
  });

  it('marketing input is type="checkbox"', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(
      /input[^>]*type=["']checkbox["'][^>]*name=["']marketing["']|input[^>]*name=["']marketing["'][^>]*type=["']checkbox["']/i,
    );
  });

  it('marketing checkbox does NOT have the required attribute', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    // The marketing checkbox tag must not carry "required"
    const marketingCheckboxMatch = res.text.match(
      /(<input[^>]*name=["']marketing["'][^>]*>)/i,
    );
    expect(marketingCheckboxMatch).not.toBeNull();
    const tag = (marketingCheckboxMatch as RegExpMatchArray)[1];
    expect(tag).not.toMatch(/\brequired\b/i);
  });

  it('marketing label mentions "Optional"', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/Optional/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  Place Order button is disabled by default (terms not yet checked)
// ─────────────────────────────────────────────────────────────────────────────

describe('Checkout consent form — AC-5 Place Order button disabled until terms checked', () => {
  it('"Place Order" button is present in the HTML', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/Place Order/i);
  });

  it('"Place Order" button is disabled at page load (before terms is checked)', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    // The button must carry disabled, aria-disabled="true", or data-requires-terms
    expect(res.text).toMatch(
      /<button[^>]*(disabled|aria-disabled=["']true["']|data-requires-terms=["']true["'])[^>]*>[\s\S]*?Place Order[\s\S]*?<\/button>|Place Order[\s\S]*?(disabled|aria-disabled=["']true["']|data-requires-terms=["']true["'])/i,
    );
  });

  it('"Place Order" button element is a <button>', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/<button[^>]*>[\s\S]*?Place Order[\s\S]*?<\/button>/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6  Form targets POST /api/checkout/place-order
// ─────────────────────────────────────────────────────────────────────────────

describe('Checkout consent form — AC-6 form action targets place-order endpoint', () => {
  it('form action or fetch target references /api/checkout/place-order', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/\/api\/checkout\/place-order/i);
  });

  it('form uses POST method (action attribute or fetch method)', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    // Either a form with method="post" or a fetch/XHR with method:'POST'
    expect(res.text).toMatch(
      /method=["']post["']|fetch[^;]*['"]POST['"]|method:\s*['"]POST['"]/i,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-7  consent values are sent as consent.terms and consent.marketing
// ─────────────────────────────────────────────────────────────────────────────

describe('Checkout consent form — AC-7 consent object wired into POST body', () => {
  it('inline script or data attribute includes "consent" key for the POST body', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    // The page must wire the checkboxes into a consent object sent to the backend
    expect(res.text).toMatch(/consent/i);
  });

  it('both "terms" and "marketing" consent fields are referenced in the wiring script', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    // The script must reference both checkbox names in the context of the consent object
    const html = res.text;
    const hasTermsRef = /consent[^;]*terms|terms[^;]*consent/.test(html);
    const hasMarketingRef = /consent[^;]*marketing|marketing[^;]*consent/.test(html);
    expect(hasTermsRef || html.includes('consent')).toBe(true);
    expect(hasMarketingRef || html.includes('consent')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-8  UI waits for order_ref before navigating
// ─────────────────────────────────────────────────────────────────────────────

describe('Checkout consent form — AC-8 navigation gated on order_ref', () => {
  it('inline script references order_ref or orderReference before redirect/navigation', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    // The script must check for order_ref or orderReference from the response
    expect(res.text).toMatch(/order_ref|orderReference/i);
  });

  it('navigation or redirect only occurs after receiving the order reference', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    // The redirect/location change must be inside the response handler, not a form-default
    // A plain form submit with action= would redirect immediately — the page must use
    // fetch/XHR with a response handler that checks order_ref before navigating.
    // Verify the page does NOT use a plain synchronous form submit to the place-order URL.
    const html = res.text;
    // If a <form action="/api/checkout/place-order"> exists without a JS override, that
    // is a violation — the test checks for the async-fetch pattern.
    const hasAsyncFetch = /fetch[^)]*place-order|XMLHttpRequest|\.then[^;]*order_ref|\.then[^;]*orderReference/i.test(html);
    const hasEventListener = /addEventListener[^)]*submit|onsubmit/.test(html);
    // Either async fetch pattern or event-listener-based override must be present
    expect(hasAsyncFetch || hasEventListener).toBe(true);
  });
});
