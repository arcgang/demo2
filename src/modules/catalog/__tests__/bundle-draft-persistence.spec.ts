import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – In-progress selection persistence: Bundle Configuration screen.
 *
 * Screen  : GET /product/:id/configure   (wireframe_bundle_configuration.html)
 * Feature : localStorage draft snapshot keyed as draft:bundle:<productId>
 *
 * Acceptance criteria encoded here:
 *  AC-1  Plan radio inputs carry name="plan" and data-plan-id so the selected
 *        value can be read and written by the persistence script.
 *  AC-2  Add-on checkboxes carry name="addon-*" and are identifiable for
 *        serialisation into the draft payload.
 *  AC-3  The page embeds a <script> that saves the draft to localStorage under
 *        the key pattern draft:bundle:<productId> on field change, including a
 *        timestamp so expiry can be evaluated.
 *  AC-4  The script reads back a matching draft on page load / online event /
 *        visibilitychange and restores selections silently.
 *  AC-5  The script discards a draft whose timestamp is more than 30 minutes
 *        old (expiry logic present in script source).
 *  AC-6  A dismissible inline notice element 'Your selections were restored' is
 *        present in the HTML (hidden by default, shown by the script).
 *  AC-7  The draft key written by the script includes the product id segment so
 *        different products never share a draft.
 */

const PRODUCT_ID = 'iphone-15-pro';
const URL = `/product/${PRODUCT_ID}/configure`;

// ── AC-1 ─────────────────────────────────────────────────────────────────────
describe('Bundle Configuration – AC-1: plan radio inputs are structured for persistence', () => {
  it('returns HTTP 200', async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(200);
  });

  it('plan inputs use type="radio" and name="plan"', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/type=["']radio["'][^>]*name=["']plan["']|name=["']plan["'][^>]*type=["']radio["']/i);
  });

  it('each plan radio carries a data-plan-id attribute', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/data-plan-id=["'][^"']+["']/i);
  });

  it('at least three plan radios are present (one per plan tier)', async () => {
    const res = await request(app).get(URL);
    const matches = res.text.match(/type=["']radio["'][^>]*name=["']plan["']|name=["']plan["'][^>]*type=["']radio["']/gi);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(3);
  });
});

// ── AC-2 ─────────────────────────────────────────────────────────────────────
describe('Bundle Configuration – AC-2: add-on checkboxes are structured for persistence', () => {
  it('addon-data checkbox is present', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/name=["']addon-data["']/i);
  });

  it('addon-international checkbox is present', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/name=["']addon-international["']/i);
  });

  it('addon-roaming checkbox is present', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/name=["']addon-roaming["']/i);
  });

  it('all addon inputs have type="checkbox"', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/type=["']checkbox["'][^>]*name=["']addon-/i);
  });
});

// ── AC-3 ─────────────────────────────────────────────────────────────────────
describe('Bundle Configuration – AC-3: draft save logic is embedded in the page script', () => {
  it('page contains an inline <script> block', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/<script[\s>]/i);
  });

  it('script references the localStorage key prefix "draft:bundle:"', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toContain('draft:bundle:');
  });

  it('script includes the product id in the storage key', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toContain(`draft:bundle:${PRODUCT_ID}`);
  });

  it('script calls localStorage.setItem', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toContain('localStorage.setItem');
  });

  it('script stores a timestamp alongside the payload for expiry evaluation', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/timestamp|savedAt|expiresAt/i);
  });

  it('script attaches a change listener to persist on field interaction', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/addEventListener\s*\(\s*['"]change['"]/i);
  });
});

// ── AC-4 ─────────────────────────────────────────────────────────────────────
describe('Bundle Configuration – AC-4: draft restore logic fires on page load and connectivity events', () => {
  it('script calls localStorage.getItem to read back a draft', async () => {
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

// ── AC-5 ─────────────────────────────────────────────────────────────────────
describe('Bundle Configuration – AC-5: expired draft (>30 min) is discarded by the restore logic', () => {
  it('script contains a 30-minute expiry threshold (1800000 ms or 30 * 60)', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toMatch(/1800000|30\s*\*\s*60\s*\*\s*1000/);
  });

  it('script calls localStorage.removeItem to purge a stale draft', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toContain('localStorage.removeItem');
  });
});

// ── AC-6 ─────────────────────────────────────────────────────────────────────
describe('Bundle Configuration – AC-6: dismissible restore notice is present in markup', () => {
  it('HTML contains the text "Your selections were restored"', async () => {
    const res = await request(app).get(URL);
    expect(res.text).toContain('Your selections were restored');
  });

  it('restore notice element has a dismiss/close affordance (button or link)', async () => {
    const res = await request(app).get(URL);
    // The notice container must have a child button or an aria/data dismiss attribute
    expect(res.text).toMatch(
      /restore-notice[\s\S]{0,300}(<button|data-dismiss|aria-label=["']dismiss|aria-label=["']close)/i,
    );
  });
});

// ── AC-7 ─────────────────────────────────────────────────────────────────────
describe('Bundle Configuration – AC-7: draft key is product-scoped', () => {
  it('the key written to localStorage is unique per product (contains product id segment)', async () => {
    const res = await request(app).get(URL);
    // The script must build the key using a product id, not a hard-coded generic key
    expect(res.text).toMatch(/draft:bundle:[a-z0-9_-]+/i);
  });

  it('the storage key does NOT use a product-agnostic constant like "draft:bundle:default"', async () => {
    const res = await request(app).get(URL);
    expect(res.text).not.toMatch(/draft:bundle:default/i);
  });
});
