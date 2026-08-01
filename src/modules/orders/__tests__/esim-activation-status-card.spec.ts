import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – eSIM Activation page status card (Screen 5)
 *
 * Screen  : GET /orders/:id/esim-activation   (wireframe_esim_activation.html)
 * Region  : aside.reference-card / .esim-status-card
 * API dep : GET /api/orders/:id/status?scenario=<name>
 *
 * The eSIM status card must reflect the live order milestone state:
 *  - "Ready to Activate" is shown ONLY when both payment_confirmed AND
 *    verification_complete are in state "completed".
 *  - When verification is pending or blocked, the card must NOT show
 *    "Ready to Activate" and must instead surface the blocking reason.
 *
 * Acceptance criteria encoded here:
 *  AC-1  Page loads and renders the eSIM activation HTML page.
 *  AC-2  Status shows "Ready to Activate" only when payment and verification are complete.
 *  AC-3  Status card updates when verification is not yet complete (pending scenario).
 *  AC-4  Status card surfaces blocked state with appropriate copy.
 *  AC-5  Order reference, customer info, and plan details are present in the reference card.
 *  AC-6  "Download eSIM Profile" and "Check Connection Status" controls are present
 *        only when the eSIM is ready to activate.
 */

// ---------------------------------------------------------------------------
// AC-1  Page loads
// ---------------------------------------------------------------------------

describe('eSIM Activation page – AC-1: page serves HTML', () => {
  it('returns HTTP 200 for the activation_complete scenario', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete');
    expect(res.status).toBe(200);
  });

  it('Content-Type is text/html', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete');
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });

  it('H1 contains "Activate Your eSIM" per the design spec', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete');
    expect(res.text).toMatch(/<h1[^>]*>.*Activate Your eSIM.*<\/h1>/is);
  });

  it('page title contains "Activate Your eSIM"', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete');
    expect(res.text).toMatch(/<title[^>]*>.*Activate.*eSIM.*<\/title>/is);
  });
});

// ---------------------------------------------------------------------------
// AC-2  "Ready to Activate" shown only when payment + verification both completed
// ---------------------------------------------------------------------------

describe('eSIM Activation page – AC-2: "Ready to Activate" requires both gates', () => {
  it('activation_complete scenario shows "Ready to Activate" status', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete');
    expect(res.text).toMatch(/Ready to Activate/i);
  });

  it('activation_complete scenario shows payment confirmed copy', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete');
    expect(res.text).toMatch(/Payment confirmed/i);
  });

  it('activation_complete scenario shows identity verification completed copy', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete');
    expect(res.text).toMatch(/identity verification/i);
  });

  it('the status value in the reference card reads "Ready to Activate" for activation_complete', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete');
    // The reference card aside contains the Status row per the wireframe
    expect(res.text).toMatch(/Status[^<]*Ready to Activate/is);
  });

  it('pending_verification scenario does NOT show "Ready to Activate" status', async () => {
    const res = await request(app).get('/orders/ord_002/esim-activation?scenario=pending_verification');
    expect(res.text).not.toMatch(/Ready to Activate/i);
  });

  it('blocked_verification scenario does NOT show "Ready to Activate" status', async () => {
    const res = await request(app).get('/orders/ord_003/esim-activation?scenario=blocked_verification');
    expect(res.text).not.toMatch(/Ready to Activate/i);
  });
});

// ---------------------------------------------------------------------------
// AC-3  Status card reflects pending verification state
// ---------------------------------------------------------------------------

describe('eSIM Activation page – AC-3: status card updates when verification is pending', () => {
  it('pending_verification scenario returns HTTP 200', async () => {
    const res = await request(app).get('/orders/ord_002/esim-activation?scenario=pending_verification');
    expect(res.status).toBe(200);
  });

  it('pending verification state is communicated in the status card', async () => {
    const res = await request(app).get('/orders/ord_002/esim-activation?scenario=pending_verification');
    // Must show that verification is still in progress / pending
    expect(res.text).toMatch(/(verification.*pending|pending.*verification|verification.*under review|awaiting verification)/i);
  });

  it('eSIM activation controls are NOT available when verification is pending', async () => {
    const res = await request(app).get('/orders/ord_002/esim-activation?scenario=pending_verification');
    // The "Download eSIM Profile" button should not be present until ready
    expect(res.text).not.toMatch(/Download eSIM Profile/i);
  });

  it('QR code section is NOT rendered when verification is pending', async () => {
    const res = await request(app).get('/orders/ord_002/esim-activation?scenario=pending_verification');
    expect(res.text).not.toMatch(/Scan QR Code to Activate/i);
  });

  it('status card shows a non-ready status value (not "Ready to Activate") in the reference block', async () => {
    const res = await request(app).get('/orders/ord_002/esim-activation?scenario=pending_verification');
    // The Status row value must differ from "Ready to Activate"
    expect(res.text).not.toMatch(/Status[^<]*Ready to Activate/is);
  });
});

// ---------------------------------------------------------------------------
// AC-4  Status card reflects blocked verification state
// ---------------------------------------------------------------------------

describe('eSIM Activation page – AC-4: status card reflects blocked verification', () => {
  it('blocked_verification scenario returns HTTP 200', async () => {
    const res = await request(app).get('/orders/ord_003/esim-activation?scenario=blocked_verification');
    expect(res.status).toBe(200);
  });

  it('blocked state is communicated prominently (not hidden or treated as pending)', async () => {
    const res = await request(app).get('/orders/ord_003/esim-activation?scenario=blocked_verification');
    expect(res.text).toMatch(/(verification.*blocked|blocked.*verification|verification could not be completed|action required)/i);
  });

  it('eSIM activation controls are NOT available when verification is blocked', async () => {
    const res = await request(app).get('/orders/ord_003/esim-activation?scenario=blocked_verification');
    expect(res.text).not.toMatch(/Download eSIM Profile/i);
  });

  it('QR code section is NOT rendered when verification is blocked', async () => {
    const res = await request(app).get('/orders/ord_003/esim-activation?scenario=blocked_verification');
    expect(res.text).not.toMatch(/Scan QR Code to Activate/i);
  });
});

// ---------------------------------------------------------------------------
// AC-5  Reference card contains order reference, customer, and plan details
// ---------------------------------------------------------------------------

describe('eSIM Activation page – AC-5: reference card data', () => {
  it('reference card section is present', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete');
    expect(res.text).toMatch(/class=["'][^"']*reference-card[^"']*["']/i);
  });

  it('Order Number label is present in the reference card', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete');
    expect(res.text).toMatch(/Order Number/i);
  });

  it('Plan label is present in the reference card', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete');
    expect(res.text).toMatch(/Plan/i);
  });

  it('Status label is present in the reference card', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete');
    expect(res.text).toMatch(/Status/i);
  });

  it('eSIM Reference label is present in the reference card', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete');
    expect(res.text).toMatch(/eSIM Reference/i);
  });
});

// ---------------------------------------------------------------------------
// AC-6  eSIM controls present only when ready to activate
// ---------------------------------------------------------------------------

describe('eSIM Activation page – AC-6: eSIM controls gated on ready state', () => {
  it('"Download eSIM Profile" button is present when activation_complete', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete');
    expect(res.text).toMatch(/Download eSIM Profile/i);
  });

  it('"Check Connection Status" button is present when activation_complete', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete');
    expect(res.text).toMatch(/Check Connection Status/i);
  });

  it('"Download eSIM Profile" button is absent when pending_verification', async () => {
    const res = await request(app).get('/orders/ord_002/esim-activation?scenario=pending_verification');
    expect(res.text).not.toMatch(/Download eSIM Profile/i);
  });

  it('"Check Connection Status" button is absent when pending_verification', async () => {
    const res = await request(app).get('/orders/ord_002/esim-activation?scenario=pending_verification');
    expect(res.text).not.toMatch(/Check Connection Status/i);
  });

  it('"Download eSIM Profile" button is absent when blocked_verification', async () => {
    const res = await request(app).get('/orders/ord_003/esim-activation?scenario=blocked_verification');
    expect(res.text).not.toMatch(/Download eSIM Profile/i);
  });

  it('"Check Connection Status" button is absent when blocked_verification', async () => {
    const res = await request(app).get('/orders/ord_003/esim-activation?scenario=blocked_verification');
    expect(res.text).not.toMatch(/Check Connection Status/i);
  });
});
