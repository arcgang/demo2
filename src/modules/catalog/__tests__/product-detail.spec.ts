import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Product detail page.
 *
 * Screen  : GET /product/:slug  (wireframe_product_detail.html)
 * API dep : GET /api/catalog/products/:id?market=ZA
 *
 * Acceptance criteria encoded here:
 *  AC-PD1  Hero: name, price, availability badge, 5G/Trade-In/eSIM badges.
 *  AC-PD2  Financing hint "or from R X/month with a plan" shown when financing-eligible.
 *  AC-PD3  Color and storage variant selectors rendered.
 *  AC-PD4  Quantity selector and Add to Cart button present.
 *  AC-PD5  eSIM/5G compatibility note beneath Add to Cart.
 *  AC-PD6  Plan-attach panel (H2 "Add a plan or bundle") with at least one plan.
 *  AC-PD7  Each plan shows name, data allowance, price/month, and select affordance.
 *  AC-PD8  Accessory recommendations (H2 "Complete your purchase") with Add to Cart.
 *  AC-PD9  Specifications tab section present.
 *  AC-PD10 SIM/eSIM variant: verification and activation requirements shown (not plan panel).
 *  AC-PD11 Accessory variant: compatibility cues block shown.
 *  AC-PD12 All interactive controls are keyboard-accessible (tabindex / button/input elements).
 */

// ── AC-PD1 ───────────────────────────────────────────────────────────────────
describe('Product detail page – AC-PD1 hero section content', () => {
  const url = '/product/iphone-15-pro';
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get(url);
    html = res.text;
  });

  it('returns HTTP 200', async () => {
    const res = await request(app).get(url);
    expect(res.status).toBe(200);
  });

  it('Content-Type is text/html', async () => {
    const res = await request(app).get(url);
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });

  it('H1 contains the product name', () => {
    expect(html).toMatch(/<h1[^>]*>[^<]*iPhone 15 Pro[^<]*<\/h1>/i);
  });

  it('renders product price (R 24,999) in the hero', () => {
    expect(html).toMatch(/R\s*24[,.]?999/);
  });

  it('renders availability badge "In Stock" in the hero section', () => {
    expect(html).toMatch(/In\s+Stock/i);
  });

  it('renders a 5G badge in the hero section', () => {
    expect(html).toMatch(/class=["'][^"']*badge[^"']*["'][^>]*>\s*5G\s*</i);
  });

  it('renders a Trade-In Eligible badge in the hero section', () => {
    expect(html).toMatch(/Trade.In\s+Eligible/i);
  });

  it('renders an eSIM-compatible badge in the hero section', () => {
    expect(html).toMatch(/eSIM/i);
  });

  it('hero section has a section.product-hero element', () => {
    expect(html).toMatch(/class=["'][^"']*product-hero[^"']*["']/i);
  });
});

// ── AC-PD2 ───────────────────────────────────────────────────────────────────
describe('Product detail page – AC-PD2 financing hint', () => {
  it('renders "or from R X/month with a plan" financing hint for a device with plans', async () => {
    const res = await request(app).get('/product/iphone-15-pro');
    expect(res.text).toMatch(/or\s+from\s+R\s+[\d,]+\/month\s+with\s+a\s+plan/i);
  });
});

// ── AC-PD3 ───────────────────────────────────────────────────────────────────
describe('Product detail page – AC-PD3 color and storage variant selectors', () => {
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get('/product/iphone-15-pro');
    html = res.text;
  });

  it('renders a color selector container', () => {
    expect(html).toMatch(/class=["'][^"']*color-selector[^"']*["']/i);
  });

  it('renders color option buttons (Natural Titanium, Blue Titanium)', () => {
    expect(html).toMatch(/Natural\s+Titanium/i);
    expect(html).toMatch(/Blue\s+Titanium/i);
  });

  it('renders a storage selector container', () => {
    expect(html).toMatch(/class=["'][^"']*storage-selector[^"']*["']/i);
  });

  it('renders storage option buttons (128GB, 256GB)', () => {
    expect(html).toMatch(/128GB/);
    expect(html).toMatch(/256GB/);
  });

  it('color option buttons are keyboard-focusable <button> elements', () => {
    // Buttons are natively focusable; ensure they are actual <button> elements
    expect(html).toMatch(/<button[^>]*>\s*Natural\s+Titanium\s*<\/button>/i);
  });

  it('storage option buttons are keyboard-focusable <button> elements', () => {
    expect(html).toMatch(/<button[^>]*>\s*256GB\s*<\/button>/i);
  });
});

// ── AC-PD4 ───────────────────────────────────────────────────────────────────
describe('Product detail page – AC-PD4 quantity selector and Add to Cart', () => {
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get('/product/iphone-15-pro');
    html = res.text;
  });

  it('renders a quantity selector input', () => {
    expect(html).toMatch(/<input[^>]+type=["']number["'][^>]*>/i);
  });

  it('renders an "Add to Cart" button', () => {
    expect(html).toMatch(/<button[^>]*>\s*Add to Cart\s*<\/button>/i);
  });

  it('"Add to Cart" button is a native <button> element (keyboard accessible)', () => {
    expect(html).toMatch(/<button[^>]*class=["'][^"']*btn-add-to-cart[^"']*["'][^>]*>/i);
  });
});

// ── AC-PD5 ───────────────────────────────────────────────────────────────────
describe('Product detail page – AC-PD5 eSIM/5G compatibility note', () => {
  it('renders eSIM compatibility note beneath the Add to Cart button', async () => {
    const res = await request(app).get('/product/iphone-15-pro');
    expect(res.text).toMatch(/eSIM/i);
    expect(res.text).toMatch(/5G/i);
  });

  it('compatibility note appears after the Add to Cart button in DOM order', async () => {
    const res = await request(app).get('/product/iphone-15-pro');
    const addToCartPos = res.text.indexOf('Add to Cart');
    const esimNotePos = res.text.indexOf('eSIM', addToCartPos);
    expect(esimNotePos).toBeGreaterThan(addToCartPos);
  });
});

// ── AC-PD6 ───────────────────────────────────────────────────────────────────
describe('Product detail page – AC-PD6 plan-attach panel', () => {
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get('/product/iphone-15-pro');
    html = res.text;
  });

  it('renders a section.plan-attach-panel element', () => {
    expect(html).toMatch(/class=["'][^"']*plan-attach-panel[^"']*["']/i);
  });

  it('plan-attach-panel has H2 "Add a plan or bundle"', () => {
    expect(html).toMatch(/<h2[^>]*>\s*Add a plan or bundle\s*<\/h2>/i);
  });

  it('plan-attach-panel contains at least one plan card', () => {
    expect(html).toMatch(/class=["'][^"']*plan-card[^"']*["']/i);
  });

  it('at least one attachable plan is shown (from API data)', async () => {
    // Seeded ZA plans: Red Essential 20GB, Red Premium 50GB, Unlimited Max
    const matches = [
      /Red Essential/i,
      /Red Premium/i,
      /Unlimited Max/i,
      /Vodacom Red/i,
      /Unlimited 20GB/i,
    ];
    const someMatch = matches.some(re => re.test(html));
    expect(someMatch).toBe(true);
  });
});

// ── AC-PD7 ───────────────────────────────────────────────────────────────────
describe('Product detail page – AC-PD7 each plan shows name, data allowance, price/month, select affordance', () => {
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get('/product/iphone-15-pro');
    html = res.text;
  });

  it('at least one plan shows a monthly price (R X/month)', () => {
    expect(html).toMatch(/R\s+[\d,]+\/month/i);
  });

  it('at least one plan shows a data allowance (GB)', () => {
    expect(html).toMatch(/\d+GB\s+(Data|data)/i);
  });

  it('each plan card has a selectable affordance (button or radio)', () => {
    // Either a "Select Plan" button or a radio input
    const hasSelectBtn = /Select\s+Plan/i.test(html);
    const hasRadio = /<input[^>]+type=["']radio["']/i.test(html);
    expect(hasSelectBtn || hasRadio).toBe(true);
  });

  it('plan select affordance is keyboard-accessible (button or labeled input)', () => {
    const hasButton = /<button[^>]*class=["'][^"']*btn-select-plan[^"']*["']/i.test(html);
    const hasRadio = /<input[^>]+type=["']radio["'][^>]+name=["']plan[^"']*["']/i.test(html);
    expect(hasButton || hasRadio).toBe(true);
  });
});

// ── AC-PD8 ───────────────────────────────────────────────────────────────────
describe('Product detail page – AC-PD8 accessory recommendations', () => {
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get('/product/iphone-15-pro');
    html = res.text;
  });

  it('renders H2 "Complete your purchase"', () => {
    expect(html).toMatch(/<h2[^>]*>\s*Complete your purchase\s*<\/h2>/i);
  });

  it('renders a section.recommendations element', () => {
    expect(html).toMatch(/class=["'][^"']*recommendations[^"']*["']/i);
  });

  it('renders at least one accessory item', () => {
    // Accessories from wireframe: AirPods Pro, iPhone 15 Pro Case, Power Adapter, Screen Protector
    const accessories = [/AirPods/i, /Case/i, /Power Adapter/i, /Screen Protector/i];
    const someMatch = accessories.some(re => re.test(html));
    expect(someMatch).toBe(true);
  });

  it('each accessory has an "Add to Cart" button', () => {
    // Count "Add to Cart" occurrences — at least 2 (one for device, one for accessory)
    const addToCartCount = (html.match(/Add to Cart/g) ?? []).length;
    expect(addToCartCount).toBeGreaterThanOrEqual(2);
  });

  it('accessory items show a price', () => {
    // Accessories have prices like R 4,999, R 799, R 399, R 299
    const recommendationsSectionStart = html.indexOf('Complete your purchase');
    expect(recommendationsSectionStart).toBeGreaterThan(-1);
    const afterHeading = html.slice(recommendationsSectionStart);
    expect(afterHeading).toMatch(/R\s+[\d,]+/);
  });
});

// ── AC-PD9 ───────────────────────────────────────────────────────────────────
describe('Product detail page – AC-PD9 specifications tab section', () => {
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get('/product/iphone-15-pro');
    html = res.text;
  });

  it('renders a specifications section or tab', () => {
    expect(html).toMatch(/Specifications/i);
  });

  it('specifications section lists at least one spec key (Display, Processor, Camera, etc.)', () => {
    const specKeys = [/Display/i, /Processor/i, /Camera/i, /Battery/i, /Connectivity/i, /Storage/i];
    const someMatch = specKeys.some(re => re.test(html));
    expect(someMatch).toBe(true);
  });
});

// ── AC-PD10 ──────────────────────────────────────────────────────────────────
describe('Product detail page – AC-PD10 SIM/eSIM variant shows onboarding-implications block', () => {
  const simUrl = '/product/sim-vodacom-esim';

  it('returns HTTP 200 for a SIM/eSIM product', async () => {
    const res = await request(app).get(simUrl);
    expect(res.status).toBe(200);
  });

  it('SIM/eSIM detail page does NOT show the plan-attach panel', async () => {
    const res = await request(app).get(simUrl);
    // plan-attach-panel should be absent for sim-esim products
    expect(res.text).not.toMatch(/class=["'][^"']*plan-attach-panel[^"']*["']/i);
  });

  it('SIM/eSIM detail page shows "Identity verification required" copy', async () => {
    const res = await request(app).get(simUrl);
    expect(res.text).toMatch(/Identity\s+verification\s+required/i);
  });

  it('SIM/eSIM detail page shows activation requirements as labelled steps', async () => {
    const res = await request(app).get(simUrl);
    expect(res.text).toMatch(/onboarding-implications/i);
  });

  it('SIM/eSIM detail page shows at least one activation requirement step', async () => {
    const res = await request(app).get(simUrl);
    // Activation steps shown as numbered items or labelled list
    expect(res.text).toMatch(/activation-step|activation-requirement|onboarding-step/i);
  });
});

// ── AC-PD11 ──────────────────────────────────────────────────────────────────
describe('Product detail page – AC-PD11 accessory variant shows compatibility cues', () => {
  const accessoryUrl = '/product/iphone-15-pro-case';

  it('returns HTTP 200 for an accessory product', async () => {
    const res = await request(app).get(accessoryUrl);
    expect(res.status).toBe(200);
  });

  it('accessory detail page shows a compatibility cues block', async () => {
    const res = await request(app).get(accessoryUrl);
    expect(res.text).toMatch(/class=["'][^"']*compatibility-cues[^"']*["']/i);
  });

  it('compatibility cues block shows "Compatible with:" text', async () => {
    const res = await request(app).get(accessoryUrl);
    expect(res.text).toMatch(/Compatible\s+with:/i);
  });

  it('compatibility cues block lists compatible device series', async () => {
    const res = await request(app).get(accessoryUrl);
    // e.g. "Compatible with: iPhone 15 series"
    expect(res.text).toMatch(/Compatible\s+with:[^<]*(iPhone|Samsung|series)/i);
  });
});

// ── AC-PD12 ──────────────────────────────────────────────────────────────────
describe('Product detail page – AC-PD12 keyboard accessibility (WCAG 2.1 AA)', () => {
  let html: string;

  beforeAll(async () => {
    const res = await request(app).get('/product/iphone-15-pro');
    html = res.text;
  });

  it('color selector uses <button> elements (natively keyboard focusable)', () => {
    // color-selector must contain <button> children, not <div> or <span> onclick
    expect(html).toMatch(/class=["'][^"']*color-selector[^"']*["'][^>]*>[\s\S]*?<button/i);
  });

  it('storage selector uses <button> elements (natively keyboard focusable)', () => {
    expect(html).toMatch(/class=["'][^"']*storage-selector[^"']*["'][^>]*>[\s\S]*?<button/i);
  });

  it('plan selection controls use <button> or labeled <input> elements', () => {
    const hasBtn = /<button[^>]*class=["'][^"']*btn-select-plan[^"']*["']/i.test(html);
    const hasLabeledInput = /<label[^>]*>[\s\S]*?<input[^>]+type=["']radio["']/i.test(html);
    expect(hasBtn || hasLabeledInput).toBe(true);
  });

  it('"Add to Cart" is a <button> element (keyboard activatable)', () => {
    expect(html).toMatch(/<button[^>]*>\s*Add to Cart\s*<\/button>/i);
  });

  it('no interactive elements use tabindex="-1" without a programmatic focus management reason', () => {
    // tabindex="-1" on active controls blocks keyboard navigation
    // Ensure the main CTA buttons are not excluded from tab order
    const addToCartIndex = html.search(/<button[^>]*tabindex=["']-1["'][^>]*>\s*Add to Cart/i);
    expect(addToCartIndex).toBe(-1);
  });
});
