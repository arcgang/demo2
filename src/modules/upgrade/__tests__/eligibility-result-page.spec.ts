import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Upgrade Eligibility Result page (Screen 4: wireframe_eligibility_result.html)
 *
 * Route   : GET /upgrade/eligibility
 * API deps: GET /api/upgrade/eligibility (current plan card)
 *           GET /api/upgrade/financing   (financing quote, asyncPending flag)
 *           GET /api/upgrade/session     (session rehydration on mount)
 *
 * Acceptance criteria encoded here:
 *  AC-1  Page loads (HTTP 200, text/html).
 *  AC-2  H1 is "Your Upgrade Eligibility".
 *  AC-3  Eligibility status banner is present and indicates eligibility.
 *  AC-4  section.current-plan is present with plan name, monthly cost, contract end date.
 *  AC-5  Plan name "Vodacom Red 10GB" is shown.
 *  AC-6  Monthly cost "R 499.00" is shown.
 *  AC-7  Contract end date "31 Dec 2026" is shown.
 *  AC-8  Available Upgrade Devices grid (H2 "Available Upgrade Devices") is present.
 *  AC-9  Device grid renders at least three device cards with "View Details" links.
 *  AC-10 Device "iPhone 15 Pro 256GB" links to /product/iphone-15-pro.
 *  AC-11 Device "Samsung Galaxy S24 Ultra" links to /product/samsung-s24-ultra.
 *  AC-12 Device "iPhone 15 128GB" links to /product/iphone-15.
 *  AC-13 CTA card "Explore Financing Options" links to /upgrade/financing.
 *  AC-14 CTA card "Trade In Your Current Device" links to /upgrade/trade-in.
 *  AC-15 When the financing quote has asyncPending=true, an inline pending-review
 *        notice appears on the financing CTA.
 *  AC-16 H2 "Ready to Upgrade?" section is present with "Continue Shopping" and
 *        "Contact Support" links.
 *  AC-17 nav.breadcrumb includes "Upgrade Eligibility" segment.
 *  AC-18 Page calls GET /api/upgrade/session on mount to rehydrate state
 *        (session endpoint is reachable and returns 200).
 *  AC-19 "Your Current Plan" heading (H2) is rendered.
 *  AC-20 "Explore Financing Options" H3 heading is rendered inside the CTA card.
 *  AC-21 "Trade In Your Current Device" H3 heading is rendered inside the CTA card.
 */

const ELIGIBILITY_URL = '/upgrade/eligibility';

// ── AC-1: page loads ──────────────────────────────────────────────────────────

describe('Eligibility Result page — AC-1 page load', () => {
  it('returns HTTP 200', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.status).toBe(200);
  });

  it('Content-Type is text/html', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });
});

// ── AC-2: H1 heading ─────────────────────────────────────────────────────────

describe('Eligibility Result page — AC-2 H1 heading', () => {
  it('H1 is "Your Upgrade Eligibility"', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/<h1[^>]*>\s*Your Upgrade Eligibility\s*<\/h1>/i);
  });
});

// ── AC-3: eligibility status banner ──────────────────────────────────────────

describe('Eligibility Result page — AC-3 eligibility status banner', () => {
  it('eligibility banner H2 "You\'re eligible for an upgrade!" is present', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/You'?re eligible for an upgrade/i);
  });

  it('banner contains guidance copy about the upgrade window', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/upgrade window|contract has reached/i);
  });
});

// ── AC-4 & AC-19: section.current-plan ───────────────────────────────────────

describe('Eligibility Result page — AC-4/AC-19 current-plan section', () => {
  it('section.current-plan element is present', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/class=["'][^"']*current-plan[^"']*["']/);
  });

  it('"Your Current Plan" H2 heading is rendered', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/<h2[^>]*>\s*Your Current Plan\s*<\/h2>/i);
  });

  it('current-plan section shows "Plan Name" label', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Plan Name/i);
  });

  it('current-plan section shows "Monthly Cost" label', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Monthly Cost/i);
  });

  it('current-plan section shows "Contract End Date" label', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Contract End Date/i);
  });
});

// ── AC-5: plan name ───────────────────────────────────────────────────────────

describe('Eligibility Result page — AC-5 plan name', () => {
  it('plan name "Vodacom Red 10GB" is displayed', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Vodacom Red 10GB/i);
  });
});

// ── AC-6: monthly cost ────────────────────────────────────────────────────────

describe('Eligibility Result page — AC-6 monthly cost', () => {
  it('monthly cost "R 499" is displayed', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/R\s*499/);
  });
});

// ── AC-7: contract end date ───────────────────────────────────────────────────

describe('Eligibility Result page — AC-7 contract end date', () => {
  it('contract end date "31 Dec 2026" is displayed', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/31\s*Dec\s*2026/i);
  });
});

// ── AC-8: available upgrade devices section ───────────────────────────────────

describe('Eligibility Result page — AC-8 Available Upgrade Devices section', () => {
  it('"Available Upgrade Devices" H2 is present', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/<h2[^>]*>\s*Available Upgrade Devices\s*<\/h2>/i);
  });

  it('device grid or list container is rendered', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/class=["'][^"']*(?:device[^"']*grid|upgrade[^"']*device|available[^"']*device)[^"']*["']/i);
  });
});

// ── AC-9: at least three device cards with View Details links ─────────────────

describe('Eligibility Result page — AC-9 device cards with View Details links', () => {
  it('at least three "View Details" links are rendered', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    const matches = res.text.match(/View Details/gi);
    expect(matches).not.toBeNull();
    expect((matches as RegExpMatchArray).length).toBeGreaterThanOrEqual(3);
  });

  it('device prices R 24,999 / R 22,999 / R 18,999 are shown', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/24[,.]?999/);
    expect(res.text).toMatch(/22[,.]?999/);
    expect(res.text).toMatch(/18[,.]?999/);
  });
});

// ── AC-10: iPhone 15 Pro 256GB links to /product/iphone-15-pro ───────────────

describe('Eligibility Result page — AC-10 iPhone 15 Pro 256GB link', () => {
  it('"iPhone 15 Pro 256GB" text is on the page', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/iPhone 15 Pro 256GB/i);
  });

  it('View Details link for iPhone 15 Pro points to /product/iphone-15-pro', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/href=["']\/product\/iphone-15-pro["']/);
  });
});

// ── AC-11: Samsung Galaxy S24 Ultra links to /product/samsung-s24-ultra ───────

describe('Eligibility Result page — AC-11 Samsung Galaxy S24 Ultra link', () => {
  it('"Samsung Galaxy S24 Ultra" text is on the page', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Samsung Galaxy S24 Ultra/i);
  });

  it('View Details link for Samsung Galaxy S24 Ultra points to /product/samsung-s24-ultra', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/href=["']\/product\/samsung-s24-ultra["']/);
  });
});

// ── AC-12: iPhone 15 128GB links to /product/iphone-15 ───────────────────────

describe('Eligibility Result page — AC-12 iPhone 15 128GB link', () => {
  it('"iPhone 15 128GB" text is on the page', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/iPhone 15 128GB/i);
  });

  it('View Details link for iPhone 15 points to /product/iphone-15', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/href=["']\/product\/iphone-15["']/);
  });
});

// ── AC-13: Financing CTA links to /upgrade/financing ─────────────────────────

describe('Eligibility Result page — AC-13 Financing CTA', () => {
  it('"Explore Financing Options" CTA is present', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Explore Financing Options/i);
  });

  it('Financing CTA links to /upgrade/financing', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/href=["']\/upgrade\/financing["']/);
  });

  it('"Get a Quote" link text is present on the financing CTA', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Get a Quote/i);
  });

  it('financing CTA description mentions flexible payment plans', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/flexible payment plans|spread the cost/i);
  });
});

// ── AC-14: Trade-In CTA links to /upgrade/trade-in ───────────────────────────

describe('Eligibility Result page — AC-14 Trade-In CTA', () => {
  it('"Trade In Your Current Device" CTA is present', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Trade In Your Current Device/i);
  });

  it('Trade-In CTA links to /upgrade/trade-in', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/href=["']\/upgrade\/trade-in["']/);
  });

  it('"Get a Valuation" link text is present on the trade-in CTA', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Get a Valuation/i);
  });

  it('trade-in CTA mentions up to R 5,000 credit', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/R\s*5[,.]?000/);
  });
});

// ── AC-15: asyncPending=true shows inline pending-review notice on financing CTA

describe('Eligibility Result page — AC-15 asyncPending financing pending-review notice', () => {
  it('inline pending-review notice is rendered on the financing CTA when asyncPending=true', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    // The financing adapter returns asyncPending:true; the page must show a notice
    // near the financing CTA (pending review, async, under review, etc.)
    expect(res.text).toMatch(
      /pending[^<]{0,80}review|under review|async[^<]{0,60}pending|financing[^<]{0,120}pending/i,
    );
  });

  it('pending-review notice element is co-located with the financing CTA in the HTML', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    const html = res.text;
    const financingIdx = html.search(/Explore Financing Options/i);
    const pendingIdx = html.search(/pending[^<]{0,80}review|under review|async[^<]{0,60}pending/i);
    expect(financingIdx).toBeGreaterThan(-1);
    expect(pendingIdx).toBeGreaterThan(-1);
    // The pending notice must appear within 500 characters of the financing heading
    expect(Math.abs(financingIdx - pendingIdx)).toBeLessThan(500);
  });
});

// ── AC-16: Ready to Upgrade? section with Continue Shopping + Contact Support ─

describe('Eligibility Result page — AC-16 Ready to Upgrade section', () => {
  it('"Ready to Upgrade?" H2 is present', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/<h2[^>]*>\s*Ready to Upgrade\??<\/h2>/i);
  });

  it('"Continue Shopping" link pointing to /catalog is present', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Continue Shopping/i);
    expect(res.text).toMatch(/href=["']\/catalog["']/);
  });

  it('"Contact Support" link pointing to /support is present', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Contact Support/i);
    expect(res.text).toMatch(/href=["']\/support["']/);
  });
});

// ── AC-17: breadcrumb navigation ─────────────────────────────────────────────

describe('Eligibility Result page — AC-17 breadcrumb navigation', () => {
  it('nav.breadcrumb element is present', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/class=["'][^"']*breadcrumb[^"']*["']/);
  });

  it('"Upgrade Eligibility" segment is in the breadcrumb', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Upgrade Eligibility/i);
  });

  it('breadcrumb contains a link to "/" (Home)', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/href=["']\/["']/);
  });

  it('breadcrumb contains a link to /account', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/href=["']\/account["']/);
  });
});

// ── AC-18: GET /api/upgrade/session reachable (session rehydration) ───────────

describe('Eligibility Result page — AC-18 session rehydration endpoint reachable', () => {
  it('GET /api/upgrade/session returns 200', async () => {
    const res = await request(app).get('/api/upgrade/session');
    expect(res.status).toBe(200);
  });

  it('GET /api/upgrade/session returns a JSON object', async () => {
    const res = await request(app).get('/api/upgrade/session');
    expect(typeof res.body).toBe('object');
    expect(res.body).not.toBeNull();
  });
});

// ── AC-20: H3 headings inside CTA cards ──────────────────────────────────────

describe('Eligibility Result page — AC-20/AC-21 CTA card H3 headings', () => {
  it('"Explore Financing Options" H3 heading is rendered', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/<h3[^>]*>\s*Explore Financing Options\s*<\/h3>/i);
  });

  it('"Trade In Your Current Device" H3 heading is rendered', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/<h3[^>]*>\s*Trade In Your Current Device\s*<\/h3>/i);
  });
});
