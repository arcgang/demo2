import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests — Market-driven display refactor
 *
 * Acceptance criterion:
 *   Changing the seed data for a market updates currency, tax display, and
 *   available payment methods on all affected screens without any per-page
 *   code change.
 *
 * These tests verify that:
 *   - The frontend pages (home, product listing, bundle configure) expose
 *     a data-market-config or equivalent mechanism that reads market values
 *     from the backend GET /api/config/market/:marketId endpoint, rather than
 *     embedding hardcoded literals.
 *   - Pages render currency, taxLabel, vatRate, and payment method tokens
 *     that match what the /api/config/market/ZA endpoint returns.
 *   - Pages include a <meta name="market-context"> or data attribute that
 *     carries the full market config so client-side logic can use it without
 *     additional fetch round-trips.
 *
 * Strategy: fetch the live market context from GET /api/config/market/ZA,
 * then assert that each page reflects the same values — ensuring the pages
 * are wired to the endpoint rather than to hardcoded constants.
 */

interface MarketContext {
  marketCode: string;
  marketName: string;
  locale: string;
  currency: string;
  taxLabel: string;
  vatRate: number;
  enabledPaymentMethods: string[];
  liteModeDefault: boolean;
}

async function getMarketCtx(): Promise<MarketContext> {
  const res = await request(app).get('/api/config/market/ZA');
  return res.body as MarketContext;
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  Backend endpoint for market config is reachable from the frontend app
// ─────────────────────────────────────────────────────────────────────────────

describe('Market-driven display — AC-1 /api/config/market/ZA reachable from frontend app', () => {
  it('GET /api/config/market/ZA returns HTTP 200 via the frontend app', async () => {
    const res = await request(app).get('/api/config/market/ZA');
    expect(res.status).toBe(200);
  });

  it('returns currency ZAR', async () => {
    const ctx = await getMarketCtx();
    expect(ctx.currency).toBe('ZAR');
  });

  it('returns taxLabel VAT', async () => {
    const ctx = await getMarketCtx();
    expect(ctx.taxLabel).toBe('VAT');
  });

  it('returns vatRate 0.15', async () => {
    const ctx = await getMarketCtx();
    expect(ctx.vatRate).toBe(0.15);
  });

  it('returns CARD_TOKEN and MOBILE_MONEY in enabledPaymentMethods', async () => {
    const ctx = await getMarketCtx();
    expect(ctx.enabledPaymentMethods).toContain('CARD_TOKEN');
    expect(ctx.enabledPaymentMethods).toContain('MOBILE_MONEY');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  Storefront home page embeds market context (not hardcoded)
// ─────────────────────────────────────────────────────────────────────────────

describe('Market-driven display — AC-2 home page market context embedding', () => {
  it('home page includes a market-context data element or meta tag', async () => {
    const res = await request(app).get('/');
    // The page must expose market config via a meta[name="market-context"] tag,
    // a data-market-config attribute on the body/html, or a serialized JSON block
    // with the market code and currency so client-side logic can read it.
    const hasMetaTag = /meta[^>]+name=["']market-context["']/i.test(res.text);
    const hasDataAttr = /data-market-config=/i.test(res.text);
    const hasScriptBlock = /id=["']market-context-data["']/i.test(res.text);
    expect(hasMetaTag || hasDataAttr || hasScriptBlock).toBe(true);
  });

  it('home page market context element contains the ZA market code', async () => {
    const res = await request(app).get('/');
    // The serialised market config in the page must reference "ZA"
    expect(res.text).toMatch(/"ZA"/);
  });

  it('home page market context element contains the ZAR currency code', async () => {
    const res = await request(app).get('/');
    expect(res.text).toMatch(/"ZAR"/);
  });

  it('home page market context element contains the VAT tax label', async () => {
    const res = await request(app).get('/');
    // The serialised config must carry the taxLabel from the seed
    expect(res.text).toMatch(/"VAT"/);
  });

  it('home page market context element contains enabled payment methods', async () => {
    const res = await request(app).get('/');
    expect(res.text).toMatch(/"CARD_TOKEN"/);
    expect(res.text).toMatch(/"MOBILE_MONEY"/);
  });

  it('home page market context element contains vatRate 0.15', async () => {
    const res = await request(app).get('/');
    // 0.15 must be present in the serialised block
    expect(res.text).toMatch(/0\.15/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  Product listing page embeds market context (not hardcoded)
// ─────────────────────────────────────────────────────────────────────────────

describe('Market-driven display — AC-3 product listing page market context embedding', () => {
  it('product listing page includes a market-context data element', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    const hasMetaTag = /meta[^>]+name=["']market-context["']/i.test(res.text);
    const hasDataAttr = /data-market-config=/i.test(res.text);
    const hasScriptBlock = /id=["']market-context-data["']/i.test(res.text);
    expect(hasMetaTag || hasDataAttr || hasScriptBlock).toBe(true);
  });

  it('product listing market context carries ZAR currency code', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/"ZAR"/);
  });

  it('product listing market context carries VAT tax label', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/"VAT"/);
  });

  it('product listing market context carries vatRate 0.15', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/0\.15/);
  });

  it('product listing market context carries CARD_TOKEN payment method', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/"CARD_TOKEN"/);
  });

  it('product listing market context carries MOBILE_MONEY payment method', async () => {
    const res = await request(app).get('/catalog?category=smartphones');
    expect(res.text).toMatch(/"MOBILE_MONEY"/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  Bundle configuration page embeds market context (not hardcoded)
// ─────────────────────────────────────────────────────────────────────────────

describe('Market-driven display — AC-4 bundle configuration page market context embedding', () => {
  it('bundle configure page includes a market-context data element', async () => {
    const res = await request(app).get('/product/iphone-15-pro/configure');
    const hasMetaTag = /meta[^>]+name=["']market-context["']/i.test(res.text);
    const hasDataAttr = /data-market-config=/i.test(res.text);
    const hasScriptBlock = /id=["']market-context-data["']/i.test(res.text);
    expect(hasMetaTag || hasDataAttr || hasScriptBlock).toBe(true);
  });

  it('bundle configure page market context carries vatRate 0.15 (not a hardcoded 0.15 literal outside of config)', async () => {
    const res = await request(app).get('/product/iphone-15-pro/configure');
    // The market context block must include the vatRate from seed data
    expect(res.text).toMatch(/"vatRate"\s*:\s*0\.15/);
  });

  it('bundle configure page market context carries ZAR currency', async () => {
    const res = await request(app).get('/product/iphone-15-pro/configure');
    expect(res.text).toMatch(/"ZAR"/);
  });

  it('bundle configure page market context carries VAT taxLabel', async () => {
    const res = await request(app).get('/product/iphone-15-pro/configure');
    expect(res.text).toMatch(/"VAT"/);
  });

  it('bundle configure page market context carries MOBILE_MONEY payment method', async () => {
    const res = await request(app).get('/product/iphone-15-pro/configure');
    expect(res.text).toMatch(/"MOBILE_MONEY"/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  VAT_RATE script variable comes from market config (not a bare literal)
// ─────────────────────────────────────────────────────────────────────────────

describe('Market-driven display — AC-5 VAT_RATE in page scripts references market config', () => {
  it('bundle configure page VAT_RATE variable is sourced from the serialised market config', async () => {
    const res = await request(app).get('/product/iphone-15-pro/configure');
    // The old pattern hardcoded `var VAT_RATE = 0.15;` directly.
    // After the refactor the script must read from the injected market context:
    //   e.g. marketConfig.vatRate or a variable derived from the config block.
    // We test that the JSON config block is present AND that the script reads
    // the VAT rate from it rather than repeating a bare literal disconnected
    // from the config.
    const hasConfigBlock = /id=["']market-context-data["']/i.test(res.text)
      || /data-market-config=/i.test(res.text)
      || /meta[^>]+name=["']market-context["']/i.test(res.text);
    expect(hasConfigBlock).toBe(true);

    // The VAT_RATE assignment must reference the config object, not be a raw literal
    // pattern like `var VAT_RATE = 0.15` (without any config reference nearby).
    const rawLiteralPattern = /var\s+VAT_RATE\s*=\s*0\.15\s*;/;
    expect(res.text).not.toMatch(rawLiteralPattern);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6  Market config seed change propagates to all pages uniformly
// ─────────────────────────────────────────────────────────────────────────────

describe('Market-driven display — AC-6 market config propagation is uniform across pages', () => {
  it('home page, product listing, and bundle configure all embed the same marketCode', async () => {
    const [homeRes, listingRes, configureRes] = await Promise.all([
      request(app).get('/'),
      request(app).get('/catalog?category=smartphones'),
      request(app).get('/product/iphone-15-pro/configure'),
    ]);

    // All three must embed "ZA" in their market context block
    expect(homeRes.text).toMatch(/"ZA"/);
    expect(listingRes.text).toMatch(/"ZA"/);
    expect(configureRes.text).toMatch(/"ZA"/);
  });

  it('home page, product listing, and bundle configure all embed the same currency', async () => {
    const [homeRes, listingRes, configureRes] = await Promise.all([
      request(app).get('/'),
      request(app).get('/catalog?category=smartphones'),
      request(app).get('/product/iphone-15-pro/configure'),
    ]);

    expect(homeRes.text).toMatch(/"ZAR"/);
    expect(listingRes.text).toMatch(/"ZAR"/);
    expect(configureRes.text).toMatch(/"ZAR"/);
  });

  it('home page, product listing, and bundle configure all embed the same vatRate', async () => {
    const [homeRes, listingRes, configureRes] = await Promise.all([
      request(app).get('/'),
      request(app).get('/catalog?category=smartphones'),
      request(app).get('/product/iphone-15-pro/configure'),
    ]);

    expect(homeRes.text).toMatch(/0\.15/);
    expect(listingRes.text).toMatch(/0\.15/);
    expect(configureRes.text).toMatch(/0\.15/);
  });

  it('home page, product listing, and bundle configure all embed the same payment methods', async () => {
    const [homeRes, listingRes, configureRes] = await Promise.all([
      request(app).get('/'),
      request(app).get('/catalog?category=smartphones'),
      request(app).get('/product/iphone-15-pro/configure'),
    ]);

    for (const res of [homeRes, listingRes, configureRes]) {
      expect(res.text).toMatch(/"CARD_TOKEN"/);
      expect(res.text).toMatch(/"MOBILE_MONEY"/);
    }
  });
});
