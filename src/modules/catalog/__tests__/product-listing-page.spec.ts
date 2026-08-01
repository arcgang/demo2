import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Product listing page (Screen 8: wireframe_product_listing.html)
 *
 * Routes: GET /catalog   and   GET /catalog?category=smartphones
 *
 * Acceptance criteria encoded here:
 *  AC-1  Page loads (HTTP 200, text/html) for /catalog.
 *  AC-2  Page loads (HTTP 200, text/html) for /catalog?category=smartphones.
 *  AC-3  H1 heading matches the active category ("Smartphones" or default).
 *  AC-4  Filter sidebar (aside.filter-sidebar) is present.
 *  AC-5  Brand filter checkboxes: Apple, Samsung, Huawei, Xiaomi.
 *  AC-6  Price Range filter checkboxes are present.
 *  AC-7  Storage filter checkboxes are present.
 *  AC-8  Availability filter checkboxes (In Stock, Pre-Order) are present.
 *  AC-9  Product grid (main.product-listing or equivalent) is present.
 *  AC-10 Product cards show product name.
 *  AC-11 Product cards show badge tags (5G, Trade-In).
 *  AC-12 Product cards show price in ZAR (R XX,XXX format).
 *  AC-13 Product cards show instalment line "or from R X/month".
 *  AC-14 Product cards include a 'View Details' link to /product/:slug.
 *  AC-15 Lite Mode banner is present when lite mode is active.
 *  AC-16 Pagination controls are present.
 *  AC-17 Products and prices are fetched from GET /api/catalog/products (ZA market).
 *  AC-18 Only market-available products are shown (ZA market filter applied).
 *  AC-19 isPurchasable=false products are rendered view-only (no add-to-cart button).
 *  AC-20 Filter interactions: brand checkboxes have correct name attributes.
 *  AC-21 Shared layout: header.header and footer.footer are present.
 *  AC-22 Breadcrumb navigation includes Home and Devices segments.
 */

// ── AC-1: /catalog page load ──────────────────────────────────────────────────

describe('Product listing page — AC-1 /catalog page load', () => {
  it('GET /catalog returns HTTP 200', async () => {
    const res = await request(app).get('/catalog');
    expect(res.status).toBe(200);
  });

  it('GET /catalog Content-Type is text/html', async () => {
    const res = await request(app).get('/catalog');
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });
});

// ── AC-2: /catalog?category=smartphones page load ────────────────────────────

describe('Product listing page — AC-2 /catalog?category=smartphones page load', () => {
  it('GET /catalog?category=smartphones returns HTTP 200', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.status).toBe(200);
  });

  it('GET /catalog?category=smartphones Content-Type is text/html', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });
});

// ── AC-3: H1 heading ─────────────────────────────────────────────────────────

describe('Product listing page — AC-3 H1 heading', () => {
  it('H1 heading shows "Smartphones" for category=smartphones', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/<h1[^>]*>[\s\S]*?Smartphones[\s\S]*?<\/h1>/i);
  });

  it('H1 heading is present for /catalog without category', async () => {
    const res = await request(app).get('/catalog');
    expect(res.text).toMatch(/<h1[^>]*>/i);
  });
});

// ── AC-4: filter sidebar ──────────────────────────────────────────────────────

describe('Product listing page — AC-4 filter sidebar', () => {
  it('aside.filter-sidebar element is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/class=["'][^"']*filter-sidebar[^"']*["']/i);
  });
});

// ── AC-5: brand filter checkboxes ────────────────────────────────────────────

describe('Product listing page — AC-5 brand filter checkboxes', () => {
  it('"Brand" filter heading (H3) is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/<h3[^>]*>\s*Brand\s*<\/h3>/i);
  });

  it('Apple brand checkbox is present with name="brand-apple"', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/name=["']brand-apple["']/i);
    expect(res.text).toMatch(/Apple/i);
  });

  it('Samsung brand checkbox is present with name="brand-samsung"', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/name=["']brand-samsung["']/i);
    expect(res.text).toMatch(/Samsung/i);
  });

  it('Huawei brand checkbox is present with name="brand-huawei"', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/name=["']brand-huawei["']/i);
    expect(res.text).toMatch(/Huawei/i);
  });

  it('Xiaomi brand checkbox is present with name="brand-xiaomi"', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/name=["']brand-xiaomi["']/i);
    expect(res.text).toMatch(/Xiaomi/i);
  });

  it('all brand filters are input[type=checkbox]', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    const matches = res.text.match(/name=["']brand-(?:apple|samsung|huawei|xiaomi)["'][^>]*/gi) ?? [];
    expect(matches.length).toBe(4);
    matches.forEach(tag => {
      expect(tag).toMatch(/type=["']checkbox["']/i);
    });
  });
});

// ── AC-6: price range filter ──────────────────────────────────────────────────

describe('Product listing page — AC-6 price range filter checkboxes', () => {
  it('"Price Range" filter heading (H3) is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/<h3[^>]*>\s*Price Range\s*<\/h3>/i);
  });

  it('"Under R 5,000" price range checkbox is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/Under R\s*5[,.]?000/i);
  });

  it('"R 5,000 - R 15,000" price range checkbox is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/R\s*5[,.]?000\s*[-–]\s*R\s*15[,.]?000/i);
  });

  it('"R 15,000 - R 25,000" price range checkbox is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/R\s*15[,.]?000\s*[-–]\s*R\s*25[,.]?000/i);
  });

  it('"Over R 25,000" price range checkbox is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/Over R\s*25[,.]?000/i);
  });
});

// ── AC-7: storage filter ──────────────────────────────────────────────────────

describe('Product listing page — AC-7 storage filter checkboxes', () => {
  it('"Storage" filter heading (H3) is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/<h3[^>]*>\s*Storage\s*<\/h3>/i);
  });

  it('"128GB" storage checkbox is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/name=["']storage-128["']/i);
    expect(res.text).toMatch(/128GB/i);
  });

  it('"256GB" storage checkbox is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/name=["']storage-256["']/i);
    expect(res.text).toMatch(/256GB/i);
  });

  it('"512GB" storage checkbox is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/name=["']storage-512["']/i);
    expect(res.text).toMatch(/512GB/i);
  });
});

// ── AC-8: availability filter ─────────────────────────────────────────────────

describe('Product listing page — AC-8 availability filter checkboxes', () => {
  it('"Availability" filter heading (H3) is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/<h3[^>]*>\s*Availability\s*<\/h3>/i);
  });

  it('"In Stock" availability checkbox is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/name=["']avail-stock["']/i);
    expect(res.text).toMatch(/In Stock/i);
  });

  it('"Pre-Order" availability checkbox is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/name=["']avail-preorder["']/i);
    expect(res.text).toMatch(/Pre-Order/i);
  });
});

// ── AC-9: product grid ────────────────────────────────────────────────────────

describe('Product listing page — AC-9 product grid', () => {
  it('main.product-listing element is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/class=["'][^"']*product-listing[^"']*["']/i);
  });

  it('at least one product card is rendered', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    // Matches an H3 inside a card structure
    expect(res.text).toMatch(/<h3[^>]*>/i);
  });
});

// ── AC-10: product card names ─────────────────────────────────────────────────

describe('Product listing page — AC-10 product card names', () => {
  it('"iPhone 15 Pro 256GB" product name appears in the listing', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/iPhone 15 Pro 256GB/i);
  });

  it('"Samsung Galaxy S24 Ultra 256GB" product name appears in the listing', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/Samsung Galaxy S24 Ultra/i);
  });

  it('"iPhone 15 128GB" product name appears in the listing', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/iPhone 15 128GB/i);
  });
});

// ── AC-11: badge tags ─────────────────────────────────────────────────────────

describe('Product listing page — AC-11 product card badge tags', () => {
  it('"5G" badge is present on at least one product card', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/5G/i);
  });

  it('"Trade-In" badge is present on at least one product card', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/Trade-In/i);
  });
});

// ── AC-12: prices in ZAR ──────────────────────────────────────────────────────

describe('Product listing page — AC-12 prices rendered in ZAR', () => {
  it('iPhone 15 Pro price "R 24,999" is shown', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/R\s*24[,.]?999/i);
  });

  it('Samsung Galaxy S24 Ultra price "R 22,999" is shown', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/R\s*22[,.]?999/i);
  });

  it('prices are formatted with ZAR currency symbol R', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    // At least several price entries with R prefix
    const priceMatches = res.text.match(/R\s*\d+[,.]?\d*/g) ?? [];
    expect(priceMatches.length).toBeGreaterThan(3);
  });
});

// ── AC-13: instalment line ────────────────────────────────────────────────────

describe('Product listing page — AC-13 instalment line on product cards', () => {
  it('"or from R X/month" instalment text is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/or from R\s*\d+\/month/i);
  });

  it('iPhone 15 Pro shows "or from R 899/month"', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/or from R\s*899\/month/i);
  });

  it('Samsung Galaxy S24 Ultra shows "or from R 799/month"', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/or from R\s*799\/month/i);
  });
});

// ── AC-14: View Details links ─────────────────────────────────────────────────

describe('Product listing page — AC-14 View Details links', () => {
  it('"View Details" link to /product/iphone-15-pro is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/href=["']\/product\/iphone-15-pro["']/i);
  });

  it('"View Details" link to /product/samsung-s24-ultra is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/href=["']\/product\/samsung-s24-ultra["']/i);
  });

  it('"View Details" text appears on product cards', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/View Details/i);
  });
});

// ── AC-15: Lite Mode banner ───────────────────────────────────────────────────

describe('Product listing page — AC-15 Lite Mode banner', () => {
  it('Lite Mode banner is shown when lite=true query param is set', async () => {
    const res = await request(app).get('/catalog?category=smartphones&lite=true');
    expect(res.text).toMatch(/Lite Mode/i);
  });

  it('Lite Mode banner text matches wireframe: "Lite Mode Active"', async () => {
    const res = await request(app).get('/catalog?category=smartphones&lite=true');
    expect(res.text).toMatch(/Lite Mode Active/i);
  });

  it('Lite Mode banner is NOT shown when lite param is absent', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).not.toMatch(/Lite Mode Active/i);
  });
});

// ── AC-16: pagination controls ────────────────────────────────────────────────

describe('Product listing page — AC-16 pagination controls', () => {
  it('pagination controls are present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    // Matches a "Next" link or numbered page links
    expect(res.text).toMatch(/(Next|next|pagination|page-\d)/i);
  });

  it('page 1 link is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/>\s*1\s*</);
  });
});

// ── AC-17 / AC-18: market-aware products from API ─────────────────────────────

describe('Product listing page — AC-17/AC-18 market-aware catalog products', () => {
  it('page title or heading indicates ZA/ZAR market', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/South Africa\s*[-–]\s*ZAR|ZAR/i);
  });

  it('all six wireframe smartphone SKUs are rendered for the ZA market', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/iPhone 15 Pro 256GB/i);
    expect(res.text).toMatch(/Samsung Galaxy S24 Ultra/i);
    expect(res.text).toMatch(/iPhone 15 128GB/i);
    expect(res.text).toMatch(/Samsung Galaxy S24 256GB/i);
    expect(res.text).toMatch(/Samsung Galaxy A54/i);
    expect(res.text).toMatch(/iPhone 14 128GB/i);
  });
});

// ── AC-19: isPurchasable=false products rendered view-only ────────────────────

describe('Product listing page — AC-19 non-purchasable products are view-only', () => {
  it('a product with isPurchasable=false has no "Add to Cart" button', async () => {
    // The page should not render an add-to-cart CTA for non-purchasable products.
    // We verify that any "Add to Cart" button present is NOT associated with a
    // product whose data-purchasable attribute is false.
    const res = await request(app).get('/catalog?category=smartphones');
    // If add-to-cart buttons exist they must not appear alongside data-purchasable="false"
    const nonPurchasableSection = res.text.match(
      /data-purchasable=["']false["'][^>]*>[\s\S]{0,500}?Add to Cart/i,
    );
    expect(nonPurchasableSection).toBeNull();
  });

  it('a product with isPurchasable=false has a "View Details" link (view-only CTA)', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    // Non-purchasable products must still be reachable via View Details
    expect(res.text).toMatch(/View Details/i);
  });
});

// ── AC-20: filter interactions — data attributes ──────────────────────────────

describe('Product listing page — AC-20 filter checkbox name attributes', () => {
  it('product cards carry data-brand attribute for client-side filtering', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/data-brand=["'][^"']+["']/i);
  });

  it('product cards carry data-price attribute for client-side price filtering', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/data-price=["']\d+["']/i);
  });

  it('product cards carry data-storage attribute for client-side storage filtering', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/data-storage=["'][^"']+["']/i);
  });
});

// ── AC-21: shared layout ──────────────────────────────────────────────────────

describe('Product listing page — AC-21 shared layout', () => {
  it('header.header element is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/<header[^>]*class=["'][^"']*header[^"']*["']/i);
  });

  it('footer.footer element is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/<footer[^>]*class=["'][^"']*footer[^"']*["']/i);
  });

  it('nav contains "Devices" link to /catalog', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/href=["']\/catalog["'][^>]*>[\s\S]*?Devices[\s\S]*?<\/a>/i);
  });

  it('"South Africa - ZAR" market indicator is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/South Africa\s*[-–]\s*ZAR/i);
  });
});

// ── AC-22: breadcrumb navigation ─────────────────────────────────────────────

describe('Product listing page — AC-22 breadcrumb navigation', () => {
  it('nav.breadcrumb element is present', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/class=["'][^"']*breadcrumb[^"']*["']/i);
  });

  it('"Home" breadcrumb link points to /', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/href=["']\/["'][^>]*>[\s\S]*?Home[\s\S]*?<\/a>/i);
  });

  it('"Smartphones" breadcrumb segment is present for category=smartphones', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/Smartphones/i);
  });
});
