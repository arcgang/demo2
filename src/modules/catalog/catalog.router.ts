import { Router, Request, Response } from 'express';
import { getUpsellOffersByContext } from './offers/upsell-offers.service';
import { PrepaidUpsellOffer } from './offers/prepaid-upsell-offer.model';

export const catalogRouter = Router();

// ── Product data ──────────────────────────────────────────────────────────────

interface PlanData {
  id: string;
  name: string;
  dataLabel: string;
  price: number;
}

interface AccessoryItem {
  name: string;
  price: number;
}

interface ListingProduct {
  slug: string;
  name: string;
  price: number;
  monthlyFrom: number;
  badges: string[];
  availability: string;
}

interface DeviceProduct {
  type: 'DEVICE';
  name: string;
  price: number;
  monthlyFrom: number;
  availability: string;
  badges: string[];
  colors: string[];
  storageOptions: string[];
  esim: boolean;
  fiveG: boolean;
  financingEligible: boolean;
  plans: PlanData[];
  accessories: AccessoryItem[];
  specs: Record<string, string>;
}

interface SimEsimProduct {
  type: 'SIM' | 'ESIM';
  name: string;
  price: number;
  availability: string;
  badges: string[];
  activationRequirements: string[];
}

interface AccessoryProduct {
  type: 'ACCESSORY';
  name: string;
  price: number;
  availability: string;
  badges: string[];
  compatibility: string;
}

type ProductDetail = DeviceProduct | SimEsimProduct | AccessoryProduct;

const ZA_PLANS: PlanData[] = [
  { id: 'plan_red_5gb', name: 'Vodacom Red 5GB', dataLabel: '5GB Data', price: 299 },
  { id: 'plan_unlimited_20gb', name: 'Vodacom Unlimited 20GB', dataLabel: '20GB Data', price: 799 },
  { id: 'plan_red_premium', name: 'Vodacom Red Premium', dataLabel: '50GB Data', price: 1299 },
];

const DEVICE_ACCESSORIES: AccessoryItem[] = [
  { name: 'AirPods Pro (2nd Gen)', price: 4999 },
  { name: 'iPhone 15 Pro Case', price: 799 },
  { name: '20W USB-C Power Adapter', price: 399 },
  { name: 'Screen Protector', price: 299 },
];

const PRODUCT_CATALOG: Record<string, ProductDetail> = {
  'iphone-15-pro': {
    type: 'DEVICE',
    name: 'iPhone 15 Pro 256GB',
    price: 24999,
    monthlyFrom: 299,
    availability: 'In Stock',
    badges: ['5G', 'Trade-In Eligible'],
    colors: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'],
    storageOptions: ['128GB', '256GB', '512GB', '1TB'],
    esim: true,
    fiveG: true,
    financingEligible: true,
    plans: ZA_PLANS,
    accessories: DEVICE_ACCESSORIES,
    specs: {
      'Display': '6.1-inch Super Retina XDR display',
      'Processor': 'A17 Pro chip with 6-core CPU',
      'Camera': '48MP Main + 12MP Ultra Wide + 12MP Telephoto',
      'Storage': '256GB',
      'Battery': 'Up to 23 hours video playback',
      'Connectivity': '5G, Wi-Fi 6E, Bluetooth 5.3',
      'SIM': 'Dual SIM (nano-SIM and eSIM)',
      'Operating System': 'iOS 17',
    },
  },
  'samsung-s24-ultra': {
    type: 'DEVICE',
    name: 'Samsung Galaxy S24 Ultra 256GB',
    price: 22999,
    monthlyFrom: 299,
    availability: 'In Stock',
    badges: ['5G'],
    colors: ['Titanium Black', 'Titanium Gray', 'Titanium Violet', 'Titanium Yellow'],
    storageOptions: ['256GB', '512GB', '1TB'],
    esim: true,
    fiveG: true,
    financingEligible: true,
    plans: ZA_PLANS,
    accessories: DEVICE_ACCESSORIES,
    specs: {
      'Display': '6.8-inch Dynamic AMOLED 2X display',
      'Processor': 'Snapdragon 8 Gen 3',
      'Camera': '200MP Main + 12MP Ultra Wide + 50MP Telephoto',
      'Storage': '256GB',
      'Battery': 'Up to 27 hours video playback',
      'Connectivity': '5G, Wi-Fi 7, Bluetooth 5.3',
      'SIM': 'Dual SIM (nano-SIM and eSIM)',
      'Operating System': 'Android 14',
    },
  },
  'iphone-15': {
    type: 'DEVICE',
    name: 'iPhone 15 128GB',
    price: 18999,
    monthlyFrom: 299,
    availability: 'In Stock',
    badges: ['5G', 'Trade-In Eligible'],
    colors: ['Black', 'Blue', 'Green', 'Yellow', 'Pink'],
    storageOptions: ['128GB', '256GB', '512GB'],
    esim: true,
    fiveG: true,
    financingEligible: true,
    plans: ZA_PLANS,
    accessories: DEVICE_ACCESSORIES,
    specs: {
      'Display': '6.1-inch Super Retina XDR display',
      'Processor': 'A16 Bionic chip',
      'Camera': '48MP Main + 12MP Ultra Wide',
      'Storage': '128GB',
      'Battery': 'Up to 20 hours video playback',
      'Connectivity': '5G, Wi-Fi 6, Bluetooth 5.3',
      'SIM': 'Dual SIM (nano-SIM and eSIM)',
      'Operating System': 'iOS 17',
    },
  },
  'samsung-s24': {
    type: 'DEVICE',
    name: 'Samsung Galaxy S24 256GB',
    price: 16999,
    monthlyFrom: 299,
    availability: 'In Stock',
    badges: ['5G'],
    colors: ['Onyx Black', 'Marble Gray', 'Cobalt Violet', 'Amber Yellow'],
    storageOptions: ['128GB', '256GB'],
    esim: true,
    fiveG: true,
    financingEligible: true,
    plans: ZA_PLANS,
    accessories: DEVICE_ACCESSORIES,
    specs: {
      'Display': '6.2-inch Dynamic AMOLED 2X display',
      'Processor': 'Snapdragon 8 Gen 3',
      'Camera': '50MP Main + 12MP Ultra Wide + 10MP Telephoto',
      'Storage': '256GB',
      'Battery': 'Up to 23 hours video playback',
      'Connectivity': '5G, Wi-Fi 7, Bluetooth 5.3',
      'SIM': 'Dual SIM (nano-SIM and eSIM)',
      'Operating System': 'Android 14',
    },
  },
  'samsung-a54': {
    type: 'DEVICE',
    name: 'Samsung Galaxy A54 128GB',
    price: 8999,
    monthlyFrom: 299,
    availability: 'In Stock',
    badges: ['5G'],
    colors: ['Awesome Black', 'Awesome White', 'Awesome Violet', 'Awesome Lime'],
    storageOptions: ['128GB', '256GB'],
    esim: false,
    fiveG: true,
    financingEligible: true,
    plans: ZA_PLANS,
    accessories: DEVICE_ACCESSORIES,
    specs: {
      'Display': '6.4-inch Super AMOLED display',
      'Processor': 'Exynos 1380',
      'Camera': '50MP Main + 12MP Ultra Wide + 5MP Macro',
      'Storage': '128GB',
      'Battery': 'Up to 24 hours video playback',
      'Connectivity': '5G, Wi-Fi 6, Bluetooth 5.3',
      'SIM': 'Dual SIM (nano-SIM)',
      'Operating System': 'Android 14',
    },
  },
  'iphone-14': {
    type: 'DEVICE',
    name: 'iPhone 14 128GB',
    price: 15999,
    monthlyFrom: 299,
    availability: 'In Stock',
    badges: ['5G', 'Trade-In Eligible'],
    colors: ['Midnight', 'Starlight', 'Blue', 'Purple', 'Product Red'],
    storageOptions: ['128GB', '256GB', '512GB'],
    esim: true,
    fiveG: true,
    financingEligible: true,
    plans: ZA_PLANS,
    accessories: DEVICE_ACCESSORIES,
    specs: {
      'Display': '6.1-inch Super Retina XDR display',
      'Processor': 'A15 Bionic chip',
      'Camera': '12MP Main + 12MP Ultra Wide',
      'Storage': '128GB',
      'Battery': 'Up to 20 hours video playback',
      'Connectivity': '5G, Wi-Fi 6, Bluetooth 5.3',
      'SIM': 'Dual SIM (nano-SIM and eSIM)',
      'Operating System': 'iOS 17',
    },
  },
  'sim-vodacom-esim': {
    type: 'ESIM',
    name: 'Vodacom eSIM',
    price: 0,
    availability: 'In Stock',
    badges: ['eSIM'],
    activationRequirements: [
      'Provide a valid South African ID or passport',
      'Complete RICA registration',
      'Verify your residential address',
    ],
  },
  'iphone-15-pro-case': {
    type: 'ACCESSORY',
    name: 'iPhone 15 Pro Silicone Case',
    price: 799,
    availability: 'In Stock',
    badges: [],
    compatibility: 'iPhone 15 series',
  },
};

const SMARTPHONES: ListingProduct[] = [
  { slug: 'iphone-15-pro', name: 'iPhone 15 Pro 256GB', price: 24999, monthlyFrom: 299, badges: ['5G', 'Trade-In'], availability: 'In Stock' },
  { slug: 'samsung-s24-ultra', name: 'Samsung Galaxy S24 Ultra 256GB', price: 22999, monthlyFrom: 799, badges: ['5G'], availability: 'In Stock' },
  { slug: 'iphone-15', name: 'iPhone 15 128GB', price: 18999, monthlyFrom: 699, badges: ['5G', 'Trade-In'], availability: 'In Stock' },
  { slug: 'samsung-s24', name: 'Samsung Galaxy S24 256GB', price: 16999, monthlyFrom: 599, badges: ['5G'], availability: 'In Stock' },
  { slug: 'samsung-a54', name: 'Samsung Galaxy A54 128GB', price: 8999, monthlyFrom: 349, badges: ['5G'], availability: 'In Stock' },
  { slug: 'iphone-14', name: 'iPhone 14 128GB', price: 15999, monthlyFrom: 579, badges: ['5G', 'Trade-In'], availability: 'In Stock' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(amount: number): string {
  return `R ${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function isLiteMode(req: Request): boolean {
  return req.query.lite === 'true' || req.headers['save-data'] === 'on';
}

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

function renderSiteHeader(): string {
  return `
  <header class="header">
    <a href="/">Vodacom</a>
    <nav>
      <a href="/catalog">Devices</a>
      <a href="/plans">Plans</a>
      <a href="/accessories">Accessories</a>
      <a href="/support">Support</a>
    </nav>
  </header>`;
}

// ── Product listing page ──────────────────────────────────────────────────────

catalogRouter.get('/catalog', (req: Request, res: Response) => {
  const category = (req.query.category as string) ?? '';
  const lite = isLiteMode(req);

  const products = category === 'smartphones' ? SMARTPHONES : [];

  const categoryLabel =
    category === 'smartphones' ? 'Smartphones'
    : category === 'accessories' ? 'Accessories'
    : category === 'tablets' ? 'Tablets'
    : 'Devices';

  const liteModeBanner = lite
    ? `<div class="lite-mode-banner lite-mode" role="status"><strong>Lite Mode Active</strong> — Optimized for faster browsing</div>`
    : '';

  const productCards = products.map(p => {
    const badgeHtml = p.badges
      .map(b => `<span class="badge">${b}</span>`)
      .join(' ');
    return `
    <article class="product-card" data-slug="${p.slug}">
      <div class="product-card-badges">${badgeHtml}</div>
      <span class="availability">${p.availability}</span>
      <h3><a href="/product/${p.slug}">${p.name}</a></h3>
      <p class="product-price">${formatPrice(p.price)}</p>
      <p class="financing-hint">or from R ${p.monthlyFrom}/month</p>
      <a href="/product/${p.slug}" class="btn-view-details">View Details</a>
    </article>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${categoryLabel} - Vodacom Shop</title>
  <style>
    :focus { outline: 2px solid #e40000; outline-offset: 2px; }
  </style>
</head>
<body>
  ${renderSiteHeader()}

  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/catalog">Devices</a> &rsaquo;
    ${categoryLabel}
  </nav>

  <div class="catalog-layout">
    <aside class="filter-sidebar">
      <fieldset>
        <legend>Brand</legend>
        <label for="brand-apple"><input type="checkbox" name="brand-apple" id="brand-apple" checked> Apple</label>
        <label for="brand-samsung"><input type="checkbox" name="brand-samsung" id="brand-samsung" checked> Samsung</label>
        <label for="brand-huawei"><input type="checkbox" name="brand-huawei" id="brand-huawei"> Huawei</label>
        <label for="brand-xiaomi"><input type="checkbox" name="brand-xiaomi" id="brand-xiaomi"> Xiaomi</label>
      </fieldset>

      <fieldset>
        <legend>Price Range</legend>
        <label for="price-1"><input type="checkbox" name="price-1" id="price-1"> Under R 5,000</label>
        <label for="price-2"><input type="checkbox" name="price-2" id="price-2" checked> R 5,000 - R 15,000</label>
        <label for="price-3"><input type="checkbox" name="price-3" id="price-3" checked> R 15,000 - R 25,000</label>
        <label for="price-4"><input type="checkbox" name="price-4" id="price-4"> Over R 25,000</label>
      </fieldset>

      <fieldset>
        <legend>Storage</legend>
        <label for="storage-128"><input type="checkbox" name="storage-128" id="storage-128"> 128GB</label>
        <label for="storage-256"><input type="checkbox" name="storage-256" id="storage-256" checked> 256GB</label>
        <label for="storage-512"><input type="checkbox" name="storage-512" id="storage-512"> 512GB</label>
      </fieldset>

      <fieldset>
        <legend>Availability</legend>
        <label for="avail-stock"><input type="checkbox" name="avail-stock" id="avail-stock" checked> In Stock</label>
        <label for="avail-preorder"><input type="checkbox" name="avail-preorder" id="avail-preorder"> Pre-Order</label>
      </fieldset>
    </aside>

    <main class="product-listing">
      <h1>${categoryLabel}</h1>
      ${liteModeBanner}

      <div class="product-grid">
        ${productCards}
      </div>

      <nav class="pagination" aria-label="Page navigation">
        <a href="#">1</a>
        <a href="#">2</a>
        <a href="#">3</a>
        <a href="#">Next</a>
      </nav>
    </main>
  </div>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});

// ── Bundle configuration page ─────────────────────────────────────────────────

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

// ── Product detail renderers ───────────────────────────────────────────────────

function renderDeviceDetail(slug: string, product: DeviceProduct, upsellPanel: string): string {
  const allBadges = [...product.badges];
  if (product.esim && !allBadges.includes('eSIM-compatible')) {
    allBadges.push('eSIM-compatible');
  }
  const badgeHtml = allBadges
    .map(b => `<span class="badge">${b}</span>`)
    .join(' ');

  const colorButtons = product.colors
    .map(c => `<button type="button" aria-label="Color: ${c}">${c}</button>`)
    .join('\n        ');

  const storageButtons = product.storageOptions
    .map(s => `<button type="button" aria-label="Storage: ${s}">${s}</button>`)
    .join('\n        ');

  const planCards = product.plans.map(p => `
        <div class="plan-card" data-plan-id="${p.id}">
          <h4>${p.name}</h4>
          <p>${p.dataLabel} + Unlimited Calls &amp; SMS</p>
          <p class="plan-price">R ${p.price}/month</p>
          <button class="btn-select-plan">Select Plan</button>
        </div>`).join('\n');

  const accessoryCards = product.accessories.map(a => `
        <div class="accessory-card">
          <p class="accessory-name">${a.name}</p>
          <p class="accessory-price">${formatPrice(a.price)}</p>
          <button type="button" class="btn-add-to-cart-accessory">Add to Cart</button>
        </div>`).join('\n');

  const specRows = Object.entries(product.specs)
    .map(([key, val]) => `<tr><th scope="row">${key}</th><td>${val}</td></tr>`)
    .join('\n        ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${product.name} - Vodacom Shop</title>
  <style>
    :focus { outline: 2px solid #e40000; outline-offset: 2px; }
    .color-selector button:focus,
    .storage-selector button:focus { outline: 2px solid #e40000; }
  </style>
</head>
<body>
  ${renderSiteHeader()}

  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/catalog">Devices</a> &rsaquo;
    <a href="/catalog?category=smartphones">Smartphones</a> &rsaquo;
    ${product.name}
  </nav>

  <section class="product-hero">
    <h1>${product.name}</h1>
    <div class="product-badges">
      ${badgeHtml}
    </div>
    <span class="availability">${product.availability}</span>
    <p class="product-price">${formatPrice(product.price)}</p>
    ${product.financingEligible ? `<p class="financing-hint">or from R ${product.monthlyFrom}/month with a plan</p>` : ''}

    <div class="color-selector" role="group" aria-label="Color">
      <span>Color</span>
      ${colorButtons}
    </div>

    <div class="storage-selector" role="group" aria-label="Storage">
      <span>Storage</span>
      ${storageButtons}
    </div>

    <div class="quantity-selector">
      <label for="quantity-${slug}">Quantity</label>
      <input type="number" id="quantity-${slug}" name="quantity" value="1" min="1">
    </div>

    <button type="button" class="btn-add-to-cart">Add to Cart</button>
    ${(product.esim || product.fiveG) ? `<p class="compatibility-note">${[product.esim ? 'This device supports eSIM' : '', product.fiveG ? 'compatible with Vodacom 5G network' : ''].filter(Boolean).join(' and ')}</p>` : ''}
  </section>

  <section class="plan-attach-panel">
    <h2>Add a plan or bundle</h2>

    ${upsellPanel}

    <div class="plan-list">
      ${planCards}
    </div>
  </section>

  <section class="specifications">
    <h2>Specifications</h2>
    <table>
      <tbody>
        ${specRows}
      </tbody>
    </table>
  </section>

  <section class="recommendations">
    <h2>Complete your purchase</h2>
    <div class="accessory-grid">
      ${accessoryCards}
    </div>
  </section>
</body>
</html>`;
}

function renderSimEsimDetail(product: SimEsimProduct): string {
  const badgeHtml = product.badges
    .map(b => `<span class="badge">${b}</span>`)
    .join(' ');

  const activationSteps = product.activationRequirements.map((req, i) => `
        <li class="activation-step">
          <span class="step-number">${i + 1}</span>
          <span class="step-text">${req}</span>
        </li>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${product.name} - Vodacom Shop</title>
  <style>
    :focus { outline: 2px solid #e40000; outline-offset: 2px; }
  </style>
</head>
<body>
  ${renderSiteHeader()}

  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/catalog">Devices</a> &rsaquo;
    <a href="/catalog?category=sim-esim">SIM &amp; eSIM</a> &rsaquo;
    ${product.name}
  </nav>

  <section class="product-hero">
    <h1>${product.name}</h1>
    <div class="product-badges">
      ${badgeHtml}
    </div>
    <span class="availability">${product.availability}</span>
    ${product.price > 0 ? `<p class="product-price">${formatPrice(product.price)}</p>` : ''}

    <div class="quantity-selector">
      <label for="quantity-esim">Quantity</label>
      <input type="number" id="quantity-esim" name="quantity" value="1" min="1">
    </div>

    <button type="button" class="btn-add-to-cart">Add to Cart</button>
  </section>

  <section class="onboarding-implications">
    <h2>Getting Started with Your eSIM</h2>
    <p class="verification-required"><strong>Identity verification required</strong></p>
    <p>To activate your eSIM, please complete the following steps:</p>
    <ol class="activation-requirements-list">
      ${activationSteps}
    </ol>
  </section>
</body>
</html>`;
}

function renderAccessoryDetail(slug: string, product: AccessoryProduct): string {
  const badgeHtml = product.badges
    .map(b => `<span class="badge">${b}</span>`)
    .join(' ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${product.name} - Vodacom Shop</title>
  <style>
    :focus { outline: 2px solid #e40000; outline-offset: 2px; }
  </style>
</head>
<body>
  ${renderSiteHeader()}

  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/catalog">Devices</a> &rsaquo;
    <a href="/catalog?category=accessories">Accessories</a> &rsaquo;
    ${product.name}
  </nav>

  <section class="product-hero">
    <h1>${product.name}</h1>
    ${badgeHtml ? `<div class="product-badges">${badgeHtml}</div>` : ''}
    <span class="availability">${product.availability}</span>
    <p class="product-price">${formatPrice(product.price)}</p>

    <div class="quantity-selector">
      <label for="quantity-${slug}">Quantity</label>
      <input type="number" id="quantity-${slug}" name="quantity" value="1" min="1">
    </div>

    <button type="button" class="btn-add-to-cart">Add to Cart</button>
  </section>

  ${product.compatibility ? `<div class="compatibility-cues">
    <p>Compatible with: ${product.compatibility}</p>
  </div>` : ''}
</body>
</html>`;
}

// ── Product detail page ───────────────────────────────────────────────────────

catalogRouter.get('/product/:id', (req: Request, res: Response) => {
  const slug = req.params.id;
  const context = (req.query['context'] as string) ?? '';
  const offers = context ? getUpsellOffersByContext(context) : [];
  const upsellPanel = renderUpsellPanel(offers);

  const product = PRODUCT_CATALOG[slug];

  if (product) {
    if (product.type === 'DEVICE') {
      res.status(200).type('text/html').send(renderDeviceDetail(slug, product, upsellPanel));
    } else if (product.type === 'SIM' || product.type === 'ESIM') {
      res.status(200).type('text/html').send(renderSimEsimDetail(product));
    } else if (product.type === 'ACCESSORY') {
      res.status(200).type('text/html').send(renderAccessoryDetail(slug, product));
    } else {
      res.status(404).type('text/html').send('<html><body><h1>Product not found</h1></body></html>');
    }
    return;
  }

  res.status(404).type('text/html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Product Not Found - Vodacom Shop</title>
</head>
<body>
  ${renderSiteHeader()}
  <main>
    <h1>Product Not Found</h1>
    <p>The product you are looking for does not exist.</p>
    <a href="/catalog">Browse all devices</a>
  </main>
</body>
</html>`);
});
