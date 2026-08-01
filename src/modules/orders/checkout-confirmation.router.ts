import { Router, Request, Response } from 'express';
import { getOrderByRef } from './order-store';

export const checkoutConfirmationRouter = Router();

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtAmount(n: number): string {
  return 'R ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// GET /checkout — Screen 3 static checkout (served only when no ?journey param is present;
// journey-aware rendering is handled by catalogRouter when ?journey is supplied)
checkoutConfirmationRouter.get('/checkout', (req: Request, res: Response, next) => {
  if (req.query['journey'] !== undefined) {
    return next();
  }
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Checkout - Vodacom Shop</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:sans-serif;margin:0;padding:0;color:#222}
    .header{display:flex;align-items:center;gap:1rem;padding:0.75rem 1.5rem;background:#e60000;color:#fff}
    .header a{color:#fff;text-decoration:none;font-weight:bold}
    .progress-bar{display:flex;gap:0;background:#f5f5f5;padding:0.5rem 1.5rem;list-style:none;margin:0}
    .progress-bar li{padding:0.4rem 1rem;font-size:0.9rem;color:#888}
    .progress-bar li.active{color:#e60000;font-weight:bold}
    .breadcrumb{padding:0.5rem 1.5rem;font-size:0.85rem;color:#555}
    .breadcrumb a{color:#e60000;text-decoration:none}
    .layout{display:flex;gap:2rem;padding:1.5rem;max-width:1200px;margin:0 auto}
    .main-content{flex:1}
    .summary-card{width:320px;background:#f9f9f9;border:1px solid #ddd;padding:1rem;align-self:flex-start}
    h1{margin-top:0}
    h2{margin:1.5rem 0 0.75rem;font-size:1.1rem;border-bottom:2px solid #e60000;padding-bottom:0.4rem}
    .form-row{display:flex;gap:1rem;margin-bottom:0.75rem}
    .form-group{display:flex;flex-direction:column;flex:1;gap:0.25rem}
    label{font-size:0.85rem;font-weight:600}
    input[type=text],input[type=email],input[type=tel]{padding:0.5rem;border:1px solid #ccc;border-radius:4px;font-size:1rem}
    .payment-options{display:flex;gap:1rem;margin-bottom:1rem}
    .payment-option{border:1px solid #ccc;border-radius:6px;padding:0.75rem 1rem;cursor:pointer;display:flex;align-items:center;gap:0.5rem}
    .payment-option input{margin:0}
    .consent-row{display:flex;gap:0.5rem;align-items:flex-start;margin-bottom:0.5rem}
    .consent-row input{margin-top:3px}
    .btn-place-order{background:#e60000;color:#fff;border:none;padding:0.85rem 2rem;font-size:1rem;border-radius:4px;cursor:pointer;margin-top:1rem;width:100%}
    .btn-place-order:disabled{opacity:0.6;cursor:not-allowed}
    .error-region{color:#c62828;background:#fbe9e7;border:1px solid #c62828;border-radius:4px;padding:0.6rem 0.9rem;margin-bottom:1rem;display:none}
    .error-region:not(:empty){display:block}
    .summary-line{display:flex;justify-content:space-between;padding:0.35rem 0;font-size:0.9rem}
    .summary-line.total{font-weight:bold;border-top:1px solid #ccc;padding-top:0.5rem;margin-top:0.5rem}
    .summary-item{padding:0.35rem 0;font-size:0.9rem;border-bottom:1px solid #eee}
    .secure-badges{font-size:0.75rem;color:#666;margin-top:0.75rem}
  </style>
</head>
<body>
  <header class="header">
    <a href="/">Vodacom Shop</a>
  </header>

  <nav aria-label="Checkout progress">
    <ol class="progress-bar">
      <li>1 Cart</li>
      <li class="active">2 Checkout</li>
      <li>3 Confirmation</li>
    </ol>
  </nav>

  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/cart">Cart</a> &rsaquo;
    Checkout
  </nav>

  <div class="layout">
    <main class="main-content">
      <h1>Checkout</h1>

      <div id="order-error" class="error-region" role="alert" aria-live="assertive"></div>

      <form id="checkout-form" novalidate>
        <h2>1 Customer Details</h2>
        <div class="form-row">
          <div class="form-group">
            <label for="first-name">First Name</label>
            <input type="text" id="first-name" name="first-name" required autocomplete="given-name" value="Amina">
          </div>
          <div class="form-group">
            <label for="last-name">Last Name</label>
            <input type="text" id="last-name" name="last-name" required autocomplete="family-name" value="Dlamini">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input type="email" id="email" name="email" required autocomplete="email" value="amina.dlamini@example.com">
          </div>
          <div class="form-group">
            <label for="phone">Phone Number</label>
            <input type="tel" id="phone" name="phone" required autocomplete="tel" value="+27 83 555 0123">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="address">Street Address</label>
            <input type="text" id="address" name="address" required autocomplete="street-address" value="10 Palm Street">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="city">City</label>
            <input type="text" id="city" name="city" required autocomplete="address-level2" value="Johannesburg">
          </div>
          <div class="form-group">
            <label for="postal-code">Postal Code</label>
            <input type="text" id="postal-code" name="postal-code" required autocomplete="postal-code" value="2001">
          </div>
        </div>

        <h2>2 Payment Method</h2>
        <div class="payment-options">
          <label class="payment-option">
            <input type="radio" name="payment-method" value="card" checked>
            Credit or Debit Card
            <span>Secure payment with tokenized card processing</span>
          </label>
          <label class="payment-option">
            <input type="radio" name="payment-method" value="mobile-money">
            Mobile Money
            <span>Pay with M-Pesa or Vodacom wallet</span>
          </label>
        </div>
        <div id="card-fields">
          <p><small>Your card details are encrypted and never stored</small></p>
          <div class="form-row">
            <div class="form-group">
              <label for="card-number">Card Number</label>
              <input type="text" id="card-number" name="card-number" placeholder="1234 5678 9012 3456" required maxlength="19" autocomplete="cc-number">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="expiry">Expiry Date</label>
              <input type="text" id="expiry" name="expiry" placeholder="MM/YY" required maxlength="5" autocomplete="cc-exp">
            </div>
            <div class="form-group">
              <label for="cvv">CVV</label>
              <input type="text" id="cvv" name="cvv" placeholder="123" required maxlength="4" autocomplete="cc-csc">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="cardholder-name">Cardholder Name</label>
              <input type="text" id="cardholder-name" name="cardholder-name" placeholder="Name as it appears on card" required autocomplete="cc-name">
            </div>
          </div>
        </div>

        <h2>3 Terms &amp; Consent</h2>
        <div class="consent-row">
          <input type="checkbox" id="terms" name="terms" required>
          <label for="terms">I agree to the <a href="#">Terms and Conditions</a> and <a href="#">Privacy Policy</a> (Required)</label>
        </div>
        <div class="consent-row">
          <input type="checkbox" id="marketing" name="marketing">
          <label for="marketing">I consent to receiving marketing communications from Vodacom about products, services, and special offers (Optional)</label>
        </div>

        <button
          type="button"
          id="place-order"
          class="btn-place-order"
          aria-busy="false"
          data-loading="false"
        >Place Order</button>
      </form>
    </main>

    <aside class="summary-card" aria-label="Order Summary">
      <h3>Order Summary</h3>
      <div class="summary-item">iPhone 15 Pro 256GB <span>Qty: 1</span> &mdash; R 18,999</div>
      <div class="summary-item">Silicone Case <span>Qty: 1</span> &mdash; R 599</div>
      <div class="summary-item">20W Power Adapter <span>Qty: 1</span> &mdash; R 399</div>
      <div class="summary-line"><span>Once-Off Subtotal</span><span>R 19,997.00</span></div>
      <div class="summary-line"><span>Monthly Plan</span><span>R 799.00</span></div>
      <div class="summary-line"><span>VAT (15%)</span><span>R 2,999.55</span></div>
      <div class="summary-line"><span>Trade-In Credit</span><span>&minus; R 2,500.00</span></div>
      <div class="summary-line total"><span>Total Once-Off</span><span>R 20,496.55</span></div>
      <div class="summary-line"><span>+ R 799.00/month</span></div>
      <div class="secure-badges">
        <span>PCI-DSS</span> &bull; <span>SSL Encrypted</span>
      </div>
    </aside>
  </div>

  <footer class="footer">
    <h4>About Vodacom</h4>
    <a href="#">About Us</a> &bull; <a href="#">Careers</a>
    <h4>Support</h4>
    <a href="#">Contact Us</a> &bull; <a href="#">FAQs</a>
    <p>&copy; 2026 Vodacom Group. All rights reserved.</p>
  </footer>

  <script>
  (function () {
    var btn = document.getElementById('place-order');
    var errorRegion = document.getElementById('order-error');

    function setLoading(loading) {
      btn.disabled = loading;
      btn.setAttribute('aria-busy', loading ? 'true' : 'false');
      btn.setAttribute('data-loading', loading ? 'true' : 'false');
      btn.textContent = loading ? 'Placing Order…' : 'Place Order';
    }

    function showError(msg) {
      errorRegion.textContent = msg;
      errorRegion.style.display = 'block';
    }

    function clearError() {
      errorRegion.textContent = '';
      errorRegion.style.display = 'none';
    }

    btn.addEventListener('click', function () {
      clearError();

      var terms = document.getElementById('terms');
      if (!terms.checked) {
        showError('Please agree to the Terms and Conditions to continue.');
        return;
      }

      setLoading(true);

      var payload = {
        cartId: 'cart-' + Date.now(),
        paymentAttemptId: 'pay-' + Date.now(),
        paymentStatus: 'CONFIRMED',
        lineItems: [
          { name: 'iPhone 15 Pro 256GB', qty: 1, unitPrice: 18999 },
          { name: 'Silicone Case', qty: 1, unitPrice: 599 },
          { name: '20W USB-C Power Adapter', qty: 1, unitPrice: 399 }
        ],
        onceOffTotal: 20496.55,
        monthlyTotal: 799,
        consents: [
          { purpose: 'terms', granted: true },
          { purpose: 'marketing', granted: document.getElementById('marketing').checked }
        ]
      };

      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) {
          if (!r.ok) {
            return r.json().then(function (err) {
              throw new Error(err.message || 'Order failed. Please try again.');
            });
          }
          return r.json();
        })
        .then(function (data) {
          window.location.href = '/confirmation/' + data.orderReference;
        })
        .catch(function (err) {
          setLoading(false);
          showError(err.message || 'An unexpected error occurred. Please try again.');
        });
    });
  })();
  </script>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});

// GET /confirmation/:ref — Order Confirmation page
checkoutConfirmationRouter.get('/confirmation/:ref', (req: Request, res: Response) => {
  const { ref } = req.params;
  const order = getOrderByRef(ref);

  if (!order) {
    res.status(404).type('text/html').send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Order Not Found - Vodacom Shop</title></head>
<body>
  <h1>Order Not Found</h1>
  <p>We could not find an order with reference <strong>${escapeHtml(ref)}</strong>.</p>
  <a href="/cart">Back to Cart</a>
</body>
</html>`);
    return;
  }

  const lineItemsHtml = order.lineItems.map(item => `
    <tr>
      <td>${escapeHtml(item.name)}</td>
      <td>Qty: ${item.qty}</td>
      <td>${fmtAmount(item.unitPrice)}</td>
    </tr>`).join('');

  const nextStepsHtml = order.nextSteps.map(step => `
    <li class="next-step-item">
      <div class="next-step-header">
        <strong>${escapeHtml(step.step)}</strong>
        <span class="next-step-status">${escapeHtml(step.status)}</span>
      </div>
      <p class="next-step-time">
        Estimated time: approximately ${step.estimatedMinutes} minutes &mdash; no action needed.
        Your ${escapeHtml(step.step)} will be issued within approximately ${step.estimatedMinutes} minutes &mdash; no action needed. Activation continues automatically.
      </p>
    </li>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Order Confirmation - Vodacom Shop</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:sans-serif;margin:0;padding:0;color:#222}
    .header{display:flex;align-items:center;gap:1rem;padding:0.75rem 1.5rem;background:#e60000;color:#fff}
    .header a{color:#fff;text-decoration:none;font-weight:bold}
    .progress-bar{display:flex;gap:0;background:#f5f5f5;padding:0.5rem 1.5rem;list-style:none;margin:0}
    .progress-bar li{padding:0.4rem 1rem;font-size:0.9rem;color:#888}
    .progress-bar li.active{color:#e60000;font-weight:bold}
    .breadcrumb{padding:0.5rem 1.5rem;font-size:0.85rem;color:#555}
    .breadcrumb a{color:#e60000;text-decoration:none}
    .layout{padding:1.5rem;max-width:900px;margin:0 auto}
    .confirmation-banner{background:#e8f5e9;border:1px solid #2e7d32;border-radius:6px;padding:1.25rem 1.5rem;margin-bottom:1.5rem}
    h1{margin:0;color:#1b5e20;font-size:1.5rem}
    h2{margin:1.5rem 0 0.75rem;font-size:1.1rem;border-bottom:2px solid #e60000;padding-bottom:0.4rem}
    table{width:100%;border-collapse:collapse;margin-bottom:1rem}
    th,td{padding:0.6rem 0.75rem;text-align:left;border-bottom:1px solid #eee;font-size:0.9rem}
    th{background:#f5f5f5;font-weight:600}
    .totals-row{display:flex;justify-content:space-between;padding:0.4rem 0;font-size:0.95rem}
    .totals-row.total{font-weight:bold;border-top:1px solid #ccc;padding-top:0.5rem}
    .next-steps-list{list-style:none;padding:0;margin:0}
    .next-step-item{border:1px solid #ddd;border-radius:4px;padding:0.75rem 1rem;margin-bottom:0.5rem}
    .next-step-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem}
    .next-step-status{background:#fff3e0;color:#e65100;font-size:0.8rem;padding:0.2rem 0.5rem;border-radius:12px;border:1px solid #ffcc80;text-transform:capitalize}
    .next-step-time{margin:0;font-size:0.85rem;color:#555}
    .async-notice{background:#e3f2fd;border-left:4px solid #1976d2;padding:0.75rem 1rem;border-radius:0 4px 4px 0;margin:1rem 0;font-size:0.9rem}
    .actions{display:flex;gap:1rem;margin-top:1.5rem;flex-wrap:wrap}
    .btn-track{background:#e60000;color:#fff;border:none;padding:0.7rem 1.5rem;border-radius:4px;text-decoration:none;font-size:0.95rem}
    .btn-back{border:1px solid #ccc;background:#fff;color:#333;padding:0.7rem 1.5rem;border-radius:4px;text-decoration:none;font-size:0.95rem}
  </style>
</head>
<body>
  <header class="header">
    <a href="/">Vodacom Shop</a>
  </header>

  <nav aria-label="Checkout progress">
    <ol class="progress-bar">
      <li>1 Cart</li>
      <li>2 Checkout</li>
      <li class="active">3 Confirmation</li>
    </ol>
  </nav>

  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/cart">Cart</a> &rsaquo;
    <a href="/checkout">Checkout</a> &rsaquo;
    Confirmation
  </nav>

  <div class="layout">
    <div class="confirmation-banner" role="status" aria-live="polite">
      <h1>Order ${escapeHtml(ref)} confirmed</h1>
      <p>Thank you for your order. Your order has been placed successfully.</p>
    </div>

    <section>
      <h2>Order Summary</h2>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
      </table>
      <div class="totals-row"><span>Once-Off Total</span><span>${fmtAmount(order.onceOffTotal)}</span></div>
      <div class="totals-row total"><span>Monthly Plan</span><span>${fmtAmount(order.monthlyTotal)}/month</span></div>
    </section>

    <section>
      <h2>What Happens Next</h2>
      <div class="async-notice">
        Your order is being processed. Activation continues automatically &mdash; you will receive updates as each step completes. No action is required from you.
      </div>
      <ul class="next-steps-list" aria-label="Fulfilment milestones">
        ${nextStepsHtml}
      </ul>
    </section>

    <div class="actions">
      <a href="/orders/${escapeHtml(ref)}" class="btn-track">Track my order</a>
      <a href="/cart" class="btn-back">Back to Cart</a>
    </div>
  </div>

  <footer class="footer">
    <h4>About Vodacom</h4>
    <a href="#">About Us</a> &bull; <a href="#">Careers</a>
    <h4>Support</h4>
    <a href="#">Contact Us</a> &bull; <a href="#">FAQs</a>
    <p>&copy; 2026 Vodacom Group. All rights reserved.</p>
  </footer>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});
