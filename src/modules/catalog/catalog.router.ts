import { Router, Request, Response } from 'express';
import { getUpsellOffersByContext } from './offers/upsell-offers.service';
import { PrepaidUpsellOffer } from './offers/prepaid-upsell-offer.model';
import { getDefaultMarket, MarketConfig } from '../market/marketConfig';

export const catalogRouter = Router();

function renderOfferCard(offer: PrepaidUpsellOffer, market: MarketConfig): string {
  const price = offer.pricingSummary.recurringAmount ?? offer.pricingSummary.onceOffAmount ?? 0;
  const badge = offer.badge ? `<span class="offer-badge">${offer.badge}</span>` : '';
  return `
    <div class="offer-card-highlight promotional upsell" data-offer-id="${offer.offerId}" data-price="${price}">
      ${badge}
      <h4>${offer.title}</h4>
      <p>${offer.description}</p>
      <p class="offer-price">${market.currencySymbol} ${price}/month</p>
      ${offer.pricingSummary.discountLabel ? `<p class="offer-discount">${offer.pricingSummary.discountLabel}</p>` : ''}
      <button class="btn-upsell-cta" data-offer-id="${offer.offerId}">${offer.ctaLabel}</button>
    </div>`;
}

function renderUpsellPanel(offers: PrepaidUpsellOffer[], market: MarketConfig): string {
  if (offers.length === 0) return '';
  const cards = offers.map(o => renderOfferCard(o, market)).join('\n');
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
  const market = getDefaultMarket();

  const upsellPanel = renderUpsellPanel(offers, market);
  const sym = market.currencySymbol;
  const taxPct = Math.round(market.vatRate * 100);
  const taxLabel = market.taxLabel;

  const devicePrice = 24999.00;
  const vatAmount = parseFloat((devicePrice * market.vatRate).toFixed(2));
  const totalOnceOff = parseFloat((devicePrice + vatAmount).toFixed(2));

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
    <p>Natural Titanium &mdash; ${sym} ${devicePrice.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
    <p>This plan is compatible with your device</p>

    <section class="plan-selection">
      <h2>Select a Plan</h2>

      ${upsellPanel}

      <div class="base-plan-list">
        <div class="plan-card" data-plan-id="plan_red_5gb">
          <h4>Vodacom Red 5GB</h4>
          <p>5GB Data + Unlimited Calls &amp; SMS</p>
          <p class="plan-price">${sym} 299/month</p>
          <button class="btn-select-plan">Select Plan</button>
        </div>
        <div class="plan-card" data-plan-id="plan_unlimited_20gb">
          <h4>Vodacom Unlimited 20GB</h4>
          <p>20GB Data + Unlimited Calls &amp; SMS</p>
          <p class="plan-price">${sym} 799/month</p>
          <button class="btn-select-plan">Select Plan</button>
        </div>
        <div class="plan-card" data-plan-id="plan_red_premium">
          <h4>Vodacom Red Premium</h4>
          <p>50GB Data + Unlimited Calls &amp; SMS</p>
          <p class="plan-price">${sym} 1,299/month</p>
          <button class="btn-select-plan">Select Plan</button>
        </div>
      </div>
    </section>

    <section class="bundle-addons">
      <h2>Optional Add-Ons</h2>
      <label><input type="checkbox" name="addon-data"> Extra 10GB Data &mdash; + ${sym} 199/month</label>
      <label><input type="checkbox" name="addon-international" checked> International Calling &mdash; + ${sym} 149/month</label>
      <label><input type="checkbox" name="addon-roaming"> Roaming Bundle &mdash; + ${sym} 299/month</label>
    </section>
  </main>

  <aside class="pricing-summary">
    <h3>Pricing Summary</h3>
    <dl>
      <dt>iPhone 15 Pro 256GB</dt><dd>${sym} ${devicePrice.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</dd>
      <dt>Activation Fee</dt><dd>${sym} 0.00</dd>
      <dt>Vodacom Unlimited 20GB</dt><dd>${sym} 799.00</dd>
      <dt>International Calling</dt><dd>${sym} 149.00</dd>
    </dl>
    <p>Once-Off Subtotal: ${sym} ${devicePrice.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
    <p>${taxLabel} (${taxPct}%): ${sym} ${vatAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
    <p>Total Once-Off: ${sym} ${totalOnceOff.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
    <p>Total Monthly: ${sym} 948.00</p>
    <button>Continue to Cart</button>
  </aside>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});

catalogRouter.get('/product/:id', (req: Request, res: Response) => {
  const context = (req.query['context'] as string) ?? '';
  const offers = context ? getUpsellOffersByContext(context) : [];
  const market = getDefaultMarket();

  const upsellPanel = renderUpsellPanel(offers, market);
  const sym = market.currencySymbol;

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
    <p class="product-price">${sym} 24,999.00</p>
    <p>or from ${sym} 899/month with a plan</p>

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

    <button class="btn-add-to-cart">Add to Cart</button>
    <p>This device supports eSIM and is compatible with Vodacom 5G network</p>
  </section>

  <section class="plan-attach-panel">
    <h2>Add a plan or bundle</h2>

    ${upsellPanel}

    <div class="base-plan-list">
      <div class="plan-card" data-plan-id="plan_red_5gb">
        <h4>Vodacom Red 5GB</h4>
        <p>5GB Data + Unlimited Calls &amp; SMS</p>
        <p class="plan-price">${sym} 299/month</p>
        <button class="btn-select-plan">Select Plan</button>
      </div>
      <div class="plan-card" data-plan-id="plan_unlimited_20gb">
        <h4>Vodacom Unlimited 20GB</h4>
        <p>20GB Data + Unlimited Calls &amp; SMS</p>
        <p class="plan-price">${sym} 799/month</p>
        <button class="btn-select-plan">Select Plan</button>
      </div>
      <div class="plan-card" data-plan-id="plan_red_premium">
        <h4>Vodacom Red Premium</h4>
        <p>50GB Data + Unlimited Calls &amp; SMS</p>
        <p class="plan-price">${sym} 1,299/month</p>
        <button class="btn-select-plan">Select Plan</button>
      </div>
    </div>
  </section>

  <section class="product-details">
    <h2>Complete your purchase</h2>
  </section>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});
