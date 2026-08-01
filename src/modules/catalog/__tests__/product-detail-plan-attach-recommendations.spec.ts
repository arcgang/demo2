import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Product Detail screen: plan-attach panel and accessory
 * recommendations (Screen 7, wireframe_product_detail.html).
 *
 * Screen  : GET /product/:slug
 * Regions : section.plan-attach-panel  (H2 "Add a plan or bundle")
 *           section.recommendations    (H2 "Complete your purchase")
 *
 * API dep : GET /api/devices/:id/recommendations
 *           POST /cart/items  (add to cart)
 *           GET  /cart        (read cart state)
 *
 * Acceptance criteria encoded here:
 *  AC-1  section.plan-attach-panel renders 3 plan cards populated from the
 *        recommendations API (names + monthly prices visible in HTML).
 *  AC-2  Plan cards carry a visible "Required" label or badge so they are
 *        visually distinguishable from optional accessories.
 *  AC-3  A plan card reflects a selected/highlighted state when chosen
 *        (data-selected attribute or CSS class on the active card).
 *  AC-4  section.recommendations renders all four accessory cards from the
 *        recommendations API ("Complete your purchase" heading present).
 *  AC-5  Each accessory card contains an image placeholder element, the
 *        accessory name, a once-off price, and an "Add to Cart" button.
 *  AC-6  Clicking "Add to Cart" for a plan or accessory increments the cart
 *        item count reflected in the header badge.
 */

const PRODUCT_URL = '/product/iphone-15-pro';

// ── Wireframe plan names and prices (from recommendations API seed) ─────────
const EXPECTED_PLANS = [
  { name: 'Vodacom Red 5GB',      price: 'R 299' },
  { name: 'Vodacom Unlimited 20GB', price: 'R 799' },
  { name: 'Vodacom Red Premium',  price: 'R 1,299' },
];

// ── Wireframe accessory names and once-off prices (Screen 7 copy) ───────────
const EXPECTED_ACCESSORIES = [
  { name: 'AirPods Pro',              price: 'R 4,999' },
  { name: 'iPhone 15 Pro Case',       price: 'R 799' },
  { name: '20W USB-C Power Adapter',  price: 'R 399' },
  { name: 'Screen Protector',         price: 'R 299' },
];

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  section.plan-attach-panel renders 3 plan cards from recommendations API
// ─────────────────────────────────────────────────────────────────────────────

describe('Product Detail – AC-1 plan-attach-panel populates from recommendations API', () => {
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get(PRODUCT_URL);
    html = res.text;
  });

  it('section.plan-attach-panel is present in the page', () => {
    expect(html).toMatch(/class=["'][^"']*plan-attach-panel[^"']*["']/);
  });

  it('"Add a plan or bundle" heading is rendered inside the panel', () => {
    expect(html).toMatch(/Add a plan or bundle/i);
  });

  it('plan card for "Vodacom Red 5GB" is rendered', () => {
    expect(html).toContain('Vodacom Red 5GB');
  });

  it('plan card for "Vodacom Unlimited 20GB" is rendered', () => {
    expect(html).toMatch(/Vodacom Unlimited 20GB/i);
  });

  it('plan card for "Vodacom Red Premium" is rendered', () => {
    expect(html).toMatch(/Vodacom Red Premium/i);
  });

  it('monthly price R 299/month is shown on a plan card', () => {
    expect(html).toMatch(/R\s*299\/month/i);
  });

  it('monthly price R 799/month is shown on a plan card', () => {
    expect(html).toMatch(/R\s*799\/month/i);
  });

  it('monthly price R 1,299/month is shown on a plan card', () => {
    expect(html).toMatch(/R\s*1[,.]?299\/month/i);
  });

  it('all three plan names are present in a single page load', () => {
    for (const plan of EXPECTED_PLANS) {
      expect(html).toContain(plan.name);
    }
  });

  it('plan cards are backed by the recommendations API (data-plan-id attribute present on each)', () => {
    const matches = html.match(/data-plan-id=/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  Plan cards carry a "Required" label or badge
// ─────────────────────────────────────────────────────────────────────────────

describe('Product Detail – AC-2 plan cards show required label', () => {
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get(PRODUCT_URL);
    html = res.text;
  });

  it('at least one element carries a "Required" text label in the plan section', () => {
    expect(html).toMatch(/Required/i);
  });

  it('plan cards are visually distinguished by a CSS class or badge', () => {
    // Accepts class-based badge (plan-required, badge-required, required-badge, required-label)
    // or an inline text badge "Required" inside a span/div
    const hasBadgeClass = /class=["'][^"']*(plan-required|badge-required|required-badge|required-label)[^"']*["']/i.test(html);
    const hasRequiredBadgeText = /<(span|div|p|strong)[^>]*class=["'][^"']*badge[^"']*["'][^>]*>\s*Required\s*<\/(span|div|p|strong)>/i.test(html);
    expect(hasBadgeClass || hasRequiredBadgeText).toBe(true);
  });

  it('plan cards are distinguishable from accessory cards in the HTML structure', () => {
    // Plans must carry a marker different from accessories
    expect(html).toMatch(/class=["'][^"']*plan-card[^"']*["']/);
    // And accessories (or their section) must also be present
    expect(html).toMatch(/class=["'][^"']*accessory-card[^"']*["']/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  Plan card supports a selected / highlighted state
// ─────────────────────────────────────────────────────────────────────────────

describe('Product Detail – AC-3 plan card selection state', () => {
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get(PRODUCT_URL);
    html = res.text;
  });

  it('at least one plan card exposes a data-selected attribute', () => {
    expect(html).toMatch(/data-selected=/);
  });

  it('the initially-highlighted plan card has data-selected="true" or class containing "selected"', () => {
    const hasDataSelected = /data-selected=["']true["']/.test(html);
    const hasSelectedClass = /class=["'][^"']*plan-card[^"']*selected[^"']*["']/.test(html);
    expect(hasDataSelected || hasSelectedClass).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  section.recommendations renders all four accessory cards
// ─────────────────────────────────────────────────────────────────────────────

describe('Product Detail – AC-4 recommendations section with all four accessories', () => {
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get(PRODUCT_URL);
    html = res.text;
  });

  it('section.recommendations is present in the page', () => {
    expect(html).toMatch(/class=["'][^"']*recommendations[^"']*["']/);
  });

  it('"Complete your purchase" heading is rendered', () => {
    expect(html).toMatch(/Complete your purchase/i);
  });

  it('accessory "AirPods Pro" is rendered', () => {
    expect(html).toMatch(/AirPods Pro/i);
  });

  it('accessory "iPhone 15 Pro Case" is rendered', () => {
    expect(html).toMatch(/iPhone 15 Pro Case/i);
  });

  it('accessory "20W USB-C Power Adapter" is rendered', () => {
    expect(html).toMatch(/20W USB-C Power Adapter/i);
  });

  it('accessory "Screen Protector" is rendered', () => {
    expect(html).toMatch(/Screen Protector/i);
  });

  it('all four accessory names appear in a single page load', () => {
    for (const acc of EXPECTED_ACCESSORIES) {
      expect(html).toContain(acc.name);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  Each accessory card has: image placeholder, name, price, Add to Cart
// ─────────────────────────────────────────────────────────────────────────────

describe('Product Detail – AC-5 accessory card structure', () => {
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get(PRODUCT_URL);
    html = res.text;
  });

  it('accessory cards carry an image placeholder element', () => {
    // Accepts <img>, a <div class="image-placeholder"> or similar
    const hasImg = /<img[^>]+class=["'][^"']*accessory[^"']*["']/.test(html);
    const hasPlaceholder = /class=["'][^"']*(image-placeholder|accessory-image|product-image)[^"']*["']/i.test(html);
    expect(hasImg || hasPlaceholder).toBe(true);
  });

  it('accessory once-off price R 4,999 is shown (AirPods Pro)', () => {
    expect(html).toMatch(/R\s*4[,.]?999/);
  });

  it('accessory once-off price R 799 is shown (iPhone 15 Pro Case)', () => {
    // R 799 also appears for plan price — ensure at least one occurrence in context
    const occurrences = html.match(/R\s*799/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(1);
  });

  it('accessory once-off price R 399 is shown (20W USB-C Power Adapter)', () => {
    expect(html).toMatch(/R\s*399/);
  });

  it('accessory once-off price R 299 is shown (Screen Protector)', () => {
    expect(html).toMatch(/R\s*299/);
  });

  it('"Add to Cart" button is present for accessories', () => {
    // The wireframe specifies "Add to Cart" per accessory; at least one must appear
    const matches = html.match(/Add to Cart/gi) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it('each accessory card is wrapped in a CSS class element (accessory-card)', () => {
    const matches = html.match(/class=["'][^"']*accessory-card[^"']*["']/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it('each accessory Add to Cart button exposes the item ID via a data attribute', () => {
    expect(html).toMatch(/data-item-id=/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6  Cart count increments when a plan or accessory is added
// ─────────────────────────────────────────────────────────────────────────────

describe('Product Detail – AC-6 cart count increments on add', () => {
  it('the product detail page renders a cart badge element in the header', async () => {
    const res = await request(app).get(PRODUCT_URL);
    // Accepts: <button class="cart-badge">, data-cart-count, id="cart-count", etc.
    const hasBadge =
      /class=["'][^"']*cart-badge[^"']*["']/.test(res.text) ||
      /data-cart-count=/.test(res.text) ||
      /id=["']cart-count["']/.test(res.text) ||
      /class=["'][^"']*cart-count[^"']*["']/.test(res.text);
    expect(hasBadge).toBe(true);
  });

  it('POST /cart/items for a plan returns 200 or 201', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/cart/items').send({
      itemId: 'plan_red_5gb',
      itemType: 'PLAN',
    });
    expect([200, 201]).toContain(res.status);
  });

  it('POST /cart/items for an accessory returns 200 or 201', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/cart/items').send({
      itemId: 'acc_airpods_pro',
      itemType: 'ACCESSORY',
    });
    expect([200, 201]).toContain(res.status);
  });

  it('adding a plan increments the cart item count to 1', async () => {
    const agent = request.agent(app);
    await agent.post('/cart/items').send({ itemId: 'plan_red_5gb', itemType: 'PLAN' });
    const res = await agent.get('/cart');
    expect(res.status).toBe(200);
    const count: number = (res.body as { itemCount?: number }).itemCount ?? -1;
    expect(count).toBe(1);
  });

  it('adding a plan then an accessory increments the cart item count to 2', async () => {
    const agent = request.agent(app);
    await agent.post('/cart/items').send({ itemId: 'plan_red_5gb', itemType: 'PLAN' });
    await agent.post('/cart/items').send({ itemId: 'acc_airpods_pro', itemType: 'ACCESSORY' });
    const res = await agent.get('/cart');
    expect(res.status).toBe(200);
    const count: number = (res.body as { itemCount?: number }).itemCount ?? -1;
    expect(count).toBe(2);
  });

  it('the product detail page reflects the session cart count (badge shows ≥1 after adding)', async () => {
    const agent = request.agent(app);
    await agent.post('/cart/items').send({ itemId: 'plan_red_5gb', itemType: 'PLAN' });
    const res = await agent.get(PRODUCT_URL);
    // Cart count of 1 or more must be visible in the badge
    expect(res.text).toMatch(/data-cart-count=["'][1-9][0-9]*["']|>\s*[1-9][0-9]*\s*<\/[a-z]+>\s*<\/[a-z]+>/);
  });
});
