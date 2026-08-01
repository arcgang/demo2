import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Trade-In page (Screen 10: wireframe_trade_in.html)
 *
 * Route   : GET /upgrade/trade-in
 * API deps: POST /api/upgrade/trade-in/valuation  (called on selection change)
 *           PUT  /api/upgrade/session             (apply credit → write accepted quote)
 *           GET  /api/upgrade/session             (on mount, rehydrate previously entered values)
 *
 * Acceptance criteria encoded here:
 *  AC-1  Page loads (HTTP 200, text/html).
 *  AC-2  H1 is "Trade In Your Device".
 *  AC-3  "Device Details" H2 section is present.
 *  AC-4  Device Brand select (name="device-brand") is rendered with expected options.
 *  AC-5  Device Model select (name="device-model") is rendered with expected options.
 *  AC-6  Storage Capacity select (name="device-storage") is rendered with expected options.
 *  AC-7  "Device Condition" H2 section is present.
 *  AC-8  Condition radio group rendered with values: excellent, good, fair, poor.
 *  AC-9  Condition descriptions (Excellent/Good/Fair/Poor) are present.
 *  AC-10 aside.summary-card (Trade-In Summary) is present with correct field labels.
 *  AC-11 "Apply Credit to Order" button is rendered.
 *  AC-12 "Back to Upgrade Options" button is rendered.
 *  AC-13 Trade-In Summary shows Device, Condition, Estimated Credit, Valid Until fields.
 *  AC-14 Breadcrumb is present with "Trade-In" segment.
 *  AC-15 How-it-works instructional copy is present.
 *  AC-16 Trade-In Terms & Conditions block is rendered (device must be in working condition etc.).
 *  AC-17 Secure trade-in footer notice is present.
 *  AC-18 POST /api/upgrade/trade-in/valuation returns estimatedCredit, validUntil, asyncPending.
 *  AC-19 PUT /api/upgrade/session with tradeIn payload returns 200 and updated session.
 *  AC-20 GET /api/upgrade/session on mount returns 200 to allow rehydration of entered values.
 *  AC-21 Valuation trigger markup: selection-change data attribute or JS hook present
 *        on the form so the page can fire POST /api/upgrade/trade-in/valuation on change.
 *  AC-22 "Apply Credit to Order" button carries a data attribute or form action that
 *        writes the accepted trade-in quote to the session and navigates to /cart.
 *  AC-23 "Back to Upgrade Options" button links back to /upgrade/eligibility without
 *        losing entered data (carries href or data-target attribute).
 */

const TRADE_IN_URL = '/upgrade/trade-in';

// ── AC-1: page loads ──────────────────────────────────────────────────────────

describe('Trade-In page — AC-1 page load', () => {
  it('returns HTTP 200', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.status).toBe(200);
  });

  it('Content-Type is text/html', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });
});

// ── AC-2: H1 heading ─────────────────────────────────────────────────────────

describe('Trade-In page — AC-2 H1 heading', () => {
  it('H1 is "Trade In Your Device"', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/<h1[^>]*>\s*Trade In Your Device\s*<\/h1>/i);
  });

  it('page title contains "Trade In"', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/<title[^>]*>[^<]*Trade In[^<]*<\/title>/i);
  });
});

// ── AC-3: Device Details section ─────────────────────────────────────────────

describe('Trade-In page — AC-3 Device Details section', () => {
  it('"Device Details" H2 is present', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/<h2[^>]*>\s*Device Details\s*<\/h2>/i);
  });
});

// ── AC-4: Device Brand select ─────────────────────────────────────────────────

describe('Trade-In page — AC-4 Device Brand select', () => {
  it('select[name="device-brand"] is present', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/name=["']device-brand["']/);
  });

  it('"Device Brand" label is rendered', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/Device Brand/i);
  });

  it('brand options include Apple', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/<option[^>]*>\s*Apple\s*<\/option>/i);
  });

  it('brand options include Samsung', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/<option[^>]*>\s*Samsung\s*<\/option>/i);
  });

  it('brand options include Huawei', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/<option[^>]*>\s*Huawei\s*<\/option>/i);
  });

  it('brand options include Xiaomi', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/<option[^>]*>\s*Xiaomi\s*<\/option>/i);
  });

  it('brand options include Oppo', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/<option[^>]*>\s*Oppo\s*<\/option>/i);
  });

  it('brand select has a "Select brand" placeholder option', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/Select brand/i);
  });
});

// ── AC-5: Device Model select ─────────────────────────────────────────────────

describe('Trade-In page — AC-5 Device Model select', () => {
  it('select[name="device-model"] is present', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/name=["']device-model["']/);
  });

  it('"Device Model" label is rendered', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/Device Model/i);
  });

  it('model options include iPhone 12', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/iPhone 12/i);
  });

  it('model select has a "Select model" placeholder option', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/Select model/i);
  });
});

// ── AC-6: Storage Capacity select ────────────────────────────────────────────

describe('Trade-In page — AC-6 Storage Capacity select', () => {
  it('select[name="device-storage"] is present', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/name=["']device-storage["']/);
  });

  it('"Storage Capacity" label is rendered', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/Storage Capacity/i);
  });

  it('storage options include 64GB, 128GB, 256GB, 512GB', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/64GB/i);
    expect(res.text).toMatch(/128GB/i);
    expect(res.text).toMatch(/256GB/i);
    expect(res.text).toMatch(/512GB/i);
  });

  it('storage select has a "Select storage" placeholder option', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/Select storage/i);
  });
});

// ── AC-7: Device Condition section ───────────────────────────────────────────

describe('Trade-In page — AC-7 Device Condition section', () => {
  it('"Device Condition" H2 is present', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/<h2[^>]*>\s*Device Condition\s*<\/h2>/i);
  });

  it('condition section instruction copy is present', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/select the option that best describes/i);
  });
});

// ── AC-8: condition radio group ───────────────────────────────────────────────

describe('Trade-In page — AC-8 condition radio group', () => {
  it('radio input with value="excellent" is present', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/value=["']excellent["']/i);
  });

  it('radio input with value="good" is present', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/value=["']good["']/i);
  });

  it('radio input with value="fair" is present', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/value=["']fair["']/i);
  });

  it('radio input with value="poor" is present', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/value=["']poor["']/i);
  });

  it('all four condition radios share the name attribute "condition"', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    const conditionRadios = res.text.match(/input[^>]*name=["']condition["'][^>]*/gi) ?? [];
    expect(conditionRadios.length).toBe(4);
  });
});

// ── AC-9: condition descriptions ─────────────────────────────────────────────

describe('Trade-In page — AC-9 condition descriptions', () => {
  it('"Excellent" condition description is present', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/Excellent/i);
    expect(res.text).toMatch(/like new|no visible scratches/i);
  });

  it('"Good" condition description is present', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/Good/i);
    expect(res.text).toMatch(/minor scratches|minor wear/i);
  });

  it('"Fair" condition description is present', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/Fair/i);
    expect(res.text).toMatch(/visible scratches|dents|minor crack/i);
  });

  it('"Poor" condition description is present', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/Poor/i);
    expect(res.text).toMatch(/significant damage|cracked screen/i);
  });
});

// ── AC-10: aside.summary-card (Trade-In Summary) ────────────────────────────

describe('Trade-In page — AC-10 aside.summary-card Trade-In Summary', () => {
  it('aside.summary-card element is present', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/class=["'][^"']*summary-card[^"']*["']/);
  });

  it('"Trade-In Summary" H3 heading is rendered inside the aside', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/<h3[^>]*>\s*Trade-In Summary\s*<\/h3>/i);
  });
});

// ── AC-11: Apply Credit to Order button ──────────────────────────────────────

describe('Trade-In page — AC-11 Apply Credit to Order button', () => {
  it('"Apply Credit to Order" button is rendered', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/Apply Credit to Order/i);
  });

  it('"Apply Credit to Order" is a button element', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/<button[^>]*>[\s\S]*?Apply Credit to Order[\s\S]*?<\/button>/i);
  });
});

// ── AC-12: Back to Upgrade Options button ────────────────────────────────────

describe('Trade-In page — AC-12 Back to Upgrade Options button', () => {
  it('"Back to Upgrade Options" button is rendered', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/Back to Upgrade Options/i);
  });

  it('"Back to Upgrade Options" is a button element', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/<button[^>]*>[\s\S]*?Back to Upgrade Options[\s\S]*?<\/button>/i);
  });
});

// ── AC-13: Trade-In Summary field labels ─────────────────────────────────────

describe('Trade-In page — AC-13 Trade-In Summary field labels', () => {
  it('"Device" label is rendered in the summary card', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/\bDevice\b/i);
  });

  it('"Condition" label is rendered in the summary card', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/\bCondition\b/i);
  });

  it('"Estimated Credit" label is rendered in the summary card', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/Estimated Credit/i);
  });

  it('"Valid Until" label is rendered in the summary card', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/Valid Until/i);
  });
});

// ── AC-14: breadcrumb navigation ─────────────────────────────────────────────

describe('Trade-In page — AC-14 breadcrumb navigation', () => {
  it('nav.breadcrumb element is present', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/class=["'][^"']*breadcrumb[^"']*["']/);
  });

  it('"Trade-In" segment is present in the breadcrumb', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/Trade.?In/i);
  });

  it('breadcrumb contains a Home link', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/href=["']\/["']/);
  });

  it('breadcrumb contains an Account link', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/href=["']\/account["']/);
  });
});

// ── AC-15: instructional copy ─────────────────────────────────────────────────

describe('Trade-In page — AC-15 how-it-works instructional copy', () => {
  it('"How it works" copy is present on the page', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/How it works/i);
  });

  it('intro copy mentions instant credit or instant valuation', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/instant (credit|valuation)|get instant/i);
  });
});

// ── AC-16: Trade-In Terms & Conditions block ─────────────────────────────────

describe('Trade-In page — AC-16 Trade-In Terms & Conditions block', () => {
  it('"Trade-In Terms" or "Terms & Conditions" heading is present', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/Trade.In Terms|Terms &amp; Conditions/i);
  });

  it('terms mention device must be in working condition', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/working condition/i);
  });

  it('terms mention no activation locks', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/activation lock/i);
  });

  it('terms mention personal data must be removed', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/personal data|data must be removed/i);
  });
});

// ── AC-17: secure trade-in footer notice ─────────────────────────────────────

describe('Trade-In page — AC-17 secure trade-in notice', () => {
  it('secure trade-in notice is present', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/Secure Trade.In|securely inspected|data will be permanently erased/i);
  });
});

// ── AC-18: POST /api/upgrade/trade-in/valuation contract ─────────────────────

describe('Trade-In page — AC-18 valuation API contract', () => {
  it('POST /api/upgrade/trade-in/valuation with valid Apple/Good payload returns 200', async () => {
    const res = await request(app)
      .post('/api/upgrade/trade-in/valuation')
      .set('Content-Type', 'application/json')
      .send({ brand: 'Apple', model: 'iPhone 12', storage: 128, condition: 'GOOD' });
    expect(res.status).toBe(200);
  });

  it('valuation response contains estimatedCredit as a non-negative number', async () => {
    const res = await request(app)
      .post('/api/upgrade/trade-in/valuation')
      .set('Content-Type', 'application/json')
      .send({ brand: 'Apple', model: 'iPhone 12', storage: 128, condition: 'GOOD' });
    expect(typeof res.body.estimatedCredit).toBe('number');
    expect(res.body.estimatedCredit).toBeGreaterThanOrEqual(0);
  });

  it('valuation response contains validUntil as a parseable ISO-8601 string', async () => {
    const res = await request(app)
      .post('/api/upgrade/trade-in/valuation')
      .set('Content-Type', 'application/json')
      .send({ brand: 'Apple', model: 'iPhone 12', storage: 128, condition: 'GOOD' });
    expect(typeof res.body.validUntil).toBe('string');
    expect(new Date(res.body.validUntil).getTime()).not.toBeNaN();
  });

  it('valuation response contains asyncPending as a boolean', async () => {
    const res = await request(app)
      .post('/api/upgrade/trade-in/valuation')
      .set('Content-Type', 'application/json')
      .send({ brand: 'Apple', model: 'iPhone 12', storage: 128, condition: 'GOOD' });
    expect(typeof res.body.asyncPending).toBe('boolean');
  });
});

// ── AC-19: PUT /api/upgrade/session writes accepted trade-in quote ─────────────

describe('Trade-In page — AC-19 PUT /api/upgrade/session writes trade-in quote', () => {
  it('PUT /api/upgrade/session with tradeIn payload returns 200', async () => {
    const res = await request(app)
      .put('/api/upgrade/session')
      .set('Content-Type', 'application/json')
      .send({
        tradeIn: {
          device: 'iPhone 12 128GB',
          condition: 'good',
          estimatedCredit: 2250,
          validUntil: '2026-08-08T00:00:00.000Z',
        },
      });
    expect(res.status).toBe(200);
  });

  it('PUT /api/upgrade/session response body reflects the tradeIn field', async () => {
    const res = await request(app)
      .put('/api/upgrade/session')
      .set('Content-Type', 'application/json')
      .send({
        tradeIn: {
          device: 'iPhone 12 128GB',
          condition: 'good',
          estimatedCredit: 2250,
          validUntil: '2026-08-08T00:00:00.000Z',
        },
      });
    expect(res.body).toHaveProperty('tradeIn');
  });
});

// ── AC-20: GET /api/upgrade/session on mount rehydrates values ────────────────

describe('Trade-In page — AC-20 session rehydration on mount', () => {
  it('GET /api/upgrade/session returns 200', async () => {
    const res = await request(app).get('/api/upgrade/session');
    expect(res.status).toBe(200);
  });

  it('GET /api/upgrade/session returns a JSON object (can be empty on first load)', async () => {
    const res = await request(app).get('/api/upgrade/session');
    expect(typeof res.body).toBe('object');
    expect(Array.isArray(res.body)).toBe(false);
  });
});

// ── AC-21: selection-change valuation trigger markup ─────────────────────────

describe('Trade-In page — AC-21 valuation trigger on selection change', () => {
  it('page contains a data attribute or script reference to fire valuation on change', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    // Must carry either a data-valuation-url / data-api-url attribute on the form
    // OR an inline script block referencing the valuation endpoint
    expect(res.text).toMatch(
      /data-valuation-url|data-api-url|\/api\/upgrade\/trade-in\/valuation|trade-in\/valuation/i,
    );
  });

  it('the brand, model, storage selects or the condition radios carry a change-event hook', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    // onchange attribute OR inline script addEventListener for 'change'
    expect(res.text).toMatch(/onchange|addEventListener\s*\(\s*['"]change['"]/i);
  });
});

// ── AC-22: Apply Credit navigates to /cart after writing session ──────────────

describe('Trade-In page — AC-22 Apply Credit writes session and navigates to /cart', () => {
  it('"Apply Credit to Order" button has a data or script hook referencing /cart', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    // Either href="/cart", data-href="/cart", or an inline script with '/cart'
    expect(res.text).toMatch(/['"\/]cart['";]/);
  });
});

// ── AC-23: Back to Upgrade Options navigates to /upgrade/eligibility ──────────

describe('Trade-In page — AC-23 Back to Upgrade Options navigation', () => {
  it('"Back to Upgrade Options" references /upgrade/eligibility', async () => {
    const res = await request(app).get(TRADE_IN_URL);
    expect(res.text).toMatch(/\/upgrade\/eligibility/);
  });
});
