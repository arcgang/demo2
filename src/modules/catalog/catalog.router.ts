import { Router, Request, Response } from 'express';
import { getUpsellOffersByContext } from './offers/upsell-offers.service';
import { PrepaidUpsellOffer } from './offers/prepaid-upsell-offer.model';
import { getRecommendationsBySlug } from './deviceRecommendations';
import { getJourneyFields, FieldDefinition } from '../../../backend/src/modules/journeyFields/journeyFieldsRegistry';

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

// ---------------------------------------------------------------------------
// GET /checkout?journey=<type>[&step=<n>]
// Renders the checkout form driven by the journey-fields config.
// Customer Details and Terms & Consent sections are dynamic; Payment section
// is static (PCI-DSS card tokenization UI does not change by journey type).
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderField(field: FieldDefinition): string {
  const id = escapeHtml(field.name);
  const label = escapeHtml(field.label);
  // Plain text markers keep them readable by regex that cannot cross HTML tag boundaries
  const optionalBadge = field.required ? '' : ' (Optional)';
  const requiredIndicator = field.required ? ' *' : '';
  const requiredAttr = field.required ? ' required aria-required="true"' : '';

  if (field.inputType === 'checkbox') {
    return `
    <div class="field-group">
      <input type="checkbox" id="${id}" name="${id}"${requiredAttr}>
      <label for="${id}">${label}${requiredIndicator}${optionalBadge}</label>
    </div>`;
  }

  if (field.inputType === 'select') {
    return `
    <div class="field-group">
      <label for="${id}">${label}${requiredIndicator}${optionalBadge}</label>
      <select id="${id}" name="${id}"${requiredAttr}>
        <option value="">Select ${label}</option>
      </select>
    </div>`;
  }

  return `
    <div class="field-group">
      <label for="${id}">${label}${requiredIndicator}${optionalBadge}</label>
      <input type="${field.inputType}" id="${id}" name="${id}"${requiredAttr}>
    </div>`;
}

catalogRouter.get('/checkout', (req: Request, res: Response) => {
  const journeyType = (req.query['journey'] as string) ?? 'purchase';
  const stepParam = req.query['step'];
  const currentStep = stepParam !== undefined ? parseInt(String(stepParam), 10) : undefined;

  const allFields = getJourneyFields(journeyType);
  if (!allFields) {
    res.status(400).type('text/html').send(`<h1>Unknown journey type: ${escapeHtml(journeyType)}</h1>`);
    return;
  }

  // When a step is provided, show only fields for that step (RICA fields gated to step 3).
  // When no step is provided, default to step 1 (Customer Details) so payment-step
  // fields never bleed into the Customer Details section alongside the static Payment Method UI.
  const effectiveStep = currentStep ?? 1;
  const customerFields = allFields.filter(f => {
    if (f.inputType === 'checkbox' || f.name === 'marketingConsent') return false;
    return f.collectionStep === effectiveStep;
  });

  const customerFieldsHtml = customerFields.map(renderField).join('');

  // marketingConsent is always optional; render it in Terms & Consent
  const marketingField: FieldDefinition = {
    name: 'marketingConsent',
    label: 'I consent to receiving marketing communications from Vodacom about products, services, and special offers',
    inputType: 'checkbox',
    required: false,
    businessPurpose: '',
    collectionStep: 1,
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Checkout - Vodacom Shop</title>
  <style>
    .required-indicator { color: #c00; margin-left: 2px; }
    .optional-label { color: #666; font-size: 0.875em; margin-left: 4px; }
    .field-group { margin-bottom: 1rem; }
    .field-group label { display: block; margin-bottom: 0.25rem; }
    .field-group input, .field-group select { width: 100%; padding: 0.5rem; box-sizing: border-box; }
    .field-group input[type="checkbox"] { width: auto; margin-right: 0.5rem; }
  </style>
</head>
<body>
  <header class="header">
    <a href="/">Vodacom Shop</a>
  </header>

  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/cart">Cart</a> &rsaquo;
    Checkout
  </nav>

  <main class="main-content">
    <h1>Checkout</h1>

    <section class="customer-details">
      <h2>Customer Details</h2>
      <form id="checkout-form" method="post" action="/checkout/submit">
        ${customerFieldsHtml}

        <h2>2 Payment Method</h2>
        <fieldset>
          <legend>Select payment method</legend>
          <label>
            <input type="radio" name="payment-method" value="card" checked>
            Credit or Debit Card
          </label>
          <label>
            <input type="radio" name="payment-method" value="mobile-money">
            Mobile Money
          </label>
        </fieldset>

        <h2>3 Terms &amp; Consent</h2>
        <div class="field-group">
          <input type="checkbox" id="terms" name="terms" required aria-required="true">
          <label for="terms">
            I agree to the <a href="#">Terms and Conditions</a> and <a href="#">Privacy Policy</a>
            <span class="required-indicator" aria-hidden="true">*</span>
            <span class="required-label">(Required)</span>
          </label>
        </div>
        ${renderField(marketingField)}

        <button type="submit">Place Order</button>
      </form>
    </section>
  </main>

  <aside class="summary-card">
    <h3>Order Summary</h3>
    <p>iPhone 15 Pro 256GB &mdash; Qty: 1 &mdash; R 18,999</p>
    <p>Silicone Case &mdash; Qty: 1 &mdash; R 599</p>
    <p>20W Power Adapter &mdash; Qty: 1 &mdash; R 399</p>
    <dl>
      <dt>Once-Off Subtotal</dt><dd>R 19,997.00</dd>
      <dt>Monthly Plan</dt><dd>R 799.00</dd>
      <dt>VAT (15%)</dt><dd>R 2,999.55</dd>
      <dt>Trade-In Credit</dt><dd>- R 2,500.00</dd>
      <dt>Total Once-Off</dt><dd>R 20,496.55</dd>
    </dl>
    <p>+ R 799.00/month</p>
  </aside>

  <footer class="footer">
    <h4>About Vodacom</h4>
    <a href="#">About Us</a>
    <a href="#">Careers</a>
    <h4>Support</h4>
    <a href="#">Contact Us</a>
    <a href="#">FAQs</a>
    <h4>Legal</h4>
    <a href="#">Terms &amp; Conditions</a>
    <a href="#">Privacy Policy</a>
    <a href="#">Cookie Policy</a>
    <a href="#">Accessibility</a>
    <h4>Connect</h4>
    <a href="#">Facebook</a>
    <a href="#">Twitter</a>
    <a href="#">Instagram</a>
    <a href="#">LinkedIn</a>
    <p>&copy; 2026 Vodacom Group. All rights reserved.</p>
  </footer>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});
