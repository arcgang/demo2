import { Router, Request, Response } from 'express';
import { getUpsellOffersByContext } from './offers/upsell-offers.service';
import { PrepaidUpsellOffer } from './offers/prepaid-upsell-offer.model';
import { getCartCount } from '../cart/cart.store';
import { getIphone15ProRecommendations } from './product-recommendations.data';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatZAR(amount: number): string {
  return 'R ' + amount.toLocaleString('en-US');
}

export const catalogRouter = Router();

function renderOfferCard(offer: PrepaidUpsellOffer): string {
  const price = offer.pricingSummary.recurringAmount ?? offer.pricingSummary.onceOffAmount ?? 0;
  const badge = offer.badge ? `<span class="offer-badge">${offer.badge}</span>` : '';
  return `
    <div class="offer-card-highlight promotional upsell" data-offer-id="${offer.offerId}" data-price="${price}">
      ${badge}
      <h4>${offer.title}</h4>
      <p>${offer.description}</p>
      <p class="offer-price">R ${price}/month</p>
      ${offer.pricingSummary.discountLabel ? `<p class="offer-discount">${offer.pricingSummary.discountLabel}</p>` : ''}
      <button class="btn-upsell-cta" data-offer-id="${offer.offerId}">${offer.ctaLabel}</button>
    </div>`;
}

function renderUpsellPanel(offers: PrepaidUpsellOffer[]): string {
  if (offers.length === 0) return '';
  const cards = offers.map(renderOfferCard).join('\n');
  return `
  <div class="upsell-panel recommended-panel promotional-section">
    <h3>Recommended for You</h3>
    <p class="upsell-panel-label">Migration Offers &amp; Special Offers — exclusive for prepaid customers</p>
    ${cards}
    <button class="btn-continue-original" type="button">Continue with original option</button>
  </div>`;
}

catalogRouter.get('/product/:id/configure', (req: Request, res: Response) => {
  const context = (req.query['context'] as string) ?? '';
  const offers = context ? getUpsellOffersByContext(context) : [];

  const upsellPanel = renderUpsellPanel(offers);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Configure Your Bundle - Vodacom Shop</title>
</head>
<body>
  <header class="header">
    <a href="/">Vodacom</a>
    <nav>
      <a href="/catalog">Devices</a>
      <a href="/plans">Plans</a>
      <a href="/accessories">Accessories</a>
      <a href="/support">Support</a>
    </nav>
  </header>

  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/catalog">Devices</a> &rsaquo;
    <a href="/product/iphone-15-pro">iPhone 15 Pro 256GB</a> &rsaquo;
    Configure Bundle
  </nav>

  <main>
    <h1>Configure Your Bundle</h1>
    <h3>iPhone 15 Pro 256GB</h3>
    <p>Natural Titanium &mdash; R 24,999.00</p>
    <p>This plan is compatible with your device</p>

    <section class="plan-selection">
      <h2>Select a Plan</h2>

      ${upsellPanel}

      <div class="base-plan-list">
        <div class="plan-card" data-plan-id="plan_red_5gb">
          <h4>Vodacom Red 5GB</h4>
          <p>5GB Data + Unlimited Calls &amp; SMS</p>
          <p class="plan-price">R 299/month</p>
          <button class="btn-select-plan">Select Plan</button>
        </div>
        <div class="plan-card" data-plan-id="plan_unlimited_20gb">
          <h4>Vodacom Unlimited 20GB</h4>
          <p>20GB Data + Unlimited Calls &amp; SMS</p>
          <p class="plan-price">R 799/month</p>
          <button class="btn-select-plan">Select Plan</button>
        </div>
        <div class="plan-card" data-plan-id="plan_red_premium">
          <h4>Vodacom Red Premium</h4>
          <p>50GB Data + Unlimited Calls &amp; SMS</p>
          <p class="plan-price">R 1,299/month</p>
          <button class="btn-select-plan">Select Plan</button>
        </div>
      </div>
    </section>

    <section class="bundle-addons">
      <h2>Optional Add-Ons</h2>
      <label><input type="checkbox" name="addon-data"> Extra 10GB Data &mdash; + R 199/month</label>
      <label><input type="checkbox" name="addon-international" checked> International Calling &mdash; + R 149/month</label>
      <label><input type="checkbox" name="addon-roaming"> Roaming Bundle &mdash; + R 299/month</label>
    </section>
  </main>

  <aside class="pricing-summary">
    <h3>Pricing Summary</h3>
    <dl>
      <dt>iPhone 15 Pro 256GB</dt><dd>R 24,999.00</dd>
      <dt>Activation Fee</dt><dd>R 0.00</dd>
      <dt>Vodacom Unlimited 20GB</dt><dd>R 799.00</dd>
      <dt>International Calling</dt><dd>R 149.00</dd>
    </dl>
    <p>Once-Off Subtotal: R 24,999.00</p>
    <p>VAT (15%): R 3,749.85</p>
    <p>Total Once-Off: R 28,748.85</p>
    <p>Total Monthly: R 948.00</p>
    <button>Continue to Cart</button>
  </aside>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});

catalogRouter.get('/product/:id', (req: Request, res: Response) => {
  const context = (req.query['context'] as string) ?? '';
  const offers = context ? getUpsellOffersByContext(context) : [];

  const upsellPanel = renderUpsellPanel(offers);
  const cartCount = getCartCount(req);

  const recommendations = getIphone15ProRecommendations();
  const plans = recommendations.attachments.filter(a => a.type === 'PLAN');
  const accessories = recommendations.attachments.filter(a => a.type === 'ACCESSORY');

  const planCardsHtml = plans.map((plan, idx) => {
    const selectedAttr = idx === 0 ? 'data-selected="true"' : 'data-selected="false"';
    const selectedClass = idx === 0 ? ' selected' : '';
    return `<div class="plan-card plan-required${selectedClass}" ${selectedAttr} data-plan-id="${escapeHtml(plan.id)}">
        <span class="badge badge-required required-label">Required</span>
        <h4>${escapeHtml(plan.name)}</h4>
        <p class="plan-price">${escapeHtml(formatZAR(plan.pricingRule.monthly))}/month</p>
        <button class="btn-select-plan btn-add-to-cart" data-item-id="${escapeHtml(plan.id)}" data-item-type="PLAN">Select Plan</button>
      </div>`;
  }).join('\n');

  const accessoryCardsHtml = accessories.map(acc => {
    return `<div class="accessory-card">
        <div class="image-placeholder accessory-image"></div>
        <h4>${escapeHtml(acc.name)}</h4>
        <p class="accessory-price">${escapeHtml(formatZAR(acc.pricingRule.onceOff))}</p>
        <button class="btn-add-to-cart" data-item-id="${escapeHtml(acc.id)}" data-item-type="ACCESSORY">Add to Cart</button>
      </div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>iPhone 15 Pro 256GB - Vodacom Shop</title>
</head>
<body>
  <header class="header">
    <a href="/">Vodacom</a>
    <nav>
      <a href="/catalog">Devices</a>
      <a href="/plans">Plans</a>
      <a href="/accessories">Accessories</a>
      <a href="/support">Support</a>
    </nav>
    <button class="cart-badge" id="cart-badge" data-cart-count="${cartCount}">${cartCount}</button>
  </header>

  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/catalog">Devices</a> &rsaquo;
    <a href="/catalog?category=smartphones">Smartphones</a> &rsaquo;
    iPhone 15 Pro 256GB
  </nav>

  <section class="product-hero">
    <h1>iPhone 15 Pro 256GB</h1>
    <p>5G &mdash; Trade-In Eligible &mdash; In Stock</p>
    <p class="product-price">R 24,999.00</p>
    <p>or from R 899/month with a plan</p>

    <div class="color-selector">
      <span>Color</span>
      <button>Natural Titanium</button>
      <button>Blue Titanium</button>
      <button>White Titanium</button>
      <button>Black Titanium</button>
    </div>

    <div class="storage-selector">
      <span>Storage</span>
      <button>128GB</button>
      <button>256GB</button>
      <button>512GB</button>
      <button>1TB</button>
    </div>

    <div class="quantity-selector">
      <label>Quantity</label>
      <input type="number" value="1" min="1">
    </div>

    <button class="btn-add-to-cart" data-item-id="prod_za_iphone15pro_256" data-item-type="DEVICE">Add to Cart</button>
    <p>This device supports eSIM and is compatible with Vodacom 5G network</p>
  </section>

  <section class="plan-attach-panel">
    <h2>Add a plan or bundle</h2>

    ${upsellPanel}

    <div class="base-plan-list" id="plan-list">
      ${planCardsHtml}
    </div>
  </section>

  <section class="product-details">
    <h2>Specifications</h2>
    <dl>
      <dt>Display</dt><dd>6.1-inch Super Retina XDR display</dd>
      <dt>Processor</dt><dd>A17 Pro chip with 6-core CPU</dd>
      <dt>Camera</dt><dd>48MP Main + 12MP Ultra Wide + 12MP Telephoto</dd>
      <dt>Storage</dt><dd>256GB</dd>
      <dt>Battery</dt><dd>Up to 23 hours video playback</dd>
      <dt>Connectivity</dt><dd>5G, Wi-Fi 6E, Bluetooth 5.3</dd>
      <dt>SIM</dt><dd>Dual SIM (nano-SIM and eSIM)</dd>
      <dt>Operating System</dt><dd>iOS 17</dd>
    </dl>
  </section>

  <section class="recommendations">
    <h2>Complete your purchase</h2>
    <div class="accessory-grid" id="accessory-grid">
      ${accessoryCardsHtml}
    </div>
  </section>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});
