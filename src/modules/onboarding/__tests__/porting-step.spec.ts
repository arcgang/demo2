import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Number Porting step in the Onboarding UI
 *
 * Screen : GET /onboarding/porting              (porting form page)
 *          GET /onboarding/porting?market=<code> (market-aware variant)
 *          POST /onboarding/porting              (form submission)
 *
 * The porting step is part of the onboarding flow. It is conditionally shown
 * when the active market supports porting (markets ZA, TZ, MZ) and hidden /
 * returns 403 for markets that do not. The form collects the PortingInput
 * fields, validates them client-side (required attributes) and surfaces
 * field-level errors from a 422 backend response inline.
 *
 * Acceptance criteria encoded here:
 *  AC-1  The porting step is conditionally rendered only when the market
 *        supports porting; markets without porting get a 403 or the step is
 *        omitted from the flow.
 *  AC-2  The form collects all PortingInput fields: donorNetwork,
 *        accountHolderName, accountNumber, idNumber, and optional notes
 *        (portingReference). All required fields carry a required attribute.
 *  AC-3  The submit button is disabled (or the form enforces required fields)
 *        until all required fields are present; optional field absence does
 *        NOT block submission.
 *  AC-4  On a 422 response from the backend, field-level error messages
 *        appear inline next to the offending fields.
 *  AC-5  A prominent, accessible banner is rendered when the backend signals
 *        verification_required or delayed_activation in its response.
 *  AC-6  The banner is keyboard-focusable (tabindex attribute) and carries
 *        sufficient contrast markup (WCAG 2.1 AA — role="alert" or
 *        aria-live="polite" present, and a high-contrast color class).
 *  AC-7  The form step can be skipped: a "Skip" / "I'm not porting" control
 *        is present and does NOT require the form to be filled.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getPortingPage(market = 'ZA'): Promise<request.Response> {
  return request(app).get(`/onboarding/porting?market=${market}`);
}

async function postPortingForm(
  payload: Record<string, unknown>,
): Promise<request.Response> {
  return request(app)
    .post('/onboarding/porting')
    .set('Content-Type', 'application/json')
    .send(payload);
}

const VALID_PAYLOAD = {
  marketCode: 'ZA',
  donorNetwork: 'MTN',
  accountHolderName: 'Amina Dlamini',
  accountNumber: 'ACC123456',
  idNumber: '9001015800088',
};

// ---------------------------------------------------------------------------
// AC-1  Porting step is conditional on market support
// ---------------------------------------------------------------------------

describe('Onboarding porting step – AC-1: conditional rendering by market', () => {
  it('returns HTTP 200 for a market that supports porting (ZA)', async () => {
    const res = await getPortingPage('ZA');
    expect(res.status).toBe(200);
  });

  it('Content-Type is text/html for the porting page', async () => {
    const res = await getPortingPage('ZA');
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });

  it('porting form is present in the HTML for market ZA', async () => {
    const res = await getPortingPage('ZA');
    expect(res.text).toMatch(/<form[^>]*>/i);
  });

  it('returns HTTP 200 for market TZ (also porting-supported)', async () => {
    const res = await getPortingPage('TZ');
    expect(res.status).toBe(200);
  });

  it('porting form is present for market TZ', async () => {
    const res = await getPortingPage('TZ');
    expect(res.text).toMatch(/<form[^>]*>/i);
  });

  it('returns HTTP 200 for market MZ (also porting-supported)', async () => {
    const res = await getPortingPage('MZ');
    expect(res.status).toBe(200);
  });

  it('returns 403 or omits the porting form for an unsupported market (XX)', async () => {
    const res = await getPortingPage('XX');
    // Either a 403 status OR the page does not render a porting form
    const formAbsent = !/<form[^>]*>/i.test(res.text);
    expect(res.status === 403 || formAbsent).toBe(true);
  });

  it('page title or H1 references porting or number transfer', async () => {
    const res = await getPortingPage('ZA');
    expect(res.text).toMatch(/(porting|number transfer|port your number)/i);
  });
});

// ---------------------------------------------------------------------------
// AC-2  Form fields match PortingInput schema
// ---------------------------------------------------------------------------

describe('Onboarding porting step – AC-2: form collects all PortingInput fields', () => {
  let html: string;
  beforeAll(async () => {
    const res = await getPortingPage('ZA');
    html = res.text;
  });

  it('form contains a donorNetwork input', () => {
    expect(html).toMatch(/name=["']donorNetwork["']/i);
  });

  it('form contains an accountHolderName input', () => {
    expect(html).toMatch(/name=["']accountHolderName["']/i);
  });

  it('form contains an accountNumber input', () => {
    expect(html).toMatch(/name=["']accountNumber["']/i);
  });

  it('form contains an idNumber input', () => {
    expect(html).toMatch(/name=["']idNumber["']/i);
  });

  it('form contains a portingReference / notes input (optional field)', () => {
    expect(html).toMatch(/name=["'](portingReference|notes)["']/i);
  });

  it('donorNetwork is marked as required', () => {
    expect(html).toMatch(/name=["']donorNetwork["'][^>]*required|required[^>]*name=["']donorNetwork["']/i);
  });

  it('accountHolderName is marked as required', () => {
    expect(html).toMatch(/name=["']accountHolderName["'][^>]*required|required[^>]*name=["']accountHolderName["']/i);
  });

  it('accountNumber is marked as required', () => {
    expect(html).toMatch(/name=["']accountNumber["'][^>]*required|required[^>]*name=["']accountNumber["']/i);
  });

  it('idNumber is marked as required', () => {
    expect(html).toMatch(/name=["']idNumber["'][^>]*required|required[^>]*name=["']idNumber["']/i);
  });

  it('portingReference / notes input is NOT marked as required (optional field)', () => {
    // The optional field element must not have the required attribute
    expect(html).not.toMatch(/name=["'](portingReference|notes)["'][^>]*required(?!=false)/i);
  });

  it('a submit button is present in the porting form', () => {
    expect(html).toMatch(/<button[^>]*type=["']submit["']|<input[^>]*type=["']submit["']/i);
  });

  it('visible labels are present for all required fields (donor network label)', () => {
    expect(html).toMatch(/(donor network|donor provider)/i);
  });

  it('visible label for account holder name is present', () => {
    expect(html).toMatch(/account holder/i);
  });

  it('visible label for account number is present', () => {
    expect(html).toMatch(/account number/i);
  });

  it('visible label for ID number is present', () => {
    expect(html).toMatch(/id number/i);
  });
});

// ---------------------------------------------------------------------------
// AC-3  Submit button disabled until required fields are filled
// ---------------------------------------------------------------------------

describe('Onboarding porting step – AC-3: submit disabled without required fields', () => {
  it('submit button carries a disabled attribute or data-requires-fields marker in the initial page state', async () => {
    const res = await getPortingPage('ZA');
    // Either the button is rendered as disabled, or the form uses required fields
    // (both are valid client-side enforcement strategies)
    const hasDisabledButton = /type=["']submit["'][^>]*disabled|disabled[^>]*type=["']submit["']/i.test(res.text);
    const hasRequiredFields = /required/i.test(res.text);
    expect(hasDisabledButton || hasRequiredFields).toBe(true);
  });

  it('all required field inputs carry the required attribute so the browser blocks submission', async () => {
    const res = await getPortingPage('ZA');
    // Count how many of the four required fields carry required
    const requiredCount = [
      /name=["']donorNetwork["'][^>]*required/i,
      /name=["']accountHolderName["'][^>]*required/i,
      /name=["']accountNumber["'][^>]*required/i,
      /name=["']idNumber["'][^>]*required/i,
    ].filter((re) => re.test(res.text)).length;
    expect(requiredCount).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// AC-4  422 response → inline field-level error messages
// ---------------------------------------------------------------------------

describe('Onboarding porting step – AC-4: 422 surfaces inline field errors', () => {
  it('POST with missing donorNetwork returns a page containing a donorNetwork error', async () => {
    const payload = { ...VALID_PAYLOAD };
    delete (payload as Record<string, unknown>).donorNetwork;
    const res = await postPortingForm(payload);
    // Accepts either: 422 JSON with field errors, or re-rendered HTML with inline error
    if (res.status === 422) {
      const body = res.body as { errors?: Array<{ field: string }> };
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors!.some((e) => e.field === 'donorNetwork')).toBe(true);
    } else {
      expect(res.text).toMatch(/(donorNetwork|donor network)/i);
      expect(res.text).toMatch(/(error|required|invalid)/i);
    }
  });

  it('POST with missing accountHolderName returns a donorNetwork field-error or re-rendered page with error', async () => {
    const payload = { ...VALID_PAYLOAD };
    delete (payload as Record<string, unknown>).accountHolderName;
    const res = await postPortingForm(payload);
    if (res.status === 422) {
      const body = res.body as { errors?: Array<{ field: string }> };
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors!.some((e) => e.field === 'accountHolderName')).toBe(true);
    } else {
      expect(res.text).toMatch(/(accountHolderName|account holder)/i);
      expect(res.text).toMatch(/(error|required|invalid)/i);
    }
  });

  it('POST with missing accountNumber returns an accountNumber field-error', async () => {
    const payload = { ...VALID_PAYLOAD };
    delete (payload as Record<string, unknown>).accountNumber;
    const res = await postPortingForm(payload);
    if (res.status === 422) {
      const body = res.body as { errors?: Array<{ field: string }> };
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors!.some((e) => e.field === 'accountNumber')).toBe(true);
    } else {
      expect(res.text).toMatch(/(accountNumber|account number)/i);
      expect(res.text).toMatch(/(error|required|invalid)/i);
    }
  });

  it('POST with missing idNumber returns an idNumber field-error', async () => {
    const payload = { ...VALID_PAYLOAD };
    delete (payload as Record<string, unknown>).idNumber;
    const res = await postPortingForm(payload);
    if (res.status === 422) {
      const body = res.body as { errors?: Array<{ field: string }> };
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors!.some((e) => e.field === 'idNumber')).toBe(true);
    } else {
      expect(res.text).toMatch(/(idNumber|id number)/i);
      expect(res.text).toMatch(/(error|required|invalid)/i);
    }
  });

  it('POST with all valid fields does NOT return a 422 or inline error page', async () => {
    const res = await postPortingForm(VALID_PAYLOAD);
    expect(res.status).not.toBe(422);
  });

  it('POST without the optional portingReference does NOT produce a portingReference error', async () => {
    const payload = { ...VALID_PAYLOAD };
    const res = await postPortingForm(payload);
    if (res.status === 422) {
      const body = res.body as { errors?: Array<{ field: string }> };
      const hasPortingRefError = body.errors?.some((e) => e.field === 'portingReference');
      expect(hasPortingRefError).toBeFalsy();
    }
    // Non-422 response is also acceptable (no error at all)
  });

  it('re-rendered error page identifies which specific field(s) failed, not just a generic error', async () => {
    const payload = { ...VALID_PAYLOAD };
    delete (payload as Record<string, unknown>).donorNetwork;
    const res = await postPortingForm(payload);
    if (res.status !== 422 && res.headers['content-type']?.includes('text/html')) {
      // The re-rendered page must contain a field-specific indicator, not only "error"
      const mentionsField =
        /donorNetwork|donor network/i.test(res.text);
      expect(mentionsField).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-5  verification_required / delayed_activation banner
// ---------------------------------------------------------------------------

describe('Onboarding porting step – AC-5: verification/delayed-activation banner', () => {
  it('GET /onboarding/porting?scenario=verification_required renders a prominent banner', async () => {
    const res = await request(app).get('/onboarding/porting?market=ZA&scenario=verification_required');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/(verification required|additional verification|verify your identity)/i);
  });

  it('banner for verification_required is a visually prominent element (banner, alert, or notice class)', async () => {
    const res = await request(app).get('/onboarding/porting?market=ZA&scenario=verification_required');
    expect(res.text).toMatch(/class=["'][^"']*(banner|alert|notice|warning|info-banner|porting-notice)[^"']*["']/i);
  });

  it('GET /onboarding/porting?scenario=delayed_activation renders a prominent banner', async () => {
    const res = await request(app).get('/onboarding/porting?market=ZA&scenario=delayed_activation');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/(delayed activation|activation timing|activation may take longer|expected activation)/i);
  });

  it('banner for delayed_activation is a visually prominent element', async () => {
    const res = await request(app).get('/onboarding/porting?market=ZA&scenario=delayed_activation');
    expect(res.text).toMatch(/class=["'][^"']*(banner|alert|notice|warning|info-banner|porting-notice)[^"']*["']/i);
  });

  it('a normal porting page (no special scenario) does NOT show the verification_required banner', async () => {
    const res = await getPortingPage('ZA');
    expect(res.text).not.toMatch(/verification required/i);
  });

  it('a normal porting page does NOT show the delayed_activation banner', async () => {
    const res = await getPortingPage('ZA');
    expect(res.text).not.toMatch(/delayed activation/i);
  });
});

// ---------------------------------------------------------------------------
// AC-6  Banner is keyboard-focusable and meets WCAG 2.1 AA contrast markers
// ---------------------------------------------------------------------------

describe('Onboarding porting step – AC-6: banner accessibility (keyboard-focusable, WCAG AA)', () => {
  it('verification_required banner is keyboard-focusable (tabindex attribute present)', async () => {
    const res = await request(app).get('/onboarding/porting?market=ZA&scenario=verification_required');
    expect(res.text).toMatch(/tabindex=["'][^"']*["']/i);
  });

  it('verification_required banner carries role="alert" or aria-live for screen reader announcement', async () => {
    const res = await request(app).get('/onboarding/porting?market=ZA&scenario=verification_required');
    expect(res.text).toMatch(/role=["']alert["']|aria-live=["'](polite|assertive)["']/i);
  });

  it('delayed_activation banner is keyboard-focusable (tabindex attribute present)', async () => {
    const res = await request(app).get('/onboarding/porting?market=ZA&scenario=delayed_activation');
    expect(res.text).toMatch(/tabindex=["'][^"']*["']/i);
  });

  it('delayed_activation banner carries role="alert" or aria-live for screen reader announcement', async () => {
    const res = await request(app).get('/onboarding/porting?market=ZA&scenario=delayed_activation');
    expect(res.text).toMatch(/role=["']alert["']|aria-live=["'](polite|assertive)["']/i);
  });

  it('banner element carries a high-contrast CSS class or inline style (WCAG AA signal)', async () => {
    const res = await request(app).get('/onboarding/porting?market=ZA&scenario=verification_required');
    // Accept a color/contrast class convention matching the rest of the codebase
    expect(res.text).toMatch(
      /class=["'][^"']*(banner--warning|banner--info|banner--alert|high-contrast|porting-notice)[^"']*["']|style=["'][^"']*(background|color)[^"']*["']/i,
    );
  });
});

// ---------------------------------------------------------------------------
// AC-7  The porting step can be skipped
// ---------------------------------------------------------------------------

describe('Onboarding porting step – AC-7: step can be skipped', () => {
  it('the porting page contains a "Skip" or "I\'m not porting" control', async () => {
    const res = await getPortingPage('ZA');
    expect(res.text).toMatch(/(skip|not porting|continue without porting|no.*porting)/i);
  });

  it('the skip control is a link or button (not inside the porting form submit)', async () => {
    const res = await getPortingPage('ZA');
    expect(res.text).toMatch(/<a[^>]*(skip|not.*porting)[^>]*>|<button[^>]*(skip|not.*porting)[^>]*>|(skip|not.*porting)[^<]*<\/(a|button)>/i);
  });

  it('the skip control does not require any form field to be filled (no required attribute on skip)', async () => {
    const res = await getPortingPage('ZA');
    // The skip element itself must not carry required
    expect(res.text).not.toMatch(/(skip|not.*porting)[^<]*required/i);
  });

  it('GET /onboarding/porting/skip proceeds without error (navigates past the porting step)', async () => {
    const res = await request(app).get('/onboarding/porting/skip?market=ZA');
    // Accepts a redirect (3xx) or a success page (200)
    expect(res.status === 200 || (res.status >= 301 && res.status <= 303)).toBe(true);
  });
});
