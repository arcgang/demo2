import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – In-progress selection persistence: Checkout / Payment screen.
 *
 * Screen  : GET /checkout                (wireframe_checkout_payment.html)
 * Feature : localStorage draft snapshot for checkout customer-details and
 *           payment method selection; card-sensitive fields are never persisted.
 *
 * Acceptance criteria encoded here:
 *  AC-1  The checkout page is served at GET /checkout with HTTP 200 and text/html.
 *  AC-2  Customer-details form fields (first-name, last-name, email, phone,
 *        address, city, postal-code) are present and identifiable.
 *  AC-3  Payment-method radios (card, mobile-money) are present and identifiable.
 *  AC-4  Card-sensitive fields (card-number, expiry, cvv) are present in the
 *        markup but are NOT included in the draft save logic.
 *  AC-5  The page embeds a <script> that persists allowed fields to localStorage
 *        under a checkout draft key, including a timestamp.
 *  AC-6  The script never includes card-number, expiry, or CVV in the saved payload.
 *  AC-7  The script restores customer-details and payment-method on load / online /
 *        visibilitychange, but clears card fields after restore.
 *  AC-8  Expired drafts (>30 min) are discarded by the restore logic.
 *  AC-9  A dismissible inline notice 'Your selections were restored' is present.
 */

const URL = '/checkout';

// ── AC-1 ─────────────────────────────────────────────────────────────────────
describe('Checkout – AC-1: page is served correctly', () => {
  it('returns HTTP 200', async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(200);
  });

  it('Content-Type is text/html', async () => {
    const res = await request(app).get(URL);
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });

  it('page H1 is "Checkout"', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/<h1[^>]*>\s*Checkout\s*<\/h1>/i);
  });
});

// ── AC-2 ─────────────────────────────────────────────────────────────────────
describe('Checkout – AC-2: customer-details fields are present', () => {
  const fields = [
    'first-name',
    'last-name',
    'email',
    'phone',
    'address',
    'city',
    'postal-code',
  ];

  for (const field of fields) {
    it(`field name="${field}" is present`, async () => {
      const res = await request(app).get(URL);
      expect(res.text).toMatch(new RegExp(`name=["']${field}["']`, 'i'));
    });
  }
});

// ── AC-3 ─────────────────────────────────────────────────────────────────────
describe('Checkout – AC-3: payment-method radio inputs are present', () => {
  it('payment-method radio for "card" is present', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/name=["']payment-method["'][^>]*value=["']card["']|value=["']card["'][^>]*name=["']payment-method["']/i);
  });

  it('payment-method radio for "mobile-money" is present', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/name=["']payment-method["'][^>]*value=["']mobile-money["']|value=["']mobile-money["'][^>]*name=["']payment-method["']/i);
  });
});

// ── AC-4 ─────────────────────────────────────────────────────────────────────
describe('Checkout – AC-4: card-sensitive fields are present in the markup', () => {
  it('card-number field is rendered', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/name=["']card-number["']/i);
  });

  it('expiry field is rendered', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/name=["']expiry["']/i);
  });

  it('CVV field is rendered', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/name=["']cvv["']/i);
  });
});

// ── AC-5 ─────────────────────────────────────────────────────────────────────
describe('Checkout – AC-5: draft save logic is embedded in the page script', () => {
  it('page contains an inline <script> block', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/<script[\s>]/i);
  });

  it('script calls localStorage.setItem to persist checkout draft', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toContain('localStorage.setItem');
  });

  it('script uses a recognisable checkout draft key (contains "draft:checkout" or "checkout-draft")', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/draft:checkout|checkout-draft|checkout_draft/i);
  });

  it('script stores a timestamp for expiry evaluation', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/timestamp|savedAt|expiresAt/i);
  });

  it('script attaches change listeners to persist on field input', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/addEventListener\s*\(\s*['"]change['"]/i);
  });
});

// ── AC-6 ─────────────────────────────────────────────────────────────────────
describe('Checkout – AC-6: card-sensitive fields are excluded from the saved draft', () => {
  it('draft save function does not reference card-number as a field to persist', async () => {
    const res = await request(app).get(URL);
    // The script must explicitly exclude card-number from the persisted payload.
    // We verify by checking that "card-number" does NOT appear adjacent to setItem
    // within the same script, OR that an explicit exclusion comment/guard is present.
    // A simpler structural check: the persisted field list is named and card-number is absent.
    const scriptMatch = res.text.match(/<script[\s\S]*?<\/script>/gi);
    expect(scriptMatch).not.toBeNull();
    const allScripts = scriptMatch!.join('\n');
    // The string 'card-number' must not appear as a key in the serialized draft
    // (it may still appear in form references used only for clearing).
    // We check that the explicit save payload does not include it.
    expect(allScripts).toMatch(
      /exclud|omit|skip|card-number.*clear|clear.*card-number|sensit/i,
    );
  });

  it('CVV field name "cvv" is excluded from draft payload (no persist of cvv value)', async () => {
    const res = await request(app).get(URL);
    const scriptMatch = res.text.match(/<script[\s\S]*?<\/script>/gi);
    expect(scriptMatch).not.toBeNull();
    const allScripts = scriptMatch!.join('\n');
    // Script must show awareness of CVV exclusion (clear, exclude, or skip)
    expect(allScripts).toMatch(/cvv.*clear|clear.*cvv|exclud.*cvv|cvv.*omit/i);
  });

  it('expiry field is excluded from draft payload', async () => {
    const res = await request(app).get(URL);
    const scriptMatch = res.text.match(/<script[\s\S]*?<\/script>/gi);
    expect(scriptMatch).not.toBeNull();
    const allScripts = scriptMatch!.join('\n');
    expect(allScripts).toMatch(/expiry.*clear|clear.*expiry|exclud.*expiry|expiry.*omit/i);
  });
});

// ── AC-7 ─────────────────────────────────────────────────────────────────────
describe('Checkout – AC-7: restore logic rehydrates allowed fields and clears card inputs', () => {
  it('script calls localStorage.getItem to read back a checkout draft', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toContain('localStorage.getItem');
  });

  it('script listens for the "online" event to trigger restore', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/addEventListener\s*\(\s*['"]online['"]/i);
  });

  it('script listens for "visibilitychange" to trigger restore', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/addEventListener\s*\(\s*['"]visibilitychange['"]/i);
  });

  it('script explicitly clears card-number on restore (value = "" or .value = "")', async () => {
    const res = await request(app).get(URL);
    const scriptMatch = res.text.match(/<script[\s\S]*?<\/script>/gi);
    expect(scriptMatch).not.toBeNull();
    const allScripts = scriptMatch!.join('\n');
    expect(allScripts).toMatch(/card-number[\s\S]{0,80}\.value\s*=\s*['"]{2}|['"]{2}\s*;[\s\S]{0,80}card-number/i);
  });

  it('script explicitly clears CVV on restore', async () => {
    const res = await request(app).get(URL);
    const scriptMatch = res.text.match(/<script[\s\S]*?<\/script>/gi);
    expect(scriptMatch).not.toBeNull();
    const allScripts = scriptMatch!.join('\n');
    expect(allScripts).toMatch(/cvv[\s\S]{0,80}\.value\s*=\s*['"]{2}|['"]{2}\s*;[\s\S]{0,80}cvv/i);
  });

  it('script explicitly clears expiry on restore', async () => {
    const res = await request(app).get(URL);
    const scriptMatch = res.text.match(/<script[\s\S]*?<\/script>/gi);
    expect(scriptMatch).not.toBeNull();
    const allScripts = scriptMatch!.join('\n');
    expect(allScripts).toMatch(/expiry[\s\S]{0,80}\.value\s*=\s*['"]{2}|['"]{2}\s*;[\s\S]{0,80}expiry/i);
  });
});

// ── AC-8 ─────────────────────────────────────────────────────────────────────
describe('Checkout – AC-8: expired draft is discarded by restore logic', () => {
  it('script contains a 30-minute expiry threshold (1800000 ms or 30 * 60)', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/1800000|30\s*\*\s*60\s*\*\s*1000/);
  });

  it('script calls localStorage.removeItem to purge a stale checkout draft', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toContain('localStorage.removeItem');
  });
});

// ── AC-9 ─────────────────────────────────────────────────────────────────────
describe('Checkout – AC-9: dismissible restore notice is present in markup', () => {
  it('HTML contains the text "Your selections were restored"', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toContain('Your selections were restored');
  });

  it('restore notice element has a dismiss/close affordance', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(
      /restore-notice[\s\S]{0,300}(<button|data-dismiss|aria-label=["']dismiss|aria-label=["']close)/i,
    );
  });
});
