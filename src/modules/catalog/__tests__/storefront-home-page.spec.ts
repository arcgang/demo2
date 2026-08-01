import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Storefront home page (Screen 9: wireframe_storefront_home.html)
 *
 * Route: GET /
 *
 * Acceptance criteria encoded here:
 *  AC-1  Page loads (HTTP 200, text/html).
 *  AC-2  H1 heading is "Welcome to Vodacom Shop".
 *  AC-3  Header contains Vodacom nav links: Devices → /catalog, Plans → /plans,
 *        Accessories → /accessories, Support → /support.
 *  AC-4  Market/currency indicator 'South Africa - ZAR' is present.
 *  AC-5  Cart badge is present in the header.
 *  AC-6  Hero section has a 'Shop Devices' CTA linking to /catalog.
 *  AC-7  Hero section has an 'Explore Plans' CTA linking to /plans.
 *  AC-8  H2 heading 'Shop by Category' is present.
 *  AC-9  Smartphones category tile links to /catalog?category=smartphones.
 *  AC-10 Tablets category tile links to /catalog?category=tablets.
 *  AC-11 SIM & eSIM category tile links to /catalog?category=sim-esim.
 *  AC-12 Accessories category tile links to /catalog?category=accessories.
 *  AC-13 Trade-in promotional banner is present with text about trade-in credit.
 *  AC-14 'Get a Valuation' CTA links to /upgrade/trade-in.
 *  AC-15 Footer has 'About Vodacom' column with About Us link.
 *  AC-16 Footer has 'Support' column with Support Centre link.
 *  AC-17 Footer has 'Legal' column with Terms & Conditions link.
 *  AC-18 Footer has 'Follow Us' column with social media links.
 *  AC-19 Shared layout: header.header element is present.
 *  AC-20 Shared layout: footer.footer element is present.
 */

const HOME_URL = '/';

// ── AC-1 / AC-2: page load ────────────────────────────────────────────────────

describe('Storefront home page — AC-1/AC-2 page load', () => {
  it('returns HTTP 200', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.status).toBe(200);
  });

  it('Content-Type is text/html', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });

  it('H1 heading is "Welcome to Vodacom Shop"', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/<h1[^>]*>\s*Welcome to Vodacom Shop\s*<\/h1>/i);
  });
});

// ── AC-3: nav links ───────────────────────────────────────────────────────────

describe('Storefront home page — AC-3 header nav links', () => {
  it('nav contains "Devices" link to /catalog', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/href=["']\/catalog["'][^>]*>[\s\S]*?Devices[\s\S]*?<\/a>/i);
  });

  it('nav contains "Plans" link to /plans', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/href=["']\/plans["'][^>]*>[\s\S]*?Plans[\s\S]*?<\/a>/i);
  });

  it('nav contains "Accessories" link to /accessories', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/href=["']\/accessories["'][^>]*>[\s\S]*?Accessories[\s\S]*?<\/a>/i);
  });

  it('nav contains "Support" link to /support', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/href=["']\/support["'][^>]*>[\s\S]*?Support[\s\S]*?<\/a>/i);
  });
});

// ── AC-4: market / currency indicator ────────────────────────────────────────

describe('Storefront home page — AC-4 market/currency indicator', () => {
  it('"South Africa - ZAR" market indicator is present', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/South Africa\s*[-–]\s*ZAR/i);
  });
});

// ── AC-5: cart badge ──────────────────────────────────────────────────────────

describe('Storefront home page — AC-5 cart badge in header', () => {
  it('header contains a cart badge element', async () => {
    const res = await request(app).get(HOME_URL);
    // Matches a button/link/span with "cart" or a numeric badge in the header region
    expect(res.text).toMatch(/(cart|Cart|badge)/i);
  });
});

// ── AC-6 / AC-7: hero CTAs ────────────────────────────────────────────────────

describe('Storefront home page — AC-6/AC-7 hero CTAs', () => {
  it('"Shop Devices" link points to /catalog', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/href=["']\/catalog["'][^>]*>[\s\S]*?Shop Devices[\s\S]*?<\/a>/i);
  });

  it('"Explore Plans" link points to /plans', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/href=["']\/plans["'][^>]*>[\s\S]*?Explore Plans[\s\S]*?<\/a>/i);
  });

  it('hero section element (section.hero or section with hero class) is present', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/class=["'][^"']*hero[^"']*["']/i);
  });
});

// ── AC-8: Shop by Category heading ───────────────────────────────────────────

describe('Storefront home page — AC-8 Shop by Category section', () => {
  it('H2 heading "Shop by Category" is present', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/<h2[^>]*>\s*Shop by Category\s*<\/h2>/i);
  });

  it('section.categories element is present', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/class=["'][^"']*categories[^"']*["']/i);
  });
});

// ── AC-9 – AC-12: category tile links ────────────────────────────────────────

describe('Storefront home page — AC-9/AC-12 category tile links', () => {
  it('Smartphones tile links to /catalog?category=smartphones', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/href=["']\/catalog\?category=smartphones["']/i);
  });

  it('"Smartphones" category label is present', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/Smartphones/i);
  });

  it('Tablets tile links to /catalog?category=tablets', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/href=["']\/catalog\?category=tablets["']/i);
  });

  it('"Tablets" category label is present', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/Tablets/i);
  });

  it('SIM & eSIM tile links to /catalog?category=sim-esim', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/href=["']\/catalog\?category=sim-esim["']/i);
  });

  it('"SIM" or "eSIM" category label is present', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/SIM|eSIM/i);
  });

  it('Accessories tile links to /catalog?category=accessories', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/href=["']\/catalog\?category=accessories["']/i);
  });

  it('"Accessories" category label is present', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/Accessories/i);
  });
});

// ── AC-13 / AC-14: trade-in banner ───────────────────────────────────────────

describe('Storefront home page — AC-13/AC-14 trade-in promotional banner', () => {
  it('trade-in banner mentions R 5,000 credit', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/R\s*5[,.]?000/i);
  });

  it('trade-in banner heading is present', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/Trade in your old device and save/i);
  });

  it('"Get a Valuation" link points to /upgrade/trade-in', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/href=["']\/upgrade\/trade-in["'][^>]*>[\s\S]*?Get a Valuation[\s\S]*?<\/a>/i);
  });
});

// ── AC-15 – AC-18: footer columns ────────────────────────────────────────────

describe('Storefront home page — AC-15/AC-18 footer columns', () => {
  it('footer element with class "footer" is present', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/class=["'][^"']*footer[^"']*["']/i);
  });

  it('"About Vodacom" footer column heading is present', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/About Vodacom/i);
  });

  it('"About Us" footer link points to /about', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/href=["']\/about["'][^>]*>[\s\S]*?About Us[\s\S]*?<\/a>/i);
  });

  it('"Support" footer column heading is present', async () => {
    const res = await request(app).get(HOME_URL);
    // Matches the footer Support heading (distinct from the nav Support link)
    expect(res.text).toMatch(/Support Centre/i);
  });

  it('"Legal" footer column heading is present', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/Legal/i);
  });

  it('"Terms & Conditions" link points to /terms', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/href=["']\/terms["'][^>]*>[\s\S]*?Terms[\s\S]*?<\/a>/i);
  });

  it('"Follow Us" footer column heading is present', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/Follow Us/i);
  });

  it('Facebook social link is present', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/Facebook/i);
  });

  it('copyright notice is present', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/2026 Vodacom/i);
  });
});

// ── AC-19 / AC-20: shared layout elements ────────────────────────────────────

describe('Storefront home page — AC-19/AC-20 shared layout', () => {
  it('header.header element is present', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/<header[^>]*class=["'][^"']*header[^"']*["']/i);
  });

  it('footer.footer element is present', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/<footer[^>]*class=["'][^"']*footer[^"']*["']/i);
  });

  it('"Vodacom" logo link points to /', async () => {
    const res = await request(app).get(HOME_URL);
    expect(res.text).toMatch(/href=["']\/["'][^>]*>[\s\S]*?Vodacom[\s\S]*?<\/a>/i);
  });
});
