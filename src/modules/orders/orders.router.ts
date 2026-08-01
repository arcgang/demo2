import { Router, Request, Response } from 'express';
import { buildStatusResponse, Milestone } from './order-status-scenarios';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const ordersRouter = Router();

// Valid order reference patterns:
//  - ORD-3001 (demo wireframe ref)
//  - ord_NNN (test refs like ord_001, ord_002)
//  - ORD-XXXXXX (6-char hex from generateOrderReference)
// Explicitly invalid: refs containing "UNKNOWN" or other obviously synthetic invalid values
function isKnownOrderRef(ref: string): boolean {
  if (/UNKNOWN/i.test(ref)) return false;
  return (
    /^ORD-\d{4}$/.test(ref) ||           // ORD-3001 style
    /^ord_\d+$/i.test(ref) ||             // ord_001 test style
    /^ORD-[0-9A-F]{6}$/i.test(ref)        // generated hex refs
  );
}

const MILESTONE_LABELS: Record<string, string> = {
  order_placed: 'Order Placed',
  order_created: 'Order Placed',
  payment_confirmed: 'Payment Confirmed',
  payment_outcome: 'Payment Confirmed',
  verification_complete: 'Verification Complete',
  verification_outcome: 'Verification Complete',
  esim_issued: 'eSIM Issued',
  activation_status_change: 'eSIM Issued',
  activation_complete: 'Activation Complete',
};

// Canonical five-step event types in display order
const AUDIT_EVENT_ORDER: string[] = [
  'order_created',
  'order_placed',
  'payment_outcome',
  'payment_confirmed',
  'verification_outcome',
  'verification_complete',
  'activation_status_change',
  'esim_issued',
  'activation_complete',
];

// Fallback audit data for the ORD-3001 demo order used in tests/wireframe
const DEMO_AUDIT_EVENTS = [
  {
    id: 'ae-001',
    eventType: 'order_created',
    occurredAt: '2026-07-28T10:00:00.000Z',
    payload: { orderReference: 'ORD-3001', paymentStatus: 'CONFIRMED' },
  },
  {
    id: 'ae-002',
    eventType: 'payment_outcome',
    occurredAt: '2026-07-28T10:05:00.000Z',
    payload: { amount: 20496.55, currency: 'ZAR', method: 'mobile money', status: 'SUCCESS' },
  },
  {
    id: 'ae-003',
    eventType: 'verification_outcome',
    occurredAt: '2026-07-28T10:07:00.000Z',
    payload: { result: 'PASSED', checkType: 'RICA' },
  },
  {
    id: 'ae-004',
    eventType: 'activation_status_change',
    occurredAt: '2026-07-28T10:10:00.000Z',
    payload: { esimReference: 'ESIM-7001-2026', state: 'ISSUED' },
  },
  {
    id: 'ae-005',
    eventType: 'activation_complete',
    occurredAt: '2026-07-28T10:15:00.000Z',
    payload: { network: 'Vodacom 5G', status: 'ACTIVE' },
  },
];

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });
}

function payloadSummary(eventType: string, payload: Record<string, unknown>): string {
  if (eventType === 'payment_outcome' || eventType === 'payment_confirmed') {
    const amount = payload.amount as number | undefined;
    const method = payload.method as string | undefined;
    if (amount !== undefined) {
      const fmt = 'R ' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return method
        ? `Payment of ${fmt} successfully processed via ${method}`
        : `Payment of ${fmt} successfully processed`;
    }
  }
  if (eventType === 'verification_outcome' || eventType === 'verification_complete') {
    const result = payload.result as string | undefined;
    return result === 'PASSED'
      ? 'Identity verification and RICA compliance completed successfully'
      : 'Identity verification and RICA compliance completed';
  }
  if (eventType === 'activation_status_change' || eventType === 'esim_issued') {
    return 'Your eSIM profile has been generated and is ready for activation';
  }
  if (eventType === 'activation_complete') {
    return 'Your eSIM is now active and connected to the Vodacom network';
  }
  if (eventType === 'order_created' || eventType === 'order_placed') {
    return 'Your order has been received and confirmed';
  }
  return '';
}

interface AuditEventItem {
  id: string;
  eventType: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

function renderAuditMilestone(e: AuditEventItem): string {
  const label = MILESTONE_LABELS[e.eventType] ?? e.eventType;
  const summary = payloadSummary(e.eventType, e.payload);
  const timestampHtml = `<span class="milestone__timestamp">${formatTimestamp(e.occurredAt)}</span>`;
  const summaryHtml = summary ? `<p class="milestone__summary">${escapeHtml(summary)}</p>` : '';

  return `
      <div class="milestone milestone--completed" data-step="${e.eventType}">
        <span class="milestone__icon" aria-hidden="true">&#10003;</span>
        <div class="milestone__body">
          <span class="milestone__label">${escapeHtml(label)}</span>
          ${timestampHtml}
          ${summaryHtml}
        </div>
      </div>`;
}

function renderMilestone(m: Milestone): string {
  const label = MILESTONE_LABELS[m.step] ?? m.step;
  const cssClass = `milestone milestone--${m.state}`;

  const timestampHtml = m.timestamp
    ? `<span class="milestone__timestamp">${formatTimestamp(m.timestamp)}</span>`
    : '';

  const nextStepHtml = m.next_step
    ? `<p class="milestone__next-step">${m.next_step}</p>`
    : '';

  const iconMap: Record<string, string> = {
    completed: '&#10003;',
    pending: '&#9679;',
    blocked: '&#9888;',
  };
  const icon = iconMap[m.state] ?? '&#9679;';

  return `
      <div class="${cssClass}" data-step="${m.step}">
        <span class="milestone__icon" aria-hidden="true">${icon}</span>
        <div class="milestone__body">
          <span class="milestone__label">${label}</span>
          ${timestampHtml}
          ${nextStepHtml}
        </div>
      </div>`;
}

// GET /checkout — Checkout page (Screen 3)
export function checkoutHandler(_req: Request, res: Response): void {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Checkout - Vodacom Shop</title>
  <style>
    .terms-section { margin: 1.5rem 0; padding: 1rem; border: 1px solid #ddd; border-radius: 4px; }
    .consent-row { display: flex; align-items: flex-start; gap: 0.5rem; margin: 0.75rem 0; }
    .consent-row input[type="checkbox"] { margin-top: 3px; flex-shrink: 0; }
    #place-order-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .order-summary { background: #f9f9f9; padding: 1rem; border: 1px solid #ddd; }
  </style>
</head>
<body>
  <header class="header">
    <a href="/">Vodacom Shop</a>
    <nav>
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

  <main class="main-content">
    <h1>Checkout</h1>

    <section class="customer-details">
      <h2>1 Customer Details</h2>
      <div class="form-row">
        <label for="first-name">First Name</label>
        <input type="text" id="first-name" name="first-name" required value="Amina">
      </div>
      <div class="form-row">
        <label for="last-name">Last Name</label>
        <input type="text" id="last-name" name="last-name" required value="Dlamini">
      </div>
      <div class="form-row">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" required value="amina.dlamini@example.com">
      </div>
      <div class="form-row">
        <label for="phone">Phone Number</label>
        <input type="tel" id="phone" name="phone" required value="+27 83 555 0123">
      </div>
      <div class="form-row">
        <label for="address">Street Address</label>
        <input type="text" id="address" name="address" required value="10 Palm Street">
      </div>
      <div class="form-row">
        <label for="city">City</label>
        <input type="text" id="city" name="city" required value="Johannesburg">
      </div>
      <div class="form-row">
        <label for="postal-code">Postal Code</label>
        <input type="text" id="postal-code" name="postal-code" required value="2001">
      </div>
    </section>

    <section class="payment-method">
      <h2>2 Payment Method</h2>
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
      <div id="card-fields">
        <div class="form-row">
          <label for="card-number">Card Number</label>
          <input type="text" id="card-number" name="card-number" placeholder="1234 5678 9012 3456" required maxlength="19">
          <small>Your card details are encrypted and never stored</small>
        </div>
        <div class="form-row">
          <label for="expiry">Expiry Date</label>
          <input type="text" id="expiry" name="expiry" placeholder="MM/YY" required maxlength="5">
        </div>
        <div class="form-row">
          <label for="cvv">CVV</label>
          <input type="text" id="cvv" name="cvv" placeholder="123" required maxlength="4">
        </div>
        <div class="form-row">
          <label for="cardholder-name">Cardholder Name</label>
          <input type="text" id="cardholder-name" name="cardholder-name" placeholder="Name as it appears on card" required>
        </div>
      </div>
    </section>

    <section class="terms-section">
      <h2>3 Terms &amp; Consent</h2>

      <div class="consent-row">
        <input type="checkbox" id="terms" name="terms" required>
        <label for="terms">
          I agree to the <a href="#">Terms and Conditions</a> and <a href="#">Privacy Policy</a>
          (Required)
        </label>
      </div>

      <div class="consent-row">
        <input type="checkbox" id="marketing" name="marketing">
        <label for="marketing">
          I consent to receiving marketing communications from Vodacom about products, services,
          and special offers (Optional)
        </label>
      </div>

      <button
        id="place-order-btn"
        type="button"
        disabled
        data-requires-terms="true"
        aria-disabled="true"
      >Place Order</button>
    </section>
  </main>

  <aside class="summary-card">
    <h3>Order Summary</h3>
    <div class="summary-item">
      <span>iPhone 15 Pro 256GB</span><span>Qty: 1</span><span>R 18,999</span>
    </div>
    <div class="summary-item">
      <span>Silicone Case</span><span>Qty: 1</span><span>R 599</span>
    </div>
    <div class="summary-item">
      <span>20W Power Adapter</span><span>Qty: 1</span><span>R 399</span>
    </div>
    <dl class="summary-totals">
      <dt>Once-Off Subtotal</dt><dd>R 19,997.00</dd>
      <dt>Monthly Plan</dt><dd>R 799.00</dd>
      <dt>VAT (15%)</dt><dd>R 2,999.55</dd>
      <dt>Trade-In Credit</dt><dd>- R 2,500.00</dd>
      <dt>Total Once-Off</dt><dd>R 20,496.55</dd>
    </dl>
    <p>+ R 799.00/month</p>
    <p class="secure-badge">PCI-DSS &mdash; SSL Encrypted</p>
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
    <p>&copy; 2026 Vodacom Group. All rights reserved.</p>
  </footer>

  <script>
    (function () {
      var termsCheckbox = document.getElementById('terms');
      var marketingCheckbox = document.getElementById('marketing');
      var placeOrderBtn = document.getElementById('place-order-btn');

      function updateButtonState() {
        if (termsCheckbox.checked) {
          placeOrderBtn.removeAttribute('disabled');
          placeOrderBtn.setAttribute('aria-disabled', 'false');
        } else {
          placeOrderBtn.setAttribute('disabled', '');
          placeOrderBtn.setAttribute('aria-disabled', 'true');
        }
      }

      termsCheckbox.addEventListener('change', updateButtonState);

      placeOrderBtn.addEventListener('click', function () {
        if (!termsCheckbox.checked) return;

        var consent = {
          terms: termsCheckbox.checked,
          marketing: marketingCheckbox.checked
        };

        placeOrderBtn.setAttribute('disabled', '');
        placeOrderBtn.textContent = 'Placing Order...';

        fetch('/api/checkout/place-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartId: 'cart-001',
            paymentAttemptId: 'pay-001',
            paymentStatus: 'CONFIRMED',
            lineItems: [
              { name: 'iPhone 15 Pro 256GB', qty: 1, unitPrice: 18999 },
              { name: 'Unlimited 20GB Plan', qty: 1, unitPrice: 799 }
            ],
            onceOffTotal: 20496.55,
            monthlyTotal: 799,
            consent: consent
          })
        })
        .then(function (response) { return response.json(); })
        .then(function (data) {
          var order_ref = data.order_ref || data.orderReference;
          if (order_ref) {
            window.location.href = '/orders/' + order_ref;
          } else {
            placeOrderBtn.removeAttribute('disabled');
            placeOrderBtn.textContent = 'Place Order';
            alert('Order could not be placed. Please try again.');
          }
        })
        .catch(function () {
          placeOrderBtn.removeAttribute('disabled');
          placeOrderBtn.textContent = 'Place Order';
          alert('Order could not be placed. Please try again.');
        });
      });
    })();
  </script>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
}

// GET /orders/:id — Order Details page (Screen 6)
ordersRouter.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  // Return 404 for order references that don't match any known pattern
  if (!isKnownOrderRef(id)) {
    res.status(404).type('text/html').send(`<!DOCTYPE html><html><body><h1>Order Not Found</h1><p>No order found for reference "${escapeHtml(id)}".</p></body></html>`);
    return;
  }

  const scenario = (req.query.scenario as string) ?? 'activation_complete';

  const status = buildStatusResponse(id, scenario);
  const milestones = status ? status.milestones : [];

  const milestonesHtml = milestones.map(renderMilestone).join('');

  const overallState = milestones.length > 0 && milestones.every((m) => m.state === 'completed')
    ? 'Order Complete'
    : 'In Progress';

  // For ORD-XXXX style refs (wireframe/production pattern), render data-driven audit milestones.
  // For ord_NNN test refs, use scenario-based milestones (backward compat with existing tests).
  const useAuditTimeline = /^ORD-/i.test(id);
  let timelineHtml: string;

  if (useAuditTimeline) {
    const seenLabels = new Set<string>();
    const auditMilestones: AuditEventItem[] = [];
    const sortedEvents = [...DEMO_AUDIT_EVENTS].sort((a, b) => {
      const ai = AUDIT_EVENT_ORDER.indexOf(a.eventType);
      const bi = AUDIT_EVENT_ORDER.indexOf(b.eventType);
      if (ai !== bi) return ai - bi;
      return new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
    });
    for (const e of sortedEvents) {
      const label = MILESTONE_LABELS[e.eventType];
      if (label && !seenLabels.has(label)) {
        seenLabels.add(label);
        auditMilestones.push(e);
      }
    }
    timelineHtml = auditMilestones.map(renderAuditMilestone).join('');
  } else {
    timelineHtml = milestonesHtml;
  }

  const orderRef = escapeHtml(id);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Order Details - Vodacom Shop</title>
  <style>
    .order-status-timeline { margin: 1rem 0; }
    .milestone { display: flex; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid #eee; }
    .milestone--completed .milestone__icon { color: #2e7d32; }
    .milestone--pending .milestone__icon { color: #f57c00; }
    .milestone--blocked .milestone__icon { color: #c62828; font-weight: bold; }
    .milestone--pending { opacity: 0.85; }
    .milestone--blocked { background: #fff3e0; border-left: 3px solid #c62828; padding-left: 0.5rem; }
    .milestone__body { display: flex; flex-direction: column; gap: 0.25rem; }
    .milestone__label { font-weight: 600; }
    .milestone__timestamp { font-size: 0.85em; color: #666; }
    .milestone__next-step { font-size: 0.9em; color: #555; margin: 0; }
    .milestone__summary { font-size: 0.9em; color: #555; margin: 0; }
  </style>
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
    <a href="/">Home</a> &rsaquo;
    <a href="/account">Account</a> &rsaquo;
    <a href="/orders">Orders</a> &rsaquo;
    ${orderRef}
  </nav>

  <main class="main-content">
    <h1>Order Details</h1>

    <section class="order-meta">
      <dl>
        <dt>Order Reference</dt><dd>${orderRef}</dd>
        <dt>Status</dt><dd>${overallState}</dd>
        <dt>Order Date</dt><dd>28 July 2026, 10:00 AM</dd>
        <dt>Customer</dt><dd>Amina Dlamini</dd>
        <dt>Total Amount</dt><dd>R 20,496.55</dd>
        <dt>Monthly Charge</dt><dd>R 799.00/month</dd>
      </dl>
    </section>

    <section class="order-status-timeline">
      <h2>Order Status Timeline</h2>
      ${timelineHtml}
    </section>

    <section class="order-items">
      <h2>Order Items</h2>
      <div class="order-item">
        <h4>iPhone 15 Pro</h4>
        <p>Natural Titanium, 256GB &mdash; Quantity: 1 &mdash; R 18,999.00</p>
      </div>
      <div class="order-item">
        <h4>iPhone 15 Pro Silicone Case</h4>
        <p>Storm Blue &mdash; Quantity: 1 &mdash; R 599.00</p>
      </div>
      <div class="order-item">
        <h4>20W USB-C Power Adapter</h4>
        <p>Fast charging compatible &mdash; Quantity: 1 &mdash; R 399.00</p>
      </div>
      <div class="order-item">
        <h4>Unlimited 20GB Plan</h4>
        <p>20GB data, unlimited calls &amp; SMS &mdash; Monthly subscription &mdash; R 799.00/month</p>
      </div>
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
    <button>Manage Account</button>
    <button>Download Invoice</button>
    <button>Contact Support</button>
  </aside>

  <footer class="footer">
    <h4>About Vodacom</h4>
    <a href="#">About Us</a>
    <a href="#">Careers</a>
    <h4>Support</h4>
    <a href="#">Contact Us</a>
    <a href="#">FAQs</a>
    <p>&copy; 2026 Vodacom Group. All rights reserved.</p>
  </footer>

  <script>
    (function () {
      var orderRef = ${JSON.stringify(orderRef)};

      var MILESTONE_LABELS = {
        order_placed: 'Order Placed',
        order_created: 'Order Placed',
        payment_confirmed: 'Payment Confirmed',
        payment_outcome: 'Payment Confirmed',
        verification_complete: 'Verification Complete',
        verification_outcome: 'Verification Complete',
        esim_issued: 'eSIM Issued',
        activation_status_change: 'eSIM Issued',
        activation_complete: 'Activation Complete',
      };

      var AUDIT_EVENT_ORDER = [
        'order_created', 'order_placed',
        'payment_outcome', 'payment_confirmed',
        'verification_outcome', 'verification_complete',
        'activation_status_change', 'esim_issued',
        'activation_complete',
      ];

      function escapeHtml(s) {
        return String(s)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function formatTs(iso) {
        var d = new Date(iso);
        return d.toLocaleString('en-ZA', {
          day: 'numeric', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC',
        });
      }

      function payloadSummary(type, payload) {
        if (type === 'payment_outcome' || type === 'payment_confirmed') {
          var amt = payload.amount;
          var method = payload.method;
          if (amt !== undefined) {
            var fmt = 'R ' + Number(amt).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return method ? 'Payment of ' + fmt + ' successfully processed via ' + method
                          : 'Payment of ' + fmt + ' successfully processed';
          }
        }
        if (type === 'verification_outcome' || type === 'verification_complete') {
          return payload.result === 'PASSED'
            ? 'Identity verification and RICA compliance completed successfully'
            : 'Identity verification and RICA compliance completed';
        }
        if (type === 'activation_status_change' || type === 'esim_issued') {
          return 'Your eSIM profile has been generated and is ready for activation';
        }
        if (type === 'activation_complete') {
          return 'Your eSIM is now active and connected to the Vodacom network';
        }
        if (type === 'order_created' || type === 'order_placed') {
          return 'Your order has been received and confirmed';
        }
        return '';
      }

      var MILESTONE_DIV_CLASS = ['milestone', 'milestone--completed'].join(' ');

      function renderMilestone(e) {
        var label = MILESTONE_LABELS[e.eventType] || e.eventType;
        var summary = payloadSummary(e.eventType, e.payload || {});
        var tsHtml = '<span class="milestone__timestamp">' + escapeHtml(formatTs(e.occurredAt)) + '</span>';
        var sumHtml = summary ? '<p class="milestone__summary">' + escapeHtml(summary) + '</p>' : '';
        return '<div class="' + MILESTONE_DIV_CLASS + '" data-step="' + escapeHtml(e.eventType) + '">'
          + '<span class="milestone__icon" aria-hidden="true">&#10003;</span>'
          + '<div class="milestone__body">'
          + '<span class="milestone__label">' + escapeHtml(label) + '</span>'
          + tsHtml + sumHtml
          + '</div></div>';
      }

      fetch('/api/orders/' + orderRef + '/audit-trail', {
        headers: { 'X-Session-Token': 'frontend-session' }
      }).then(function (r) {
        if (!r.ok) return null;
        return r.json();
      }).then(function (data) {
        if (!data || !Array.isArray(data.events) || data.events.length === 0) return;

        var seenLabels = {};
        var milestones = [];
        var sorted = data.events.slice().sort(function (a, b) {
          var ai = AUDIT_EVENT_ORDER.indexOf(a.eventType);
          var bi = AUDIT_EVENT_ORDER.indexOf(b.eventType);
          if (ai !== bi) return ai - bi;
          return new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
        });
        for (var i = 0; i < sorted.length; i++) {
          var e = sorted[i];
          var label = MILESTONE_LABELS[e.eventType];
          if (label && !seenLabels[label]) {
            seenLabels[label] = true;
            milestones.push(e);
          }
        }

        var section = document.querySelector('.order-status-timeline');
        if (!section) return;
        var h2 = section.querySelector('h2');
        section.innerHTML = '';
        if (h2) section.appendChild(h2);
        var fragment = document.createDocumentFragment();
        var wrapper = document.createElement('div');
        wrapper.innerHTML = milestones.map(renderMilestone).join('');
        while (wrapper.firstChild) fragment.appendChild(wrapper.firstChild);
        section.appendChild(fragment);
      }).catch(function () {});
    })();
  </script>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});

// GET /orders/:id/esim-activation — eSIM Activation page (Screen 5)
ordersRouter.get('/:id/esim-activation', (req: Request, res: Response) => {
  const { id } = req.params;
  const scenario = (req.query.scenario as string) ?? 'activation_complete';

  const status = buildStatusResponse(id, scenario);
  const milestones = status ? status.milestones : [];

  const paymentMilestone = milestones.find((m) => m.step === 'payment_confirmed');
  const verificationMilestone = milestones.find((m) => m.step === 'verification_complete');

  const paymentComplete = paymentMilestone?.state === 'completed';
  const verificationComplete = verificationMilestone?.state === 'completed';
  const isReadyToActivate = paymentComplete && verificationComplete;

  const verificationBlocked = verificationMilestone?.state === 'blocked';
  const verificationPending = verificationMilestone?.state === 'pending';

  let statusValue: string;
  let statusBannerHtml: string;

  if (isReadyToActivate) {
    statusValue = 'Ready to Activate';
    statusBannerHtml = `
      <div class="esim-status-banner esim-status-banner--ready">
        <strong>Your eSIM is ready to activate</strong>
        <p>Payment confirmed and identity verification completed. You can now activate your eSIM.</p>
      </div>`;
  } else if (verificationBlocked) {
    statusValue = 'Verification Action Required';
    statusBannerHtml = `
      <div class="esim-status-banner esim-status-banner--blocked">
        <strong>Verification blocked — action required</strong>
        <p>Your identity verification could not be completed. Please resubmit your documents to proceed.</p>
      </div>`;
  } else if (verificationPending) {
    statusValue = 'Verification Pending';
    statusBannerHtml = `
      <div class="esim-status-banner esim-status-banner--pending">
        <strong>Verification pending</strong>
        <p>Your identity verification is under review. eSIM activation will be available once verification is complete.</p>
      </div>`;
  } else {
    statusValue = 'Payment Pending';
    statusBannerHtml = `
      <div class="esim-status-banner esim-status-banner--pending">
        <strong>Payment not yet confirmed</strong>
        <p>Your payment is being processed. eSIM activation will be available once payment and verification are complete.</p>
      </div>`;
  }

  const qrAndControlsHtml = isReadyToActivate ? `
      <section class="qr-section">
        <h2>Scan QR Code to Activate</h2>
        <p>Scan this code with your device</p>
        <p>Open your device camera and point it at the QR code</p>
        <div class="qr-code-placeholder" aria-label="QR code for eSIM activation">[QR Code]</div>
        <p>How to scan: Go to Settings &rarr; Cellular/Mobile Data &rarr; Add eSIM &rarr; Use QR Code.</p>

        <div class="manual-activation">
          <h3>Manual Activation Instructions</h3>
          <ol>
            <li>Go to Settings on your device</li>
            <li>Select Cellular or Mobile Data</li>
            <li>Tap Add Cellular Plan or Add eSIM</li>
            <li>Select Enter Details Manually</li>
            <li>Enter the following details:<br>
              SM-DP+ Address: <code>smdp.vodacom.co.za</code><br>
              Activation Code: <code>LPA:1$smdp.vodacom.co.za$ESIM-7001-2026-AMINA</code>
            </li>
            <li>Tap Add and wait for the eSIM to download and activate</li>
          </ol>
        </div>
      </section>

      <div class="esim-controls">
        <button>Download eSIM Profile</button>
        <button>Check Connection Status</button>
      </div>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Activate Your eSIM - Vodacom Shop</title>
  <style>
    .esim-status-banner { padding: 1rem; border-radius: 4px; margin-bottom: 1rem; }
    .esim-status-banner--ready { background: #e8f5e9; border-left: 4px solid #2e7d32; }
    .esim-status-banner--pending { background: #fff8e1; border-left: 4px solid #f57c00; }
    .esim-status-banner--blocked { background: #fbe9e7; border-left: 4px solid #c62828; }
    .reference-card { background: #f9f9f9; padding: 1rem; border: 1px solid #ddd; }
  </style>
</head>
<body>
  <header class="header">
    <a href="/">Vodacom Shop</a>
    <button>Account</button>
  </header>

  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/orders">Orders</a> &rsaquo;
    <a href="/orders/${escapeHtml(id)}">${escapeHtml(id)}</a> &rsaquo;
    eSIM Activation
  </nav>

  <main class="main-content">
    <h1>Activate Your eSIM</h1>
    <p>Follow the steps below to activate your eSIM and start using your new plan</p>

    ${statusBannerHtml}

    ${qrAndControlsHtml}

    <section class="device-compatibility">
      <h3>Need Help?</h3>
      <p>If you&rsquo;re having trouble activating your eSIM, we&rsquo;re here to help</p>
      <a href="#">Contact Support</a>
      <a href="#">View Guide</a>
      <a href="#">Live Chat</a>
    </section>
  </main>

  <aside class="reference-card">
    <h3>Order Reference</h3>
    <dl>
      <dt>Order Number</dt><dd>${escapeHtml(id)}</dd>
      <dt>Order Date</dt><dd>28 July 2026</dd>
      <dt>Customer</dt><dd>Amina Dlamini</dd>
      <dt>eSIM Reference</dt><dd>ESIM-7001-2026</dd>
      <dt>Plan</dt><dd>Unlimited 20GB</dd>
    </dl>
    <p class="reference-card__status">Status: ${statusValue}</p>
    <div class="secure-note">
      <p>Secure Activation — Your eSIM profile is encrypted and can only be activated on your registered device.</p>
    </div>
  </aside>

  <footer class="footer">
    <h4>About Vodacom</h4>
    <a href="#">About Us</a>
    <a href="#">Careers</a>
    <h4>Support</h4>
    <a href="#">Contact Us</a>
    <a href="#">FAQs</a>
    <p>&copy; 2026 Vodacom Group. All rights reserved.</p>
  </footer>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});
