import request from 'supertest';
import { app } from '../../app';
import { markets } from '../../modules/market/market.fixture';
import {
  formatPrice,
  computeTax,
  isPaymentMethodEnabled,
  resolveDefaultMarket,
  MARKET_PREFERENCE_KEY,
} from '../market-context';
import { renderMarketSelector, renderMarketSelectorButton, renderMarketDropdown } from '../market-selector';
import { renderOrderSummary } from '../price-display';
import { renderPaymentMethods } from '../payment-methods';
import { renderCart, renderCartItem, renderCheckoutButton } from '../cart-items';

const zaMarket = markets.find((m) => m.code === 'ZA')!;
const keMarket = markets.find((m) => m.code === 'KE')!;

// ---------------------------------------------------------------------------
// AC-1  Market selector — WCAG 2.1 AA keyboard accessibility and structure
// ---------------------------------------------------------------------------

describe('Market selector — WCAG accessibility', () => {
  it('market selector button has aria-haspopup="listbox"', () => {
    const html = renderMarketSelectorButton(zaMarket);
    expect(html).toContain('aria-haspopup="listbox"');
  });

  it('market selector button has aria-expanded', () => {
    const html = renderMarketSelectorButton(zaMarket);
    expect(html).toContain('aria-expanded');
  });

  it('market selector button has descriptive aria-label', () => {
    const html = renderMarketSelectorButton(zaMarket);
    expect(html).toContain('aria-label');
    expect(html).toContain(zaMarket.displayLabel);
  });

  it('market dropdown has role="listbox"', () => {
    const html = renderMarketDropdown(markets, 'ZA');
    expect(html).toContain('role="listbox"');
  });

  it('each market option has role="option"', () => {
    const html = renderMarketDropdown(markets, 'ZA');
    const optionCount = (html.match(/role="option"/g) ?? []).length;
    const activeCount = markets.filter((m) => m.active).length;
    expect(optionCount).toBe(activeCount);
  });

  it('current market option has aria-selected="true"', () => {
    const html = renderMarketDropdown(markets, 'ZA');
    expect(html).toContain('aria-selected="true"');
  });

  it('non-current options have aria-selected="false"', () => {
    const html = renderMarketDropdown(markets, 'ZA');
    const falseCount = (html.match(/aria-selected="false"/g) ?? []).length;
    expect(falseCount).toBeGreaterThanOrEqual(1);
  });

  it('dropdown options are keyboard-focusable via tabindex', () => {
    const html = renderMarketDropdown(markets, 'ZA');
    expect(html).toContain('tabindex="0"');
  });

  it('selector displays flagEmoji alongside the market label', () => {
    const html = renderMarketSelectorButton(zaMarket);
    expect(html).toContain(zaMarket.flagEmoji);
    expect(html).toContain(zaMarket.displayLabel);
  });

  it('full market selector renders with button and hidden dropdown', () => {
    const html = renderMarketSelector(markets, zaMarket);
    expect(html).toContain('market-selector-btn');
    expect(html).toContain('market-dropdown');
    expect(html).toContain('hidden');
  });

  it('market selector includes a form for server-side market switch', () => {
    const html = renderMarketSelector(markets, zaMarket);
    expect(html).toContain('<form');
    expect(html).toContain('action="/market/select"');
    expect(html).toContain(`value="${zaMarket.code}"`);
  });
});

// ---------------------------------------------------------------------------
// AC-2  Payment method section — mobile_money hidden for card-only markets
// ---------------------------------------------------------------------------

describe('Payment methods — market-aware rendering', () => {
  it('ZA market renders both card and mobile money options', () => {
    const html = renderPaymentMethods(zaMarket);
    expect(html).toContain('value="card"');
    expect(html).toContain('value="mobile-money"');
    expect(html).toContain('M-Pesa');
  });

  it('card-only market (KE) does not render mobile money option', () => {
    const html = renderPaymentMethods(keMarket);
    expect(html).not.toContain('value="mobile-money"');
    expect(html).not.toContain('M-Pesa');
  });

  it('card-only market still renders card option', () => {
    const html = renderPaymentMethods(keMarket);
    expect(html).toContain('value="card"');
  });

  it('isPaymentMethodEnabled returns true for enabled methods', () => {
    expect(isPaymentMethodEnabled('card', zaMarket)).toBe(true);
    expect(isPaymentMethodEnabled('mobile_money', zaMarket)).toBe(true);
  });

  it('isPaymentMethodEnabled returns false for disabled methods', () => {
    expect(isPaymentMethodEnabled('mobile_money', keMarket)).toBe(false);
  });

  it('payment section has accessible heading with id for aria-labelledby', () => {
    const html = renderPaymentMethods(zaMarket);
    expect(html).toContain('id="payment-heading"');
    expect(html).toContain('aria-labelledby="payment-heading"');
  });

  it('fieldset has a legend for screen readers', () => {
    const html = renderPaymentMethods(zaMarket);
    expect(html).toContain('<fieldset>');
    expect(html).toContain('<legend');
  });
});

// ---------------------------------------------------------------------------
// AC-3  Tax label and rate — from market, not hardcoded
// ---------------------------------------------------------------------------

describe('Tax rendering — market-aware', () => {
  it('computeTax uses the market taxRate, not a hardcoded value', () => {
    const tax = computeTax(100, zaMarket);
    expect(tax.amount).toBeCloseTo(15);
    expect(tax.label).toBe(zaMarket.taxLabel);
  });

  it('computeTax for KE uses 16% rate', () => {
    const tax = computeTax(100, keMarket);
    expect(tax.amount).toBeCloseTo(16);
    expect(tax.label).toBe(keMarket.taxLabel);
  });

  it('order summary renders the market taxLabel (not hardcoded "VAT (15%)")', () => {
    const html = renderOrderSummary(
      { onceOffLines: [{ label: 'Device', amount: 100 }], recurringLines: [] },
      keMarket,
    );
    expect(html).toContain(keMarket.taxLabel);
    expect(html).not.toContain('VAT (15%)');
  });

  it('order summary tax amount is computed from market taxRate', () => {
    const html = renderOrderSummary(
      { onceOffLines: [{ label: 'Device', amount: 100 }], recurringLines: [] },
      zaMarket,
    );
    expect(html).toContain('15.00');
  });
});

// ---------------------------------------------------------------------------
// AC-4  Cart ineligibility warning — blocks checkout, shows warning
// ---------------------------------------------------------------------------

describe('Cart ineligibility — market switch warnings', () => {
  const eligibleItem = {
    productId: 'iphone-15-pro',
    name: 'iPhone 15 Pro 256GB',
    price: 24999,
    quantity: 1,
    eligible: true,
  };

  const ineligibleItem = {
    productId: 'za-only-product',
    name: 'ZA Exclusive Offer',
    price: 4999,
    quantity: 1,
    eligible: false,
    warning: 'This item is not available in your selected market.',
  };

  it('eligible item renders without warning', () => {
    const html = renderCartItem(eligibleItem, zaMarket);
    expect(html).not.toContain('cart-item-warning');
    expect(html).not.toContain('role="alert"');
  });

  it('ineligible item renders a visible warning with role=alert', () => {
    const html = renderCartItem(ineligibleItem, keMarket);
    expect(html).toContain('cart-item-warning');
    expect(html).toContain('role="alert"');
    expect(html).toContain(ineligibleItem.warning!);
  });

  it('ineligible item gets cart-item--ineligible CSS class', () => {
    const html = renderCartItem(ineligibleItem, keMarket);
    expect(html).toContain('cart-item--ineligible');
  });

  it('checkout button is disabled when any item is ineligible', () => {
    const html = renderCheckoutButton([eligibleItem, ineligibleItem]);
    expect(html).toContain('disabled');
    expect(html).toContain('aria-disabled="true"');
  });

  it('checkout button is enabled when all items are eligible', () => {
    const html = renderCheckoutButton([eligibleItem]);
    expect(html).not.toContain('disabled');
  });

  it('cart with ineligible item renders a top-level ineligibility banner', () => {
    const html = renderCart([eligibleItem, ineligibleItem], keMarket);
    expect(html).toContain('cart-ineligibility-banner');
    expect(html).toContain('role="alert"');
    expect(html).toContain(keMarket.displayLabel);
  });

  it('cart with all eligible items has no ineligibility banner', () => {
    const html = renderCart([eligibleItem], zaMarket);
    expect(html).not.toContain('cart-ineligibility-banner');
  });
});

// ---------------------------------------------------------------------------
// AC-5  Price display — no hardcoded currency symbol
// ---------------------------------------------------------------------------

describe('Price display — no hardcoded currency symbol', () => {
  it('formatPrice uses market currencySymbol, not a hardcoded R', () => {
    const za = formatPrice(24999, zaMarket);
    expect(za).toContain(zaMarket.currencySymbol);
    const ke = formatPrice(24999, keMarket);
    expect(ke).toContain(keMarket.currencySymbol);
    expect(ke).not.toContain('R ');
  });

  it('formatPrice for KE uses KSh symbol', () => {
    const ke = formatPrice(100, keMarket);
    expect(ke).toContain('KSh');
  });

  it('formatPrice for ZA uses R symbol', () => {
    const za = formatPrice(24999, zaMarket);
    expect(za).toContain('R');
  });

  it('order summary price rows include data-currency attribute from market', () => {
    const html = renderOrderSummary(
      { onceOffLines: [{ label: 'Device', amount: 24999 }], recurringLines: [] },
      zaMarket,
    );
    expect(html).toContain(`data-currency="${zaMarket.currencyCode}"`);
  });
});

// ---------------------------------------------------------------------------
// AC-6  Market context utilities
// ---------------------------------------------------------------------------

describe('Market context utilities', () => {
  it('resolveDefaultMarket returns the first active market', () => {
    const m = resolveDefaultMarket(markets);
    expect(m).toBeDefined();
    expect(m!.active).toBe(true);
    expect(m!.code).toBe(markets.find((x) => x.active)!.code);
  });

  it('MARKET_PREFERENCE_KEY is a non-empty string', () => {
    expect(typeof MARKET_PREFERENCE_KEY).toBe('string');
    expect(MARKET_PREFERENCE_KEY.length).toBeGreaterThan(0);
  });

  it('all markets in fixture have flagEmoji', () => {
    for (const m of markets) {
      expect(typeof m.flagEmoji).toBe('string');
      expect(m.flagEmoji.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-7  /market/select endpoint — persists market preference via cookie
// ---------------------------------------------------------------------------

describe('POST /market/select — market preference persistence', () => {
  it('returns 302 redirect on valid market code', async () => {
    const res = await request(app)
      .post('/market/select')
      .send('marketCode=ZA')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect(res.status).toBe(302);
  });

  it('sets selectedMarketCode cookie on valid switch', async () => {
    const res = await request(app)
      .post('/market/select')
      .send('marketCode=KE')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    const cookieHeader = res.headers['set-cookie'];
    expect(cookieHeader).toBeDefined();
    const cookies: string[] = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
    const marketCookie = cookies.find((c) => c.includes('selectedMarketCode'));
    expect(marketCookie).toBeDefined();
    expect(marketCookie).toContain('KE');
  });

  it('returns 400 for unknown market code', async () => {
    const res = await request(app)
      .post('/market/select')
      .send('marketCode=INVALID')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect(res.status).toBe(400);
  });

  it('returns 400 when marketCode is missing', async () => {
    const res = await request(app)
      .post('/market/select')
      .send('')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// AC-8  /market/current endpoint — resolves active market
// ---------------------------------------------------------------------------

describe('GET /market/current — active market resolution', () => {
  it('returns 200 with active market data', async () => {
    const res = await request(app).get('/market/current');
    expect(res.status).toBe(200);
    expect(res.body.code).toBeDefined();
    expect(res.body.active).toBe(true);
  });

  it('response includes all MarketContext fields', async () => {
    const res = await request(app).get('/market/current');
    const m = res.body;
    expect(typeof m.flagEmoji).toBe('string');
    expect(typeof m.currencySymbol).toBe('string');
    expect(typeof m.currencyCode).toBe('string');
    expect(typeof m.taxLabel).toBe('string');
    expect(typeof m.taxRate).toBe('number');
    expect(Array.isArray(m.enabledPaymentMethods)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-9  Cart validate — market code validation
// ---------------------------------------------------------------------------

describe('POST /api/cart/validate — market code validation', () => {
  it('returns 400 for an unknown market code', async () => {
    const res = await request(app)
      .post('/api/cart/validate')
      .send({ marketCode: 'XX', items: [{ productId: 'iphone-15-pro', quantity: 1 }] });
    expect(res.status).toBe(400);
  });

  it('returns 400 for a lowercase typo market code', async () => {
    const res = await request(app)
      .post('/api/cart/validate')
      .send({ marketCode: 'za', items: [{ productId: 'iphone-15-pro', quantity: 1 }] });
    expect(res.status).toBe(400);
  });
});
