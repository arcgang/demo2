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
    <nav>
      <a href="/catalog">Devices</a>
      <a href="/plans">Plans</a>
      <a href="/accessories">Accessories</a>
      <a href="/support">Support</a>
    </nav>
    <button>Account</button>
    <button>3</button>
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
      <span class="required-badge">Required</span>

      ${upsellPanel}

      <fieldset>
        <legend>Choose your plan</legend>
        <label class="plan-option">
          <input type="radio" name="plan" value="plan_za_red_5gb" data-monthly="299" required>
          <span class="plan-name">Vodacom Red 5GB</span>
          <span class="plan-desc">5GB Data + Unlimited Calls &amp; SMS</span>
          <span class="plan-price">R 299/month</span>
        </label>
        <label class="plan-option">
          <input type="radio" name="plan" value="plan_za_unlimited_20gb" data-monthly="799">
          <span class="plan-name">Vodacom Unlimited 20GB</span>
          <span class="plan-desc">20GB Data + Unlimited Calls &amp; SMS</span>
          <span class="plan-price">R 799/month</span>
        </label>
        <label class="plan-option">
          <input type="radio" name="plan" value="plan_za_red_premium" data-monthly="1299">
          <span class="plan-name">Vodacom Red Premium</span>
          <span class="plan-desc">50GB Data + Unlimited Calls &amp; SMS</span>
          <span class="plan-price">R 1,299/month</span>
        </label>
      </fieldset>
    </section>

    <section class="bundle-addons">
      <h2>Optional Add-Ons</h2>
      <p class="optional-label">Optional</p>
      <label class="addon-option">
        <input type="checkbox" name="addon-data" data-monthly="199">
        Extra 10GB Data &mdash; Additional data for streaming and browsing &mdash; + R 199/month
      </label>
      <label class="addon-option">
        <input type="checkbox" name="addon-international" checked data-monthly="149">
        International Calling &mdash; 100 minutes to selected countries &mdash; + R 149/month
      </label>
      <label class="addon-option">
        <input type="checkbox" name="addon-roaming" data-monthly="299">
        Roaming Bundle &mdash; 5GB data for use in Africa &mdash; + R 299/month
      </label>
    </section>
  </main>

  <aside class="pricing-summary">
    <h3>Pricing Summary</h3>

    <h4>Once-Off Charges</h4>
    <dl>
      <dt>iPhone 15 Pro 256GB</dt><dd>R 24,999.00</dd>
      <dt>Activation Fee</dt><dd>R 0.00</dd>
    </dl>

    <h4>Recurring Charges</h4>
    <dl id="recurring-charges">
      <dt id="selected-plan-name">Vodacom Unlimited 20GB</dt><dd id="selected-plan-price">R 799.00</dd>
      <dt id="intl-calling-label">International Calling</dt><dd id="intl-calling-price">R 149.00</dd>
    </dl>

    <dl class="pricing-totals">
      <dt>Once-Off Subtotal</dt><dd id="once-off-subtotal">R 24,999.00</dd>
      <dt>VAT (15%)</dt><dd id="vat-amount">R 3,749.85</dd>
      <dt>Total Once-Off</dt><dd id="total-once-off">R 28,748.85</dd>
      <dt>Total Monthly</dt><dd id="total-monthly">R 948.00</dd>
    </dl>

    <button id="continue-to-cart" disabled data-requires-plan="true">Continue to Cart</button>
  </aside>

  <script>
    (function () {
      var DEVICE_PRICE = 24999;
      var VAT_RATE = 0.15;

      function fmt(n) {
        return 'R ' + n.toFixed(2).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
      }

      function update() {
        var sel = document.querySelector('input[name="plan"]:checked');
        var planMonthly = sel ? parseInt(sel.getAttribute('data-monthly') || '0', 10) : 0;

        var addonMonthly = 0;
        document.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) {
          addonMonthly += parseInt(cb.getAttribute('data-monthly') || '0', 10);
        });

        var vat = parseFloat((DEVICE_PRICE * VAT_RATE).toFixed(2));
        var totalOnceOff = parseFloat((DEVICE_PRICE + vat).toFixed(2));
        var totalMonthly = planMonthly + addonMonthly;

        document.getElementById('once-off-subtotal').textContent = fmt(DEVICE_PRICE);
        document.getElementById('vat-amount').textContent = fmt(vat);
        document.getElementById('total-once-off').textContent = fmt(totalOnceOff);
        document.getElementById('total-monthly').textContent = fmt(totalMonthly);

        if (sel) {
          var planOpt = sel.closest('.plan-option');
          var nameEl = planOpt ? planOpt.querySelector('.plan-name') : null;
          document.getElementById('selected-plan-name').textContent = nameEl ? nameEl.textContent : '';
          document.getElementById('selected-plan-price').textContent = fmt(planMonthly);
          document.getElementById('continue-to-cart').removeAttribute('disabled');
        } else {
          document.getElementById('continue-to-cart').setAttribute('disabled', '');
        }
      }

      document.querySelectorAll('input[name="plan"]').forEach(function (r) {
        r.addEventListener('change', update);
      });
      document.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
        cb.addEventListener('change', update);
      });

      document.getElementById('continue-to-cart').addEventListener('click', function () {
        var sel = document.querySelector('input[name="plan"]:checked');
        if (!sel) return;
        var addons = [];
        document.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) {
          addons.push(cb.name);
        });
        var cartItem = {
          productId: 'prod_za_iphone15pro_256',
          productName: 'iPhone 15 Pro 256GB',
          planId: sel.value,
          addons: addons,
          devicePrice: DEVICE_PRICE
        };
        try {
          var cart = JSON.parse(localStorage.getItem('cart') || '[]');
          cart.push(cartItem);
          localStorage.setItem('cart', JSON.stringify(cart));
        } catch (e) {}
        window.location.href = '/cart';
      });
    })();
  </script>
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

  <section class="product-details">
    <h2>Complete your purchase</h2>
  </section>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});
