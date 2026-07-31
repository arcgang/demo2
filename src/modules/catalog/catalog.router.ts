import { Router, Request, Response } from 'express';
import { getUpsellOffersByContext } from './offers/upsell-offers.service';
import { PrepaidUpsellOffer } from './offers/prepaid-upsell-offer.model';

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
    <nav aria-label="Main navigation">
      <a href="/catalog">Devices</a>
      <a href="/plans">Plans</a>
      <a href="/accessories">Accessories</a>
      <a href="/support">Support</a>
    </nav>
  </header>

  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/catalog">Devices</a> &rsaquo;
    <a href="/product/iphone-15-pro">iPhone 15 Pro 256GB</a> &rsaquo;
    Configure Bundle
  </nav>

  <main>
    <h1>Configure Your Bundle</h1>
    <h2>iPhone 15 Pro 256GB</h2>
    <p>Natural Titanium &mdash; R 24,999.00</p>
    <p>This plan is compatible with your device</p>

    <section class="plan-selection">
      <h2>Select a Plan</h2>

      ${upsellPanel}

      <div class="base-plan-list">
        <div class="plan-card" data-plan-id="plan_red_5gb">
          <h3>Vodacom Red 5GB</h3>
          <p>5GB Data + Unlimited Calls &amp; SMS</p>
          <p class="plan-price">R 299/month</p>
          <button class="btn-select-plan">Select Plan</button>
        </div>
        <div class="plan-card" data-plan-id="plan_unlimited_20gb">
          <h3>Vodacom Unlimited 20GB</h3>
          <p>20GB Data + Unlimited Calls &amp; SMS</p>
          <p class="plan-price">R 799/month</p>
          <button class="btn-select-plan">Select Plan</button>
        </div>
        <div class="plan-card" data-plan-id="plan_red_premium">
          <h3>Vodacom Red Premium</h3>
          <p>50GB Data + Unlimited Calls &amp; SMS</p>
          <p class="plan-price">R 1,299/month</p>
          <button class="btn-select-plan">Select Plan</button>
        </div>
      </div>
    </section>

    <section class="bundle-addons">
      <h2>Optional Add-Ons</h2>
      <label for="addon-data"><input type="checkbox" id="addon-data" name="addon-data"> Extra 10GB Data &mdash; + R 199/month</label>
      <label for="addon-international"><input type="checkbox" id="addon-international" name="addon-international" checked> International Calling &mdash; + R 149/month</label>
      <label for="addon-roaming"><input type="checkbox" id="addon-roaming" name="addon-roaming"> Roaming Bundle &mdash; + R 299/month</label>
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

  <footer>
    <p>&copy; 2026 Vodacom Group. All rights reserved.</p>
  </footer>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});

catalogRouter.get('/product/:id', (req: Request, res: Response) => {
  const context = (req.query['context'] as string) ?? '';
  const offers = context ? getUpsellOffersByContext(context) : [];

  const upsellPanel = renderUpsellPanel(offers);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>iPhone 15 Pro 256GB - Vodacom Shop</title>
</head>
<body>
  <header class="header">
    <a href="/">Vodacom</a>
    <nav aria-label="Main navigation">
      <a href="/catalog">Devices</a>
      <a href="/plans">Plans</a>
      <a href="/accessories">Accessories</a>
      <a href="/support">Support</a>
    </nav>
  </header>

  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/catalog">Devices</a> &rsaquo;
    <a href="/catalog?category=smartphones">Smartphones</a> &rsaquo;
    iPhone 15 Pro 256GB
  </nav>

  <main>
  <section class="product-hero">
    <h1>iPhone 15 Pro 256GB</h1>
    <p>5G &mdash; Trade-In Eligible &mdash; In Stock</p>
    <p class="product-price">R 24,999.00</p>
    <p>or from R 899/month with a plan</p>

    <div class="color-selector">
      <span id="color-label">Color</span>
      <div role="radiogroup" aria-labelledby="color-label">
        <button role="radio" aria-checked="true">Natural Titanium</button>
        <button role="radio" aria-checked="false">Blue Titanium</button>
        <button role="radio" aria-checked="false">White Titanium</button>
        <button role="radio" aria-checked="false">Black Titanium</button>
      </div>
    </div>

    <div class="storage-selector">
      <span id="storage-label">Storage</span>
      <div role="radiogroup" aria-labelledby="storage-label">
        <button role="radio" aria-checked="false">128GB</button>
        <button role="radio" aria-checked="true">256GB</button>
        <button role="radio" aria-checked="false">512GB</button>
        <button role="radio" aria-checked="false">1TB</button>
      </div>
    </div>

    <div class="quantity-selector">
      <label for="quantity">Quantity</label>
      <input type="number" id="quantity" value="1" min="1">
    </div>

    <button class="btn-add-to-cart">Add to Cart</button>
    <p>This device supports eSIM and is compatible with Vodacom 5G network</p>
  </section>

  <section class="plan-attach-panel">
    <h2>Add a plan or bundle</h2>

    ${upsellPanel}

    <div class="base-plan-list">
      <div class="plan-card" data-plan-id="plan_red_5gb">
        <h3>Vodacom Red 5GB</h3>
        <p>5GB Data + Unlimited Calls &amp; SMS</p>
        <p class="plan-price">R 299/month</p>
        <button class="btn-select-plan">Select Plan</button>
      </div>
      <div class="plan-card" data-plan-id="plan_unlimited_20gb">
        <h3>Vodacom Unlimited 20GB</h3>
        <p>20GB Data + Unlimited Calls &amp; SMS</p>
        <p class="plan-price">R 799/month</p>
        <button class="btn-select-plan">Select Plan</button>
      </div>
      <div class="plan-card" data-plan-id="plan_red_premium">
        <h3>Vodacom Red Premium</h3>
        <p>50GB Data + Unlimited Calls &amp; SMS</p>
        <p class="plan-price">R 1,299/month</p>
        <button class="btn-select-plan">Select Plan</button>
      </div>
    </div>
  </section>

  <section class="product-details">
    <h2>Complete your purchase</h2>
  </section>
  </main>

  <footer>
    <p>&copy; 2026 Vodacom Group. All rights reserved.</p>
  </footer>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});
