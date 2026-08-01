import { Router, Request, Response } from 'express';

const PORTING_SUPPORTED_MARKETS = new Set(['ZA', 'TZ', 'MZ']);

const REQUIRED_PORTING_FIELDS = [
  'marketCode',
  'donorNetwork',
  'accountHolderName',
  'accountNumber',
  'idNumber',
] as const;

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildBannerHtml(scenario: string): string {
  if (scenario === 'verification_required') {
    return `
  <div class="porting-notice banner--warning"
       role="alert"
       aria-live="assertive"
       tabindex="0"
       style="background:#fff3cd;color:#856404;border-left:4px solid #ffc107;padding:1rem;margin-bottom:1rem;">
    <strong>Additional verification required</strong>
    <p>Your number porting request requires additional verification before it can be processed.
       Please have your identity documents ready. This may affect your expected activation timing.</p>
  </div>`;
  }

  if (scenario === 'delayed_activation') {
    return `
  <div class="porting-notice banner--info"
       role="alert"
       aria-live="polite"
       tabindex="0"
       style="background:#cce5ff;color:#004085;border-left:4px solid #0066cc;padding:1rem;margin-bottom:1rem;">
    <strong>Delayed activation notice</strong>
    <p>Due to number porting processing times, your expected activation may take longer than usual.
       We will notify you when your number has been successfully ported and your service is active.</p>
  </div>`;
  }

  return '';
}

function buildFieldErrors(fields: Record<string, string | undefined>): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];
  for (const field of REQUIRED_PORTING_FIELDS) {
    const value = fields[field];
    if (value === undefined || value === null || value === '') {
      errors.push({ field, message: `${field} is required and must not be empty.` });
    }
  }
  return errors;
}

function renderPortingForm(
  market: string,
  fieldErrors: Array<{ field: string; message: string }>,
  prefilled: Record<string, string>,
): string {
  function fieldError(name: string): string {
    const err = fieldErrors.find((e) => e.field === name);
    if (!err) return '';
    return `<span class="field-error" id="${escapeHtml(name)}-error" role="alert">${escapeHtml(err.message)}</span>`;
  }

  function aria(name: string): string {
    const err = fieldErrors.find((e) => e.field === name);
    return err ? ` aria-describedby="${escapeHtml(name)}-error" aria-invalid="true"` : '';
  }

  const val = (name: string) => escapeHtml(prefilled[name] ?? '');

  return `
  <form method="POST" action="/onboarding/porting" novalidate>
    <input type="hidden" name="marketCode" value="${escapeHtml(market)}">

    <div class="form-group">
      <label for="donorNetwork">Donor Network (current provider) <span aria-hidden="true">*</span></label>
      <input type="text" id="donorNetwork" name="donorNetwork" required
             value="${val('donorNetwork')}"${aria('donorNetwork')}
             placeholder="e.g. MTN, Vodacom, Cell C">
      ${fieldError('donorNetwork')}
    </div>

    <div class="form-group">
      <label for="accountHolderName">Account Holder Name <span aria-hidden="true">*</span></label>
      <input type="text" id="accountHolderName" name="accountHolderName" required
             value="${val('accountHolderName')}"${aria('accountHolderName')}
             placeholder="Full name as on account">
      ${fieldError('accountHolderName')}
    </div>

    <div class="form-group">
      <label for="accountNumber">Account Number <span aria-hidden="true">*</span></label>
      <input type="text" id="accountNumber" name="accountNumber" required
             value="${val('accountNumber')}"${aria('accountNumber')}
             placeholder="Your account number with current provider">
      ${fieldError('accountNumber')}
    </div>

    <div class="form-group">
      <label for="idNumber">ID Number <span aria-hidden="true">*</span></label>
      <input type="text" id="idNumber" name="idNumber" required
             value="${val('idNumber')}"${aria('idNumber')}
             placeholder="South African ID or passport number">
      ${fieldError('idNumber')}
    </div>

    <div class="form-group">
      <label for="portingReference">Notes / Porting Reference (optional)</label>
      <input type="text" id="portingReference" name="portingReference"
             value="${val('portingReference')}"
             placeholder="Optional reference or notes">
    </div>

    <button type="submit">Submit Porting Request</button>
  </form>

  <div class="porting-skip">
    <a href="/onboarding/porting/skip?market=${escapeHtml(market)}">I'm not porting — skip this step</a>
  </div>`;
}

export const onboardingRouter = Router();

// GET /porting/skip — skip the porting step and proceed
onboardingRouter.get('/porting/skip', (req: Request, res: Response) => {
  res.status(200).type('text/html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Onboarding - Vodacom Shop</title>
</head>
<body>
  <header class="header"><a href="/">Vodacom Shop</a></header>
  <main>
    <h1>Onboarding</h1>
    <p>You have chosen to continue without porting your number. You can set up number porting later from your account.</p>
    <a href="/onboarding/next">Continue</a>
  </main>
</body>
</html>`);
});

// GET /porting — render the porting form (or 403 for unsupported markets)
onboardingRouter.get('/porting', (req: Request, res: Response) => {
  const market = (req.query.market as string) ?? '';
  const scenario = (req.query.scenario as string) ?? '';

  if (market && !PORTING_SUPPORTED_MARKETS.has(market)) {
    res.status(403).type('text/html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Porting Not Available - Vodacom Shop</title>
</head>
<body>
  <header class="header"><a href="/">Vodacom Shop</a></header>
  <main>
    <h1>Number Porting Not Available</h1>
    <p>Number porting is not available in your market (${escapeHtml(market)}).</p>
    <a href="/onboarding/porting/skip?market=${escapeHtml(market)}">Continue without porting</a>
  </main>
</body>
</html>`);
    return;
  }

  const bannerHtml = buildBannerHtml(scenario);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Port Your Number - Vodacom Shop</title>
  <style>
    .form-group { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .form-group label { font-weight: 600; }
    .form-group input { padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
    .form-group input[aria-invalid="true"] { border-color: #c62828; }
    .field-error { color: #c62828; font-size: 0.875rem; }
    .porting-skip { margin-top: 1.5rem; }
  </style>
</head>
<body>
  <header class="header">
    <a href="/">Vodacom Shop</a>
    <nav>
      <a href="/catalog">Devices</a>
      <a href="/plans">Plans</a>
      <a href="/support">Support</a>
    </nav>
  </header>

  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/onboarding">Onboarding</a> &rsaquo;
    Port Your Number
  </nav>

  <main class="main-content">
    <h1>Port Your Number</h1>
    <p>Transfer your existing number to Vodacom. This is an optional step — you can skip it if you are not porting.</p>

    ${bannerHtml}

    ${renderPortingForm(market, [], {})}
  </main>
</body>
</html>`;

  res.status(200).type('text/html').send(html);
});

// POST /porting — process porting form submission
onboardingRouter.post('/porting', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;

  const stringFields: Record<string, string> = {};
  for (const key of Object.keys(body)) {
    stringFields[key] = String(body[key] ?? '');
  }

  const errors = buildFieldErrors(stringFields);
  const marketCode = stringFields.marketCode ?? '';

  if (errors.length > 0) {
    if (req.is('application/json')) {
      res.status(422).json({ errorCode: 'VALIDATION_ERROR', errors });
      return;
    }
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Port Your Number - Vodacom Shop</title>
  <style>
    .form-group { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .form-group label { font-weight: 600; }
    .form-group input { padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
    .form-group input[aria-invalid="true"] { border-color: #c62828; }
    .field-error { color: #c62828; font-size: 0.875rem; }
    .porting-skip { margin-top: 1.5rem; }
  </style>
</head>
<body>
  <header class="header">
    <a href="/">Vodacom Shop</a>
    <nav>
      <a href="/catalog">Devices</a>
      <a href="/plans">Plans</a>
      <a href="/support">Support</a>
    </nav>
  </header>

  <nav class="breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/onboarding">Onboarding</a> &rsaquo;
    Port Your Number
  </nav>

  <main class="main-content">
    <h1>Port Your Number</h1>
    <p>Transfer your existing number to Vodacom. This is an optional step — you can skip it if you are not porting.</p>

    ${renderPortingForm(marketCode, errors, stringFields)}
  </main>
</body>
</html>`;
    res.status(422).type('text/html').send(html);
    return;
  }

  if (marketCode && !PORTING_SUPPORTED_MARKETS.has(marketCode)) {
    if (req.is('application/json')) {
      res.status(403).json({
        errorCode: 'PORTING_NOT_SUPPORTED',
        message: `Porting is not supported in market "${marketCode}".`,
      });
      return;
    }
    res.status(403).type('text/html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Porting Not Available - Vodacom Shop</title>
</head>
<body>
  <header class="header"><a href="/">Vodacom Shop</a></header>
  <main>
    <h1>Number Porting Not Available</h1>
    <p>Number porting is not available in your market (${escapeHtml(marketCode)}).</p>
    <a href="/onboarding/porting/skip?market=${escapeHtml(marketCode)}">Continue without porting</a>
  </main>
</body>
</html>`);
    return;
  }

  res.redirect(303, '/onboarding/porting/confirmation');
});

// GET /porting/confirmation — porting request received confirmation page
onboardingRouter.get('/porting/confirmation', (req: Request, res: Response) => {
  res.status(200).type('text/html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Porting Request Received - Vodacom Shop</title>
</head>
<body>
  <header class="header"><a href="/">Vodacom Shop</a></header>
  <main>
    <h1>Porting Request Received</h1>
    <p>Your number porting request has been received. We will contact you to confirm the transfer.</p>
    <a href="/onboarding/next">Continue</a>
  </main>
</body>
</html>`);
});
