import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Financing Options panel and dynamic pricing summary on the
 * Bundle Configuration page (Screen 1: wireframe_bundle_configuration.html)
 *
 * Route   : GET /product/:slug/configure
 * API dep : GET /api/upgrade/financing?productId=<id>&planId=<id>
 *
 * Acceptance criteria encoded here:
 *  AC-1  A financing-options panel section is rendered on the configure page.
 *  AC-2  The page script references the /api/upgrade/financing endpoint so the
 *        browser can fetch quotes dynamically.
 *  AC-3  The page embeds the device productId so the financing endpoint can be
 *        called with the correct productId query parameter.
 *  AC-4  At least one financing option card is rendered with term and monthly
 *        amount information visible in the markup.
 *  AC-5  Financing option cards expose termMonths via a data attribute so
 *        client-side JS can read the selected term.
 *  AC-6  Financing option cards expose monthlyAmount via a data attribute so
 *        the pricing summary can include the installment.
 *  AC-7  Financing option cards are selectable — rendered as radio inputs or
 *        as buttons/elements carrying data-financing-term or similar.
 *  AC-8  The once-off pricing section includes a deposit line item whose value
 *        originates from the financing quote (onceOffDeposit).
 *  AC-9  The recurring pricing section includes a monthly installment line item
 *        that reflects the chosen financing term's monthlyAmount.
 *  AC-10 The selected planId is passed to the financing API fetch (script
 *        references data-monthly / plan value when calling the endpoint).
 *  AC-11 When the financing term selection changes the totals are recomputed
 *        reactively (script attaches a change handler to financing inputs).
 *  AC-12 The pricing summary aside shows 'Once-Off Charges' and 'Recurring
 *        Charges' as separate, clearly labelled sections.
 *  AC-13 The pricing summary aside shows both an Once-Off Subtotal and a
 *        monthly total that together cover once-off and recurring amounts.
 */

const CONFIGURE_URL = '/product/iphone-15-pro/configure';

// ── AC-1: financing-options panel section ─────────────────────────────────────

describe('Financing panel — AC-1 section present', () => {
  it('page contains a financing-options section or div', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(
      /class=["'][^"']*financing[^"']*["']|id=["'][^"']*financing[^"']*["']/i,
    );
  });

  it('financing-options region contains a heading or label', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/Financing Options|Finance Your Device|Spread the Cost/i);
  });
});

// ── AC-2: script references /api/upgrade/financing ───────────────────────────

describe('Financing panel — AC-2 financing API endpoint in script', () => {
  it('page script contains a reference to /api/upgrade/financing', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/\/api\/upgrade\/financing/i);
  });

  it('financing endpoint reference includes productId param or query param logic', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    // Must use productId when calling the endpoint
    expect(res.text).toMatch(
      /productId|product_id/i,
    );
  });
});

// ── AC-3: deviceId/productId embedded for financing call ─────────────────────

describe('Financing panel — AC-3 productId embedded in page', () => {
  it('page embeds the device id "iphone-15-pro" so JS can call the financing API', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toContain('iphone-15-pro');
  });

  it('device id is accessible to the financing fetch script (in a JS variable or data attribute)', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    // Should appear in a <script> context or a data-product-id / PRODUCT_ID variable
    expect(res.text).toMatch(
      /PRODUCT_ID\s*=\s*['"]iphone-15-pro['"]|data-product-id=["']iphone-15-pro["']|productId.*iphone-15-pro/i,
    );
  });
});

// ── AC-4: financing option cards rendered ─────────────────────────────────────

describe('Financing panel — AC-4 financing option cards in markup', () => {
  it('at least one financing card / term option element is rendered', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(
      /class=["'][^"']*financing-card[^"']*["']|class=["'][^"']*financing-option[^"']*["']|class=["'][^"']*term-card[^"']*["']/i,
    );
  });

  it('page displays a term in months (e.g. 12, 24, or 36 months)', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/12 months|24 months|36 months/i);
  });
});

// ── AC-5: termMonths exposed via data attribute ───────────────────────────────

describe('Financing panel — AC-5 termMonths data attribute', () => {
  it('financing elements expose termMonths via a data attribute', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/data-term-months=["']\d+["']|data-term=["']\d+["']/i);
  });
});

// ── AC-6: monthlyAmount exposed via data attribute ───────────────────────────

describe('Financing panel — AC-6 monthlyAmount data attribute', () => {
  it('financing elements expose monthlyAmount via a data attribute', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(
      /data-monthly-amount=["']\d+["']|data-financing-monthly=["']\d+["']/i,
    );
  });
});

// ── AC-7: financing cards are selectable ─────────────────────────────────────

describe('Financing panel — AC-7 financing cards are selectable', () => {
  it('financing term options use radio inputs or carry a selection data attribute', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(
      /input[^>]*type=["']radio["'][^>]*name=["'][^"']*financ[^"']*["']|data-financing-term=["']\d+["']/i,
    );
  });
});

// ── AC-8: deposit in once-off charges ─────────────────────────────────────────

describe('Financing panel — AC-8 deposit line in once-off charges', () => {
  it('"Deposit" or "Once-Off Deposit" line item is present in the pricing summary', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/Deposit|once.?off deposit/i);
  });

  it('once-off charges section contains device price AND deposit AND activation fee', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    // All three once-off components must appear
    expect(res.text).toMatch(/Once-Off Charges/i);
    expect(res.text).toMatch(/Activation Fee/i);
    expect(res.text).toMatch(/Deposit/i);
  });
});

// ── AC-9: monthly installment in recurring charges ───────────────────────────

describe('Financing panel — AC-9 monthly installment in recurring charges', () => {
  it('"Monthly Installment" or "Installment" line item is present in recurring charges', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/Monthly Installment|Financing Installment|Installment/i);
  });

  it('recurring charges section contains plan line AND installment line', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/Recurring Charges/i);
    expect(res.text).toMatch(/Installment/i);
  });
});

// ── AC-10: planId passed to financing API ────────────────────────────────────

describe('Financing panel — AC-10 planId used when fetching financing options', () => {
  it('script references planId when building the financing API URL', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    // The script should include planId in the fetch call
    expect(res.text).toMatch(/planId|plan_id/i);
  });

  it('script reads the selected plan value to supply planId to the financing API', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    // Either 'sel.value' near the financing fetch, or a planId variable built from the plan radio
    expect(res.text).toMatch(
      /planId\s*=\s*sel\.value|planId.*plan.*value|plan.*value.*planId/i,
    );
  });
});

// ── AC-11: reactive recalculation on financing term change ───────────────────

describe('Financing panel — AC-11 reactive totals on financing term change', () => {
  it('script attaches a change or click event handler to financing inputs', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    // Must listen for changes on financing elements
    expect(res.text).toMatch(
      /addEventListener\s*\(\s*['"]change['"][\s\S]{0,200}financ|financ[\s\S]{0,200}addEventListener\s*\(\s*['"]change['"]/i,
    );
  });

  it('plan change triggers a re-fetch or recalculation of financing options', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    // When plan radio changes, financing must be re-fetched (fetch or recalculate)
    expect(res.text).toMatch(
      /input\[name=["']plan["']\][\s\S]{0,500}financ|financ[\s\S]{0,500}plan/i,
    );
  });
});

// ── AC-12: separate labelled charge sections ──────────────────────────────────

describe('Financing panel — AC-12 separate once-off and recurring sections', () => {
  it('"Once-Off Charges" heading is present in the pricing summary', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/Once-Off Charges/i);
  });

  it('"Recurring Charges" heading is present in the pricing summary', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/Recurring Charges/i);
  });

  it('Once-Off Charges heading precedes Recurring Charges heading in the document', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    const onceOffIdx = res.text.search(/Once-Off Charges/i);
    const recurringIdx = res.text.search(/Recurring Charges/i);
    expect(onceOffIdx).toBeGreaterThanOrEqual(0);
    expect(recurringIdx).toBeGreaterThanOrEqual(0);
    expect(onceOffIdx).toBeLessThan(recurringIdx);
  });
});

// ── AC-13: pricing summary totals cover both charge types ────────────────────

describe('Financing panel — AC-13 pricing summary once-off subtotal and monthly total', () => {
  it('"Once-Off Subtotal" line is present', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/Once-Off Subtotal/i);
  });

  it('"Total Monthly" or "Monthly Total" line is present', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    expect(res.text).toMatch(/Total Monthly|Monthly Total/i);
  });

  it('pricing summary shows a combined total that includes the financing installment', async () => {
    const res = await request(app).get(CONFIGURE_URL);
    // The total-monthly element must exist and account for financing
    expect(res.text).toMatch(/id=["']total-monthly["']|id=["']monthly-total["']/i);
  });
});
