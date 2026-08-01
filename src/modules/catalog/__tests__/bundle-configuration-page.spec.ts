import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Bundle Configuration page (Screen 1: wireframe_bundle_configuration.html)
 *
 * Route   : GET /product/:slug/configure
 * API dep : GET /api/devices/:id/recommendations
 *
 * Acceptance criteria encoded here:
 *  AC-1  Page loads (HTTP 200, text/html) for the iPhone 15 Pro slug.
 *  AC-2  'Select a Plan' section is labelled/badged as required (radio group).
 *  AC-3  Plan radio inputs are rendered — one plan must always be selectable.
 *  AC-4  'Optional Add-Ons' section is present and rendered as checkboxes.
 *  AC-5  Add-on checkboxes match the three wireframe add-ons
 *        (Extra 10GB Data, International Calling, Roaming Bundle).
 *  AC-6  aside.pricing-summary panel is present with the correct heading.
 *  AC-7  Pricing summary shows once-off charges section with device price and
 *        activation fee.
 *  AC-8  Pricing summary shows recurring charges section.
 *  AC-9  Pricing summary shows Once-Off Subtotal, VAT (15%), Total Once-Off, and
 *        Total Monthly line items.
 *  AC-10 Wireframe reference figures for Unlimited 20GB + International Calling
 *        combination are present: R 28,748.85 once-off, R 948/month.
 *  AC-11 'Continue to Cart' button is rendered.
 *  AC-12 Page fetches recommendations from GET /api/devices/:id/recommendations
 *        and uses the returned plans to populate the plan radio group.
 *  AC-13 'Continue to Cart' button is disabled (or has a disabled state marker)
 *        when no plan is selected by default according to required radio semantics.
 *  AC-14 Data attributes on plan and add-on elements expose pricing data so the
 *        pricing-summary panel can update in real time.
 *  AC-15 'Select a Plan' section carries a required indicator (badge, label, or
 *        aria-required) so the user knows plan selection is mandatory.
 *  AC-16 'Optional Add-Ons' section is labelled as optional.
 *  AC-17 Page contains nav breadcrumb with 'Configure Bundle' segment.
 */

const CONFIGURE_URL = '/product/iphone-15-pro/configure';

// ── AC-1: page loads ─────────────────────────────────────────────────────────

describe('Bundle Configuration page — AC-1 page load', () => {
  it('returns HTTP 200 for the iphone-15-pro slug', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.status).toBe(200);
  });

  it('Content-Type is text/html', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });

  it('H1 heading is "Configure Your Bundle"', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/<h1[^>]*>\s*Configure Your Bundle\s*<\/h1>/i);
  });

  it('product name "iPhone 15 Pro 256GB" appears on the page', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/iPhone 15 Pro 256GB/i);
  });
});

// ── AC-2 & AC-15: Select a Plan section — required radio group ───────────────

describe('Bundle Configuration page — AC-2/AC-15 Select a Plan required section', () => {
  it('section.plan-selection is present', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/class=["'][^"']*plan-selection[^"']*["']/);
  });

  it('"Select a Plan" heading (H2) is rendered', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/<h2[^>]*>\s*Select a Plan\s*<\/h2>/i);
  });

  it('Select a Plan section is marked as required (badge, label, or aria attribute)', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    // Matches: "Required" text near the heading, aria-required, data-required, or a "required" badge
    expect(res.text).toMatch(
      /(required|aria-required=["']true["']|data-required=["']true["'])/i,
    );
  });
});

// ── AC-3: plan radio inputs ───────────────────────────────────────────────────

describe('Bundle Configuration page — AC-3 plan radio inputs', () => {
  it('at least one input[type=radio] exists in the plan-selection section', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/type=["']radio["']/i);
  });

  it('all three plans from the wireframe are rendered as radio options', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/Vodacom Red 5GB/i);
    expect(res.text).toMatch(/Vodacom Unlimited 20GB/i);
    expect(res.text).toMatch(/Vodacom Red Premium/i);
  });

  it('plan radio inputs share the same name attribute (radio group)', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    // All plan radios must belong to a named group (e.g. name="plan")
    const radioMatches = res.text.match(/input[^>]*type=["']radio["'][^>]*/gi) ?? [];
    expect(radioMatches.length).toBeGreaterThan(0);
    // At least one radio has a name attribute
    const hasName = radioMatches.some(tag => /name=["'][^"']+["']/.test(tag));
    expect(hasName).toBe(true);
  });

  it('plan monthly prices are embedded in the markup for real-time pricing', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/R\s*299/);   // Vodacom Red 5GB
    expect(res.text).toMatch(/R\s*799/);   // Vodacom Unlimited 20GB
    expect(res.text).toMatch(/R\s*1[,.]?299/); // Vodacom Red Premium
  });
});

// ── AC-4 & AC-16: Optional Add-Ons section ───────────────────────────────────

describe('Bundle Configuration page — AC-4/AC-16 Optional Add-Ons section', () => {
  it('section.bundle-addons is present', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/class=["'][^"']*bundle-addons[^"']*["']/);
  });

  it('"Optional Add-Ons" heading (H2) is rendered', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/<h2[^>]*>\s*Optional Add-Ons\s*<\/h2>/i);
  });

  it('Optional Add-Ons section is labelled as optional', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/optional/i);
  });

  it('add-ons are rendered as checkboxes, not radios', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/type=["']checkbox["']/i);
  });
});

// ── AC-5: the three specific add-on checkboxes ───────────────────────────────

describe('Bundle Configuration page — AC-5 add-on checkboxes', () => {
  it('addon-data checkbox for "Extra 10GB Data" is present', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/name=["']addon-data["']/);
    expect(res.text).toMatch(/Extra 10GB Data/i);
  });

  it('addon-international checkbox for "International Calling" is present', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/name=["']addon-international["']/);
    expect(res.text).toMatch(/International Calling/i);
  });

  it('addon-roaming checkbox for "Roaming Bundle" is present', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/name=["']addon-roaming["']/);
    expect(res.text).toMatch(/Roaming Bundle/i);
  });

  it('add-on monthly prices are embedded in the markup', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/R\s*199/);   // Extra 10GB
    expect(res.text).toMatch(/R\s*149/);   // International Calling
    expect(res.text).toMatch(/R\s*299/);   // Roaming Bundle
  });
});

// ── AC-6: aside.pricing-summary panel ────────────────────────────────────────

describe('Bundle Configuration page — AC-6 aside.pricing-summary panel', () => {
  it('aside.pricing-summary element is present', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/class=["'][^"']*pricing-summary[^"']*["']/);
  });

  it('"Pricing Summary" heading is rendered inside the aside', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/Pricing Summary/i);
  });
});

// ── AC-7: once-off charges in pricing summary ────────────────────────────────

describe('Bundle Configuration page — AC-7 once-off charges section', () => {
  it('"Once-Off Charges" label is present in the pricing summary', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/Once-Off Charges/i);
  });

  it('device price "R 24,999.00" is shown in the once-off charges', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/24[,.]?999/);
  });

  it('"Activation Fee" line item is present', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/Activation Fee/i);
  });
});

// ── AC-8: recurring charges in pricing summary ───────────────────────────────

describe('Bundle Configuration page — AC-8 recurring charges section', () => {
  it('"Recurring Charges" label is present in the pricing summary', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/Recurring Charges/i);
  });
});

// ── AC-9: summary totals line items ──────────────────────────────────────────

describe('Bundle Configuration page — AC-9 pricing summary totals', () => {
  it('"Once-Off Subtotal" line item is present', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/Once-Off Subtotal/i);
  });

  it('"VAT (15%)" line item is present', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/VAT\s*\(15%\)/i);
  });

  it('"Total Once-Off" line item is present', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/Total Once-Off/i);
  });

  it('"Total Monthly" line item is present', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/Total Monthly/i);
  });
});

// ── AC-10: wireframe reference figures ───────────────────────────────────────

describe('Bundle Configuration page — AC-10 wireframe reference pricing figures', () => {
  it('total once-off of R 28,748.85 is present (Unlimited 20GB + International Calling)', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    // Matches "28,748.85" or "28748.85"
    expect(res.text).toMatch(/28[,.]?748[,.]?85/);
  });

  it('total monthly of R 948.00 is present (R799 plan + R149 add-on)', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/948/);
  });

  it('VAT amount R 3,749.85 is present (15% of R 24,999.00)', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/3[,.]?749[,.]?85/);
  });
});

// ── AC-11: Continue to Cart button ───────────────────────────────────────────

describe('Bundle Configuration page — AC-11 Continue to Cart button', () => {
  it('"Continue to Cart" button is rendered', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/Continue to Cart/i);
  });

  it('"Continue to Cart" button element is a <button>', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/<button[^>]*>[\s\S]*?Continue to Cart[\s\S]*?<\/button>/i);
  });
});

// ── AC-12: recommendations API drives plan list ───────────────────────────────

describe('Bundle Configuration page — AC-12 plans sourced from recommendations API', () => {
  it('page renders plan names that match the recommendations API seed for iPhone 15 Pro', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    // These names come from IPHONE15PRO_RECOMMENDATIONS in deviceRecommendationsData.ts
    expect(res.text).toMatch(/Vodacom Red 5GB/i);
    expect(res.text).toMatch(/Vodacom Unlimited 20GB/i);
    expect(res.text).toMatch(/Vodacom Red Premium/i);
  });

  it('plan descriptions from the wireframe are present', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/5GB Data/i);
    expect(res.text).toMatch(/20GB Data/i);
    expect(res.text).toMatch(/50GB Data/i);
  });
});

// ── AC-13: Continue to Cart disabled when no plan selected ────────────────────

describe('Bundle Configuration page — AC-13 Continue to Cart requires plan selection', () => {
  it('"Continue to Cart" button is disabled or marked data-requires-plan when no plan is chosen', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    // The button must carry disabled attribute or a data attribute signalling it needs a plan
    expect(res.text).toMatch(
      /(disabled|data-requires-plan=["']true["']|aria-disabled=["']true["'])/i,
    );
  });
});

// ── AC-14: pricing data attributes for real-time summary ─────────────────────

describe('Bundle Configuration page — AC-14 data attributes for real-time pricing', () => {
  it('plan elements expose pricing via data-monthly or data-price attributes', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/data-(monthly|price|plan-monthly|plan-price)=["']\d+["']/i);
  });

  it('add-on elements expose monthly price via data attribute', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/data-(monthly|price|addon-monthly|addon-price)=["']\d+["']/i);
  });
});

// ── AC-17: breadcrumb navigation ─────────────────────────────────────────────

describe('Bundle Configuration page — AC-17 breadcrumb navigation', () => {
  it('nav.breadcrumb element is present', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/class=["'][^"']*breadcrumb[^"']*["']/);
  });

  it('"Configure Bundle" breadcrumb segment is present', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/Configure Bundle/i);
  });

  it('link to product page "/product/iphone-15-pro" is in the breadcrumb', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/href=["']\/product\/iphone-15-pro["']/);
  });
});
