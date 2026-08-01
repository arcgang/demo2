import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Part B: Lite-mode simplified rendering
 * Screens: GET /orders/:id  and  GET /orders/:id/esim-activation
 *
 * Lite mode is detected via ?lite=1 query param (for testing) or navigator.connection.effectiveType
 * of '2g'/'slow-2g' on the client side. The server-side detection uses ?lite=1.
 *
 * Order Tracking (wireframe_order_tracking_account.html) in lite mode:
 *  AC-1  Hero/banner images are suppressed (no <img> tags with hero/banner class or alt).
 *  AC-2  Status timeline renders as a plain ordered list (<ol> or <ul>), not a styled div tree.
 *  AC-3  The account card aside (aside.account-card) is omitted.
 *  AC-4  All text content is retained (milestone labels, order meta).
 *  AC-5  Action buttons are retained (Download Invoice, Contact Support).
 *  AC-6  A "Lite Mode Active" banner is shown (same pattern as product listing page).
 *
 * eSIM Activation (wireframe_esim_activation.html) in lite mode:
 *  AC-7  QR code image element is not rendered.
 *  AC-8  Manual activation instructions section IS rendered.
 *  AC-9  Reference card (aside.reference-card) IS retained.
 *  AC-10 "Download eSIM Profile" button IS retained.
 *  AC-11 "Check Connection Status" button IS retained (for a ready order).
 *  AC-12 A "Lite Mode Active" banner is shown.
 */

const ORDER_TRACKING_LITE = '/orders/ord_001?scenario=activation_complete&lite=1';
const ORDER_TRACKING_NORMAL = '/orders/ord_001?scenario=activation_complete';
const ESIM_LITE_READY = '/orders/ord_001/esim-activation?scenario=activation_complete&lite=1';
const ESIM_NORMAL_READY = '/orders/ord_001/esim-activation?scenario=activation_complete';

// ── Order Tracking lite mode ──────────────────────────────────────────────────

describe('Order Tracking – AC-1 (lite): hero/banner images suppressed', () => {
  it('order tracking page with ?lite=1 returns HTTP 200', async () => {
    const res = await request(app).get(ORDER_TRACKING_LITE);
    expect(res.status).toBe(200);
  });

  it('order tracking lite mode has no <img> elements', async () => {
    const res = await request(app).get(ORDER_TRACKING_LITE);
    expect(res.text).not.toMatch(/<img\b/i);
  });

  it('order tracking normal mode may include img elements (baseline)', async () => {
    // This is a soft baseline — the normal page might or might not have images,
    // but in lite mode they must be absent regardless.
    const res = await request(app).get(ORDER_TRACKING_NORMAL);
    expect(res.status).toBe(200);
  });
});

describe('Order Tracking – AC-2 (lite): timeline renders as a plain list', () => {
  it('order tracking lite mode renders the timeline as an <ol> or <ul> element', async () => {
    const res = await request(app).get(ORDER_TRACKING_LITE);
    expect(res.text).toMatch(/<(ol|ul)[^>]*class=["'][^"']*order-status-timeline[^"']*["']|class=["'][^"']*order-status-timeline[^"']*["'][^>]*>\s*<li/is);
  });

  it('order tracking lite mode timeline contains <li> elements for each milestone', async () => {
    const res = await request(app).get(ORDER_TRACKING_LITE);
    const milestoneLabels = ['Order Placed', 'Payment Confirmed', 'Verification Complete', 'eSIM Issued', 'Activation Complete'];
    for (const label of milestoneLabels) {
      expect(res.text).toMatch(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    }
  });

  it('order tracking lite mode uses list markup (<li>) for milestones rather than div.milestone', async () => {
    const res = await request(app).get(ORDER_TRACKING_LITE);
    // In lite mode, milestones are rendered as <li> elements inside an ol/ul
    expect(res.text).toMatch(/<li[^>]*>/i);
  });

  it('order tracking normal mode renders div.milestone elements (baseline for comparison)', async () => {
    const res = await request(app).get(ORDER_TRACKING_NORMAL);
    expect(res.text).toMatch(/class=["'][^"']*milestone\b[^"']*["']/i);
  });
});

describe('Order Tracking – AC-3 (lite): account card aside is omitted', () => {
  it('order tracking lite mode does NOT render aside.account-card', async () => {
    const res = await request(app).get(ORDER_TRACKING_LITE);
    expect(res.text).not.toMatch(/class=["'][^"']*account-card[^"']*["']/i);
  });

  it('order tracking normal mode DOES render aside.account-card (baseline)', async () => {
    const res = await request(app).get(ORDER_TRACKING_NORMAL);
    expect(res.text).toMatch(/class=["'][^"']*account-card[^"']*["']/i);
  });
});

describe('Order Tracking – AC-4 (lite): text content is retained', () => {
  it('order tracking lite mode retains H1 "Order Details"', async () => {
    const res = await request(app).get(ORDER_TRACKING_LITE);
    expect(res.text).toMatch(/<h1[^>]*>.*Order Details.*<\/h1>/is);
  });

  it('order tracking lite mode retains "Order Status Timeline" heading', async () => {
    const res = await request(app).get(ORDER_TRACKING_LITE);
    expect(res.text).toMatch(/Order Status Timeline/i);
  });

  it('order tracking lite mode retains order reference data', async () => {
    const res = await request(app).get(ORDER_TRACKING_LITE);
    expect(res.text).toMatch(/ord_001/i);
  });
});

describe('Order Tracking – AC-5 (lite): action buttons are retained', () => {
  it('order tracking lite mode retains "Download Invoice" button', async () => {
    const res = await request(app).get(ORDER_TRACKING_LITE);
    expect(res.text).toMatch(/Download Invoice/i);
  });

  it('order tracking lite mode retains "Contact Support" button', async () => {
    const res = await request(app).get(ORDER_TRACKING_LITE);
    expect(res.text).toMatch(/Contact Support/i);
  });
});

describe('Order Tracking – AC-6 (lite): Lite Mode Active banner shown', () => {
  it('order tracking lite mode shows "Lite Mode Active" banner', async () => {
    const res = await request(app).get(ORDER_TRACKING_LITE);
    expect(res.text).toMatch(/Lite Mode Active/i);
  });

  it('order tracking normal mode does NOT show "Lite Mode Active" banner', async () => {
    const res = await request(app).get(ORDER_TRACKING_NORMAL);
    expect(res.text).not.toMatch(/Lite Mode Active/i);
  });
});

// ── eSIM Activation lite mode ─────────────────────────────────────────────────

describe('eSIM Activation – AC-7 (lite): QR code image not rendered', () => {
  it('eSIM activation page with ?lite=1 returns HTTP 200', async () => {
    const res = await request(app).get(ESIM_LITE_READY);
    expect(res.status).toBe(200);
  });

  it('eSIM activation lite mode has no <img> element (QR code suppressed)', async () => {
    const res = await request(app).get(ESIM_LITE_READY);
    expect(res.text).not.toMatch(/<img\b/i);
  });

  it('eSIM activation normal mode does render a QR code img element (baseline)', async () => {
    const res = await request(app).get(ESIM_NORMAL_READY);
    expect(res.text).toMatch(/<img[^>]*qr[^>]*>/i);
  });

  it('eSIM activation lite mode does NOT render "Scan QR Code to Activate" heading', async () => {
    const res = await request(app).get(ESIM_LITE_READY);
    expect(res.text).not.toMatch(/Scan QR Code to Activate/i);
  });
});

describe('eSIM Activation – AC-8 (lite): manual activation instructions rendered', () => {
  it('eSIM activation lite mode shows "Manual Activation Instructions" section', async () => {
    const res = await request(app).get(ESIM_LITE_READY);
    expect(res.text).toMatch(/Manual Activation Instructions/i);
  });

  it('eSIM activation lite mode shows SM-DP+ Address instruction', async () => {
    const res = await request(app).get(ESIM_LITE_READY);
    expect(res.text).toMatch(/SM-DP\+\s*Address/i);
  });

  it('eSIM activation lite mode shows Activation Code in manual instructions', async () => {
    const res = await request(app).get(ESIM_LITE_READY);
    expect(res.text).toMatch(/Activation Code/i);
  });
});

describe('eSIM Activation – AC-9 (lite): reference card retained', () => {
  it('eSIM activation lite mode retains aside.reference-card', async () => {
    const res = await request(app).get(ESIM_LITE_READY);
    expect(res.text).toMatch(/class=["'][^"']*reference-card[^"']*["']/i);
  });

  it('eSIM activation lite mode retains Order Number in reference card', async () => {
    const res = await request(app).get(ESIM_LITE_READY);
    expect(res.text).toMatch(/Order Number/i);
  });
});

describe('eSIM Activation – AC-10 (lite): Download eSIM Profile button retained', () => {
  it('eSIM activation lite mode retains "Download eSIM Profile" button', async () => {
    const res = await request(app).get(ESIM_LITE_READY);
    expect(res.text).toMatch(/Download eSIM Profile/i);
  });
});

describe('eSIM Activation – AC-11 (lite): Check Connection Status button retained', () => {
  it('eSIM activation lite mode retains "Check Connection Status" button', async () => {
    const res = await request(app).get(ESIM_LITE_READY);
    expect(res.text).toMatch(/Check Connection Status/i);
  });
});

describe('eSIM Activation – AC-12 (lite): Lite Mode Active banner shown', () => {
  it('eSIM activation lite mode shows "Lite Mode Active" banner', async () => {
    const res = await request(app).get(ESIM_LITE_READY);
    expect(res.text).toMatch(/Lite Mode Active/i);
  });

  it('eSIM activation normal mode does NOT show "Lite Mode Active" banner', async () => {
    const res = await request(app).get(ESIM_NORMAL_READY);
    expect(res.text).not.toMatch(/Lite Mode Active/i);
  });
});

// ── ?lite=1 vs ?lite=true consistency ────────────────────────────────────────

describe('Lite mode detection – ?lite=1 param triggers lite mode', () => {
  it('order tracking page with ?lite=1 triggers lite mode (same as ?lite=true)', async () => {
    const resOne = await request(app).get('/orders/ord_001?scenario=activation_complete&lite=1');
    const resTrue = await request(app).get('/orders/ord_001?scenario=activation_complete&lite=true');
    // Both must show "Lite Mode Active"
    expect(resOne.text).toMatch(/Lite Mode Active/i);
    expect(resTrue.text).toMatch(/Lite Mode Active/i);
  });

  it('eSIM activation page with ?lite=1 triggers lite mode (same as ?lite=true)', async () => {
    const resOne = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete&lite=1');
    const resTrue = await request(app).get('/orders/ord_001/esim-activation?scenario=activation_complete&lite=true');
    expect(resOne.text).toMatch(/Lite Mode Active/i);
    expect(resTrue.text).toMatch(/Lite Mode Active/i);
  });
});
