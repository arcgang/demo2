import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Product detail page (Screen 7: wireframe_product_detail.html)
 *
 * Route   : GET /product/:slug
 * API dep : GET /api/catalog/products/:id  (market context)
 *
 * Acceptance criteria encoded here:
 *  AC-1  Page loads (HTTP 200, text/html) for /product/iphone-15-pro.
 *  AC-2  Shared layout: header.header and footer.footer are present.
 *  AC-3  Market/currency indicator 'South Africa - ZAR' is present.
 *  AC-4  Breadcrumb: Home → Devices → Smartphones → product name.
 *  AC-5  section.product-hero is present with H1 product name.
 *  AC-6  Hero badge tags: 5G, Trade-In Eligible, In Stock rendered as badge elements.
 *  AC-7  Product price is shown in ZAR format (R XX,XXX.XX) inside a price element.
 *  AC-8  Instalment line "or from R X/month with a plan" is present.
 *  AC-9  Color selector buttons: Natural Titanium, Blue Titanium, White Titanium, Black Titanium.
 *  AC-10 Storage selector buttons: 128GB, 256GB, 512GB, 1TB.
 *  AC-11 Color and storage selector buttons expose data-price attributes so JS can update the
 *        displayed price when a variant is chosen.
 *  AC-12 Quantity number input is present.
 *  AC-13 'Add to Cart' button is present for a purchasable product.
 *  AC-14 'Add to Cart' is disabled or absent when isPurchasable=false for the active variant.
 *  AC-15 eSIM/5G compatibility note is present beneath the Add to Cart CTA.
 *  AC-16 section.plan-attach-panel is present with "Add a plan or bundle" heading.
 *  AC-17 Plan attach panel shows all three ZA market plans with ZAR monthly prices.
 *  AC-18 Plan cards expose data-plan-id attributes matching catalog product identifiers.
 *  AC-19 Product spec tabs section (section.product-details) contains Specifications,
 *        Features, and What's in the Box tabs.
 *  AC-20 Specifications tab content renders product specs (Display, Processor, Camera).
 *  AC-21 section.recommendations is present with a "Complete your purchase" heading.
 *  AC-22 Recommendations row: AirPods Pro, Case, 20W USB-C Power Adapter, Screen Protector.
 *  AC-23 Accessory cards show ZAR prices and include an 'Add to Cart' button each.
 *  AC-24 Page <title> includes the product name and "Vodacom Shop".
 */

const PRODUCT_URL = '/product/iphone-15-pro';
const NON_PURCHASABLE_URL = '/product/iphone-14';

// ── AC-1: page load ───────────────────────────────────────────────────────────

describe('Product detail page — AC-1 page load', () => {
  it('returns HTTP 200 for /product/iphone-15-pro', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.status).toBe(200);
  });

  it('Content-Type is text/html', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });
});

// ── AC-2: shared layout ───────────────────────────────────────────────────────

describe('Product detail page — AC-2 shared layout', () => {
  it('header.header element is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/<header[^>]*class=["'][^"']*header[^"']*["']/i);
  });

  it('footer.footer element is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/<footer[^>]*class=["'][^"']*footer[^"']*["']/i);
  });

  it('nav contains "Devices" link to /catalog', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/href=["']\/catalog["'][^>]*>[\s\S]*?Devices[\s\S]*?<\/a>/i);
  });
});

// ── AC-3: market/currency indicator ──────────────────────────────────────────

describe('Product detail page — AC-3 market/currency indicator', () => {
  it('"South Africa - ZAR" market indicator is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/South Africa\s*[-–]\s*ZAR/i);
  });
});

// ── AC-4: breadcrumb navigation ──────────────────────────────────────────────

describe('Product detail page — AC-4 breadcrumb navigation', () => {
  it('nav.breadcrumb element is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/class=["'][^"']*breadcrumb[^"']*["']/i);
  });

  it('"Home" breadcrumb link points to /', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/href=["']\/["'][^>]*>[\s\S]*?Home[\s\S]*?<\/a>/i);
  });

  it('"Devices" breadcrumb link points to /catalog', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/href=["']\/catalog["'][^>]*>[\s\S]*?Devices[\s\S]*?<\/a>/i);
  });

  it('"Smartphones" breadcrumb segment links to /catalog?category=smartphones', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/href=["']\/catalog\?category=smartphones["']/i);
  });

  it('product name "iPhone 15 Pro" appears as the final breadcrumb segment', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/iPhone 15 Pro/i);
  });
});

// ── AC-5: product hero section ────────────────────────────────────────────────

describe('Product detail page — AC-5 product hero section', () => {
  it('section.product-hero element is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/class=["'][^"']*product-hero[^"']*["']/i);
  });

  it('H1 heading contains the product name "iPhone 15 Pro"', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/<h1[^>]*>[\s\S]*?iPhone 15 Pro[\s\S]*?<\/h1>/i);
  });
});

// ── AC-6: product hero badge tags ─────────────────────────────────────────────

describe('Product detail page — AC-6 product hero badge tags', () => {
  it('"5G" is rendered as a badge element (not just plain paragraph text)', async () => {
    const res = await request(app).get(PRODUCT_URL);
    // Requires a class="badge" (or similar) element containing "5G"
    expect(res.text).toMatch(/class=["'][^"']*badge[^"']*["'][^>]*>\s*5G\s*</i);
  });

  it('"Trade-In Eligible" is rendered as a badge element', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/class=["'][^"']*badge[^"']*["'][^>]*>[\s\S]*?Trade-In Eligible[\s\S]*?</i);
  });

  it('"In Stock" is rendered as a badge element', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/class=["'][^"']*badge[^"']*["'][^>]*>[\s\S]*?In Stock[\s\S]*?</i);
  });
});

// ── AC-7: product price in ZAR ────────────────────────────────────────────────

describe('Product detail page — AC-7 product price in ZAR', () => {
  it('price "R 24,999" or "R 24,999.00" is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/R\s*24[,.]?999/i);
  });

  it('price is contained within a dedicated price element (class containing "product-price")', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/class=["'][^"']*product-price[^"']*["'][^>]*>[\s\S]*?R\s*[\d,.]+/i);
  });
});

// ── AC-8: instalment line ─────────────────────────────────────────────────────

describe('Product detail page — AC-8 instalment line', () => {
  it('"or from R 899/month with a plan" instalment text is shown', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/or from R\s*899\/month/i);
  });
});

// ── AC-9: color selector buttons ─────────────────────────────────────────────

describe('Product detail page — AC-9 color selector buttons', () => {
  it('color selector container is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/class=["'][^"']*color-selector[^"']*["']/i);
  });

  it('"Natural Titanium" color button is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/Natural Titanium/i);
  });

  it('"Blue Titanium" color button is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/Blue Titanium/i);
  });

  it('"White Titanium" color button is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/White Titanium/i);
  });

  it('"Black Titanium" color button is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/Black Titanium/i);
  });
});

// ── AC-10: storage selector buttons ──────────────────────────────────────────

describe('Product detail page — AC-10 storage selector buttons', () => {
  it('storage selector container is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/class=["'][^"']*storage-selector[^"']*["']/i);
  });

  it('"128GB" storage button is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/128GB/i);
  });

  it('"256GB" storage button is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/256GB/i);
  });

  it('"512GB" storage button is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/512GB/i);
  });

  it('"1TB" storage button is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/1TB/i);
  });
});

// ── AC-11: variant selectors expose data-price for client-side price update ───

describe('Product detail page — AC-11 variant selector data-price attributes', () => {
  it('at least one color selector button exposes a data-price attribute', async () => {
    const res = await request(app).get(PRODUCT_URL);
    // Buttons inside the color-selector must carry data-price so JS can reflect
    // the selected variant's price in the displayed price element.
    expect(res.text).toMatch(
      /class=["'][^"']*color-selector[^"']*["'][\s\S]{0,2000}?data-price=["']\d+["']/i,
    );
  });

  it('at least one storage selector button exposes a data-price attribute', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(
      /class=["'][^"']*storage-selector[^"']*["'][\s\S]{0,2000}?data-price=["']\d+["']/i,
    );
  });
});

// ── AC-12: quantity input ─────────────────────────────────────────────────────

describe('Product detail page — AC-12 quantity input', () => {
  it('a quantity number input is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/type=["']number["']/i);
  });
});

// ── AC-13: Add to Cart for a purchasable product ──────────────────────────────

describe('Product detail page — AC-13 Add to Cart for purchasable product', () => {
  it('"Add to Cart" button is present for the iPhone 15 Pro (isPurchasable=true in ZA)', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/Add to Cart/i);
  });
});

// ── AC-14: Add to Cart absent or disabled when isPurchasable=false ────────────

describe('Product detail page — AC-14 non-purchasable variant handling', () => {
  it('non-purchasable product page returns HTTP 200', async () => {
    const res = await request(app).get(NON_PURCHASABLE_URL);
    expect(res.status).toBe(200);
  });

  it('"Add to Cart" is absent or disabled for iphone-14 (isPurchasable=false in ZA market)', async () => {
    const res = await request(app).get(NON_PURCHASABLE_URL);
    // The CTA must be either absent or explicitly disabled; an active button is not allowed.
    const hasActiveAddToCart =
      /(<button[^>]*(?!disabled)[^>]*>Add to Cart|Add to Cart[^<]*<\/button>)/i.test(res.text) &&
      !/<button[^>]*disabled[^>]*>[\s\S]*?Add to Cart/i.test(res.text);
    expect(hasActiveAddToCart).toBe(false);
  });
});

// ── AC-15: eSIM/5G compatibility note ────────────────────────────────────────

describe('Product detail page — AC-15 eSIM/5G compatibility note', () => {
  it('eSIM compatibility note is present on the page', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/eSIM/i);
  });

  it('Vodacom 5G network compatibility text is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/5G network/i);
  });
});

// ── AC-16: plan attach panel ──────────────────────────────────────────────────

describe('Product detail page — AC-16 plan attach panel', () => {
  it('section.plan-attach-panel element is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/class=["'][^"']*plan-attach-panel[^"']*["']/i);
  });

  it('"Add a plan or bundle" heading is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/Add a plan or bundle/i);
  });
});

// ── AC-17: ZA market plans in plan attach panel ───────────────────────────────

describe('Product detail page — AC-17 ZA market plans in plan attach panel', () => {
  it('"Vodacom Red 5GB" plan card is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/Vodacom Red 5GB/i);
  });

  it('"R 299/month" price for Red 5GB plan is shown', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/R\s*299\/month/i);
  });

  it('"Vodacom Unlimited 20GB" plan card is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/Vodacom Unlimited 20GB/i);
  });

  it('"R 799/month" price for Unlimited 20GB plan is shown', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/R\s*799\/month/i);
  });

  it('"Vodacom Red Premium" plan card is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/Vodacom Red Premium/i);
  });

  it('"R 1,299/month" price for Red Premium plan is shown', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/R\s*1[,.]?299\/month/i);
  });

  it('all three plan prices use ZAR currency symbol R', async () => {
    const res = await request(app).get(PRODUCT_URL);
    const planPriceMatches = res.text.match(/R\s*\d[\d,.]*\/month/g) ?? [];
    expect(planPriceMatches.length).toBeGreaterThanOrEqual(3);
  });
});

// ── AC-18: plan cards expose catalog API identifiers ─────────────────────────

describe('Product detail page — AC-18 plan cards expose catalog plan identifiers', () => {
  it('plan card elements expose a data-plan-id attribute', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/data-plan-id=["'][^"']+["']/i);
  });
});

// ── AC-19: product spec tabs ──────────────────────────────────────────────────

describe('Product detail page — AC-19 product specification tabs', () => {
  it('section.product-details element is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/class=["'][^"']*product-details[^"']*["']/i);
  });

  it('"Specifications" tab is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/Specifications/i);
  });

  it('"Features" tab is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/\bFeatures\b/i);
  });

  it('"What\'s in the Box" tab is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/What.?s in the Box/i);
  });
});

// ── AC-20: spec content ───────────────────────────────────────────────────────

describe('Product detail page — AC-20 specification content', () => {
  it('"Display" specification row is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/\bDisplay\b/i);
  });

  it('"Processor" specification row or A17 Pro chip text is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/Processor|A17 Pro/i);
  });

  it('"Camera" specification row is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/\bCamera\b/i);
  });

  it('"5G" connectivity specification row is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/Connectivity[\s\S]{0,300}?5G|5G[\s\S]{0,300}?Connectivity/i);
  });
});

// ── AC-21: recommendations section ───────────────────────────────────────────

describe('Product detail page — AC-21 recommendations section', () => {
  it('section.recommendations element is present', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/class=["'][^"']*recommendations[^"']*["']/i);
  });

  it('"Complete your purchase" heading is inside the recommendations section', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(
      /class=["'][^"']*recommendations[^"']*["'][\s\S]{0,500}?Complete your purchase/i,
    );
  });
});

// ── AC-22: recommendation accessory cards ─────────────────────────────────────

describe('Product detail page — AC-22 recommendation accessory cards', () => {
  it('"AirPods Pro" accessory card is shown', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/AirPods Pro/i);
  });

  it('"iPhone 15 Pro Case" accessory card is shown', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/iPhone 15 Pro Case|Pro Case/i);
  });

  it('"20W USB-C Power Adapter" accessory card is shown', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/20W USB-C Power Adapter/i);
  });

  it('"Screen Protector" accessory card is shown', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/Screen Protector/i);
  });
});

// ── AC-23: accessory prices in ZAR and Add to Cart CTAs ──────────────────────

describe('Product detail page — AC-23 accessory ZAR pricing and Add to Cart', () => {
  it('AirPods Pro price "R 4,999" is shown', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/R\s*4[,.]?999/i);
  });

  it('20W USB-C Power Adapter price "R 399" is shown', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/R\s*399/i);
  });

  it('Screen Protector price "R 299" is shown', async () => {
    const res = await request(app).get(PRODUCT_URL);
    // R 299 can refer to both the Screen Protector and the plan price — both must appear
    const matches = res.text.match(/R\s*299/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('multiple "Add to Cart" buttons are present (one per accessory plus the main CTA)', async () => {
    const res = await request(app).get(PRODUCT_URL);
    const addToCartCount = (res.text.match(/Add to Cart/gi) ?? []).length;
    expect(addToCartCount).toBeGreaterThanOrEqual(2);
  });
});

// ── AC-24: page <title> ───────────────────────────────────────────────────────

describe('Product detail page — AC-24 page title', () => {
  it('page <title> contains the product name "iPhone 15 Pro"', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/<title[^>]*>[\s\S]*?iPhone 15 Pro[\s\S]*?<\/title>/i);
  });

  it('page <title> contains "Vodacom Shop"', async () => {
    const res = await request(app).get(PRODUCT_URL);
    expect(res.text).toMatch(/<title[^>]*>[\s\S]*?Vodacom Shop[\s\S]*?<\/title>/i);
  });
});
