import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – In-progress selection persistence: Cart screen.
 *
 * Screen  : GET /cart                    (wireframe_cart.html)
 * Feature : localStorage draft snapshot for cart state.
 *
 * Acceptance criteria encoded here:
 *  AC-1  The cart page is served at GET /cart with HTTP 200 and text/html.
 *  AC-2  The promo-code text input is present and identifiable for persistence.
 *  AC-3  Cart item list elements carry data attributes so quantities and item
 *        identifiers can be serialised into the draft payload.
 *  AC-4  The page embeds a <script> that persists cart state to localStorage,
 *        keyed with a recognisable cart draft key, including a timestamp.
 *  AC-5  The script reads back the cart draft on page load / online event /
 *        visibilitychange and restores state silently.
 *  AC-6  Expired drafts (>30 min) are discarded by the restore logic.
 *  AC-7  A dismissible inline notice 'Your selections were restored' is
 *        present in the markup (hidden by default, shown on restore).
 */

const URL = '/cart';

// ── AC-1 ─────────────────────────────────────────────────────────────────────
describe('Cart – AC-1: page is served correctly', () => {
  it('returns HTTP 200', async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(200);
  });

  it('Content-Type is text/html', async () => {
    const res = await request(app).get(URL);
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });

  it('page title is "Your Cart - Vodacom Shop"', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toContain('Your Cart');
  });
});

// ── AC-2 ─────────────────────────────────────────────────────────────────────
describe('Cart – AC-2: promo-code input is present and identifiable', () => {
  it('page contains a promo-code text input', async () => {
    const res = await request(app).get(URL);
    // The input must be named or labelled "promo" in some form
    expect(res.text).toMatch(/name=["']promo[^"']*["']|id=["']promo[^"']*["']|placeholder=["'][Pp]romo/i);
  });

  it('promo-code input has type="text" or type="search"', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/type=["'](text|search)["'][^>]*promo|promo[^>]*type=["'](text|search)["']/i);
  });
});

// ── AC-3 ─────────────────────────────────────────────────────────────────────
describe('Cart – AC-3: cart item elements carry data attributes for serialisation', () => {
  it('at least one cart item element has a data-item-id or data-cart-item attribute', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/data-item-id=["'][^"']+["']|data-cart-item=["'][^"']+["']/i);
  });

  it('quantity controls are present on cart items', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/Decrease quantity|Increase quantity|data-quantity|type=["']number["']/i);
  });
});

// ── AC-4 ─────────────────────────────────────────────────────────────────────
describe('Cart – AC-4: draft save logic is embedded in the page script', () => {
  it('page contains an inline <script> block', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/<script[\s>]/i);
  });

  it('script calls localStorage.setItem to persist cart draft', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toContain('localStorage.setItem');
  });

  it('script uses a recognisable cart draft key (contains "draft:cart" or "cart-draft")', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/draft:cart|cart-draft|cart_draft/i);
  });

  it('script stores a timestamp for expiry evaluation', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/timestamp|savedAt|expiresAt/i);
  });

  it('script attaches a change listener to persist on promo-code or item-quantity changes', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/addEventListener\s*\(\s*['"]change['"]/i);
  });
});

// ── AC-5 ─────────────────────────────────────────────────────────────────────
describe('Cart – AC-5: draft restore logic fires on page load and connectivity events', () => {
  it('script calls localStorage.getItem to read back a cart draft', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toContain('localStorage.getItem');
  });

  it('script listens for the "online" event to trigger restore', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/addEventListener\s*\(\s*['"]online['"]/i);
  });

  it('script listens for the "visibilitychange" event to trigger restore', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/addEventListener\s*\(\s*['"]visibilitychange['"]/i);
  });
});

// ── AC-6 ─────────────────────────────────────────────────────────────────────
describe('Cart – AC-6: expired draft is discarded by restore logic', () => {
  it('script contains a 30-minute expiry threshold (1800000 ms or 30 * 60)', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/1800000|30\s*\*\s*60\s*\*\s*1000/);
  });

  it('script calls localStorage.removeItem to purge a stale cart draft', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toContain('localStorage.removeItem');
  });
});

// ── AC-7 ─────────────────────────────────────────────────────────────────────
describe('Cart – AC-7: dismissible restore notice is present in markup', () => {
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
