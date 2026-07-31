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

const MILESTONE_LABELS: Record<string, string> = {
  order_placed: 'Order Placed',
  payment_confirmed: 'Payment Confirmed',
  verification_complete: 'Verification Complete',
  esim_issued: 'eSIM Issued',
  activation_complete: 'Activation Complete',
};

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

// GET /orders/:id — Order Details page (Screen 6)
ordersRouter.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const scenario = (req.query.scenario as string) ?? 'activation_complete';

  const status = buildStatusResponse(id, scenario);
  const milestones = status ? status.milestones : [];

  const milestonesHtml = milestones.map(renderMilestone).join('');

  const overallState = milestones.length > 0 && milestones.every((m) => m.state === 'completed')
    ? 'Order Complete'
    : 'In Progress';

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
    ${escapeHtml(id)}
  </nav>

  <main class="main-content">
    <h1>Order Details</h1>

    <section class="order-meta">
      <dl>
        <dt>Order Reference</dt><dd>${escapeHtml(id)}</dd>
        <dt>Status</dt><dd>${overallState}</dd>
        <dt>Order Date</dt><dd>28 July 2026, 10:00 AM</dd>
        <dt>Customer</dt><dd>Amina Dlamini</dd>
        <dt>Total Amount</dt><dd>R 20,496.55</dd>
        <dt>Monthly Charge</dt><dd>R 799.00/month</dd>
      </dl>
    </section>

    <section class="order-status-timeline">
      <h2>Order Status Timeline</h2>
      ${milestonesHtml}
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
