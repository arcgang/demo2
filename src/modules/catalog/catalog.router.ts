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
  const productId = req.params['id'] as string;
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

  <div id="restore-notice" class="restore-notice" style="display:none;" role="alert">
    Your selections were restored
    <button id="restore-notice-dismiss" aria-label="dismiss" type="button">&times;</button>
  </div>

  <main>
    <h1>Configure Your Bundle</h1>
    <h3>iPhone 15 Pro 256GB</h3>
    <p>Natural Titanium &mdash; R 24,999.00</p>
    <p>This plan is compatible with your device</p>

    <section class="plan-selection">
      <h2>Select a Plan</h2>

      ${upsellPanel}

      <div class="base-plan-list">
        <label class="plan-card">
          <input type="radio" name="plan" value="plan_red_5gb" data-plan-id="plan_red_5gb">
          <strong>Vodacom Red 5GB</strong>
          <span>5GB Data + Unlimited Calls &amp; SMS</span>
          <span class="plan-price">R 299/month</span>
        </label>
        <label class="plan-card">
          <input type="radio" name="plan" value="plan_unlimited_20gb" data-plan-id="plan_unlimited_20gb" checked>
          <strong>Vodacom Unlimited 20GB</strong>
          <span>20GB Data + Unlimited Calls &amp; SMS</span>
          <span class="plan-price">R 799/month</span>
        </label>
        <label class="plan-card">
          <input type="radio" name="plan" value="plan_red_premium" data-plan-id="plan_red_premium">
          <strong>Vodacom Red Premium</strong>
          <span>50GB Data + Unlimited Calls &amp; SMS</span>
          <span class="plan-price">R 1,299/month</span>
        </label>
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

  <script>
  (function() {
    var DRAFT_KEY = 'draft:bundle:${productId}';
    var EXPIRY_MS = 30 * 60 * 1000;

    function saveDraft() {
      var planInput = document.querySelector('input[name="plan"]:checked');
      var addons = {};
      document.querySelectorAll('input[name^="addon-"]').forEach(function(el) {
        addons[el.name] = el.checked;
      });
      var payload = {
        plan: planInput ? planInput.value : null,
        addons: addons,
        timestamp: Date.now()
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    }

    function restoreDraft() {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      var draft;
      try { draft = JSON.parse(raw); } catch(e) { return; }
      if (!draft || !draft.timestamp || Date.now() - draft.timestamp > EXPIRY_MS) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      if (draft.plan) {
        var radio = document.querySelector('input[name="plan"][value="' + draft.plan + '"]');
        if (radio) radio.checked = true;
      }
      if (draft.addons) {
        Object.keys(draft.addons).forEach(function(name) {
          var el = document.querySelector('input[name="' + name + '"]');
          if (el) el.checked = draft.addons[name];
        });
      }
      var notice = document.getElementById('restore-notice');
      if (notice) notice.style.display = 'block';
    }

    document.addEventListener('change', saveDraft);
    window.addEventListener('online', restoreDraft);
    document.addEventListener('visibilitychange', restoreDraft);

    var dismissBtn = document.getElementById('restore-notice-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', function() {
        var notice = document.getElementById('restore-notice');
        if (notice) notice.style.display = 'none';
      });
    }

    restoreDraft();
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

catalogRouter.get('/cart', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Your Cart - Vodacom Shop</title>
</head>
<body>
  <header class="header">
    <a href="/">Vodacom Shop</a>
    <nav class="nav-main">
      <a href="/catalog">Devices</a>
      <a href="/plans">Plans</a>
      <a href="/accessories">Accessories</a>
      <a href="/support">Support</a>
    </nav>
  </header>

  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo; Cart
  </nav>

  <div id="restore-notice" class="restore-notice" style="display:none;" role="alert">
    Your selections were restored
    <button id="restore-notice-dismiss" aria-label="dismiss" type="button">&times;</button>
  </div>

  <main class="main-content">
    <h1>Your Cart</h1>
    <p>3 items</p>

    <div class="cart-item" data-item-id="prod_za_iphone15_pro_256">
      <h3>iPhone 15 Pro</h3>
      <p>Natural Titanium, 256GB</p>
      <p>Unlimited 20GB Plan attached</p>
      <button aria-label="Decrease quantity" data-quantity="decrease">-</button>
      <input type="number" name="qty-iphone15pro" value="1" min="1">
      <button aria-label="Increase quantity" data-quantity="increase">+</button>
      <a href="#">Remove</a>
      <p>R 18,999</p>
      <p>+ R 799/month</p>
    </div>

    <div class="cart-item" data-item-id="prod_za_silicone_case">
      <h3>iPhone 15 Pro Silicone Case</h3>
      <p>Storm Blue</p>
      <button aria-label="Decrease quantity" data-quantity="decrease">-</button>
      <input type="number" name="qty-silicone-case" value="1" min="1">
      <button aria-label="Increase quantity" data-quantity="increase">+</button>
      <a href="#">Remove</a>
      <p>R 599</p>
    </div>

    <div class="cart-item" data-item-id="prod_za_usbc_adapter">
      <h3>20W USB-C Power Adapter</h3>
      <p>Fast charging compatible</p>
      <button aria-label="Decrease quantity" data-quantity="decrease">-</button>
      <input type="number" name="qty-usbc-adapter" value="1" min="1">
      <button aria-label="Increase quantity" data-quantity="increase">+</button>
      <a href="#">Remove</a>
      <p>R 399</p>
    </div>

    <div class="promo-code-section">
      <label for="promo-code">Promo code</label>
      <input id="promo-code" type="text" name="promo-code" placeholder="Promo code">
      <button type="button">Apply</button>
    </div>

    <button type="button">Proceed to Checkout</button>
    <a href="/catalog">Continue Shopping</a>
  </main>

  <aside class="summary-card">
    <h2>Order Summary</h2>
    <dl>
      <dt>Device</dt><dd>R 18,999.00</dd>
      <dt>Accessories</dt><dd>R 998.00</dd>
      <dt>Activation Fee</dt><dd>R 0.00</dd>
      <dt>Subtotal</dt><dd>R 19,997.00</dd>
      <dt>Unlimited 20GB Plan</dt><dd>R 799.00</dd>
      <dt>VAT (15%)</dt><dd>R 2,999.55</dd>
      <dt>Trade-In Credit</dt><dd>- R 2,500.00</dd>
      <dt>Total Once-Off</dt><dd>R 20,496.55</dd>
    </dl>
    <p>+ R 799.00/month</p>
    <p>Secure checkout with encrypted payment</p>
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
    <h4>Connect</h4>
    <a href="#">Facebook</a>
    <a href="#">Twitter</a>
    <p>&copy; 2026 Vodacom Group. All rights reserved.</p>
  </footer>

  <script>
  (function() {
    var DRAFT_KEY = 'draft:cart';
    var EXPIRY_MS = 30 * 60 * 1000;

    function saveDraft() {
      var promoInput = document.getElementById('promo-code');
      var items = [];
      document.querySelectorAll('.cart-item[data-item-id]').forEach(function(el) {
        var id = el.getAttribute('data-item-id');
        var qtyInput = el.querySelector('input[type="number"]');
        items.push({ id: id, qty: qtyInput ? qtyInput.value : 1 });
      });
      var payload = {
        promoCode: promoInput ? promoInput.value : '',
        items: items,
        timestamp: Date.now()
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    }

    function restoreDraft() {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      var draft;
      try { draft = JSON.parse(raw); } catch(e) { return; }
      if (!draft || !draft.timestamp || Date.now() - draft.timestamp > EXPIRY_MS) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      var promoInput = document.getElementById('promo-code');
      if (promoInput && draft.promoCode) promoInput.value = draft.promoCode;
      if (draft.items) {
        draft.items.forEach(function(item) {
          var el = document.querySelector('.cart-item[data-item-id="' + item.id + '"]');
          if (el) {
            var qtyInput = el.querySelector('input[type="number"]');
            if (qtyInput) qtyInput.value = item.qty;
          }
        });
      }
      var notice = document.getElementById('restore-notice');
      if (notice) notice.style.display = 'block';
    }

    document.addEventListener('change', saveDraft);
    window.addEventListener('online', restoreDraft);
    document.addEventListener('visibilitychange', restoreDraft);

    var dismissBtn = document.getElementById('restore-notice-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', function() {
        var notice = document.getElementById('restore-notice');
        if (notice) notice.style.display = 'none';
      });
    }

    restoreDraft();
  })();
  </script>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});

catalogRouter.get('/checkout', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Checkout - Vodacom Shop</title>
</head>
<body>
  <header class="header">
    <a href="/">Vodacom Shop</a>
    <nav class="breadcrumb">
      <span>1 Cart</span>
      <span>2 Checkout</span>
      <span>3 Confirmation</span>
    </nav>
  </header>

  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/cart">Cart</a> &rsaquo;
    Checkout
  </nav>

  <div id="restore-notice" class="restore-notice" style="display:none;" role="alert">
    Your selections were restored
    <button id="restore-notice-dismiss" aria-label="dismiss" type="button">&times;</button>
  </div>

  <main class="main-content">
    <h1>Checkout</h1>

    <section class="customer-details">
      <h2>1 Customer Details</h2>
      <form>
        <div>
          <label for="first-name">First Name</label>
          <input id="first-name" type="text" name="first-name" required>
        </div>
        <div>
          <label for="last-name">Last Name</label>
          <input id="last-name" type="text" name="last-name" required>
        </div>
        <div>
          <label for="email">Email Address</label>
          <input id="email" type="email" name="email" required>
        </div>
        <div>
          <label for="phone">Phone Number</label>
          <input id="phone" type="tel" name="phone" required>
        </div>
        <div>
          <label for="address">Street Address</label>
          <input id="address" type="text" name="address" required>
        </div>
        <div>
          <label for="city">City</label>
          <input id="city" type="text" name="city" required>
        </div>
        <div>
          <label for="postal-code">Postal Code</label>
          <input id="postal-code" type="text" name="postal-code" required>
        </div>
      </form>
    </section>

    <section class="payment-method">
      <h2>2 Payment Method</h2>
      <label>
        <input type="radio" name="payment-method" value="card" checked>
        Credit or Debit Card
        <span>Secure payment with tokenized card processing</span>
      </label>
      <label>
        <input type="radio" name="payment-method" value="mobile-money">
        Mobile Money
        <span>Pay with M-Pesa or Vodacom wallet</span>
      </label>

      <div class="card-details">
        <p>Your card details are encrypted and never stored</p>
        <div>
          <label for="card-number">Card Number</label>
          <input id="card-number" type="text" name="card-number" placeholder="1234 5678 9012 3456" required maxlength="19">
        </div>
        <div>
          <label for="expiry">Expiry Date</label>
          <input id="expiry" type="text" name="expiry" placeholder="MM/YY" required maxlength="5">
        </div>
        <div>
          <label for="cvv">CVV</label>
          <input id="cvv" type="text" name="cvv" placeholder="123" required maxlength="4">
        </div>
        <div>
          <label for="cardholder-name">Cardholder Name</label>
          <input id="cardholder-name" type="text" name="cardholder-name" placeholder="Name as it appears on card" required>
        </div>
      </div>
    </section>

    <section class="terms-consent">
      <h2>3 Terms &amp; Consent</h2>
      <label>
        <input id="terms" type="checkbox" name="terms" required>
        I agree to the <a href="#">Terms and Conditions</a> and <a href="#">Privacy Policy</a> (Required)
      </label>
      <label>
        <input id="marketing" type="checkbox" name="marketing">
        I consent to receiving marketing communications from Vodacom about products, services, and special offers (Optional)
      </label>
    </section>

    <button type="submit">Place Order</button>
  </main>

  <aside class="summary-card">
    <h3>Order Summary</h3>
    <dl>
      <dt>iPhone 15 Pro 256GB (Qty: 1)</dt><dd>R 18,999</dd>
      <dt>Silicone Case (Qty: 1)</dt><dd>R 599</dd>
      <dt>20W Power Adapter (Qty: 1)</dt><dd>R 399</dd>
      <dt>Once-Off Subtotal</dt><dd>R 19,997.00</dd>
      <dt>Monthly Plan</dt><dd>R 799.00</dd>
      <dt>VAT (15%)</dt><dd>R 2,999.55</dd>
      <dt>Trade-In Credit</dt><dd>- R 2,500.00</dd>
      <dt>Total Once-Off</dt><dd>R 20,496.55</dd>
    </dl>
    <p>+ R 799.00/month</p>
    <p>PCI-DSS &mdash; SSL Encrypted</p>
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

  <script>
  (function() {
    var DRAFT_KEY = 'draft:checkout';
    var EXPIRY_MS = 30 * 60 * 1000;
    var SAFE_FIELDS = ['first-name', 'last-name', 'email', 'phone', 'address', 'city', 'postal-code'];

    function saveDraft() {
      var payload = { timestamp: Date.now() };
      SAFE_FIELDS.forEach(function(name) {
        var el = document.querySelector('[name="' + name + '"]');
        if (el) payload[name] = el.value;
      });
      var pmRadio = document.querySelector('input[name="payment-method"]:checked');
      payload['payment-method'] = pmRadio ? pmRadio.value : null;
      // card-number, expiry, cvv are intentionally omitted (sensitive — excluded from draft)
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    }

    function restoreDraft() {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      var draft;
      try { draft = JSON.parse(raw); } catch(e) { return; }
      if (!draft || !draft.timestamp || Date.now() - draft.timestamp > EXPIRY_MS) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      SAFE_FIELDS.forEach(function(name) {
        var el = document.querySelector('[name="' + name + '"]');
        if (el && draft[name] != null) el.value = draft[name];
      });
      if (draft['payment-method']) {
        var radio = document.querySelector('input[name="payment-method"][value="' + draft['payment-method'] + '"]');
        if (radio) radio.checked = true;
      }
      // Clear sensitive card fields on restore — card-number, expiry, cvv must not be restored
      var cardNumberEl = document.getElementById('card-number');
      if (cardNumberEl) cardNumberEl.value = '';
      var expiryEl = document.getElementById('expiry');
      if (expiryEl) expiryEl.value = '';
      var cvvEl = document.getElementById('cvv');
      if (cvvEl) cvvEl.value = '';
      var notice = document.getElementById('restore-notice');
      if (notice) notice.style.display = 'block';
    }

    document.addEventListener('change', saveDraft);
    window.addEventListener('online', restoreDraft);
    document.addEventListener('visibilitychange', restoreDraft);

    var dismissBtn = document.getElementById('restore-notice-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', function() {
        var notice = document.getElementById('restore-notice');
        if (notice) notice.style.display = 'none';
      });
    }

    restoreDraft();
  })();
  </script>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});
