import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Part A: Checkout retry/pending messaging
 * Screen: GET /checkout  (wireframe_checkout_payment.html)
 *
 * Three distinct states after Place Order is clicked with a network problem:
 *  AC-1  Request never left the client → 'Your order was not submitted. Please try again.'
 *        Retry button must be present. Place Order must NOT be permanently disabled.
 *  AC-2  Request sent but no response received → 'We could not confirm your order status.
 *        Do not submit again — check Order Status or contact support.'
 *        Place Order button must be disabled. A link to order status must be present.
 *  AC-3  Backend returns payment-pending → 'Your payment is being processed.
 *        You will receive a confirmation shortly. Do not re-submit.'
 *        No success indicator (e.g. no "Order Confirmed" / "Confirmation" copy in the banner).
 *
 * The page must expose distinct data-error-state values ('not-submitted', 'no-response',
 * 'payment-pending') so client-side JS can drive the correct UI branch.
 */

const CHECKOUT_URL = '/checkout';

// ── AC-1: "not submitted" error state ────────────────────────────────────────

describe('Checkout – AC-1: request-never-left (not-submitted) error state', () => {
  it('checkout page HTML contains a data-error-state="not-submitted" region or equivalent marker', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/data-error-state=["']not-submitted["']/i);
  });

  it('checkout page HTML contains the exact copy "Your order was not submitted. Please try again."', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/Your order was not submitted\.\s*Please try again\./i);
  });

  it('checkout page HTML contains a retry button associated with the not-submitted state', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    // A button with data-retry or id containing "retry" must be present
    expect(res.text).toMatch(/(data-retry|id=["'][^"']*retry[^"']*["'])/i);
  });

  it('Place Order button is NOT permanently disabled in the initial page load', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    // The Place Order button must not carry a hard-coded disabled attribute on initial render
    expect(res.text).not.toMatch(/<button[^>]*id=["']place-order["'][^>]*\bdisabled\b/i);
  });
});

// ── AC-2: "no-response" error state (ambiguous submission) ───────────────────

describe('Checkout – AC-2: request-sent-no-response (no-response) error state', () => {
  it('checkout page HTML contains a data-error-state="no-response" region or equivalent marker', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/data-error-state=["']no-response["']/i);
  });

  it('checkout page HTML contains "We could not confirm your order status" copy', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/We could not confirm your order status/i);
  });

  it('checkout page HTML contains "Do not submit again" warning in the no-response region', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/Do not submit again/i);
  });

  it('checkout page HTML links to order status page from the no-response region', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    // A link pointing to /orders or /account/orders must appear near the no-response copy
    expect(res.text).toMatch(/href=["'][^"']*\/(orders|account)[^"']*["'][^>]*>/i);
  });

  it('the no-response region instructs user to contact support as an alternative', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/contact support/i);
  });

  it('Place Order button has markup to be disabled in the no-response state (data-disable-on or aria-disabled support)', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    // The button or a wrapper must expose a hook allowing JS to disable it for the no-response state
    expect(res.text).toMatch(/(data-disable-on=["']no-response["']|data-no-response-disable|aria-disabled)/i);
  });
});

// ── AC-3: payment-pending state ───────────────────────────────────────────────

describe('Checkout – AC-3: backend payment-pending state messaging', () => {
  it('checkout page HTML contains a data-error-state="payment-pending" region or equivalent marker', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/data-error-state=["']payment-pending["']/i);
  });

  it('checkout page HTML contains "Your payment is being processed" copy', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/Your payment is being processed/i);
  });

  it('checkout page HTML contains "You will receive a confirmation shortly" copy', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/You will receive a confirmation shortly/i);
  });

  it('checkout page HTML contains "Do not re-submit" copy in the payment-pending region', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    expect(res.text).toMatch(/Do not re-submit/i);
  });

  it('payment-pending region does NOT contain a success indicator ("Order Confirmed" or a success class)', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    // Verify the payment-pending message block does not contain misleading success copy
    // Strategy: extract the region and assert absence of success language
    const pendingRegionMatch = res.text.match(
      /data-error-state=["']payment-pending["'][^>]*>([\s\S]{0,600})/i,
    );
    if (pendingRegionMatch) {
      expect(pendingRegionMatch[1]).not.toMatch(/Order Confirmed|class=["'][^"']*success[^"']*["']/i);
    } else {
      // If the region uses a different pattern, ensure "Order Confirmed" does not co-appear
      // within 400 chars of the "payment is being processed" copy
      const paymentIdx = res.text.search(/Your payment is being processed/i);
      expect(paymentIdx).toBeGreaterThan(-1);
      const surrounding = res.text.slice(paymentIdx, paymentIdx + 400);
      expect(surrounding).not.toMatch(/Order Confirmed/i);
    }
  });
});

// ── Cross-state: error states are hidden by default on initial load ───────────

describe('Checkout – AC-4: error state regions are hidden on initial page load', () => {
  it('error-state regions are rendered hidden (display:none, hidden attribute, or aria-hidden) on initial load', async () => {
    const res = await request(app).get(CHECKOUT_URL);
    // All three data-error-state regions must default to hidden
    // Accept: hidden attribute, display:none inline style, or aria-hidden="true" on the container
    const regionPattern = /data-error-state=["'][^"']+["'][^>]*/gi;
    const regions = res.text.match(regionPattern) ?? [];
    expect(regions.length).toBeGreaterThanOrEqual(3);
    for (const region of regions) {
      const isHidden =
        /\bhidden\b/.test(region) ||
        /display:\s*none/.test(region) ||
        /aria-hidden=["']true["']/.test(region) ||
        /style=["'][^"']*display:\s*none[^"']*["']/.test(region);
      expect(isHidden).toBe(true);
    }
  });
});
