import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Eligibility Result page (Screen 4: wireframe_eligibility_result.html)
 *
 * Route   : GET /upgrade/eligibility (or equivalent)
 *
 * Acceptance criteria encoded here:
 *  AC-1  Eligibility result page loads at GET /upgrade/eligibility (HTTP 200, HTML).
 *  AC-2  Page contains an "Explore Financing Options" section.
 *  AC-3  "Get a Quote" CTA link is present inside the financing options section.
 *  AC-4  "Get a Quote" link navigates to the bundle configuration route
 *        (/upgrade/configure or /product/:id/configure), not to /upgrade/financing.
 *  AC-5  "Get a Quote" link carries financing context in the URL so the bundle
 *        configuration page can pre-load financing options for the selected device.
 *  AC-6  Financing context URL includes a productId or device identifier param so
 *        the configure page knows which device's financing to load.
 *  AC-7  The page renders the three demo upgrade devices listed in the wireframe
 *        (iPhone 15 Pro 256GB, Samsung Galaxy S24 Ultra, iPhone 15 128GB).
 *  AC-8  Each device in the "Available Upgrade Devices" section has a "View Details"
 *        link pointing to /product/:slug.
 *  AC-9  "Explore Financing Options" section text matches wireframe copy —
 *        "Spread the cost of your new device with flexible payment plans".
 *  AC-10 Page contains breadcrumb navigation including an "Upgrade Eligibility"
 *        or "Your Upgrade Eligibility" segment.
 *  AC-11 "You're eligible for an upgrade!" confirmation heading is present.
 *  AC-12 Current plan details section is rendered.
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

  it('H1 heading is "Your Upgrade Eligibility"', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/<h1[^>]*>\s*Your Upgrade Eligibility\s*<\/h1>/i);
  });
});

// ── AC-2: Explore Financing Options section ───────────────────────────────────

describe('Eligibility Result page — AC-2 Explore Financing Options section', () => {
  it('"Explore Financing Options" heading is rendered', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Explore Financing Options/i);
  });

  it('"Financing Options" section is present in the page', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/financing/i);
  });
});

// ── AC-3: Get a Quote CTA present ────────────────────────────────────────────

describe('Eligibility Result page — AC-3 Get a Quote CTA', () => {
  it('"Get a Quote" link or button is present', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Get a Quote/i);
  });

  it('"Get a Quote" is rendered as an anchor tag', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/<a[^>]*>[\s\S]*?Get a Quote[\s\S]*?<\/a>/i);
  });
});

// ── AC-4: Get a Quote navigates to bundle configuration ──────────────────────

describe('Eligibility Result page — AC-4 Get a Quote links to bundle configuration', () => {
  it('"Get a Quote" link href points to /upgrade/configure or /product/:id/configure', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    // Must NOT link to /upgrade/financing — must link to the configure page
    expect(res.text).toMatch(
      /href=["'][^"']*(upgrade\/configure|product\/[^"']+\/configure)[^"']*["']/i,
    );
  });

  it('"Get a Quote" link does NOT route directly to /upgrade/financing', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    // Extract href of the Get a Quote link and verify it is not /upgrade/financing
    const match = res.text.match(/<a[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?Get a Quote[\s\S]*?<\/a>/i);
    if (match) {
      expect(match[1]).not.toMatch(/^\/upgrade\/financing(\s|$|[?#])/i);
    } else {
      // If no match, force failure: the link must exist
      expect(match).not.toBeNull();
    }
  });
});

// ── AC-5: Get a Quote link carries financing context ─────────────────────────

describe('Eligibility Result page — AC-5 Get a Quote URL has financing context', () => {
  it('"Get a Quote" link URL includes a financing or context query parameter', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    // The link must pass some context so the configure page pre-loads financing
    expect(res.text).toMatch(
      /href=["'][^"']*(upgrade\/configure|product\/[^"']+\/configure)[^"']*(\?|&)[^"']*(financing|context=financing|financing=true)[^"']*["']/i,
    );
  });
});

// ── AC-6: financing context URL includes productId ───────────────────────────

describe('Eligibility Result page — AC-6 financing context carries productId', () => {
  it('"Get a Quote" URL includes a productId or device identifier parameter', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    // productId must be embedded in the CTA link so the configure page knows which device
    expect(res.text).toMatch(
      /href=["'][^"']*(upgrade\/configure|product\/[^"']+\/configure)[^"']*(\?|&)[^"']*productId=[^"'&]+[^"']*["']/i,
    );
  });
});

// ── AC-7: available upgrade devices listed ───────────────────────────────────

describe('Eligibility Result page — AC-7 available upgrade devices', () => {
  it('"Available Upgrade Devices" section heading is rendered', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Available Upgrade Devices/i);
  });

  it('"iPhone 15 Pro 256GB" device is listed', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/iPhone 15 Pro 256GB/i);
  });

  it('"Samsung Galaxy S24 Ultra" device is listed', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Samsung Galaxy S24 Ultra/i);
  });

  it('"iPhone 15 128GB" device is listed', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/iPhone 15 128GB/i);
  });
});

// ── AC-8: device View Details links ──────────────────────────────────────────

describe('Eligibility Result page — AC-8 device View Details links', () => {
  it('"View Details" link exists for iPhone 15 Pro pointing to /product/iphone-15-pro', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/href=["']\/product\/iphone-15-pro["']/);
  });

  it('"View Details" link exists for Samsung Galaxy S24 Ultra pointing to /product/samsung-s24-ultra', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/href=["']\/product\/samsung-s24-ultra["']/);
  });

  it('"View Details" link text is rendered', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/View Details/i);
  });
});

// ── AC-9: wireframe copy for financing section ───────────────────────────────

describe('Eligibility Result page — AC-9 financing section wireframe copy', () => {
  it('financing section body text matches wireframe: "Spread the cost of your new device"', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Spread the cost of your new device/i);
  });

  it('financing section body text mentions "flexible payment plans"', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/flexible payment plans/i);
  });
});

// ── AC-10: breadcrumb navigation ─────────────────────────────────────────────

describe('Eligibility Result page — AC-10 breadcrumb navigation', () => {
  it('nav.breadcrumb element is present', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/class=["'][^"']*breadcrumb[^"']*["']/);
  });

  it('"Upgrade Eligibility" breadcrumb segment is present', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Upgrade Eligibility/i);
  });

  it('Home link is present in the breadcrumb', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/href=["']\/?["'][^>]*>[\s\S]*?Home[\s\S]*?<\/a>/i);
  });
});

// ── AC-11: eligibility confirmation heading ───────────────────────────────────

describe('Eligibility Result page — AC-11 eligibility confirmation', () => {
  it('"You\'re eligible for an upgrade!" heading is rendered', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/You.re eligible for an upgrade/i);
  });
});

// ── AC-12: current plan section ───────────────────────────────────────────────

describe('Eligibility Result page — AC-12 current plan section', () => {
  it('"Your Current Plan" section heading is rendered', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    expect(res.text).toMatch(/Your Current Plan/i);
  });

  it('current plan section contains a plan name', async () => {
    const res = await request(app).get(ELIGIBILITY_URL);
    // Should show some plan name in the current plan area
    expect(res.text).toMatch(
      /Vodacom Red|Red Flexi|Unlimited|plan/i,
    );
  });
});
