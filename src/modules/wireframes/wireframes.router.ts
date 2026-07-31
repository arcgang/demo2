import { Router, Request, Response } from 'express';

export const wireframesRouter = Router();

// ---------------------------------------------------------------------------
// Shared partials
// ---------------------------------------------------------------------------

function renderSiteHeader(cartCount = 0): string {
  return `
  <header class="header">
    <a href="/">Vodacom</a>
    <nav aria-label="Main navigation">
      <a href="/catalog">Devices</a>
      <a href="/plans">Plans</a>
      <a href="/accessories">Accessories</a>
      <a href="/support">Support</a>
    </nav>
    <button type="button">Account</button>
    <button type="button">Cart (${cartCount})</button>
  </header>`;
}

function renderSiteFooter(): string {
  return `
  <footer class="footer">
    <nav aria-label="About Vodacom">
      <h4>About Vodacom</h4>
      <a href="#">About Us</a>
      <a href="#">Careers</a>
      <a href="#">Press</a>
      <a href="#">Investors</a>
    </nav>
    <nav aria-label="Support links">
      <h4>Support</h4>
      <a href="#">Contact Us</a>
      <a href="#">FAQs</a>
      <a href="#">Store Locator</a>
      <a href="#">Coverage Map</a>
    </nav>
    <nav aria-label="Legal">
      <h4>Legal</h4>
      <a href="#">Terms &amp; Conditions</a>
      <a href="#">Privacy Policy</a>
      <a href="#">Cookie Policy</a>
      <a href="#">Accessibility</a>
    </nav>
    <nav aria-label="Social media">
      <h4>Connect</h4>
      <a href="#">Facebook</a>
      <a href="#">Twitter</a>
      <a href="#">Instagram</a>
      <a href="#">LinkedIn</a>
    </nav>
    <p>&copy; 2026 Vodacom Group. All rights reserved.</p>
  </footer>`;
}

// ---------------------------------------------------------------------------
// GET / — Storefront home
// ---------------------------------------------------------------------------

wireframesRouter.get('/', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vodacom Shop - Welcome</title>
</head>
<body>
  ${renderSiteHeader(2)}

  <main>
    <section class="hero">
      <h1>Welcome to Vodacom Shop</h1>
      <p>Discover devices, plans, and bundles tailored to your market</p>
      <a href="/catalog">Shop Devices</a>
      <a href="/plans">Explore Plans</a>
    </section>

    <section class="categories">
      <h2>Shop by Category</h2>
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
    </section>

    <section class="trade-in-promo">
      <h2>Trade in your old device and save</h2>
      <p>Get up to R 5,000 credit towards your next purchase</p>
      <a href="/upgrade/trade-in">Get a Valuation</a>
    </section>
  </main>

  ${renderSiteFooter()}
</body>
</html>`;
  res.status(200).type('text/html').send(html);
});

// ---------------------------------------------------------------------------
// GET /cart — Shopping cart
// ---------------------------------------------------------------------------

wireframesRouter.get('/cart', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Your Cart - Vodacom Shop</title>
</head>
<body>
  <header class="header">
    <a href="/">Vodacom Shop</a>
    <nav class="nav-main" aria-label="Main navigation">
      <a href="#">Devices</a>
      <a href="#">Plans</a>
      <a href="#">Accessories</a>
      <a href="#">Support</a>
    </nav>
    <button type="button">Account</button>
    <button type="button">Cart</button>
  </header>

  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="#">Home</a> &rsaquo; Cart
  </nav>

  <main class="main-content">
    <h1>Your Cart</h1>
    <p>3 items</p>

    <h2>Items in your cart</h2>
    <div class="cart-items">
      <article>
        <h3>iPhone 15 Pro</h3>
        <p>Natural Titanium, 256GB</p>
        <p>Unlimited 20GB Plan attached</p>
        <button type="button" aria-label="Decrease quantity">-</button>
        <span>1</span>
        <button type="button" aria-label="Increase quantity">+</button>
        <a href="#">Remove</a>
        <p>R 18,999</p>
        <p>+ R 799/month</p>
      </article>
      <article>
        <h3>iPhone 15 Pro Silicone Case</h3>
        <p>Storm Blue</p>
        <button type="button" aria-label="Decrease quantity">-</button>
        <span>1</span>
        <button type="button" aria-label="Increase quantity">+</button>
        <a href="#">Remove</a>
        <p>R 599</p>
      </article>
      <article>
        <h3>20W USB-C Power Adapter</h3>
        <p>Fast charging compatible</p>
        <button type="button" aria-label="Decrease quantity">-</button>
        <span>1</span>
        <button type="button" aria-label="Increase quantity">+</button>
        <a href="#">Remove</a>
        <p>R 399</p>
      </article>
    </div>

    <div class="promo-code">
      <label for="promo-code">Promo code</label>
      <input type="text" id="promo-code" name="promo-code">
      <button type="button">Apply</button>
    </div>

    <div>
      <button type="submit">Proceed to Checkout</button>
      <a href="#">Continue Shopping</a>
      <p>Secure checkout with encrypted payment</p>
    </div>
  </main>

  <aside class="summary-card">
    <h2>Order Summary</h2>
    <dl>
      <dt>Device</dt><dd>R 18,999.00</dd>
      <dt>Accessories</dt><dd>R 998.00</dd>
      <dt>Activation Fee</dt><dd>R 0.00</dd>
      <dt>Subtotal</dt><dd>R 19,997.00</dd>
      <dt>Unlimited 20GB Plan</dt><dd>R 799.00</dd>
      <dt>Monthly Subtotal</dt><dd>R 799.00</dd>
      <dt>VAT (15%)</dt><dd>R 2,999.55</dd>
      <dt>Trade-In Credit</dt><dd>- R 2,500.00</dd>
      <dt>Total Once-Off</dt><dd>R 20,496.55</dd>
      <dt>Monthly</dt><dd>+ R 799.00/month</dd>
    </dl>
  </aside>

  ${renderSiteFooter()}
</body>
</html>`;
  res.status(200).type('text/html').send(html);
});

// ---------------------------------------------------------------------------
// GET /checkout — Checkout / payment
// ---------------------------------------------------------------------------

wireframesRouter.get('/checkout', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Checkout - Vodacom Shop</title>
</head>
<body>
  <header class="header">
    <a href="/">Vodacom Shop</a>
    <nav aria-label="Checkout progress">
      <span>1 Cart</span>
      <span>2 Checkout</span>
      <span>3 Confirmation</span>
    </nav>
  </header>

  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="#">Home</a> &rsaquo; <a href="#">Cart</a> &rsaquo; Checkout
  </nav>

  <main class="main-content">
    <h1>Checkout</h1>

    <section aria-labelledby="customer-details-heading">
      <h2 id="customer-details-heading">1 Customer Details</h2>
      <div class="form-group">
        <label for="first-name">First Name</label>
        <input type="text" id="first-name" name="first-name" required value="Amina"
               aria-describedby="first-name-error">
        <span id="first-name-error" role="alert" aria-live="assertive"></span>
      </div>
      <div class="form-group">
        <label for="last-name">Last Name</label>
        <input type="text" id="last-name" name="last-name" required value="Dlamini"
               aria-describedby="last-name-error">
        <span id="last-name-error" role="alert" aria-live="assertive"></span>
      </div>
      <div class="form-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" required value="amina.dlamini@example.com"
               aria-describedby="email-error">
        <span id="email-error" role="alert" aria-live="assertive"></span>
      </div>
      <div class="form-group">
        <label for="phone">Phone Number</label>
        <input type="tel" id="phone" name="phone" required value="+27 83 555 0123"
               aria-describedby="phone-error">
        <span id="phone-error" role="alert" aria-live="assertive"></span>
      </div>
      <div class="form-group">
        <label for="address">Street Address</label>
        <input type="text" id="address" name="address" required value="10 Palm Street"
               aria-describedby="address-error">
        <span id="address-error" role="alert" aria-live="assertive"></span>
      </div>
      <div class="form-group">
        <label for="city">City</label>
        <input type="text" id="city" name="city" required value="Johannesburg"
               aria-describedby="city-error">
        <span id="city-error" role="alert" aria-live="assertive"></span>
      </div>
      <div class="form-group">
        <label for="postal-code">Postal Code</label>
        <input type="text" id="postal-code" name="postal-code" required value="2001"
               aria-describedby="postal-code-error">
        <span id="postal-code-error" role="alert" aria-live="assertive"></span>
      </div>
    </section>

    <section aria-labelledby="payment-method-heading">
      <h2 id="payment-method-heading">2 Payment Method</h2>
      <div role="radiogroup" aria-labelledby="payment-method-heading">
        <label>
          <input type="radio" name="payment-method" value="card" checked>
          Credit or Debit Card
        </label>
        <p>Secure payment with tokenized card processing</p>
        <label>
          <input type="radio" name="payment-method" value="mobile-money">
          Mobile Money
        </label>
        <p>Pay with M-Pesa or Vodacom wallet</p>
      </div>

      <div class="card-details">
        <div class="form-group">
          <label for="card-number">Card Number</label>
          <input type="text" id="card-number" name="card-number" required maxlength="19"
                 placeholder="1234 5678 9012 3456" aria-describedby="card-number-error">
          <span id="card-number-error" role="alert" aria-live="assertive"></span>
          <p>Your card details are encrypted and never stored</p>
        </div>
        <div class="form-group">
          <label for="expiry">Expiry Date</label>
          <input type="text" id="expiry" name="expiry" required maxlength="5"
                 placeholder="MM/YY" aria-describedby="expiry-error">
          <span id="expiry-error" role="alert" aria-live="assertive"></span>
        </div>
        <div class="form-group">
          <label for="cvv">CVV</label>
          <input type="text" id="cvv" name="cvv" required maxlength="4"
                 placeholder="123" aria-describedby="cvv-error">
          <span id="cvv-error" role="alert" aria-live="assertive"></span>
        </div>
        <div class="form-group">
          <label for="cardholder-name">Cardholder Name</label>
          <input type="text" id="cardholder-name" name="cardholder-name" required
                 placeholder="Name as it appears on card" aria-describedby="cardholder-name-error">
          <span id="cardholder-name-error" role="alert" aria-live="assertive"></span>
        </div>
      </div>
    </section>

    <section aria-labelledby="terms-heading">
      <h2 id="terms-heading">3 Terms &amp; Consent</h2>
      <div class="form-group">
        <label for="terms">
          <input type="checkbox" id="terms" name="terms" required>
          I agree to the <a href="#">Terms and Conditions</a> and <a href="#">Privacy Policy</a> (Required)
        </label>
      </div>
      <div class="form-group">
        <label for="marketing">
          <input type="checkbox" id="marketing" name="marketing">
          I consent to receiving marketing communications from Vodacom about products, services, and special offers (Optional)
        </label>
      </div>
      <button type="submit">Place Order</button>
    </section>
  </main>

  <aside class="summary-card">
    <h3>Order Summary</h3>
    <ul>
      <li>iPhone 15 Pro 256GB &mdash; Qty: 1 &mdash; R 18,999</li>
      <li>Silicone Case &mdash; Qty: 1 &mdash; R 599</li>
      <li>20W Power Adapter &mdash; Qty: 1 &mdash; R 399</li>
    </ul>
    <dl>
      <dt>Once-Off Subtotal</dt><dd>R 19,997.00</dd>
      <dt>Monthly Plan</dt><dd>R 799.00</dd>
      <dt>VAT (15%)</dt><dd>R 2,999.55</dd>
      <dt>Trade-In Credit</dt><dd>- R 2,500.00</dd>
      <dt>Total Once-Off</dt><dd>R 20,496.55</dd>
      <dt>Monthly</dt><dd>+ R 799.00/month</dd>
    </dl>
  </aside>

  ${renderSiteFooter()}
</body>
</html>`;
  res.status(200).type('text/html').send(html);
});

// ---------------------------------------------------------------------------
// GET /upgrade/eligibility — Upgrade eligibility result
// ---------------------------------------------------------------------------

wireframesRouter.get('/upgrade/eligibility', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Your Upgrade Eligibility - Vodacom Shop</title>
</head>
<body>
  ${renderSiteHeader(0)}

  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a> &rsaquo; <a href="/account">Account</a> &rsaquo; Upgrade Eligibility
  </nav>

  <main>
    <h1>Your Upgrade Eligibility</h1>

    <section class="current-plan" aria-labelledby="eligibility-status-heading">
      <h2 id="eligibility-status-heading">You&apos;re eligible for an upgrade!</h2>
      <p>Your contract has reached the upgrade window. Choose from our latest devices and plans.</p>

      <h2>Your Current Plan</h2>
      <dl>
        <dt>Plan Name</dt><dd>Vodacom Red 10GB</dd>
        <dt>Monthly Cost</dt><dd>R 499.00</dd>
        <dt>Contract End Date</dt><dd>31 Dec 2026</dd>
      </dl>

      <h3>Explore Financing Options</h3>
      <p>Spread the cost of your new device with flexible payment plans</p>
      <a href="/upgrade/financing">Get a Quote</a>

      <h3>Trade In Your Current Device</h3>
      <p>Get up to R 5,000 credit towards your upgrade</p>
      <a href="/upgrade/trade-in">Get a Valuation</a>
    </section>

    <section class="upgrade-options" aria-labelledby="available-devices-heading">
      <h2 id="available-devices-heading">Available Upgrade Devices</h2>
      <a href="/product/iphone-15-pro">
        <h3>iPhone 15 Pro 256GB</h3>
        <p>R 24,999</p>
        <span>View Details</span>
      </a>
      <a href="/product/samsung-s24-ultra">
        <h3>Samsung Galaxy S24 Ultra</h3>
        <p>R 22,999</p>
        <span>View Details</span>
      </a>
      <a href="/product/iphone-15">
        <h3>iPhone 15 128GB</h3>
        <p>R 18,999</p>
        <span>View Details</span>
      </a>
    </section>

    <section class="next-steps" aria-labelledby="ready-heading">
      <h2 id="ready-heading">Ready to Upgrade?</h2>
      <p>Choose a device and configure your new plan</p>
      <a href="/catalog">Continue Shopping</a>
      <a href="/support">Contact Support</a>
    </section>
  </main>

  <footer>
    <p>&copy; 2026 Vodacom Group. All rights reserved.</p>
  </footer>
</body>
</html>`;
  res.status(200).type('text/html').send(html);
});

// ---------------------------------------------------------------------------
// GET /orders/:orderId/esim — eSIM activation
// ---------------------------------------------------------------------------

wireframesRouter.get('/orders/:orderId/esim', (req: Request, res: Response) => {
  const orderId = req.params['orderId'] ?? 'ORD-3001';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Activate Your eSIM - Vodacom Shop</title>
</head>
<body>
  <header class="header">
    <a href="/">Vodacom Shop</a>
    <button type="button">Account</button>
  </header>

  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="#">Home</a> &rsaquo;
    <a href="#">Orders</a> &rsaquo;
    <a href="#">${orderId}</a> &rsaquo;
    eSIM Activation
  </nav>

  <main class="main-content">
    <h1>Activate Your eSIM</h1>
    <p>Follow the steps below to activate your eSIM and start using your new plan</p>

    <div aria-live="polite" aria-atomic="true" class="esim-status">
      <p>Your eSIM is ready to activate</p>
      <p>Payment confirmed and identity verification completed. You can now activate your eSIM.</p>
    </div>

    <section aria-labelledby="qr-heading">
      <h2 id="qr-heading">Scan QR Code to Activate</h2>
      <p>Scan this code with your device</p>
      <p>Open your device camera and point it at the QR code</p>
      <p>How to scan: Go to Settings &rarr; Cellular/Mobile Data &rarr; Add eSIM &rarr; Use QR Code.</p>

      <h3>Manual Activation Instructions</h3>
      <ol>
        <li>Go to Settings on your device</li>
        <li>Select Cellular or Mobile Data</li>
        <li>Tap Add Cellular Plan or Add eSIM</li>
        <li>Select Enter Details Manually</li>
        <li>Enter the following details:
          SM-DP+ Address: smdp.vodacom.co.za
          Activation Code: LPA:1$smdp.vodacom.co.za$ESIM-7001-2026-AMINA
        </li>
        <li>Tap Add and wait for the eSIM to download and activate</li>
      </ol>

      <p>Device Compatibility: This eSIM is compatible with iPhone 15 Pro and supports Vodacom 5G network.</p>

      <h3>Need Help?</h3>
      <p>If you&apos;re having trouble activating your eSIM, we&apos;re here to help</p>
      <a href="#">Contact Support</a>
      <a href="#">View Guide</a>
      <a href="#">Live Chat</a>
    </section>

    <button type="button">Download eSIM Profile</button>
    <button type="button">Check Connection Status</button>
  </main>

  <aside class="reference-card">
    <h3>Order Reference</h3>
    <dl>
      <dt>Order Number</dt><dd>${orderId}</dd>
      <dt>Order Date</dt><dd>28 July 2026</dd>
      <dt>Customer</dt><dd>Amina Dlamini</dd>
      <dt>eSIM Reference</dt><dd>ESIM-7001-2026</dd>
      <dt>Plan</dt><dd>Unlimited 20GB</dd>
      <dt>Status</dt><dd>Ready to Activate</dd>
    </dl>
    <p>Secure Activation: Your eSIM profile is encrypted and can only be activated on your registered device.</p>
  </aside>

  ${renderSiteFooter()}
</body>
</html>`;
  res.status(200).type('text/html').send(html);
});

// ---------------------------------------------------------------------------
// GET /account/orders/:orderId — Order tracking / account
// ---------------------------------------------------------------------------

wireframesRouter.get('/account/orders/:orderId', (req: Request, res: Response) => {
  const orderId = req.params['orderId'] ?? 'ORD-3001';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Order Details - Vodacom Shop</title>
</head>
<body>
  <header class="header">
    <a href="/">Vodacom Shop</a>
    <nav class="nav-main" aria-label="Main navigation">
      <a href="#">Devices</a>
      <a href="#">Plans</a>
      <a href="#">Accessories</a>
      <a href="#">Support</a>
    </nav>
    <button type="button">Account</button>
  </header>

  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="#">Home</a> &rsaquo;
    <a href="#">Account</a> &rsaquo;
    <a href="#">Orders</a> &rsaquo;
    ${orderId}
  </nav>

  <main class="main-content">
    <h1>Order Details</h1>
    <dl>
      <dt>Order Reference</dt><dd>${orderId}</dd>
      <dt>Status</dt><dd>Activation Complete</dd>
      <dt>Order Date</dt><dd>28 July 2026, 10:00 AM</dd>
      <dt>Customer</dt><dd>Amina Dlamini</dd>
      <dt>Total Amount</dt><dd>R 20,496.55</dd>
      <dt>Monthly Charge</dt><dd>R 799.00/month</dd>
    </dl>

    <section aria-labelledby="timeline-heading">
      <h2 id="timeline-heading">Order Status Timeline</h2>
      <ol aria-live="polite" aria-atomic="false" class="order-timeline">
        <li>
          <strong>Order Placed</strong>
          <p>Your order has been received and confirmed</p>
          <time>28 July 2026, 10:00 AM</time>
        </li>
        <li>
          <strong>Payment Confirmed</strong>
          <p>Payment of R 20,496.55 successfully processed via mobile money</p>
          <time>28 July 2026, 10:05 AM</time>
        </li>
        <li>
          <strong>Verification Complete</strong>
          <p>Identity verification and RICA compliance completed successfully</p>
          <time>28 July 2026, 10:07 AM</time>
        </li>
        <li>
          <strong>eSIM Issued</strong>
          <p>Your eSIM profile has been generated and is ready for activation</p>
          <time>28 July 2026, 10:10 AM</time>
        </li>
        <li>
          <strong>Activation Complete</strong>
          <p>Your eSIM is now active and connected to the Vodacom network</p>
          <time>28 July 2026, 10:15 AM</time>
        </li>
      </ol>
    </section>

    <section aria-labelledby="order-items-heading">
      <h2 id="order-items-heading">Order Items</h2>
      <ul>
        <li>
          <h3>iPhone 15 Pro</h3>
          <p>Natural Titanium, 256GB &mdash; Quantity: 1 &mdash; R 18,999.00</p>
        </li>
        <li>
          <h3>iPhone 15 Pro Silicone Case</h3>
          <p>Storm Blue &mdash; Quantity: 1 &mdash; R 599.00</p>
        </li>
        <li>
          <h3>20W USB-C Power Adapter</h3>
          <p>Fast charging compatible &mdash; Quantity: 1 &mdash; R 399.00</p>
        </li>
        <li>
          <h3>Unlimited 20GB Plan</h3>
          <p>20GB data, unlimited calls &amp; SMS &mdash; Monthly subscription &mdash; R 799.00/month</p>
        </li>
      </ul>
    </section>
  </main>

  <aside class="account-card">
    <h3>Your Account</h3>
    <dl>
      <dt>Current Plan</dt><dd>Unlimited 20GB</dd>
      <dt>Monthly Cost</dt><dd>R 799.00</dd>
      <dt>Contract End Date</dt><dd>28 July 2028</dd>
      <dt>Phone Number</dt><dd>+27 83 555 0123</dd>
      <dt>Network Status</dt><dd>Active</dd>
    </dl>
    <button type="button">Manage Account</button>
    <button type="button">Download Invoice</button>
    <button type="button">Contact Support</button>
    <p>Order Protected: Your order is covered by Vodacom&apos;s satisfaction guarantee.</p>
  </aside>

  ${renderSiteFooter()}
</body>
</html>`;
  res.status(200).type('text/html').send(html);
});

// ---------------------------------------------------------------------------
// GET /catalog — Product listing
// ---------------------------------------------------------------------------

wireframesRouter.get('/catalog', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Smartphones - Vodacom Shop</title>
</head>
<body>
  ${renderSiteHeader(2)}

  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a> &rsaquo; <a href="/catalog">Devices</a> &rsaquo; Smartphones
  </nav>

  <aside class="filter-sidebar">
    <fieldset>
      <legend>Brand</legend>
      <label for="brand-apple"><input type="checkbox" id="brand-apple" name="brand-apple" checked> Apple</label>
      <label for="brand-samsung"><input type="checkbox" id="brand-samsung" name="brand-samsung" checked> Samsung</label>
      <label for="brand-huawei"><input type="checkbox" id="brand-huawei" name="brand-huawei"> Huawei</label>
      <label for="brand-xiaomi"><input type="checkbox" id="brand-xiaomi" name="brand-xiaomi"> Xiaomi</label>
    </fieldset>

    <fieldset>
      <legend>Price Range</legend>
      <label for="price-1"><input type="checkbox" id="price-1" name="price-1"> Under R 5,000</label>
      <label for="price-2"><input type="checkbox" id="price-2" name="price-2" checked> R 5,000 - R 15,000</label>
      <label for="price-3"><input type="checkbox" id="price-3" name="price-3" checked> R 15,000 - R 25,000</label>
      <label for="price-4"><input type="checkbox" id="price-4" name="price-4"> Over R 25,000</label>
    </fieldset>

    <fieldset>
      <legend>Storage</legend>
      <label for="storage-128"><input type="checkbox" id="storage-128" name="storage-128"> 128GB</label>
      <label for="storage-256"><input type="checkbox" id="storage-256" name="storage-256" checked> 256GB</label>
      <label for="storage-512"><input type="checkbox" id="storage-512" name="storage-512"> 512GB</label>
    </fieldset>

    <fieldset>
      <legend>Availability</legend>
      <label for="avail-stock"><input type="checkbox" id="avail-stock" name="avail-stock" checked> In Stock</label>
      <label for="avail-preorder"><input type="checkbox" id="avail-preorder" name="avail-preorder"> Pre-Order</label>
    </fieldset>
  </aside>

  <main class="product-listing">
    <h1>Smartphones</h1>
    <p>Lite Mode Active - Optimized for faster browsing</p>

    <h2>Available Devices</h2>

    <a href="/product/iphone-15-pro">
      <h3>iPhone 15 Pro 256GB</h3>
      <p>5G &mdash; Trade-In</p>
      <p>R 24,999</p>
      <p>or from R 899/month</p>
      <span>View Details</span>
    </a>
    <a href="/product/samsung-s24-ultra">
      <h3>Samsung Galaxy S24 Ultra 256GB</h3>
      <p>5G</p>
      <p>R 22,999</p>
      <p>or from R 799/month</p>
      <span>View Details</span>
    </a>
    <a href="/product/iphone-15">
      <h3>iPhone 15 128GB</h3>
      <p>5G &mdash; Trade-In</p>
      <p>R 18,999</p>
      <p>or from R 699/month</p>
      <span>View Details</span>
    </a>
    <a href="/product/samsung-s24">
      <h3>Samsung Galaxy S24 256GB</h3>
      <p>5G</p>
      <p>R 16,999</p>
      <p>or from R 599/month</p>
      <span>View Details</span>
    </a>
    <a href="/product/samsung-a54">
      <h3>Samsung Galaxy A54 128GB</h3>
      <p>5G</p>
      <p>R 8,999</p>
      <p>or from R 349/month</p>
      <span>View Details</span>
    </a>
    <a href="/product/iphone-14">
      <h3>iPhone 14 128GB</h3>
      <p>5G &mdash; Trade-In</p>
      <p>R 15,999</p>
      <p>or from R 579/month</p>
      <span>View Details</span>
    </a>

    <nav aria-label="Pagination">
      <a href="#">1</a>
      <a href="#">2</a>
      <a href="#">3</a>
      <a href="#">Next</a>
    </nav>
  </main>

  ${renderSiteFooter()}
</body>
</html>`;
  res.status(200).type('text/html').send(html);
});

// ---------------------------------------------------------------------------
// GET /upgrade/trade-in — Trade-in
// ---------------------------------------------------------------------------

wireframesRouter.get('/upgrade/trade-in', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Trade In Your Device - Vodacom Shop</title>
</head>
<body>
  <header class="header">
    <a href="/">Vodacom Shop</a>
    <nav class="nav-main" aria-label="Main navigation">
      <a href="#">Devices</a>
      <a href="#">Plans</a>
      <a href="#">Accessories</a>
      <a href="#">Support</a>
    </nav>
    <button type="button">Account</button>
    <button type="button">Cart</button>
  </header>

  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="#">Home</a> &rsaquo; <a href="#">Account</a> &rsaquo; Trade-In
  </nav>

  <main class="main-content">
    <h1>Trade In Your Device</h1>
    <p>Get instant credit towards your new device by trading in your current one</p>
    <p>How it works: Select your device, tell us about its condition, and get an instant valuation.</p>

    <div aria-live="assertive" id="trade-in-validation-error" role="alert"></div>

    <section aria-labelledby="device-details-heading">
      <h2 id="device-details-heading">Device Details</h2>
      <div class="form-group">
        <label for="device-brand">Device Brand</label>
        <select id="device-brand" name="device-brand">
          <option>Select brand</option>
          <option selected>Apple</option>
          <option>Samsung</option>
          <option>Huawei</option>
          <option>Xiaomi</option>
          <option>Oppo</option>
        </select>
      </div>
      <div class="form-group">
        <label for="device-model">Device Model</label>
        <select id="device-model" name="device-model">
          <option>Select model</option>
          <option selected>iPhone 12</option>
          <option>iPhone 12 Pro</option>
          <option>iPhone 12 Pro Max</option>
          <option>iPhone 11</option>
          <option>iPhone XR</option>
        </select>
      </div>
      <div class="form-group">
        <label for="device-storage">Storage Capacity</label>
        <select id="device-storage" name="device-storage">
          <option>Select storage</option>
          <option>64GB</option>
          <option selected>128GB</option>
          <option>256GB</option>
          <option>512GB</option>
        </select>
      </div>
    </section>

    <section aria-labelledby="condition-heading">
      <h2 id="condition-heading">Device Condition</h2>
      <p>Select the option that best describes your device&apos;s condition</p>
      <div role="radiogroup" aria-labelledby="condition-heading">
        <label>
          <input type="radio" name="condition" value="excellent">
          <strong>Excellent</strong>
          <span>Like new, no visible scratches or damage, fully functional</span>
        </label>
        <label>
          <input type="radio" name="condition" value="good" checked>
          <strong>Good</strong>
          <span>Minor scratches or wear, screen intact, fully functional</span>
        </label>
        <label>
          <input type="radio" name="condition" value="fair">
          <strong>Fair</strong>
          <span>Visible scratches or dents, screen may have minor cracks, fully functional</span>
        </label>
        <label>
          <input type="radio" name="condition" value="poor">
          <strong>Poor</strong>
          <span>Significant damage, cracked screen, may have functional issues</span>
        </label>
      </div>

      <p>Your device is worth up to <strong>R 2,500</strong></p>
      <p>Final credit amount will be confirmed after device inspection. This valuation is valid for 7 days.</p>
    </section>

    <section>
      <h2>Trade-In Terms &amp; Conditions</h2>
      <ul>
        <li>Device must be in working condition with no activation locks</li>
        <li>Final valuation subject to physical inspection upon receipt</li>
        <li>Credit will be applied within 5-7 business days after inspection</li>
        <li>Device must match the specifications provided in this form</li>
        <li>You must be the legal owner of the device being traded in</li>
        <li>All personal data must be removed before shipping</li>
      </ul>
    </section>

    <div>
      <button type="submit">Apply Credit to Order</button>
      <button type="button">Back to Upgrade Options</button>
    </div>
  </main>

  <aside class="summary-card">
    <h3>Trade-In Summary</h3>
    <dl>
      <dt>Device</dt><dd>iPhone 12 128GB</dd>
      <dt>Condition</dt><dd>Good</dd>
      <dt>Estimated Credit</dt><dd>R 2,500</dd>
      <dt>Valid Until</dt><dd>4 August 2026</dd>
    </dl>
    <p>Secure Trade-In Process: Your device will be securely inspected and recycled responsibly.</p>
  </aside>

  ${renderSiteFooter()}
</body>
</html>`;
  res.status(200).type('text/html').send(html);
});
