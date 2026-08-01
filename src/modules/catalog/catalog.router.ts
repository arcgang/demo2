import { Router, Request, Response } from 'express';
import { getUpsellOffersByContext } from './offers/upsell-offers.service';
import { PrepaidUpsellOffer } from './offers/prepaid-upsell-offer.model';
import { getRecommendationsBySlug } from './deviceRecommendations';
import { getPlansForMarket } from './catalogData';

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
  { slug: 'iphone-14', name: 'iPhone 14 128GB', price: 15999, monthlyFrom: 579, badges: ['5G', 'Trade-In'], brand: 'Apple', storage: '128GB', availability: 'In Stock', isPurchasable: false, category: 'smartphones' },
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
</header>`;
}

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

function renderPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
</head>
<body>
${renderSharedHeader()}
${body}
${renderSharedFooter()}
</body>
</html>`;
}

// ─── Home page (Screen 9: wireframe_storefront_home.html) ─────────────────────

catalogRouter.get('/', (_req: Request, res: Response) => {
  const body = `
  <section class="hero">
    <h1>Welcome to Vodacom Shop</h1>
    <p>Discover devices, plans, and bundles tailored to your market</p>
    <a href="/catalog">Shop Devices</a>
    <a href="/plans">Explore Plans</a>
  </section>

  <section class="categories">
    <h2>Shop by Category</h2>
    <div class="category-tiles">
      <a href="/catalog?category=smartphones">
        <h3>Smartphones</h3>
        <p>Latest devices from top brands</p>
        <span>Browse</span>
      </a>
      <a href="/catalog?category=tablets">
        <h3>Tablets</h3>
        <p>Work and play on the go</p>
        <span>Browse</span>
      </a>
      <a href="/catalog?category=sim-esim">
        <h3>SIM &amp; eSIM</h3>
        <p>Get connected instantly</p>
        <span>Browse</span>
      </a>
      <a href="/catalog?category=accessories">
        <h3>Accessories</h3>
        <p>Complete your setup</p>
        <span>Browse</span>
      </a>
    </div>
  </section>

  <section class="trade-in-banner">
    <h2>Trade in your old device and save</h2>
    <p>Get up to R 5,000 credit towards your next purchase</p>
    <a href="/upgrade/trade-in">Get a Valuation</a>
  </section>`;

  res.status(200).type('text/html').send(renderPage('Vodacom Shop - Welcome', body));
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

  const productCards = products.map(p => {
    const badges = p.badges.map(b => `<span class="badge">${b}</span>`).join('');
    const cta = p.isPurchasable
      ? `<a href="/product/${p.slug}" class="btn-view-details">View Details</a><button class="btn-add-to-cart" data-slug="${p.slug}">Add to Cart</button>`
      : `<a href="/product/${p.slug}" class="btn-view-details">View Details</a>`;
    return `
      <div class="product-card" data-brand="${p.brand}" data-price="${p.price}" data-storage="${p.storage}" data-availability="${p.availability}" data-purchasable="${p.isPurchasable}">
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

  res.status(200).type('text/html').send(renderPage(categoryLabel + ' - Vodacom Shop', body));
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

// ─── Product detail page data ─────────────────────────────────────────────────

interface ProductDetail {
  slug: string;
  name: string;
  price: number;
  monthlyFrom: number;
  badges: string[];
  availability: 'In Stock' | 'Pre-Order';
  isPurchasable: boolean;
  colors: Array<{ name: string; price: number }>;
  storages: Array<{ name: string; price: number }>;
  specs: Array<{ label: string; value: string }>;
  esimCompatible: boolean;
}

const PRODUCT_DETAIL_MAP: Record<string, ProductDetail> = {
  'iphone-15-pro': {
    slug: 'iphone-15-pro',
    name: 'iPhone 15 Pro 256GB',
    price: 24999,
    monthlyFrom: 899,
    badges: ['5G', 'Trade-In Eligible', 'In Stock'],
    availability: 'In Stock',
    isPurchasable: true,
    colors: [
      { name: 'Natural Titanium', price: 24999 },
      { name: 'Blue Titanium', price: 24999 },
      { name: 'White Titanium', price: 24999 },
      { name: 'Black Titanium', price: 24999 },
    ],
    storages: [
      { name: '128GB', price: 21999 },
      { name: '256GB', price: 24999 },
      { name: '512GB', price: 28999 },
      { name: '1TB', price: 34999 },
    ],
    specs: [
      { label: 'Display', value: '6.1-inch Super Retina XDR display' },
      { label: 'Processor', value: 'A17 Pro chip with 6-core CPU' },
      { label: 'Camera', value: '48MP Main + 12MP Ultra Wide + 12MP Telephoto' },
      { label: 'Storage', value: '256GB' },
      { label: 'Battery', value: 'Up to 23 hours video playback' },
      { label: 'Connectivity', value: '5G, Wi-Fi 6E, Bluetooth 5.3' },
      { label: 'SIM', value: 'Dual SIM (nano-SIM and eSIM)' },
      { label: 'Operating System', value: 'iOS 17' },
    ],
    esimCompatible: true,
  },
  'iphone-15': {
    slug: 'iphone-15',
    name: 'iPhone 15 128GB',
    price: 18999,
    monthlyFrom: 699,
    badges: ['5G', 'Trade-In Eligible', 'In Stock'],
    availability: 'In Stock',
    isPurchasable: true,
    colors: [
      { name: 'Pink', price: 18999 },
      { name: 'Yellow', price: 18999 },
      { name: 'Blue', price: 18999 },
      { name: 'Black', price: 18999 },
    ],
    storages: [
      { name: '128GB', price: 18999 },
      { name: '256GB', price: 21999 },
      { name: '512GB', price: 25999 },
    ],
    specs: [
      { label: 'Display', value: '6.1-inch Super Retina XDR display' },
      { label: 'Processor', value: 'A16 Bionic chip' },
      { label: 'Camera', value: '48MP Main + 12MP Ultra Wide' },
      { label: 'Storage', value: '128GB' },
      { label: 'Battery', value: 'Up to 20 hours video playback' },
      { label: 'Connectivity', value: '5G, Wi-Fi 6, Bluetooth 5.3' },
      { label: 'SIM', value: 'Dual SIM (nano-SIM and eSIM)' },
      { label: 'Operating System', value: 'iOS 17' },
    ],
    esimCompatible: true,
  },
  'iphone-14': {
    slug: 'iphone-14',
    name: 'iPhone 14 128GB',
    price: 15999,
    monthlyFrom: 579,
    badges: ['5G', 'Trade-In Eligible', 'In Stock'],
    availability: 'In Stock',
    isPurchasable: false,
    colors: [
      { name: 'Midnight', price: 15999 },
      { name: 'Starlight', price: 15999 },
      { name: 'Red', price: 15999 },
      { name: 'Blue', price: 15999 },
    ],
    storages: [
      { name: '128GB', price: 15999 },
      { name: '256GB', price: 18999 },
      { name: '512GB', price: 22999 },
    ],
    specs: [
      { label: 'Display', value: '6.1-inch Super Retina XDR display' },
      { label: 'Processor', value: 'A15 Bionic chip' },
      { label: 'Camera', value: '12MP Main + 12MP Ultra Wide' },
      { label: 'Storage', value: '128GB' },
      { label: 'Battery', value: 'Up to 20 hours video playback' },
      { label: 'Connectivity', value: '5G, Wi-Fi 6, Bluetooth 5.3' },
      { label: 'SIM', value: 'Dual SIM (nano-SIM and eSIM)' },
      { label: 'Operating System', value: 'iOS 16' },
    ],
    esimCompatible: true,
  },
  'samsung-s24-ultra': {
    slug: 'samsung-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra 256GB',
    price: 22999,
    monthlyFrom: 799,
    badges: ['5G', 'In Stock'],
    availability: 'In Stock',
    isPurchasable: true,
    colors: [
      { name: 'Titanium Black', price: 22999 },
      { name: 'Titanium Gray', price: 22999 },
      { name: 'Titanium Violet', price: 22999 },
      { name: 'Titanium Yellow', price: 22999 },
    ],
    storages: [
      { name: '256GB', price: 22999 },
      { name: '512GB', price: 26999 },
    ],
    specs: [
      { label: 'Display', value: '6.8-inch Dynamic AMOLED 2X' },
      { label: 'Processor', value: 'Snapdragon 8 Gen 3' },
      { label: 'Camera', value: '200MP Main + 12MP Ultra Wide + 10MP Telephoto' },
      { label: 'Storage', value: '256GB' },
      { label: 'Battery', value: '5000mAh' },
      { label: 'Connectivity', value: '5G, Wi-Fi 7, Bluetooth 5.3' },
      { label: 'SIM', value: 'Dual SIM (nano-SIM and eSIM)' },
      { label: 'Operating System', value: 'Android 14' },
    ],
    esimCompatible: false,
  },
  'samsung-s24': {
    slug: 'samsung-s24',
    name: 'Samsung Galaxy S24 256GB',
    price: 16999,
    monthlyFrom: 599,
    badges: ['5G', 'In Stock'],
    availability: 'In Stock',
    isPurchasable: true,
    colors: [
      { name: 'Cobalt Violet', price: 16999 },
      { name: 'Marble Gray', price: 16999 },
      { name: 'Onyx Black', price: 16999 },
      { name: 'Jade Green', price: 16999 },
    ],
    storages: [
      { name: '128GB', price: 14999 },
      { name: '256GB', price: 16999 },
    ],
    specs: [
      { label: 'Display', value: '6.2-inch Dynamic AMOLED 2X' },
      { label: 'Processor', value: 'Snapdragon 8 Gen 3' },
      { label: 'Camera', value: '50MP Main + 12MP Ultra Wide + 10MP Telephoto' },
      { label: 'Storage', value: '256GB' },
      { label: 'Battery', value: '4000mAh' },
      { label: 'Connectivity', value: '5G, Wi-Fi 7, Bluetooth 5.3' },
      { label: 'SIM', value: 'Dual SIM (nano-SIM and eSIM)' },
      { label: 'Operating System', value: 'Android 14' },
    ],
    esimCompatible: false,
  },
  'samsung-a54': {
    slug: 'samsung-a54',
    name: 'Samsung Galaxy A54 128GB',
    price: 8999,
    monthlyFrom: 349,
    badges: ['5G', 'In Stock'],
    availability: 'In Stock',
    isPurchasable: true,
    colors: [
      { name: 'Awesome White', price: 8999 },
      { name: 'Awesome Black', price: 8999 },
      { name: 'Awesome Violet', price: 8999 },
      { name: 'Awesome Lime', price: 8999 },
    ],
    storages: [
      { name: '128GB', price: 8999 },
      { name: '256GB', price: 10999 },
    ],
    specs: [
      { label: 'Display', value: '6.4-inch Super AMOLED' },
      { label: 'Processor', value: 'Exynos 1380' },
      { label: 'Camera', value: '50MP Main + 12MP Ultra Wide + 5MP Macro' },
      { label: 'Storage', value: '128GB' },
      { label: 'Battery', value: '5000mAh' },
      { label: 'Connectivity', value: '5G, Wi-Fi 6, Bluetooth 5.3' },
      { label: 'SIM', value: 'Dual SIM (nano-SIM)' },
      { label: 'Operating System', value: 'Android 13' },
    ],
    esimCompatible: false,
  },
};

const ACCESSORIES_DISPLAY = [
  { name: 'AirPods Pro (2nd Gen)', price: 4999 },
  { name: 'iPhone 15 Pro Case', price: 799 },
  { name: '20W USB-C Power Adapter', price: 399 },
  { name: 'Screen Protector', price: 299 },
];

// ─── Product detail page (Screen 7: wireframe_product_detail.html) ────────────

catalogRouter.get('/product/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;
  const context = (req.query['context'] as string) ?? '';
  const upsellOffers = context ? getUpsellOffersByContext(context) : [];
  const upsellPanel = renderUpsellPanel(upsellOffers);
  const product = PRODUCT_DETAIL_MAP[slug];
  if (!product) {
    res.status(404).type('text/html').send(renderPage('Not Found - Vodacom Shop', '<h1>Product not found</h1>'));
    return;
  }

  function fmtPrice(n: number): string {
    return 'R ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  const badges = product.badges.map(b => `<span class="badge">${b}</span>`).join('\n      ');

  const colorButtons = product.colors.map(c =>
    `<button class="btn-color-selector" data-color="${c.name}" data-price="${c.price}">${c.name}</button>`
  ).join('\n        ');

  const storageButtons = product.storages.map(s =>
    `<button class="btn-storage-selector" data-storage="${s.name}" data-price="${s.price}">${s.name}</button>`
  ).join('\n        ');

  const addToCartBtn = product.isPurchasable
    ? `<button class="btn-add-to-cart" id="main-add-to-cart">Add to Cart</button>`
    : `<button class="btn-add-to-cart" id="main-add-to-cart" disabled>Add to Cart</button>`;

  const esimNote = product.esimCompatible
    ? `<p class="esim-note">This device supports eSIM and is compatible with Vodacom 5G network</p>`
    : `<p class="esim-note">This device is compatible with Vodacom 5G network</p>`;

  const marketCode = (req.query['market'] as string) ?? 'ZA';
  const marketPlans = getPlansForMarket(marketCode);
  const planCards = marketPlans.map(p => `
      <div class="plan-card" data-plan-id="${p.productId}">
        <h4>${p.name}</h4>
        <p>${p.description}</p>
        <p class="plan-price">${fmtPrice(p.priceRecurring).replace(/\.00$/, '')}/month</p>
        <button class="btn-select-plan" data-plan-id="${p.productId}">Select Plan</button>
      </div>`).join('\n');

  const specRows = product.specs.map(s =>
    `<dt>${s.label}</dt><dd>${s.value}</dd>`
  ).join('\n        ');

  const accessoryCards = ACCESSORIES_DISPLAY.map(a => `
      <div class="accessory-card">
        <h4>${a.name}</h4>
        <p class="product-price">${fmtStorefrontPrice(a.price)}</p>
        <button class="btn-add-to-cart" data-accessory="${a.name}">Add to Cart</button>
      </div>`).join('\n');

  const body = `
  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/catalog">Devices</a> &rsaquo;
    <a href="/catalog?category=smartphones">Smartphones</a> &rsaquo;
    <span>${product.name}</span>
  </nav>

  <section class="product-hero">
    <img src="/images/products/${product.slug}.jpg" alt="${product.name}" class="product-primary-image">
    <h1>${product.name}</h1>
    <div class="product-badges">
      ${badges}
    </div>
    <p class="product-price" id="hero-price">${fmtPrice(product.price)}</p>
    <p class="product-instalment">or from R ${product.monthlyFrom}/month with a plan</p>

    <div class="color-selector">
      <span>Color</span>
      ${colorButtons}
    </div>

    <div class="storage-selector">
      <span>Storage</span>
      ${storageButtons}
    </div>

    <div class="quantity-selector">
      <label for="quantity">Quantity</label>
      <input type="number" id="quantity" value="1" min="1">
    </div>

    ${addToCartBtn}
    ${esimNote}
  </section>

  <section class="plan-attach-panel">
    <h2>Add a plan or bundle</h2>
    ${upsellPanel}
    <div class="base-plan-list">
      ${planCards}
    </div>
  </section>

  <section class="product-details">
    <div class="tabs">
      <button class="tab-btn active" data-tab="specs">Specifications</button>
      <button class="tab-btn" data-tab="features">Features</button>
      <button class="tab-btn" data-tab="box">What's in the Box</button>
    </div>
    <div class="tab-panel" id="tab-specs">
      <dl class="spec-list">
        ${specRows}
      </dl>
    </div>
    <div class="tab-panel" id="tab-features" hidden>
      <ul class="features-list">
        <li>Dynamic Island</li>
        <li>Always-On display</li>
        <li>Action Button</li>
        <li>Titanium design</li>
        <li>USB 3 speeds with USB-C</li>
      </ul>
    </div>
    <div class="tab-panel" id="tab-box" hidden>
      <ul class="inbox-list">
        <li>iPhone with iOS 17</li>
        <li>USB-C Charge Cable (1 m)</li>
        <li>Documentation</li>
      </ul>
    </div>
  </section>

  <section class="recommendations">
    <h2>Complete your purchase</h2>
    <div class="recommendation-row">
      ${accessoryCards}
    </div>
  </section>

  <script>
    (function () {
      var priceEl = document.getElementById('hero-price');
      function updatePrice(price) {
        priceEl.textContent = 'R ' + price.toFixed(2).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
      }
      document.querySelectorAll('.btn-storage-selector').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var price = parseInt(btn.getAttribute('data-price') || '0', 10);
          updatePrice(price);
          document.querySelectorAll('.btn-storage-selector').forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
        });
      });
      document.querySelectorAll('.btn-color-selector').forEach(function (btn) {
        btn.addEventListener('click', function () {
          document.querySelectorAll('.btn-color-selector').forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
        });
      });
      document.querySelectorAll('.tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
          document.querySelectorAll('.tab-panel').forEach(function (p) { p.hidden = true; });
          btn.classList.add('active');
          var panel = document.getElementById('tab-' + btn.getAttribute('data-tab'));
          if (panel) panel.hidden = false;
        });
      });
    })();
  </script>`;

  res.status(200).type('text/html').send(renderPage(product.name + ' - Vodacom Shop', body));
});
