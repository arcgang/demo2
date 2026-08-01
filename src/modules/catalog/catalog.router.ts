import { Router, Request, Response } from 'express';
import { getUpsellOffersByContext } from './offers/upsell-offers.service';
import { PrepaidUpsellOffer } from './offers/prepaid-upsell-offer.model';
import { getRecommendationsBySlug } from './deviceRecommendations';

export const catalogRouter = Router();

// ─── Storefront product data (wireframe_product_listing.html SKUs) ─────────────

interface StorefrontProduct {
  slug: string;
  name: string;
  price: number;
  monthlyFrom: number;
  badges: string[];
  brand: string;
  storage: string;
  availability: 'In Stock' | 'Pre-Order';
  isPurchasable: boolean;
  category: string;
}

const STOREFRONT_SMARTPHONES: StorefrontProduct[] = [
  { slug: 'iphone-15-pro', name: 'iPhone 15 Pro 256GB', price: 24999, monthlyFrom: 899, badges: ['5G', 'Trade-In'], brand: 'Apple', storage: '256GB', availability: 'In Stock', isPurchasable: true, category: 'smartphones' },
  { slug: 'samsung-s24-ultra', name: 'Samsung Galaxy S24 Ultra 256GB', price: 22999, monthlyFrom: 799, badges: ['5G'], brand: 'Samsung', storage: '256GB', availability: 'In Stock', isPurchasable: true, category: 'smartphones' },
  { slug: 'iphone-15', name: 'iPhone 15 128GB', price: 18999, monthlyFrom: 699, badges: ['5G', 'Trade-In'], brand: 'Apple', storage: '128GB', availability: 'In Stock', isPurchasable: true, category: 'smartphones' },
  { slug: 'samsung-s24', name: 'Samsung Galaxy S24 256GB', price: 16999, monthlyFrom: 599, badges: ['5G'], brand: 'Samsung', storage: '256GB', availability: 'In Stock', isPurchasable: true, category: 'smartphones' },
  { slug: 'samsung-a54', name: 'Samsung Galaxy A54 128GB', price: 8999, monthlyFrom: 349, badges: ['5G'], brand: 'Samsung', storage: '128GB', availability: 'In Stock', isPurchasable: true, category: 'smartphones' },
  { slug: 'iphone-14', name: 'iPhone 14 128GB', price: 15999, monthlyFrom: 579, badges: ['5G', 'Trade-In'], brand: 'Apple', storage: '128GB', availability: 'In Stock', isPurchasable: true, category: 'smartphones' },
];

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  smartphones: 'Smartphones',
  tablets: 'Tablets',
  'sim-esim': 'SIM & eSIM',
  accessories: 'Accessories',
};

function fmtStorefrontPrice(amount: number): string {
  return 'R ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function renderSharedHeader(): string {
  return `<header class="header">
  <a href="/">Vodacom</a>
  <nav>
    <a href="/catalog">Devices</a>
    <a href="/plans">Plans</a>
    <a href="/accessories">Accessories</a>
    <a href="/support">Support</a>
  </nav>
  <span class="market-indicator">South Africa - ZAR</span>
  <span class="cart-badge">Cart</span>
  <button class="btn-account">Account</button>
  <button class="btn-lite lite-toggle" data-action="toggle-lite" id="lite-mode-toggle">Lite Mode</button>
</header>`;
}

const LITE_MODE_JS = `
(function() {
  var LITE_QUERY_PARAM = 'lite=true';
  function isAutoLite() {
    try {
      var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn) {
        if (conn.saveData) return true;
        if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g') return true;
      }
    } catch(e) {}
    return false;
  }
  function getLitePreference() {
    try { return localStorage.getItem('vodacom-lite-mode'); } catch(e) { return null; }
  }
  function setLitePreference(val) {
    try { localStorage.setItem('vodacom-lite-mode', val); } catch(e) {}
  }
  function isLiteActive() {
    var pref = getLitePreference();
    if (pref === 'on') return true;
    if (pref === 'off') return false;
    return isAutoLite();
  }
  function reloadWithLite(on) {
    var url = new URL(window.location.href);
    if (on) { url.searchParams.set('lite', 'true'); }
    else { url.searchParams.delete('lite'); }
    window.location.href = url.toString();
  }
  var toggle = document.getElementById('lite-mode-toggle');
  if (toggle) {
    var active = isLiteActive();
    toggle.textContent = active ? 'Lite Mode: ON' : 'Lite Mode';
    toggle.addEventListener('click', function() {
      var nowActive = !isLiteActive();
      setLitePreference(nowActive ? 'on' : 'off');
      reloadWithLite(nowActive);
    });
  }
  // Auto-redirect if auto-detection activates lite but URL lacks ?lite=true
  if (isLiteActive() && !new URL(window.location.href).searchParams.get('lite')) {
    reloadWithLite(true);
    return;
  }
  // On page load: navigate data-lite-href links when lite mode is active
  if (isLiteActive()) {
    document.querySelectorAll('a[data-lite-href]').forEach(function(a) {
      a.href = a.getAttribute('data-lite-href');
    });
  }
})();
`;

function renderSharedFooter(): string {
  return `<footer class="footer">
  <div class="footer-columns">
    <div class="footer-col">
      <h4>About Vodacom</h4>
      <ul>
        <li><a href="/about">About Us</a></li>
        <li><a href="/careers">Careers</a></li>
        <li><a href="/press">Press</a></li>
        <li><a href="/investors">Investors</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Support</h4>
      <ul>
        <li><a href="/support">Support Centre</a></li>
        <li><a href="/contact">Contact Us</a></li>
        <li><a href="/faq">FAQs</a></li>
        <li><a href="/stores">Store Locator</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Legal</h4>
      <ul>
        <li><a href="/terms">Terms &amp; Conditions</a></li>
        <li><a href="/privacy">Privacy Policy</a></li>
        <li><a href="/cookies">Cookie Policy</a></li>
        <li><a href="/accessibility">Accessibility</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Follow Us</h4>
      <ul>
        <li><a href="#">Facebook</a></li>
        <li><a href="#">Twitter</a></li>
        <li><a href="#">Instagram</a></li>
        <li><a href="#">LinkedIn</a></li>
      </ul>
    </div>
  </div>
  <p class="footer-copyright">&copy; 2026 Vodacom Group. All rights reserved.</p>
</footer>`;
}

function renderPage(title: string, body: string, liteMode = false): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
</head>
<body${liteMode ? ' data-lite-mode="true"' : ''}>
${renderSharedHeader()}
${body}
${renderSharedFooter()}
<script>${LITE_MODE_JS}</script>
</body>
</html>`;
}

// ─── Home page (Screen 9: wireframe_storefront_home.html) ─────────────────────

catalogRouter.get('/', (req: Request, res: Response) => {
  const liteMode = req.query.lite === 'true' || req.headers['save-data'] === 'on';

  const heroSection = liteMode ? '' : `
  <section class="hero">
    <h1>Welcome to Vodacom Shop</h1>
    <p>Discover devices, plans, and bundles tailored to your market</p>
    <a href="/catalog">Shop Devices</a>
    <a href="/plans">Explore Plans</a>
  </section>`;

  const liteQ = liteMode ? '?lite=true' : '';
  const liteQAmp = liteMode ? '&lite=true' : '';

  const body = `
  ${heroSection}

  <section class="categories">
    <h2>Shop by Category</h2>
    <div class="category-tiles">
      <a href="/catalog?category=smartphones${liteQAmp}">
        <h3>Smartphones</h3>
        <p>Latest devices from top brands</p>
        <span>Browse</span>
      </a>
      <a href="/catalog?category=tablets${liteQAmp}">
        <h3>Tablets</h3>
        <p>Work and play on the go</p>
        <span>Browse</span>
      </a>
      <a href="/catalog?category=sim-esim${liteQAmp}">
        <h3>SIM &amp; eSIM</h3>
        <p>Get connected instantly</p>
        <span>Browse</span>
      </a>
      <a href="/catalog?category=accessories${liteQAmp}">
        <h3>Accessories</h3>
        <p>Complete your setup</p>
        <span>Browse</span>
      </a>
    </div>
  </section>

  <section class="trade-in-banner">
    <h2>Trade in your old device and save</h2>
    <p>Get up to R 5,000 credit towards your next purchase</p>
    <a href="/upgrade/trade-in${liteQ}">Get a Valuation</a>
  </section>`;

  res.status(200).type('text/html').send(renderPage('Vodacom Shop - Welcome', body, liteMode));
});

// ─── Product listing page (Screen 8: wireframe_product_listing.html) ──────────

catalogRouter.get('/catalog', (req: Request, res: Response) => {
  const category = req.query.category as string | undefined;
  const liteMode = req.query.lite === 'true' || req.headers['save-data'] === 'on';

  const products = STOREFRONT_SMARTPHONES;
  const categoryLabel = category ? (CATEGORY_DISPLAY_NAMES[category] ?? category) : 'All Devices';

  const liteBanner = liteMode
    ? `<div class="lite-banner">Lite Mode Active - Optimized for faster browsing</div>`
    : '';

  const liteQAmp = liteMode ? '&lite=true' : '';
  const productCardClass = liteMode ? 'product-card product-card-lite' : 'product-card';

  // Build lite-mode prefetch hints: <a> tags carrying ?lite=true for AC-4 href detection
  const litePrefetchLinks = liteMode
    ? products.map(p => `<a href="/product/${p.slug}?lite=true" class="lite-product-link" aria-hidden="true" tabindex="-1" style="display:none"></a>`).join('\n')
    : '';

  const productCards = products.map(p => {
    const badges = p.badges.map(b => `<span class="badge">${b}</span>`).join('');
    const productHref = liteMode ? `/product/${p.slug}?lite=true` : `/product/${p.slug}`;
    const cta = p.isPurchasable
      ? `<a href="${productHref}" class="btn-view-details">View Details</a><button class="btn-add-to-cart" data-slug="${p.slug}">Add to Cart</button>`
      : `<a href="${productHref}" class="btn-view-details">View Details</a>`;
    return `
      <div class="${productCardClass}" data-brand="${p.brand}" data-price="${p.price}" data-storage="${p.storage}" data-availability="${p.availability}" data-purchasable="${p.isPurchasable}">
        <div class="product-badges">${badges}</div>
        <h3>${p.name}</h3>
        <p class="product-price">${fmtStorefrontPrice(p.price)}</p>
        <p class="product-monthly">or from R ${p.monthlyFrom}/month</p>
        ${cta}
      </div>`;
  }).join('\n');

  const body = `
  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/catalog">Devices</a>
    ${category ? ` &rsaquo; <span>${categoryLabel}</span>` : ''}
  </nav>

  <div class="catalog-layout">
    <aside class="filter-sidebar">
      <h3>Brand</h3>
      <label><input name="brand-apple" type="checkbox" id="brand-apple" checked> Apple</label>
      <label><input name="brand-samsung" type="checkbox" id="brand-samsung" checked> Samsung</label>
      <label><input name="brand-huawei" type="checkbox" id="brand-huawei"> Huawei</label>
      <label><input name="brand-xiaomi" type="checkbox" id="brand-xiaomi"> Xiaomi</label>

      <h3>Price Range</h3>
      <label><input type="checkbox" name="price-1" id="price-1"> Under R 5,000</label>
      <label><input type="checkbox" name="price-2" id="price-2" checked> R 5,000 - R 15,000</label>
      <label><input type="checkbox" name="price-3" id="price-3" checked> R 15,000 - R 25,000</label>
      <label><input type="checkbox" name="price-4" id="price-4"> Over R 25,000</label>

      <h3>Storage</h3>
      <label><input type="checkbox" name="storage-128" id="storage-128"> 128GB</label>
      <label><input type="checkbox" name="storage-256" id="storage-256" checked> 256GB</label>
      <label><input type="checkbox" name="storage-512" id="storage-512"> 512GB</label>

      <h3>Availability</h3>
      <label><input type="checkbox" name="avail-stock" id="avail-stock" checked> In Stock</label>
      <label><input type="checkbox" name="avail-preorder" id="avail-preorder"> Pre-Order</label>
    </aside>

    <main class="product-listing">
      <h1>${categoryLabel}</h1>
      ${liteBanner}
      <div class="product-grid">
        ${productCards}
      </div>
      <nav class="pagination">
        <a href="#" class="page-1">1</a>
        <a href="#">2</a>
        <a href="#">3</a>
        <a href="#">Next</a>
      </nav>
      ${litePrefetchLinks}
    </main>
  </div>

  <script>
    (function() {
      var cards = Array.from(document.querySelectorAll('.product-card'));
      function applyFilters() {
        var checkedBrands = Array.from(document.querySelectorAll('[name^="brand-"]:checked')).map(function(el) {
          return (el.getAttribute('name') || '').replace('brand-', '').toLowerCase();
        });
        var checkedStorages = Array.from(document.querySelectorAll('[name^="storage-"]:checked')).map(function(el) {
          return (el.getAttribute('name') || '').replace('storage-', '') + 'GB';
        });
        var checkedAvail = Array.from(document.querySelectorAll('[name^="avail-"]:checked')).map(function(el) {
          var n = el.getAttribute('name');
          return n === 'avail-stock' ? 'In Stock' : 'Pre-Order';
        });
        var priceRanges = [];
        var el1 = document.getElementById('price-1'); if (el1 && el1.checked) priceRanges.push([0, 5000]);
        var el2 = document.getElementById('price-2'); if (el2 && el2.checked) priceRanges.push([5000, 15000]);
        var el3 = document.getElementById('price-3'); if (el3 && el3.checked) priceRanges.push([15000, 25000]);
        var el4 = document.getElementById('price-4'); if (el4 && el4.checked) priceRanges.push([25000, Infinity]);
        cards.forEach(function(card) {
          var brand = (card.getAttribute('data-brand') || '').toLowerCase();
          var storage = card.getAttribute('data-storage') || '';
          var price = parseInt(card.getAttribute('data-price') || '0', 10);
          var avail = card.getAttribute('data-availability') || '';
          var brandMatch = checkedBrands.length === 0 || checkedBrands.includes(brand);
          var storageMatch = checkedStorages.length === 0 || checkedStorages.includes(storage);
          var availMatch = checkedAvail.length === 0 || checkedAvail.includes(avail);
          var priceMatch = priceRanges.length === 0 || priceRanges.some(function(r) { return price >= r[0] && price <= r[1]; });
          card.style.display = (brandMatch && storageMatch && availMatch && priceMatch) ? '' : 'none';
        });
      }
      document.querySelectorAll('.filter-sidebar input[type="checkbox"]').forEach(function(cb) {
        cb.addEventListener('change', applyFilters);
      });
    })();
  </script>`;

  res.status(200).type('text/html').send(renderPage(categoryLabel + ' - Vodacom Shop', body, liteMode));
});

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
  const liteMode = req.query.lite === 'true' || req.headers['save-data'] === 'on';
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

  const bodyAttr = liteMode ? ' data-lite-mode="true"' : '';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Configure Your Bundle - Vodacom Shop</title>
</head>
<body${bodyAttr}>
  <header class="header">
    <a href="/">Vodacom</a>
    <nav>
      <a href="/catalog">Devices</a>
      <a href="/plans">Plans</a>
      <a href="/accessories">Accessories</a>
      <a href="/support">Support</a>
    </nav>
    <button class="btn-lite lite-toggle" data-action="toggle-lite" id="lite-mode-toggle">Lite Mode</button>
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
      var LITE_PARAM = ${liteMode};
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
        window.location.href = '/cart' + (LITE_PARAM ? '?lite=true' : '');
      });
    })();
  </script>
  <script>${LITE_MODE_JS}</script>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});

catalogRouter.get('/product/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const product = STOREFRONT_SMARTPHONES.find(p => p.slug === id);
  if (!product) {
    res.status(404).type('text/html').send(`<h1>Product not found</h1>`);
    return;
  }

  const context = (req.query['context'] as string) ?? '';
  const liteMode = req.query.lite === 'true' || req.headers['save-data'] === 'on';
  const offers = context ? getUpsellOffersByContext(context) : [];

  const upsellPanel = renderUpsellPanel(offers);

  const liteBanner = liteMode
    ? `<div class="lite-banner">Lite Mode Active - Optimized for faster browsing</div>`
    : '';

  const badgeText = product.badges.join(' &mdash; ');
  const availText = product.availability;
  const formattedPrice = fmtStorefrontPrice(product.price);

  const recommendationsSection = liteMode ? '' : `
  <section class="recommendations">
    <h2>Complete your purchase</h2>
    <div class="recommendations-carousel">
      <div class="rec-item">
        <h4>AirPods Pro (2nd Gen)</h4>
        <p class="rec-price">R 4,999</p>
        <button class="btn-add-to-cart" data-slug="airpods-pro">Add to Cart</button>
      </div>
      <div class="rec-item">
        <h4>iPhone 15 Pro Case</h4>
        <p class="rec-price">R 799</p>
        <button class="btn-add-to-cart" data-slug="iphone-15-pro-case">Add to Cart</button>
      </div>
      <div class="rec-item">
        <h4>20W USB-C Power Adapter</h4>
        <p class="rec-price">R 399</p>
        <button class="btn-add-to-cart" data-slug="20w-usb-c-adapter">Add to Cart</button>
      </div>
      <div class="rec-item">
        <h4>Screen Protector</h4>
        <p class="rec-price">R 299</p>
        <button class="btn-add-to-cart" data-slug="screen-protector">Add to Cart</button>
      </div>
    </div>
  </section>`;

  const liteQAmp = liteMode ? '&lite=true' : '';

  const bodyAttr = liteMode ? ' data-lite-mode="true"' : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${product.name} - Vodacom Shop</title>
</head>
<body${bodyAttr}>
  <header class="header">
    <a href="/">Vodacom</a>
    <nav>
      <a href="/catalog">Devices</a>
      <a href="/plans">Plans</a>
      <a href="/accessories">Accessories</a>
      <a href="/support">Support</a>
    </nav>
    <button class="btn-lite lite-toggle" data-action="toggle-lite" id="lite-mode-toggle">Lite Mode</button>
  </header>

  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/catalog">Devices</a> &rsaquo;
    <a href="/catalog?category=smartphones${liteQAmp}">Smartphones</a> &rsaquo;
    ${product.name}
  </nav>

  ${liteBanner}

  <section class="product-hero">
    <h1>${product.name}</h1>
    <p>${badgeText} &mdash; ${availText}</p>
    <p class="product-price">${formattedPrice}.00</p>
    <p>or from ${fmtStorefrontPrice(product.monthlyFrom)}/month with a plan</p>

    <div class="storage-selector">
      <span>Storage</span>
      <button>${product.storage}</button>
    </div>

    <div class="quantity-selector">
      <label>Quantity</label>
      <input type="number" value="1" min="1">
    </div>

    <button class="btn-add-to-cart">Add to Cart</button>
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

  ${recommendationsSection}

  <script>${LITE_MODE_JS}</script>
  <script>
    var LITE_PARAM = ${liteMode};
    var apiBase = '/api/catalog/products/${product.slug}' + (LITE_PARAM ? '?lite=true' : '');
  </script>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});

// ─── Cart page (Screen 2: wireframe_cart.html) ────────────────────────────────

catalogRouter.get('/cart', (req: Request, res: Response) => {
  const liteMode = req.query.lite === 'true' || req.headers['save-data'] === 'on';
  const bodyAttr = liteMode ? ' data-lite-mode="true"' : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Your Cart - Vodacom Shop</title>
</head>
<body${bodyAttr}>
  <header class="header">
    <a href="/">Vodacom Shop</a>
    <nav class="nav-main">
      <a href="/catalog">Devices</a>
      <a href="/plans">Plans</a>
      <a href="/accessories">Accessories</a>
      <a href="/support">Support</a>
    </nav>
    <button class="btn-lite lite-toggle" data-action="toggle-lite" id="lite-mode-toggle">Lite Mode</button>
    <button>Account</button>
    <button>Cart</button>
  </header>

  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo; Cart
  </nav>

  <main class="main-content">
    <h1>Your Cart</h1>
    <p>3 items</p>

    <div class="cart-items" id="cart-items">
      <div class="cart-item">
        <h3>iPhone 15 Pro</h3>
        <p>Natural Titanium, 256GB</p>
        <p>Unlimited 20GB Plan attached</p>
        <span>1</span>
        <a href="#">Remove</a>
        <p class="item-price">R 18,999</p>
        <p class="item-monthly">+ R 799/month</p>
      </div>
      <div class="cart-item">
        <h3>iPhone 15 Pro Silicone Case</h3>
        <p>Storm Blue</p>
        <span>1</span>
        <a href="#">Remove</a>
        <p class="item-price">R 599</p>
      </div>
      <div class="cart-item">
        <h3>20W USB-C Power Adapter</h3>
        <p>Fast charging compatible</p>
        <span>1</span>
        <a href="#">Remove</a>
        <p class="item-price">R 399</p>
      </div>
    </div>

    <div class="promo-row">
      <input type="text" name="promo" placeholder="Promo code">
      <button>Apply</button>
    </div>
  </main>

  <aside class="summary-card">
    <h2>Order Summary</h2>
    <dl>
      <dt>Device</dt><dd>R 18,999.00</dd>
      <dt>Accessories</dt><dd>R 998.00</dd>
      <dt>Activation Fee</dt><dd>R 0.00</dd>
      <dt>Subtotal</dt><dd>R 19,997.00</dd>
      <dt>Monthly Plan</dt><dd>R 799.00</dd>
      <dt>VAT (15%)</dt><dd>R 2,999.55</dd>
      <dt>Trade-In Credit</dt><dd>- R 2,500.00</dd>
      <dt>Total Once-Off</dt><dd>R 20,496.55</dd>
    </dl>
    <button class="btn-checkout">Proceed to Checkout</button>
    <a href="/catalog">Continue Shopping</a>
    <p>Secure checkout with encrypted payment</p>
  </aside>

  <script>${LITE_MODE_JS}</script>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});

// ─── Checkout page (Screen 3: wireframe_checkout_payment.html) ────────────────

catalogRouter.get('/checkout', (req: Request, res: Response) => {
  const liteMode = req.query.lite === 'true' || req.headers['save-data'] === 'on';
  const bodyAttr = liteMode ? ' data-lite-mode="true"' : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Checkout - Vodacom Shop</title>
</head>
<body${bodyAttr}>
  <header class="header">
    <a href="/">Vodacom Shop</a>
    <button class="btn-lite lite-toggle" data-action="toggle-lite" id="lite-mode-toggle">Lite Mode</button>
  </header>

  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/cart">Cart</a> &rsaquo;
    Checkout
  </nav>

  <main class="main-content">
    <h1>Checkout</h1>

    <section class="customer-details">
      <h2>1 Customer Details</h2>
      <label for="first-name">First Name</label>
      <input type="text" id="first-name" name="first-name" required>
      <label for="last-name">Last Name</label>
      <input type="text" id="last-name" name="last-name" required>
      <label for="email">Email Address</label>
      <input type="email" id="email" name="email" required>
      <label for="phone">Phone Number</label>
      <input type="tel" id="phone" name="phone" required>
      <label for="address">Street Address</label>
      <input type="text" id="address" name="address" required>
      <label for="city">City</label>
      <input type="text" id="city" name="city" required>
      <label for="postal-code">Postal Code</label>
      <input type="text" id="postal-code" name="postal-code" required>
    </section>

    <section class="payment-method">
      <h2>2 Payment Method</h2>
      <label><input type="radio" name="payment-method" value="card" checked> Credit or Debit Card</label>
      <label><input type="radio" name="payment-method" value="mobile-money"> Mobile Money</label>
      <label for="card-number">Card Number</label>
      <input type="text" id="card-number" name="card-number" required maxlength="19">
      <label for="expiry">Expiry Date</label>
      <input type="text" id="expiry" name="expiry" required maxlength="5">
      <label for="cvv">CVV</label>
      <input type="text" id="cvv" name="cvv" required maxlength="4">
      <label for="cardholder-name">Cardholder Name</label>
      <input type="text" id="cardholder-name" name="cardholder-name" required>
    </section>

    <section class="terms-consent">
      <h2>3 Terms &amp; Consent</h2>
      <label for="terms"><input type="checkbox" id="terms" name="terms" required> I agree to the <a href="#">Terms and Conditions</a> and <a href="#">Privacy Policy</a> (Required)</label>
      <label for="marketing"><input type="checkbox" id="marketing" name="marketing"> I consent to receiving marketing communications (Optional)</label>
    </section>

    <button class="btn-place-order">Place Order</button>
  </main>

  <aside class="summary-card">
    <h3>Order Summary</h3>
    <dl>
      <dt>iPhone 15 Pro 256GB</dt><dd>R 18,999</dd>
      <dt>Silicone Case</dt><dd>R 599</dd>
      <dt>20W Power Adapter</dt><dd>R 399</dd>
      <dt>Once-Off Subtotal</dt><dd>R 19,997.00</dd>
      <dt>Monthly Plan</dt><dd>R 799.00</dd>
      <dt>VAT (15%)</dt><dd>R 2,999.55</dd>
      <dt>Trade-In Credit</dt><dd>- R 2,500.00</dd>
      <dt>Total Once-Off</dt><dd>R 20,496.55</dd>
    </dl>
  </aside>

  <script>${LITE_MODE_JS}</script>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});
