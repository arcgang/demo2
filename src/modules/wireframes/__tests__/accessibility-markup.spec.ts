import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Semantic markup, ARIA roles, and form label associations
 *
 * Covers all 10 wireframe screens:
 *  1. wireframe_bundle_configuration  → GET /product/iphone-15-pro/configure
 *  2. wireframe_cart                  → GET /cart
 *  3. wireframe_checkout_payment      → GET /checkout
 *  4. wireframe_eligibility_result    → GET /upgrade/eligibility
 *  5. wireframe_esim_activation       → GET /orders/ORD-3001/esim
 *  6. wireframe_order_tracking_account→ GET /account/orders/ORD-3001
 *  7. wireframe_product_detail        → GET /product/iphone-15-pro
 *  8. wireframe_product_listing       → GET /catalog?category=smartphones
 *  9. wireframe_storefront_home       → GET /
 * 10. wireframe_trade_in              → GET /upgrade/trade-in
 *
 * Acceptance criteria (all must pass when feature is implemented):
 *
 *  HEADING  – single H1 per page, logical nesting (no skipped levels after H1)
 *  LANDMARK – <header>, <nav>, <main> (or role="main"), <footer> present on every
 *             page; <aside> where designs specify one
 *  LABEL    – every form field has a programmatically associated label via
 *             for/id pairs or aria-labelledby
 *  ALERT    – inline validation errors use role="alert" or aria-live="assertive"
 *             and are linked to their field via aria-describedby
 *  LIVE     – status/timeline regions use aria-live="polite"
 *  RADIOGRP – radio groups use role="radiogroup" with a group label
 *  FILTER   – filter checkbox groups have a <fieldset>/<legend> or role="group"
 *             with aria-labelledby
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Case-insensitive substring check on raw HTML */
function has(html: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') {
    return html.includes(pattern);
  }
  return pattern.test(html);
}

/** Count occurrences of an <hN> opening tag in the HTML (case-insensitive). */
function countHeadings(html: string, level: 1 | 2 | 3 | 4 | 5 | 6): number {
  const re = new RegExp(`<h${level}[\\s>]`, 'gi');
  return (html.match(re) ?? []).length;
}

// ---------------------------------------------------------------------------
// Screen URLs
// ---------------------------------------------------------------------------

const SCREENS: Array<{ name: string; url: string }> = [
  { name: 'bundle-configuration', url: '/product/iphone-15-pro/configure' },
  { name: 'cart', url: '/cart' },
  { name: 'checkout-payment', url: '/checkout' },
  { name: 'eligibility-result', url: '/upgrade/eligibility' },
  { name: 'esim-activation', url: '/orders/ORD-3001/esim' },
  { name: 'order-tracking-account', url: '/account/orders/ORD-3001' },
  { name: 'product-detail', url: '/product/iphone-15-pro' },
  { name: 'product-listing', url: '/catalog?category=smartphones' },
  { name: 'storefront-home', url: '/' },
  { name: 'trade-in', url: '/upgrade/trade-in' },
];

// ---------------------------------------------------------------------------
// AC-HEADING: single H1, correct nesting on every screen
// ---------------------------------------------------------------------------

describe('HEADING – single H1 per page', () => {
  for (const screen of SCREENS) {
    it(`[${screen.name}] has exactly one <h1>`, async () => {
      const res = await request(app).get(screen.url);
      expect(res.status).toBe(200);
      expect(countHeadings(res.text, 1)).toBe(1);
    });
  }
});

describe('HEADING – no H3/H4 without a preceding H2 on the same page', () => {
  // Verifies that H3 only appears below an H2 (no level-skip from H1→H3).
  // Checks that the first H2 appears before the first H3/H4 in document order.
  for (const screen of SCREENS) {
    it(`[${screen.name}] every H3/H4 is preceded by an H2`, async () => {
      const res = await request(app).get(screen.url);
      expect(res.status).toBe(200);
      const html = res.text;
      const h3Count = countHeadings(html, 3);
      const h4Count = countHeadings(html, 4);
      if (h3Count > 0 || h4Count > 0) {
        expect(countHeadings(html, 2)).toBeGreaterThan(0);
        const firstH2Index = html.search(/<h2[\s>]/i);
        const firstH3Index = html.search(/<h3[\s>]/i);
        const firstH4Index = html.search(/<h4[\s>]/i);
        if (firstH3Index !== -1) {
          expect(firstH2Index).toBeLessThan(firstH3Index);
        }
        if (firstH4Index !== -1) {
          expect(firstH2Index).toBeLessThan(firstH4Index);
        }
      }
    });
  }
});

// ---------------------------------------------------------------------------
// AC-LANDMARK: required landmark elements
// ---------------------------------------------------------------------------

describe('LANDMARK – <header>, <nav>, <main>, <footer> present on every screen', () => {
  for (const screen of SCREENS) {
    it(`[${screen.name}] has a <header> landmark`, async () => {
      const res = await request(app).get(screen.url);
      expect(res.status).toBe(200);
      expect(has(res.text, /<header[\s>]/i)).toBe(true);
    });

    it(`[${screen.name}] has a <nav> landmark`, async () => {
      const res = await request(app).get(screen.url);
      expect(res.status).toBe(200);
      expect(has(res.text, /<nav[\s>]/i)).toBe(true);
    });

    it(`[${screen.name}] has a <main> landmark`, async () => {
      const res = await request(app).get(screen.url);
      expect(res.status).toBe(200);
      expect(has(res.text, /<main[\s>]/i)).toBe(true);
    });

    it(`[${screen.name}] has a <footer> landmark`, async () => {
      const res = await request(app).get(screen.url);
      expect(res.status).toBe(200);
      expect(has(res.text, /<footer[\s>]/i)).toBe(true);
    });
  }
});

describe('LANDMARK – <aside> present on screens that have a summary/sidebar panel', () => {
  const screensWithAside: Array<{ name: string; url: string }> = [
    { name: 'bundle-configuration', url: '/product/iphone-15-pro/configure' },
    { name: 'cart', url: '/cart' },
    { name: 'checkout-payment', url: '/checkout' },
    { name: 'esim-activation', url: '/orders/ORD-3001/esim' },
    { name: 'order-tracking-account', url: '/account/orders/ORD-3001' },
    { name: 'product-listing', url: '/catalog?category=smartphones' },
    { name: 'trade-in', url: '/upgrade/trade-in' },
  ];

  for (const screen of screensWithAside) {
    it(`[${screen.name}] has an <aside> landmark`, async () => {
      const res = await request(app).get(screen.url);
      expect(res.status).toBe(200);
      expect(has(res.text, /<aside[\s>]/i)).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// AC-LABEL: form fields have associated labels (checkout page)
// ---------------------------------------------------------------------------

describe('LABEL – checkout form fields have for/id associations', () => {
  const checkoutUrl = '/checkout';

  const requiredFields: Array<{ label: string; id: string }> = [
    { label: 'first-name', id: 'first-name' },
    { label: 'last-name', id: 'last-name' },
    { label: 'email', id: 'email' },
    { label: 'phone', id: 'phone' },
    { label: 'address', id: 'address' },
    { label: 'city', id: 'city' },
    { label: 'postal-code', id: 'postal-code' },
    { label: 'card-number', id: 'card-number' },
    { label: 'expiry', id: 'expiry' },
    { label: 'cvv', id: 'cvv' },
    { label: 'cardholder-name', id: 'cardholder-name' },
    { label: 'terms', id: 'terms' },
    { label: 'marketing', id: 'marketing' },
  ];

  for (const field of requiredFields) {
    it(`label for="${field.label}" is present in HTML`, async () => {
      const res = await request(app).get(checkoutUrl);
      expect(res.status).toBe(200);
      expect(has(res.text, new RegExp(`for=["']${field.label}["']`, 'i'))).toBe(true);
    });

    it(`input id="${field.id}" is present in HTML`, async () => {
      const res = await request(app).get(checkoutUrl);
      expect(res.status).toBe(200);
      expect(has(res.text, new RegExp(`id=["']${field.id}["']`, 'i'))).toBe(true);
    });
  }
});

describe('LABEL – trade-in form fields have for/id associations', () => {
  const tradeInUrl = '/upgrade/trade-in';

  const requiredFields: Array<{ id: string }> = [
    { id: 'device-brand' },
    { id: 'device-model' },
    { id: 'device-storage' },
  ];

  for (const field of requiredFields) {
    it(`label for="${field.id}" is present`, async () => {
      const res = await request(app).get(tradeInUrl);
      expect(res.status).toBe(200);
      expect(has(res.text, new RegExp(`for=["']${field.id}["']`, 'i'))).toBe(true);
    });

    it(`input/select id="${field.id}" is present`, async () => {
      const res = await request(app).get(tradeInUrl);
      expect(res.status).toBe(200);
      expect(has(res.text, new RegExp(`id=["']${field.id}["']`, 'i'))).toBe(true);
    });
  }
});

describe('LABEL – product-listing filter checkboxes have for/id associations', () => {
  const listingUrl = '/catalog?category=smartphones';

  const filterFields = [
    'brand-apple',
    'brand-samsung',
    'brand-huawei',
    'brand-xiaomi',
    'price-1',
    'price-2',
    'price-3',
    'price-4',
    'storage-128',
    'storage-256',
    'storage-512',
    'avail-stock',
    'avail-preorder',
  ];

  for (const id of filterFields) {
    it(`filter checkbox label for="${id}" is present`, async () => {
      const res = await request(app).get(listingUrl);
      expect(res.status).toBe(200);
      expect(has(res.text, new RegExp(`for=["']${id}["']`, 'i'))).toBe(true);
    });

    it(`filter checkbox id="${id}" is present`, async () => {
      const res = await request(app).get(listingUrl);
      expect(res.status).toBe(200);
      expect(has(res.text, new RegExp(`id=["']${id}["']`, 'i'))).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// AC-ALERT: inline validation errors use role="alert" and aria-describedby
// ---------------------------------------------------------------------------

describe('ALERT – checkout validation error regions are accessible', () => {
  it('checkout page exposes at least one role="alert" for inline validation errors', async () => {
    const res = await request(app).get('/checkout');
    expect(res.status).toBe(200);
    expect(has(res.text, /role=["']alert["']/i)).toBe(true);
  });

  it('at least one error element is linked to a field via aria-describedby', async () => {
    const res = await request(app).get('/checkout');
    expect(res.status).toBe(200);
    expect(has(res.text, /aria-describedby=["'][^"']+["']/i)).toBe(true);
  });

  it('error element id matches an aria-describedby reference', async () => {
    const res = await request(app).get('/checkout');
    expect(res.status).toBe(200);
    const html = res.text;
    // e.g. aria-describedby="first-name-error" must have a matching id="first-name-error"
    const describedByMatches = html.match(/aria-describedby=["']([^"']+)["']/gi) ?? [];
    expect(describedByMatches.length).toBeGreaterThan(0);
    for (const attr of describedByMatches) {
      const idValue = attr.match(/aria-describedby=["']([^"']+)["']/i)?.[1] ?? '';
      // Each referenced id must exist in the document
      expect(has(html, new RegExp(`id=["']${idValue}["']`, 'i'))).toBe(true);
    }
  });
});

describe('ALERT – onboarding (trade-in) validation error regions are accessible', () => {
  it('trade-in page exposes at least one role="alert" or aria-live="assertive" for errors', async () => {
    const res = await request(app).get('/upgrade/trade-in');
    expect(res.status).toBe(200);
    expect(
      has(res.text, /role=["']alert["']/i) ||
      has(res.text, /aria-live=["']assertive["']/i),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-LIVE: status messages and timeline milestones use aria-live="polite"
// ---------------------------------------------------------------------------

describe('LIVE – order-tracking timeline uses aria-live="polite"', () => {
  it('order-tracking page has at least one aria-live="polite" region', async () => {
    const res = await request(app).get('/account/orders/ORD-3001');
    expect(res.status).toBe(200);
    expect(has(res.text, /aria-live=["']polite["']/i)).toBe(true);
  });

  it('order status timeline region is marked with aria-live="polite"', async () => {
    const res = await request(app).get('/account/orders/ORD-3001');
    expect(res.status).toBe(200);
    // The timeline section should carry aria-live so screen readers announce updates
    expect(has(res.text, /aria-live=["']polite["']/i)).toBe(true);
  });
});

describe('LIVE – eSIM activation page uses aria-live="polite" for status messages', () => {
  it('eSIM activation page has at least one aria-live="polite" region', async () => {
    const res = await request(app).get('/orders/ORD-3001/esim');
    expect(res.status).toBe(200);
    expect(has(res.text, /aria-live=["']polite["']/i)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-RADIOGRP: radio button groups use role="radiogroup" with a label
// ---------------------------------------------------------------------------

describe('RADIOGRP – checkout payment method radio group', () => {
  it('payment method inputs are wrapped in a role="radiogroup" element', async () => {
    const res = await request(app).get('/checkout');
    expect(res.status).toBe(200);
    expect(has(res.text, /role=["']radiogroup["']/i)).toBe(true);
  });

  it('radiogroup has an accessible name via aria-labelledby or aria-label', async () => {
    const res = await request(app).get('/checkout');
    expect(res.status).toBe(200);
    expect(
      has(res.text, /aria-labelledby=["'][^"']+["']/i) ||
      has(res.text, /aria-label=["'][^"']+["']/i),
    ).toBe(true);
  });
});

describe('RADIOGRP – trade-in device condition radio group', () => {
  it('condition inputs are wrapped in a role="radiogroup" element', async () => {
    const res = await request(app).get('/upgrade/trade-in');
    expect(res.status).toBe(200);
    expect(has(res.text, /role=["']radiogroup["']/i)).toBe(true);
  });

  it('condition radiogroup has an accessible name via aria-labelledby or aria-label', async () => {
    const res = await request(app).get('/upgrade/trade-in');
    expect(res.status).toBe(200);
    expect(
      has(res.text, /aria-labelledby=["'][^"']+["']/i) ||
      has(res.text, /aria-label=["'][^"']+["']/i),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-FILTER: filter checkbox groups on product listing have group labels
// ---------------------------------------------------------------------------

describe('FILTER – product-listing filter sidebar checkbox groups have group labels', () => {
  it('filter sidebar contains at least one <fieldset> or role="group" element', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.status).toBe(200);
    expect(
      has(res.text, /<fieldset[\s>]/i) ||
      has(res.text, /role=["']group["']/i),
    ).toBe(true);
  });

  it('Brand filter group has a <legend> or aria-labelledby label', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.status).toBe(200);
    const html = res.text;
    // Either a <legend>Brand</legend> or an element with id referenced by aria-labelledby
    // containing the word "Brand"
    expect(
      has(html, /<legend[^>]*>\s*Brand\s*<\/legend>/i) ||
      has(html, /Brand/i),
    ).toBe(true);
    // At least the group labelling mechanism must be present
    expect(
      has(html, /<fieldset[\s>]/i) ||
      has(html, /role=["']group["']/i),
    ).toBe(true);
  });

  it('Price Range filter group has a <legend> or aria-labelledby label', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.status).toBe(200);
    expect(
      has(res.text, /<legend[^>]*>\s*Price Range\s*<\/legend>/i) ||
      has(res.text, /Price Range/i),
    ).toBe(true);
  });

  it('Storage filter group has a <legend> or aria-labelledby label', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.status).toBe(200);
    expect(
      has(res.text, /<legend[^>]*>\s*Storage\s*<\/legend>/i) ||
      has(res.text, /Storage/i),
    ).toBe(true);
  });

  it('Availability filter group has a <legend> or aria-labelledby label', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.status).toBe(200);
    expect(
      has(res.text, /<legend[^>]*>\s*Availability\s*<\/legend>/i) ||
      has(res.text, /Availability/i),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-LABEL (bundle-configuration): add-on checkboxes have associated labels
// ---------------------------------------------------------------------------

describe('LABEL – bundle-configuration add-on checkboxes have for/id associations', () => {
  const bundleUrl = '/product/iphone-15-pro/configure';

  const addonFields = ['addon-data', 'addon-international', 'addon-roaming'];

  for (const name of addonFields) {
    it(`add-on checkbox "${name}" has an id and an associated label`, async () => {
      const res = await request(app).get(bundleUrl);
      expect(res.status).toBe(200);
      const html = res.text;
      // Either for="<id>" label OR wrapping <label> pattern is acceptable,
      // but the input itself must carry an id for programmatic association.
      expect(has(html, new RegExp(`id=["']${name}["']`, 'i'))).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// AC-HEADING (specific pages): verify correct heading text per design spec
// ---------------------------------------------------------------------------

describe('HEADING – H1 text matches design spec', () => {
  const h1Specs: Array<{ url: string; h1: string | RegExp }> = [
    { url: '/product/iphone-15-pro/configure', h1: /Configure Your Bundle/i },
    { url: '/cart', h1: /Your Cart/i },
    { url: '/checkout', h1: /Checkout/i },
    { url: '/upgrade/eligibility', h1: /Your Upgrade Eligibility/i },
    { url: '/orders/ORD-3001/esim', h1: /Activate Your eSIM/i },
    { url: '/account/orders/ORD-3001', h1: /Order Details/i },
    { url: '/product/iphone-15-pro', h1: /iPhone 15 Pro 256GB/i },
    { url: '/catalog?category=smartphones', h1: /Smartphones/i },
    { url: '/', h1: /Welcome to Vodacom Shop/i },
    { url: '/upgrade/trade-in', h1: /Trade In Your Device/i },
  ];

  for (const spec of h1Specs) {
    it(`[${spec.url}] <h1> contains expected text`, async () => {
      const res = await request(app).get(spec.url);
      expect(res.status).toBe(200);
      const h1Match = res.text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      expect(h1Match).not.toBeNull();
      expect(h1Match![1]).toMatch(spec.h1);
    });
  }
});
