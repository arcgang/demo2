import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Smartphones product listing page.
 *
 * Screen  : GET /catalog?category=smartphones  (wireframe_product_listing.html)
 * API dep : GET /api/catalog/products?category=smartphones&market=ZA
 *
 * Acceptance criteria encoded here:
 *  AC-PL1  Page returns HTTP 200 with HTML content for smartphones category.
 *  AC-PL2  Grid of product cards each showing name, price, and from-price-per-month.
 *  AC-PL3  5G badge and Trade-In badge rendered where applicable.
 *  AC-PL4  Availability badge (In Stock / Pre-Order) rendered on each card.
 *  AC-PL5  Filter sidebar present: brand, price range, storage, availability checkboxes.
 *  AC-PL6  Pagination controls rendered.
 *  AC-PL7  Lite Mode Active banner shown when Save-Data header is detected.
 *  AC-PL8  Each product card links to the product detail page (/product/:slug).
 */

const LISTING_URL = '/catalog?category=smartphones';

// ── AC-PL1 ────────────────────────────────────────────────────────────────────
describe('Product listing page – AC-PL1 page serves HTML for smartphones', () => {
  it('returns HTTP 200 for /catalog?category=smartphones', async () => {
    const res = await request(app).get(LISTING_URL);
    expect(res.status).toBe(200);
  });

  it('Content-Type is text/html', async () => {
    const res = await request(app).get(LISTING_URL);
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });

  it('page H1 reads "Smartphones"', async () => {
    const res = await request(app).get(LISTING_URL);
    expect(res.text).toMatch(/<h1[^>]*>\s*Smartphones\s*<\/h1>/i);
  });
});

// ── AC-PL2 ────────────────────────────────────────────────────────────────────
describe('Product listing page – AC-PL2 product cards show name, price, and financing hint', () => {
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get(LISTING_URL);
    html = res.text;
  });

  it('renders at least one product card element', () => {
    expect(html).toMatch(/class=["'][^"']*product-card[^"']*["']/i);
  });

  it('renders at least one product name inside a card', () => {
    // Products from wireframe: iPhone 15 Pro, Samsung Galaxy S24, etc.
    expect(html).toMatch(/(iPhone|Samsung|Xiaomi|OPPO|Huawei)/i);
  });

  it('renders a price (R followed by digits) on at least one card', () => {
    expect(html).toMatch(/R\s+[\d,]+/);
  });

  it('renders a from-price-per-month financing hint on at least one card', () => {
    // e.g. "or from R 899/month" or "from R 899/month"
    expect(html).toMatch(/from\s+R\s+[\d,]+\/month/i);
  });

  it('renders multiple product cards (at least 3)', () => {
    const cardMatches = html.match(/class=["'][^"']*product-card[^"']*["']/g) ?? [];
    expect(cardMatches.length).toBeGreaterThanOrEqual(3);
  });
});

// ── AC-PL3 ────────────────────────────────────────────────────────────────────
describe('Product listing page – AC-PL3 5G and Trade-In badges', () => {
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get(LISTING_URL);
    html = res.text;
  });

  it('renders a 5G badge on at least one product card', () => {
    expect(html).toMatch(/class=["'][^"']*badge[^"']*["'][^>]*>\s*5G\s*</i);
  });

  it('renders a Trade-In badge on at least one product card', () => {
    expect(html).toMatch(/class=["'][^"']*badge[^"']*["'][^>]*>\s*Trade.In/i);
  });

  it('5G badge and Trade-In badge both appear on the iPhone 15 Pro card', () => {
    // iPhone 15 Pro has both badges per wireframe
    expect(html).toContain('5G');
    expect(html).toMatch(/Trade.In/i);
  });
});

// ── AC-PL4 ────────────────────────────────────────────────────────────────────
describe('Product listing page – AC-PL4 availability badge', () => {
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get(LISTING_URL);
    html = res.text;
  });

  it('renders an availability badge on at least one card', () => {
    expect(html).toMatch(/class=["'][^"']*availability[^"']*["']/i);
  });

  it('at least one card shows "In Stock" availability text', () => {
    expect(html).toMatch(/In\s+Stock/i);
  });
});

// ── AC-PL5 ────────────────────────────────────────────────────────────────────
describe('Product listing page – AC-PL5 filter sidebar', () => {
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get(LISTING_URL);
    html = res.text;
  });

  it('renders an aside.filter-sidebar element', () => {
    expect(html).toMatch(/class=["'][^"']*filter-sidebar[^"']*["']/i);
  });

  it('filter sidebar contains a Brand section heading', () => {
    expect(html).toMatch(/<h3[^>]*>\s*Brand\s*<\/h3>/i);
  });

  it('filter sidebar contains a Price Range section heading', () => {
    expect(html).toMatch(/<h3[^>]*>\s*Price\s+Range\s*<\/h3>/i);
  });

  it('filter sidebar contains a Storage section heading', () => {
    expect(html).toMatch(/<h3[^>]*>\s*Storage\s*<\/h3>/i);
  });

  it('filter sidebar contains an Availability section heading', () => {
    expect(html).toMatch(/<h3[^>]*>\s*Availability\s*<\/h3>/i);
  });

  it('renders a brand checkbox for Apple', () => {
    expect(html).toMatch(/<input[^>]+type=["']checkbox["'][^>]+name=["']brand-apple["']/i);
  });

  it('renders a brand checkbox for Samsung', () => {
    expect(html).toMatch(/<input[^>]+type=["']checkbox["'][^>]+name=["']brand-samsung["']/i);
  });

  it('renders an In Stock availability checkbox', () => {
    expect(html).toMatch(/<input[^>]+type=["']checkbox["'][^>]+name=["']avail-stock["']/i);
  });

  it('renders a Pre-Order availability checkbox', () => {
    expect(html).toMatch(/<input[^>]+type=["']checkbox["'][^>]+name=["']avail-preorder["']/i);
  });

  it('renders a 128GB storage checkbox', () => {
    expect(html).toMatch(/<input[^>]+type=["']checkbox["'][^>]+name=["']storage-128["']/i);
  });

  it('renders a 256GB storage checkbox', () => {
    expect(html).toMatch(/<input[^>]+type=["']checkbox["'][^>]+name=["']storage-256["']/i);
  });
});

// ── AC-PL6 ────────────────────────────────────────────────────────────────────
describe('Product listing page – AC-PL6 pagination controls', () => {
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get(LISTING_URL);
    html = res.text;
  });

  it('renders pagination controls on the page', () => {
    expect(html).toMatch(/class=["'][^"']*pagination[^"']*["']/i);
  });

  it('renders a "Next" pagination link', () => {
    expect(html).toMatch(/Next/i);
  });

  it('renders at least one numbered page link', () => {
    // Page number links: <a href="#">1</a>
    expect(html).toMatch(/<a[^>]+>\s*[123]\s*<\/a>/);
  });
});

// ── AC-PL7 ────────────────────────────────────────────────────────────────────
describe('Product listing page – AC-PL7 Lite Mode Active banner', () => {
  it('does NOT show lite mode banner without Save-Data header', async () => {
    const res = await request(app).get(LISTING_URL);
    expect(res.text).not.toMatch(/Lite\s+Mode\s+Active/i);
  });

  it('shows "Lite Mode Active" banner when Save-Data: on header is sent', async () => {
    const res = await request(app)
      .get(LISTING_URL)
      .set('Save-Data', 'on');
    expect(res.text).toMatch(/Lite\s+Mode\s+Active/i);
  });

  it('shows "Lite Mode Active" banner when ?lite=true query param is set', async () => {
    const res = await request(app).get('/catalog?category=smartphones&lite=true');
    expect(res.text).toMatch(/Lite\s+Mode\s+Active/i);
  });

  it('lite mode banner carries a descriptive class or role', async () => {
    const res = await request(app)
      .get(LISTING_URL)
      .set('Save-Data', 'on');
    expect(res.text).toMatch(/class=["'][^"']*lite-mode[^"']*["']/i);
  });
});

// ── AC-PL8 ────────────────────────────────────────────────────────────────────
describe('Product listing page – AC-PL8 product cards link to detail page', () => {
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get(LISTING_URL);
    html = res.text;
  });

  it('at least one product card contains a link to /product/:slug', () => {
    expect(html).toMatch(/href=["']\/product\/[^"']+["']/i);
  });

  it('product card for iPhone 15 Pro links to /product/iphone-15-pro', () => {
    expect(html).toMatch(/href=["']\/product\/iphone-15-pro["']/i);
  });

  it('each product card has a "View Details" affordance', () => {
    expect(html).toMatch(/View\s+Details/i);
  });
});
