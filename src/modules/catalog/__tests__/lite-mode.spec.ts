import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Lite mode end-to-end across storefront and catalog screens.
 *
 * Task requirements encoded here:
 *  AC-1  Lite mode toggle button is present in the shared site header on every screen.
 *  AC-2  Page JS persists the manual preference to localStorage.
 *  AC-3  Page JS auto-detects slow connections via the Navigator Connection API.
 *  AC-4  Page JS propagates ?lite=true to catalog and product API/navigation calls
 *        when lite mode is active.
 *  AC-5  Lite Mode Active banner appears on the product listing page when lite=true;
 *        absent when lite param is absent.
 *  AC-6  Storefront home: hero section is suppressed in lite mode (no Shop Devices CTA
 *        inside the hero banner, no hero image); page body signals lite-mode state.
 *  AC-7  Product listing: product cards carry the text-only lite layout class in lite
 *        mode; images are excluded from product cards in lite mode.
 *  AC-8  Product detail: recommendations carousel section is rendered in standard mode
 *        and is absent in lite mode.
 *  AC-9  Product detail: lite mode indicator banner rendered when lite=true.
 *  AC-10 Commerce flows (filters, View Details, Add to Cart, plan selection) remain
 *        fully operable in lite mode with no broken interactions.
 */

// ── AC-1: Lite mode toggle button in shared header ────────────────────────────

describe('Lite mode — AC-1 toggle button present in shared site header', () => {
  it('GET / includes a lite-mode toggle control inside the header element', async () => {
    const res = await request(app).get('/');
    // The header must contain a button or link whose class, id, or data attribute
    // identifies it as the lite-mode toggle.
    expect(res.text).toMatch(
      /<header[^>]*>[\s\S]*?(?:btn-lite|lite-toggle|lite-mode-toggle|data-action=["']toggle-lite["'])[\s\S]*?<\/header>/i,
    );
  });

  it('GET /catalog includes a lite-mode toggle control inside the header element', async () => {
    const res = await request(app).get('/catalog');
    expect(res.text).toMatch(
      /<header[^>]*>[\s\S]*?(?:btn-lite|lite-toggle|lite-mode-toggle|data-action=["']toggle-lite["'])[\s\S]*?<\/header>/i,
    );
  });

  it('GET /catalog?category=smartphones includes a lite-mode toggle control in the header', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(
      /<header[^>]*>[\s\S]*?(?:btn-lite|lite-toggle|lite-mode-toggle|data-action=["']toggle-lite["'])[\s\S]*?<\/header>/i,
    );
  });

  it('GET /product/iphone-15-pro includes a lite-mode toggle control inside the header element', async () => {
    const res = await request(app).get('/product/iphone-15-pro');
    expect(res.text).toMatch(
      /<header[^>]*>[\s\S]*?(?:btn-lite|lite-toggle|lite-mode-toggle|data-action=["']toggle-lite["'])[\s\S]*?<\/header>/i,
    );
  });

  it('lite-mode toggle control carries a visible label (e.g. "Lite Mode")', async () => {
    const res = await request(app).get('/catalog');
    // The toggle must show a human-readable label so users know it exists.
    expect(res.text).toMatch(/Lite Mode/i);
  });
});

// ── AC-2: localStorage persistence JS ────────────────────────────────────────

describe('Lite mode — AC-2 localStorage persistence of manual preference', () => {
  it('GET / page body contains localStorage.setItem for the lite-mode preference', async () => {
    const res = await request(app).get('/');
    expect(res.text).toMatch(
      /localStorage\s*\.\s*setItem\s*\(\s*['"][^'"]*lite[^'"]*['"]/i,
    );
  });

  it('GET /catalog page body contains localStorage.getItem for the lite-mode preference', async () => {
    const res = await request(app).get('/catalog');
    expect(res.text).toMatch(
      /localStorage\s*\.\s*getItem\s*\(\s*['"][^'"]*lite[^'"]*['"]/i,
    );
  });

  it('GET /product/iphone-15-pro page body contains localStorage read for the lite-mode key', async () => {
    const res = await request(app).get('/product/iphone-15-pro');
    expect(res.text).toMatch(
      /localStorage\s*\.\s*getItem\s*\(\s*['"][^'"]*lite[^'"]*['"]/i,
    );
  });
});

// ── AC-3: Navigator Connection API auto-detection JS ─────────────────────────

describe('Lite mode — AC-3 Navigator Connection API auto-detection', () => {
  it('GET /catalog page body references navigator.connection for network detection', async () => {
    const res = await request(app).get('/catalog');
    expect(res.text).toMatch(/navigator\s*\.\s*connection/i);
  });

  it('GET / page body references navigator.connection', async () => {
    const res = await request(app).get('/');
    expect(res.text).toMatch(/navigator\s*\.\s*connection/i);
  });

  it('GET /catalog JS checks effectiveType or saveData to auto-enable lite mode', async () => {
    const res = await request(app).get('/catalog');
    // Must inspect either effectiveType (looking for "2g") or saveData flag.
    expect(res.text).toMatch(/effectiveType|saveData/i);
  });
});

// ── AC-4: ?lite=true propagated to API / navigation calls ────────────────────

describe('Lite mode — AC-4 lite=true propagated to catalog and product API calls', () => {
  it('GET /catalog page JS includes lite=true in API or navigation URLs when lite mode is on', async () => {
    const res = await request(app).get('/catalog');
    // The page must contain inline JS that appends lite=true when navigating to
    // product pages or fetching catalog API data in lite mode.
    expect(res.text).toMatch(/['"`].*lite=true.*['"`]|lite=true/i);
  });

  it('GET /catalog?lite=true HTML links to product pages include lite=true', async () => {
    const res = await request(app).get('/catalog?lite=true');
    // View Details links should preserve lite=true so the product detail page
    // also renders in lite mode.
    expect(res.text).toMatch(/href=["'][^"']*\/product\/[^"']*lite=true[^"']*["']/i);
  });

  it('GET /product/iphone-15-pro?lite=true page JS propagates lite flag to API fetches', async () => {
    const res = await request(app).get('/product/iphone-15-pro?lite=true');
    expect(res.text).toMatch(/['"`].*lite=true.*['"`]|lite=true/i);
  });
});

// ── AC-5: Lite Mode Active banner on product listing ─────────────────────────

describe('Lite mode — AC-5 Lite Mode Active banner on product listing', () => {
  it('GET /catalog?lite=true shows "Lite Mode Active - Optimized for faster browsing" banner', async () => {
    const res = await request(app).get('/catalog?lite=true');
    expect(res.text).toMatch(/Lite Mode Active\s*[-–]\s*Optimized for faster browsing/i);
  });

  it('GET /catalog without lite param does NOT show Lite Mode Active banner', async () => {
    const res = await request(app).get('/catalog');
    expect(res.text).not.toMatch(/Lite Mode Active/i);
  });

  it('GET /catalog?category=smartphones&lite=true shows the lite banner above the product grid', async () => {
    const res = await request(app).get('/catalog?category=smartphones&lite=true');
    expect(res.text).toMatch(/Lite Mode Active/i);
  });

  it('GET /catalog?category=smartphones without lite param has no Lite Mode Active banner', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).not.toMatch(/Lite Mode Active/i);
  });

  it('Save-Data: on request header activates the lite banner on product listing', async () => {
    const res = await request(app).get('/catalog').set('Save-Data', 'on');
    expect(res.text).toMatch(/Lite Mode Active/i);
  });
});

// ── AC-6: Storefront home — hero section suppressed in lite mode ──────────────

describe('Lite mode — AC-6 Storefront home hero suppressed in lite mode', () => {
  it('GET /?lite=true marks the body or html element with data-lite-mode="true"', async () => {
    const res = await request(app).get('/?lite=true');
    expect(res.text).toMatch(/(?:<html|<body)[^>]*data-lite-mode=["']true["']/i);
  });

  it('GET /?lite=true does NOT render the full hero banner with "Shop Devices" CTA inside section.hero', async () => {
    const res = await request(app).get('/?lite=true');
    // In lite mode the hero section is suppressed; "Shop Devices" link may still
    // exist elsewhere but must NOT appear inside the hero banner element.
    expect(res.text).not.toMatch(
      /<section[^>]*class=["'][^"']*\bhero\b[^"']*["'][^>]*>[\s\S]*?Shop Devices[\s\S]*?<\/section>/i,
    );
  });

  it('GET /?lite=true does not render a hero banner image', async () => {
    const res = await request(app).get('/?lite=true');
    // The hero section must not contain an <img> element in lite mode.
    expect(res.text).not.toMatch(
      /<section[^>]*class=["'][^"']*\bhero\b[^"']*["'][^>]*>[\s\S]*?<img[\s\S]*?<\/section>/i,
    );
  });

  it('GET / (standard mode) renders the hero section with "Shop Devices" CTA', async () => {
    const res = await request(app).get('/');
    // Standard mode must show the full hero for non-lite users.
    expect(res.text).toMatch(
      /<section[^>]*class=["'][^"']*\bhero\b[^"']*["'][^>]*>[\s\S]*?Shop Devices[\s\S]*?<\/section>/i,
    );
  });

  it('GET /?lite=true suppresses the recommendations carousel on the home screen', async () => {
    const res = await request(app).get('/?lite=true');
    // No recommendations/carousel section should appear in lite mode.
    expect(res.text).not.toMatch(/class=["'][^"']*\brecommendations[\s\S]*?["']/i);
  });
});

// ── AC-7: Product listing — text-only card layout in lite mode ────────────────

describe('Lite mode — AC-7 Product listing text-only card layout in lite mode', () => {
  it('GET /catalog?lite=true renders product cards with the "product-card-lite" CSS class', async () => {
    const res = await request(app).get('/catalog?lite=true');
    expect(res.text).toMatch(/class=["'][^"']*product-card-lite[^"']*["']/i);
  });

  it('GET /catalog?lite=true product cards do NOT contain <img> elements', async () => {
    const res = await request(app).get('/catalog?lite=true');
    // In lite mode product images are stripped; no <img> should appear inside
    // a product card element.
    expect(res.text).not.toMatch(
      /class=["'][^"']*product-card[^"']*["'][\s\S]{0,400}?<img/i,
    );
  });

  it('GET /catalog (standard mode) product cards do NOT use the product-card-lite class', async () => {
    const res = await request(app).get('/catalog');
    // Standard mode cards use the full-image layout, not the lite text-only layout.
    expect(res.text).not.toMatch(/class=["'][^"']*product-card-lite[^"']*["']/i);
  });

  it('GET /catalog?category=smartphones&lite=true all product names remain visible in text-only cards', async () => {
    const res = await request(app).get('/catalog?category=smartphones&lite=true');
    // Core product data must still be present even without images.
    expect(res.text).toMatch(/iPhone 15 Pro 256GB/i);
    expect(res.text).toMatch(/Samsung Galaxy S24 Ultra/i);
    expect(res.text).toMatch(/iPhone 15 128GB/i);
  });

  it('GET /catalog?lite=true product prices are rendered in text-only cards', async () => {
    const res = await request(app).get('/catalog?lite=true');
    expect(res.text).toMatch(/R\s*24[,.]?999/i);
    expect(res.text).toMatch(/R\s*22[,.]?999/i);
  });
});

// ── AC-8: Product detail — recommendations carousel ──────────────────────────

describe('Lite mode — AC-8 Product detail recommendations carousel visibility', () => {
  it('GET /product/iphone-15-pro (standard mode) renders a section.recommendations carousel', async () => {
    const res = await request(app).get('/product/iphone-15-pro');
    expect(res.text).toMatch(/class=["'][^"']*\brecommendations\b[^"']*["']/i);
  });

  it('GET /product/iphone-15-pro standard mode recommendations contain at least one accessory', async () => {
    const res = await request(app).get('/product/iphone-15-pro');
    // Wireframe Screen 7 lists AirPods Pro, iPhone 15 Pro Case, 20W USB-C Power Adapter,
    // Screen Protector as recommended accessories.
    expect(res.text).toMatch(/AirPods|iPhone 15 Pro Case|Power Adapter|Screen Protector/i);
  });

  it('GET /product/iphone-15-pro?lite=true does NOT render section.recommendations', async () => {
    const res = await request(app).get('/product/iphone-15-pro?lite=true');
    expect(res.text).not.toMatch(/class=["'][^"']*\brecommendations\b[^"']*["']/i);
  });

  it('GET /product/iphone-15-pro?lite=true omits accessory carousel content', async () => {
    const res = await request(app).get('/product/iphone-15-pro?lite=true');
    // Complete-your-purchase accessories must not be rendered in lite mode.
    expect(res.text).not.toMatch(/AirPods Pro/i);
  });
});

// ── AC-9: Product detail — lite mode banner ───────────────────────────────────

describe('Lite mode — AC-9 Product detail shows lite mode indicator when lite=true', () => {
  it('GET /product/iphone-15-pro?lite=true renders a Lite Mode Active banner', async () => {
    const res = await request(app).get('/product/iphone-15-pro?lite=true');
    expect(res.text).toMatch(/Lite Mode Active/i);
  });

  it('GET /product/iphone-15-pro (standard mode) does NOT show a Lite Mode Active banner', async () => {
    const res = await request(app).get('/product/iphone-15-pro');
    expect(res.text).not.toMatch(/Lite Mode Active/i);
  });

  it('GET /product/iphone-15-pro?lite=true marks the page with data-lite-mode="true"', async () => {
    const res = await request(app).get('/product/iphone-15-pro?lite=true');
    expect(res.text).toMatch(/(?:<html|<body)[^>]*data-lite-mode=["']true["']/i);
  });

  it('GET /product/iphone-15-pro?lite=true does not render product hero image', async () => {
    const res = await request(app).get('/product/iphone-15-pro?lite=true');
    // Product hero images must be hidden in lite mode.
    expect(res.text).not.toMatch(
      /<section[^>]*class=["'][^"']*product-hero[^"']*["'][^>]*>[\s\S]*?<img[\s\S]*?<\/section>/i,
    );
  });
});

// ── AC-10: Commerce flows remain operable in lite mode ───────────────────────

describe('Lite mode — AC-10 commerce flows fully operable in lite mode', () => {
  // Filter interactions (product listing)
  it('GET /catalog?lite=true filter sidebar is present', async () => {
    const res = await request(app).get('/catalog?lite=true');
    expect(res.text).toMatch(/class=["'][^"']*filter-sidebar[^"']*["']/i);
  });

  it('GET /catalog?lite=true brand filter checkboxes are present', async () => {
    const res = await request(app).get('/catalog?lite=true');
    expect(res.text).toMatch(/name=["']brand-apple["']/i);
    expect(res.text).toMatch(/name=["']brand-samsung["']/i);
  });

  it('GET /catalog?lite=true "View Details" links are present on product cards', async () => {
    const res = await request(app).get('/catalog?lite=true');
    expect(res.text).toMatch(/View Details/i);
    expect(res.text).toMatch(/href=["']\/product\/iphone-15-pro["']/i);
  });

  it('GET /catalog?lite=true purchasable products have an "Add to Cart" button', async () => {
    const res = await request(app).get('/catalog?lite=true');
    expect(res.text).toMatch(/Add to Cart/i);
  });

  // Product detail commerce interactions
  it('GET /product/iphone-15-pro?lite=true "Add to Cart" button is present', async () => {
    const res = await request(app).get('/product/iphone-15-pro?lite=true');
    expect(res.text).toMatch(/Add to Cart/i);
  });

  it('GET /product/iphone-15-pro?lite=true plan selection panel is present', async () => {
    const res = await request(app).get('/product/iphone-15-pro?lite=true');
    expect(res.text).toMatch(/class=["'][^"']*plan-attach-panel[^"']*["']/i);
  });

  it('GET /product/iphone-15-pro?lite=true plan options are listed for selection', async () => {
    const res = await request(app).get('/product/iphone-15-pro?lite=true');
    // Plans must remain selectable so the user can complete checkout.
    expect(res.text).toMatch(/Vodacom/i);
    expect(res.text).toMatch(/R\s*\d+\/month/i);
  });

  it('GET /product/iphone-15-pro?lite=true product price is displayed for cart total accuracy', async () => {
    const res = await request(app).get('/product/iphone-15-pro?lite=true');
    expect(res.text).toMatch(/R\s*24[,.]?999/i);
  });

  // Cart page accessible in lite mode
  it('GET /cart?lite=true returns HTTP 200', async () => {
    const res = await request(app).get('/cart?lite=true');
    expect(res.status).toBe(200);
  });

  it('GET /cart?lite=true "Proceed to Checkout" button is present', async () => {
    const res = await request(app).get('/cart?lite=true');
    expect(res.text).toMatch(/Proceed to Checkout/i);
  });

  it('GET /checkout?lite=true returns HTTP 200', async () => {
    const res = await request(app).get('/checkout?lite=true');
    expect(res.status).toBe(200);
  });
});
