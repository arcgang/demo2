import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Part A: eSIM activation in-progress messaging
 * Screen: GET /orders/:id/esim-activation  (wireframe_esim_activation.html)
 *
 * When Check Connection Status returns an in-progress state:
 *  AC-1  Show 'Activation is in progress — this may take a few minutes. Your eSIM is not yet active.'
 *  AC-2  Never show 'Activation Complete' until the backend confirms the terminal activated state.
 *  AC-3  The in-progress banner must not contain any success indicator.
 *
 * Scenario driven via ?scenario=activation_in_progress query param (consistent with
 * the existing scenario-based test pattern in this repo).
 */

// ── AC-1: in-progress banner copy ────────────────────────────────────────────

describe('eSIM Activation – AC-1: in-progress state shows correct message', () => {
  it('returns HTTP 200 for the activation_in_progress scenario', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_in_progress');
    expect(res.status).toBe(200);
  });

  it('shows "Activation is in progress" copy for the in-progress scenario', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_in_progress');
    expect(res.text).toMatch(/Activation is in progress/i);
  });

  it('includes "this may take a few minutes" in the in-progress message', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_in_progress');
    expect(res.text).toMatch(/this may take a few minutes/i);
  });

  it('includes "Your eSIM is not yet active" in the in-progress message', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_in_progress');
    expect(res.text).toMatch(/Your eSIM is not yet active/i);
  });
});

// ── AC-2: 'Activation Complete' must not appear in in-progress state ─────────

describe('eSIM Activation – AC-2: in-progress state never shows Activation Complete', () => {
  it('does NOT show "Activation Complete" when scenario is activation_in_progress', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_in_progress');
    expect(res.text).not.toMatch(/Activation Complete/i);
  });

  it('reference card Status value is NOT "Activated" or "Active" when in-progress', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_in_progress');
    // The Status row in the reference card must not claim activation success
    expect(res.text).not.toMatch(/Status[^<]{0,30}(Activated|Activation Complete|Active)/is);
  });

  it('does NOT render a success banner class when in-progress', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_in_progress');
    expect(res.text).not.toMatch(/esim-status-banner--ready/i);
  });
});

// ── AC-3: in-progress banner contains no success indicators ──────────────────

describe('eSIM Activation – AC-3: in-progress banner contains no success indicators', () => {
  it('in-progress message region does not contain "Your eSIM is ready" copy', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_in_progress');
    expect(res.text).not.toMatch(/Your eSIM is ready/i);
  });

  it('in-progress message region does not contain "Ready to Activate" copy', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_in_progress');
    expect(res.text).not.toMatch(/Ready to Activate/i);
  });

  it('the in-progress state has a distinct CSS class for the banner (not the ready/success class)', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_in_progress');
    // Must carry an "in-progress" or "pending" variant class, not the "ready" class
    expect(res.text).toMatch(/esim-status-banner--(in-progress|pending|activating)/i);
  });
});

// ── Regression: activation_complete scenario still shows success correctly ────

describe('eSIM Activation – Regression: activation_complete still shows success', () => {
  it('activation_complete scenario shows "Ready to Activate" or "Activation Complete"', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete');
    expect(res.text).toMatch(/(Ready to Activate|Activation Complete)/i);
  });

  it('activation_complete scenario does NOT show "Your eSIM is not yet active"', async () => {
    const res = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete');
    expect(res.text).not.toMatch(/Your eSIM is not yet active/i);
  });
});
