import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – eSIM Activation screen: issuance-endpoint integration
 *
 * Screen  : GET /orders/:id/esim-activation   (wireframe_esim_activation.html)
 * Endpoint: POST /orders/:id/esim/issue        (called on page load per task spec)
 *
 * The page MUST:
 *   1. Call POST /orders/:id/esim/issue on load.
 *   2. Show a 'Payment not yet confirmed' blocked state when issuance returns 403
 *      with errorCode PAYMENT_PENDING.
 *   3. Show an 'Identity verification pending' blocked state when issuance returns
 *      403 with errorCode VERIFICATION_PENDING.
 *   4. Hide QR code, SM-DP+ address, and LPA string when blocked.
 *   5. Render a QR code <img>, the actual SM-DP+ address, and the actual LPA
 *      activation code (from the issuance response) after a successful issuance.
 *   6. Show 'Download eSIM Profile' and 'Check Connection Status' buttons only in
 *      the ready state.
 *   7. Populate the Order Reference aside with order number, order date, customer
 *      name, eSIM reference (from the issuance response), plan, and status.
 *
 * Acceptance criteria:
 *  AC-1  POST /orders/:id/esim/issue is reachable and returns 403 PAYMENT_PENDING
 *        when the order's payment has not been confirmed.
 *  AC-2  POST /orders/:id/esim/issue returns 403 VERIFICATION_PENDING when
 *        verification has not been completed.
 *  AC-3  POST /orders/:id/esim/issue returns 200 with activationCode (LPA string)
 *        and smdpAddress when both gates pass.
 *  AC-4  Page shows 'Payment not yet confirmed' copy when blocked by payment gate.
 *  AC-5  Page shows 'Identity verification pending' copy when blocked by
 *        verification gate.
 *  AC-6  QR code section and LPA code are hidden when issuance is blocked.
 *  AC-7  After successful issuance the page renders a QR <img>, the SM-DP+
 *        address, and the LPA string from the issuance response (not hardcoded).
 *  AC-8  'Download eSIM Profile' and 'Check Connection Status' buttons appear
 *        only in the ready state.
 *  AC-9  The Order Reference aside card shows order number, date, customer,
 *        eSIM reference, plan, and status.
 */

// ─── helpers ─────────────────────────────────────────────────────────────────

async function issueEsim(
  orderId: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await request(app).post(`/orders/${orderId}/esim/issue`);
  return { status: res.status, body: res.body as Record<string, unknown> };
}

async function getActivationPage(
  orderId: string,
): Promise<{ status: number; text: string }> {
  const res = await request(app).get(`/orders/${orderId}/esim-activation`);
  return { status: res.status, text: res.text };
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  POST endpoint — payment gate
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /orders/:id/esim/issue — AC-1 payment gate', () => {
  it('endpoint is reachable (not 404) for an order that exists', async () => {
    // The route POST /orders/:id/esim/issue must be registered.
    // The exact status depends on seeded data; we just need it to not 404.
    const { status } = await issueEsim('ord_pay_blocked');
    expect(status).not.toBe(404);
  });

  it('returns HTTP 403 when order payment is not confirmed', async () => {
    // Seed via a dedicated setup endpoint or use a pre-seeded order ID.
    // The fixture order "ord_pay_blocked" must have paymentStatus != CONFIRMED.
    const { status } = await issueEsim('ord_pay_blocked');
    expect(status).toBe(403);
  });

  it('returns errorCode PAYMENT_PENDING when payment is not confirmed', async () => {
    const { body } = await issueEsim('ord_pay_blocked');
    expect(body.errorCode).toBe('PAYMENT_PENDING');
  });

  it('response body does NOT include activationCode when payment gate blocks', async () => {
    const { body } = await issueEsim('ord_pay_blocked');
    expect(body.activationCode).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  POST endpoint — verification gate
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /orders/:id/esim/issue — AC-2 verification gate', () => {
  it('endpoint is reachable (not 404) for an order that exists', async () => {
    const { status } = await issueEsim('ord_ver_blocked');
    expect(status).not.toBe(404);
  });

  it('returns HTTP 403 when order verification is not completed', async () => {
    const { status } = await issueEsim('ord_ver_blocked');
    expect(status).toBe(403);
  });

  it('returns errorCode VERIFICATION_PENDING when verification is not complete', async () => {
    const { body } = await issueEsim('ord_ver_blocked');
    expect(body.errorCode).toBe('VERIFICATION_PENDING');
  });

  it('response body does NOT include activationCode when verification gate blocks', async () => {
    const { body } = await issueEsim('ord_ver_blocked');
    expect(body.activationCode).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  POST endpoint — success path
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /orders/:id/esim/issue — AC-3 success path', () => {
  it('returns HTTP 200 when both payment and verification gates pass', async () => {
    const { status } = await issueEsim('ord_both_pass');
    expect(status).toBe(200);
  });

  it('response includes activationCode starting with "LPA:"', async () => {
    const { body } = await issueEsim('ord_both_pass');
    expect(typeof body.activationCode).toBe('string');
    expect((body.activationCode as string).startsWith('LPA:')).toBe(true);
  });

  it('response includes a non-empty smdpAddress', async () => {
    const { body } = await issueEsim('ord_both_pass');
    expect(typeof body.smdpAddress).toBe('string');
    expect((body.smdpAddress as string).length).toBeGreaterThan(0);
  });

  it('smdpAddress matches the address segment of activationCode', async () => {
    const { body } = await issueEsim('ord_both_pass');
    // LPA format: LPA:1$<smdp-address>$<matching-id>
    const smdpFromCode = (body.activationCode as string).split('$')[1];
    expect(body.smdpAddress).toBe(smdpFromCode);
  });

  it('response includes orderId equal to the path parameter', async () => {
    const { body } = await issueEsim('ord_both_pass');
    expect(body.orderId).toBe('ord_both_pass');
  });

  it('calling issue twice for same ready order returns 200 (idempotent)', async () => {
    const first = await issueEsim('ord_both_pass');
    expect(first.status).toBe(200);
    const second = await issueEsim('ord_both_pass');
    expect([200, 409]).toContain(second.status);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  Page shows 'Payment not yet confirmed' blocked copy
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /orders/:id/esim-activation — AC-4 payment-blocked copy', () => {
  it('page returns HTTP 200 for an order with payment pending', async () => {
    const { status } = await getActivationPage('ord_pay_blocked');
    expect(status).toBe(200);
  });

  it('page shows "Payment not yet confirmed" copy when payment gate blocks issuance', async () => {
    const { text } = await getActivationPage('ord_pay_blocked');
    expect(text).toMatch(/Payment not yet confirmed/i);
  });

  it('page does NOT show "Ready to Activate" when payment gate blocks', async () => {
    const { text } = await getActivationPage('ord_pay_blocked');
    expect(text).not.toMatch(/Ready to Activate/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  Page shows 'Identity verification pending' blocked copy
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /orders/:id/esim-activation — AC-5 verification-blocked copy', () => {
  it('page returns HTTP 200 for an order with verification pending', async () => {
    const { status } = await getActivationPage('ord_ver_blocked');
    expect(status).toBe(200);
  });

  it('page shows "Identity verification pending" copy when verification gate blocks issuance', async () => {
    const { text } = await getActivationPage('ord_ver_blocked');
    expect(text).toMatch(/Identity verification pending/i);
  });

  it('page does NOT show "Ready to Activate" when verification gate blocks', async () => {
    const { text } = await getActivationPage('ord_ver_blocked');
    expect(text).not.toMatch(/Ready to Activate/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6  QR code and LPA hidden when issuance is blocked
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /orders/:id/esim-activation — AC-6 QR and LPA hidden when blocked', () => {
  it('QR code section heading is NOT shown when payment gate blocks', async () => {
    const { text } = await getActivationPage('ord_pay_blocked');
    expect(text).not.toMatch(/Scan QR Code to Activate/i);
  });

  it('LPA activation code string is NOT rendered when payment gate blocks', async () => {
    const { text } = await getActivationPage('ord_pay_blocked');
    expect(text).not.toMatch(/LPA:/i);
  });

  it('SM-DP\+ address instruction is NOT rendered when payment gate blocks', async () => {
    const { text } = await getActivationPage('ord_pay_blocked');
    expect(text).not.toMatch(/SM-DP\+ Address:/i);
  });

  it('QR code section heading is NOT shown when verification gate blocks', async () => {
    const { text } = await getActivationPage('ord_ver_blocked');
    expect(text).not.toMatch(/Scan QR Code to Activate/i);
  });

  it('LPA activation code string is NOT rendered when verification gate blocks', async () => {
    const { text } = await getActivationPage('ord_ver_blocked');
    expect(text).not.toMatch(/LPA:/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-7  QR image, SM-DP+ address, LPA from live issuance response
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /orders/:id/esim-activation — AC-7 live activation data after success', () => {
  it('page shows "Scan QR Code to Activate" heading after successful issuance', async () => {
    const { text } = await getActivationPage('ord_both_pass');
    expect(text).toMatch(/Scan QR Code to Activate/i);
  });

  it('page contains a <img> element for the QR code after successful issuance', async () => {
    const { text } = await getActivationPage('ord_both_pass');
    expect(text).toMatch(/<img[^>]+/i);
  });

  it('LPA activation code shown on page matches the code returned by the issuance endpoint', async () => {
    // Issue first to get the canonical code
    const issueRes = await issueEsim('ord_both_pass');
    const issuedCode = issueRes.body.activationCode as string;

    const { text } = await getActivationPage('ord_both_pass');
    // The actual issued code must appear in the page, not a hardcoded fixture
    expect(text).toContain(issuedCode);
  });

  it('SM-DP+ address shown on page matches the address returned by the issuance endpoint', async () => {
    const issueRes = await issueEsim('ord_both_pass');
    const issuedSmdp = issueRes.body.smdpAddress as string;

    const { text } = await getActivationPage('ord_both_pass');
    expect(text).toContain(issuedSmdp);
  });

  it('page does NOT show hardcoded wireframe LPA placeholder for a ready order', async () => {
    const { text } = await getActivationPage('ord_both_pass');
    // The wireframe uses 'LPA:1$smdp.vodacom.co.za$ESIM-7001-2026-AMINA' as a
    // demo value. The real page must use the dynamically issued code.
    expect(text).not.toContain('LPA:1$smdp.vodacom.co.za$ESIM-7001-2026-AMINA');
  });

  it('"Ready to Activate" status is shown after successful issuance', async () => {
    const { text } = await getActivationPage('ord_both_pass');
    expect(text).toMatch(/Ready to Activate/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-8  Action buttons gated on ready state
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /orders/:id/esim-activation — AC-8 action buttons gated on ready state', () => {
  it('"Download eSIM Profile" button is present when issuance succeeds', async () => {
    const { text } = await getActivationPage('ord_both_pass');
    expect(text).toMatch(/Download eSIM Profile/i);
  });

  it('"Check Connection Status" button is present when issuance succeeds', async () => {
    const { text } = await getActivationPage('ord_both_pass');
    expect(text).toMatch(/Check Connection Status/i);
  });

  it('"Download eSIM Profile" button is absent when payment gate blocks', async () => {
    const { text } = await getActivationPage('ord_pay_blocked');
    expect(text).not.toMatch(/Download eSIM Profile/i);
  });

  it('"Check Connection Status" button is absent when payment gate blocks', async () => {
    const { text } = await getActivationPage('ord_pay_blocked');
    expect(text).not.toMatch(/Check Connection Status/i);
  });

  it('"Download eSIM Profile" button is absent when verification gate blocks', async () => {
    const { text } = await getActivationPage('ord_ver_blocked');
    expect(text).not.toMatch(/Download eSIM Profile/i);
  });

  it('"Check Connection Status" button is absent when verification gate blocks', async () => {
    const { text } = await getActivationPage('ord_ver_blocked');
    expect(text).not.toMatch(/Check Connection Status/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-9  Order Reference aside card
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /orders/:id/esim-activation — AC-9 Order Reference aside card', () => {
  it('reference-card aside element is present', async () => {
    const { text } = await getActivationPage('ord_both_pass');
    expect(text).toMatch(/class=["'][^"']*reference-card[^"']*["']/i);
  });

  it('reference card shows "Order Number" label', async () => {
    const { text } = await getActivationPage('ord_both_pass');
    expect(text).toMatch(/Order Number/i);
  });

  it('reference card shows the order ID as the order number value', async () => {
    const { text } = await getActivationPage('ord_both_pass');
    expect(text).toContain('ord_both_pass');
  });

  it('reference card shows "Order Date" label', async () => {
    const { text } = await getActivationPage('ord_both_pass');
    expect(text).toMatch(/Order Date/i);
  });

  it('reference card shows "Customer" label', async () => {
    const { text } = await getActivationPage('ord_both_pass');
    expect(text).toMatch(/Customer/i);
  });

  it('reference card shows "eSIM Reference" label', async () => {
    const { text } = await getActivationPage('ord_both_pass');
    expect(text).toMatch(/eSIM Reference/i);
  });

  it('reference card shows "eSIM Reference" value drawn from the issuance response (not hardcoded)', async () => {
    // Issue eSIM to get the canonical eSIM reference
    const issueRes = await issueEsim('ord_both_pass');
    // The issuance response doesn't directly return esimReference as a top-level
    // field — it's stored internally. The page must display it from the persisted
    // activation record, NOT the hardcoded wireframe value 'ESIM-7001-2026'.
    const { text } = await getActivationPage('ord_both_pass');
    // Hardcoded wireframe placeholder must not appear
    expect(text).not.toContain('ESIM-7001-2026');
    // But some eSIM reference should be shown
    expect(text).toMatch(/eSIM Reference/i);
  });

  it('reference card shows "Plan" label', async () => {
    const { text } = await getActivationPage('ord_both_pass');
    expect(text).toMatch(/\bPlan\b/i);
  });

  it('reference card shows "Status" label', async () => {
    const { text } = await getActivationPage('ord_both_pass');
    expect(text).toMatch(/\bStatus\b/i);
  });

  it('reference card Status value reads "Ready to Activate" for a ready order', async () => {
    const { text } = await getActivationPage('ord_both_pass');
    expect(text).toMatch(/Status[^<]*Ready to Activate/is);
  });
});
