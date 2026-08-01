import { Router, Request, Response } from 'express';
import { getUpsellOffersByContext } from './offers/upsell-offers.service';
import { PrepaidUpsellOffer } from './offers/prepaid-upsell-offer.model';
import { getRecommendationsBySlug } from './deviceRecommendations';

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

catalogRouter.get('/product/:slug/configure', (req: Request, res: Response) => {
  const { slug } = req.params;
  const context = (req.query['context'] as string) ?? '';
  const offers = context ? getUpsellOffersByContext(context) : [];
  const upsellPanel = renderUpsellPanel(offers);

  // Fetch recommendations from the device recommendations data layer
  // (equivalent to GET /api/devices/:id/recommendations in the backend)
  const rec = getRecommendationsBySlug(slug);
  if (!rec) {
    res.status(404).type('text/html').send(`<h1>Device not found</h1>`);
    return;
  }

  const plans = rec.attachments.filter(a => a.type === 'PLAN');
  const addons = rec.attachments.filter(a => a.type === 'ADDON');

  // Pre-select the plan marked as defaultChecked, or the first plan
  const defaultPlan = plans.find(p => p.defaultChecked) ?? plans[0];

  function fmtPrice(n: number): string {
    return 'R ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  const planRadios = plans.map(p => `
        <label class="plan-option">
          <input type="radio" name="plan" value="${p.id}" data-monthly="${p.monthly}" required${p === defaultPlan ? ' checked' : ''}>
          <span class="plan-name">${p.name}</span>
          <span class="plan-desc">${p.description}</span>
          <span class="plan-price">R ${p.monthly}/month</span>
        </label>`).join('');

  const addonCheckboxes = addons.map(a => `
      <label class="addon-option">
        <input type="checkbox" name="${a.checkboxName ?? a.id}" data-monthly="${a.monthly}" data-addon-name="${a.name}"${a.defaultChecked ? ' checked' : ''}>
        ${a.name} &mdash; ${a.description} &mdash; + R ${a.monthly}/month
      </label>`).join('');

  // Initial recurring charges section: show selected plan + default-checked add-ons
  const defaultPlanMonthly = defaultPlan ? defaultPlan.monthly : 0;
  const defaultAddons = addons.filter(a => a.defaultChecked);
  const defaultAddonMonthly = defaultAddons.reduce((s, a) => s + a.monthly, 0);
  const initialTotalMonthly = defaultPlanMonthly + defaultAddonMonthly;

  const devicePrice = rec.devicePrice;
  const vat = parseFloat((devicePrice * 0.15).toFixed(2));
  const totalOnceOff = parseFloat((devicePrice + vat).toFixed(2));

  const initialPlanRow = defaultPlan
    ? `<dt id="selected-plan-name">${defaultPlan.name}</dt><dd id="selected-plan-price">${fmtPrice(defaultPlanMonthly)}</dd>`
    : `<dt id="selected-plan-name"></dt><dd id="selected-plan-price"></dd>`;

  const initialAddonRows = defaultAddons.map(a =>
    `<dt class="addon-row" data-addon-id="${a.checkboxName ?? a.id}">${a.name}</dt><dd class="addon-row" data-addon-id="${a.checkboxName ?? a.id}">${fmtPrice(a.monthly)}</dd>`
  ).join('\n      ');

  const productSlugForBreadcrumb = slug;
  const productUrl = `/product/${productSlugForBreadcrumb}`;

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
    <a href="${productUrl}">${rec.deviceName}</a> &rsaquo;
    Configure Bundle
  </nav>

  <main>
    <h1>Configure Your Bundle</h1>
    <h3>${rec.deviceName}</h3>
    <p>${rec.colour} &mdash; ${fmtPrice(devicePrice)}</p>
    <p>This plan is compatible with your device</p>

    <section class="plan-selection">
      <h2>Select a Plan</h2>
      <span class="required-badge">Required</span>

      ${upsellPanel}

      <fieldset>
        <legend>Choose your plan</legend>
        ${planRadios}
      </fieldset>
    </section>

    <section class="bundle-addons">
      <h2>Optional Add-Ons</h2>
      <p class="optional-label">Optional</p>
      ${addonCheckboxes}
    </section>
  </main>

  <aside class="pricing-summary">
    <h3>Pricing Summary</h3>

    <h4>Once-Off Charges</h4>
    <dl>
      <dt>${rec.deviceName}</dt><dd>${fmtPrice(devicePrice)}</dd>
      <dt>Activation Fee</dt><dd>${fmtPrice(rec.activationFee)}</dd>
    </dl>

    <h4>Recurring Charges</h4>
    <dl id="recurring-charges">
      ${initialPlanRow}
      ${initialAddonRows}
    </dl>

    <dl class="pricing-totals">
      <dt>Once-Off Subtotal</dt><dd id="once-off-subtotal">${fmtPrice(devicePrice)}</dd>
      <dt>VAT (15%)</dt><dd id="vat-amount">${fmtPrice(vat)}</dd>
      <dt>Total Once-Off</dt><dd id="total-once-off">${fmtPrice(totalOnceOff)}</dd>
      <dt>Total Monthly</dt><dd id="total-monthly">${fmtPrice(initialTotalMonthly)}</dd>
    </dl>

    <button id="continue-to-cart"${defaultPlan ? '' : ' disabled'} data-requires-plan="true">Continue to Cart</button>
  </aside>

  <script>
    (function () {
      var DEVICE_PRICE = ${devicePrice};
      var DEVICE_ID = '${rec.deviceId}';
      var DEVICE_NAME = '${rec.deviceName}';
      var VAT_RATE = 0.15;

      function fmt(n) {
        return 'R ' + n.toFixed(2).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
      }

      function update() {
        var sel = document.querySelector('input[name="plan"]:checked');
        var planMonthly = sel ? parseInt(sel.getAttribute('data-monthly') || '0', 10) : 0;

        // Rebuild recurring-charges dl dynamically
        var recurringDl = document.getElementById('recurring-charges');

        // Update or clear the plan row
        var planNameDt = document.getElementById('selected-plan-name');
        var planPriceDd = document.getElementById('selected-plan-price');
        if (sel) {
          var planLabel = sel.closest('.plan-option');
          var nameSpan = planLabel ? planLabel.querySelector('.plan-name') : null;
          planNameDt.textContent = nameSpan ? nameSpan.textContent : '';
          planPriceDd.textContent = fmt(planMonthly);
        } else {
          planNameDt.textContent = '';
          planPriceDd.textContent = '';
        }

        // Remove all existing add-on rows
        recurringDl.querySelectorAll('[data-addon-id]').forEach(function (el) {
          el.parentNode.removeChild(el);
        });

        // Add a row for each checked add-on
        var addonMonthly = 0;
        document.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
          var monthly = parseInt(cb.getAttribute('data-monthly') || '0', 10);
          if (cb.checked) {
            addonMonthly += monthly;
            var addonId = cb.name;
            var addonName = cb.getAttribute('data-addon-name') || cb.name;
            var dt = document.createElement('dt');
            dt.className = 'addon-row';
            dt.setAttribute('data-addon-id', addonId);
            dt.textContent = addonName;
            var dd = document.createElement('dd');
            dd.className = 'addon-row';
            dd.setAttribute('data-addon-id', addonId);
            dd.textContent = fmt(monthly);
            recurringDl.appendChild(dt);
            recurringDl.appendChild(dd);
          }
        });

        var vat = parseFloat((DEVICE_PRICE * VAT_RATE).toFixed(2));
        var totalOnceOff = parseFloat((DEVICE_PRICE + vat).toFixed(2));
        var totalMonthly = planMonthly + addonMonthly;

        document.getElementById('once-off-subtotal').textContent = fmt(DEVICE_PRICE);
        document.getElementById('vat-amount').textContent = fmt(vat);
        document.getElementById('total-once-off').textContent = fmt(totalOnceOff);
        document.getElementById('total-monthly').textContent = fmt(totalMonthly);

        if (sel) {
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
          productId: DEVICE_ID,
          productName: DEVICE_NAME,
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
