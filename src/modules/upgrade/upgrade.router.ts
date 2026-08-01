import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getFinancingQuotesByProductId } from '../../../backend/src/modules/upgrade/financingAdapter';

export const upgradeRouter = Router();

// ── In-memory session store ───────────────────────────────────────────────────

interface UpgradeSessionState {
  eligibility: Record<string, unknown> | null;
  financing: Record<string, unknown> | null;
  tradeIn: Record<string, unknown> | null;
}

const SESSION_COOKIE = 'upgrade_sid';
const sessions = new Map<string, UpgradeSessionState>();

function emptyState(): UpgradeSessionState {
  return { eligibility: null, financing: null, tradeIn: null };
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function resolveSession(
  req: Request,
  res: Response,
): { sessionId: string; state: UpgradeSessionState } {
  const cookies = parseCookies(req.headers.cookie);
  const existing = cookies[SESSION_COOKIE];
  if (existing && sessions.has(existing)) {
    return { sessionId: existing, state: sessions.get(existing)! };
  }
  const sessionId = randomUUID();
  const state = emptyState();
  sessions.set(sessionId, state);
  res.cookie(SESSION_COOKIE, sessionId, { httpOnly: true, sameSite: 'lax' });
  return { sessionId, state };
}

// ── Trade-in valuation data ───────────────────────────────────────────────────

const CONDITION_MULTIPLIERS: Record<string, number> = {
  EXCELLENT: 1.0,
  GOOD: 0.75,
  FAIR: 0.5,
  POOR: 0.25,
};

const BASE_CREDITS: Record<string, number> = {
  Apple: 3000,
  Samsung: 2500,
};

const VALID_CONDITIONS = Object.keys(CONDITION_MULTIPLIERS);

// ── GET /api/upgrade/session ──────────────────────────────────────────────────

upgradeRouter.get('/api/upgrade/session', (req: Request, res: Response) => {
  const { state } = resolveSession(req, res);
  res.status(200).json(state);
});

// ── PUT /api/upgrade/session ──────────────────────────────────────────────────

upgradeRouter.put('/api/upgrade/session', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const ALLOWED_KEYS: Array<keyof UpgradeSessionState> = ['eligibility', 'financing', 'tradeIn'];
  const patch: Partial<UpgradeSessionState> = {};
  const errors: Array<{ field: string; message: string }> = [];

  for (const key of ALLOWED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      const v = body[key];
      if (Array.isArray(v)) {
        errors.push({ field: key, message: `${key} must be a plain object or null, not an array.` });
      } else if (v !== null && typeof v !== 'object') {
        errors.push({ field: key, message: `${key} must be a plain object or null.` });
      } else {
        patch[key] = v as Record<string, unknown> | null;
      }
    }
  }

  if (errors.length > 0) {
    res.status(422).json({ errorCode: 'VALIDATION_ERROR', errors });
    return;
  }

  const hasKnownKey = ALLOWED_KEYS.some((k) =>
    Object.prototype.hasOwnProperty.call(body, k),
  );
  if (!hasKnownKey) {
    res.status(422).json({
      errorCode: 'VALIDATION_ERROR',
      message: 'Body must contain at least one of: eligibility, financing, tradeIn.',
    });
    return;
  }

  const { sessionId, state } = resolveSession(req, res);
  const updated: UpgradeSessionState = { ...state, ...patch };
  sessions.set(sessionId, updated);
  res.status(200).json(updated);
});

// ── POST /api/upgrade/trade-in/valuation ─────────────────────────────────────

upgradeRouter.post('/api/upgrade/trade-in/valuation', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const errors: Array<{ field: string; message: string }> = [];

  for (const field of ['brand', 'model'] as const) {
    const v = body[field];
    if (v === undefined || v === null || v === '') {
      errors.push({ field, message: `${field} is required and must not be empty.` });
    }
  }

  const condition = body.condition;
  if (condition === undefined || condition === null || condition === '') {
    errors.push({ field: 'condition', message: 'condition is required and must not be empty.' });
  } else if (!VALID_CONDITIONS.includes(condition as string)) {
    errors.push({
      field: 'condition',
      message: `condition must be one of: ${VALID_CONDITIONS.join(', ')}.`,
    });
  }

  const storage = body.storage;
  if (storage === undefined || storage === null) {
    errors.push({ field: 'storage', message: 'storage is required and must not be empty.' });
  } else if (typeof storage !== 'number' || !Number.isFinite(storage) || storage < 0) {
    errors.push({ field: 'storage', message: 'storage must be a non-negative number.' });
  }

  if (errors.length > 0) {
    res.status(422).json({ errorCode: 'VALIDATION_ERROR', errors });
    return;
  }

  const brand = body.brand as string;
  const cond = condition as string;
  const base = BASE_CREDITS[brand] ?? 1000;
  const multiplier = CONDITION_MULTIPLIERS[cond];
  const estimatedCredit = Math.round(base * multiplier);
  const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  res.status(200).json({ estimatedCredit, validUntil, asyncPending: true });
});

// ── GET /api/upgrade/financing ───────────────────────────────────────────────

upgradeRouter.get('/api/upgrade/financing', (req: Request, res: Response) => {
  const productId = req.query.productId as string | undefined;
  if (!productId || !productId.trim()) {
    res.status(400).json({ errorCode: 'PRODUCT_ID_REQUIRED', message: 'Query parameter productId is required.' });
    return;
  }
  const quotes = getFinancingQuotesByProductId(productId);
  if (quotes === null) {
    res.status(404).json({ errorCode: 'PRODUCT_NOT_FOUND', message: `No financing options found for product "${productId}".` });
    return;
  }
  res.status(200).json(quotes);
});

// ── GET /upgrade/eligibility (Screen 4) ──────────────────────────────────────

upgradeRouter.get('/upgrade/eligibility', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Your Upgrade Eligibility - Vodacom Shop</title>
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
    <button>0</button>
  </header>

  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/account">Account</a> &rsaquo;
    Upgrade Eligibility
  </nav>

  <h1>Your Upgrade Eligibility</h1>

  <section class="eligibility-banner">
    <h2>You're eligible for an upgrade!</h2>
    <p>Your contract has reached the upgrade window. Choose from our latest devices and plans.</p>
  </section>

  <section class="current-plan">
    <h2>Your Current Plan</h2>
    <dl>
      <dt>Plan Name</dt><dd>Vodacom Red 10GB</dd>
      <dt>Monthly Cost</dt><dd>R 499.00</dd>
      <dt>Contract End Date</dt><dd>31 Dec 2026</dd>
    </dl>

    <div class="cta-card financing-cta">
      <h3>Explore Financing Options</h3>
      <p>Spread the cost of your new device with flexible payment plans</p>
      <span id="financing-pending-notice" class="pending-notice">Your financing quote is pending review. We will notify you once it is confirmed.</span>
      <a href="/product/iphone-15-pro/configure?financing=true&amp;productId=iphone-15-pro">Get a Quote</a>
      <a href="/upgrade/financing" class="secondary-link">View Financing Details</a>
    </div>

    <div class="cta-card trade-in-cta">
      <h3>Trade In Your Current Device</h3>
      <p>Get up to R 5,000 credit towards your upgrade</p>
      <a href="/upgrade/trade-in">Get a Valuation</a>
    </div>
  </section>

  <section class="upgrade-options">
    <h2>Available Upgrade Devices</h2>
    <div class="device-grid">
      <div class="device-card">
        <h3>iPhone 15 Pro 256GB</h3>
        <p>R 24,999</p>
        <a href="/product/iphone-15-pro">View Details</a>
      </div>
      <div class="device-card">
        <h3>Samsung Galaxy S24 Ultra</h3>
        <p>R 22,999</p>
        <a href="/product/samsung-s24-ultra">View Details</a>
      </div>
      <div class="device-card">
        <h3>iPhone 15 128GB</h3>
        <p>R 18,999</p>
        <a href="/product/iphone-15">View Details</a>
      </div>
    </div>
  </section>

  <section class="next-steps">
    <h2>Ready to Upgrade?</h2>
    <p>Choose a device and configure your new plan</p>
    <a href="/catalog">Continue Shopping</a>
    <a href="/support">Contact Support</a>
  </section>

  <script>
    // On mount, call GET /api/upgrade/session to rehydrate previously entered values
    fetch('/api/upgrade/session').catch(function() {});

    // Notice is rendered server-side when asyncPending is true (always the case).
  </script>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});

// ── GET /upgrade/trade-in (Screen 10) ────────────────────────────────────────

upgradeRouter.get('/upgrade/trade-in', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Trade In Your Device - Vodacom Shop</title>
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
    <button>Account</button>
    <button>Cart</button>
  </header>

  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/account">Account</a> &rsaquo;
    Trade-In
  </nav>

  <main class="main-content">
    <h1>Trade In Your Device</h1>
    <p>Get instant credit towards your new device by trading in your current one</p>
    <p><strong>How it works:</strong> Select your device, tell us about its condition, and get an instant valuation. Your trade-in credit will be applied at checkout after device inspection.</p>

    <form id="trade-in-form" data-valuation-url="/api/upgrade/trade-in/valuation">

      <section>
        <h2>Device Details</h2>

        <label for="device-brand">Device Brand</label>
        <select id="device-brand" name="device-brand" onchange="updateValuation()">
          <option value="">Select brand</option>
          <option value="Apple">Apple</option>
          <option value="Samsung">Samsung</option>
          <option value="Huawei">Huawei</option>
          <option value="Xiaomi">Xiaomi</option>
          <option value="Oppo">Oppo</option>
        </select>

        <label for="device-model">Device Model</label>
        <select id="device-model" name="device-model" onchange="updateValuation()">
          <option value="">Select model</option>
          <option value="iPhone 12">iPhone 12</option>
          <option value="iPhone 12 Pro">iPhone 12 Pro</option>
          <option value="iPhone 12 Pro Max">iPhone 12 Pro Max</option>
          <option value="iPhone 11">iPhone 11</option>
          <option value="iPhone XR">iPhone XR</option>
        </select>

        <label for="device-storage">Storage Capacity</label>
        <select id="device-storage" name="device-storage" onchange="updateValuation()">
          <option value="">Select storage</option>
          <option value="64">64GB</option>
          <option value="128">128GB</option>
          <option value="256">256GB</option>
          <option value="512">512GB</option>
        </select>
      </section>

      <section>
        <h2>Device Condition</h2>
        <p>Select the option that best describes your device's condition</p>

        <label>
          <input type="radio" name="condition" value="excellent" onchange="updateValuation()">
          <strong>Excellent</strong>
          <span>Like new, no visible scratches or damage, fully functional</span>
        </label>
        <label>
          <input type="radio" name="condition" value="good" onchange="updateValuation()">
          <strong>Good</strong>
          <span>Minor scratches or wear, screen intact, fully functional</span>
        </label>
        <label>
          <input type="radio" name="condition" value="fair" onchange="updateValuation()">
          <strong>Fair</strong>
          <span>Visible scratches or dents, screen may have minor cracks, fully functional</span>
        </label>
        <label>
          <input type="radio" name="condition" value="poor" onchange="updateValuation()">
          <strong>Poor</strong>
          <span>Significant damage, cracked screen, may have functional issues</span>
        </label>
      </section>

      <div class="trade-in-terms">
        <h3>Trade-In Terms &amp; Conditions</h3>
        <ul>
          <li>Device must be in working condition with no activation locks</li>
          <li>Final valuation subject to physical inspection upon receipt</li>
          <li>Credit will be applied within 5-7 business days after inspection</li>
          <li>Device must match the specifications provided in this form</li>
          <li>You must be the legal owner of the device being traded in</li>
          <li>All personal data must be removed before shipping</li>
        </ul>
      </div>

    </form>
  </main>

  <aside class="summary-card">
    <h3>Trade-In Summary</h3>
    <dl>
      <dt>Device</dt><dd id="summary-device">&mdash;</dd>
      <dt>Condition</dt><dd id="summary-condition">&mdash;</dd>
      <dt>Estimated Credit</dt><dd id="summary-credit">&mdash;</dd>
      <dt>Valid Until</dt><dd id="summary-valid-until">&mdash;</dd>
    </dl>
    <button id="btn-apply-credit" type="button">Apply Credit to Order</button>
    <button id="btn-back" type="button">Back to Upgrade Options</button>
    <p class="secure-notice">Secure Trade-In Process &mdash; Your device will be securely inspected and recycled responsibly. All data will be permanently erased.</p>
  </aside>

  <footer class="footer">
    <h4>About Vodacom</h4>
    <a href="#">About Us</a>
    <a href="#">Careers</a>
    <a href="#">Press</a>
    <a href="#">Investors</a>
    <h4>Support</h4>
    <a href="#">Contact Us</a>
    <a href="#">FAQs</a>
    <a href="#">Store Locator</a>
    <a href="#">Coverage Map</a>
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
    <p>&copy; 2026 Vodacom Group. All rights reserved. South Africa</p>
  </footer>

  <script>
    var VALUATION_URL = '/api/upgrade/trade-in/valuation';

    // Closure variables holding raw API values from the last valuation response
    var lastEstimatedCredit = null;
    var lastValidUntil = null;

    // On mount, rehydrate previously entered values from session
    fetch('/api/upgrade/session')
      .then(function(r) { return r.json(); })
      .then(function(session) {
        if (!session || !session.tradeIn) return;
        var ti = session.tradeIn;
        if (ti.brand) {
          var brandSel = document.querySelector('[name="device-brand"]');
          if (brandSel) brandSel.value = ti.brand;
        }
        if (ti.model) {
          var modelSel = document.querySelector('[name="device-model"]');
          if (modelSel) modelSel.value = ti.model;
        }
        if (ti.storage) {
          var storageSel = document.querySelector('[name="device-storage"]');
          if (storageSel) storageSel.value = ti.storage;
        }
        if (ti.condition) {
          var radio = document.querySelector('[name="condition"][value="' + ti.condition + '"]');
          if (radio) radio.checked = true;
        }
        if (ti.estimatedCredit !== undefined && ti.estimatedCredit !== null) {
          lastEstimatedCredit = ti.estimatedCredit;
        }
        if (ti.validUntil) {
          lastValidUntil = ti.validUntil;
        }
      })
      .catch(function() {});

    function updateValuation() {
      var brandSel = document.querySelector('[name="device-brand"]');
      var modelSel = document.querySelector('[name="device-model"]');
      var storageSel = document.querySelector('[name="device-storage"]');
      var condEl = document.querySelector('[name="condition"]:checked');

      var brand = brandSel ? brandSel.value : '';
      var model = modelSel ? modelSel.value : '';
      var storageRaw = storageSel ? parseInt(storageSel.value, 10) : 0;
      var condition = condEl ? condEl.value : '';

      if (!brand || !model || !storageRaw || !condition) return;

      fetch(VALUATION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brand,
          model: model,
          storage: storageRaw,
          condition: condition.toUpperCase()
        })
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.estimatedCredit === undefined) return;
          // Capture raw API values in closure variables
          lastEstimatedCredit = data.estimatedCredit;
          lastValidUntil = data.validUntil;
          var storageLabel = storageSel.value + 'GB';
          document.getElementById('summary-device').textContent =
            brand + ' ' + model + ' ' + storageLabel;
          document.getElementById('summary-condition').textContent =
            condition.charAt(0).toUpperCase() + condition.slice(1);
          document.getElementById('summary-credit').textContent =
            'R ' + data.estimatedCredit.toLocaleString();
          var d = new Date(data.validUntil);
          document.getElementById('summary-valid-until').textContent =
            d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
        })
        .catch(function() {});
    }

    function currentFormValues() {
      var brandSel = document.querySelector('[name="device-brand"]');
      var modelSel = document.querySelector('[name="device-model"]');
      var storageSel = document.querySelector('[name="device-storage"]');
      var condEl = document.querySelector('[name="condition"]:checked');
      return {
        brand: brandSel ? brandSel.value : '',
        model: modelSel ? modelSel.value : '',
        storage: storageSel ? storageSel.value : '',
        condition: condEl ? condEl.value : ''
      };
    }

    document.getElementById('btn-apply-credit').addEventListener('click', function() {
      var vals = currentFormValues();

      fetch('/api/upgrade/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeIn: {
            brand: vals.brand,
            model: vals.model,
            storage: vals.storage,
            condition: vals.condition,
            device: vals.brand + ' ' + vals.model + ' ' + vals.storage + 'GB',
            estimatedCredit: lastEstimatedCredit,
            validUntil: lastValidUntil
          }
        })
      })
        .then(function() {
          window.location.href = '/cart';
        })
        .catch(function() {
          window.location.href = '/cart';
        });
    });

    document.getElementById('btn-back').addEventListener('click', function() {
      var vals = currentFormValues();

      fetch('/api/upgrade/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeIn: {
            brand: vals.brand,
            model: vals.model,
            storage: vals.storage,
            condition: vals.condition
          }
        })
      })
        .then(function() {
          window.location.href = '/upgrade/eligibility';
        })
        .catch(function() {
          window.location.href = '/upgrade/eligibility';
        });
    });
  </script>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});
